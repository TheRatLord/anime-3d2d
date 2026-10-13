// Clawd, walking about the hill. A real 3D model (rounded blocks, every vertex smooth-normalled) that is drawn
// the way a layout artist draws a character over a background: as ONE FLAT DRAWING held parallel to the canvas.
//
// The cheats (all of them are done to the model, never to the picture):
//  - The drawing plane is the canvas. The model's axes are the camera's own (right, up, toward the viewer), so
//    from every walk-round, every height of the eye, up or down, he is seen from the same station: dead front,
//    upright, no perspective skew - walking round him turns the model with the viewer, which is the strangeness
//    the flatness is bought with.
//  - His depth is squashed to a card (SQUASH) about the plane through his feet. What is left of the third
//    dimension is only the order the parts overlap in.
//  - Which way he is going is not told by turning the body (that would show a side of the block) but the way the
//    face is drawn: the eyes slide across the plate and narrow toward the edge, and vanish round the side when he
//    walks away - a 2D head turn. The body only leans in the plane of the canvas.
//  - Light is not computed from the geometry: one flat tone inside the outline (every step laid inside a figure
//    - a band, a strip, a lip - was read by the judge sheets as a plane turning away). Evening, snow and cloud
//    shadow come from the shared contract (hourOf, the composite) like every other thing on the hill.
//  - A held drawing: pose and position change on the scene's 12 fps clock, "on twos", and each pose is a key
//    (squash and stretch, held eyes), not an interpolation.
//  - Ink is a hull of constant width on the canvas, in the deep tone of his own colour, so the paint filter
//    leaves a line a pixel or two broad. The pipeline's own lines are told he is a firm drawn thing (line weight
//    1, man-made flag), and his cast shadow is a flat painted shape on the turf, not the sun map's.
//
// ?clawd=0 leaves him out. window.__clawd drives him from the review tools (tools/clawdsheet.mjs).
import * as THREE from 'three';
import { mat, G } from '../glsl.js';
import { height, rng, FLOOR } from '../world.js';
import { LAYOUT } from '../layout.js';
import { CHAR_ID } from '../pipeline.js';

const q = new URLSearchParams(globalThis.location?.search ?? '');
const ON = q.get('clawd') !== '0';

// ---- the drawing's constants
const SC = 1.15;                    // metres per model unit: he is about a metre tall, a metre and a half across
const SQUASH = 0.12;                // depth left to the card (1 = the solid model)
const PUSH = 0.35;                  // m toward the eye: the card stands this far in front of his feet, scaled to keep its size
const INK_PX = 2.2;                 // outline width on a 720 px canvas
const HOLD = 12;                    // drawings per second

const ORANGE = [0.862, 0.478, 0.345];
const INK = [0.380, 0.170, 0.170];
const EYE = [0.215, 0.135, 0.150];

// ---- the model: parts in model units, origin at the feet, +y up, +z toward the viewer
// [index, half extents, bevel radius, kind]  kind 0 = skin, 1 = eye
const BODY = { y: 0.52, hx: 0.56, hy: 0.31, hz: 0.24, r: 0.075 };
const ARM = { x: 0.54, y: 0.40, hx: 0.105, hy: 0.10, hz: 0.12, r: 0.045 };
const LEG = { hx: 0.075, hy: 0.115, hz: 0.1, r: 0.035, xs: [-0.37, -0.17, 0.17, 0.37] };
const EYEP = { hx: 0.043, hy: 0.105, hz: 0.014, r: 0.012, x: 0.19, y: 0.60 };
const PARTS = [
  { half: [BODY.hx, BODY.hy, BODY.hz], r: BODY.r, kind: 0 },        // 0
  { half: [ARM.hx, ARM.hy, ARM.hz], r: ARM.r, kind: 0 },            // 1 arm, screen left
  { half: [ARM.hx, ARM.hy, ARM.hz], r: ARM.r, kind: 0 },            // 2 arm, screen right
  ...LEG.xs.map(() => ({ half: [LEG.hx, LEG.hy, LEG.hz], r: LEG.r, kind: 0 })),   // 3..6
  { half: [EYEP.hx, EYEP.hy, EYEP.hz], r: EYEP.r, kind: 1 },        // 7
  { half: [EYEP.hx, EYEP.hy, EYEP.hz], r: EYEP.r, kind: 1 },        // 8
];

// a block with rounded edges: a cube grid pushed onto the rounded-box surface (vertices dense in the bevels),
// normals from the SDF so the shading across a bevel is smooth
function roundedBox(hx, hy, hz, r, part, kind, out) {
  const ax = (h) => [-h, -h + r * 0.34, -h + r * 0.68, -h + r, h - r, h - r * 0.68, h - r * 0.34, h];
  const X = ax(hx), Y = ax(hy), Z = ax(hz), inner = [hx - r, hy - r, hz - r];
  const base = out.pos.length / 3;
  const faces = [[0, 1, 2, +1], [0, 1, 2, -1], [1, 0, 2, +1], [1, 0, 2, -1], [2, 0, 1, +1], [2, 0, 1, -1]];
  const sets = [X, Y, Z], half = [hx, hy, hz];
  let vi = 0;
  const starts = [];
  for (const [a, b, c, s] of faces) {
    starts.push(vi);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const p = [0, 0, 0];
      p[a] = s * half[a]; p[b] = sets[b][i]; p[c] = sets[c][j];
      const qv = p.map((v, k) => Math.max(-inner[k], Math.min(inner[k], v)));
      let d = p.map((v, k) => v - qv[k]); const l = Math.hypot(...d) || 1; d = d.map((v) => v / l);
      out.pos.push(qv[0] + d[0] * r, qv[1] + d[1] * r, qv[2] + d[2] * r);
      out.nor.push(...d);
      out.pk.push(part, kind);
      vi++;
    }
  }
  for (let f = 0; f < 6; f++) {
    const s0 = base + starts[f];
    const flip = (faces[f][3] > 0) !== (faces[f][0] === 1);   // keeps the winding outward for every face
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
      const a = s0 + j * 8 + i, b = a + 1, c = a + 8, d = c + 1;
      if (flip) out.idx.push(a, c, b, b, c, d); else out.idx.push(a, b, c, b, d, c);
    }
  }
}

function buildGeometry() {
  const o = { pos: [], nor: [], pk: [], idx: [] };
  PARTS.forEach((p, i) => roundedBox(p.half[0], p.half[1], p.half[2], p.r, i, p.kind, o));
  // make every triangle face outward whatever the grid order gave (checked against the normal)
  for (let t = 0; t < o.idx.length; t += 3) {
    const [a, b, c] = [o.idx[t], o.idx[t + 1], o.idx[t + 2]];
    const P = (i) => new THREE.Vector3(o.pos[i * 3], o.pos[i * 3 + 1], o.pos[i * 3 + 2]);
    const N = (i) => new THREE.Vector3(o.nor[i * 3], o.nor[i * 3 + 1], o.nor[i * 3 + 2]);
    const fn = new THREE.Vector3().subVectors(P(b), P(a)).cross(new THREE.Vector3().subVectors(P(c), P(a)));
    if (fn.dot(N(a).add(N(b)).add(N(c))) < 0) { o.idx[t + 1] = c; o.idx[t + 2] = b; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3));
  g.setAttribute('aPK', new THREE.Float32BufferAttribute(o.pk, 2));
  g.setIndex(o.idx);
  return g;
}

// ---- shaders
const VS = /* glsl */`
in vec3 position; in vec3 normal; in vec2 aPK;
uniform mat4 uRoot;
uniform mat4 uParts[${PARTS.length}];
uniform vec2 uRes;
uniform float uInk;
out vec3 vN; out vec3 vL; out vec2 vK; out float vDepth;
void main(){
  int i = int(aPK.x + 0.5);
  mat4 P = uParts[i];
  vec3 pl = (P * vec4(position, 1.0)).xyz;
  vec3 nl = normalize(mat3(P) * normal);
  vec4 mv = viewMatrix * (uRoot * vec4(pl, 1.0));
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
  vN = nl; vL = position; vK = aPK;
#ifdef HULL
  // the line is a hull of constant width on the canvas, pushed out along the outline's normal
  float l = length(nl.xy);
  if (aPK.y > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  else if (l > 1e-4) gl_Position.xy += nl.xy / l * uInk * 2.0 / uRes * gl_Position.w;
#endif
}
`;
const FS_COMMON = /* glsl */`
in vec3 vN; in vec3 vL; in vec2 vK; in float vDepth;
uniform vec3 uPlan;       // the card's normal in the world (written for the pipeline)
uniform float uTone;
`;
const FS_FILL = /* glsl */`
${FS_COMMON}
const vec3 C_SKIN = vec3(${ORANGE.join(',')});
const vec3 C_EYE = vec3(${EYE.join(',')});
void main(){
  vec3 c; float lit = 1.0;
  if (vK.y > 0.5){ c = C_EYE; }
  else {
    // ONE tone. Any step laid inside the figure (a band under the torso, a strip down the side, a lip on a bevel)
    // reads as a plane turning away, i.e. as volume; the drawing keeps its colour flat and leaves the form to
    // the outline, the way a flat character is drawn. The hour and the cloud shadow still reach it from outside.
    c = C_SKIN;
    lit = 1.0;
  }
  gLit = lit; gOwnSnow = true;
  oColor = vec4(c, 1.0);
  writeAux(uPlan, 1.0, vDepth, ${CHAR_ID}, lit, 1.0);
}
`;
const FS_HULL = /* glsl */`
${FS_COMMON}
const vec3 C_INK = vec3(${INK.join(',')});
void main(){
  gLit = 0.0; gOwnSnow = true;
  oColor = vec4(C_INK, 1.0);
  writeAux(uPlan, 1.0, vDepth, ${CHAR_ID}, 0.0, 1.0);
}
`;

// the cast shadow: a flat shape laid on the turf (the sun map is painted once, he moves)
const SH_VS = /* glsl */`
in vec3 position;
out vec3 vW; out float vDepth;
void main(){
  vec4 mv = viewMatrix * vec4(position, 1.0);
  vDepth = -mv.z; vW = position;
  gl_Position = projectionMatrix * mv;
}
`;
const SH_FS = /* glsl */`
in vec3 vW; in float vDepth;
uniform vec2 uC; uniform vec2 uDir; uniform vec2 uAB; uniform float uAmt;
void main(){
  vec2 d = vW.xz - uC;
  vec2 e = vec2(dot(d, uDir) / uAB.x, dot(d, vec2(-uDir.y, uDir.x)) / uAB.y);
  // a rounded shape, its edge brushed (the dabs are fixed to the turf)
  float n = brushWorld(vec3(vW.x, 0.0, vW.z), vec3(0.0, 1.0, 0.0), 0.55).a;
  float s = pow(pow(abs(e.x), 3.0) + pow(abs(e.y), 3.0), 1.0 / 3.0) + (n - 0.5) * 0.22;
  if (s * uAmt > 1.0) discard;
  vec3 c = mix(vec3(0.420, 0.590, 0.470), vec3(0.620, 0.700, 0.840), uSnow);
  gLit = 0.0; gOwnSnow = true;
  oColor = vec4(c, 1.0);
  writeAux(vec3(0.0, 1.0, 0.0), 0.0, vDepth, 0.31, 0.0, 0.0);
}
`;

// ---- the walker's world
const bounds = { cx: 4, cz: 14, R: 22 };
function blocked(x, z, m = 0.6) {
  if (Math.hypot(x - bounds.cx, z - bounds.cz) > bounds.R) return true;
  if (x > FLOOR.x0 - 1.2 && x < FLOOR.x1 + 1.2 && z > FLOOR.z0 - 1.2 && z < FLOOR.z1 + 1.2) return true;
  for (const s of LAYOUT.stand) if (Math.abs(x - s[0]) < s[2] + m && Math.abs(z - s[1]) < s[2] + m && Math.hypot(x - s[0], z - s[1]) < s[2] + m) return true;
  for (const [ax, az, bx, bz, half] of LAYOUT.walls) {
    const dx = bx - ax, dz = bz - az, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < half + m) return true;
  }
  for (const r of LAYOUT.lying) if (r[2] > 0.2 && Math.hypot(x - r[0], z - r[1]) < r[2] + m) return true;
  return false;
}

const wrapPi = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (t) => t * t * (3 - 2 * t);

// ---- the poses. A pose is a plain object of the drawing's parameters; the keys are held, never blended.
//   sx, sy: squash and stretch of the whole figure about his feet · up: height of the hop (m) · roll: lean in the
//   plane of the canvas · armL, armR: raise angle (0 hangs, + raises) · legs[4]: [dx, lift] · open: eyes open
//   (1) to shut (0), a smile at 0.5 · gx, gy: where the eyes look (-1..1)
function basePose() {
  return { sx: 1, sy: 1, up: 0, roll: 0, armL: 0.12, armR: 0.12, legs: [[0, 0], [0, 0], [0, 0], [0, 0]], open: 1, gx: 0, gy: 0 };
}
const POSES = {
  idle(s, T) {
    const p = basePose();
    // breathing, a held beat of two frames per key
    const b = Math.sin((Math.floor(s * HOLD / 2) / (HOLD / 2)) * 2.6);
    p.sy = 1 + 0.022 * b; p.sx = 1 - 0.012 * b;
    p.armL = 0.12 + 0.05 * b; p.armR = 0.12 + 0.05 * b;
    return p;
  },
  walk(s, T) {
    const p = basePose();
    const ph = (Math.floor(s * 2.7 * 8) / 8) % 1;                       // 8 keys to the step cycle
    const w = Math.sin(ph * Math.PI * 2);
    // (kept flat: no lean, the feet keep their spacing and one height; alternate legs lift in turn)
    p.up = Math.abs(w) * 0.04;
    p.sy = 1 - (Math.abs(w) - 0.5) * 0.03; p.sx = 1 + (Math.abs(w) - 0.5) * 0.02;
    const lift = (o) => (Math.sin((ph + o) * Math.PI * 2) > 0.2 ? 0.07 : 0);
    p.legs = [[0, lift(0)], [0, lift(0.5)], [0, lift(0)], [0, lift(0.5)]];
    p.armL = p.armR = 0.2 + w * 0.3;                                    // both swing together: a mirrored drawing
    return p;
  },
  wave(s, T) {
    const p = POSES.idle(s, T);
    const rise = ease(clamp(s / 0.3, 0, 1));
    const wag = Math.sin(Math.floor(s * HOLD) / HOLD * 17.0) * 0.38 * rise;
    p.armR = 0.12 + rise * 1.4 + wag;
    p.up = 0;
    return p;
  },
  hop(s, T) {
    const p = basePose();
    // anticipation, launch, air, land, settle: five held keys, then the arc
    if (s < 0.2) { p.sy = 0.78; p.sx = 1.12; p.armL = p.armR = 0.0; p.up = -0.0; }
    else if (s < 0.3) { p.sy = 1.2; p.sx = 0.9; p.up = 0.12; p.armL = p.armR = 1.0; p.open = 1; }
    else if (s < 0.72) {
      const u = (s - 0.3) / 0.42, a = Math.floor(u * 6) / 6;
      p.up = 0.12 + Math.sin(a * Math.PI) * 0.62; p.sy = 1.05; p.sx = 0.97; p.armL = p.armR = 1.45;

    } else if (s < 0.84) { p.sy = 0.82; p.sx = 1.1; p.armL = p.armR = 0.4; }
    else if (s < 0.98) { p.sy = 1.04; p.sx = 0.98; p.armL = p.armR = 0.2; }
    return p;
  },
  look(s, T) {
    const p = POSES.idle(s, T);
    // the eyes go to one side, rest, go to the other, come back: glances are held, not swept
    const k = [0, -1, -1, 0, 1, 1, 0.4, 0];
    const i = Math.min(k.length - 1, Math.floor(s / 0.42));
    p.gx = k[i]; p.gy = (i === 3 || i === 6) ? 0.5 : 0;
    return p;
  },
};
const DURATION = { idle: 1.6, walk: 0, wave: 2.4, hop: 1.0, look: 3.4 };

// ---- the creature
export default function (scene) {
  if (!ON) return;
  const geom = buildGeometry();
  const uniforms = {
    uRoot: { value: new THREE.Matrix4() },
    uParts: { value: PARTS.map(() => new THREE.Matrix4()) },
    uRes: { value: new THREE.Vector2(1280, 720) },
    uInk: { value: INK_PX },
    uPlan: { value: new THREE.Vector3(0, 0, 1) },
  };
  const fill = new THREE.Mesh(geom, mat({ vs: VS, fs: FS_FILL, uniforms }));
  const hull = new THREE.Mesh(geom, mat({ vs: VS, fs: FS_HULL, uniforms, defines: { HULL: 1 }, side: THREE.BackSide }));
  for (const m of [fill, hull]) { m.frustumCulled = false; m.matrixAutoUpdate = false; m.name = 'clawd'; scene.add(m); }

  // the cast shadow: a grid laid on the turf, rebuilt on the drawing's clock
  const GN = 14, shPos = new Float32Array((GN + 1) * (GN + 1) * 3), shIdx = [];
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const a = j * (GN + 1) + i; shIdx.push(a, a + 1, a + GN + 1, a + 1, a + GN + 2, a + GN + 1); }
  const shGeom = new THREE.BufferGeometry();
  shGeom.setAttribute('position', new THREE.BufferAttribute(shPos, 3));
  shGeom.setIndex(shIdx);
  const shU = { uC: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2(1, 0) }, uAB: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 1 } };
  const shadow = new THREE.Mesh(shGeom, mat({ vs: SH_VS, fs: SH_FS, uniforms: shU, side: THREE.DoubleSide }));
  shadow.frustumCulled = false; shadow.renderOrder = 0.2; shadow.name = 'clawd-shadow';
  scene.add(shadow);

  // ---- state
  const R = rng(9041);
  const S = {
    x: 4.5, z: 12.8, heading: 0, mode: 'idle', s: 0, dur: 1.2, tx: 0, tz: 0, T: 0,
    nextBlink: 2.5, blinkS: -1, waveCool: 6, face: 'viewer',
    held: null, tick: -1, hold: false, forced: null,
  };
  const viewer = () => globalThis.__app?.state?.pos ?? new THREE.Vector3(S.x, 1.7, S.z + 12);

  function choose() {
    const v = viewer(), dv = Math.hypot(v.x - S.x, v.z - S.z);
    // a wave for a viewer who has come near and is looking his way (once in a while)
    if (S.waveCool <= 0 && dv < 16 && dv > 2) {
      const c = globalThis.__app?.camera;
      let facing = 1;
      if (c) { const d = new THREE.Vector3(); c.getWorldDirection(d); facing = (d.x * (S.x - v.x) + d.z * (S.z - v.z)) / dv; }
      if (facing > 0.6) { S.mode = 'wave'; S.dur = DURATION.wave; S.s = 0; S.waveCool = 18 + R() * 20; return; }
    }
    const r = R();
    if (r < 0.52) {
      for (let k = 0; k < 14; k++) {
        const a = R() * 6.283, d = 3 + R() * 7;
        const tx = S.x + Math.sin(a) * d, tz = S.z + Math.cos(a) * d;
        if (blocked(tx, tz, 0.9)) continue;
        // the straight line there must be clear and not climb a bank
        let ok = true;
        for (let i = 1; i <= 8; i++) { const f = i / 8, px = S.x + (tx - S.x) * f, pz = S.z + (tz - S.z) * f; if (blocked(px, pz, 0.65)) { ok = false; break; } }
        if (!ok) continue;
        S.mode = 'walk'; S.tx = tx; S.tz = tz; S.s = 0; S.dur = 0; return;
      }
    } else if (r < 0.68) { S.mode = 'hop'; S.dur = DURATION.hop; S.s = 0; return; }
    else if (r < 0.84) { S.mode = 'look'; S.dur = DURATION.look; S.s = 0; return; }
    S.mode = 'idle'; S.dur = 1.2 + R() * 2.2; S.s = 0;
  }

  function step(dt) {
    S.T += dt; S.s += dt;
    S.waveCool -= dt;
    // blink: two keys of half-shut / shut, now and then
    S.nextBlink -= dt;
    if (S.nextBlink <= 0) { S.blinkS = 0; S.nextBlink = 2.2 + R() * 3.5; }
    if (S.blinkS >= 0) { S.blinkS += dt; if (S.blinkS > 0.25) S.blinkS = -1; }
    const v = viewer(), toV = Math.atan2(v.x - S.x, v.z - S.z);
    let want = S.heading;
    if (S.mode === 'walk') {
      const dx = S.tx - S.x, dz = S.tz - S.z, d = Math.hypot(dx, dz);
      want = Math.atan2(dx, dz);
      if (d < 0.12) { S.mode = 'idle'; S.s = 0; S.dur = 0.6 + R() * 1.5; }
      else {
        const sp = 1.35 * dt, nx = S.x + dx / d * Math.min(sp, d), nz = S.z + dz / d * Math.min(sp, d);
        if (blocked(nx, nz, 0.5)) { S.mode = 'idle'; S.s = 0; S.dur = 0.5; }
        else { S.x = nx; S.z = nz; }
      }
    } else {
      // standing, he turns to the viewer
      want = Math.hypot(v.x - S.x, v.z - S.z) < 60 ? toV : S.heading;
    }
    const da = wrapPi(want - S.heading), rate = S.mode === 'walk' ? 7 : 3.2;
    S.heading += clamp(da, -rate * dt, rate * dt);
    if (S.mode !== 'walk' && S.s >= S.dur) choose();
  }

  // ---- the held drawing: poses and positions are taken on the drawing's clock
  function snapshot() {
    const key = S.forced ?? { mode: S.mode, s: S.s };
    const p = POSES[key.mode](key.s, S.T);
    const blink = S.blinkS >= 0 ? (S.blinkS < 0.083 ? 0.45 : S.blinkS < 0.17 ? 0.05 : 0.45) : 1;
    p.open = Math.min(p.open, blink === 1 ? p.open : blink);
    S.held = { x: S.x, z: S.z, heading: S.heading, p, mode: key.mode };
  }

  // ---- per render: the model is put in the camera's own axes
  const tmp = { m: new THREE.Matrix4(), r: new THREE.Vector3(), u: new THREE.Vector3(), b: new THREE.Vector3(), e: new THREE.Vector3(), c: new THREE.Vector3() };
  const mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mS = new THREE.Matrix4(), mA = new THREE.Matrix4();
  function place(renderer, camera) {
    if (!S.held) snapshot();
    const H = S.held, p = H.p;
    const C = camera.position;
    const gy = height(H.x, H.z);
    const feet = tmp.e.set(H.x, gy, H.z);
    // (the card stands PUSH metres toward the eye, scaled down so that it keeps its size on the canvas)
    const dist = Math.hypot(C.x - feet.x, C.y - feet.y, C.z - feet.z);
    // (and farther the lower the eye: along a low look the turf between him and the viewer would bury his feet)
    const ce = Math.max(0, Math.sqrt(1 - Math.pow((C.y - feet.y) / Math.max(dist, 1e-3), 2)));
    const push = PUSH + 1.1 * Math.pow(ce, 6);
    const t = Math.min(0.45, push / Math.max(dist, 1e-3)), sc = (1 - t) * SC;
    tmp.c.set(feet.x + (C.x - feet.x) * t, feet.y + (C.y - feet.y) * t, feet.z + (C.z - feet.z) * t);
    tmp.r.setFromMatrixColumn(camera.matrixWorld, 0);
    tmp.u.setFromMatrixColumn(camera.matrixWorld, 1);
    tmp.b.setFromMatrixColumn(camera.matrixWorld, 2);
    // the hop is in the world's up, applied to the card's origin
    tmp.c.y += p.up * (1 - t) * SC;
    const m = uniforms.uRoot.value;
    m.makeBasis(tmp.r.clone().multiplyScalar(sc), tmp.u.clone().multiplyScalar(sc), tmp.b.clone().multiplyScalar(sc * SQUASH));
    m.setPosition(tmp.c);
    uniforms.uPlan.value.copy(tmp.b);
    // which way he goes on the canvas: sin(phi) = the screen-x of his heading, cos(phi) = toward the viewer
    const ca = Math.atan2(C.x - H.x, C.z - H.z), phi = wrapPi(H.heading - ca);
    const sinF = Math.sin(phi), cosF = Math.cos(phi);

    // the parts, in model units about the feet
    const P = uniforms.uParts.value;
    const put = (i, x, y, z, rot, sx = 1, sy = 1, sz = 1) => {
      mA.makeRotationZ(rot);
      mA.scale(new THREE.Vector3(sx, sy, sz));
      mA.setPosition(x, y, z);
      // whole-figure squash and lean about the feet
      mR.makeRotationZ(p.roll);
      mS.makeScale(p.sx, p.sy, 1);
      P[i].multiplyMatrices(mR, mS).multiply(mA);
    };
    put(0, 0, BODY.y, 0, 0);
    // arms: raised about the shoulder, in the plane of the card
    for (const [i, sgn, ang] of [[1, -1, p.armL], [2, 1, p.armR]]) {
      const sh = [sgn * (BODY.hx - 0.02), 0.50], off = [sgn * (ARM.hx + 0.015), -0.10];
      const a = sgn * ang;        // raising swings the free end up and out
      const ca2 = Math.cos(a), sa = Math.sin(a);
      put(i, sh[0] + off[0] * ca2 - off[1] * sa, sh[1] + off[0] * sa + off[1] * ca2, BODY.hz - ARM.hz + 0.03, a);   // (in front of the torso: a raised arm is not lost behind it)
    }
    LEG.xs.forEach((x, k) => put(3 + k, x + p.legs[k][0], LEG.hy + p.legs[k][1], -0.02, 0));
    // the face: the eyes slide across the plate, narrow toward the edge, and go round the side
    const back = ease(clamp((-cosF + 0.05) / 0.5, 0, 1));            // 1 = seen from behind: the eyes are gone
    const turn = clamp(sinF, -1, 1) * 0.215 + p.gx * 0.15;
    const narrow = 1 - 0.45 * Math.abs(sinF) * (1 - back);
    const hop = p.gy * 0.05;
    for (const [i, sgn] of [[7, -1], [8, 1]]) {
      const ex = clamp(sgn * EYEP.x * narrow + turn, -BODY.hx + 0.1, BODY.hx - 0.1);
      const smile = p.open < 0.6 && p.open > 0.4 ? 1 : 0;                // ^ ^ : a squint, lowered a little
      // (seen from behind they are behind the plate altogether)
      put(i, ex, EYEP.y + hop - smile * 0.03, back > 0.5 ? -BODY.hz - 0.2 : BODY.hz + 0.012, 0, narrow, Math.max(0.04, p.open), 1);
    }
    // (the card's origin is the feet; the eyes ride on the torso, so they squash with it: put() applies it)

    // the drawing buffer's size, for the width of the ink
    const rt = renderer.getRenderTarget();
    if (rt) uniforms.uRes.value.set(rt.width, rt.height);
    uniforms.uInk.value = INK_PX * (uniforms.uRes.value.y / 720);
  }
  fill.onBeforeRender = (renderer, sc, camera) => place(renderer, camera);

  // ---- the shadow, on the drawing's clock
  function laySh() {
    const H = S.held, sd = G.uSunDir.value;
    const el = Math.max(0.12, Math.asin(clamp(sd.y, 0.05, 1)));
    const horiz = Math.hypot(sd.x, sd.z) || 1, dir = new THREE.Vector2(-sd.x / horiz, -sd.z / horiz);
    const len = Math.min(2.4, 0.95 / Math.tan(el));
    const a = 0.45 + len * 0.5, b = 0.6;
    const amt = 1 + H.p.up * 1.8;                       // in the air the shadow is smaller
    shU.uC.value.set(H.x + dir.x * (a - 0.5), H.z + dir.y * (a - 0.5));
    shU.uDir.value.copy(dir); shU.uAB.value.set(a, b); shU.uAmt.value = amt;
    const ext = Math.max(a, b) * 1.3;
    let k = 0;
    for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) {
      const x = shU.uC.value.x + (i / GN * 2 - 1) * ext, z = shU.uC.value.y + (j / GN * 2 - 1) * ext;
      shPos[k++] = x; shPos[k++] = height(x, z) + 0.12; shPos[k++] = z;
    }
    shGeom.attributes.position.needsUpdate = true;
  }

  // ---- the clock (its own: the scene's is frozen for review shots)
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!S.hold) step(dt);
    const tick = Math.floor(S.T * HOLD);
    if (tick !== S.tick || S.hold) { S.tick = tick; snapshot(); laySh(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  choose();

  // review tools: freeze him, place him, play one pose at one time
  globalThis.__clawd = {
    S, POSES, blocked,
    put(x, z, heading = 0) { S.x = x; S.z = z; S.heading = heading; },
    freeze(mode = 'idle', s = 0.3) { S.hold = true; S.forced = { mode, s }; S.blinkS = -1; S.nextBlink = 1e9; S.waveCool = 1e9; snapshot(); laySh(); },
    release() { S.hold = false; S.forced = null; },
    feet() { return [S.x, height(S.x, S.z), S.z]; },
    // the body's corners on the canvas (px), for the review tools: width and height tell foreshortening
    bodyBox(camera, w, h) {
      const R = uniforms.uRoot.value, P = uniforms.uParts.value[0], pts = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const v = new THREE.Vector3(sx * BODY.hx, sy * BODY.hy, BODY.hz).applyMatrix4(P).applyMatrix4(R).project(camera);
        pts.push([(v.x * 0.5 + 0.5) * w, (0.5 - v.y * 0.5) * h]);
      }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2 };
    },
  };
}
