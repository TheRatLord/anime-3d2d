// Snow that LIES on what is built. The masonry paints its own snow (src/stone.js): a white on whatever looks
// at the sky. That is a colour on the stone - the wall keeps its own outline, and the snow has no depth. Here
// the snow is given a body: a layer piled on every surface of a stone mesh that is open to the sky, thick on
// a broad wall top and thin on a ledge, uneven along its length (drifted deeper here, blown thin there),
// heaped toward the middle of what it lies on and hanging a little over its edge, with a side of its own that
// turns from the light. It is built once from the mesh it lies on, so whatever is built of stone gets it:
//   scene.add(snowCaps(mesh))
// Drawn only under snow (uSnow). It casts no shadow of its own.
import * as THREE from 'three';
import { mat } from './glsl.js';
import { fbm } from './world.js';

const CAP = { up: 0.55, cell: 0.07, maxCells: 1400, thick: 0.42, share: 0.68, rim: 0.5, over: 0.28, lo: 0.5, hi: 1.5 };

const VS = /* glsl */`
in vec3 position; in vec3 normal; in vec2 aS;
out vec3 vW; out vec3 vN; out vec2 vS; out float vDepth;
void main(){
  if (uSnow < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vS = aS;
  vec4 mv = viewMatrix * w; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vS; in float vDepth;
void main(){
  vec3 n = normalize(vN);
  vec4 bw = brushWorld(vW + 2.1, vec3(0.0, 1.0, 0.0), 2.7);
  vec4 bs = brushWorld(vW + 6.3, n, 1.9);
  float side = step(0.5, vS.y);
  float sh = shadowLit(vW + vec3(0.0, 0.10, 0.0) + n * 0.06, 3.0);
  // the top takes the light of the sky it looks at; the side is a wall of snow, lit only where it faces the sun
  float ndl = mix(max(n.y, 0.0) * uSunDir.y + 0.25, dot(n, uSunDir), side);
  float t = toneStep(min(smoothstep(-0.05, 0.22, ndl), sh), 0.5, bw.g * 0.6 + bw.a * 0.4, 0.45);
  vec3 lit = mix(SNOW_L, SNOW_C, max(side, step(0.62, bw.g)));
  vec3 shd = mix(SNOW_S, SNOW_D, step(0.60, bs.g) * 0.7);
  // the lip: the foot of the side is the underside of what hangs over - a step deeper, its edge on the brush
  float lip = side * (1.0 - toneStep(vS.x, 0.34, bs.r * 0.6 + bs.a * 0.4, 0.5));
  lit = mix(lit, SNOW_S * vec3(1.04, 1.03, 1.0), lip);
  shd = mix(shd, SNOW_D * vec3(0.90, 0.91, 0.95), lip);
  vec3 c = mix(shd, lit, t);
  gLit = t; gOwnSnow = true;
  oColor = vec4(c, 1.0);
  writeAux(n, 0.0, vDepth, 0.52, t, 0.0);
}
`;
let material = null;

export function snowCaps(mesh) {
  const g = mesh.geometry, P = g.getAttribute('position').array, I = g.index.array, nT = I.length / 3;
  // ---- what is open to the sky: the highest stone over every cell of the plan
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
  const cell = Math.max(CAP.cell, (x1 - x0) / CAP.maxCells, (z1 - z0) / CAP.maxCells), nx = Math.ceil((x1 - x0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
  const hm = new Float32Array(nx * nz).fill(-1e9);
  for (let t = 0; t < nT; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ax = P[a], ay = P[a + 1], az = P[a + 2], bx = P[b], by = P[b + 1], bz = P[b + 2], cx = P[c], cy = P[c + 1], cz = P[c + 2];
    const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / cell)), i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / cell));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / cell)), j1 = Math.min(nz - 1, Math.ceil((Math.max(az, bz, cz) - z0) / cell));
    if (Math.abs(den) < 1e-9) continue;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = x0 + i * cell, z = z0 + j * cell;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den, w = 1 - u - v;
      if (u < -0.02 || v < -0.02 || w < -0.02) continue;
      const y = u * ay + v * by + w * cy, o = j * nx + i;
      if (y > hm[o]) hm[o] = y;
    }
  }
  const top = (x, z) => hm[Math.min(nz - 1, Math.max(0, Math.round((z - z0) / cell))) * nx + Math.min(nx - 1, Math.max(0, Math.round((x - x0) / cell)))];
  // ---- the faces the snow lies on, welded into sheets
  const key = new Map(), V = [], tris = [];
  const vert = (i) => {
    const k = `${Math.round(P[i] * 500)},${Math.round(P[i + 1] * 500)},${Math.round(P[i + 2] * 500)}`;
    let v = key.get(k);
    if (v === undefined) { v = V.length; key.set(k, v); V.push({ x: P[i], y: P[i + 1], z: P[i + 2], cap: 1e9, rim: false, ox: 0, oz: 0 }); }
    return v;
  };
  for (let t = 0; t < nT; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx_ = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz_ = ux * vy - uy * vx, nl = Math.hypot(nx_, ny, nz_);
    if (nl < 1e-7 || ny / nl < CAP.up) continue;
    const mx = (P[a] + P[b] + P[c]) / 3, my = (P[a + 1] + P[b + 1] + P[c + 1]) / 3, mz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
    if (top(mx, mz) > my + 0.05) continue;
    // (how much it can carry: a share of its narrowest way across)
    const e = Math.max(Math.hypot(ux, uz), Math.hypot(vx, vz), Math.hypot(P[c] - P[b], P[c + 2] - P[b + 2]));
    const cap = Math.min(CAP.thick, Math.max(0.015, CAP.share * Math.abs(ny) / e));
    const tv = [vert(a), vert(b), vert(c)];
    if (tv[0] === tv[1] || tv[1] === tv[2] || tv[0] === tv[2]) continue;
    for (const v of tv) V[v].cap = Math.min(V[v].cap, cap);
    tris.push([tv[0], tv[1], tv[2], cap, mx, my, mz]);
  }
  if (!tris.length) return new THREE.Group();
  // ---- the edge of each sheet (an edge that only one face has)
  const edges = new Map();
  for (const [a, b, c] of tris) for (const [p, q, r] of [[a, b, c], [b, c, a], [c, a, b]]) {
    const k = p < q ? p * 4194304 + q : q * 4194304 + p, e = edges.get(k);
    if (e) e.n++; else edges.set(k, { p, q, r, n: 1 });
  }
  const rim = [];
  for (const e of edges.values()) if (e.n === 1) {
    const A = V[e.p], B = V[e.q], C = V[e.r];
    let ox = B.z - A.z, oz = A.x - B.x; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
    if (ox * (C.x - A.x) + oz * (C.z - A.z) > 0) { ox = -ox; oz = -oz; }
    A.rim = B.rim = true; A.ox += ox; A.oz += oz; B.ox += ox; B.oz += oz;
    rim.push([e.p, e.q, ox, oz]);
  }
  // ---- piled: deeper in long drifts along the wall, heaped toward the middle of each sheet, out over its edge
  const drift = (x, z) => CAP.lo + (CAP.hi - CAP.lo) * fbm(x * 0.55 + 31.7, z * 0.55 + 12.3, 3);
  for (const v of V) {
    v.h = v.cap * drift(v.x, v.z) * (v.rim ? CAP.rim : 0.9);
    const l = Math.hypot(v.ox, v.oz);
    if (l > 1e-6) { const o = (0.02 + CAP.over * v.h) / l; v.tx = v.x + v.ox * o; v.tz = v.z + v.oz * o; } else { v.tx = v.x; v.tz = v.z; }
    v.ty = v.y + v.h;
  }
  const pos = [], nrm = [], aS = [], idx = [];
  const put = (x, y, z, nx_, ny, nz_, s, side) => { pos.push(x, y, z); nrm.push(nx_, ny, nz_); aS.push(s, side); return pos.length / 3 - 1; };
  const tv = V.map((v) => put(v.tx, v.ty, v.tz, 0, 1, 0, 1, 0));
  for (const [a, b, c, cap, mx, my, mz] of tris) {
    const m = put(mx, my + cap * drift(mx, mz), mz, 0, 1, 0, 1, 0);
    idx.push(tv[a], tv[b], m, tv[b], tv[c], m, tv[c], tv[a], m);
  }
  for (const [p, q, ox, oz] of rim) {
    const A = V[p], B = V[q];
    const a0 = put(A.x + ox * 0.01, A.y - 0.03, A.z + oz * 0.01, ox, 0.15, oz, 0, 1), b0 = put(B.x + ox * 0.01, B.y - 0.03, B.z + oz * 0.01, ox, 0.15, oz, 0, 1);
    const a1 = put(A.tx, A.ty, A.tz, ox, 0.15, oz, 1, 1), b1 = put(B.tx, B.ty, B.tz, ox, 0.15, oz, 1, 1);
    idx.push(a0, b0, b1, a0, b1, a1);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  sg.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 2));
  sg.setIndex(idx);
  material ??= mat({ vs: VS, fs: FS, side: THREE.DoubleSide });
  const m = new THREE.Mesh(sg, material);
  m.frustumCulled = false; m.matrixAutoUpdate = false; m.matrix.copy(mesh.matrix); m.matrixWorld.copy(mesh.matrixWorld);
  m.userData.grp = 'snow';
  return m;
}
