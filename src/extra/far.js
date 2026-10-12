// Everything beyond the hill, built as flat painted VALUE PLANES (the camera never leaves the
// hilltop, so each object gets one baked haze amount snapped to a few steps, like the layers of a
// background painting; nothing fades smoothly):
//   - wooded hills (real mounds, 250-1100 m); their woods are thousands of individual crown cards
//   - lone trees, copses and hedgerows on the rolling ground and the plain (same crown atlas)
//   - the far plain painted in thin field strips, a road, a river, a village and a castle
//   - a wooded ridge ring and three pale mountain ranges: one flat value each, one faint shadow wash
// The crown cards stand across the line from the eye to their foot (they turn as the viewer walks, not as he
// looks); the painted cards (village, castle) are static and face the origin.
import * as THREE from 'three';
import { mat, stepFog, STEP_FOG_GLSL } from '../glsl.js';
import { rng, height, fbm, smooth, SUN } from '../world.js';
import { painted } from '../paint.js';
import { TAU, sunAt, annY, groundY, EYE_Y, gauss, HILLS, hillH, hillN, hillWood, hillArrays, crownArrays } from './far-crowns.js';
import { GROUND_UNIFORMS } from '../terrain.js';
import { makeCrownAtlas, makeVillageTex, makeCastleTex, ATLAS } from './far-tex.js';

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
const vec3 MIST_A0 = vec3(0.788, 0.867, 0.839), MIST_B0 = vec3(0.863, 0.922, 0.890);   // #C9DDD6, #DCEBE3
// (the mist has the colour of the hour's air: at evening the rose of the far haze, under snow a colder white)
#define MIST_A mix(mix(MIST_A0, vec3(0.850, 0.890, 0.930), uSnow), uHazeFarCol * vec3(0.93, 0.90, 0.97), uEve)
#define MIST_B mix(mix(MIST_B0, vec3(0.905, 0.930, 0.955), uSnow), uHazeFarCol * vec3(0.98, 0.96, 1.00), uEve)
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

function buildHills(scene) {
  const a = painted.hills ?? hillArrays();
  // one mesh for all the hills, the near tier first in the index (so it is drawn first and hides the far tier)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(a.nrm, 3));
  g.setAttribute('aUv', new THREE.Float32BufferAttribute(a.uv, 2));
  g.setAttribute('aHill', new THREE.Float32BufferAttribute(a.aH, 4));
  g.setAttribute('aP', new THREE.Float32BufferAttribute(a.aP, 4));
  g.setAttribute('aQ', new THREE.Float32BufferAttribute(a.aQ, 4));
  g.setIndex(a.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(a.idx, 1) : new THREE.Uint16BufferAttribute(a.idx, 1));
  const m = new THREE.Mesh(g, mat({ vs: HILL_VS, fs: HILL_FS, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = RO.hills; m.userData.grp = 'far-hills';
  scene.add(m);
}

// ------------------------------------------------------------------------------------ crown cards
// One instanced draw for every crown, lone tree, rock outcrop and hedge. Cards are vertical and face
// the eye's position. Three flat tones: sun cap (threshold per instance), shadow body, dark accent.
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
  // The card stands across the line from the EYE to its foot (the eye's place, never the way it looks: turning
  // the head moves nothing). Faced to the middle of the hilltop instead, a tree a hundred metres off is seen
  // a quarter-turn edge-on from the rim: a narrow cut-out that widens and thins as one walks.
  vec2 d = normalize(iPos.xz - uCamPos.xz);
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
// (laid out by src/extra/far-crowns.js - in a worker thread while the page loads if it can be)
function buildCrowns(scene, atlas) {
  const tuned = /[?&](capn|capt|woodcap)=/.test(location.search);   // (the worker lays out the defaults)
  const c = (!tuned && painted.crowns) || crownArrays(location.search);
  window.__woodMasses = c.masses;
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(c.iPos, 4));
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(c.iA, 4));
  g.setAttribute('iB', new THREE.InstancedBufferAttribute(c.iB, 4));
  g.setAttribute('iC', new THREE.InstancedBufferAttribute(c.iC, 4));
  g.setAttribute('iD', new THREE.InstancedBufferAttribute(c.iD, 4));
  g.instanceCount = c.N;
  const m = new THREE.Mesh(g, mat({ vs: CROWN_VS, fs: CROWN_FS, uniforms: { uAtlas: { value: atlas } }, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.renderOrder = RO.crowns; m.userData.grp = 'far-crowns';
  scene.add(m);
  return c.N;
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
  float water = step(uA.r, uA.b);
  // under snow the road is a trodden track (blue-grey, its second tone the white left between the ruts) and the
  // river is ice; at evening the water gives back the sky (the hour is laid by atmo on everything else)
  if (uSnow > 0.0) c = mix(c, water > 0.5 ? mix(vec3(0.800, 0.870, 0.930), vec3(0.930, 0.950, 0.970), step(uA.b, c.b + 0.01)) : mix(vec3(0.800, 0.840, 0.930), vec3(0.900, 0.922, 0.965), step(uA.r, c.r + 0.01)), uSnow);
  if (uEve > 0.0 && water > 0.5) { gHour = true; c = mix(c, mix(vec3(0.830, 0.700, 0.760), vec3(1.000, 0.880, 0.760), step(uA.b + 0.01, c.b)), uEve); }
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
  // under snow the roofs are white (tile and slate are told from wall by their hue; a breath of the roof is left)
  if (uSnow > 0.0){
    float rf = max(smoothstep(0.10, 0.17, c.r - c.g), smoothstep(0.07, 0.12, c.b - c.r));
    c = mix(c, mix(SNOW_S, SNOW_L, smoothstep(0.50, 0.58, dot(c, LUMA))), rf * 0.86 * uSnow);
  }
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
