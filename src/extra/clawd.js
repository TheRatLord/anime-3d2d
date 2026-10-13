// Clawd, walking about the hill. A real 3D model (rounded blocks, every vertex smooth-normalled) drawn the way an
// anime character is drawn over a painted background: a cel-shaded figure that is TURNED to the light and to the eye.
//
//  - He stands in the world. He faces where he walks, turns to the viewer when he stops, and so shows his top from
//    above, his flank from the side, his back from behind - each with its own drawing of the form.
//  - Light is a toon ramp from the scene's own sun: a lit tone, a hue-shifted shade (richer and cooler, never just
//    darker), a deeper core in the turn away from the light, and the bounce of the turf in the shade's edge. The
//    sun map reaches him, so the shade of the trees falls across him as he walks under them, and the cloud
//    shadow and the hour of the day are laid on him like on everything else on the hill.
//  - The edges of the tones are hard, anti-aliased and broken by the painted brush so that they sit with the
//    country round him; a thin rim of sky light on the sun's side and a small glossy highlight keep him from
//    reading as clay.
//  - His eyes are drawn anime fashion: dark, with a gradient, a large and a small catchlight; a blush under them.
//  - Ink is a hull on the canvas in the deep tone of his own colour; it swells on the shaded underside and thins
//    in the light, as a pen line does.
//  - A held drawing: pose and position change on the scene's 12 fps clock, "on twos", and each pose is a key
//    (squash and stretch, held eyes), not an interpolation.
//
// ?clawd=0 leaves him out. window.__clawd drives him from the review tools (tools/clawdsheet.mjs).
import * as THREE from 'three';
import { mat, G } from '../glsl.js';
import { height, rng, FLOOR } from '../world.js';
import { LAYOUT } from '../layout.js';
import { CHAR_ID } from '../pipeline.js';

const q = new URLSearchParams(globalThis.location?.search ?? '');
const ON = q.get('clawd') !== '0';

//
const SC = 1.15;                    // metres per model unit: he is about a metre tall, a metre and a half across
// the cheats, each a dial between the solid model (0) and the flat card he was (1):
const SQUASH = +(q.get('csq') ?? 0.58);      // depth kept: 1 = the solid model, 0.12 = the old card
const TURN = +(q.get('cturn') ?? 0.5);       // how much of his real turn is shown (a 3/4 view at most; the back, when he walks away)
const PITCH = +(q.get('cpitch') ?? 0.65);    // how far the figure follows the camera's tilt, so the top is not shown from above
const PUSH = 0.18;                           // m toward the eye: he stands this far in front of his feet, scaled to keep his size
const INK_PX = 2.0;                 // outline width on a 720 px canvas (the hull swells and thins about this)
const HOLD = 12;                    // drawings per second

const ORANGE = [0.880, 0.490, 0.352];
const INK = [0.360, 0.150, 0.165];
const BLUSH = [0.950, 0.545, 0.480];

// ---- the model: parts in model units, origin at the feet, +y up, +z the way he faces
// kind  0 = skin, 1 = eye, 2 = catchlight, 3 = blush
const BODY = { y: 0.62, hx: 0.56, hy: 0.32, hz: 0.27, r: 0.13 };
const ARM = { x: 0.54, y: 0.48, hx: 0.105, hy: 0.105, hz: 0.12, r: 0.06 };
const LEG = { hx: 0.085, hy: 0.25, hz: 0.10, r: 0.05, xs: [-0.37, -0.17, 0.17, 0.37] };
const EYEP = { hx: 0.075, hy: 0.12, hz: 0.06, r: 0.05, x: 0.2, y: 0.70 };
const GLINT = { hx: 0.036, hy: 0.04, hz: 0.012, r: 0.012 };
const CHEEK = { hx: 0.09, hy: 0.048, hz: 0.012, r: 0.012, x: 0.37, y: 0.55 };
const PARTS = [
  { half: [BODY.hx, BODY.hy, BODY.hz], r: BODY.r, kind: 0 },        // 0
  { half: [ARM.hx, ARM.hy, ARM.hz], r: ARM.r, kind: 0 },            // 1 arm, screen left
  { half: [ARM.hx, ARM.hy, ARM.hz], r: ARM.r, kind: 0 },            // 2 arm, screen right
  ...LEG.xs.map(() => ({ half: [LEG.hx, LEG.hy, LEG.hz], r: LEG.r, kind: 0 })),   // 3..6
  { half: [EYEP.hx, EYEP.hy, EYEP.hz], r: EYEP.r, kind: 1 },        // 7
  { half: [EYEP.hx, EYEP.hy, EYEP.hz], r: EYEP.r, kind: 1 },        // 8
  { half: [GLINT.hx, GLINT.hy, GLINT.hz], r: GLINT.r, kind: 2 },    // 9  big catchlight, left eye
  { half: [GLINT.hx, GLINT.hy, GLINT.hz], r: GLINT.r, kind: 2 },    // 10 big catchlight, right eye
  { half: [GLINT.hx * 0.5, GLINT.hy * 0.45, GLINT.hz], r: GLINT.r * 0.5, kind: 2 },   // 11 small catchlight, left
  { half: [GLINT.hx * 0.5, GLINT.hy * 0.45, GLINT.hz], r: GLINT.r * 0.5, kind: 2 },   // 12 small catchlight, right
  { half: [CHEEK.hx, CHEEK.hy, CHEEK.hz], r: CHEEK.r, kind: 3 },    // 13 blush, left
  { half: [CHEEK.hx, CHEEK.hy, CHEEK.hz], r: CHEEK.r, kind: 3 },    // 14 blush, right
];
const EYE_L = 7, GL_BIG = 9, GL_SMALL = 11, CHEEK_L = 13;

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
uniform mat3 uNrm;
uniform mat4 uParts[${PARTS.length}];
uniform vec2 uRes;
uniform float uInk;
uniform vec3 uSunDir;
out vec3 vN; out vec3 vW; out vec3 vL; out vec2 vK; out float vDepth; out float vH;
void main(){
  int i = int(aPK.x + 0.5);
  mat4 P = uParts[i];
  vec3 pl = (P * vec4(position, 1.0)).xyz;
  vec3 nl = normalize(mat3(P) * normal);
  vec4 wp = uRoot * vec4(pl, 1.0);
  vec3 nw = normalize(uNrm * nl);
  vec4 mv = viewMatrix * wp;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
  vN = nw; vW = wp.xyz; vL = position; vK = aPK; vH = pl.y;   // (vH: height in model units, lift and squash of the step included)
#ifdef HULL
  // the line is a hull of constant width on the canvas, pushed out along the outline's normal. A pen line
  // swells where the form turns from the light and under the figure, and thins in the light.
  vec3 nv = mat3(viewMatrix) * nw;
  float l = length(nv.xy);
  float w = uInk * (0.62 + 0.95 * smoothstep(0.35, -0.55, dot(nw, uSunDir)) + 0.35 * smoothstep(0.1, -0.7, nw.y));
  // (a leg's line fades out where the leg goes up into the body: a lifted foot would otherwise ring the body's
  // underside with a dark line that moves with the step)
  if (i >= 3 && i <= 6) w *= smoothstep(${(BODY.y - BODY.hy).toFixed(3)}, ${(BODY.y - BODY.hy - 0.07).toFixed(3)}, pl.y);
  if (aPK.y > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  else if (l > 1e-4) gl_Position.xy += nv.xy / l * w * 2.0 / uRes * gl_Position.w;
#endif
}
`;
const FS_COMMON2 = /* glsl */`
in vec3 vN; in vec3 vW; in vec3 vL; in vec2 vK; in float vDepth; in float vH;
`;
const FS_FILL = /* glsl */`
${FS_COMMON2}
uniform float uFeetY;
uniform vec3 uCenter;
#define FEET_Y uFeetY
const vec3 C_SKIN = vec3(${ORANGE.join(',')});
const vec3 C_BLUSH = vec3(${BLUSH.join(',')});
const vec3 C_EYE_TOP = vec3(0.150, 0.085, 0.110);
const vec3 C_EYE_BOT = vec3(0.400, 0.190, 0.180);
const vec3 C_GLINT = vec3(1.000, 0.968, 0.905);
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCamPos - vW);
  vec3 L = normalize(uSunDir);
  float nv = clamp(dot(N, V), 0.0, 1.0);
  // the light is judged on a bulged normal (edited toward the body's own centre, as an animator edits a face's
  // normals): flat planes take their terminator as one clean curve across them, not as a patch of noise
  vec3 Nl = normalize(mix(N, normalize(vW - uCenter), 0.5));
  float ndl = dot(Nl, L);
  float nz = brushWorld(vW, N, 0.9).a;             // broad dabs fixed to him: the edges of tones are brushed, not stippled

  int kind = int(vK.y + 0.5);
  int pi = int(vK.x + 0.5);
  if (kind >= 2){
    // catchlights and blush are ovals cut from their plates
    vec2 hf = kind == 3 ? vec2(${CHEEK.hx}, ${CHEEK.hy}) : (pi >= ${GL_SMALL} ? vec2(${GLINT.hx * 0.5}, ${GLINT.hy * 0.45}) : vec2(${GLINT.hx}, ${GLINT.hy}));
    if (length(vL.xy / hf) > 1.0) discard;
  }
  float lit = 1.0;
  vec3 c;
  if (kind == 2){
    // a catchlight is light itself: it takes no shade
    c = C_GLINT; gLit = 1.0;
  } else {
    // ---- the light: the facing of the sun, then what stands between him and it
    // (sampled above the grass: its tufts are in the sun map and would speckle him with their shadow)
    float sh = shadowLit(vec3(vW.x, max(vW.y, FEET_Y + 0.75), vW.z) + N * 0.04, 3.5);
    float ramp = ndl + (nz - 0.5) * 0.05;
    lit = toneStep(ramp, 0.02, nz, 0.0) * toneStep(sh, 0.5, nz, 0.25);
    // the overhang of the body shades the top of his legs (a cast shadow, hard-edged)
    int part = int(vK.x + 0.5);
    float legBand = 0.0;
    if (part >= 3 && part <= 6){
      // (measured from the underside of the body, not from the leg: a lifted foot is shaded exactly as far as a
      // planted one, so the legs stay a set)
      float edge = ${(BODY.y - BODY.hy).toFixed(3)} - mix(0.05, 0.21, smoothstep(0.25, 0.95, L.y));
      legBand = toneStep(vH + (nz - 0.5) * 0.04, edge, nz, 0.0);
    }
    lit *= 1.0 - legBand;
    float turn = toneStep(ndl + (nz - 0.5) * 0.05, -0.55, nz, 0.0);      // the core: well away from the light

    vec3 base = kind == 3 ? C_BLUSH : C_SKIN;
    if (kind == 1){
      // the eye: dark at the lid, a warm brown toward the lower lid, as an anime eye is laid
      float t = clamp(vL.y / ${EYEP.hy} * 0.5 + 0.5, 0.0, 1.0);
      base = mix(C_EYE_BOT, C_EYE_TOP, smoothstep(0.15, 0.85, t));
    }
    vec3 cLit = base * (kind == 1 ? 1.0 : 1.03);
    vec3 cSh = base * (kind == 3 ? vec3(0.900, 0.820, 0.920) : vec3(0.815, 0.715, 0.865));
    vec3 cCore = base * (kind == 3 ? vec3(0.800, 0.700, 0.860) : vec3(0.680, 0.570, 0.775));
    if (kind == 1){ cSh = base * 0.82; cCore = base * 0.7; }
    c = mix(cSh, cLit, lit);
    c = mix(c, cCore, turn * (1.0 - lit));
    if (kind != 1){
      // bounce: the turf's light in the edge of the shade, low on the figure, a thin band inside the outline
      float edgeBand = smoothstep(0.50, 0.78, 1.0 - nv);
      float low = smoothstep(0.35, -0.55, N.y);
      c = mix(c, base * vec3(0.870, 0.800, 0.720) + vec3(0.02, 0.05, 0.0), (1.0 - lit) * edgeBand * mix(0.45, 0.8, low));
      // rim: sky light on the sun's side, a hard narrow band of pale peach at the edge
      float rim = step(0.74, 1.0 - nv + (nz - 0.5) * 0.04) * smoothstep(-0.15, 0.35, ndl) * step(-0.35, N.y);
      c = mix(c, vec3(1.0, 0.82, 0.66), rim * 0.62 * lit);
      // the sheen: a small hard highlight on the upper bevels, as a glossy figure is painted
      vec3 H = normalize(L + V);
      float sp = pow(max(dot(N, H), 0.0), 38.0);
      float spk = toneStep(sp, 0.5, nz, 0.0) * lit * step(0.15, N.y + 0.5 * N.z);
      c = mix(c, vec3(1.0, 0.915, 0.80), spk * 0.55 * (kind == 0 ? 1.0 : 0.0));
    }
    gLit = lit;
  }
  gOwnSnow = true;
  oColor = vec4(c, 1.0);
  writeAux(N, 1.0, vDepth, ${CHAR_ID}, lit, 1.0);
}
`;
const FS_HULL = /* glsl */`
${FS_COMMON2}
const vec3 C_INK = vec3(${INK.join(',')});
void main(){
  vec3 N = normalize(vN);
  float lit = step(0.0, dot(N, normalize(uSunDir)));
  gLit = 0.0; gOwnSnow = true;
  // the line takes a little of the light too: a touch warmer on the sunlit side
  oColor = vec4(mix(C_INK, C_INK * vec3(1.25, 1.12, 1.05), lit * 0.5), 1.0);
  writeAux(N, 1.0, vDepth, ${CHAR_ID}, 0.0, 1.0);
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

// the walk: his ground speed and the cadence fix the stride; a foot is planted for (1 - SWING) of its cycle
const WALK_SPEED = 1.0;                       // m/s
const WALK_CPS = 1.5;                         // steps a second, of each pair
const SWING = 0.4;
const STRIDE = 0.17;                          // model units, a foot's travel fore and aft either side of the middle
// ---- the poses. A pose is a plain object of the drawing's parameters; the keys are held, never blended.
//   sx, sy: squash and stretch of the whole figure about his feet · up: height of the hop (m) · roll: lean in the
//   plane of the canvas · armL, armR: raise angle (0 hangs, + raises) · legs[4]: [dx, lift, dz] · open: eyes open
//   (1) to shut (0), a smile at 0.5 · gx, gy: where the eyes look (-1..1)
function basePose() {
  return { sx: 1, sy: 1, up: 0, roll: 0, armL: 0.12, armR: 0.12, legs: [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], open: 1, gx: 0, gy: 0 };
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
    // 1.5 cycles a second on a 12 drawings-a-second clock: eight drawings to a step, each one a small move. The
    // pairs (legs 0 and 2 against 1 and 3) are half a cycle apart.
    const ph = (s * WALK_CPS) % 1;
    const w = Math.sin(ph * Math.PI * 2);
    p.roll = w * 0.035;
    p.up = Math.abs(w) * 0.035;
    p.sy = 1 - (Math.abs(w) - 0.5) * 0.03; p.sx = 1 + (Math.abs(w) - 0.5) * 0.02;
    // a foot in the swing (the first SWING of its cycle) lifts and comes forward; in the stance it is planted and
    // goes back under him at his own speed, so it does not skate. dz = how far fore and aft it travels about him.
    const foot = (o) => {
      const f = (ph + o) % 1;
      if (f < SWING) { const u = f / SWING; return [0, Math.sin(u * Math.PI) * 0.15, STRIDE * (u * 2 - 1)]; }
      const u = (f - SWING) / (1 - SWING);
      return [0, 0, STRIDE * (1 - u * 2)];
    };
    p.legs = [foot(0), foot(0.5), foot(0), foot(0.5)];
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
    uNrm: { value: new THREE.Matrix3() },
    uParts: { value: PARTS.map(() => new THREE.Matrix4()) },
    uRes: { value: new THREE.Vector2(1280, 720) },
    uInk: { value: INK_PX },
    uFeetY: { value: 0 },
    uCenter: { value: new THREE.Vector3() },
  };
  const fill = new THREE.Mesh(geom, mat({ vs: VS, fs: FS_FILL, uniforms }));
  const hull = new THREE.Mesh(geom, mat({ vs: VS, fs: FS_HULL, uniforms, defines: { HULL: 1 }, side: THREE.BackSide }));
  for (const m of [fill, hull]) { m.frustumCulled = false; m.matrixAutoUpdate = false; m.name = 'clawd'; m.renderOrder = 0.4; scene.add(m); }

  // the cast shadow: a grid laid on the turf, rebuilt on the drawing's clock
  const GN = 14, shPos = new Float32Array((GN + 1) * (GN + 1) * 3), shIdx = [];
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const a = j * (GN + 1) + i; shIdx.push(a, a + 1, a + GN + 1, a + 1, a + GN + 2, a + GN + 1); }
  const shGeom = new THREE.BufferGeometry();
  shGeom.setAttribute('position', new THREE.BufferAttribute(shPos, 3));
  shGeom.setIndex(shIdx);
  const shU = { uC: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2(1, 0) }, uAB: { value: new THREE.Vector2(1, 1) }, uAmt: { value: 1 } };
  // (laid on the turf BEFORE him and writing no depth: from a low eye the patch, a hand above the turf, would
  // otherwise stand in front of his feet and cut into the legs)
  const shadow = new THREE.Mesh(shGeom, mat({ vs: SH_VS, fs: SH_FS, uniforms: shU, side: THREE.DoubleSide, extra: { depthWrite: false } }));
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
        const sp = WALK_SPEED * dt, nx = S.x + dx / d * Math.min(sp, d), nz = S.z + dz / d * Math.min(sp, d);
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

  // ---- per render: the model stands in the world, turned the way he faces
  const mA = new THREE.Matrix4(), mR = new THREE.Matrix4(), mS = new THREE.Matrix4(), v3 = new THREE.Vector3();
  const tmp = { r: new THREE.Vector3(), u: new THREE.Vector3(), b: new THREE.Vector3(), bh: new THREE.Vector3(), c: new THREE.Vector3() };
  const mB = new THREE.Matrix4(), mY = new THREE.Matrix4();
  function place(renderer, camera) {
    if (!S.held) snapshot();
    const H = S.held, p = H.p;
    const gy = height(H.x, H.z);
    const C = camera.position;
    const dist = Math.hypot(C.x - H.x, C.y - gy, C.z - H.z);
    const t = Math.min(0.3, PUSH / Math.max(dist, 1e-3)), sc = (1 - t) * SC;
    tmp.c.set(H.x + (C.x - H.x) * t, gy + (C.y - gy) * t + p.up * (1 - t) * SC, H.z + (C.z - H.z) * t);
    // the drawing plane: the camera's right, and a "toward the viewer" that is the horizontal one tilted PITCH of
    // the way to the camera's own (0 = upright in the world, 1 = square to the canvas)
    tmp.r.setFromMatrixColumn(camera.matrixWorld, 0); tmp.r.y = 0; tmp.r.normalize();
    tmp.b.setFromMatrixColumn(camera.matrixWorld, 2).normalize();
    tmp.bh.set(tmp.b.x, 0, tmp.b.z).normalize();
    tmp.b.copy(tmp.bh).lerp(tmp.b, PITCH).normalize();
    tmp.u.crossVectors(tmp.b, tmp.r);
    // his turn, as the canvas shows it: half of it up to a 3/4 view, the whole of it once he turns his back
    const ca = Math.atan2(C.x - H.x, C.z - H.z), phi = wrapPi(H.heading - ca), ap = Math.abs(phi);
    const turn = Math.sign(phi) * (ap <= Math.PI / 2 ? ap * TURN : Math.PI / 2 * TURN + (ap - Math.PI / 2) * (Math.PI - Math.PI / 2 * TURN) / (Math.PI / 2));
    mY.makeRotationY(turn);
    // model -> drawing plane (depth squashed to SQUASH) -> world
    mB.makeBasis(tmp.r.clone().multiplyScalar(sc), tmp.u.clone().multiplyScalar(sc), tmp.b.clone().multiplyScalar(sc * SQUASH));
    mB.multiply(mY);
    mB.setPosition(tmp.c);
    uniforms.uRoot.value.copy(mB);
    uniforms.uNrm.value.getNormalMatrix(mB);
    uniforms.uFeetY.value = gy;
    uniforms.uCenter.value.set(0, BODY.y * 0.9, 0).applyMatrix4(mB);

    // the parts, in model units about the feet
    const P = uniforms.uParts.value;
    const put = (i, x, y, z, rot, sx = 1, sy = 1, sz = 1) => {
      mA.makeRotationZ(rot);
      mA.scale(v3.set(sx, sy, sz));
      mA.setPosition(x, y, z);
      // whole-figure squash and lean about the feet
      mR.makeRotationZ(p.roll);
      mS.makeScale(p.sx, p.sy, p.sx);
      P[i].multiplyMatrices(mR, mS).multiply(mA);
    };
    put(0, 0, BODY.y, 0, 0);
    // arms: raised about the shoulder, in the plane of his front
    for (const [i, sgn, ang] of [[1, -1, p.armL], [2, 1, p.armR]]) {
      const sh = [sgn * (BODY.hx - 0.02), 0.58], off = [sgn * (ARM.hx + 0.015), -0.10];
      const a = sgn * ang;        // raising swings the free end up and out
      const ca2 = Math.cos(a), sa = Math.sin(a);
      put(i, sh[0] + off[0] * ca2 - off[1] * sa, sh[1] + off[0] * sa + off[1] * ca2, 0.0, a);
    }
    // the feet: each finds the ground under it (the legs lengthen or shorten a little on a slope)
    const cH = Math.cos(H.heading), sH = Math.sin(H.heading);
    LEG.xs.forEach((x, k) => {
      const lx = H.x + cH * x * SC, lz = H.z - sH * x * SC;
      const drop = clamp(height(lx, lz) - gy, -0.12, 0.12) / SC;
      const lift = p.legs[k][1];
      put(3 + k, x + p.legs[k][0], LEG.hy + Math.max(lift, drop), (p.legs[k][2] ?? 0), 0);
    });
    // the face is part of the front of the body: it turns with him. The eyes only glance (gx, gy) and shut.
    const open = Math.max(0.04, p.open), squint = p.open < 0.6 && p.open > 0.4 ? 1 : 0;   // ^ ^ : a squint, lowered a little
    const fz = BODY.hz - 0.03;
    for (const [k, sgn] of [[0, -1], [1, 1]]) {
      const ex = sgn * EYEP.x + p.gx * 0.05, ey = EYEP.y + p.gy * 0.035 - squint * 0.03;
      put(EYE_L + k, ex, ey, fz, 0, 1, open, 1);
      // catchlights ride the eye: the big one at its upper edge, the small one low on the other side
      const seen = open > 0.5 ? 1 : 0, gz = fz + EYEP.hz + 0.004;
      put(GL_BIG + k, ex - sgn * 0.012, ey + 0.058 * open, seen ? gz : -1, 0, 1, seen ? open : 0.01, 1);
      put(GL_SMALL + k, ex + sgn * 0.016, ey - 0.062 * open, seen ? gz : -1, 0, 1, seen ? open : 0.01, 1);
      put(CHEEK_L + k, sgn * CHEEK.x, CHEEK.y, BODY.hz - 0.004, 0);
    }

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
