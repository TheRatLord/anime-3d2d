// Everything beyond the hill, built as flat painted VALUE PLANES (the camera never leaves the
// hilltop, so each object gets one baked haze amount snapped to a few steps, like the layers of a
// background painting; nothing fades smoothly):
//   - wooded hills (real mounds, 250-1100 m); their woods are thousands of individual crown cards
//   - lone trees, copses and hedgerows on the rolling ground and the plain (same crown atlas)
//   - the far plain painted in thin field strips, a road, a river, a village and a castle
//   - a wooded ridge ring and three pale mountain ranges: one flat value each, one faint shadow wash
// All cards are static and face the origin: nothing turns or slides when the camera moves.
import * as THREE from 'three';
import { mat, stepFog, STEP_FOG_GLSL } from '../glsl.js';
import { rng, height, fbm, smooth, SUN } from '../world.js';
import { GROUND_UNIFORMS } from '../terrain.js';
import { makeCrownAtlas, makeVillageTex, makeCastleTex, ATLAS } from './far-tex.js';

const TAU = Math.PI * 2;
const S2 = new THREE.Vector2(SUN.x, SUN.z).normalize();
// at azimuth a (as seen from the hilltop): sT > 0 = sun on the viewer's right; f = 1 fully front-lit, -1 against the light
const sunAt = (a) => ({ sT: -Math.sin(a) * S2.x + Math.cos(a) * S2.y, f: -(Math.cos(a) * S2.x + Math.sin(a) * S2.y) });
const annY = (r) => -31 + 4 * smooth(400, 520, r) + 22 * smooth(520, 1150, r);
const groundY = (x, z) => { const r = Math.hypot(x, z); return r < 500 ? height(x, z) : annY(r); };
// eye height of a viewer standing at the origin (the far landscape is composed for this eye)
const EYE_Y = height(0, 0) + 1.7;
const gauss = (R) => (R() + R() + R() + R() - 2) * 1.2;
// Draw order: everything here comes after the near scene (which hides much of it), and within the far
// landscape front to back, so that hidden paint is rejected by depth instead of being painted over.
const RO = { crowns: 1, cards: 2, hills: 3, plain: 4, birds: 5, range: 6 };

const COMMON = /* glsl */`
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y); }
${STEP_FOG_GLSL}
// Ground mist at the feet of the far hills: ONE flat pale value with a quiet, hard, almost level upper
// edge (a slow swell only - no lobes, no dabs, no second step). It is a function of the world position
// only (azimuth from the hilltop and height), so the hill, the crowns standing in it and the plain all
// cut the same line, and it lies in a few long patches that taper out to nothing.
// Returns 0 = none, 2 = mist.
// "top" is the SLOPE of the line of sight from the hilltop eye to the mist's upper edge (not a height): the
// edge is a line on the picture as seen from the hilltop, so a hill and every crown card standing before or
// behind it - each at its own distance - are cut at the same place on screen. (Cut at one world height
// instead, cards 50 m apart end 5-7 px apart under the long lens: a comb of crown-wide teeth.)
float mistStep(vec3 w, float top){
  float az = atan(w.z, w.x);
  float here = textureLod(uBrush, vec2(az * 0.83 + 0.2, 0.23), 0.0).a;                         // where a patch lies
  float swell = textureLod(uBrush, vec2(az * 2.1, 0.61), 0.0).a;
  float d = ${EYE_Y.toFixed(2)} + length(w.xz) * (top + (-46.0 * max(0.56 - here, 0.0) + (swell - 0.6) * 5.0) / 900.0) - w.y;
  return step(0.0, d) * 2.0;
}
const vec3 MIST_A = vec3(0.788, 0.867, 0.839), MIST_B = vec3(0.863, 0.922, 0.890);   // #C9DDD6, #DCEBE3
`;
const BASIC_VS = /* glsl */`
in vec3 position; in vec3 normal; in vec2 aUv;
out vec3 vW; out vec3 vN; out vec2 vUv; out float vDepth;
void main(){
  vW = position; vN = normal; vUv = aUv;
  vec4 mv = viewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

// ------------------------------------------------------------------------------------ hills
// The mound itself only carries the grass (two flat tones split by a brushed form-shadow step) and
// the dark floor under the woods; everything leafy is a crown card standing on it.
const HILL_FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vUv; in float vDepth;
flat in vec4 uHill;   // direction of the hill from the origin (xz), distance, mirror   (per hill, carried on its vertices:
flat in vec4 uP;      // fog, tile (m), mist top (slope), mist amount                         all twelve hills are one mesh)
flat in vec4 uQ;      // base height, height of the hill, texture offset, plane id
${COMMON}
void main(){
  vec3 n = normalize(vN);
  // panorama coordinates as seen from the hilltop: marks stay upright like on a painted layer
  float az = atan(dot(vW.xz, vec2(-uHill.y, uHill.x)), dot(vW.xz, uHill.xy));
  vec2 pu = vec2(az * uHill.w, -vW.y / length(vW.xz)) * uHill.z / uP.y;
  // Every shape on the hill is a threshold of SMOOTH noise computed here (never of the brush texture: one
  // texel of that is a metre and more out here, and under a long lens its dabs came out as blurred
  // rectangles): the edges are drawn edges at any magnification. Long and level, like strokes of a flat brush.
  vec2 po = pu + uQ.z * 7.0;
  // The tone shapes are long lazy BANDS lying along the slope (not level ovals): they are drawn in the
  // hill's own coordinates - along it, and up it by its height - so each follows the contour it lies on and
  // bends over the shoulder with the hill; a slow wobble lets a band rise, sag and run out.
  float hn = (vW.y - uQ.x) / uQ.y;
  vec2 pb = vec2(po.x, hn * 3.2 + (vn(po * vec2(0.9, 1.6) + 7.7) - 0.5) * 1.1);
  float n1 = vn(po * 3.1), n2 = vn(pb * vec2(0.55, 1.7) + 3.3) * 0.7 + vn(pb * vec2(1.3, 4.1) + 9.1) * 0.3, n3 = vn(pb * vec2(0.8, 3.3) + 17.0);
  // (the edge of every shape is roughened by two finer octaves, drawn out level: a brush edge, not an oval)
  float nf = (vn(po * vec2(7.0, 26.0) + 5.0) - 0.5) + (vn(po * vec2(19.0, 61.0) + 1.7) - 0.5) * 0.5;
  float lit = aastep(0.30, dot(n, uSunDir) + (n2 - 0.5) * 0.55 + (n1 - 0.5) * 0.10 + nf * 0.17);
  // grass: a pale yellow-green wash with a few long lighter strokes, one cool shade tone
  vec3 gl = mix(vec3(0.655, 0.745, 0.445), vec3(0.715, 0.79, 0.49), aastep(0.70, n3 + (n2 - 0.5) * 0.5 + nf * 0.12));
  gl = mix(gl, vec3(0.60, 0.71, 0.43), aastep(0.72, 1.0 - n3 + (n1 - 0.5) * 0.5 + nf * 0.12));
  vec3 gs = mix(vec3(0.475, 0.635, 0.435), vec3(0.42, 0.59, 0.43), aastep(0.66, n3 + (n1 - 0.5) * 0.4 - nf * 0.12));
  vec3 c = mix(gs, gl, lit);
  // floor of the woods (only glimpsed between crowns)
  float forest = aastep(0.62, vUv.x + (n1 - 0.5) * 0.25);
  c = mix(c, mix(vec3(0.27, 0.44, 0.33), vec3(0.30, 0.478, 0.322), lit), forest);
  c = atmo(c, uP.x);
  if (uP.w > 0.0) { float ms = mistStep(vW, uP.z); c = ms > 1.5 ? MIST_B : ms > 0.5 ? MIST_A : c; }
  oColor = vec4(c, 1.0);
  writeAux(vec3(0., 0., 1.), 0.0, vDepth, uQ.w, uQ.w, 0.0);
}
`;

const HILL_VS = /* glsl */`
in vec3 position; in vec3 normal; in vec2 aUv; in vec4 aHill; in vec4 aP; in vec4 aQ;
out vec3 vW; out vec3 vN; out vec2 vUv; out float vDepth;
flat out vec4 uHill; flat out vec4 uP; flat out vec4 uQ;
void main(){
  vW = position; vN = normal; vUv = aUv; uHill = aHill; uP = aP; uQ = aQ;
  vec4 mv = viewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const HILLS = [
  // near tier: wooded, readable individual crowns
  { x: -150, z: -350, rx: 250, rz: 150, rot: 0.3, H: 86, wood: 0.06, fog: 0.12 },    // north / north-west, behind the chapel
  { x: 270, z: -330, rx: 190, rz: 130, rot: -0.5, H: 70, wood: -0.02, fog: 0.24 },   // north-east
  { x: 480, z: -30, rx: 160, rz: 230, rot: 0.2, H: 64, wood: 0.02, fog: 0.24 },      // east
  { x: 400, z: 300, rx: 150, rz: 115, rot: 0.6, H: 40, wood: 0.10, fog: 0.24 },      // south-east: low wooded rise beside the open plain
  { x: -300, z: 330, rx: 210, rz: 140, rot: 0.6, H: 60, wood: 0.0, fog: 0.24 },      // south-west
  { x: -460, z: -20, rx: 150, rz: 250, rot: -0.1, H: 78, wood: 0.26, fog: 0.24 },    // west
  // far tier: paler second hills
  { x: 140, z: -780, rx: 340, rz: 210, rot: 0.1, H: 96, wood: 0.04, fog: 0.48 },
  { x: -650, z: -520, rx: 300, rz: 220, rot: 0.7, H: 104, wood: 0.0, fog: 0.48 },
  { x: 900, z: -350, rx: 300, rz: 240, rot: -0.3, H: 92, wood: -0.04, fog: 0.48 },   // the castle hill
  { x: -330, z: 860, rx: 280, rz: 180, rot: -0.2, H: 58, wood: 0.06, fog: 0.48 },
  { x: -820, z: 420, rx: 300, rz: 240, rot: 0.4, H: 86, wood: 0.02, fog: 0.48 },
  { x: 880, z: 800, rx: 250, rz: 180, rot: 0.5, H: 40, wood: 0.07, fog: 0.48 },
];
function hillH(h, x, z) {
  const dx = x - h.x, dz = z - h.z, c = Math.cos(h.rot), s = Math.sin(h.rot);
  const d = Math.hypot((dx * c + dz * s) / h.rx, (-dx * s + dz * c) / h.rz);
  if (d >= 1) return h.yb;
  const n = fbm(x * 0.0055 + h.seed * 7.3, z * 0.0055 + h.seed * 3.1, 3);
  const n2 = fbm(x * 0.021 + h.seed, z * 0.021, 2);
  const p = 1 - smooth(0, 1, d);
  return h.yb + h.H * Math.pow(p, 0.8) * (0.55 + 0.9 * n) + (n2 - 0.5) * h.H * 0.12 * p;
}
function hillN(h, x, z, e = 4) {
  const nx = hillH(h, x - e, z) - hillH(h, x + e, z), nz = hillH(h, x, z - e) - hillH(h, x, z + e), l = Math.hypot(nx, 2 * e, nz);
  return [nx / l, (2 * e) / l, nz / l];
}
// where the woods are: > 0 inside. Big irregular woods with ragged edges, leaving the high shoulders and some slopes bare.
function hillWood(h, x, y, z) {
  const n1 = fbm(x * 0.0046 + h.seed * 13.1, z * 0.0046 + h.seed * 5.7, 3), n2 = fbm(x * 0.024 + h.seed, z * 0.024 + 9, 2);
  const hn = Math.min(1, Math.max(0, (y - h.yb - 8) / h.H));
  return (n1 - 0.5) * 2.6 + (n2 - 0.5) * 0.5 + h.wood + (0.42 - hn) * 0.5 - 0.03;
}

function buildHills(scene) {
  const pos = [], nrm = [], uv = [], idx = [], aH = [], aP = [], aQ = [];
  HILLS.forEach((h, i) => {
    h.seed = i + 1;
    h.dist = Math.hypot(h.x, h.z);
    h.az = Math.atan2(h.z, h.x);
    h.yb = groundY(h.x, h.z) - 12;
    h.far = h.dist > 600;
    h.flip = sunAt(h.az).sT > 0 ? -1 : 1;
    h.tile = 120;
    h.off = (i * 0.317) % 1;
    { const df = h.dist - 0.7 * Math.min(h.rx, h.rz); h.mistY = (annY(df) + 9 - EYE_Y) / df; }      // (taken at the hill's near foot)
    h.mist = h.far ? 1 : 0;      // (a slope from the eye: see mistStep)
    const NR = 40, NS = 96, v0 = pos.length / 3;
    const c = Math.cos(h.rot), s = Math.sin(h.rot);
    const P = (d, a) => { const lx = Math.cos(a) * d * h.rx, lz = Math.sin(a) * d * h.rz; return [h.x + lx * c - lz * s, h.z + lx * s + lz * c]; };
    const push = (x, z) => {
      const y = hillH(h, x, z);
      pos.push(x, y, z); nrm.push(...hillN(h, x, z, 3));
      uv.push(Math.min(1, Math.max(0, 0.5 + hillWood(h, x, y, z) * 2.5)), 0);
      aH.push(Math.cos(h.az), Math.sin(h.az), h.dist, h.flip);
      aP.push(h.fog, h.tile, h.mistY, h.mist);
      aQ.push(h.yb, h.H, h.off, 0.45 + h.fog * 0.5);
    };
    push(h.x, h.z);
    for (let r = 1; r <= NR; r++) for (let j = 0; j < NS; j++) { const [x, z] = P(r / NR, (j / NS) * TAU); push(x, z); }
    for (let j = 0; j < NS; j++) idx.push(v0, v0 + 1 + ((j + 1) % NS), v0 + 1 + j);
    for (let r = 1; r < NR; r++) {
      const a0 = v0 + 1 + (r - 1) * NS, b0 = v0 + 1 + r * NS;
      for (let j = 0; j < NS; j++) { const j1 = (j + 1) % NS; idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j); }
    }
  });
  // one mesh for all the hills, the near tier first in the index (so it is drawn first and hides the far tier)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aHill', new THREE.Float32BufferAttribute(aH, 4));
  g.setAttribute('aP', new THREE.Float32BufferAttribute(aP, 4));
  g.setAttribute('aQ', new THREE.Float32BufferAttribute(aQ, 4));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat({ vs: HILL_VS, fs: HILL_FS, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = RO.hills; m.userData.grp = 'far-hills';
  scene.add(m);
}

// ------------------------------------------------------------------------------------ crown cards
// One instanced draw for every crown, lone tree, rock outcrop and hedge. Cards are vertical, face
// the origin and never move. Three flat tones: sun cap (threshold per instance), shadow body, dark accent.
const CROWN_VS = /* glsl */`
in vec3 position;
in vec4 iPos;    // foot xyz, card size (m)
in vec4 iA;      // atlas cell, mirror (sign) and width factor (magnitude), cap threshold, fog
in vec4 iB;      // kind (0 foliage, 1 rock), hue jitter -1..1, value jitter -1..1 (-2: part of a wood mass), mist top (slope from the eye) or -1e5
in vec4 iC;      // a wood mass as seen from the hilltop: its foot and its top (slopes from the eye) at this card's left and right edge
in vec4 iD;      // place along the mass (at the left and right edge, in units of its interior shapes), seed, sun (1 front-lit .. -1 against the light)
out vec4 vM;      // (hM: place in the wood's mass 0 foot .. 1 top; the interior shapes' coordinates (2); a seed per crown)
out vec2 vUv; out vec2 vA; out vec4 vB; out vec3 vW; out vec2 vLy;
void main(){
  vLy = vec2(position.y * 0.5 + 0.5, position.x * sign(iA.y));
  vec2 d = normalize(iPos.xz);
  vec3 w = iPos.xyz + vec3(-d.y, 0.0, d.x) * position.x * iPos.w * 0.5 * abs(iA.y) + vec3(0., 1., 0.) * (position.y * 0.5 + 0.5) * iPos.w;
  vW = w;
  vec2 cuv = vec2(position.x * sign(iA.y), -position.y) * 0.495 + 0.5;
  vUv = (cuv + vec2(mod(iA.x, ${ATLAS.cols}.0), floor(iA.x / ${ATLAS.cols}.0))) / vec2(${ATLAS.cols}.0, ${ATLAS.rows}.0);
  vA = iA.zw; vB = iB;
  float e = position.x * 0.5 + 0.5;
  // (hM: where this corner stands in its wood's mass, 0 at the foot .. 1 on the top line, as seen from the hilltop)
  float bot = mix(iC.x, iC.y, e), top = mix(iC.z, iC.w, e);
  // (the mass's height in the units of its interior shapes along it: the shapes are laid out in the picture's
  // own proportions, so a long low belt does not stretch them into level stripes)
  float hs = clamp((top - bot) * abs(iD.y - iD.x) / max(iPos.w * abs(iA.y) / length(iPos.xz), 1e-5), 0.25, 3.0);
  float hM = ((w.y - ${EYE_Y.toFixed(2)}) / length(w.xz) - bot) / max(top - bot, 1e-4);
  vM = vec4(hM, mix(iD.x, iD.y, e) + iD.z * 9.7, hM * hs + iD.z * 5.3, fract(sin(dot(iPos.xz, vec2(12.9898, 78.233))) * 43758.5453));
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;
const WOOD_K = +(new URLSearchParams(location.search).get('woodk') ?? 0.24);
const WOOD_FX = new URLSearchParams(location.search).get('woodfx') !== '0';
const CROWN_FS = /* glsl */`
in vec2 vUv; in vec2 vA; in vec4 vB; in vec3 vW; in vec2 vLy; in vec4 vM;
uniform sampler2D uAtlas;
${COMMON}
void main(){
  vec4 t = texture(uAtlas, vUv, -0.6);
  if (t.a < 0.5) discard;
  float cap = aastep(vA.x, t.r);
  float dk = aastep(0.5, t.g) * (1.0 - cap);
  if (vB.x > 0.3 && vB.x < 0.5) dk = 0.0;      // a crown in the middle of a wood: no dark accent of its own (see woodMass)
  float j = vB.y;
  // #A3BF6C lit / #4C7A52 shadow / #335C4C accent, each crown leaning a little yellow or teal
  vec3 lit = mix(vec3(0.640, 0.750, 0.425), j > 0.0 ? vec3(0.715, 0.790, 0.445) : vec3(0.545, 0.700, 0.415), abs(j));
  vec3 sh = mix(vec3(0.300, 0.478, 0.322), j > 0.0 ? vec3(0.300, 0.490, 0.290) : vec3(0.270, 0.455, 0.365), abs(j));
  sh *= 1.0 + max(vB.z, -1.0) * step(-1.0, vB.z) * 0.085;
  vec3 ac = vec3(0.200, 0.360, 0.298);
  if (vB.x > 2.2) { ac = sh; }                                                              // the foot of a wood: the wood's own tone (see below)
  else if (vB.x > 1.5) { sh = vec3(0.335, 0.515, 0.375); ac = vec3(0.285, 0.455, 0.345); }      // contact strip: shadow and undergrowth at a tree's foot
  else if (vB.x > 0.5) { lit = vec3(0.800, 0.815, 0.755); sh = vec3(0.610, 0.665, 0.650); ac = vec3(0.45, 0.55, 0.50); }
  // on the far, pale tier the sun cap of a crown comes out at the very value of the sunlit grass behind it
  // (the haze has pressed the two together), so a wood there read as a pale see-through sheet lying over
  // the hill: there the cap is held a firm step under the grass - no crown is paler than its own hill
  if (vA.y > 0.4 && vB.x < 0.5) lit *= vec3(0.72, 0.80, 0.66);
  // a crown INSIDE a wood (kind 0.25): its sun cap is a step nearer its body than a lone tree's. Hundreds of
  // overlapping crowns with pale caps on dark bodies are an even two-value speckle - camouflage through a
  // long lens; a wood is one dark mass with lighter tops, a painter's two close greens.
  if (vB.x > 0.1 && vB.x < 0.5) lit = mix(lit, sh * vec3(1.16, 1.10, 1.02), ${WOOD_K.toFixed(3)});
  // A WOOD IS PAINTED AS ONE MASS. Where a fragment lies in it is read off the mass as it is seen from the
  // hilltop: hM = 0 at its foot, 1 at its upper contour (both lines carried by the cards and continuous from
  // crown to crown), uM = along it. On that one shape:
  //  - a SECOND BODY TONE, a step deeper and cooler, in two or three big lazy shapes through its middle;
  //  - the FOOT: the lowest sixth goes darker, with a soft upper edge - the same silhouette, no strip.
  // (The sun caps are chosen crown by crown from the same hM: only along the top third, in a few clusters.)
  // Every one of these is a THRESHOLD (a flat value with a cut edge), never a lerp: a lerp across the mass
  // is an airbrushed gradient. The edges are roughened by two finer octaves (a loaded brush), and the
  // crowns' own lobes (cap field R, belly G of the atlas) push the edge in and out, so a tone shape is
  // bounded by crown scallops, not by a smooth noise contour.
  if (${WOOD_FX} && vB.z < -1.5 && cap < 0.999) {
    float hM = vM.x;
    // (two reads of the shared brush texture in the mass's own coordinates: A its soft field for the big
    // shapes, R its medium dabs for the brush-cut edges)
    vec2 pm = vM.yz;
    vec4 nA = textureLod(uBrush, pm * 0.13, 0.0), nB = textureLod(uBrush, pm * vec2(0.61, 0.47) + 0.37, 0.0);
    float rag = (nA.r - 0.5) * 0.12 + (nB.r - 0.5) * 0.07;
    float lobe = t.r * 0.14 - t.g * 0.12;
    float s1 = 0.5 + (nA.a - 0.5) * 1.9 + rag;
    // second body tone: deeper and cooler, two or three big shapes through the middle, bellies hanging into it
    float body2 = aastep(0.52, s1 - lobe) * (1.0 - aastep(0.66 + (nB.a - 0.5) * 1.8, hM + rag * 0.6 - lobe));
    // third: a lighter, yellower mid tone - crown tops in one or two clusters high in the body
    float mid = aastep(0.22, t.r * 0.5 + (nB.a - 0.56) * 5.5 + (hM - 0.62) * 0.6 + rag) * (1.0 - body2);
    vec3 b0 = sh;
    sh = mix(sh, b0 * vec3(0.855, 0.895, 0.955), body2);
    sh = mix(sh, mix(b0, lit, 0.24), mid);
    // the FOOT: a flat darker band, its top edge ragged and wandering, rising into the body at one or two points
    // (its wander is the same soft field as the body shapes: where a dark shape stands low, the foot rises into it)
    float fl = 0.16 + (nA.a - 0.5) * 0.45 + rag * 0.9 + 0.24 * aastep(0.62, nA.a + nB.a * 0.3 - 0.15 + rag * 0.5);
    float foot = 1.0 - aastep(fl, hM - t.g * 0.12);
    sh = mix(sh, b0 * vec3(0.78, 0.84, 0.91), foot);
    // a few trunks in the foot band, lit grey stems against the dark (one crown in three, near its middle)
    float tx = vLy.y - (vM.w - 0.5) * 0.5, tw = 0.022 + 0.012 * fract(vM.w * 7.0);
    float trk = (1.0 - aastep(tw, abs(tx + (vLy.x - 0.2) * (fract(vM.w * 13.0) - 0.5) * 0.3))) * step(fract(vM.w * 3.7), 0.36) * foot * (1.0 - aastep(fl - 0.03, hM + 0.05));
    sh = mix(sh, mix(b0, vec3(0.50, 0.47, 0.42), 0.42), trk);
    ac = mix(ac, sh * vec3(0.86, 0.90, 0.94), 0.55);
  }
  vec3 c = mix(mix(sh, lit, cap), ac, dk);
  c = mix(c, vec3(0.35, 0.34, 0.31), aastep(0.5, t.b));
  c = atmo(c, vA.y);
  if (vB.w > -1.0e3) { float ms = mistStep(vW, vB.w); c = ms > 1.5 ? MIST_B : ms > 0.5 ? MIST_A : c; }
  oColor = vec4(c, 1.0);
  float pl = 0.45 + vA.y * 0.5;
  writeAux(vec3(0., 0., 1.), 0.0, 1.0 / gl_FragCoord.w, pl, pl, 0.0);
}
`;
// Inside a wood no crown takes the BROADEST sun cap (first grey level of the atlas): the crowns overlap, each
// one's dark under-plane is hidden by the crown in front, and broad caps then run together into pale sheets
// with dark specks - a camouflage pattern through a long lens. With the second level as the largest, every
// crown is a light top on a darker body and a sunlit wood reads as rows of crown scallops.
const CAP_N = +(new URLSearchParams(location.search).get('capn') ?? 1.5), CAP_T = +(new URLSearchParams(location.search).get('capt') ?? 0.34);
const WOOD_CAP = +(new URLSearchParams(location.search).get('woodcap') ?? 0.52);
function buildCrowns(scene, atlas) {
  const R = rng(321);
  const P = [], A = [], B = [], NB = 4, GP = [];      // (GP: the wood a crown belongs to, see the masses below)
  let curGrp = 0;
  // foot at (x, y, z); s = card size; th = cap threshold (low = big sun cap); mist = top of the ground mist there; wd = width factor
  // HAZE RULE: a card is never paler than the plane directly behind it. The ground steps paler with
  // distance, but the near hills are painted darker than the ground at their feet (one firm dark plane each),
  // so a copse standing on the rolling ground in front of such a hill, given the ground's step, was a pale
  // shape sliding over a darker one - it read as a translucent overlay. Looking out from the hilltop along
  // the card's azimuth (and a little to either side: the eye walks about), any hill within reach behind it
  // caps its haze. Crowns that stand on a hill keep that hill's own step (capOn = false while they are placed).
  let capOn = false;
  const capFog = (x, z, fog) => {
    if (!capOn) return fog;
    const r = Math.hypot(x, z), a0 = Math.atan2(z, x);
    for (const h of HILLS) {
      if (h.fog >= fog || h.dist + Math.max(h.rx, h.rz) < r) continue;
      const c = Math.cos(h.rot), s = Math.sin(h.rot);
      let hit = false;
      for (let k = -1; k <= 1 && !hit; k++) for (let t = r; t < r + 700 && !hit; t += 20) {
        const px = Math.cos(a0 + k * 0.05) * t - h.x, pz = Math.sin(a0 + k * 0.05) * t - h.z;
        if (Math.hypot((px * c + pz * s) / h.rx, (-px * s + pz * c) / h.rz) < 0.92) hit = true;
      }
      if (hit) fog = h.fog;
    }
    return fog;
  };
  const add = (x, y, z, s, cell, th, fog, kind = 0, mist = -1e5, wd = 1) => {
    fog = capFog(x, z, fog);
    const a = Math.atan2(z, x);
    // neighbouring crowns lean the same way (yellower stands, tealer stands), with a little individual scatter
    const j = (fbm(x * 0.013 + 70, z * 0.013, 2) - 0.5) * 3.2 + gauss(R) * 0.35;
    // (a crown of a wood is the wood's own tone: only the slow drift of hue from stand to stand, no value of
    // its own - forty overlapping crowns each a twentieth lighter or darker than the next are a mush)
    const inWood = kind > 0.2 && kind < 0.3, jw = (fbm(x * 0.013 + 70, z * 0.013, 2) - 0.5) * 2.2, vj = R() < 0.3 ? 0.4 + R() * 0.6 : -R() * 0.5;
    if (inWood) GP[B.length / NB] = curGrp;
    P.push(x, y, z, s); A.push(cell, (sunAt(a).sT > 0 ? -1 : 1) * wd, th, fog); B.push(kind, kind > 0.5 ? 0 : Math.max(-1, Math.min(1, inWood ? jw : j)), inWood ? 0 : vj, mist);
  };
  // cap threshold from how much sun a crown gets: L = 1 broad cap (first grey level), 0 = a sliver or nothing
  const capTh = (L, x, z) => {
    const f = sunAt(Math.atan2(z, x)).f;
    // neighbours agree (clusters of sunlit tops inside a shadow mass, not an even sprinkle)
    // (in stands of a dozen crowns and more: at the scale of single crowns the caps were an even speckle of
    // equal light blobs over the whole wood under a long lens; most of a wood is its dark mass)
    const l = Math.min(1, Math.max(0, L * (0.72 + 0.28 * f))) + (fbm(x * 0.017 + 31, z * 0.017 + 17, 2) - 0.5) * CAP_N + (fbm(x * 0.06 + 3, z * 0.06 + 7, 2) - 0.5) * 0.35 + (R() - 0.5) * 0.12;
    return l < CAP_T ? 1.5 : l < CAP_T + 0.10 ? 0.9 : l < 0.62 ? 0.52 : 0.24;
  };
  // contact: a low dark stroke of undergrowth and shadow standing at the foot of a tree or a wood edge, a
  // little in front of it (toward the hilltop), so nothing leafy meets the pale ground on a bare line.
  // It is the hedge cell, never sunlit, stretched sideways: wide = its width in metres.
  const SR = rng(4711), BQ = rng(5151);
  const strip = (x, yG, z, wide, fog, mist, gy) => {
    // (a lone tree's stroke stays right at its foot: its ground height is only known there)
    // (the foot of a WOOD - gy given - is no stroke of its own: it stands right at the crown's foot in the wood's
    // own darkened body tone, so the mass comes down to the ground on one closed edge)
    const rr = Math.hypot(x, z), k = 1 - (gy ? 0.5 : 0.4) / rr, sx = x * k, sz = z * k;
    const wd = 2.4 + SR() * 0.8, s = wide / wd;
    P.push(sx, (gy ? gy(sx, sz) : yG) - s * 0.10, sz, s); A.push(19, (SR() < 0.5 ? -1 : 1) * wd, 1.5, capFog(x, z, fog));
    if (gy) B.push(2.5, Math.max(-1, Math.min(1, (fbm(x * 0.013 + 70, z * 0.013, 2) - 0.5) * 2.2)), -2, mist ?? -1e5); else B.push(2, 0, 0, mist ?? -1e5);
  };
  // (shade = the crown stands on a slope the hill paints in its SHADE tone: there it gets a sliver of sun at most.
  // A broad sun cap is paler than the shaded grass behind it, and a whole wood of them reads as a pale
  // translucent sheet sliding over the hill.)
  const shadeIdx = new Set();
  const woodCrown = (x, yG, z, r, L, fog, mist, shade) => { const s = (2 * r) / 0.62, cell = Math.floor(R() * 8), th = capTh(L, x, z); if (shade) shadeIdx.add(B.length / NB); add(x, yG + r * 0.55 - s * 0.47, z, s, cell, shade ? Math.max(th, 0.9) : Math.max(th, WOOD_CAP), fog, 0.25, mist); };
  // lone trees: every one its own proportions (W is a separate stream so the placement stays as it was),
  // and never a crown that is all sun: the cap stops at the second level, leaving a shadow side and a dark underside
  const W = rng(977);
  const loneTree = (x, yG, z, hgt, L, fog, cell = 8 + Math.floor(R() * 8), mist) => {
    const s = hgt / 0.8, th = capTh(L, x, z);
    // (no pillars: the columnar cell is rare, and no tree is squeezed narrower than it was painted)
    if (cell === 13 && W() < 0.85) cell = 8 + Math.floor(W() * 5);
    add(x, yG - s * 0.075, z, s, cell, Math.max(th, (W(), 0.52)), fog, 0, mist, 0.92 + W() * 0.42);
    strip(x, yG, z, hgt * 0.85, fog, mist);
  };
  // a loose group of lone trees: 3-7, overlapping, mixed kinds and sizes, never in a row
  const group = (cx, cz, gy, fog, n, rad, base, mist) => {
    for (let i = 0; i < n; i++) {
      const b = R() * TAU, d = Math.sqrt(R()) * rad, x = cx + Math.cos(b) * d, z = cz + Math.sin(b) * d;
      const sc = Math.min(1.6, Math.max(0.6, Math.exp(gauss(R) * 0.38)));
      loneTree(x, gy(x, z), z, base * sc, 0.35 + R() * 0.5, fog, undefined, mist);
    }
  };

  for (const h of HILLS) {
    curGrp = h.seed;
    const hillG = (u, v) => Math.max(groundY(u, v), hillH(h, u, v));
    const area = h.rx * h.rz * Math.PI, n = Math.floor(area / (h.far ? 110 : 30));
    const c = Math.cos(h.rot), s = Math.sin(h.rot);
    const rMed = h.far ? 8.5 : 5.0, rMin = h.far ? 5.5 : 3, rMax = h.far ? 15 : 9;
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(R()) * 0.98, a = R() * TAU;
      const lx = Math.cos(a) * d * h.rx, lz = Math.sin(a) * d * h.rz;
      const x = h.x + lx * c - lz * s, z = h.z + lx * s + lz * c;
      const y = hillH(h, x, z);
      if (y < groundY(x, z) - 1 && Math.hypot(x, z) < 520) continue;
      const w = hillWood(h, x, y, z);
      const N = hillN(h, x, z), ndl = N[0] * SUN.x + N[1] * SUN.y + N[2] * SUN.z;
      // sun on the slope, broken into big light and dark masses (hollows, cloud shadow) rather than an even sprinkle
      const L = smooth(0.2, 0.62, ndl) * (0.1 + 0.9 * smooth(0.36, 0.44, fbm(x * 0.011 + 5 + h.seed, z * 0.011, 2)));
      const mist = h.mist ? h.mistY : -1e5;
      if (w > 0) {
        if (R() > 0.35 + w * 5) continue;                 // thinner toward the edge of a wood, so single crowns read there
        const r = Math.min(rMax, Math.max(rMin, rMed * Math.exp(gauss(R) * 0.38)));
        woodCrown(x, y, z, r, L * (0.45 + R() * 0.75), h.fog, mist, ndl < 0.34);
        // where the wood comes down to the valley floor, its edge stands on a dark stroke
        if (y - groundY(x, z) < 7 && SR() < 0.7) strip(x, 0, z, r * 2.7, h.fog, mist, hillG);
      } else {
        const hn = (y - h.yb) / h.H, q = R();
        // pale outcrops on the steep upper slopes, in a few clusters; a few loners and bushes on the grass
        const rk = fbm(x * 0.012 + h.seed * 3, z * 0.012 + 40, 2);
        if (hn > 0.3 && rk > 0.62 && N[1] < 0.985 && q < 0.12) { const rs = (h.far ? 15 : 8) * Math.exp(gauss(R) * 0.5); add(x, y - rs * 0.42, z, rs, 16 + Math.floor(R() * 3), ndl > 0.3 ? 0.5 : 1.5, h.fog, 1, mist); }
        else if (q > 0.975 && w > -0.3) group(x, z, (u, v) => hillH(h, u, v), h.fog, 1 + Math.floor(R() * 3), 7, h.far ? 17 : 11, mist);
        else if (q > 0.96) {
          // a bush on the open slope: never a lone low dash (a flat lozenge with a dark line under it is a sticker
          // on the hill) but a rounded bush with one or two smaller ones against it, overlapping - a small clump
          const bs = (h.far ? 16 : 9) * (0.7 + R() * 0.6), th = (R(), capTh(L, x, z));
          add(x, y - bs * 0.13, z, bs, 14, Math.max(th, 0.52), h.fog, 0, mist, 1.1);
          const rr = Math.hypot(x, z), tx = -z / rr, tz = x / rr;
          for (let b = 0, nb = 1 + Math.floor(BQ() * 2); b < nb; b++) {
            const off = (b ? -1 : 1) * bs * (0.32 + BQ() * 0.3), k = 1 - (0.6 + b) / rr, x2 = (x + tx * off) * k, z2 = (z + tz * off) * k, s2 = bs * (0.5 + BQ() * 0.3);
            P.push(x2, hillH(h, x2, z2) - s2 * 0.13, z2, s2); A.push(14, (BQ() < 0.5 ? -1 : 1) * (1.1 + BQ() * 0.4), Math.max(th, 0.9), h.fog); B.push(0, B[B.length - 3], -BQ() * 0.5, mist);
          }
        }
      }
    }
  }
  capOn = true;
  // lone trees and small copses on the rolling ground around the hill
  for (let k = 0; k < 64; k++) {
    const a = R() * TAU, rr = 112 + Math.pow(R(), 0.8) * 390;
    if (Math.cos(a - 1.1) > 0.55 && R() < 0.75) continue;     // keep the south-east open
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, fog = stepFog(rr);
    curGrp = 100 + k;
    if (R() < 0.3) {     // a copse: a pile of crowns with a few distinct trees at its edge
      const n = 8 + Math.floor(R() * 14), rad = 9 + n * 0.7, el = 0.5 + R() * 0.5, ea = R() * TAU;
      for (let i = 0; i < n; i++) {
        const b = R() * TAU, d = Math.sqrt(R()) * rad, ux = Math.cos(b) * d, uz = Math.sin(b) * d * el;
        const x = cx + ux * Math.cos(ea) - uz * Math.sin(ea), z = cz + ux * Math.sin(ea) + uz * Math.cos(ea);
        const r = Math.min(9, Math.max(3, 5.2 * Math.exp(gauss(R) * 0.35)));
        woodCrown(x, height(x, z) + r * 0.5, z, r, 0.5 + R() * 0.5, fog);
        if (i % 2 === 0) strip(x, 0, z, r * 2.7, fog, undefined, height);
      }
      group(cx, cz, height, fog, 3 + Math.floor(R() * 3), rad * 1.25, 12);
    } else group(cx, cz, height, fog, 3 + Math.floor(R() * 5), 7 + R() * 9, 11.5);
  }
  // --- the middle distance, between the home hill and the pale plain: broken BELTS of dark wood lying
  // along the foot of the hill (the one mid-dark plane every outward view crosses), and thin hedge lines
  // beyond them. Own random stream: everything placed before and after stays where it was.
  {
    const Q = rng(8086);
    // [azimuth (deg), half span (deg), distance, rows]
    for (const [azd, half, r0, rows] of [[38, 20, 200, 3], [92, 15, 172, 2], [141, 24, 188, 3], [197, 19, 214, 3], [249, 15, 178, 2], [303, 21, 204, 3], [351, 13, 168, 2]]) {
      curGrp = 200 + azd;
      const a0 = (azd * Math.PI) / 180, sp = (half * Math.PI) / 180, n = Math.round((2 * sp * r0) / 4.2 * rows);
      for (let i = 0; i < n; i++) {
        const u = Q() * 2 - 1, a = a0 + u * sp, taper = 1 - Math.pow(Math.abs(u), 2.5);
        const row = Q() * rows * taper;
        // the belt wanders in and out, and breaks where the noise says so
        const wob = (fbm(Math.cos(a) * 2.3 + azd, Math.sin(a) * 2.3, 2) - 0.5) * 60;
        if (fbm(Math.cos(a) * 7 + 3 + azd, Math.sin(a) * 7, 2) < 0.36) { Q(); Q(); continue; }
        const rr = r0 + wob + row * 6.5 + (Q() - 0.5) * 5, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        const r = Math.min(8.5, Math.max(3.4, 5.4 * Math.exp(gauss(Q) * 0.3))) * (0.75 + 0.25 * taper);
        // mostly in its own shadow: sun only on scattered tops
        { const q1 = Q(), q2 = Q(); woodCrown(x, height(x, z) + r * 0.45, z, r, smooth(0.50, 0.60, fbm(x * 0.021 + 77, z * 0.021 + 13, 2)) * (0.5 + q2 * 0.45) + (q1 < 0.06 ? 0.4 : 0), stepFog(rr) * 0.6); }
        if (row < 1.2) strip(x, 0, z, r * 2.7, stepFog(rr) * 0.6, undefined, height);
      }
    }
    // hedge lines: long, low, slightly bent runs across the slope, with a tree standing in them here and there
    for (let k = 0; k < 16; k++) {
      const a = Q() * TAU, rr = 235 + Q() * 230, len = 70 + Q() * 120, skew = (Q() - 0.5) * 0.9, bend = (Q() - 0.5) * 0.5;
      let x = Math.cos(a) * rr, z = Math.sin(a) * rr, dir = a + Math.PI / 2 + skew;
      for (let t = 0; t < len;) {
        const sz = 8 + Q() * 5, r = Math.hypot(x, z), fog = stepFog(r);
        if (r < 505 && r > 225 && !HILLS.some((h) => hillH(h, x, z) > height(x, z) + 1)) {
          if (Q() < 0.86) { P.push(x, height(x, z) - sz * 0.07, z, sz); A.push(19, (Q() < 0.5 ? -1 : 1) * 1.25, Q() < 0.5 ? 0.52 : 1.5, capFog(x, z, fog)); B.push(0, (Q() - 0.5) * 0.8, -Q() * 0.6, -1e5); }
          if (Q() < 0.07) loneTree(x, height(x, z), z, 9 + Q() * 5, 0.5, fog);
        }
        t += sz * 1.05; dir += bend * sz / len; x += Math.cos(dir) * sz * 1.05; z += Math.sin(dir) * sz * 1.05;
      }
    }
  }
  // far hedgerows and wood edges out on the plain, seen nearly edge-on: broken runs of crowns
  for (let k = 0; k < 60; k++) {
    const a = R() * TAU, rr = 545 + Math.pow(R(), 1.3) * 600, n = 5 + Math.floor(R() * 22), bend = (R() - 0.5) * 0.4;
    curGrp = 600 + k;
    for (let i = 0; i < n; i++) {
      if (R() < 0.22) continue;
      const t = (i - n / 2) * (8 + R() * 6), r = rr + t * bend + (R() - 0.5) * 14, aa = a + t / rr;
      const x = Math.cos(aa) * r, z = Math.sin(aa) * r;
      if (HILLS.some((h) => hillH(h, x, z) > annY(r) + 1)) continue;
      const big = 1 + smooth(600, 1100, r) * 0.7;
      if (R() < 0.25) loneTree(x, annY(r), z, (10 + R() * 8) * big, 0.5 + R() * 0.5, stepFog(r));
      else { const cr = (4 + R() * 4) * big; woodCrown(x, annY(r) + cr * 0.3, z, cr, 0.5 + R() * 0.5, stepFog(r)); }
    }
  }
  // --- A WOOD IS ONE MASS, painted as one (not a field of crowns each with its own light cap and dark speck,
  // and not lit patches lying anywhere on its face):
  //   - sun caps only along its TOP THIRD, in a few clusters of unequal length with the crowns' own scallops
  //     for an upper contour - deep on the side the sun is on, a rim of slivers against the light;
  //   - through its middle two or three big shapes of a second body tone;
  //   - its lowest sixth a soft step darker (both in the shader, from the lines found here).
  // Each wood (the woods of one hill, a belt, a copse) is drawn on a panorama from the hilltop eye; what hangs
  // together there is one mass. Per mass: its foot and its top as lines over the azimuth, widened to the
  // crowns' size and smoothed, so every card reads the same two lines at its own left and right edge.
  const nAll = B.length / NB, MC = new Float32Array(nAll * 4), MD = new Float32Array(nAll * 4);
  {
    const NA = 4096, NE = 720, E0 = -0.24, E1 = 0.44, occ = new Uint8Array(NA * NE), lab = new Int32Array(NA * NE), WQ = rng(60606);
    const wood = (i) => B[i * NB] > 0.2 && B[i * NB] < 0.3;
    const geo = (i) => { const x = P[i * 4], z = P[i * 4 + 2], sz = P[i * 4 + 3], r = Math.hypot(x, z); return [Math.atan2(z, x), (P[i * 4 + 1] + sz * 0.5 - EYE_Y) / r, (sz * 0.31) / r]; };
    const elOf = (e) => E0 + ((e + 0.5) / NE) * (E1 - E0);
    const groups = new Map();
    for (let i = 0; i < nAll; i++) if (wood(i)) { const g = GP[i] ?? 0; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
    const colLo = new Int16Array(NA), colHi = new Int16Array(NA).fill(-1), stack = [];
    // (every wood together: a mass with another wood standing right behind its top is not a top at all in the
    // picture - lit, it was a row of pale patches across the middle of the bigger shape)
    const occAll = new Uint8Array(NA * NE);
    for (let i = 0; i < nAll; i++) {
      if (!wood(i) || A[i * 4 + 3] > 0.3) continue;      // (the near tier only: a pale far hill behind a wood's top is another plane)
      const [az, el, ar] = geo(i), ca = (az / TAU) * NA, ra = (ar / TAU) * NA * 0.9, ce = ((el - E0) / (E1 - E0)) * NE, re = (ar / (E1 - E0)) * NE * 0.8;
      for (let e = Math.max(0, Math.floor(ce - re)); e <= Math.min(NE - 1, Math.ceil(ce + re)); e++) {
        const w = ra * Math.sqrt(Math.max(0, 1 - ((e - ce) / re) ** 2));
        for (let k = Math.floor(ca - w); k <= Math.ceil(ca + w); k++) { const q = e * NA + (((k % NA) + NA) % NA), fc = Math.round(A[i * 4 + 3] * 200) + 1; if (!occAll[q] || fc < occAll[q]) occAll[q] = fc; }
      }
    }
    // (1 where a wood of about the same haze step stands there: one of another step is another plane of the picture)
    let fogC = 0;
    const allAt = (az, el) => { const e = Math.floor(((el - E0) / (E1 - E0)) * NE); if (e < 0 || e >= NE) return 0; const v = occAll[e * NA + (((Math.floor((az / TAU) * NA) % NA) + NA) % NA)]; return v && Math.abs(v - fogC) < 13 ? 1 : 0; };
    let nMass = 0;
    for (const [grp, list] of groups) {
      const touched = [];
      for (const i of list) {
        const [az, el, ar] = geo(i), ca = (az / TAU) * NA, ra = (ar / TAU) * NA * 0.9, ce = ((el - E0) / (E1 - E0)) * NE, re = (ar / (E1 - E0)) * NE * 0.8;
        for (let e = Math.max(0, Math.floor(ce - re)); e <= Math.min(NE - 1, Math.ceil(ce + re)); e++) {
          const w = ra * Math.sqrt(Math.max(0, 1 - ((e - ce) / re) ** 2));
          for (let k = Math.floor(ca - w); k <= Math.ceil(ca + w); k++) { const q = e * NA + (((k % NA) + NA) % NA); if (!occ[q]) { occ[q] = 1; touched.push(q); } }
        }
      }
      const cellOf = (i) => { const [az, el] = geo(i); const e = Math.min(NE - 1, Math.max(0, Math.floor(((el - E0) / (E1 - E0)) * NE))); return e * NA + (((Math.floor((az / TAU) * NA) % NA) + NA) % NA); };
      const masses = [];
      for (const i of list) {
        const q0 = cellOf(i);
        if (!occ[q0] || lab[q0]) continue;
        // flood one mass, noting its lowest and highest row in every column
        const id = masses.length + 1, cols = [];
        lab[q0] = id; stack.length = 0; stack.push(q0);
        while (stack.length) {
          const q = stack.pop(), e = (q / NA) | 0, k = q - e * NA;
          if (colHi[k] < 0) { colHi[k] = colLo[k] = e; cols.push(k); } else { if (e > colHi[k]) colHi[k] = e; if (e < colLo[k]) colLo[k] = e; }
          for (let de = -1; de <= 1; de++) for (let dk = -1; dk <= 1; dk++) {
            const e2 = e + de; if (e2 < 0 || e2 >= NE) continue;
            const q2 = e2 * NA + ((k + dk + NA) % NA);
            if (occ[q2] && !lab[q2]) { lab[q2] = id; stack.push(q2); }
          }
        }
        // (a mass that crosses the seam of the azimuth is laid out past it)
        cols.sort((a, b) => a - b);
        let c0 = cols[0];
        if (cols[0] === 0 && cols[cols.length - 1] === NA - 1) { let g = 0; while (g + 1 < cols.length && cols[g + 1] === cols[g] + 1) g++; c0 = cols[g + 1] ?? 0; }
        const len = cols.length, top = new Float32Array(len), bot = new Float32Array(len);
        for (let a = 0; a < len; a++) { const k = (c0 + a) % NA; top[a] = elOf(colHi[k] >= 0 ? colHi[k] : 0); bot[a] = elOf(colLo[k] >= 0 ? colLo[k] : 0); }
        for (const k of cols) colHi[k] = -1;
        masses.push({ c0, len, top, bot, ar: 0, n: 0 });
      }
      for (const i of list) { const m = masses[lab[cellOf(i)] - 1]; if (m) { m.ar += geo(i)[2]; m.n++; } }
      for (const m of masses) {
        // widen each line to its extreme within a crown or so, then smooth it: a slow line the cards can share
        const W = Math.max(2, Math.min(48, Math.round((1.3 * (m.ar / Math.max(1, m.n)) / TAU) * NA))), { len } = m;
        const run = (src, f) => { const o = new Float32Array(len); for (let a = 0; a < len; a++) { let v = src[a]; for (let d = Math.max(0, a - W); d <= Math.min(len - 1, a + W); d++) v = f(v, src[d]); o[a] = v; } return o; };
        const blur = (src) => { const o = new Float32Array(len); for (let a = 0; a < len; a++) { let v = 0, c = 0; for (let d = Math.max(0, a - W); d <= Math.min(len - 1, a + W); d++) { v += src[d]; c++; } o[a] = v / c; } return o; };
        m.top = blur(blur(run(m.top, Math.max))); m.bot = blur(blur(run(m.bot, Math.min)));
        m.width = (len / NA) * TAU; m.seed = WQ(); m.kU = 3.4 / Math.max(m.width, 0.05);
        nMass++;
      }
      const at = (m, arr, az) => { let c = (az / TAU) * NA - 0.5 - m.c0; c -= Math.floor(c / NA) * NA; if (c > m.len - 1) c = c - m.len + 1 < NA - c ? m.len - 1 : 0; const a = Math.floor(c), f = c - a; return arr[a] + (arr[Math.min(m.len - 1, a + 1)] - arr[a]) * f; };
      const uAt = (m, az) => { let c = (az / TAU) * NA - m.c0; c -= Math.floor(c / NA) * NA; if (c > NA * 0.75) c -= NA; return (c / NA) * TAU * m.kU; };
      for (const i of list) {
        const m = masses[lab[cellOf(i)] - 1], [az, el, ar] = geo(i), q = WQ(), q2 = WQ();
        if (!m) continue;
        const r = Math.hypot(P[i * 4], P[i * 4 + 2]), hw = (P[i * 4 + 3] * 0.5 * Math.abs(A[i * 4 + 1])) / r, f = sunAt(az).f;
        MC.set([at(m, m.bot, az - hw), at(m, m.bot, az + hw), at(m, m.top, az - hw), at(m, m.top, az + hw)], i * 4);
        MD.set([uAt(m, az - hw), uAt(m, az + hw), m.seed, f], i * 4);
        B[i * NB + 2] = -2;
        // the sun caps: where the crown's top stands in the mass (1 = on its upper contour)
        const b0 = at(m, m.bot, az), t0 = at(m, m.top, az), hc = (el + 0.9 * ar - b0) / Math.max(t0 - b0, 1e-4);
        // clusters along the top: three to five to a mass, of unequal length, each reaching deepest at its middle
        const cn = fbm(uAt(m, az) * 2.3 + m.seed * 37.0, m.seed * 11.0 + 3.3, 2);
        const back = f < -0.3, cl = back ? smooth(0.30, 0.42, cn) : smooth(0.40, 0.56, cn);
        // (against the light: a rim of slivers along most of the top; a wood standing behind this top: nothing)
        const depth = back ? 0.17 : (0.12 + 0.19 * cl) * (0.45 + 0.55 * smooth(-0.3, 0.45, f));
        fogC = Math.round(A[i * 4 + 3] * 200) + 1;
        const backed = A[i * 4 + 3] <= 0.3 && allAt(az, t0 + 2.2 * ar) + allAt(az - ar, t0 + 3.2 * ar) + allAt(az + ar, t0 + 3.2 * ar) + allAt(az, t0 + 5 * ar) + allAt(az, t0 + 8 * ar) >= 2;
        // (against the light only the crowns of the top row itself)
        const isLit = cl > 0.05 && hc > 1 - depth && q < 0.74 && !backed && (!back || t0 - el - 0.9 * ar < 1.1 * ar) && (t0 - b0 > 7 * ar || t0 - el - 0.9 * ar < 2.2 * ar);
        if (isLit) A[i * 4 + 2] = !back ? (t0 - el - 0.9 * ar < 2.2 * ar || q2 < 0.35 ? 0.52 : 0.9) : 0.52;
        else A[i * 4 + 2] = 1.5;
        // (dark accents of their own only on the lit tops, where they are the shadow under a cap)
        if (!isLit) B[i * NB] = 0.35;
        // the stroke at this crown's foot is part of the same mass: it reads the same lines
        if (i + 1 < nAll && B[(i + 1) * NB] > 2.2) {
          const k = i + 1, sx = P[k * 4], sz = P[k * 4 + 2], sa = Math.atan2(sz, sx), sw = (P[k * 4 + 3] * 0.5 * Math.abs(A[k * 4 + 1])) / Math.hypot(sx, sz);
          MC.set([at(m, m.bot, sa - sw), at(m, m.bot, sa + sw), at(m, m.top, sa - sw), at(m, m.top, sa + sw)], k * 4);
          MD.set([uAt(m, sa - sw), uAt(m, sa + sw), m.seed, f], k * 4);
        }
      }
      for (const q of touched) { occ[q] = 0; lab[q] = 0; }
    }
    // a wood's foot strokes take the lines of the nearest crown before them in the list (only the flag matters: they are all foot)
    for (let i = 0; i < nAll; i++) if (B[i * NB] > 2.2 && MC[i * 4 + 2] === 0 && MC[i * 4] === 0) MC.set([1, 1, 2, 2], i * 4);      // (an orphan: all foot)
    window.__woodMasses = nMass;
  }
  // nearest first (the camera never leaves the hilltop, so one fixed order serves every view): the
  // crowns of a wood overlap ten deep, and this way only the front ones are painted
  const N = B.length / NB, order = [...Array(N).keys()].sort((a, b) => Math.hypot(P[a * 4], P[a * 4 + 2]) - Math.hypot(P[b * 4], P[b * 4 + 2]));
  const pick = (src, n) => { const o = new Float32Array(N * n); order.forEach((s, i) => { for (let k = 0; k < n; k++) o[i * n + k] = src[s * n + k]; }); return o; };
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pick(P, 4), 4));
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(pick(A, 4), 4));
  g.setAttribute('iB', new THREE.InstancedBufferAttribute(pick(B, NB), NB));
  g.setAttribute('iC', new THREE.InstancedBufferAttribute(pick(MC, 4), 4));
  g.setAttribute('iD', new THREE.InstancedBufferAttribute(pick(MD, 4), 4));
  g.instanceCount = N;
  const m = new THREE.Mesh(g, mat({ vs: CROWN_VS, fs: CROWN_FS, uniforms: { uAtlas: { value: atlas } }, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = RO.crowns; m.userData.grp = 'far-crowns';
  scene.add(m);
  return N;
}

// ------------------------------------------------------------------------------------ far plain
// Continues the terrain's valley floor beyond its rim (r = 520) with the SAME paint, so the rim cannot
// be found: one flat green (FIELD_G), long lens-shaped patches of a second green barely apart from it,
// a few thin level strokes on ring lines (the terrain's farPaint(), copied term for term and reading
// the terrain's own stroke texture), plus a few pale field rectangles out toward the village.
// Haze carries on from the terrain's 0.36 in two more flat, brush-warped rings (0.48, 0.58).
// [distance, azimuth (deg), half length, half depth, twist, tone]
const PLAIN_FIELDS = [
  [585, 97, 60, 14, 0.06, 2], [610, 64, 78, 17, 0.10, 1], [665, 81, 88, 16, -0.08, 2], [720, 57, 84, 20, 0.16, 1],
  [760, 88, 104, 19, -0.12, 1], [690, 33, 92, 17, 0.10, 1], [900, 49, 112, 22, 0.08, 2], [940, 93, 124, 22, -0.06, 1],
  [840, 22, 116, 19, -0.10, 2],
].map(([r, az, hl, hd, rot, tone]) => {
  const a = (az * Math.PI) / 180, t = a + Math.PI / 2 + rot;
  return { c: [r * Math.cos(a), r * Math.sin(a)], h: [hl, hd], d: [Math.cos(t), Math.sin(t)], tone };
});
const f1 = (v) => v.toFixed(3);
const NF = PLAIN_FIELDS.length;
const PLAIN_FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vUv; in float vDepth;
uniform sampler2D uFarTex;
${COMMON}
const vec3 FIELD_G = vec3(0.818, 0.897, 0.710);
const vec3 FIELD_Y = vec3(0.859, 0.910, 0.648);
const vec3 FIELD_T = vec3(0.553, 0.702, 0.604);
const vec4 FLD_C[${NF}] = vec4[${NF}](${PLAIN_FIELDS.map((f) => `vec4(${f1(f.c[0])}, ${f1(f.c[1])}, ${f1(f.h[0])}, ${f1(f.h[1])})`).join(', ')});
const vec3 FLD_D[${NF}] = vec3[${NF}](${PLAIN_FIELDS.map((f) => `vec3(${f1(f.d[0])}, ${f1(f.d[1])}, ${f1(f.tone)})`).join(', ')});
// == farPaint() of src/terrain.js (keep the two in step), with this module's field list
vec3 farPaint(vec3 wp, float rr, vec4 pn){
  float th = atan(wp.z, wp.x) * (1.0 / 6.2831853);
  float s = 1000.0 / rr;
  float wob = textureLod(uFarTex, vec2(th * 6.0, s * 0.11), 0.0).r;
  float f = s * 1.5 + (wob - 0.5) * 0.7 + wp.y * 0.02;
  float fw = clamp(fwidth(f), 1e-5, 0.5);
  float k = floor(f + 0.5), df = f - k;
  float h = hash11(k * 7.31 + 3.0);
  float u = th * 4.0 + h * 7.13;
  vec4 g = textureLod(uFarTex, vec2(u, (mod(k, 64.0) + 0.5) / 64.0), 0.0);

  // lens patches of the second green, lying along the rings
  float lens = g.a - 0.72 - abs(df) * 0.9;
  float w = 0.9 * fw + 0.004;
  vec3 c = mix(FIELD_G, FIELD_Y, smoothstep(-w, w, lens));

  // pale field rectangles toward the village, each with a thin darker line along most of its edge
  if (rr > 530.0 && wp.z > 150.0 && wp.x > -100.0){
    for (int i = 0; i < ${NF}; i++){
      vec2 q = wp.xz - FLD_C[i].xy, d = FLD_D[i].xy;
      vec2 e = abs(vec2(dot(q, d), dot(q, vec2(-d.y, d.x)))) - FLD_C[i].zw;
      float sd = max(e.x, e.y) + (pn.r - 0.5) * 3.0;
      float sw = clamp(fwidth(sd), 1e-3, 40.0);
      vec3 fc = FLD_D[i].z < 1.5 ? FIELD_Y : FIELD_G * vec3(0.975, 0.985, 0.955);
      c = mix(c, fc, 1.0 - smoothstep(-0.7 * sw, 0.7 * sw, sd));
      float hl = clamp(1.3 - abs(sd) / sw, 0.0, 1.0) * step(0.34, pn.g) * step(sw, 30.0);
      c = mix(c, fc * vec3(0.885, 0.925, 0.90), hl * 0.9);
    }
  }

  // strokes on the ring lines: dashes with tapering ends, most of the line left empty
  float on = smoothstep(0.71, 0.84, g.g);
  float kind = hash11(k * 3.17 + floor(u * 9.0) * 1.31);
  float halfw = on * (mix(0.7, 1.9, g.b) + step(kind, 0.20) * 0.7);
  float line = clamp(halfw - abs(df) / fw + 0.5, 0.0, 1.0) * smoothstep(0.0, 0.6, halfw) * step(fw, 0.45);
  vec3 lc = kind < 0.20 ? mix(c, FIELD_T, 0.50)                       // a tree line / hedge
          : kind < 0.66 ? c * vec3(0.950, 0.962, 0.940)               // a darker stroke
          : mix(c, vec3(0.905, 0.945, 0.770), 0.8);                   // a lighter one
  return mix(c, lc, line);
}
void main(){
  float rr = length(vW.xz);
  vec4 pn = texture(uBrush, vW.xz / 173.0 + 0.21);
  float rw = rr * (1.0 + (pn.a - 0.5) * 0.24 + (pn.g - 0.5) * 0.06);
  vec3 c = farPaint(vW, rr, pn);
  // the terrain ends on its third haze step (0.36 toward uHazeCol); two more firm, brush-warped rings follow
  float amt = 0.36 + 0.12 * aastep(739.0, rw) + 0.10 * aastep(1049.0, rw);
  c = hourOf(c);
  c = mix(c, mix(uHazeCol, uHazeFarCol, smoothstep(0.36, 0.9, amt)), amt);
  oColor = vec4(c, 1.0);
  writeAux(vec3(0., 1., 0.), 0.0, vDepth, 0.011, 0.0, 0.0);
}
`;
function buildPlain(scene) {
  // the two inner rings lie on the terrain itself (its rim is at r = 520), so the surfaces and the paint
  // (which reads the height) agree there; from 560 m out the ground is the flat annulus
  const rs = [500, 520, 560, 620, 700, 850, 1000, 1150, 1400, 1800, 2600], NS = 192, pos = [], idx = [];
  rs.forEach((r, i) => {
    for (let j = 0; j < NS; j++) { const a = (j / NS) * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, r <= 520 ? height(x, z) - (r < 520 ? 0.6 : 0.0) : annY(r), z); }
    if (i) for (let j = 0; j < NS; j++) { const a0 = (i - 1) * NS, b0 = i * NS, j1 = (j + 1) % NS; idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat({ vs: BASIC_VS, fs: PLAIN_FS, side: THREE.DoubleSide, uniforms: { uFarTex: GROUND_UNIFORMS.uFarTex } }));
  m.frustumCulled = false;
  m.renderOrder = RO.plain; m.userData.grp = 'far-misc';
  scene.add(m);
}

// road / river: a ragged-edged ribbon laid on the ground
const RIBBON_FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vUv; in float vDepth;
uniform vec3 uA, uB; uniform vec4 uR;   // fog scale, fade-in start (m along), streak scale, minimum fog
${COMMON}
void main(){
  vec4 b = texture(uBrush, vW.xz * uR.z);
  if (abs(vUv.x) > 0.72 + (b.r - 0.5) * 0.5) discard;
  if (vUv.y < uR.y + b.g * 26.0) discard;
  vec3 c = mix(uA, uB, step(0.62, texture(uBrush, vW.xz * uR.z * vec2(0.35, 1.3) + 0.4).b));
  c = atmo(c, max(stepFog(length(vW.xz)) * uR.x, uR.w));
  oColor = vec4(c, 1.0);
  writeAux(vec3(0., 1., 0.), 0.0, vDepth, 0.011, 0.0, 0.0);
}
`;
function ribbon(scene, pts, width, lift, uniforms) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
  const len = curve.getLength(), M = Math.ceil(len / 5);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= M; i++) {
    const p = curve.getPointAt(i / M), t = curve.getTangentAt(i / M);
    const r = Math.hypot(p.x, p.z), w = width(r) * 0.5 / 0.72;
    for (const sgn of [-1, 1]) {
      const x = p.x - t.z * w * sgn, z = p.z + t.x * w * sgn;
      pos.push(x, Math.max(groundY(x, z), groundY(p.x, p.z)) + lift(r), z); uv.push(sgn, (i / M) * len);
    }
    if (i < M) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat({ vs: BASIC_VS, fs: RIBBON_FS, side: THREE.DoubleSide, uniforms }));
  m.frustumCulled = false;
  m.renderOrder = RO.cards; m.userData.grp = 'far-misc';
  scene.add(m);
}

// ------------------------------------------------------------------------------------ painted cards
const CARD_FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vUv; in float vDepth;
uniform sampler2D uTex; uniform vec3 uC; uniform vec4 uW;   // (fog, foot mist, plane) (noise scale xy, wobble xy in uv)
void main(){
  // an unsteady hand: the whole painting is pushed about by soft noise fixed to the card, at two scales
  // (a slow lean of whole walls and a quicker wobble of their edges), so no edge is ruled
  vec4 n1 = texture(uBrush, vUv * uW.xy), n2 = texture(uBrush, vUv * uW.xy * 3.3 + 0.37);
  vec2 n = (vec2(n1.a, n2.a) - 0.5) + (vec2(n2.g, n1.g) - 0.5) * 0.45;
  vec4 t = texture(uTex, vUv + n * uW.zw);
  // the silhouette is bitten by brush dabs: the alpha is a soft ramp, cut at a level that wanders (only inward)
  vec4 d = texture(uBrush, vUv * uW.xy * 7.0 + 0.11);
  if (t.a < 0.42 + d.r * 0.36 + d.b * 0.14) discard;
  // two close values of every colour, in flat dabs
  vec3 c = t.rgb * (1.0 + (step(0.56, d.g) - 0.5) * 0.05);
  c = atmo(c, uC.x);
  oColor = vec4(c, 1.0);
  writeAux(vec3(0., 0., 1.), 0.0, vDepth, uC.z, uC.z, 0.0);
}
`;
function card(scene, tex, x, z, yBase, w, h, fog, mist) {
  // wobble amplitude: about 0.5 m of the painted subject (1.5-2 px under the long lens), features 3-12 m
  const wob = new THREE.Vector4(w / 45, h / 45, 1.5 / w, 1.5 / h);
  const a = Math.atan2(z, x), tx = -Math.sin(a), tz = Math.cos(a);
  const flip = sunAt(a).sT > 0 ? 1 : -1;             // textures are painted for a sun on the right
  const pos = [], uv = [];
  for (const [sx, sy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) {
    pos.push(x + tx * sx * w * 0.5, yBase + sy * h, z + tz * sx * w * 0.5);
    uv.push(0.5 + sx * 0.5 * flip, 1 - sy);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const m = new THREE.Mesh(g, mat({ vs: BASIC_VS, fs: CARD_FS, side: THREE.DoubleSide, uniforms: { uTex: { value: tex }, uC: { value: new THREE.Vector3(fog, mist, 0.45 + fog * 0.5) }, uW: { value: wob } } }));
  m.frustumCulled = false;
  m.renderOrder = RO.cards; m.userData.grp = 'far-misc';
  scene.add(m);
}

// ------------------------------------------------------------------------------------ birds
// a small loose flock far off, each bird a two-stroke tick; wingbeats and drift are held on the stepped time
const BIRD_VS = /* glsl */`
in vec3 position;
in vec4 iB;    // radius, height, phase, size
out vec2 vP; out float vFlap; out float vDepth;
void main(){
  float a = iB.z * 0.35 + 2.2 + uTime * 0.011;
  vec3 c = vec3(cos(a) * iB.x, iB.y + sin(uTime * 0.21 + iB.z * 9.0) * 5.0, sin(a) * iB.x);
  vec3 toCam = normalize(uCamPos - c);
  vec3 r = normalize(vec3(toCam.z, 0.0, -toCam.x));
  vec3 w = c + (r * position.x + vec3(0., 1., 0.) * position.y) * iB.w;
  vP = position.xy;
  vFlap = sin(uTime * 5.0 + iB.z * 40.0);
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const BIRD_FS = /* glsl */`
in vec2 vP; in float vFlap; in float vDepth;
void main(){
  float x = abs(vP.x);
  float wing = x * (0.15 + 0.5 * vFlap) - x * x * 0.35 * (1.0 + vFlap);     // raised or dropped, tips curling down
  float th = 0.11 * (1.0 - x * 0.75);
  if (abs(vP.y - wing) > th || x > 0.97) discard;
  oColor = vec4(atmo(vec3(0.36, 0.38, 0.50), 0.42), 1.0);
  writeAux(vec3(0., 0., 1.), 0.0, vDepth, 0.9, 0.9, 0.0);
}
`;
function buildBirds(scene) {
  const R = rng(55), B = [];
  for (let i = 0; i < 9; i++) B.push(640 + (R() - 0.5) * 60, 120 + i * 2.2 + (R() - 0.5) * 16, (i + R()) * 0.045, 3.6 + R() * 1.6);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(B), 4));
  g.instanceCount = B.length / 4;
  const m = new THREE.Mesh(g, mat({ vs: BIRD_VS, fs: BIRD_FS, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = RO.birds; m.userData.grp = 'far-misc';
  scene.add(m);
}

// ------------------------------------------------------------------------------------ ranges
// A ridge ring and three mountain ranges, painted the way a background painter lays a far range: each is
// ONE flat pale value (its depth plane), standing in a flat band of haze with a firm, nearly level edge,
// and on it ONE faint second tone in a few large brushed shapes (the flanks turned from the sun, a lower
// spur). The crest is a polyline at a few metres' resolution; the second tone is evaluated per pixel in the
// fragment shader from three curves carried on the vertices, its edges cut by smooth noise - there are no
// facet polygons, so no tone edge is ever a straight line.
const RANGE_FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vUv; in float vDepth; in vec4 vS;
flat in vec3 uCol; flat in vec4 uR; flat in vec3 uCol2; flat in vec4 uK;    // (plane, foot band (0 = none), -, -)  (noise scale along, up, wobble, -)
${COMMON}
void main(){
  // vUv.x = azimuth 0..1, vUv.y = height above the base in units of the range's maximum height
  float a = vUv.x * 6.2831853;
  // FOOT: two flat steps of haze, each with a firm edge that swells slowly along the range
  float w1 = 0.016 * sin(a * 23.0 + uR.x * 40.0) + 0.009 * sin(a * 61.0 + 1.3) + 0.004 * sin(a * 157.0 + 4.1);
  float w2 = 0.020 * sin(a * 17.0 + uR.x * 70.0 + 2.0) + 0.010 * sin(a * 47.0 + 0.4) + 0.005 * sin(a * 131.0);
  vec3 c = uCol;
  // THE SECOND TONE: a few large shapes laid with a loaded brush. Where they lie is given along the range
  // (vS: upper and lower edge of the shade hanging from the crest, top of the lower spur - smooth curves),
  // and the EDGE is cut here, per pixel: the height is pushed about by two octaves of smooth noise drawn out
  // along the range, so every edge is a curved, slightly toothed brush edge at any magnification - never the
  // straight side of a polygon.
  vec2 q = vec2(vUv.x * uK.x, vUv.y * uK.y);
  float nb = (vn(q) - 0.5) + (vn(q * vec2(3.1, 2.3) + 7.3) - 0.5) * 0.42 + (vn(q * vec2(9.7, 4.9) + 1.9) - 0.5) * 0.16;
  float yy = vUv.y + nb * uK.z;
  c = mix(c, mix(uCol, uCol2, 0.5), aastep(0.0, vS.z - yy - nb * uK.z * 0.6));
  c = mix(c, uCol2, aastep(uK.z * 0.04, min(yy - vS.y, vS.x - yy)));
  // (the hour: a range is one plane of the evening air - its two tones stay a step apart and both go to the
  // rose of the far air, never one gold and one violet)
  gLit = 0.45; c = hourOf(c);
  c = mix(c, uHazeFarCol * vec3(0.80, 0.76, 0.86), 0.42 * uEve);
  vec3 c0 = c;
  c = mix(c, mix(c0, uHazeFarCol, 0.30), aastep(0.0, 0.21 + w2 - vUv.y) * uR.y);
  c = mix(c, mix(c0, uHazeFarCol, 0.60), aastep(0.0, 0.085 + w1 - vUv.y) * uR.y);
  oColor = vec4(c, 1.0);
  writeAux(vec3(0., 0., 1.), 0.0, vDepth, uR.x, uR.x, 0.0);
}
`;
const RANGE_VS = /* glsl */`
in vec3 position; in vec2 aUv; in vec3 aCol; in vec4 aR; in vec4 aS; in vec3 aCol2; in vec4 aK;
out vec3 vW; out vec3 vN; out vec2 vUv; out float vDepth; out vec4 vS;
flat out vec3 uCol; flat out vec4 uR; flat out vec3 uCol2; flat out vec4 uK;
void main(){
  vW = position; vN = vec3(0.0); vUv = aUv; uCol = aCol; uR = aR; vS = aS; uCol2 = aCol2; uK = aK;
  vec4 mv = viewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const RANGES = { pos: [], uv: [], col: [], r: [], s: [], col2: [], k: [], idx: [] };
// The skyline behind the chapel as it is seen from the approach (looking north to north-north-west from the
// path: the same sector in which the sky is kept calm) is LOW AND QUIET: a long ridge, no summit that could
// stand beside the gable.  1 inside the sector, 0 outside.
const CALM_AZ = -1.86, CALM_HALF = 0.36;
const calmAt = (a) => { const d = Math.atan2(Math.sin(a - CALM_AZ), Math.cos(a - CALM_AZ)); return 1 - smooth(CALM_HALF, CALM_HALF + 0.30, Math.abs(d)); };
// The second tone of a range, as three curves along it (heights above the base, per crest sample):
// top and bottom of the shade (top < bottom = none) and the top of the lower spur tone.
function shadeTools(o, crest, N) {
  const arc = (TAU * o.r) / N;      // metres of arc per crest sample
  const cAt = (x) => { x = ((x % N) + N) % N; const i = Math.floor(x), f = x - i; return crest[i] * (1 - f) + crest[(i + 1) % N] * f; };
  const top = new Float32Array(N).fill(-1e9), bot = new Float32Array(N).fill(1e9), spur = new Float32Array(N).fill(-1e9);
  // one shape: columns [index along the crest, bottom, top]; laid into the curves (the union where two overlap)
  const lay = (cols, isSpur) => {
    cols.sort((p, q) => p[0] - q[0]);
    for (let k = 0; k < cols.length - 1; k++) {
      const [x0, b0, t0] = cols[k], [x1, b1, t1] = cols[k + 1];
      for (let x = Math.ceil(x0); x <= x1; x++) {
        const f = x1 > x0 ? (x - x0) / (x1 - x0) : 0, i = ((x % N) + N) % N, t = t0 + (t1 - t0) * f, b = b0 + (b1 - b0) * f;
        if (isSpur) spur[i] = Math.max(spur[i], t);
        else if (t > b) { top[i] = Math.max(top[i], t); bot[i] = Math.min(bot[i], b); }
      }
    }
  };
  // the ragged lower edge of a brush-laid shape: slow swells and a row of blunt teeth of unequal size
  const rag = (m, sd) => (fbm(m / 90 + sd * 17.3, sd * 5.1, 2) - 0.5) * 2.0 + (Math.abs(((m / (34 + 30 * sd) + sd * 9) % 1) - 0.5) - 0.25) * 1.3 * smooth(0.35, 0.6, fbm(m / 150 + sd * 3.7, 7.7, 2));
  // where no shade lies the two edges run together along the middle of the nearest shape's end (a closed
  // shape: nothing between them), then all three curves are eased, so an end runs out to a brushed point
  const finish = () => {
    const filled = (i) => top[i] > bot[i];
    let any = -1;
    for (let i = 0; i < N; i++) if (filled(i)) { any = i; break; }
    if (any >= 0) {
      const mid = new Float32Array(N), has = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (filled(i)) { has[i] = 1; mid[i] = (top[i] + bot[i]) / 2; }
      // nearest filled neighbour on either side, blended by distance
      const L = new Float32Array(N), R2 = new Float32Array(N), dL = new Float32Array(N), dR = new Float32Array(N);
      let last = 0, d = 1e9;
      for (let k = 0; k < 2 * N; k++) { const i = (any + k) % N; if (has[i]) { last = mid[i]; d = 0; } else d++; L[i] = last; dL[i] = d; }
      d = 1e9;
      for (let k = 0; k < 2 * N; k++) { const i = (((any - k) % N) + N) % N; if (has[i]) { last = mid[i]; d = 0; } else d++; R2[i] = last; dR[i] = d; }
      for (let i = 0; i < N; i++) if (!has[i]) { const w = dL[i] / (dL[i] + dR[i]); top[i] = bot[i] = L[i] * (1 - w) + R2[i] * w; }
    } else { top.fill(0); bot.fill(0); }
    for (const arr of [top, bot, spur]) for (let pass = 0; pass < 2; pass++) {
      const c = arr.slice();
      for (let i = 0; i < N; i++) arr[i] = (c[(i + N - 1) % N] + 2 * c[i] + c[(i + 1) % N]) / 4;
    }
    for (let i = 0; i < N; i++) if (spur[i] < -1e8) spur[i] = -o.drop;
  };
  return { arc, cAt, lay, rag, top, bot, spur, finish };
}
// MOUNTAINS. EVERY mass carries ONE faint second tone, as a few large shapes each of its own size - never one
// wedge repeated under every top (a row of tents), and never nothing (a mass of one flat value is a lump):
//   - a broad shoulder shadow: the flank turned from the sun, from the summit down a leaning, bowed ridge
//     line and far along the crest, its lower edge a long sagging diagonal or a deep belly;
//   - a band: a stroke of shade hugging a long crest, swelling and running out;
//   - where a long stretch of a range has neither, a hollow of shade hanging under the crest;
// and in the lower body a few large quiet shapes of a tone half-way to the shade - the profile of a lower
// spur standing before the mass.
function peakShade(o, crest, N, summits) {
  const R = rng(o.seed * 31 + 7), T = shadeTools(o, crest, N), { arc, cAt, lay, rag } = T;
  const floorY = -o.drop * 0.4, over = o.h * 0.25;      // (a shade that hangs from the crest reaches well above it: the brush wobble never opens the skyline)
  // the flank of a summit from its ridge line (leaning to the sunny side) along the crest for W samples
  const facet = (pk, dA, H, W, Ls, us, pw, sd, teeth, eb, bel) => {
    const cols = [], ySad = cAt(pk + dA * W), u0 = Math.floor(us);
    for (let u = u0; u <= W; u++) {
      const uu = Math.max(u, us);
      // (the ridge line is no ruled line: it is bowed, and steps out once on its way down)
      let yt;
      if (uu >= 0) yt = cAt(pk + dA * uu) + over;
      else { const g = uu / us; yt = Math.min(H - Ls * Math.pow(g, pw) + Ls * (0.13 * Math.sin(Math.PI * 2.0 * g + sd * 2.0) * Math.sin(Math.PI * g) + 0.12 * Math.sin(Math.PI * g) * (sd - 0.5) * 2.0 + 0.06 * rag(uu * arc * 2.0, sd + 0.5) * Math.sin(Math.PI * g)), cAt(pk + dA * uu)) + over * Math.pow(1 - g, 3); }
      const g = (uu - us) / (W - us);
      const yb = (H - Ls) + (ySad - (H - Ls)) * Math.pow(g, eb) - Ls * bel * Math.sin(Math.PI * g) + Ls * teeth * rag(uu * arc, sd) * Math.sin(Math.PI * Math.min(1, g * 1.15 + 0.08));
      cols.push([pk + dA * uu, Math.max(Math.min(yb, yt), floorY), yt]);
    }
    lay(cols);
  };
  for (const sm of summits) {
    const pk = sm.pk, a = (pk / N) * TAU, s = sunAt(a), dA = s.sT > 0 ? -1 : 1;      // along the crest, away from the sun
    const str = 0.45 + 0.55 * Math.min(1, Math.abs(s.sT) * 2.2);
    const H = crest[pk], cal = calmAt(a), sd = R(), q = R();
    const flank = (dA > 0 ? sm.wr : sm.wl) / arc;
    const k1 = R(), k2 = R(), k3 = R(), k4 = R(), k5 = R(), k6 = R();
    if (sm.rise < o.h * 0.03) continue;
    if ((q < 0.62 || sm.major) && cal < 0.5) {
      // broad shoulder shadow
      const W = Math.max(6, Math.round(flank * (0.6 + 0.6 * k1))), Ls = sm.rise * (sm.major ? 0.62 + 0.45 * k2 : 0.45 + 0.5 * k2) * (0.6 + 0.4 * str);
      const us = -((0.7 + 1.1 * k3) * Ls) / arc;
      facet(pk, dA, H, W, Ls, us, 1.1 + k4 * 0.6, sd, 0.10 + 0.08 * k5, 0.45 + 1.0 * k5, 0.04 + 0.3 * k6);
    } else {
      // a band of shade under a long crest (the calm skyline carries these only: long and low)
      const W = Math.max(8, Math.round(flank * (0.9 + 0.5 * k1) * (1 + cal))), Ls = Math.max(sm.rise * (0.22 + 0.2 * k2) * (0.6 + 0.4 * str), o.h * 0.022);
      facet(pk, dA, H, W, Ls, -((0.6 + k3) * Ls) / arc, 1.2, sd, 0.22, 0.75 + 0.5 * k4, -0.5 - 1.2 * k5);
    }
  }
  // no long stretch of a range without its second tone: a hollow of shade hanging under the crest
  {
    const gapMax = Math.round((0.11 / TAU) * N), filled = (i) => T.top[((i % N) + N) % N] > T.bot[((i % N) + N) % N];
    let i0 = 0; while (i0 < N && !filled(i0)) i0++;
    for (let k = 0; k < N && i0 < N;) {
      let i = i0 + k, run = 0;
      while (run < N && !filled(i + run)) run++;
      if (run > gapMax) {
        const n = Math.max(1, Math.round(run / (gapMax * 1.6)));
        for (let j = 0; j < n; j++) {
          const sd = R(), Wd = Math.round(Math.min(run / n * (0.45 + 0.3 * R()), gapMax * 1.3)), x0 = i + Math.round((j + 0.2 + 0.3 * R()) * run / n);
          const skew = 0.55 + R() * 0.9, cols = [];
          let lo = 1e9; for (let u = 0; u <= Wd; u += 4) lo = Math.min(lo, cAt(x0 + u));
          const D = Math.max(lo * (0.16 + 0.16 * R()), o.h * 0.03);
          for (let u = 0; u <= Wd; u++) {
            const g = u / Wd, yc = cAt(x0 + u), e = Math.pow(Math.sin(Math.PI * Math.pow(g, skew)), 0.75);
            cols.push([x0 + u, Math.max(yc - D * e * (1 + 0.3 * rag(u * arc, sd)), floorY), yc + over * e]);
          }
          lay(cols);
        }
      }
      k += run + 1;
    }
  }
  // the lower body: a few long spurs, each ONE quiet tone from its own lazy profile down into the haze
  const nIn = o.inner ?? 0;
  for (let k = 0; k < nIn; k++) {
    const i0 = Math.floor(((k + R() * 0.8) / nIn) * N), Wm = o.pk1 * (1.6 + 2.4 * R()), W = Math.round(Wm / arc), sd = R();
    const f0 = 0.30 + 0.24 * R(), skew = 0.6 + R() * 0.9, bump = 0.25 + R() * 0.5, cols = [];
    let lo = 1e9;
    for (let u = 0; u <= W; u += 4) lo = Math.min(lo, cAt(i0 + u));
    for (let u = 0; u <= W; u++) {
      const g = u / W, m = u * arc;
      const env = Math.pow(Math.sin(Math.PI * Math.pow(g, skew)), 0.7);
      let yt = lo * f0 * env * (0.72 + 0.56 * fbm(m / (o.pk1 * 0.7) + sd * 31, sd * 7, 2)) * (1 + 0.5 * Math.max(0, 1 - Math.abs(g - bump) * 5)) + (fbm(m / 70 + sd * 3, 1.7, 2) - 0.5) * o.n2 * 0.5 * env;
      yt = Math.min(yt, cAt(i0 + u) - o.h * 0.07);
      cols.push([i0 + u, floorY, Math.max(yt, -o.drop)]);
    }
    lay(cols, true);
  }
  T.finish();
  return T;
}
// the wooded ridge ring: shade on the flank of every top turned from the sun, the same brushed shapes
function ridgeShade(o, crest, N) {
  const R = rng(o.seed * 31 + 7), T = shadeTools(o, crest, N), { arc, cAt, lay, rag } = T;
  const win = Math.max(3, Math.round((o.fWin ?? 130) / arc)), peaks = [], over = o.h * 0.25;
  for (let i = 0; i < N; i++) {
    let top = true;
    for (let k = -win; k <= win && top; k++) if (crest[(i + k + N) % N] > crest[i]) top = false;
    if (top && crest[i] > o.h * 0.10) peaks.push(i);
  }
  peaks.sort((a, b) => crest[b] - crest[a]);
  const kept = [];
  for (const i of peaks) if (kept.every((j) => Math.min(Math.abs(i - j), N - Math.abs(i - j)) * arc > o.r * (o.fGap ?? 0.013))) kept.push(i);
  for (const pk of kept) {
    const s = sunAt((pk / N) * TAU), dA = s.sT > 0 ? -1 : 1;
    const str = 0.4 + 0.6 * Math.min(1, Math.abs(s.sT) * 2.2);
    const H = crest[pk], sd = R();
    const maxW = Math.round((o.r * (0.045 + 0.06 * R()) * str) / arc);
    let W = Math.round(maxW * 0.3);
    while (W < maxW && cAt(pk + dA * (W + 1)) <= cAt(pk + dA * W) + 0.01 * arc) W++;
    const Ls = H * (0.16 + 0.30 * R()) * str, lean = 0.7 + 0.9 * R(), us = -(lean * Ls) / arc, pw = 1.15 + R() * 0.5;
    R(); R(); R();
    if (W <= 3) continue;
    const cols = [], ySad = cAt(pk + dA * W), u0 = Math.floor(us);
    for (let u = u0; u <= W; u++) {
      const uu = Math.max(u, us);
      let yt;
      if (uu >= 0) yt = cAt(pk + dA * uu) + over;
      else { const g = uu / us; yt = Math.min(H - Ls * Math.pow(g, pw) + Ls * 0.10 * Math.sin(Math.PI * 2.0 * g), cAt(pk + dA * uu)) + over * Math.pow(1 - g, 3); }
      const g = (uu - us) / (W - us);
      const yb = (H - Ls) + (ySad - (H - Ls)) * Math.pow(g, 0.62) - Ls * 0.05 * Math.sin(Math.PI * g) + Ls * 0.13 * rag(uu * arc, sd) * Math.sin(Math.PI * Math.min(1, g * 1.15 + 0.08));
      cols.push([pk + dA * uu, Math.max(Math.min(yb, yt), -o.drop * 0.4), yt]);
    }
    lay(cols);
  }
  T.finish();
  return T;
}
// all the ranges as one mesh
function buildRanges(scene) {
  const Q = RANGES, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Q.pos, 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(Q.uv, 2));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(Q.col, 3));
  g.setAttribute('aR', new THREE.Float32BufferAttribute(Q.r, 4));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(Q.s, 4));
  g.setAttribute('aCol2', new THREE.Float32BufferAttribute(Q.col2, 3));
  g.setAttribute('aK', new THREE.Float32BufferAttribute(Q.k, 4));
  g.setIndex(Q.idx);
  const m = new THREE.Mesh(g, mat({ vs: RANGE_VS, fs: RANGE_FS, side: THREE.DoubleSide }));
  m.frustumCulled = false; m.renderOrder = RO.range; m.userData.grp = 'far-ranges';
  scene.add(m);
  return Q.idx.length / 3;
}

function range(o) {
  const N = 4096, R = rng(o.seed), off = R() * 100;
  const unit = o.r / o.freq;      // metres of arc per noise unit
  const ridged = (v) => 1 - Math.abs(2 * v - 1);
  const hAt = (a) => {
    const cx = Math.cos(a) * o.freq + off, cz = Math.sin(a) * o.freq + off;
    const north = -Math.sin(a), se = Math.cos(a - 0.9);
    const env = o.e0 + o.eN * smooth(-0.6, 0.9, north) - o.eSE * smooth(0.25, 1, se);
    // broad masses with long saddles between them, then irregularity at ~200 m and ~60 m
    const big = smooth(0.22, 0.78, fbm(cx, cz, 2)) * 0.75 + fbm(cx * 2.3 + 11, cz * 2.3, 2) * 0.25;
    let y = env * (0.22 + 0.78 * big) * o.h;
    if (o.peak) {
      // mountains: POINTED summits with straight flanks (ridged noise: a crease at every top), a big one every
      // kilometre or so and shoulders on them - a crest of smooth noise is a row of rounded waves
      y += (Math.pow(ridged(fbm(cx * unit / (o.pk1 ?? 900) + 21, cz * unit / (o.pk1 ?? 900), 2)), 1.6) - 0.56) * o.peak * o.h * (0.25 + big);
      y += (Math.pow(ridged(fbm(cx * unit / 260 + 3, cz * unit / 260, 2)), 1.3) - 0.58) * 2.4 * o.n1 * (0.4 + big);
      y += (ridged(fbm(cx * unit / 70 + 9, cz * unit / 70, 2)) - 0.5) * 1.6 * o.n2;
      y += (fbm(cx * unit / 22 + 5, cz * unit / 22, 2) - 0.5) * 0.5 * o.n2;
    } else {
      y += (fbm(cx * unit / 200 + 3, cz * unit / 200, 2) - 0.5) * 2 * o.n1 * (0.4 + big);
      y += (fbm(cx * unit / 60 + 9, cz * unit / 60, 2) - 0.5) * 2 * o.n2;
    }
    if (o.n3) y += (fbm(cx * unit / 13 + 5, cz * unit / 13, 2) - 0.5) * 2 * o.n3;     // crown tops along a wooded ridge
    return Math.max(o.h * 0.03, y);
  };
  const crest = new Float32Array(N + 1);
  let summits = null;
  if (o.peak) {
    // MOUNTAINS are composed, not drawn from noise (a crest of ridged noise is a row of equal small pyramids):
    // a long, lazily rising and falling ridge, and on it a FEW summits set down one by one - unequal gaps
    // (now and then a long empty ridge), one in three a big one and the rest much lower, every one with two
    // different flanks (one long and gentle, one short and steep; straight, hollow or rounded), some with a
    // shoulder on a flank, some cut off flat.
    const arc = (TAU * o.r) / N, circ = TAU * o.r, G = o.pk1, S = [];
    const envAt = (a) => o.e0 + o.eN * smooth(-0.6, 0.9, -Math.sin(a)) - o.eSE * smooth(0.25, 1, Math.cos(a - 0.9));
    const bigAt = (a) => { const cx = Math.cos(a) * o.freq + off, cz = Math.sin(a) * o.freq + off; return smooth(0.22, 0.78, fbm(cx, cz, 2)) * 0.75 + fbm(cx * 2.3 + 11, cz * 2.3, 2) * 0.25; };
    const AAt = (a) => envAt(a) * (0.22 + 0.78 * bigAt(a)) * o.h;
    for (let m = R() * G; m < circ - G * 0.6;) {
      const a = m / o.r, cal = calmAt(a), A = o.h * (0.45 + 0.55 * envAt(a)) * (0.35 + 0.65 * bigAt(a));
      const major = R() < 0.34 && cal < 0.3;
      const rise = A * (major ? 0.34 + R() * 0.30 : 0.09 + R() * 0.17) * (1 - 0.6 * cal);
      let s1 = 0.26 + R() * 0.26, s2 = 0.42 + R() * 0.5;
      if (R() < 0.5) [s1, s2] = [s2, s1];
      S.push({ m, rise, major, wl: rise / s1, wr: rise / s2, pl: 0.72 + R() * 0.6, pr: 0.72 + R() * 0.6, flat: R() < 0.22 ? 0.80 + R() * 0.14 : 1,
        sh: [0, 1].map((k) => (R() < 0.6 ? { side: k ? 1 : -1, t: 0.22 + R() * 0.45, w: 0.10 + R() * 0.16, h: 0.08 + R() * 0.2 } : { side: 0, t: R(), w: R(), h: R() })) });
      m += G * (major ? 1.25 : 0.72) * Math.exp(gauss(R) * 0.4) + (R() < 0.24 ? G * (0.8 + R() * 1.4) : 0);
    }
    for (let i = 0; i <= N; i++) {
      const a = ((i % N) / N) * TAU, cal = calmAt(a), m = (i % N) * arc;
      const cx = Math.cos(a) * o.freq + off, cz = Math.sin(a) * o.freq + off;
      // (the long ridge rises and falls lazily at two scales - a third and a seventh of the gap between summits:
      // no run of the crest is a ruled line, in the calm sector neither)
      let y = AAt(a) * 0.9 * (1 - 0.12 * cal) + (fbm(cx * unit / (G * 0.6) + 3, cz * unit / (G * 0.6), 2) - 0.5) * 3.6 * o.n1 * (1 - 0.3 * cal)
        + (fbm(cx * unit / (G * 0.24) + 13, cz * unit / (G * 0.24) + 5, 2) - 0.5) * 2.0 * o.n1 * (1 - 0.3 * cal), top = 0;
      for (const q of S) {
        let d = m - q.m; if (d > circ / 2) d -= circ; else if (d < -circ / 2) d += circ;
        const w = d < 0 ? q.wl : q.wr, t = Math.abs(d) / w;
        if (t >= 1) continue;
        let v = 1 - Math.pow(t, d < 0 ? q.pl : q.pr);
        // (a summit cut off short is ROUNDED over and leans: never a level table)
        if (q.flat < 1 && v > q.flat - 0.12) { const e = (v - (q.flat - 0.12)) / (1.12 - q.flat); v = q.flat - 0.12 + (1.12 - q.flat) * (e - 0.45 * e * e) + 0.05 * (d < 0 ? -1 : 1) * e * Math.min(1, t * 6); }
        for (const h of q.sh) if (h.side * d > 0) v += h.h * Math.pow(Math.max(0, 1 - Math.abs(t - h.t) / h.w), 1.4) * (1 - t);
        // (lumps along a flank: no flank is a ruled line)
        v *= 1 + (fbm(cx * unit / 330 + 41, cz * unit / 330, 2) - 0.5) * 0.9 * Math.min(1, t * 2.5);
        top = Math.max(top, v * q.rise);
      }
      y += top;
      y += (ridged(fbm(cx * unit / 80 + 9, cz * unit / 80, 2)) - 0.5) * 1.0 * o.n2 * (1 - 0.6 * cal);
      y += (fbm(cx * unit / 22 + 5, cz * unit / 22, 2) - 0.5) * 0.4 * o.n2;
      crest[i] = Math.max(o.h * 0.03, y);
    }
    // the summit of each as it came out (the highest sample near it)
    const win = Math.max(2, Math.round(50 / arc));
    summits = S.map((q) => { let pk = Math.round(q.m / arc) % N; for (let k = -win; k <= win; k++) { const j = ((Math.round(q.m / arc) + k) % N + N) % N; if (crest[j] > crest[pk]) pk = j; } return { ...q, pk }; });
  } else for (let i = 0; i <= N; i++) crest[i] = hAt(((i % N) / N) * TAU);
  // Two parts, so that no pixel is covered by needle-thin triangles (4096 full-height slivers cost a
  // measurable part of the frame in overshading): a coarse body up to a seam just under the crest,
  // and a fine fringe from the seam to the crest line that carries the silhouette.
  const { pos, uv, idx } = RANGES, v0 = pos.length / 3;
  const drop = 40, C = 8, NC = N / C;
  o.drop = drop;
  const T = summits ? peakShade(o, crest, N, summits) : ridgeShade(o, crest, N);
  const sAt = (i) => { i = ((i % N) + N) % N; RANGES.s.push(T.top[i] / o.h, T.bot[i] / o.h, T.spur[i] / o.h, 0, T.top[i] / o.h, T.bot[i] / o.h, T.spur[i] / o.h, 0); };
  // seam height at every coarse column: under the lowest crest of the two spans it touches
  const seam = new Float32Array(NC + 1);
  for (let k = 0; k <= NC; k++) {
    let lo = 1e9;
    for (let j = -C; j <= C; j++) lo = Math.min(lo, crest[((k * C + j) % N + N) % N]);
    seam[k] = Math.max(lo - 2 - o.h * 0.004, -drop * 0.5);
    const a = (k / NC) * TAU, x = Math.cos(a) * o.r, z = Math.sin(a) * o.r;
    pos.push(x, o.base - drop, z, x, o.base + seam[k], z);
    uv.push(k / NC, -drop / o.h, k / NC, seam[k] / o.h); sAt(k * C);
    if (k < NC) { const q = v0 + k * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const f0 = pos.length / 3;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU, c = crest[i], x = Math.cos(a) * o.r, z = Math.sin(a) * o.r;
    const k = Math.min(NC - 1, Math.floor(i / C)), f = i / C - k;
    const ys = seam[k] + (seam[k + 1] - seam[k]) * f;          // on the straight top edge of the body: no crack, same values
    pos.push(x, o.base + ys, z, x, o.base + c, z);
    uv.push(i / N, ys / o.h, i / N, c / o.h); sAt(i);
    if (i < N) { const q = f0 + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
  }
  const col = new THREE.Color(o.col), col2 = new THREE.Color(o.col2);
  // brush wobble of the tone edges: lobes about Lw metres long and half as high, pushing the edge by about a sixth of that
  const Lw = o.wob ?? (o.pk1 ?? 500) * 0.2;
  for (let i = v0; i < pos.length / 3; i++) { RANGES.col.push(col.r, col.g, col.b); RANGES.col2.push(col2.r, col2.g, col2.b); RANGES.r.push(o.plane, o.foot ?? 1, 0, 0); RANGES.k.push((TAU * o.r) / Lw, o.h / (Lw * 0.5), (Lw * 0.34) / o.h, 0); }
}

export default function (scene) {
  const t0 = performance.now();
  const atlas = makeCrownAtlas();
  const t1 = performance.now();
  const village = makeVillageTex(), castle = makeCastleTex();
  const t2 = performance.now();
  buildPlain(scene);
  buildHills(scene);
  const crowns = buildCrowns(scene, atlas);
  buildBirds(scene);

  // the path carries on down the hill and across the plain to the village
  ribbon(scene, [[-1, 66], [-5, 80], [-3, 98], [10, 122], [28, 150], [30, 185], [18, 222], [34, 268], [74, 312], [96, 370], [138, 440], [176, 530], [208, 640], [232, 716]],
    (r) => 2.4 + r * 0.011, (r) => 0.3 + r * 0.0022,
    { uA: { value: new THREE.Color(0xe9d0bc) }, uB: { value: new THREE.Color(0xdcc0a8) }, uR: { value: new THREE.Vector4(1, 0, 0.11, 0) } });
  // a river winding through the open country to the east and south-east
  ribbon(scene, [[1700, -420], [1150, -160], [800, 90], [830, 350], [650, 540], [430, 660], [400, 850], [600, 1050], [1000, 1350]],
    (r) => 46 + r * 0.02, () => 0.6,
    { uA: { value: new THREE.Color(0xa9d3ea) }, uB: { value: new THREE.Color(0xeef8fc) }, uR: { value: new THREE.Vector4(0.0, -100, 0.004, 0.36) } });

  card(scene, village, 262, 772, annY(815) - 5, 170, 53, 0.36, 0.0);
  const ch = HILLS[8], cx = ch.x - 40, cz = ch.z + 20;
  card(scene, castle, cx, cz, hillH(ch, cx, cz) - 22, 120, 120, 0.48, 0.0);

  // a wooded ridge ring (the crisp pale-green band that ends the plain), then three ranges, near to far
  range({ r: 1250, base: -10, h: 120, freq: 1.5, seed: 1, e0: 0.5, eN: 0.5, eSE: 0.2, n1: 9, n2: 4, n3: 2.2, col: 0xaed19f, col2: 0x9cc3a2, plane: 0.74, foot: 0, fWin: 90, fGap: 0.03, wob: 60 });
  range({ r: 1900, base: -10, h: 230, freq: 2.2, seed: 6, e0: 0.5, eN: 0.5, eSE: 0.42, n1: 22, n2: 9, peak: 0.30, pk1: 700, col: 0xc1ced3, col2: 0xabbacb, plane: 0.82, inner: 6 });
  range({ r: 2900, base: -10, h: 450, freq: 2.7, seed: 3, e0: 0.42, eN: 0.58, eSE: 0.3, n1: 34, n2: 13, peak: 0.28, pk1: 1000, col: 0xcbd6da, col2: 0xb8c7d4, col3: 0xa3b2cc, plane: 0.88, inner: 6, snow: 0.55 });
  range({ r: 4100, base: -10, h: 820, freq: 3.1, seed: 9, e0: 0.34, eN: 0.66, eSE: 0.22, n1: 40, n2: 16, peak: 0.28, pk1: 1500, col: 0xd6dfe3, col2: 0xc5d2dd, col3: 0xb3c2d6, plane: 0.94, inner: 5, snow: 0.5 });
  buildRanges(scene);
  window.__far = { atlasMs: t1 - t0, landmarkMs: t2 - t1, buildMs: performance.now() - t2, crowns };
  console.info(`[far] crown atlas ${(t1 - t0).toFixed(0)} ms, landmarks ${(t2 - t1).toFixed(0)} ms, geometry ${(performance.now() - t2).toFixed(0)} ms, ${crowns} crown cards`);
}
