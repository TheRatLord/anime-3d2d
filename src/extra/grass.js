// Grass tufts, weeds, wildflowers and the dry-brush strokes of the middle distance.
// Per the boards the meadow itself is a flat wash (src/terrain.js). Blades are drawn only
//  (a) as a fringe along edges: path sides, the strip between the ruts, broken runs of tall grass
//      beside the path, and a dark ring at the foot of every wall, pier, trunk, stone and post,
//  (b) inside the grass masses: drifts of a mid green painted on the ground by src/terrain.js (a
//      world-fixed field, ~40% of the hilltop, the rest left as quiet wash). The tufts stand only
//      in them, close in tone to the paint under them, so a drift reads as one mass with blades
//      at its edge and dark accents in its core; the taller ones stay on into the middle distance,
//  (c) as tall weed clumps every 8-15 m, which give any view a near dark shape.
// Between 8 and 45 m the bare wash carries sparse horizontal dry-brush strokes instead.
//
// Stability rules:
//  - Nothing changes size with distance: a tuft keeps its world size and dissolves into the colour
//    of the ground under its root (then into coverage). The distance at which the band dissolves is
//    warped by world-anchored noise, so its frontier is ragged and tied to the ground.
//  - Edges are anti-aliased with alpha-to-coverage (oColor.a = coverage).
//  - The lit / shadow tone of every instance is BAKED once (the sun does not move): the shadow map
//    is read back at start-up and sampled on the CPU with a wide probe and a per-instance threshold.
//    Wind sway and the 12 fps shadow update can therefore never flip an instance between tones.
//
// Performance: instances live in a spatial grid (6 m cells) per layer; a layer is a set of
// instances with the same maximum drawing distance. Every frame the cells in range and in the
// frustum are copied, nearest first, into one dynamic buffer per mesh (only when the set of cells
// changes), so the vertex shader sees a few thousand instances instead of ~270 000.
import * as THREE from 'three';
import { G, mat, WIND_GLSL } from '../glsl.js';
import { rng, height, smooth, onSlab, vnoise, alongPath, PATH_LEN, floorRect, inRect, SUBJECT } from '../world.js';
import { LAYOUT, composed, added } from '../layout.js';
import { GRASS_GLSL, FLOWER_HUE_GLSL, FLOWER_COLS, GROUND_UNIFORMS, GMAP, meadowAt, pathEdge, pathInfo, flowerDrift, flowerFam, bloomGather, BAND_SHARE, massRaw, massExtra, MASS2_BOX } from '../terrain.js';
import { makeTuftAtlas, CELLS, COLS, ROWS, TOP_ROW } from './grass-atlas.js';

// ---------------------------------------------------------------- categories of tufts
// fade = where a tuft dissolves into the ground colour (start, end, in metres from the camera).
// For the band (4, 6) the two numbers are instead the range from which every tuft draws its OWN
// dissolve distance (world noise + its random number), and it dissolves within +/- 18% of that:
// with distance the band thins out tuft by tuft, each one dark until it goes, instead of all of
// them paling together, and there is no ring that travels with the camera.
//   1 path fringe   2 contact fringe (dark, at the foot of things)   3 leaves under flowers
//   4 foreground band   5 tall weeds and the runs of tall grass by the path
//   6 the big tufts of the band, which stay on into the middle distance (and further in shadow)
//   7 the basal leaves of a cluster of blooms (near only: further out the dab painted under the cluster stands for them)
const FADE = { 1: [46, 84], 2: [60, 120], 3: [22, 44], 4: [5, 14], 5: [60, 115], 6: [14, 32], 7: [6, 11] };
const BAND_K = 1.18;
const TUFT_LAYERS = [1, 2, 3, 4, 5, 6, 7].map((c) => ({
  cat: c,
  range: c === 4 ? FADE[4][1] * BAND_K : c === 6 ? 40 : FADE[c][1] + 0.175 * (FADE[c][1] - FADE[c][0]),
}));
// flowers: three classes that dissolve at different distances (far away a flower is a dash that
// stands for a streak of blossoms, so fewer are needed)
// (the third class, 15% of the blooms, stays on to ~60 m as small lozenge dabs: with the ground dabs of
// src/terrain.js they are the marks of a drift in the middle distance)
// (a fourth class, the FRINGE: 10-15% of the blooms of a drift and a third of those at its rim, short-stemmed,
// which stand on to 30-40 m as small crisp dabs over the edge of the paint laid on the ground there)
const FLOWER_FADE = [[8, 12.5], [11.5, 17], [15, 24], [27, 37]];
// stems (and the leaves on them) are drawn to here (start, end of their dissolve, metres)
// response to the shared wind (src/glsl.js WIND_GLSL): tip lean of a tuft and nod of a bloom in a full gust
// (fractions of their height), the per-tuft flutter in a calm and what a gust adds to it (x the old sway),
// and how far the lit tones of a leaning tuft lift toward a pale green
const WIND_K = { lean: '0.20', nod: '0.22', flutter0: '0.5', flutter1: '0.8', sheen: '0.14' };
const STEM_FADE = '5.5, 10.5';
// sway exists only where the tip moves at least this many pixels (start, full): a 1-2 px sway reads as crawl
const SWAY_PX = '3.5, 5.0';
// the elevation of the eye above a bloom (sine) from which its lying card is drawn
const FLAT_EL = 0.52;
const FLOWER_LAYERS = FLOWER_FADE.map((f) => ({ range: f[1] + 0.15 * (f[1] - f[0]) }));

// colour of the ground under a root (wash in light, the grass shadow tone in shade)
const VS_GROUND = /* glsl */`
uniform sampler2D uBrush;
uniform float uPixelK;
${GRASS_GLSL}
uniform sampler2D uContact;
vec3 groundAt(vec2 p, vec3 wash, float lit){
  return mix(mix(GSH_A, GSH_B, step(0.66, shadePatch(p)) * 0.7) * (0.72 + 0.31 * wash.g), wash, lit);
}
// the ground of the flower drifts under a root (see driftWash() in src/terrain.js; the same field without its brush edge)
vec3 driftAt(vec3 g, vec3 wp){
  float b = textureLod(uContact, (wp.xz - vec2(${GMAP.x0.toFixed(1)}, ${GMAP.z0.toFixed(1)})) / vec2(${GMAP.w.toFixed(1)}, ${GMAP.h.toFixed(1)}), 0.0).b;
  float q = 1.0 - 0.86 * smoothstep(9.0, 16.0, distance(wp, uCamPos));
  return driftWash(g, smoothstep(0.14, 0.26, b) * q, smoothstep(0.42, 0.58, b) * q);
}
`;

const TUFT_VS = /* glsl */`
in vec3 position;
in vec3 iPos; in vec4 iData; in float iLit; in vec2 iSlope; in vec2 iLean;    // size (m), atlas cell, random, category; baked sun term; ground slope; (unused)
${VS_GROUND}
${WIND_GLSL}
uniform vec2 uBoxB[${COLS * ROWS}];
uniform vec3 uBoxT[${COLS * ROWS}];
out vec2 vUv; out float vDepth; out float vBy;
flat out vec3 vLight; flat out vec3 vMid; flat out vec3 vDark; flat out vec3 vBase; flat out float vRand; flat out float vAlpha; flat out float vThin;
const vec4 CULL = vec4(2.0, 2.0, 2.0, 1.0);
void main(){
  float size = iData.x, variant = iData.y, rnd = iData.z, cat = iData.w;
  float rnd2 = fract(rnd * 57.31);
  vec3 toCam = uCamPos - iPos;
  float dist = length(toCam);
  if (dist < 0.7){ gl_Position = CULL; return; }
  // where this tuft dissolves into the ground colour (start, end)
  vec2 fr = cat < 1.5 ? vec2(${FADE[1]}) : cat < 2.5 ? vec2(${FADE[2]}) : cat < 3.5 ? vec2(${FADE[3]})
          : cat < 4.5 ? vec2(${FADE[4]}) : cat < 5.5 ? vec2(${FADE[5]}) : cat < 6.5 ? vec2(${FADE[6]}) : vec2(${FADE[7]});
  bool band = (cat > 3.5 && cat < 4.5) || (cat > 5.5 && cat < 6.5);
  float lit = iLit;
  float f;
  if (band){
    // the frontier of the band is anchored to the ground (slow world noise) and ragged (per tuft)
    float wn = texture(uBrush, iPos.xz / 23.0 + 0.77).a;
    float D = mix(fr.x, fr.y, clamp(rnd2 * 0.75 + (wn - 0.5) * 1.3 + 0.125, 0.0, 1.0));
    f = smoothstep(D * 0.82, D * 1.18, dist);
  } else f = smoothstep(fr.x, fr.y, dist + (rnd2 - 0.5) * 0.35 * (fr.y - fr.x));
  // big tufts in shadow keep their blades further out (dark masses are where the boards draw
  // them, and their strokes break the shadow edge)
  if (cat > 5.5 && cat < 6.5) f = mix(min(f, smoothstep(20.0, 40.0, dist)), f, lit);
  if (f > 0.995){ gl_Position = CULL; return; }
  float wS = windAt(iPos.xz);
  float cf = smoothstep(0.0, 0.7, f);
  // (next to the lens a tuft ducks instead of going transparent: no ghost blades over what is behind)
  vAlpha = (1.0 - smoothstep(0.5, 1.0, f)) * smoothstep(0.7, 0.95, dist);
  float duck = mix(0.12, 1.0, smoothstep(0.9, 1.9, dist));
  vec3 tc = toCam / dist;

  // Card axes depend on the POSITION of the camera only (never on where it looks): turning in place
  // leaves every tuft alone. Two cards per tuft, cross-faded by the elevation of the camera above the root:
  //  - an upright fan: U = world up, R = horizontal, at right angles to the direction to the camera
  //    (it foreshortens by itself as the camera rises);
  //  - from above, what a painter draws: a low splayed clump lying on the ground with a fixed yaw.
  // Neither card is ever half transparent (two ghosts over each other read as a doubled tuft with
  // stippled edges): the lying clump GROWS out of the root as the camera rises and the upright fan is
  // pressed down, both as functions of the camera position only.
  float el = tc.y;
  float wFlat = smoothstep(0.66, 0.88, el), wUp = 1.0 - smoothstep(0.78, 0.97, el);
  int vi = int(variant + 0.5);
  float flip = rnd > 0.5 ? 1.0 : -1.0;
  vec3 w;
  if (position.z > 0.5){
    if (wFlat <= 0.0){ gl_Position = CULL; return; }
    // eight lying clumps (two atlas rows), four to choose from per size class; every instance has its
    // own yaw and handedness, and none of them is a rosette
    float tv = (variant < 5.5 ? 0.0 : variant < 13.5 ? 2.0 : 4.0) + floor(fract(rnd * 91.7) * 4.0);
    float yaw = rnd * 6.283;
    vec3 n = normalize(vec3(-iSlope.x, 1.0, -iSlope.y));
    vec3 F = vec3(cos(yaw), 0.0, sin(yaw));
    vec3 T1 = normalize(F - n * dot(F, n)), T2 = cross(n, T1);
    // (underfoot the clump keeps to a few strokes: its radius on screen is capped, or the big ones become a
    // flat mass a third of the picture wide)
    float rad = min(min(size, 0.5) * 0.70, 80.0 * uPixelK * dist) * mix(0.25, 1.0, wFlat);
    w = iPos + n * (0.02 * size + 0.02) + (T1 * position.x * flip + T2 * (position.y * 2.0 - 1.0)) * rad;
    vUv = vec2((position.x * 0.5 + 0.5 + mod(tv, ${COLS}.0)) / ${COLS}.0, (${ROWS - 1 - TOP_ROW}.0 - floor(tv / ${COLS}.0) + position.y) / ${ROWS}.0);
    vBy = 1.0;
    vAlpha *= smoothstep(0.0, 0.12, wFlat);
    vThin = min(min(size, 0.5) * 0.70, 80.0 * uPixelK * dist) / 128.0;
  } else {
    if (wUp <= 0.0){ gl_Position = CULL; return; }
    vec2 bb = uBoxB[vi]; vec3 bt = uBoxT[vi];
    float bu = position.x * 0.5 + 0.5;
    float bx = mix(mix(bb.x, bb.y, bu), mix(bt.x, bt.y, bu), position.y), by = position.y * bt.z;
    vec2 q = vec2((bx - 0.5) * flip, by);
    // held wind: tips lean, roots stay. Only where the lean is worth several pixels on screen.
    float ph = rnd * 6.283 + iPos.x * 0.35 + iPos.z * 0.2;
    // (and only some of the tufts move at all: the rest are held, like the painted ground they stand on)
    float swayK = smoothstep(${SWAY_PX}, 0.05 * size / (dist * uPixelK)) * step(fract(rnd * 7.31), 0.5);
    // (the flutter is each tuft's own; it quickens a little in a gust and is small in the calm)
    q.x += sin(uTime * 1.6 + ph) * 0.05 * by * by * swayK * (${WIND_K.flutter0} * min(uWindAmp, 1.0) + ${WIND_K.flutter1} * wS);
    q *= size * vec2(1.0, duck * mix(0.6, 1.0, wUp));
    vBy = by;
    float hl = length(toCam.xz);
    vec3 Rv = hl > 1e-4 ? vec3(toCam.z, 0.0, -toCam.x) / hl : vec3(1.0, 0.0, 0.0);
    w = iPos + Rv * q.x + vec3(0.0, q.y, 0.0) + tc * (0.04 * size);
    // the shared wind: every tuft leans DOWNWIND by the strength of the wind where it stands (tip ~ height
    // squared, the root planted), so a gust is a band of leaning grass rolling over the meadow. Like the
    // flutter, only where the lean is worth a few pixels: further out the meadow is held paint.
    float ln = ${WIND_K.lean} * wS * (0.7 + 0.6 * rnd2) * smoothstep(1.5, 3.0, ${WIND_K.lean} * size / (dist * uPixelK));
    float bend = by * by * ln * size * duck * mix(0.6, 1.0, wUp);
    w.xz += windDir * bend; w.y -= bend * ln * 1.6;
    float col = mod(variant, ${COLS}.0), row = floor(variant / ${COLS}.0);
    vUv = vec2((bx + col) / ${COLS}.0, (${ROWS}.0 - 1.0 - row + by) / ${ROWS}.0);
    vAlpha *= smoothstep(0.0, 0.15, wUp);
    vThin = size / 256.0;
  }
  // atlas texels per screen pixel (blades that would go under ~1.5 px are fattened in the fragment shader)
  vThin = dist * uPixelK / vThin;

  // three flat tones per tuft
  // (the tufts of the band stand inside a grass mass: the paint under them is its mid green)
  vec3 g = grassWash(iPos);
  if (band) g = massWash(g);
  g = driftAt(g, iPos);
  vec3 lightL, midL, darkL;
  if (cat < 1.5){
    // path fringe: the light strokes ARE the wash, mid a greener stroke, dark a teal foot
    float dry = step(0.86, rnd2);
    lightL = mix(g * vec3(1.03, 1.02, 0.90), vec3(0.93, 0.91, 0.62), dry * 0.7);
    midL   = mix(g, vec3(0.52, 0.74, 0.38), 0.38 + 0.25 * rnd);
    darkL  = mix(vec3(0.35, 0.62, 0.50), vec3(0.42, 0.66, 0.40), rnd2);
  } else if (cat < 2.5){
    lightL = mix(vec3(0.56, 0.76, 0.45), g, 0.25 * rnd);
    midL   = mix(vec3(0.310, 0.541, 0.416), vec3(0.36, 0.62, 0.42), rnd2 * 0.6);     // #4F8A6A
    darkL  = vec3(0.188, 0.341, 0.341);                                             // #305757
  } else if (cat > 6.5){
    // the leaves at the foot of a cluster of blooms: the foliage greens of the dab painted under it, a step
    // deeper, so that cluster, leaves and dab are one dark green mass with blooms on it
    lightL = mix(vec3(0.560, 0.770, 0.400), vec3(0.610, 0.800, 0.410), rnd);
    midL   = mix(vec3(0.400, 0.640, 0.350), vec3(0.455, 0.690, 0.370), rnd2);
    darkL  = vec3(0.275, 0.500, 0.360);
  } else if (cat < 3.5){
    lightL = vec3(0.60, 0.80, 0.42);
    midL   = mix(vec3(0.44, 0.67, 0.37), vec3(0.50, 0.72, 0.38), rnd2 * 0.5);
    darkL  = vec3(0.31, 0.53, 0.38);
  } else {
    // foreground band and weeds: teal (#599E80 mid) or a warmer green, by the mass (not by the tuft:
    // neighbours share a hue). Light blades are a lighter green, not the wash: low contrast inside a tuft.
    float hue = smoothstep(0.38, 0.62, texture(uBrush, iPos.xz / 9.0 + 0.19).a + (rnd - 0.5) * 0.12);
    midL   = mix(vec3(0.349, 0.620, 0.502), vec3(0.44, 0.69, 0.42), hue);
    darkL  = mix(vec3(0.215, 0.390, 0.375), vec3(0.27, 0.48, 0.37), hue);
    lightL = mix(vec3(0.54, 0.76, 0.50), vec3(0.66, 0.83, 0.47), hue);
    if (band){
      // inside a mass the tuft is close to the paint it stands on: its light blades ARE the mass,
      // its mid a step down, and only the feet carry the dark accent
      lightL = mix(g, lightL, 0.5);
      midL = mix(MASS_D, midL, 0.35 + 0.20 * step(5.5, cat));
      darkL = mix(darkL, vec3(0.30, 0.53, 0.40), 0.5);
    }
  }
  // in shade: lighter blades (#7FB48A) over the dark ground, so the tufts stand out from it
  vec3 lightS = vec3(0.515, 0.730, 0.560), midS = vec3(0.325, 0.545, 0.455), darkS = vec3(0.205, 0.375, 0.365);
  vec3 ground = groundAt(iPos.xz, g, lit);
  // (a gust shows the pale side of the leaning blades: the lit tones of a tuft lift a touch, in the sun only)
  float sheen = ${WIND_K.sheen} * lit * smoothstep(0.25, 1.0, wS) * (position.z > 0.5 ? 0.0 : 1.0);
  lightL = mix(lightL, vec3(0.80, 0.90, 0.62), sheen); midL = mix(midL, lightL, sheen * 0.8);
  vLight = mix(mix(lightS, lightL, lit), ground, cf);
  vMid   = mix(mix(midS, midL, lit), ground, cf);
  vDark  = mix(mix(darkS, darkL, lit), ground, cf);
  // (lying on the ground a clump is a quiet two-tone mark: its light strokes would read as scattered pale leaves)
  if (position.z > 0.5){
    vLight = mix(vLight, vMid, 0.55);
    // (and from high up a quiet one: a brush touch a step off the paint under it, not a dark pin on the plan)
    float hi = 0.55 * smoothstep(9.0, 24.0, dist);
    vLight = mix(vLight, ground, hi); vMid = mix(vMid, ground, hi); vDark = mix(vDark, ground, hi);
  }
  // the feet of the blades are one flat tone close to the ground paint, so the tuft grows out of it
  vBase  = mix(band ? ground : mix(ground, vec3(0.66, 0.83, 0.47), 0.42 * lit), vMid, 0.30);
  vRand = rnd;

  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const TUFT_FS = /* glsl */`
in vec2 vUv; in float vDepth; in float vBy;
flat in vec3 vLight; flat in vec3 vMid; flat in vec3 vDark; flat in vec3 vBase; flat in float vRand; flat in float vAlpha; flat in float vThin;
uniform sampler2D uTuft;
void main(){
  // where a blade would be thinner than ~1.5 px, read a blurrier mip and lower the threshold: thin
  // strokes merge into fewer, fatter ones instead of crawling
  float thin = smoothstep(1.8, 5.5, vThin), mass = smoothstep(3.8, 8.0, vThin);
  vec4 t = texture(uTuft, vUv, 0.9 * thin + 0.9 * mass);
  float cov = clamp((t.a - mix(0.5, 0.38, thin)) / max(fwidth(t.a) * (1.0 + 0.7 * thin), 1e-4) + 0.5, 0.0, 1.0) * vAlpha;
  if (cov <= 0.02) discard;
  float v = t.r + (vRand - 0.5) * 0.16;
  // further out a tuft is one dab of one tone: no edges inside it
  v = mix(v, 0.5, mass);
  vec3 c = v > 0.70 ? vLight : v > 0.32 ? vMid : vDark;
  // ragged foot: below a level that differs from blade to blade, the stroke is the base tone
  if (vBy < 0.06 + 0.09 * fract(vRand * 13.7) + (t.r - 0.5) * 0.14) c = vBase;
  oColor = vec4(c, cov);
  writeAux(vec3(0., 1., 0.), 0.0, vDepth, 0.011, 0.0, 0.0);
}
`;

const FLOWER_VS = /* glsl */`
in vec3 position;
in vec3 iPos; in vec4 iData; in float iLit; in vec2 iSlope; in vec2 iLean;     // radius (m), colour + 8 * class, random, stem height; baked sun term; ground slope; where the bloom stands from its root (m)
${VS_GROUND}
${WIND_GLSL}
out vec2 vP0; out float vDepth;
flat out float vCol; flat out float vRand; flat out float vLit; flat out float vPx; flat out float vFade; flat out vec2 vFar; flat out vec3 vGround; flat out float vFlat; flat out float vA; flat out float vBody; flat out float vKx; flat out float vCut;
flat out float vStemA;   // a stem thinner than 1.6 px is drawn 1.6 px wide and that much fainter
flat out vec3 vStem;      // length of the stem below the bloom centre (bloom radii), its half width (bloom radii), how much of it is there
void main(){
  float rnd = iData.z;
  vStem = vec3(0.0); vKx = 0.0; vStemA = 1.0;
  // (colour + 8 * class + 32 * "stands inside the painted body of a drift")
  float inBody = floor(iData.y / 32.0 + 0.01), cc = iData.y - inBody * 32.0;
  float cls = floor(cc / 8.0 + 0.01), col = cc - cls * 8.0;
  // (the blooms of a cluster fan out from its foot: a bloom stands off its root, and its stem leans back to it)
  vec3 c = iPos + vec3(iLean.x, iData.w, iLean.y);
  vec2 lean = iLean;
  float dist = distance(c, uCamPos);
  vec2 fr = cls < 0.5 ? vec2(${FLOWER_FADE[0]}) : cls < 1.5 ? vec2(${FLOWER_FADE[1]}) : cls < 2.5 ? vec2(${FLOWER_FADE[2]}) : vec2(${FLOWER_FADE[3]});
  // (looked down on from above the blooms go sooner: there the drift is brushed patches painted on the ground)
  fr *= mix(1.0, 0.62, smoothstep(0.40, 0.75, (uCamPos.y - c.y) / dist));
  float f = smoothstep(fr.x, fr.y, dist + (fract(rnd * 31.7) - 0.5) * 0.3 * (fr.y - fr.x));
  if (f > 0.97 || dist < 0.4){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // A bloom is never faded: past its own distance it SHRINKS away to a speck in its full colour and is dropped
  // (a bloom going transparent and grey over the lawn is a ghost; one that gets smaller is a bloom further off)
  float shr = 1.0 - f * f;
  float px = dist * uPixelK;
  // held wind, only where it is worth more than a pixel
  float ph = rnd * 6.283 + iPos.x * 0.35;
  float wS = windAt(iPos.xz);
  c.x += sin(uTime * 1.6 + ph) * 0.02 * smoothstep(${SWAY_PX}, 0.02 / px) * step(fract(rnd * 7.31), 0.5) * (${WIND_K.flutter0} * min(uWindAmp, 1.0) + ${WIND_K.flutter1} * wS);
  // the shared wind: the bloom nods downwind on its stem (the root stays; the stem is drawn back to it)
  {
    float nod = ${WIND_K.nod} * wS * (0.7 + 0.6 * fract(rnd * 23.7)) * iData.w;
    vec2 d = windDir * nod * smoothstep(1.5, 3.0, ${WIND_K.nod} * iData.w / px);
    lean += d; c.xz += d; c.y -= length(d) * 0.3;
  }
  float spike = step(1.5, col) * step(col, 2.5);   // lilac flower spikes
  // Near: a dab of its own world size (x0.5-2), never under 2.5-4.5 px and never a saucer next to the lens.
  // From ~9 m on the dab flattens into a horizontal dash 2-3 px tall, 4:1 at 15 m, 12:1 at 50 m,
  // so that the dashes of a drift merge into streaks before the wash takes over.
  float big = clamp((iData.x - 0.014) / 0.042, 0.0, 1.0);
  // (the nearest blooms are drawn larger - up to 1.9x within ~3 m, back to their own size by ~14 m - so that a near
  // drift is big single flowers shrinking to dabs; and the smallest size on screen differs from bloom to bloom,
  // 1:2.2, so that a far drift is not one size of dot)
  // (only at eye level: looked down on from near by, a bloom is large enough already)
  float nearK = mix(mix(1.9, 1.0, smoothstep(2.5, 14.0, dist)), 1.0, smoothstep(0.35, 0.6, (uCamPos.y - c.y) / dist));
  float lo0 = 1.15 + 1.9 * big;
  float s = clamp(iData.x * nearK, px * lo0, px * 16.0) * shr;
  float far = smoothstep(15.0, 25.0, dist);
  // (far dabs differ in size, x1-1.8, and are at most 2.3:1 - equal 3.4:1 lozenges set side by side fused into
  // rows of bricks along the brow of the hill; these stay separate dabs in thin broken bands)
  float hy = mix(s, px * (1.05 + 0.85 * fract(rnd * 3.31)) * shr, far);
  // (the bands of a drift are painted on the ground by src/terrain.js: a far bloom is a small dab, never a tick)
  float aspect = mix(1.0, 1.35 + 0.5 * fract(rnd * 5.17), far) + 0.45 * clamp((dist - 15.0) / 35.0, 0.0, 1.0);
  // Axes from the camera POSITION only. Two cards, cross-faded by the elevation of the camera above
  // the bloom: at grazing angles an upright dab facing the camera position; from above a flat shape
  // lying in the ground plane with a fixed yaw (world-anchored).
  vec3 toCam = uCamPos - c;
  vec3 tc = toCam / dist;
  float el = tc.y;
  float wFlat = smoothstep(${FLAT_EL.toFixed(2)}, 0.68, el), wUp = 1.0 - smoothstep(0.70, 0.86, el);
  vec3 w;
  vFar = vec2(far, smoothstep(7.0, 22.0, dist));
  if (position.z > 0.5){
    if (wFlat <= 0.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    float yaw = rnd * 6.283;
    vec3 n = normalize(vec3(-iSlope.x, 1.0, -iSlope.y));
    vec3 F = vec3(cos(yaw), 0.0, sin(yaw));
    vec3 T1 = normalize(F - n * dot(F, n)), T2 = cross(n, T1);
    // (the ground plane is foreshortened by sin(elevation): keep the minimum size on screen)
    float lo = px * lo0 / max(el, 0.4);
    float sf = clamp(iData.x, lo, max(lo, px * 16.0)) * shr;
    float rf = sf * mix(0.6, 1.0, wFlat);
    // (the card is a little larger than the bloom from ~8 m out: room for its feathered rim, see the fragment shader)
    vCut = 1.0 + max(0.12, 2.6 * px / (rf * max(el, 0.4))) * smoothstep(4.5, 8.5, dist);
    vec2 qf = position.xy * vCut;
    w = c + (T1 * qf.x * mix(1.0, 1.35, far) + T2 * qf.y) * rf;
    vPx = sf / px * (1.0 - far); vFlat = 1.0; vA = smoothstep(0.0, 0.4, wFlat);
    vP0 = qf;
  } else {
    if (wUp <= 0.0){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    aspect = mix(aspect, 1.6, smoothstep(0.10, 0.34, abs(el)) * far);
    vec2 sc = vec2(hy * aspect, hy * mix(1.0 + 0.9 * spike, 1.0, far)) * mix(0.65, 1.0, wUp);
    float hl = length(toCam.xz);
    vec3 Rv = hl > 1e-4 ? vec3(toCam.z, 0.0, -toCam.x) / hl : vec3(1.0, 0.0, 0.0);
    vec3 Vv = cross(tc, Rv);
    // The bloom STANDS: the card reaches down to the root, and below the bloom the fragment shader draws its
    // stem and a leaf or two (the green between the blooms of a drift). The stem is as long on the card as
    // it is seen from here (foreshortened from above) and dissolves with distance, the card shrinking back
    // to the bloom with it.
    float stemK = (1.0 - smoothstep(${STEM_FADE}, dist + (fract(rnd * 17.3) - 0.5) * 3.0)) * smoothstep(0.0, 0.5, wUp);
    float L = iData.w * sqrt(max(1.0 - el * el, 0.0)) / sc.y;
    // (the card is larger than the bloom by the 2.6 pixels of its feathered rim, see the fragment shader)
    vCut = 1.0 + max(0.12, 2.6 * px / min(sc.x, sc.y)) * smoothstep(4.5, 8.5, dist);
    vec2 q = position.xy * vCut;
    if (stemK > 0.0){
      // the card is sheared so that its foot is at the root: in the card's own coordinates the stem stays
      // upright (x = 0) and the fragment shader takes the shear out of the bloom again
      vKx = clamp(-dot(vec3(lean.x, 0.0, lean.y), Rv) / sc.x / max(L, 0.6), -1.2, 1.2);
      // (wide at the foot only, where the blades are: the card is a trapezoid)
      // (a little over half of the blooms carry blades at the foot; the rest stand on a bare stem, and their
      // card narrows to it)
      q.x *= (position.y < 0.0 ? (fract(rnd * 13.9) < 0.55 ? 1.0 + 0.5 * min(stemK * 4.0, 1.0) : 0.72) : 1.0) + abs(vKx);
      if (q.y < 0.0) q.y = min(q.y, -L);
      vStem = vec3(L, max(0.0045, 0.8 * px) / sc.x, stemK);
      vStemA = min(1.0, 0.0045 / (0.8 * px));
    }
    w = c + Rv * (q.x - vKx * q.y) * sc.x + Vv * q.y * sc.y;
    vPx = s / px * (1.0 - far); vFlat = 0.0; vA = smoothstep(0.0, 0.5, wUp);
    vP0 = q;
  }
  vCol = col; vRand = rnd;
  vLit = iLit;
  vFade = f;
  vGround = groundAt(iPos.xz, driftAt(grassWash(iPos), iPos), vLit); vBody = inBody + 0.5 * smoothstep(4.5, 8.5, dist);
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const FLOWER_FS = /* glsl */`
// (how much of the rim is also painted toward the ground colour: with the coverage alone the four steps of
// alpha-to-coverage show)
#define FEATHER_C 1.0
in vec2 vP0; in float vDepth;
flat in float vCol; flat in float vRand; flat in float vLit; flat in float vPx; flat in float vFade; flat in vec2 vFar; flat in vec3 vGround; flat in float vFlat; flat in float vA; flat in float vBody; flat in float vKx; flat in float vCut;
flat in vec3 vStem; flat in float vStemA;
uniform vec3 uCols[5];
${FLOWER_HUE_GLSL}
void main(){
  int ci = int(vCol + 0.5);
  vec3 c = uCols[ci];
  // (the bloom in its own upright coordinates; vP0 are those of the sheared card, in which the stem is upright)
  vec2 vP = vec2(vP0.x - vKx * vP0.y, vP0.y);
  float spike = step(1.5, vCol) * step(vCol, 2.5) * (1.0 - vFlat);
  float detail = smoothstep(2.6, 5.0, vPx);
  float r0 = length(vP);
  // flat paper shapes: a few uneven petals and (sometimes) a dot for the centre. No shading.
  float v, core = 0.0, cupLow = 0.0, ph = vRand * 40.0;
  // (beyond the bloom and its rim - the corners of the card, and all of its lower part, where only the stem
  // and the blades are - none of the petal shapes is worked out)
  bool off = r0 > max(vCut, 1.2) + 0.05;
  // (and where there is neither bloom nor stem nor blade - the corners of the card, the margins beside the stem -
  // nothing is worked out at all)
  bool bladed = fract(vRand * 13.9) < 0.55;
  bool stemArea = vStem.z > 0.0 && vP0.y < 0.0 && abs(vP0.x) < (bladed ? 1.6 : 0.72) + vStem.y * 2.5;
  if (off && !stemArea) discard;
  float a = off ? 0.0 : atan(vP.y, vP.x);
  if (off){
    v = 0.92 - r0;
  } else if (detail <= 0.0){
    v = 0.0;
  } else if (spike > 0.5){
    // a flower spike: stacked little dabs, tapering upward
    float y = vP.y * 0.5 + 0.5;
    float wdt = mix(0.62, 0.16, y) * (0.80 + 0.20 * sin(y * 12.0 + vRand * 30.0)) * smoothstep(0.0, 0.12, y);
    float ox = sin(y * 7.0 + vRand * 50.0) * 0.10;
    v = min(wdt - abs(vP.x - ox), 0.97 - abs(vP.y));
  } else if (vFlat < 0.5 && fract(vRand * 5.31) < 0.42){
    // seen from the side, a cup: a deep bowl with three or four petal tips along its top (the poppies and tulips
    // of the flower-field board), leaning a little its own way
    float tl = (fract(vRand * 9.13) - 0.5) * 0.5, ct = cos(tl), st = sin(tl);
    vec2 q = mat2(ct, -st, st, ct) * vP;
    // (a bowl that narrows to its foot, its rim cut into pointed petal tips with deep notches between)
    float yy = clamp((q.y + 0.05) / 0.88, -1.0, 1.0);
    float hw = (0.70 + 0.14 * fract(vRand * 4.1)) * sqrt(max(1.0 - yy * yy, 0.0)) * (0.45 + 0.55 * smoothstep(-0.90, -0.05, q.y));
    float top = 0.10 + 0.62 * pow(abs(cos((q.x + fract(vRand * 6.7)) * (3.4 + 1.4 * fract(vRand * 2.9)))), 2.5);
    v = min(min(hw - abs(q.x), top - q.y), q.y + 0.86);
    // (and the cup is deeper toward its foot: one flat step, along a wavering line)
    cupLow = step(q.y, -0.30 + 0.10 * sin(q.x * 5.0 + ph));
  } else {
    float sh = fract(vRand * 7.77) * 4.0;
    // every bloom is turned and squashed its own way (seen at its own angle)
    float ca = cos(ph), sa = sin(ph);
    vec2 p = mat2(ca, -sa, sa, ca) * vP;
    p.y *= 1.0 + 0.45 * fract(vRand * 5.9);
    p = mat2(ca, sa, -sa, ca) * p;
    float r = length(p), an = atan(p.y, p.x);
    float uneven = (0.86 + 0.14 * sin(an * 2.0 + ph * 0.7)) * (0.93 + 0.07 * sin(an * 3.0 + ph * 1.9));
    if (sh < 1.3){
      // five rounded petals
      float amp = 0.13 + 0.12 * fract(vRand * 7.3);
      v = ((1.0 - amp) + amp * cos(an * 5.0 + ph)) * uneven - r;
      core = step(r0, 0.20) * step(fract(vRand * 3.7), 0.5);
    } else if (sh < 2.2){
      // four broad petals, deeply notched
      float amp = 0.22 + 0.10 * fract(vRand * 7.3);
      v = ((1.0 - amp) + amp * cos(an * 4.0 + ph)) * uneven - r;
    } else if (sh < 3.2){
      // a little head of three or four small blooms
      v = -1.0;
      for (int i = 0; i < 4; i++){
        float fa = vRand * 31.0 + float(i) * 1.7;
        vec2 o = vec2(cos(fa), sin(fa) * 0.8) * (i == 3 ? 0.08 : 0.50);
        v = max(v, (0.36 + 0.12 * fract(vRand * (3.1 + float(i)))) - length(vP - o));
      }
    } else {
      // daisy: six to eight thin petals of unequal length and a centre
      float n = 6.0 + floor(fract(vRand * 11.3) * 3.0);
      v = (0.60 + 0.34 * cos(an * n + ph)) * (0.80 + 0.20 * sin(an * 2.0 + ph * 0.7) + 0.10 * sin(an * 3.0 + ph * 1.9)) - r;
      core = step(r0, 0.24);
    }
  }
  // far away (and when tiny) every flower is a plain soft-cornered dab; as a dash, a lozenge with a ragged long edge
  // (the far dab is lobed and lopsided, each its own way: a brush touch, not an ellipse cut from a rectangle)
  float plain = 0.92 - mix(r0, r0 * (1.0 + 0.20 * sin(a * 2.0 + ph) + 0.13 * sin(a * 3.0 + ph * 1.7)) + 0.06, vFar.x);
  v = mix(plain, v, detail);
  // (a plain dab, and every bloom from about 8 m out, has a soft edge two pixels wide: a brush mark, and
  // nothing for a creeping camera to catch on)
  float inBody = step(0.75, vBody), soft = max(1.0 - detail, (vBody - inBody) * 2.0);
  float fade = (1.0 - smoothstep(0.84, 0.97, vFade)) * vA;
  // From about 8 m out a bloom has a FEATHERED rim: outside its edge the paint runs out into the colour of the
  // ground under it over a pixel and a half (the card itself ends on that colour). A hard edge of saturated
  // colour a few pixels across is what a creeping camera catches on; on the lawn the feather has no edge at all.
  // (and a bloom under ~5 px across always has at least a pixel of it)
  float vn = v / max(fwidth(v), 1e-4), rim = max(max(mix(1.9, 1.2, vFar.x) * soft, 1.0 - smoothstep(2.5, 3.5, vPx)), 1.3) * (1.0 - vFade * vFade);
  // (the feather is COVERAGE, running out over the rim: where blooms stand thick the rim of one lies over its
  // neighbour, and a rim painted in the ground colour was a hard green outline round every bloom of a band)
  float feather = clamp((vn + rim + 0.5) / (rim + 1.0), 0.0, 1.0);
  float cov = off ? 0.0 : feather * fade;
  // Under the bloom: its stem and two or three blades rising from the root and bending outward - a little
  // green tuft with a bloom on it, which is the green that stands between the blooms of a drift.
  // (all in the units of the card: x across, y up, the bloom centre at 0, the root at -L)
  float sCov = 0.0, sTone = 0.0;
  if (stemArea){
    vec2 vP = vP0;
    float L = max(vStem.x, 1e-3), hgt = vP.y + L, u = clamp(-vP.y / L, 0.0, 1.0);
    float wx = max(fwidth(vP.x), 1e-4);
    float bow = (fract(vRand * 9.7) - 0.5) * min(0.9, L * 0.3);
    float sv = vStem.y - abs(vP.x - bow * u * (1.0 - u) * 2.6);
    float we = wx * (1.0 + soft);
    sCov = clamp(sv / we + 0.5, 0.0, 1.0) * step(0.0, hgt) * vStemA;
    // (the blades reach no higher than two thirds of the stem)
    if (bladed && hgt < L * 0.66) for (int i = 0; i < 3; i++){
      // (the blades keep low, about the foot: with those of its neighbours they are the leaves of the cluster)
      float fi = float(i), hb = L * (0.30 + 0.34 * fract(vRand * (3.1 + fi * 1.7)));
      float sd = i == 0 ? -1.0 : i == 1 ? 1.0 : (fract(vRand * 4.3) - 0.5) * 1.4;
      float t = hgt / hb;
      // (from ~8 m out the blades close up into ONE small green dab under the bloom, in one tone: three
      // hairlines per flower are a mesh of thin edges that a creeping camera catches on)
      float xc = sd * (0.30 + 0.70 * fract(vRand * (5.3 + fi))) * min(1.25, hb * 0.55) * t * t * (1.0 - 0.6 * soft);
      float bw = max(0.21 + 0.10 * fract(vRand * (8.9 + fi)), vStem.y * 1.5) * (1.0 + 1.3 * soft) * pow(clamp(1.0 - t, 0.0, 1.0), 0.7);
      float lc = clamp((bw - abs(vP.x - xc)) / we + 0.5, 0.0, 1.0) * step(0.0, t) * step(t, 1.0);
      if (lc > sCov){ sCov = lc; sTone = mix(i == 0 ? 0.0 : i == 1 ? 1.0 : 0.55, 0.5, soft); }
    }
    sCov *= min(vStem.z * 2.5, 1.0) * fade;
  }
  if (max(cov, sCov) <= 0.02) discard;
  if (sCov > cov){
    // stem and leaf greens (the blade greens of the tufts they stand among); in shade the cool shadow green
    // (the foliage greens of the cluster's leaves and of the dab under it: a stem is lost against them)
    vec3 sc = mix(vec3(0.360, 0.600, 0.340), vec3(0.500, 0.725, 0.385), sTone * (0.6 + 0.4 * fract(vRand * 12.1)));
    sc = mix(vec3(0.290, 0.490, 0.420), sc, vLit);
    sc = mix(vGround, sc, min(1.0, vStem.z * 1.6));
    oColor = vec4(sc, sCov);
    writeAux(vec3(0., 1., 0.), 0.0, vDepth, 0.011, 0.0, 0.0);
    return;
  }
  vec3 coreCol = ci == 1 ? vec3(0.90, 0.60, 0.22) : ci == 4 ? vec3(0.72, 0.36, 0.20) : ci == 0 ? vec3(0.98, 0.82, 0.34) : ci == 3 ? vec3(0.56, 0.20, 0.36) : vec3(1.0, 0.95, 0.80);
  // three tones per colour, one per bloom (a lighter tint, the colour, a deeper one): on the painted body
  // of its own drift a bloom is a dab a step away from the paint under it, never the same flat colour
  // (the same three tones per family as the dabs painted on the ground further out: famHue() of src/terrain.js)
  float tv = fract(vRand * 23.7);
  c = ci == 2 ? (tv < 0.30 ? mix(c, vec3(1.0, 0.985, 0.94), 0.45) : tv > 0.70 ? mix(c * c, c, 0.35) : c) : famHue(vCol, tv);
  c = mix(c, coreCol, core * detail * (1.0 - spike));
  c = mix(c, c * mix(vec3(0.84, 0.80, 0.86), vec3(0.93), step(0.9, c.b)), cupLow * detail);
  // a dash keeps ~70% of the saturation of the dab
  c = mix(c, mix(vec3(dot(c, vec3(0.30, 0.59, 0.11))), c, 0.88), vFar.x);
  // paler with distance, toward the meadow under it (as the dabs painted on the ground are)
  c = mix(c, vGround, 0.26 * vFar.y * vLit);
  // in shade: the same colour, cooler and a step down (never mixed toward the dark ground: no mud)
  // (the hue is kept - multiplied by a tint that leans to violet, not to green: yellow goes amber, never khaki)
  c = mix(c * vec3(0.76, 0.69, 0.82), c, vLit);
  c = mix(vGround, c, mix(1.0, feather, FEATHER_C));
  oColor = vec4(c, cov);
  writeAux(vec3(0., 1., 0.), 0.0, vDepth, 0.011, 0.0, 0.0);
}
`;

// dry-brush strokes of the middle distance: 1-3 m long in the world, 2-3 px tall on screen,
// level in the picture, a touch lighter or darker than the ground they lie on
const STROKE_VS = /* glsl */`
in vec3 position;
in vec3 iPos; in vec4 iData; in float iLit; in vec2 iSlope; in vec2 iLean;     // length (m), random, tone (+1 lighter / -1 darker), unused
${VS_GROUND}
out vec2 vP; out float vDepth;
flat out vec3 vC; flat out float vRand; flat out float vAlpha; flat out float vLen;
void main(){
  float rnd = iData.y;
  float dist = distance(iPos, uCamPos);
  float dd = dist + (rnd - 0.5) * 6.0;
  float f = max(1.0 - smoothstep(6.5, 10.5, dd), smoothstep(34.0, 47.0, dd));
  if (f > 0.995){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float px = dist * uPixelK;
  float hh = px * (1.0 + 0.5 * fract(rnd * 13.7));
  // axes from the camera position only; from above the ground is not foreshortened and the wash is
  // left calm: the strokes go
  vec3 toCam = uCamPos - iPos;
  vec3 tc = toCam / dist;
  float hl = length(toCam.xz);
  vec3 Rv = hl > 1e-4 ? vec3(toCam.z, 0.0, -toCam.x) / hl : vec3(1.0, 0.0, 0.0);
  float above = smoothstep(0.26, 0.50, tc.y);
  if (above > 0.995){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec3 w = iPos + vec3(0.0, 0.04, 0.0) + Rv * position.x * iData.x * 0.5 + cross(tc, Rv) * position.y * hh;
  vec3 g = grassWash(iPos);
  vec3 ground = groundAt(iPos.xz, g, iLit);
  vec3 lighter = mix(ground * vec3(1.045, 1.035, 1.10), ground * vec3(1.30, 1.22, 1.12), 1.0 - iLit);
  vec3 darker = mix(ground * vec3(0.925, 0.965, 0.90), ground * vec3(0.84, 0.86, 0.90), 1.0 - iLit);
  vC = mix(iData.z > 0.0 ? lighter : darker, ground, smoothstep(0.0, 0.8, f));
  vAlpha = (1.0 - smoothstep(0.5, 1.0, f)) * (1.0 - above);
  vP = position.xy; vRand = rnd; vLen = iData.x;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
const STROKE_FS = /* glsl */`
in vec2 vP; in float vDepth;
flat in vec3 vC; flat in float vRand; flat in float vAlpha; flat in float vLen;
void main(){
  // bristle noise along the stroke: ragged, tapering ends and a few breaks
  float n = texture(uBrush, vec2(vP.x * vLen * 0.11 + vRand * 9.0, vRand * 5.0)).b;
  float n2 = texture(uBrush, vec2(vP.x * vLen * 0.035 + vRand * 3.0, vRand * 7.0 + 0.5)).a;
  float body = 1.0 - abs(vP.x) - 0.30 * n - 0.10;
  float prof = min(body * 2.2, 0.5 + (n2 - 0.42) * 3.0);
  float v = min(prof, 1.0) - abs(vP.y);
  float cov = clamp(v / max(fwidth(v), 1e-4) + 0.5, 0.0, 1.0) * vAlpha;
  if (cov <= 0.02) discard;
  oColor = vec4(vC, cov);
  writeAux(vec3(0., 1., 0.), 0.0, vDepth, 0.011, 0.0, 0.0);
}
`;

// ---------------------------------------------------------------- instances in a spatial grid
const STRIDE = 12;                             // x y z | d0 d1 d2 d3 | lit | dh/dx dh/dz | lean x z
const CS = 6, GX0 = -84, GZ0 = -80, GN = 28;
const _frustum = new THREE.Frustum(), _m4 = new THREE.Matrix4();
const _pl = new Float64Array(24);              // the six frustum planes (normal, constant), refreshed once per frame
class InstField {
  constructor(layers) { this.layers = layers.map((l) => ({ ...l, rec: [] })); }
  add(layer, x, y, z, a, b, c, d, lx = 0, lz = 0) {
    const h0 = height(x, z), e = 0.3;
    this.layers[layer].rec.push(x, y, z, a, b, c, d, 1, (height(x + e, z) - h0) / e, (height(x, z + e) - h0) / e, lx, lz);
  }
  get count() { return this.layers.reduce((s, l) => s + l.rec.length / STRIDE, 0); }
  // quad: 4 corner positions per card (z = 0 the upright card, z = 1 the card lying on the ground); pad: how far a
  // card can reach from its root (m); flatEl: the elevation of the eye above an instance (sine) from which its
  // lying card exists (see the vertex shader), 0 = the field has one card only
  build(quad, material, pad, flatEl = 0) {
    const total = this.count;
    const src = new Float32Array(total * STRIDE);
    const cells = [];
    let o = 0;
    for (const L of this.layers) {
      const n = L.rec.length / STRIDE, key = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        const cx = Math.min(GN - 1, Math.max(0, Math.floor((L.rec[i * STRIDE] - GX0) / CS)));
        const cz = Math.min(GN - 1, Math.max(0, Math.floor((L.rec[i * STRIDE + 2] - GZ0) / CS)));
        key[i] = cz * GN + cx;
      }
      const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => key[p] - key[q]);
      let cur = null;
      for (const i of order) {
        if (!cur || cur.key !== key[i]) {
          cur = { key: key[i], start: o / STRIDE, count: 0, range2: L.range * L.range, lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9] };
          cells.push(cur);
        }
        for (let k = 0; k < STRIDE; k++) src[o + k] = L.rec[i * STRIDE + k];
        for (let k = 0; k < 3; k++) { cur.lo[k] = Math.min(cur.lo[k], src[o + k]); cur.hi[k] = Math.max(cur.hi[k], src[o + k]); }
        cur.count++; o += STRIDE;
      }
      L.rec = null;
    }
    for (const c of cells) {
      c.c = new THREE.Vector3((c.lo[0] + c.hi[0]) / 2, (c.lo[1] + c.hi[1]) / 2, (c.lo[2] + c.hi[2]) / 2);
      c.r = Math.hypot(c.hi[0] - c.lo[0], c.hi[1] - c.lo[1], c.hi[2] - c.lo[2]) / 2 + pad;
    }
    this.src = src; this.cells = cells; this.total = total; this.flatEl = flatEl;
    // TWO draws of the same instances: the cells in which an instance may need its lying card (the eye is high
    // enough above them) are drawn with both cards, all the others - at eye level nearly all - with the upright
    // card alone, which halves their vertices. (A cell changes group only where its lying cards are still culled
    // by the vertex shader, so the picture is the same.)
    const nq = quad.length / 12;
    const mk = (cards) => {
      const dst = new Float32Array(Math.max(1, total) * STRIDE);
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(quad, 3));
      const idx = [];
      for (let k = 0; k < cards; k++) idx.push(4 * k, 4 * k + 1, 4 * k + 2, 4 * k, 4 * k + 2, 4 * k + 3);
      g.setIndex(idx);
      const ib = new THREE.InstancedInterleavedBuffer(dst, STRIDE, 1);
      ib.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('iPos', new THREE.InterleavedBufferAttribute(ib, 3, 0));
      g.setAttribute('iData', new THREE.InterleavedBufferAttribute(ib, 4, 3));
      g.setAttribute('iLit', new THREE.InterleavedBufferAttribute(ib, 1, 7));
      g.setAttribute('iSlope', new THREE.InterleavedBufferAttribute(ib, 2, 8));
      g.setAttribute('iLean', new THREE.InterleavedBufferAttribute(ib, 2, 10));
      g.instanceCount = 0;
      const mesh = new THREE.Mesh(g, material);
      mesh.frustumCulled = false;
      mesh.userData.grassPart = true;
      return { dst, ib, geo: g, mesh, n: 0 };
    };
    this.parts = nq > 1 ? [mk(nq), mk(1)] : [mk(1)];
    this.geo = this.parts[0].geo; this.mesh = this.parts[0].mesh;
    this.meshes = this.parts.map((q) => q.mesh);
    this.vis = []; this.sig = new Int32Array(cells.length + 1); this.sigN = -1;
    this.drawn = 0; this.drawnFlat = 0;
    return this.meshes;
  }
  // choose the cells in range and in view, nearest first; refill the buffers if the set changed
  update(camera) {
    if (!this.mesh.visible || !this.total) { if (this.sigN < 0) this.sigN = 0; return; }
    const p = camera.position, cells = this.cells, vis = this.vis, two = this.parts.length > 1, fe = this.flatEl - 0.06;
    const px = p.x, py = p.y, pz = p.z;
    vis.length = 0;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i], lo = c.lo, hi = c.hi;
      const dx = Math.max(lo[0] - px, 0, px - hi[0]), dy = Math.max(lo[1] - py, 0, py - hi[1]), dz = Math.max(lo[2] - pz, 0, pz - hi[2]);
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > c.range2) continue;
      const cc = c.c, r = c.r;
      let out = false;
      for (let k = 0; k < 24; k += 4) if (_pl[k] * cc.x + _pl[k + 1] * cc.y + _pl[k + 2] * cc.z + _pl[k + 3] < -r) { out = true; break; }
      if (out) continue;
      c.d2 = d2 + ((cc.x - px) * (cc.x - px) + (cc.y - py) * (cc.y - py) + (cc.z - pz) * (cc.z - pz)) * 1e-3; c.i = i;
      // (may an instance of this cell be seen from steeply enough above for its lying card? the highest the eye
      // can stand over any of them, against the nearest any of them can be - less a margin for where a bloom
      // stands off its root)
      c.g = two && py - lo[1] <= fe * Math.max(Math.sqrt(d2) - 0.4, 0) ? 1 : 0;
      vis.push(c);
    }
    vis.sort((a, b) => a.d2 - b.d2);
    let same = vis.length === this.sigN;
    for (let i = 0; i < vis.length; i++) { const k = vis[i].i * 2 + vis[i].g; if (this.sig[i] !== k) { same = false; this.sig[i] = k; } }
    this.sigN = vis.length;
    if (same) return;
    for (const q of this.parts) q.n = 0;
    for (const c of vis) {
      const q = this.parts[c.g];
      q.dst.set(this.src.subarray(c.start * STRIDE, (c.start + c.count) * STRIDE), q.n * STRIDE);
      q.n += c.count;
    }
    this.drawn = 0;
    for (const q of this.parts) {
      q.geo.instanceCount = q.n; this.drawn += q.n;
      if (q.n) { q.ib.clearUpdateRanges(); q.ib.addUpdateRange(0, q.n * STRIDE); q.ib.needsUpdate = true; }
    }
    this.drawnFlat = two ? this.parts[0].n : 0;
  }
  invalidate() { this.sigN = -1; }
}

export default function (scene) {
  const R = rng(99);
  const gauss = () => (R() + R() + R() - 1.5) * 0.82;
  const normal = () => Math.sqrt(-2 * Math.log(1 - R() * 0.9999)) * Math.cos(6.2831853 * R());
  const pick = (a) => a[Math.floor(R() * a.length)];
  const tufts = new InstField(TUFT_LAYERS), flowers = new InstField(FLOWER_LAYERS), strokes = new InstField([{ range: 56 }]);
  const layerOf = Object.fromEntries(TUFT_LAYERS.map((l, i) => [l.cat, i]));

  // ---------------------------------------------------------------- what stands where
  // Everything that stands on the turf is declared in the layout (src/layout.js) by the module that builds
  // it. SOLIDS: the footprints this meadow was first composed around, in the order of the one random
  // sequence its scatter is drawn from.
  const SOLIDS = composed();
  // (what blocks at the moment: the composed footprints while their scatter is drawn, everything once it is done)
  let solids = SOLIDS;
  const solidDist = (x, z) => {
    let b = 1e9;
    for (const s of solids) {
      if (x < s.bb[0] - 1 || x > s.bb[1] + 1 || z < s.bb[2] - 1 || z > s.bb[3] + 1) continue;
      const d = s.d(x, z);
      if (d < b && (!s.solid || d > 0.03 || s.solid(x, z))) b = d;
    }
    return b;
  };
  // on the floor of the building, clear of its walls
  const NAVE = floorRect(-0.43, -0.5, 0.6);
  const inNave = (x, z) => inRect(NAVE, x, z);
  // stones lying about (src/ruin.js keeps the list; it may be missing, empty or longer one day):
  // nothing roots under a stone. Hashed into 2 m cells.
  const rockGrid = new Map(), ROCK_REACH = 0.72;
  const rockIn = (r) => {
    if (!r || !Number.isFinite(+r[0]) || !Number.isFinite(+r[1])) return;
    const rx = +r[0], rz = +r[1], rad = Math.min(3, Math.max(0.08, Number.isFinite(+r[2]) ? +r[2] : 0.25) * 1.3 + 0.05);
    const top = Number.isFinite(+r[3]) ? +r[3] : height(rx, rz) + rad;
    const reach = rad + ROCK_REACH;
    for (let cx = Math.floor((rx - reach) / 2); cx <= Math.floor((rx + reach) / 2); cx++) for (let cz = Math.floor((rz - reach) / 2); cz <= Math.floor((rz + reach) / 2); cz++) {
      const k = cx * 4096 + cz;
      if (!rockGrid.has(k)) rockGrid.set(k, []);
      rockGrid.get(k).push([rx, rz, rad, top]);
    }
  };
  // (r[4]: a stone added since the meadow was composed - see lyingStone() in src/layout.js; it comes in below)
  for (const r of LAYOUT.lying) if (!r?.[4]) rockIn(r);
  // A card is flat and turns to face the eye: a tuft rooted right beside a stone swings its blades across
  // the stone's faces from one side or the other, and from above it lies over the top. So everything keeps
  // clear of a stone by the half width of its own card (tufts: ~0.5 x their size; the lying clump the same)
  // and a little more, and what stands TALLER than the stone - whose blades would show against its top
  // face - by more again. tall = height of the card above the ground (m).
  const onRock = (x, z, tall = 0) => {
    const l = rockGrid.get(Math.floor(x / 2) * 4096 + Math.floor(z / 2));
    if (!l) return false;
    for (const r of l) {
      const d = Math.hypot(x - r[0], z - r[1]);
      if (d >= r[2] + ROCK_REACH) continue;
      const over = tall - (r[3] - height(x, z));                     // how far the card stands above the top of the stone
      const margin = tall > 0 ? Math.min(ROCK_REACH, 0.04 + tall * (over > 0.02 ? 0.62 : 0.42) + Math.max(0, Math.min(over, 0.3)) * 0.4) : 0;
      if (d < r[2] + margin) return true;
    }
    return false;
  };
  const blocked = (x, z, tall = 0) => onSlab(x, z) || solidDist(x, z) < 0.03 || onRock(x, z, tall);

  // ground map: R = dark turf at the foot of things, G = masses of the foreground band (read by the terrain shader)
  const MN_ = GMAP.N;
  const accR = new Float32Array(MN_ * MN_), accG = new Float32Array(MN_ * MN_), accB = new Float32Array(MN_ * MN_);
  const splatInto = (acc, x, z, rad, wgt) => {
    const u = ((x - GMAP.x0) / GMAP.w) * MN_, v = ((z - GMAP.z0) / GMAP.h) * MN_, rp = Math.max(1.2, (rad / GMAP.w) * MN_);
    const x0 = Math.max(1, Math.floor(u - rp)), x1 = Math.min(MN_ - 2, Math.ceil(u + rp)), y0 = Math.max(1, Math.floor(v - rp)), y1 = Math.min(MN_ - 2, Math.ceil(v + rp));
    for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) {
      const d = Math.hypot(xx + 0.5 - u, y + 0.5 - v) / rp;
      if (d < 1) acc[y * MN_ + xx] += wgt * (1 - d * d) * (1 - d * d);
    }
  };
  const splat = (x, z, rad, wgt) => splatInto(accR, x, z, rad, wgt);
  const driftB = (x, z) => { const u = Math.floor(((x - GMAP.x0) / GMAP.w) * MN_), v = Math.floor(((z - GMAP.z0) / GMAP.h) * MN_); return u < 0 || v < 0 || u >= MN_ || v >= MN_ ? 0 : accB[v * MN_ + u]; };
  // (the same, but the marks do not add up where they overlap: the highest one stands)
  const splatMax = (acc, x, z, rad, wgt) => {
    const u = ((x - GMAP.x0) / GMAP.w) * MN_, v = ((z - GMAP.z0) / GMAP.h) * MN_, rp = Math.max(1.2, (rad / GMAP.w) * MN_);
    const x0 = Math.max(1, Math.floor(u - rp)), x1 = Math.min(MN_ - 2, Math.ceil(u + rp)), y0 = Math.max(1, Math.floor(v - rp)), y1 = Math.min(MN_ - 2, Math.ceil(v + rp));
    for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) {
      const d = Math.hypot(xx + 0.5 - u, y + 0.5 - v) / rp;
      if (d < 1) acc[y * MN_ + xx] = Math.max(acc[y * MN_ + xx], wgt * (1 - d * d) * (1 - d * d));
    }
  };

  // size classes of the atlas: small tufts are a few fat dabs, tall ones have more, thinner blades
  const kindFor = (size, species = R()) => (size < 0.21 ? (species < 0.55 ? 0 : 1)
    : size < 0.40 ? (species < 0.42 ? 2 : species < 0.72 ? 3 : 4)
      : (species < 0.7 ? 6 : 8));
  const tuft = (x, z, kind, size, cat, RR = R) => {
    if (blocked(x, z)) return false;
    const cell = CELLS[kind][Math.floor(RR() * CELLS[kind].length)], rnd = RR();
    // (too close to a stone for a card of this size: left out, but counted as placed - the random
    // sequence and the dark turf at the foot of the stone stay as they were)
    if (!onRock(x, z, size)) tufts.add(layerOf[cat], x, height(x, z) - 0.02 * size, z, size, cell, rnd, cat);
    return true;
  };

  // ---------------------------------------------------------------- (b) grass masses
  // The meadow is planned in three values: the light wash, drifts of a mid green (massRaw() in
  // src/terrain.js, thresholded here so that ~36% of the hilltop is mass and the rest is left
  // quiet) and dark accents in their cores. The field is baked into the ground map (G) for the
  // terrain shader, and the tufts stand only inside it: dense and tall in the core, small at the
  // rim, where their blades break the edge of the patch. Sizes are log-normal, x0.5-2.2.
  let MT;
  {
    const sm = [];
    for (let i = 0; i < 30000; i++) { const a = R() * 6.2832, r = Math.sqrt(R()) * 62; sm.push(massRaw(Math.cos(a) * r, Math.sin(a) * r)); }
    sm.sort((a, b) => a - b);
    MT = sm[Math.floor(sm.length * 0.68)];
  }
  const mass01 = (x, z, extra = 0) => {
    const r = Math.hypot(x, z - 3);
    if (r > 72) return 0;
    // (nothing in the nave, and the masses die away toward the rim of the walkable hilltop)
    const dn = Math.max(Math.abs(x) - 5.0, Math.abs(z + 0.6) - 8.6);
    return Math.min(1, Math.max(0, 0.5 + (massRaw(x, z) + extra - MT) * 2.0 - smooth(58, 72, r) - (1 - smooth(0, 1.5, dn))));
  };
  const tuftGather = (x, z, dens) => smooth(0.50, 0.66, vnoise(x / 1.7 + 5.3, z / 1.7 + 50.9) + 0.10 * dens);
  const inBox2 = (x, z) => x > MASS2_BOX[0] && x < MASS2_BOX[1] && z > MASS2_BOX[2] && z < MASS2_BOX[3];
  for (let j = 0; j < MN_; j++) {
    const z = GMAP.z0 + ((j + 0.5) / MN_) * GMAP.h;
    for (let i = 0; i < MN_; i++) {
      const x = GMAP.x0 + ((i + 0.5) / MN_) * GMAP.w;
      accG[j * MN_ + i] = mass01(x, z, inBox2(x, z) ? massExtra(x, z) : 0);
    }
  }
  let nBand = 0, nBig = 0;
  for (let i = 0; i < 400000; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 70;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr + 3;
    const g = mass01(x, z);
    if (g < 0.485) continue;
    const dens = smooth(0.485, 0.74, g);
    // (the tufts GATHER: a few clusters a metre or two across toward the core of a mass, the rest of it left as
    // calm paint with a stray blade here and there - never an even stipple)
    if (R() > 0.035 + 0.965 * dens * tuftGather(x, z, dens)) continue;
    if (pathEdge(x, z).edge < 0.22) continue;
    const size = Math.min(0.46, Math.max(0.105, 0.21 * Math.exp(normal() * 0.45) * (0.82 + 0.32 * dens)));
    // neighbours share a species (with strays), so one mass differs from the next
    const sp = R() < 0.3 ? R() : Math.min(0.999, Math.max(0, (vnoise(x / 4.5 + 70, z / 4.5 + 30) - 0.5) * 2.2 + 0.5));
    const cat = size >= 0.22 && R() < 0.38 ? 6 : 4;       // the taller ones stay on into the middle distance
    if (tuft(x, z, kindFor(size, sp), size, cat)) { nBand++; if (cat === 6) nBig++; }
  }

  // the extra planned masses (massExtra): the same rule, in a pass and with a random sequence of their own,
  // only where the extra field is what makes the mass
  {
    const R2 = rng(2718), n2 = () => Math.sqrt(-2 * Math.log(1 - R2() * 0.9999)) * Math.cos(6.2831853 * R2());
    const area = (MASS2_BOX[1] - MASS2_BOX[0]) * (MASS2_BOX[3] - MASS2_BOX[2]);
    for (let i = 0, n = Math.round(400000 * area / (Math.PI * 70 * 70)); i < n; i++) {
      const x = MASS2_BOX[0] + R2() * (MASS2_BOX[1] - MASS2_BOX[0]), z = MASS2_BOX[2] + R2() * (MASS2_BOX[3] - MASS2_BOX[2]);
      const g = mass01(x, z, massExtra(x, z)), g0 = mass01(x, z);
      if (g < 0.485) continue;
      const dens = smooth(0.485, 0.74, g), dens0 = g0 < 0.485 ? 0 : 0.28 + 0.72 * smooth(0.485, 0.74, g0);
      // (the first pass already stood its share here: only the difference is added)
      if (R2() > 0.035 + 0.965 * dens * tuftGather(x, z, dens) - dens0 * 0.2) continue;
      if (pathEdge(x, z).edge < 0.22) continue;
      const size = Math.min(0.46, Math.max(0.105, 0.21 * Math.exp(n2() * 0.45) * (0.82 + 0.32 * dens)));
      const sp = R2() < 0.3 ? R2() : Math.min(0.999, Math.max(0, (vnoise(x / 4.5 + 70, z / 4.5 + 30) - 0.5) * 2.2 + 0.5));
      const cat = size >= 0.22 && R2() < 0.38 ? 6 : 4;
      if (tuft(x, z, kindFor(size, sp), size, cat, R2)) { nBand++; if (cat === 6) nBig++; }
    }
  }

  // ---------------------------------------------------------------- (a) fringes
  // path sides and the strip between the ruts
  for (let i = 0; i < 60000; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 34;
    const x = 6 + Math.cos(a) * rr * 0.42, z = 32 + Math.sin(a) * rr;
    const pe = pathEdge(x, z);
    if (pe.d > 3) continue;
    if (pe.strip > 0.02) {
      if (R() < 0.75) tuft(x, z, R() < 0.6 ? 0 : 1, 0.20 + R() * 0.14, 1);
      continue;
    }
    const e = pe.edge;
    if (e < -0.10 || e > 0.6) continue;
    if (R() > Math.exp(-((e - 0.06) * (e - 0.06)) / 0.03)) continue;
    const k = R();
    if (k < 0.62) tuft(x, z, 1, 0.20 + R() * 0.13, 1);
    else if (k < 0.92) tuft(x, z, 0, 0.18 + R() * 0.14, 1);
    else { const s = 0.34 + R() * 0.24; tuft(x, z, kindFor(s), s, 1); }
  }
  // loose stragglers out on the dirt
  for (let i = 0; i < 2500; i++) {
    const x = -6 + R() * 26, z = 6 + R() * 54;
    const pe = pathEdge(x, z);
    if (pe.edge > -0.12 || pe.strip > 0 || R() > 0.07 + 0.25 * smooth(-0.5, -0.12, pe.edge)) continue;
    tuft(x, z, 0, 0.16 + R() * 0.12, 1);
  }
  // runs of tall dark grass beside the path: 1-4 m long with gaps of about 40%, 0.3-2 m out from
  // the edge of the dirt. West side all the way down; the east side only below the brow, so that
  // nothing dark lies across the view of the chapel from the path (views hero / frame).
  for (const side of [1, -1]) {
    let s = side > 0 ? 7 + R() * 2 : 33 + R() * 3;
    while (s < PATH_LEN - 1.5) {
      const len = 1 + R() * R() * 3 + R() * 0.6, off0 = 0.3 + R() * 1.7, drift = (R() - 0.5) * 0.7;
      const n = Math.round(len * (9 + R() * 5));
      for (let j = 0; j < n; j++) {
        const u = R(), t = s + u * len;
        if (t > PATH_LEN - 0.5) continue;
        const [px, pz, dx, dz] = alongPath(t);
        // thicker in the middle of a run, ragged at its ends
        const o = 1.05 + off0 + drift * (u - 0.5) + gauss() * (0.10 + 0.22 * Math.sin(Math.PI * u));
        const x = px - dz * o * side, z = pz + dx * o * side;
        if (pathEdge(x, z).edge < 0.2) continue;
        const size = Math.min(0.85, (0.30 + 0.34 * Math.sin(Math.PI * u)) * Math.exp(normal() * 0.3));
        if (tuft(x, z, kindFor(size), size, 5)) splat(x, z, 0.2 + size * 0.3, 0.45);
      }
      s += len * (1.35 + R() * 0.65);
    }
  }

  // contact fringes: a ring of short dark strokes at the foot of every static object,
  // so that nothing ends on a clean line
  // (RR: the random sequence it is drawn from - the composed one, or a footprint's own)
  // (sc: the tufts at the foot of a slender thing are smaller)
  const contactTuft = (x, z, tall, RR = R, sc = 1) => {
    const k = RR();
    const size = (tall && k > 0.86 ? 0.42 + RR() * 0.3 : k < 0.5 ? 0.34 + RR() * 0.28 : 0.28 + RR() * 0.22) * sc;
    const ok = tuft(x, z, tall && k > 0.86 ? (RR() < 0.7 ? 6 : 8) : kindFor(size, RR()), size, 2, RR);
    if (ok) splat(x, z, 0.30, 0.9);
    return ok;
  };
  const fringe = (s, RR = R, sc = 1) => {
    const want = Math.max(8, Math.round(s.per * 17));
    const m = 0.55;
    let got = 0;
    for (let tries = 0; tries < want * 60 && got < want; tries++) {
      const x = s.bb[0] - m + RR() * (s.bb[1] - s.bb[0] + 2 * m), z = s.bb[2] - m + RR() * (s.bb[3] - s.bb[2] + 2 * m);
      const d = s.d(x, z);
      if (d < 0.03 || d > m) continue;
      if (RR() > Math.exp(-(d * d) / 0.035)) continue;
      if (s.gate) { got++; if (!s.gate(x, z)) continue; }
      // inside the nave the fringe is thinner (it only lives in the joints and gaps of the floor)
      if (contactTuft(x, z, !inNave(x, z), RR, sc) && !s.gate) got++;
    }
  };
  for (const s of SOLIDS) if (s.fringe) fringe(s);
  // a broken ring of short dark blades at the foot of a stone lying in the grass; returns how many stand
  const stoneRing = (r, RR) => {
    if (!r || !Number.isFinite(+r[0]) || !Number.isFinite(+r[1])) return 0;
    const rx = +r[0], rz = +r[1], rad = Math.min(3, Math.max(0.08, Number.isFinite(+r[2]) ? +r[2] : 0.25) * 1.3 + 0.05);
    if (inNave(rx, rz) && onSlab(rx, rz)) return 0;
    const a0 = RR() * 6.2832, open = 1.2 + RR() * 1.6, n = Math.round(5 + rad * 12);
    let got = 0;
    for (let j = 0; j < n; j++) {
      const a = a0 + open * 0.5 + RR() * (6.2832 - open), size = 0.15 + RR() * 0.15;
      const dd = rad + 0.05 + size * 0.44 + RR() * RR() * 0.22;
      const x = rx + Math.cos(a) * dd, z = rz + Math.sin(a) * dd * 0.9;
      if (pathEdge(x, z).edge < 0.1) continue;
      if (tuft(x, z, kindFor(size, RR()), size, inNave(x, z) ? 1 : 2, RR)) { splat(x, z, 0.24, 0.55); got++; }
    }
    return got;
  };
  // The chapel does not stand ON the lawn, it is sunk in it: along the outside of its walls an IRREGULAR fringe
  // of taller grass and weeds, swelling out to a metre in places (a world-fixed noise decides where) and
  // absent in others, tallest against the stone, on a dark contact shape of the same outline. No two metres
  // of the wall foot are alike, so the stone never meets the grass on a ruled line.
  {
    const R3 = rng(4242), n3 = () => Math.sqrt(-2 * Math.log(1 - R3() * 0.9999)) * Math.cos(6.2831853 * R3());
    const swell = (x, z) => smooth(0.42, 0.78, vnoise(x / 1.5 + 3.7, z / 1.5 + 8.1) * 0.7 + vnoise(x / 4.3 + 11.9, z / 4.3 + 1.3) * 0.3);
    let nFr = 0;
    for (let i = 0; i < 26000; i++) {
      const x = -7.6 + R3() * 15.2, z = -11.6 + R3() * 21.6;
      if (inNave(x, z) || Math.max(Math.abs(x) - 5.43, Math.abs(z + 0.85) - 8.7) < 0) continue;
      const d = solidDist(x, z);
      if (d < 0.05 || d > 1.5) continue;
      const sw = swell(x, z), reach = 0.16 + 1.15 * sw;
      if (d > reach || R3() > 0.08 + 0.44 * sw) continue;
      if (pathEdge(x, z).edge < 0.3) continue;
      const k = 1 - d / reach;                                             // 1 at the stone, 0 at the rim of the fringe
      const size = Math.min(1.05, (0.26 + 0.50 * k * sw + 0.12 * sw) * Math.exp(n3() * 0.28));
      const kind = size > 0.62 ? (R3() < 0.55 ? 9 : R3() < 0.6 ? 6 : 8) : kindFor(size, R3());
      if (tuft(x, z, kind, size, 2, R3)) { splat(x, z, 0.30 + 0.25 * sw, 0.5 + 0.4 * sw); nFr++; }
    }
    // the same at the foot of every stone lying in the grass: a broken ring of short dark blades (they stand
    // just clear of it, see onRock) on a dark contact shape, open on one side
    for (const r of LAYOUT.lying) if (!r?.[4]) nFr += stoneRing(r, R3);
    console.info(`[grass] wall and stone fringe: ${nFr} tufts`);
  }
  // gaps and joints of the nave floor
  for (let i = 0; i < 5000; i++) {
    const x = -4.5 + R() * 9, z = -8.5 + R() * 16;
    if (R() < 0.70) continue;
    tuft(x, z, R() < 0.6 ? 0 : 1, 0.2 + R() * 0.16, 1);
  }
  // the rubble fan east of the chapel: taller, darker clumps between the stones
  for (let i = 0; i < 1500; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R());
    const x = 8.3 + Math.cos(a) * rr * 3.4, z = 1 + Math.sin(a) * rr * 5.6;
    if (R() > 0.15 + 0.85 * smooth(0.4, 0.6, meadowAt(x * 9 + 3, z * 9 + 40)[3])) continue;
    const size = R() < 0.7 ? 0.3 + R() * 0.22 : 0.45 + R() * 0.35;
    if (tuft(x, z, kindFor(size), size, 2)) splat(x, z, 0.36, 0.5);
  }
  // trees: a wider apron of taller grass around the trunk
  // (n tufts within about `reach` metres of the foot)
  const apron = (s, n = 170, reach = 1.3, RR = R, sc = 1) => {
    const t = s.c;
    for (let i = 0; i < n; i++) {
      const a = RR() * Math.PI * 2, rr = t[2] + 0.1 + Math.abs((RR() + RR() + RR() - 1.5) * 0.82) * reach;
      const size = (RR() < 0.4 ? 0.3 + RR() * 0.2 : 0.45 + RR() * 0.35) * sc;
      if (tuft(t[0] + Math.cos(a) * rr, t[1] + Math.sin(a) * rr, kindFor(size, RR()), size, 2, RR)) splat(t[0] + Math.cos(a) * rr, t[1] + Math.sin(a) * rr, 0.36, 0.4);
    }
  };
  for (const s of SOLIDS) if (s.apron) apron(s);

  // ---------------------------------------------------------------- (c) tall weed clumps, every 8-15 m
  let nWeed = 0;
  const weedClump = (x, z, big, cat = 5) => {
    if (blocked(x, z) || pathEdge(x, z).edge < 0.5) return;
    const n = 2 + Math.floor(R() * 4 * big);
    for (let j = 0; j < n; j++) tuft(x + gauss() * 0.3, z + gauss() * 0.3, 9, (0.6 + R() * 0.4) * big * (0.75 + R() * 0.4), cat);
    for (let j = 0; j < 7; j++) { const s = 0.34 + R() * 0.2; tuft(x + gauss() * 0.5, z + gauss() * 0.5, kindFor(s), s, cat); }
    if (cat === 5) splat(x, z, 0.6, 0.9);
    nWeed++;
  };
  for (let gx = -72; gx < 72; gx += 11) for (let gz = -72; gz < 72; gz += 11) {
    if (R() < 0.3) continue;
    const x = gx + 1.5 + R() * 8, z = gz + 1.5 + R() * 8;
    if (Math.hypot(x, z) > 74 || inNave(x, z)) continue;
    // (a clump stands IN a grass mass, as the dark accent of it - alone on the open lawn it is a sticker: it moves
    // to the mass nearest by, or is left out)
    let bx = x, bz = z, bg = mass01(x, z);
    for (let k = 0; k < 16 && bg < 0.80; k++) { const cx = x + (R() - 0.5) * 9, cz = z + (R() - 0.5) * 9, g = mass01(cx, cz); if (g > bg) { bg = g; bx = cx; bz = cz; } }
    // (deep inside a mass only, and as tufts OF the mass - category 6: its tones, and gone with its blades in the
    // middle distance, where a clump left standing alone on the lawn is a sticker)
    if (bg < 0.70) continue;
    weedClump(bx, bz, 1, 6);
    if (R() < 0.4) weedClump(bx + gauss() * 1.2, bz + gauss() * 1.2, 0.7, 6);
  }
  // and where a painter would put them: against the dry-stone wall, the fence, the rubble, the wall feet
  for (let t = 28; t < 56; t += 5 + R() * 6) { const [px, pz, dx, dz] = alongPath(t); const o = 2.6 + (R() < 0.5 ? -0.55 : 0.55); weedClump(px + dz * o, pz - dx * o, 0.8); }
  for (const i of [1, 3, 6]) { const [px, pz, dx, dz] = alongPath(30 + i * 2.6); weedClump(px - dz * 2.5, pz + dx * 2.5, 0.75); }
  for (const [x, z] of [[-6.1, -6.5], [-6.0, 4.6], [6.2, -7.4], [9.8, -2.5], [10.6, 4.2], [-1.5, -10.2], [3.4, -10.1], [-12.6, 4.4], [-5.2, 15.3]]) weedClump(x, z, 0.85);

  // ---------------------------------------------------------------- wildflowers
  // Small opaque dabs. Each colour has its own density field (flowerDrift) that falls off smoothly
  // from the core of its drifts, and the fields overlap; a quarter of the flowers take the colour of
  // a neighbouring drift. The same fields paint the streaks in the terrain wash further out.
  //   colour: 0 white, 1 yellow, 2 lilac, 3 pink-red, 4 orange
  // A CLUSTER is the unit, never the single flower: 5-12 blooms over one foot, fanned out from it (their stems
  // lean back to the foot), at heights of their own (tallest in the middle), on a tuft of basal leaves and a
  // dark dab of foliage painted on the ground under them (ground map B).
  const flower = (x, z, col, big, body, stem, lx, lz, fringe, tallFr = 0) => {
    if (blocked(x + lx, z + lz, stem + 0.05) || blocked(x, z) || pathEdge(x + lx, z + lz).edge < 0.25) return false;
    const cls = col === 2 ? 0 : R() < fringe ? 3 : R() < 0.56 ? 0 : R() < 0.72 ? 1 : 2;          // of the rest 56% / 32% / 12%
    const rad = 0.036 * Math.pow(2, (R() * 2 - 1) * 0.8) * big;               // x0.57-1.75, log-uniform
    // (the fringe class is short-stemmed - but not where it has to stand over the rough grass at the chapel foot)
    if (cls === 3) stem *= 0.6 + 0.6 * tallFr;
    flowers.add(cls, x, height(x, z), z, rad, col + 8 * cls + 32 * body, R(), stem, lx, lz);
    return true;
  };
  let nFlower = 0, nCluster = 0;
  for (let i = 0; i < 135000; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 84;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr + 4;
    if (inNave(x, z) && R() < 0.6) continue;
    const fd = flowerDrift(x, z);
    // (white drifts are thinner; the clusters stand INSIDE the painted body of their drift, densest in its
    // core, so that a drift is one shape with a ragged edge. Outside the bodies the grass is left quiet,
    // but for a few stray clusters that keep to loose groups of their own - never an even scatter of dots.)
    const dens = [fd.y, fd.p, fd.w * 0.7];
    const strayOk = meadowAt(x * 3.1 + 11, z * 3.1 + 5)[3] > 0.63;
    // (and off the rim of a drift a few loose blooms stand out on the lawn, one to three together)
    const skirtOk = fd.skirt > -0.20 && fd.skirt < -0.03;
    // (inside a drift the clusters GATHER: bloomGather() of src/terrain.js - clumps that hold most of the
    // blooms, thin ground between, and rests with none; in a clump they stand thicker and bigger, one hue)
    const gth = bloomGather(x, z), ck = smooth(1.2, 2.2, gth);
    for (let c = 0; c < 3; c++) {
      let n = 0, spread = 0.4, body = 0, loose = 0;
      const pc = dens[c] * 0.46 * gth;
      // (where the chance passes 1 - the core of a clump - the cluster holds that many times the blooms instead)
      if (R() < pc) { n = Math.round((ck > 0.5 ? 4 + Math.floor(R() * 7) : 3 + Math.floor(R() * 6)) * Math.max(1, pc)); spread = (0.22 + R() * 0.26) * (1 - 0.25 * ck); body = 1; }
      else if (c !== 1 && strayOk && R() < 0.004) { n = 3 + Math.floor(R() * 4); spread = 0.18 + R() * 0.12; }     // strays in the quiet grass
      else if (c === 0 && skirtOk && R() < 0.028) { n = 1 + Math.floor(R() * 3); spread = 0.10 + R() * 0.14; loose = 1; }
      if (!n) continue;
      // (taller in the rough grass at the foot of the chapel, where they have to stand clear of its fringe)
      const foot = 1 - smooth(10.8, 13.2, Math.hypot(x - SUBJECT.x, z - SUBJECT.z));
      const big = (0.82 + R() * R() * 1.0) * (1 + 0.35 * foot) * (body ? 0.85 + 0.35 * ck : 1), tall = (0.07 + R() * 0.09) * (1 + 2.0 * foot);               // a cluster shares its species
      // (the share of its blooms that stand on into the middle distance: more at the rim of a drift and off it)
      // (and in the band at the foot of the chapel west of the door more of them, where front looks at it over ~14 m
      // of lawn and the near blooms are gone: a drift that runs in from the lower left)
      const frz = foot * smooth(-0.5, -2.5, x) * smooth(6.5, 9.0, z);
      const fringe = body ? 0.10 + 0.22 * (1 - smooth(0.25, 0.7, dens[c])) + 0.30 * frz : 0.34;
      let placed = 0;
      // (a cluster is ONE hue - the family of the band it stands in - with an odd accent; the blooms of a clump
      // are then one colour mass, and the hues mix between clusters, not bloom by bloom)
      const colC = flowerFam(x, z, (R() - 0.5) * 0.03);
      for (let j = 0; j < n; j++) {
        // where the bloom stands from the foot of the cluster, and how far its root is from that foot
        const ox = gauss() * spread * 1.25, oz = gauss() * spread, od = Math.hypot(ox, oz);
        const mid = 1 - Math.min(1, od / (spread * 0.75));
        const stem = tall * (0.55 + R() * 0.85) * (0.82 + 0.42 * mid);
        // (a stem leans no further than ~25 degrees: the root moves out with the bloom from there)
        const lmax = stem * 0.45, lk = Math.min(0.5, lmax / Math.max(od, 1e-3));
        const lx = ox * lk, lz = oz * lk;
        const fx = x + ox, fz = z + oz;
        // cross-contamination: a quarter take the colour of another drift (the stronger neighbour, mostly)
        let k = c;
        if (R() < (body ? 0.33 - 0.22 * ck : 0.33)) { const o1 = (c + 1) % 3, o2 = (c + 2) % 3; k = R() * (dens[o1] + dens[o2] + 0.3) < dens[o1] + 0.15 ? o1 : o2; }
        let col = k === 0 ? (fd.orange ? 4 : 1) : k === 1 ? 3 : (fd.lilac && R() < 0.25 ? 2 : 0);
        // inside a drift two thirds take the family of the hue band they stand in (bands of colour lying
        // across the view from the hilltop, as in the terrain's dabs)
        // (and the bands are not all set as thickly: some are left thin, streaks of green across the drift)
        if (body) {
          if (R() < BAND_SHARE + (1 - BAND_SHARE) * 0.6 * ck) col = R() < 0.85 + 0.1 * ck ? colC : flowerFam(fx, fz, (R() - 0.5) * 0.05);
        }
        if (loose) col = flowerFam(x, z, (R() - 0.5) * 0.05);
        if (flower(fx - lx, fz - lz, col, big * (1 + 0.25 * frz), body, stem, lx, lz, fringe, frz)) { placed++; nFlower++; }
      }
      if (!placed) continue;
      nCluster++;
      // the basal leaves: a rosette at the foot, about as tall as the stems (they hide most of them), and
      // for the bigger clusters a second, smaller one beside it. A third of them stay on into the middle
      // distance (the green between the blooms of a far drift), the rest only near.
      const lh = Math.min(0.36, Math.max(0.17, tall * 1.9 + R() * 0.05));
      const far3 = body && R() < 0.20;
      // (where the clusters stand thick - the body of a band - not every one has its rosette: the paint under
      // them is foliage green already, and a card per cluster there is a wall of leaves over the blooms behind)
      // (half of them are a rosette of broad leaves, the rest upright blades a little taller than the blooms: the
      // flowers of a drift rise out of grass strokes)
      if (!body || R() < 0.52) { const up_ = R() < 0.4; tuft(x + gauss() * 0.06, z + gauss() * 0.06, up_ ? kindFor(lh * 1.2) : 5, up_ ? lh * 1.2 : lh, far3 ? 3 : 7); }
      if (placed >= 8 && R() < 0.35) tuft(x + gauss() * spread * 0.8, z + gauss() * spread * 0.6, R() < 0.6 ? 5 : 3, 0.14 + R() * 0.10, 7);
      // the dab of foliage on the ground under the cluster (0.5 = its edge), and the floor of the drift about it (0.2)
      // (only under a cluster of the body of a drift, and only if at least three blooms stand on it: a dark pad
      // with one bloom on it - or, further out, with none - is a hole in the lawn)
      if (body && placed >= 3) splatMax(accB, x + gauss() * 0.05, z + gauss() * 0.05, spread * 1.25 + 0.16, 0.80 + R() * 0.20);
      // (the floor is as wide as the drift is thick there: about a lone cluster at the rim it keeps close to the foot)
      if (body) splatMax(accB, x, z, spread * 1.2 + 0.18 + (spread * 1.2 + 0.80) * smooth(0.40, 0.90, dens[c]), 0.36);
    }
  }

  // ---------------------------------------------------------------- dry-brush strokes of the middle distance
  // about one per 6 m2, in loose groups of one to three laid one behind the other
  for (let i = 0; i < 1800; i++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 80;
    const x0 = Math.cos(a) * rr, z0 = Math.sin(a) * rr + 3;
    const n = 1 + Math.floor(R() * R() * 3.2), tone = R() < 0.62 ? -1 : 1, len0 = 1 + R() * 2;
    for (let j = 0; j < n; j++) {
      const x = x0 + gauss() * 1.2, z = z0 + gauss() * 1.2;
      if (blocked(x, z) || inNave(x, z) || pathEdge(x, z).edge < 0.5 || solidDist(x, z) < 0.6) continue;
      const len = Math.min(3, Math.max(1, len0 * (0.7 + R() * 0.6))), rnd = R(), tn = R() < 0.85 ? tone : -tone;
      // (none across the floor of a flower drift: a stroke is a touch off the LAWN's colour, and on the deeper
      // green under the clusters it would be a pale hairline. It lies across the view, whatever that is: the
      // whole disc it can turn in must be clear.)
      let onDrift = driftB(x, z) > 0.19;
      for (let k = 0; k < 6 && !onDrift; k++) onDrift = driftB(x + Math.cos(k * 1.047) * len * 0.4, z + Math.sin(k * 1.047) * len * 0.4) > 0.19;
      if (onDrift) continue;
      strokes.add(0, x, height(x, z), z, len, rnd, tn, 0);
    }
  }

  // ---------------------------------------------------------------- what has been added since
  // Footprints and lying stones declared without a place in the composed sequence (src/layout.js). The meadow
  // above was drawn as if they were not there; now what stands on them is taken away, and each gets its
  // fringe (and apron) from a random sequence of its own, seeded by where it is. So adding, moving or
  // removing one changes the turf at its own foot and nowhere else.
  {
    const ADDED = added(), newRocks = LAYOUT.lying.filter((r) => r?.[4]);
    if (ADDED.length || newRocks.length) {
      solids = [...SOLIDS, ...ADDED];
      for (const r of newRocks) rockIn(r);
      const onAdded = (x, z, keep) => {
        for (const s of ADDED) {
          if (x < s.bb[0] - keep || x > s.bb[1] + keep || z < s.bb[2] - keep || z > s.bb[3] + keep) continue;
          if (s.d(x, z) < keep && (!s.solid || s.solid(x, z))) return true;
        }
        return false;
      };
      let cleared = 0;
      // tall(rec, o): how high the card of an instance stands; keep: how far its root stays from a footprint
      const clear = (field, tall, keep) => {
        for (const L of field.layers) {
          const src = L.rec, out = [];
          for (let o = 0; o < src.length; o += STRIDE) {
            const x = src[o], z = src[o + 2], bx = x + src[o + 10], bz = z + src[o + 11], h = tall(src, o);
            if (onAdded(x, z, keep) || onAdded(bx, bz, keep) || (newRocks.length && (onRock(x, z, h) || onRock(bx, bz, h)))) { cleared++; continue; }
            for (let k = 0; k < STRIDE; k++) out.push(src[o + k]);
          }
          L.rec = out;
        }
      };
      clear(tufts, (r, o) => r[o + 3], 0.03);
      clear(flowers, (r, o) => r[o + 6] + 0.05, 0.03);
      clear(strokes, () => 0, 0.6);
      const own = (x, z) => rng((Math.imul(Math.round(x * 100), 73856093) ^ Math.imul(Math.round(z * 100), 19349663)) >>> 0);
      const n0 = tufts.count;
      for (const s of ADDED) {
        const RR = own((s.bb[0] + s.bb[1]) / 2, (s.bb[2] + s.bb[3]) / 2);
        // (at the foot of a slender round thing - a sapling, a post - everything is smaller and thinner than
        // at a full trunk: k = 1 from a foot of 0.4 m)
        const k = s.c ? Math.min(1, Math.max(0.25, s.c[2] / 0.4)) : 1, sc = 0.5 + 0.5 * k;
        if (s.fringe) fringe(s, RR, sc);
        if (s.apron && s.c) apron(s, Math.round(170 * k * k), 1.3 * (0.4 + 0.6 * k), RR, sc);
      }
      for (const r of newRocks) stoneRing(r, own(+r[0], +r[1]));
      console.info(`[grass] added since: ${ADDED.length} footprints, ${newRocks.length} stones; cleared ${cleared} instances off them, stood ${tufts.count - n0} tufts at their feet`);
    }
  }

  // ---------------------------------------------------------------- meshes
  const atlas = makeTuftAtlas();
  const perCat = tufts.layers.map((l) => `${l.cat}:${l.rec.length / STRIDE}`).join(' ');
  const tuftMesh = tufts.build([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0, -1, 0, 1, 1, 0, 1, 1, 1, 1, -1, 1, 1], mat({
    vs: TUFT_VS, fs: TUFT_FS, uniforms: { uTuft: { value: atlas.tex }, uBoxB: { value: atlas.boxB }, uBoxT: { value: atlas.boxT }, uContact: GROUND_UNIFORMS.uContact }, side: THREE.DoubleSide,
    extra: { alphaToCoverage: true },
  }), 1.2, 0.66);
  for (const m of tuftMesh) { m.name = 'grass:tufts'; scene.add(m); }

  const fquad = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];
  const flowerMesh = flowers.build([...fquad, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1], mat({
    vs: FLOWER_VS, fs: FLOWER_FS,
    uniforms: { uCols: { value: FLOWER_COLS.map((c) => new THREE.Color(c)) }, uContact: GROUND_UNIFORMS.uContact },
    side: THREE.DoubleSide, extra: { alphaToCoverage: true },
  }), 1.6, FLAT_EL);
  for (const m of flowerMesh) { m.name = 'grass:flowers'; scene.add(m); }

  const strokeMesh = strokes.build(fquad, mat({ vs: STROKE_VS, fs: STROKE_FS, uniforms: { uContact: GROUND_UNIFORMS.uContact }, side: THREE.DoubleSide, extra: { alphaToCoverage: true } }), 1.6);
  for (const m of strokeMesh) { m.name = 'grass:strokes'; scene.add(m); }
  const fields = [tufts, flowers, strokes];
  // (debug switches for the stability tools: ?gt=0 hides the tufts, ?gf=0 the blooms, ?gs=0 the strokes)
  { const q = new URLSearchParams(location.search); for (const m of tuftMesh) m.visible = q.get('gt') !== '0'; for (const m of flowerMesh) m.visible = q.get('gf') !== '0'; for (const m of strokeMesh) m.visible = q.get('gs') !== '0'; }

  // ground map -> texture
  const gdata = new Uint8Array(MN_ * MN_ * 4);
  for (let i = 0; i < MN_ * MN_; i++) {
    gdata[i * 4] = Math.round(Math.min(1, accR[i]) * 255); gdata[i * 4 + 1] = Math.round(Math.min(1, accG[i]) * 255); gdata[i * 4 + 2] = Math.round(Math.min(1, accB[i]) * 255); gdata[i * 4 + 3] = 255;
  }
  const gtex = new THREE.DataTexture(gdata, MN_, MN_, THREE.RGBAFormat, THREE.UnsignedByteType);
  gtex.wrapS = gtex.wrapT = THREE.ClampToEdgeWrapping;
  gtex.magFilter = THREE.LinearFilter; gtex.minFilter = THREE.LinearMipmapLinearFilter;
  gtex.generateMipmaps = true; gtex.needsUpdate = true;
  GROUND_UNIFORMS.uContact.value = gtex;

  // ---------------------------------------------------------------- baked sun term
  // Read the sun shadow map back once (2048^2, depth packed in RGB) and evaluate every instance
  // on the CPU: a wide probe (two rings, up to 0.45 m) through a soft per-instance threshold.
  const bake = (renderer) => {
    const N = 2048;
    const rt = new THREE.WebGLRenderTarget(N, N, { depthBuffer: false });
    rt.texture.minFilter = rt.texture.magFilter = THREE.NearestFilter; rt.texture.generateMipmaps = false;
    const m = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false,
      vertexShader: 'in vec3 position; out vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `precision highp float; precision highp sampler2D; uniform sampler2D uShadowMap; in vec2 vUv; out vec4 o;
        void main(){ float d = min(texture(uShadowMap, vUv).r, 0.999999); vec3 e = fract(d * vec3(1.0, 255.0, 65025.0)); e.xy -= e.yz / 255.0; o = vec4(e, 1.0); }`,
      uniforms: { uShadowMap: G.uShadowMap },
    });
    const tri = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)), m);
    tri.frustumCulled = false;
    const sc = new THREE.Scene(); sc.add(tri);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(sc, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
    const px = new Uint8Array(N * N * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, N, N, px);
    renderer.setRenderTarget(prev);
    rt.dispose(); m.dispose(); tri.geometry.dispose();
    const depth = (u, v) => { const i = (v * N + u) * 4; return px[i] / 255 + px[i + 1] / 65025 + px[i + 2] / 16581375; };
    const e = G.uShadowMat.value.elements;
    const P = [[0, 0], [-3.0, -1.6], [2.6, -3.0], [3.0, 2.0], [-2.0, 3.0], [-8.6, 2.4], [1.8, -8.8], [8.4, -2.0], [-2.6, 8.6], [5.6, 5.4], [-5.8, -5.2], [5.2, -5.8], [-5.4, 5.6]];
    const litAt = (x, y, z, rnd) => {
      const sx = (e[0] * x + e[4] * y + e[8] * z + e[12]) * 0.5 + 0.5, sy = (e[1] * x + e[5] * y + e[9] * z + e[13]) * 0.5 + 0.5;
      const sz = (e[2] * x + e[6] * y + e[10] * z + e[14]) * 0.5 + 0.5;
      if (sx < 0.005 || sx > 0.995 || sy < 0.005 || sy > 0.995 || sz > 1) return 1;
      let lit = 0;
      for (const p of P) {
        const u = Math.min(N - 1, Math.max(0, Math.floor(sx * N + p[0]))), v = Math.min(N - 1, Math.max(0, Math.floor(sy * N + p[1])));
        if (depth(u, v) >= sz - 0.0016) lit++;
      }
      const th = 0.5 + (rnd - 0.5) * 0.36;
      return smooth(th - 0.14, th + 0.14, lit / P.length);
    };
    // Where the ground is certainly in the sun, for the terrain shader (ground map A; it then leaves out its
    // eleven shadow taps there): every 31 cm cell of the hilltop is probed at 6 x 6 points (5 cm apart - the texel
    // of the sun map) with the shader's own depth test, and the cells with any shaded point are grown by 1.25 m.
    // A cell is cleared only if nothing within a metre and a quarter of it is in shadow.
    {
      const MC = MN_ / 2, cs = GMAP.w / MC, may = new Uint8Array(MC * MC), SUB = 6;
      const hg = new Float32Array((MC + 1) * (MC + 1));
      for (let j = 0; j <= MC; j++) for (let i = 0; i <= MC; i++) hg[j * (MC + 1) + i] = height(GMAP.x0 + i * cs, GMAP.z0 + j * cs);
      for (let j = 0; j < MC; j++) for (let i = 0; i < MC; i++) {
        const x0 = GMAP.x0 + i * cs, z0 = GMAP.z0 + j * cs, xc = x0 + cs / 2, zc = z0 + cs / 2;
        if (xc * xc + zc * zc > 84 * 84) continue;
        const h00 = hg[j * (MC + 1) + i], h10 = hg[j * (MC + 1) + i + 1], h01 = hg[(j + 1) * (MC + 1) + i], h11 = hg[(j + 1) * (MC + 1) + i + 1];
        let sh = 0;
        for (let b_ = 0; b_ < SUB && !sh; b_++) for (let a_ = 0; a_ < SUB; a_++) {
          const fx = (a_ + 0.5) / SUB, fz = (b_ + 0.5) / SUB, x = x0 + fx * cs, z = z0 + fz * cs;
          const y = h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz + 0.05;
          const sx = (e[0] * x + e[4] * y + e[8] * z + e[12]) * 0.5 + 0.5, sy = (e[1] * x + e[5] * y + e[9] * z + e[13]) * 0.5 + 0.5;
          if (sx < 0.0 || sx > 1.0 || sy < 0.0 || sy > 1.0) continue;
          const sz = (e[2] * x + e[6] * y + e[10] * z + e[14]) * 0.5 + 0.5;
          if (depth(Math.min(N - 1, Math.floor(sx * N)), Math.min(N - 1, Math.floor(sy * N))) < sz - 0.0014) { sh = 1; break; }
        }
        may[j * MC + i] = sh;
      }
      // grow by 4 cells (two passes of a box, rows then columns)
      const GR = 4, tmp = new Uint8Array(MC * MC);
      for (let j = 0; j < MC; j++) for (let i = 0; i < MC; i++) { let a = 0; for (let k = Math.max(0, i - GR); k <= Math.min(MC - 1, i + GR) && !a; k++) a = may[j * MC + k]; tmp[j * MC + i] = a; }
      let clear = 0;
      for (let j = 0; j < MC; j++) for (let i = 0; i < MC; i++) {
        let a = 0; for (let k = Math.max(0, j - GR); k <= Math.min(MC - 1, j + GR) && !a; k++) a = tmp[k * MC + i];
        if (!a) clear++;
        const al = a ? 255 : 0, o = (2 * j * MN_ + 2 * i) * 4 + 3;
        gdata[o] = gdata[o + 4] = gdata[o + MN_ * 4] = gdata[o + MN_ * 4 + 4] = al;
      }
      gtex.needsUpdate = true;
      console.info(`[grass] sun mask: ${(100 * clear / (MC * MC)).toFixed(0)}% of the ground map needs no shadow taps`);
    }
    let shaded = 0;
    for (const [f, up, ri] of [[tufts, 0.12, 5], [flowers, 0.15, 5], [strokes, 0.1, 4]]) {
      for (let i = 0; i < f.total; i++) {
        const o = i * STRIDE;
        const l = litAt(f.src[o], f.src[o + 1] + up, f.src[o + 2], f.src[o + ri]);
        f.src[o + 7] = l; if (l < 0.5) shaded++;
      }
      f.invalidate();
    }
    return shaded;
  };

  // ---------------------------------------------------------------- per-frame hook
  let baked = false, bakeQueued = false;
  const lastCam = new Float64Array(19).fill(NaN);
  const prevHook = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, sc, camera, rt) {
    prevHook.call(this, renderer, sc, camera, rt);
    if (!camera.isPerspectiveCamera) return;                 // (the sun shadow pass)
    if (!baked && !bakeQueued) {
      bakeQueued = true;
      requestAnimationFrame(() => {
        const t0 = performance.now();
        const n = bake(renderer);
        baked = true;
        console.info(`[grass] baked the sun term of ${tufts.total + flowers.total + strokes.total} instances (${n} in shade) in ${(performance.now() - t0).toFixed(0)} ms`);
      });
    }
    // (nothing to choose again while the eye stands still)
    _m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const me = _m4.elements, cp = camera.position;
    let moved = lastCam[16] !== cp.x || lastCam[17] !== cp.y || lastCam[18] !== cp.z;
    for (let k = 0; k < 16 && !moved; k++) moved = lastCam[k] !== me[k];
    if (!moved && !fields.some((f) => f.sigN < 0)) return;
    for (let k = 0; k < 16; k++) lastCam[k] = me[k];
    lastCam[16] = cp.x; lastCam[17] = cp.y; lastCam[18] = cp.z;
    _frustum.setFromProjectionMatrix(_m4);
    for (let k = 0; k < 6; k++) { const pl = _frustum.planes[k]; _pl[k * 4] = pl.normal.x; _pl[k * 4 + 1] = pl.normal.y; _pl[k * 4 + 2] = pl.normal.z; _pl[k * 4 + 3] = pl.constant; }
    for (const f of fields) f.update(camera);
  };
  window.__grass = { fields, drawn: () => fields.map((f) => f.drawn), drawnFlat: () => fields.map((f) => f.drawnFlat), totals: () => fields.map((f) => f.total) };

  console.warn(`[grass] tufts ${tufts.total} (band ${nBand}, of which big ${nBig}; weed clumps ${nWeed}), flowers ${flowers.total} in ${nCluster} clusters, strokes ${strokes.total}; per category ${perCat}`);
}
