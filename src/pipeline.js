// Render pipeline: sun shadow depth -> scene (3 targets) -> paint filter -> ink & depth composite
// -> diffusion bloom -> grade/grain.
import * as THREE from 'three';
import { G, HEAD, WIND, LICENCE } from './glsl.js';
import { SUBJECT } from './world.js';
const v1 = (x) => (+x).toFixed(3);
// the shape id of a cel-drawn character (src/extra/clawd.js): he carries his own ink and tones, so the canvas's drawn
// edges (lines, arrises, kiwa) are not laid on him; the light, cloud shadow, grain and bloom of the picture are
export const CHAR_ID = 0.9137;

const FS_VS = HEAD + /* glsl */`
in vec3 position;
out vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// cloud shadows: ?cshadow=0..2 scales their strength (0 = off, 1 = default)
const _q = new URLSearchParams(globalThis.location?.search ?? '');
const CSHADOW = _q.has('cshadow') ? Math.max(0, Math.min(2, parseFloat(_q.get('cshadow')) || 0)) : 1;
const CSHADOW_DBG = parseInt(_q.get('cshadowdbg') ?? '0') || 0;
const DBG = parseInt(_q.get('dbg') ?? '0') || 0;   // 1 = the describe field
// ?edgedbg= shows the fields of the painter's licence (LICENCE in src/glsl.js): 1 = the arrises (red convex, green
// concave, + blue light | shade), 2 = the lines drawn of them, 3 = the edge of the shadows (dark = deepened, light = cleaned)
const EDGE_DBG = parseInt(_q.get('edgedbg') ?? '0') || 0;

function pass(fs, uniforms) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: FS_VS,
    fragmentShader: HEAD + fs,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

// ---- where things are drawn and where they are left as a mass.
// A painted background does not describe everything: most of a meadow, a crown or a bank is a quiet mass,
// and single blades, petals and leaves are drawn only (a) where a mass ends against something well behind it
// (its silhouette), (b) in a few accents, patches fixed to the ground, and (c) on what is built, which is
// the drawing of the picture. describe() is that decision for a pixel, 1 = drawn, 0 = left quiet. It is taken
// from the finished picture's depth and flags alone, so whatever is added to the scene falls under it.
const QUIET = { dab: 0.05, max: 3.4, patch: 11.0, share: [0.53, 0.60], focal: [9.0, 26.0, 0.07], edge: [1.12, 1.45], ring: 9.0 };
const DESCRIBE_GLSL = /* glsl */`
const vec3 SUBJECT = vec3(${v1(SUBJECT.x)}, ${v1(SUBJECT.y)}, ${v1(SUBJECT.z)});
const float QUIET_DAB = ${v1(QUIET.dab)};      // breadth of a dab in a quiet mass, m on the thing itself
const float QUIET_MAX = ${v1(QUIET.max)};      // ... but never more than this many times the usual dab
float describe(vec2 uv){
  vec4 ax = texture(tAux, uv);
  float d = ax.r;
  if (d > 5000.0) return 1.0;
  // (c) built things
  float D = step(0.5, ax.a);
  // (a) the rim of a mass: something clearly farther lies within a few pixels
  float far = d;
  for (int k = 0; k < 8; k++){
    float a = float(k) * 0.7854;
    far = max(far, texture(tAux, uv + vec2(cos(a), sin(a)) * ${v1(QUIET.ring)} * uRadius / 3.0 * uTexel).r);
  }
  D = max(D, smoothstep(${v1(QUIET.edge[0])}, ${v1(QUIET.edge[1])}, far / d));
  // (b) accents, fixed to the world
  vec3 ray = vec3((uv * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0);
  vec3 wp = (uInvView * vec4(ray * d, 1.0)).xyz;
  vec2 q = (wp.xz + wp.y * vec2(0.37, 0.21)) / ${v1(QUIET.patch)};
  float n = texture(tBrush, q).a * 0.7 + texture(tBrush, q * 2.3 + 0.41).a * 0.3;
  // (more of them round the subject of the picture, where the eye is meant to rest)
  n += ${v1(QUIET.focal[2])} * (1.0 - smoothstep(${v1(QUIET.focal[0])}, ${v1(QUIET.focal[1])}, distance(wp.xz, SUBJECT.xz)));
  D = max(D, smoothstep(${v1(QUIET.share[0])}, ${v1(QUIET.share[1])}, n));
  return D;
}
`;

// The 37 taps of the Kuwahara filter, and what each adds to which of the eight sectors, laid out as straight
// code: the weights depend on the tap alone, and a tap lies in only some of the sectors (the rest add nothing).
const KUWAHARA_TAPS = (() => {
  const zeta = 2 / 3, zc = 0.58, eta = (zeta + Math.cos(zc)) / (Math.sin(zc) * Math.sin(zc));
  const f = (x) => { const t = Math.fround(x).toPrecision(9); return /[.e]/.test(t) ? t : t + '.0'; };
  let out = '';
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
    const vx = i / 3, vy = j / 3;
    if (vx * vx + vy * vy > 1) continue;
    const w = new Array(8).fill(0);
    let vxx = zeta - eta * vx * vx, vyy = zeta - eta * vy * vy, z, sum = 0;
    const put = (k, a) => { z = Math.max(0, a); w[k] = z * z; sum += w[k]; };
    put(0, vy + vxx); put(2, -vx + vyy); put(4, -vy + vxx); put(6, vx + vyy);
    const ux = 0.70710678 * (vx - vy), uy = 0.70710678 * (vx + vy);
    vxx = zeta - eta * ux * ux; vyy = zeta - eta * uy * uy;
    put(1, uy + vxx); put(3, -ux + vyy); put(5, -uy + vxx); put(7, ux + vyy);
    const g = Math.exp(-3.125 * (vx * vx + vy * vy)) / Math.max(sum, 1e-5);
    out += `  { vec3 c = textureLod(tColor, vUv + vec2(${i}.0, ${j}.0) * stepPx * uTexel, lod).rgb; vec3 cc = c * c;\n`;
    for (let k = 0; k < 8; k++) if (w[k] > 0) out += `    { float wk = ${f(w[k] * g)}; m[${k}] += vec4(c * wk, wk); s[${k}] += cc * wk; }\n`;
    out += '  }\n';
  }
  return out;
})();

// ---- 1. paint filter: 4-sector Kuwahara. Flattens small detail into dabs, rounds corners,
// keeps edges hard. Per-pixel strength comes from colour alpha.
const KUWAHARA_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tColor, tAux, tBrush; uniform vec2 uTexel; uniform float uRadius;
uniform mat4 uInvView; uniform vec2 uTanHalf; uniform float uLensShift, uPixelK, uQuiet; uniform int uDbg;
${DESCRIBE_GLSL}
// Generalised Kuwahara with 8 smooth sectors and polynomial weights (after Kyprianidis).
// Each pixel takes the mean of whichever surrounding sector is the most uniform, which turns
// fine detail into flat dabs with crisp borders - gouache, in other words.
void main(){
  vec4 c0 = texture(tColor, vUv);
  if (uRadius < 0.5 || texture(tAux, vUv).r > 5000.0) { o = c0; return; }   // sky needs no filtering
  const int R = 3;                       // fixed 7x7 tap grid, spread over the radius (bilinear taps)
  // where the picture is left as a quiet mass the dabs are broader (a fixed size on the thing itself, so
  // only what is near loses its small drawing); a tap then reads the mip that matches its spacing
  float quiet = uQuiet > 0.0 ? 1.0 - describe(vUv) : 0.0;
  if (uDbg == 1) { o = vec4(vec3(1.0 - quiet), 1.0); return; }
  float rad = uRadius * mix(1.0, clamp(QUIET_DAB / (texture(tAux, vUv).r * uPixelK * uRadius), 1.0, QUIET_MAX), quiet * min(uQuiet, 1.0));
  float stepPx = rad / 3.0;
  float lod = max(0.0, log2(stepPx) - 1.0);
  float zeta = 2.0 / 3.0;
  const float zc = 0.58;
  float eta = (zeta + cos(zc)) / (sin(zc) * sin(zc));
  vec4 m[8]; vec3 s[8];
  for (int k = 0; k < 8; k++){ m[k] = vec4(0.0); s[k] = vec3(0.0); }
${KUWAHARA_TAPS}
  vec4 acc = vec4(0.0);
  for (int k = 0; k < 8; k++){
    m[k].rgb /= max(m[k].w, 1e-5);
    vec3 var = abs(s[k] / max(m[k].w, 1e-5) - m[k].rgb * m[k].rgb);
    float sigma2 = var.r + var.g + var.b;
    float wgt = 1.0 / (1.0 + pow(8000.0 * sigma2, 4.0));
    acc += vec4(m[k].rgb * wgt, wgt);
  }
  o = vec4(acc.rgb / acc.w, c0.a);
}
`;

// ---- the boundaries that survive in the distance.
// Haze and a high key flatten the far country; what keeps it from washing out is a few firm boundaries
// between its planes, and they are found here from the depth of the finished picture (compared with the
// depth of what lies around), so that whatever stands out there takes part:
//  - MIST: where farther land shows in a pocket between or behind nearer masses (the far hill between two
//    woods, the plain behind a hedge) it takes ONE flat step paler, the shape cut with a brushed, hard edge
//    like the mist at the feet of the hills (src/extra/far.js);
//  - CREST: a far ridge that ends against the sky or against much farther land is painted deeper toward its
//    top edge and left to die away below it, the way a range is laid in poster colour.
// Both come and go in long stretches fixed to the land (lost and found). Only what lies beyond the hilltop
// takes part, so nothing near throws a halo on the country behind it.
const COUNTER = { from: [55, 95], sky: 12.6, mist: 0.30, pale: 0.30, crest: [0.12, 0.9], crestFrom: [260, 520], deep: 1.0 };
// ---- 2. blurred log-depth (quarter res) for the depth halo
const DEPTH_DOWN_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tAux;
uniform vec2 uTexel;
// log depth of the country beyond the hilltop, weighted so that the blur leaves the foreground out
// (r = depth x weight, g = weight): a near tree throws no halo on the land behind it
void main(){
  vec2 acc = vec2(0.0);
  for (int k = 0; k < 4; k++){
    float d = texture(tAux, vUv + vec2(k < 2 ? -1.0 : 1.0, (k & 1) == 0 ? -1.0 : 1.0) * uTexel).r;
    float w = smoothstep(${v1(COUNTER.from[0])}, ${v1(COUNTER.from[1])}, d);
    acc += vec2(min(log2(max(d, 0.1)), ${v1(COUNTER.sky)}) * w, w);
  }
  o = vec4(acc * 0.25, 0., 1.);
}
`;
// ---- 2b. the share of light among what is built, round each place (quarter res, blurred): see KIWA in the composite
const LIT_DOWN_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tAux;
uniform vec2 uTexel;
void main(){
  vec2 acc = vec2(0.0);
  for (int k = 0; k < 4; k++){
    vec4 a = texture(tAux, vUv + vec2(k < 2 ? -1.0 : 1.0, (k & 1) == 0 ? -1.0 : 1.0) * uTexel);
    float w = step(0.5, a.a) * (1.0 - step(abs(a.g - ${CHAR_ID}), 0.004));
    acc += vec2(a.b * w, w);
  }
  o = vec4(acc * 0.25, 0., 1.);
}
`;
const BLUR_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tSrc; uniform vec2 uDir;
void main(){
  vec4 c = texture(tSrc, vUv) * 0.227027;
  c += (texture(tSrc, vUv + uDir * 1.3846) + texture(tSrc, vUv - uDir * 1.3846)) * 0.316216;
  c += (texture(tSrc, vUv + uDir * 3.2308) + texture(tSrc, vUv - uDir * 3.2308)) * 0.070270;
  o = c;
}
`;

// ---- 3. ink + depth composite
const COMPOSITE_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tColor, tNormal, tAux, tDepthBlur, tBrush, tLitBlur;
uniform vec2 uTexel; uniform vec3 uHazeCol; uniform vec3 uSunDir;
uniform float uLine, uCounter, uEdgeLight, uWobble, uArris, uKiwa, uEve; uniform int uEdgeDbg;
uniform mat4 uInvView; uniform vec2 uTanHalf; uniform float uLensShift;
uniform float uTime, uPixelK, uCloud; uniform int uCloudDbg;

// ---- cloud shadows. Fair-weather cumulus drift over the country; each lays one flat, cooler tone on
// the sunlit land. The field lives in the plane of the cloud bases (CS_ALT) and is rigid: it only
// translates down-wind on the held clock, so a shadow slides over hill and hollow as one shape (a
// point of the land looks up along the sun to find its cloud).
const float CS_ALT = 1100.0;                      // cloud base above the hilltop datum, m
const float CS_CELL = 430.0;                      // one cloud (or none) per cell of this size, m
const float CS_FILL = 0.45;                       // share of cells that hold a cloud
const vec2  CS_WIND = vec2(${v1(WIND.dir[0])}, ${v1(WIND.dir[1])});        // the one wind of the scene (src/glsl.js WIND)
const float CS_SPEED = ${v1(WIND.speed)};                       // m/s
const float CS_LANE = 130.0;                      // half-width of the sunnier lane through the subject, m
const vec3 SUBJECT = vec3(${v1(SUBJECT.x)}, ${v1(SUBJECT.y)}, ${v1(SUBJECT.z)});
vec4 csHash(vec2 p){ vec4 q = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099)); q += dot(q, q.wzxy + 33.33); return fract((q.xxyz + q.yzzw) * q.zywx); }
// > 0 inside a shadow. q = position in the cloud frame (m), lane = distance across the wind from the chapel's line
float cloudField(vec2 q, float lane){
  vec2 ci = floor(q / CS_CELL);
  vec2 wp = vec2(-CS_WIND.y, CS_WIND.x);
  float f = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 cc = ci + vec2(float(i), float(j));
    vec4 h = csHash(cc + 17.0);
    if (h.x > CS_FILL) continue;
    vec4 h2 = csHash(cc * 1.7 + 91.0);
    vec2 dq = q - (cc + 0.5 + (h.yz - 0.5) * 0.6) * CS_CELL;
    float R = mix(95.0, 190.0, h.w);
    // a heap is three lobes strung along the wind: the large one, a shoulder to lee, a small one to windward
    vec2 e = vec2(dot(dq, CS_WIND), dot(dq, wp));
    vec2 e1 = e / vec2(1.25, 1.0);
    f += max(0.0, 1.0 - dot(e1, e1) / (R * R));
    vec2 e2 = e - vec2(0.85, (h2.x - 0.5) * 0.9) * R; float R2 = R * mix(0.5, 0.75, h2.y);
    f += max(0.0, 1.0 - dot(e2, e2) / (R2 * R2)) * 0.9;
    vec2 e3 = e + vec2(0.9, (h2.z - 0.5) * 1.1) * R; float R3 = R * mix(0.35, 0.6, h2.w);
    f += max(0.0, 1.0 - dot(e3, e3) / (R3 * R3)) * 0.9;
  }
  // the edge is brushed: broad dabs shape it, smaller ones fray it (both ride with the cloud)
  float n = (texture(tBrush, q / 610.0).a - 0.5) * 0.55 + (texture(tBrush, q / 230.0 + 0.37).g - 0.5) * 0.14;
  // clouds whose track runs over the chapel are fewer and smaller: the subject mostly stays in the sun
  float l = lane / CS_LANE;
  return f + n - 0.36 - 0.62 * exp(-l * l);
}

vec3 viewPos(vec2 uv, float d){ return vec3((uv * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0) * d; }

// What the drawing finds at one place of something built:
//  crease = a crease within one stone, sil = the near side of a silhouette (both as before), and its
//  CONSTRUCTION, read from the planned normals whichever stones lie either side: an ARRIS, where two of its
//  planes meet. convex / concave = which way it turns; split = light on one side and shade on the other;
//  shade = both sides in shade; lead = how squarely BOTH planes are seen (1: the corner points at the viewer,
//  0: one of them is nearly edge-on); firm = the line class of the stone (0 = a broken, irregular edge).
struct Edge { float crease; float sil; float convex; float concave; float split; float shade; float lead; float firm; };
void arris(vec2 uA, vec2 uB, vec4 aA, vec4 aB, vec4 nA4, vec4 nB4, vec3 V, inout Edge E){
  if (min(aA.a, aB.a) < 0.5) return;
  vec3 nA = nA4.xyz * 2. - 1., nB = nB4.xyz * 2. - 1.;
  float k = smoothstep(0.35, 0.8, 1.0 - dot(nA, nB));
  if (k <= 0.0) return;
  // the two places lie on one surface (a step in depth is a silhouette, not an arris) ...
  vec3 dP = mat3(uInvView) * (viewPos(uB, aB.r) - viewPos(uA, aA.r));
  float len = max(length(dP), 1e-5);
  k *= 1.0 - smoothstep(10.0, 16.0, len / (max(aA.r, aB.r) * uPixelK));
  // ... and it turns outward (the normals part along the step from one to the other) or inward
  float s = dot(nB - nA, dP) / len;
  float cv = smoothstep(0.0, 0.4, s) * k, cc = smoothstep(0.0, 0.4, -s) * k;
  if (cv + cc > E.convex + E.concave){
    E.convex = cv; E.concave = cc; E.split = abs(aA.b - aB.b); E.shade = 1.0 - max(aA.b, aB.b);
    E.lead = smoothstep(0.18, 0.45, min(abs(dot(nA, V)), abs(dot(nB, V))));
    E.firm = min(nA4.a, nB4.a);
  }
}
Edge edgesAt(vec2 uv, vec3 V){
  vec2 e = uTexel;
  vec4 nr = texture(tNormal, uv), ax = texture(tAux, uv);
  vec3 n0 = nr.xyz * 2. - 1.;
  vec2 uL = uv - vec2(e.x, 0.), uR = uv + vec2(e.x, 0.), uD = uv - vec2(0., e.y), uU = uv + vec2(0., e.y);
  vec4 aL = texture(tAux, uL), aR = texture(tAux, uR), aD = texture(tAux, uD), aU = texture(tAux, uU);
  vec4 nL4 = texture(tNormal, uL), nD4 = texture(tNormal, uD);
  vec3 nL = nL4.xyz * 2. - 1., nD = nD4.xyz * 2. - 1.;
  float d = ax.r;
  float dmax = max(max(aL.r, aR.r), max(aD.r, aU.r)), dmin = min(min(aL.r, aR.r), min(aD.r, aU.r));
  float sameDepth = 1.0 - smoothstep(0.02, 0.05, (dmax - dmin) / max(d, 0.1));
  float cr = max(1. - dot(n0, nL), 1. - dot(n0, nD));
  float sameStone = step(abs(aL.g - ax.g) + abs(aD.g - ax.g), 0.002);
  Edge E = Edge(0., 0., 0., 0., 0., 0., 0., 0.);
  E.crease = smoothstep(0.3, 0.6, cr) * ax.a * min(aL.a, aD.a) * sameDepth * sameStone;
  E.sil = smoothstep(0.04, 0.10, (dmax - d) / max(d, 0.1)) * ax.a;
  if (uArris > 0.0 && ax.a > 0.5){
    arris(uL, uR, aL, aR, nL4, texture(tNormal, uR), V, E);
    arris(uD, uU, aD, aU, nD4, texture(tNormal, uU), V, E);
  }
  return E;
}
// the arris alone, read r pixels either side: the broad part of a stroke
Edge arrisWide(vec2 uv, vec3 V, float r){
  vec2 e = uTexel * r;
  Edge E = Edge(0., 0., 0., 0., 0., 0., 0., 0.);
  vec2 uL = uv - vec2(e.x, 0.), uR = uv + vec2(e.x, 0.), uD = uv - vec2(0., e.y), uU = uv + vec2(0., e.y);
  arris(uL, uR, texture(tAux, uL), texture(tAux, uR), texture(tNormal, uL), texture(tNormal, uR), V, E);
  arris(uD, uU, texture(tAux, uD), texture(tAux, uU), texture(tNormal, uD), texture(tNormal, uU), V, E);
  return E;
}

void main(){
  // --- the unsteady hand. Built stone is drawn with ruled edges by the geometry; a painter's edges
  // wander by a pixel or two. The picture is re-read through a small displacement that is fixed to
  // the surface (so it does not swim) but constant in size on the canvas.
  vec2 uv = vUv;
  {
    // the surface that decides: this pixel if it is built stone, otherwise the nearest stone within a
    // few pixels (so a wall's outline against sky or grass wanders both ways, not only inward)
    vec4 a0 = texture(tAux, vUv);
    vec2 pu = vUv; float best = a0.a > 0.5 ? a0.r : 1e9; float nStone = 0.0;
    for (int k = 0; k < 8; k++){
      int kk = k & 3;
      // a ring as wide as the largest displacement, so a moved outline is never clipped by the search
      vec2 dk = k < 4 ? vec2(kk < 2 ? -1.0 : 1.0, (kk == 0 || kk == 2) ? -1.0 : 1.0) * 2.3
                      : (kk == 0 ? vec2(3.2, 0.0) : kk == 1 ? vec2(-3.2, 0.0) : kk == 2 ? vec2(0.0, 3.2) : vec2(0.0, -3.2));
      vec2 tu = vUv + dk * uTexel;
      vec4 ak = texture(tAux, tu);
      nStone += step(0.5, ak.a);
      if (ak.a > 0.5 && ak.r < best * 0.9) { best = ak.r; pu = tu; }
    }
    // a lone stone tap beside a ragged edge would throw a speck into the sky
    if (best < 1e8 && (a0.a > 0.5 || nStone > 2.5)){
      vec3 ray0 = vec3((pu * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0);
      vec3 w0 = (uInvView * vec4(ray0 * min(best, 3000.0), 1.0)).xyz;
      vec2 q0 = w0.xz * 0.045 + w0.y * vec2(0.037, 0.058);
      vec2 wob = vec2(texture(tBrush, q0).a, texture(tBrush, q0 + 0.47).a) - 0.5;
      wob += (vec2(texture(tBrush, q0 * 2.7 + 0.2).a, texture(tBrush, q0 * 2.7 + 0.71).a) - 0.5) * 0.45;
      { vec2 dv = wob * uWobble * 8.0; uv += dv * min(1.0, 3.0 / max(length(dv), 1e-3)) * uTexel * (1.0 - smoothstep(45.0, 100.0, best))
          * (1.0 - smoothstep(0.2, 0.45, texture(tNormal, pu).a)); }   // dressed and firm edges keep their drawing
    }
  }
  vec4 col = texture(tColor, uv);
  vec4 nrm = texture(tNormal, uv);
  vec4 aux = texture(tAux, uv);
  vec3 c = col.rgb;
  float d = aux.r;
  vec3 n0 = nrm.xyz * 2. - 1.;
  // a cel-drawn character (CHAR_ID): no drawn edges, pale lips, kiwa or arrises are laid on him (his ink is a
  // hull and his tones are his own); the cloud shadow and the rest of the picture's light do fall on him
  float cel = step(abs(aux.g - ${CHAR_ID}), 0.004);

  // --- cloud shadow, laid on the paint before the drawing
  if (uCloud > 0.0 && d < 5000.0){
    vec3 rc = vec3((uv * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0);
    vec3 pw = (uInvView * vec4(rc * d, 1.0)).xyz;
    // (the land's own height is counted only in part: taken in full, a shadow on a slope that falls away
    // from the sun is drawn out into streaks)
    vec2 P = pw.xz + uSunDir.xz * ((CS_ALT - pw.y * 0.35) / uSunDir.y);
    vec2 P0 = SUBJECT.xz + uSunDir.xz * (CS_ALT / uSunDir.y);
    vec2 Pc = P - CS_WIND * (CS_SPEED * uTime);
    float e = cloudField(Pc, uCloudDbg == 3 ? 1e5 : dot(P - P0, vec2(-CS_WIND.y, CS_WIND.x)));
    // a firm, brushed edge (painted like the tree shadows, not a lighting gradient): small dabs that ride
    // with the cloud fray it, and the half-tone is only a metre or so, never thinner than a couple of pixels
    e += (texture(tBrush, Pc / 38.0 + 0.61).a - 0.5) * 0.07;
    float w = 0.018 + d * uPixelK * 0.012;
    float m = smoothstep(-w, w, e);
    // only paint that is in the sun changes: cast and form shadow are already the cool tone
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float lit = aux.a > 0.5 ? step(0.5, aux.b) : smoothstep(-0.06, 0.10, c.r - c.b + (lum - 0.55) * 0.6);
    // the tone: not grey. Greens go to a cooler mid green, everything else toward violet-grey
    float gr = smoothstep(0.0, 0.08, c.g - max(c.r, c.b));
    vec3 sh = c * mix(vec3(0.70, 0.68, 0.84), vec3(0.63, 0.80, 0.83), gr) + lum * vec3(0.0, 0.01, 0.04);
    // haze lies in front of far shadows
    float k = uCloud * 0.58 * mix(1.0, 0.3, smoothstep(150.0, 2600.0, d));
    c = mix(c, sh, m * lit * k);
    if (uCloudDbg == 1) c = mix(c, vec3(1.0, 0.2, 0.2), m * 0.6);
    if (uCloudDbg == 2) c = vec3(lit);
  }

  if (cel > 0.5){ o = vec4(c, col.a); return; }

  // world position of this pixel, so that line break-up is anchored to the surface, not the screen
  vec3 ray = vec3((uv * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0);
  vec3 wp = (uInvView * vec4(ray * min(d, 3000.0), 1.0)).xyz;
  float br = texture(tBrush, wp.xz * 0.31 + wp.y * 0.27).b;
  float br2 = texture(tBrush, wp.xz * 0.083 + wp.y * 0.11 + 0.3).r;
  float gap = smoothstep(0.30, 0.52, br * 0.55 + br2 * 0.55);       // ~half of every line drops out

  // edges are evaluated at four half-pixel offsets and averaged: a soft ~2 px brush line
  // instead of a hard 1 px step that flickers as the camera moves
  float crease = 0.0, sil = 0.0;
  vec3 V = normalize(uInvView[3].xyz - wp);
  Edge A = Edge(0., 0., 0., 0., 0., 0., 0., 0.); float aW = 0.0;      // the arris here (its qualities weighted by its presence)
  for (int k = 0; k < 4; k++){
    vec2 o2 = vec2(k < 2 ? -0.5 : 0.5, (k == 0 || k == 2) ? -0.5 : 0.5) * uTexel;
    Edge e = edgesAt(uv + o2, V);
    crease += e.crease * 0.25; sil += e.sil * 0.25;
    float w = e.convex + e.concave;
    A.convex += e.convex * 0.25; A.concave += e.concave * 0.25;
    A.split += e.split * w; A.shade += e.shade * w; A.lead += e.lead * w; A.firm += e.firm * w; aW += w;
  }
  if (aW > 0.0){ A.split /= aW; A.shade /= aW; A.lead /= aW; A.firm /= aW; }
  float facing = dot(n0, uSunDir);
  float fade = 1.0 - smoothstep(22.0, 60.0, d);
  // dark painted line: a deeper, more saturated version of the local colour (never black)
  vec3 ink = c * vec3(0.50, 0.46, 0.58);
  // the drawing thins out toward the back planes of the building: firm in front, nearly lost behind
  float dC = distance(uInvView[3].xyz, SUBJECT);
  float back = clamp((d - max(dC - 12.0, 1.5)) / 24.0, 0.0, 1.0);
  float lineK = mix(1.0, 0.3, smoothstep(0.25, 0.8, back));
  float backK = lineK;
  // lost and found: where the tones on either side of an edge are close, the painter lets it go
  {
    vec3 L = vec3(0.299, 0.587, 0.114);
    float l0 = dot(c, L), dl = 0.0;
    for (int k = 0; k < 4; k++){
      vec2 o3 = vec2(k < 2 ? -1.0 : 1.0, (k == 0 || k == 2) ? -1.0 : 1.0) * 2.5 * uTexel;
      dl = max(dl, abs(dot(texture(tColor, uv + o3).rgb, L) - l0));
    }
    lineK *= smoothstep(0.035, 0.11, dl);
    lineK = mix(lineK, 1.0, step(0.75, nrm.a));               // firm found edges are never lost
  }
  float dark = max(crease * 0.55, sil * 0.6 * step(facing, 0.25));   // joints are painted in the stone shader
  c = mix(c, ink, dark * gap * fade * uLine * lineK);
  // --- the construction (LICENCE: the hierarchy of edges). Of all the arrises of a built thing the painter
  // draws the few that decide its form FROM WHERE HE STANDS, and lets the rest go:
  //  - where two masses meet in a re-entrant corner the dark gathers: a line, in light and in shade;
  //  - a corner with light on one side and shade on the other is already drawn by the two tones: no line
  //    (the lit side keeps its pale lip, below);
  //  - a corner with ONE tone either side would be lost: it is found, as a line, only where it points at the
  //    viewer (both planes seen squarely) - the leading corner of a mass. Seen edge-on it is let go;
  //  - every line is laid with a pressure that swells and lifts in long runs fixed to the stone.
  float arrisPale = 0.0;
  if (uArris > 0.0 && aux.a > 0.5 && d < 75.0){
    float run = texture(tBrush, wp.xz * 0.043 + wp.y * 0.061 + 0.19).g;
    float press = smoothstep(0.36, 0.62, run * 0.7 + br2 * 0.3);
    // (where the pressure is full the stroke is broad: the same arris read two pixels either side)
    float heavy = smoothstep(0.50, 0.78, run * 0.6 + br * 0.4) * (1.0 - smoothstep(18.0, 40.0, d));
    if (heavy > 0.0){
      Edge W = arrisWide(uv, V, 2.0);
      if (aW <= 0.0){ A.split = W.split; A.shade = W.shade; A.lead = W.lead; A.firm = W.firm; }
      A.convex = max(A.convex, W.convex * heavy); A.concave = max(A.concave, W.concave * heavy);
    }
    float firm = mix(0.35, 1.0, smoothstep(0.05, 0.25, A.firm));
    float contact = A.concave * mix(0.55, 0.9, A.shade) * mix(0.12, 1.0, press);
    float found = A.convex * (1.0 - A.split) * A.lead * press * mix(0.40, 0.80, A.shade);
    float aFade = 1.0 - smoothstep(30.0, 75.0, d);
    c = mix(c, c * vec3(0.47, 0.43, 0.57), max(contact, found) * firm * aFade * backK * uArris);
    arrisPale = A.convex * A.split * firm;
    if (uEdgeDbg == 1) c = vec3(A.convex, A.concave, A.split * (A.convex + A.concave));
    if (uEdgeDbg == 2) c = mix(vec3(dot(c, vec3(0.333))) * 0.5 + 0.25, vec3(1.0, 0.1, 0.1), max(contact, found) * firm * aFade * backK);
  } else if (uEdgeDbg == 1) c = vec3(0.0);
  // pale highlight line where a sunlit plane ends (wall tops, lit corners)
  float hl = max(max(sil, crease), arrisPale * uArris) * step(0.25, facing) * step(0.5, aux.b) * smoothstep(0.35, 0.6, br2 * 0.6 + br * 0.5);
  c = mix(c, vec3(1.0, 0.985, 0.93), hl * fade * uEdgeLight * 0.55 * smoothstep(1.5, 4.5, d));

  // --- the edge of a shadow (LICENCE: kiwa). Paint does not lay a shadow as one even tone: it is deepest and
  // richest where it meets the light and opens toward its middle, and the light is cleanest against the shade.
  // Neither is so in nature; both are what makes a painted shadow read as light. It is taken from the share of
  // light among what is built round this place ON THE CANVAS, so the pier that stands in shade before a sunlit
  // wall is held against it too, from wherever it is seen.
  if (uKiwa > 0.0 && aux.a > 0.5 && d < 200.0){
    vec2 lb = texture(tLitBlur, uv).rg;
    float share = lb.r / max(lb.g, 1e-3) + (br2 - 0.5) * 0.16;
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float kS = smoothstep(0.03, 0.46, share) * (1.0 - aux.b) * smoothstep(0.26, 0.40, lum);
    float kL = (1.0 - smoothstep(0.54, 0.97, share)) * aux.b;
    // (at evening light and shade stand at one value and part by hue: there the edge is richer, hardly deeper)
    vec3 deepS = mix(vec3(lum), c, 1.25) * mix(vec3(0.79, 0.77, 0.87), vec3(0.93, 0.87, 0.97), uEve);
    c = mix(c, deepS, kS * uKiwa);
    c = mix(c, 1.0 - (1.0 - c) * vec3(0.66, 0.70, 0.84), kL * uKiwa * (1.0 - 0.5 * uEve));
    if (uEdgeDbg == 3) c = vec3(0.5 + 0.5 * (kL - kS));
  }

  // --- the boundaries that survive in the distance (COUNTER above)
  if (uCounter > 0.0 && d < 5000.0){
    vec2 q = texture(tDepthBlur, uv).rg;
    float w = smoothstep(${v1(COUNTER.from[0])}, ${v1(COUNTER.from[1])}, d) * smoothstep(0.04, 0.3, q.g) * (1.0 - step(0.5, aux.a));
    float dl = min(log2(max(d, 0.1)), ${v1(COUNTER.sky)}) - q.r / max(q.g, 1e-3);
    // lost and found: long stretches fixed to the land decide where an edge is held
    vec3 dirW = normalize(wp - SUBJECT);
    vec2 az = dirW.xz * 1.9 + vec2(dirW.y * 3.0 + log2(max(d, 1.0)) * 0.21);
    float keep = smoothstep(0.34, 0.58, texture(tBrush, az * 0.23 + 0.13).a);
    // the mist: one flat step, its edge cut by broad dabs that sit on the land
    float nz = (texture(tBrush, az * 1.7).g - 0.5) * 0.30 + (texture(tBrush, az * 5.3 + 0.3).r - 0.5) * 0.10;
    float mx = dl + nz - ${v1(COUNTER.mist)};
    float mist = smoothstep(-1.0, 1.0, mx / max(fwidth(mx), 0.012)) * keep;
    float crest = smoothstep(${v1(COUNTER.crest[0])}, ${v1(COUNTER.crest[1])}, -dl) * smoothstep(${v1(COUNTER.crestFrom[0])}, ${v1(COUNTER.crestFrom[1])}, d) * mix(0.4, 1.0, keep);
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    // deeper and a little richer, never grey: the plane's own colour with less air in it
    vec3 deep = mix(vec3(lum), c, 1.22) * vec3(0.84, 0.87, 0.90);
    c = mix(c, deep, crest * w * uCounter * ${v1(COUNTER.deep)});
    c = mix(c, uHazeCol, mist * w * uCounter * ${v1(COUNTER.pale)});
    if (uCloudDbg == 5) c = vec3(0.5) + vec3(-crest, mist - crest, mist) * 0.5 * w;
  }

  o = vec4(c, col.a);
}
`;

// ---- 4. diffusion bloom
const BRIGHT_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tSrc;
void main(){
  vec3 c = texture(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  o = vec4(c * smoothstep(0.62, 0.95, l), 1.0);
}
`;

// ---- 5. final: bloom add, grade, paper grain, vignette
const FINAL_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tSrc, tBloom, tPaper, tRaw, tNormal, tAux, tHold;
uniform vec2 uRes; uniform float uBloom, uGrain, uVignette, uHold, uPara, uEve; uniform int uMode; uniform vec3 uSunDir; uniform vec3 uSunScreen;
void main(){
  if (uMode == 1) { o = vec4(texture(tRaw, vUv).rgb, 1.0); return; }            // paint, before filter/ink/photography
  if (uMode >= 2) {
    vec3 n = texture(tNormal, vUv).xyz * 2.0 - 1.0; float d = texture(tAux, vUv).r;
    if (uMode == 2) {                                                           // what the geometry "really" is
      float l = max(dot(n, uSunDir), 0.0) * 0.75 + 0.25;
      vec3 c = mix(vec3(0.72) * l, vec3(0.62, 0.72, 0.85), 1.0 - exp(-d / 900.0));
      o = vec4(d > 5000.0 ? vec3(0.62, 0.72, 0.85) : c, 1.0); return;
    }
    if (uMode == 3) { o = vec4(n * 0.5 + 0.5, 1.0); return; }
    o = vec4(vec3(1.0 - log2(max(d, 1.0)) / 13.0), 1.0); return;
  }
  vec3 c = texture(tSrc, vUv).rgb;
  vec3 b = texture(tBloom, vUv).rgb;
  c = 1.0 - (1.0 - c) * (1.0 - b * uBloom);          // screen blend = diffusion filter
  // paper tooth, fixed to the canvas
  float p = texture(tPaper, vUv * uRes / 512.0).r;
  c *= 1.0 + (p - 0.5) * uGrain;
  // "para": a soft cool darkening from the lower corners instead of a lens vignette
  vec2 q = vUv - 0.5;
  float v = smoothstep(0.35, 0.95, length(q * vec2(1.0, 0.85)) * 1.25);
  c = mix(c, c * vec3(0.84, 0.88, 0.95), v * uVignette);
  // (LICENCE: para light) ... and a warm lightening laid over the canvas from the side the sun stands on - a
  // gradient of the photography, not of the scene: none with the sun behind the viewer, most looking toward it
  if (uPara > 0.0 && uSunScreen.z > 0.0){
    float g = smoothstep(0.0, 1.1, dot(q * vec2(uRes.x / uRes.y, 1.0), uSunScreen.xy) * 1.25 + 0.22);
    vec3 warm = mix(vec3(1.0, 0.95, 0.80), vec3(1.0, 0.80, 0.60), uEve);
    c = 1.0 - (1.0 - c) * (1.0 - warm * g * g * uSunScreen.z * uPara * mix(0.16, 0.26, uEve));
  }
  // a change of hour or season: the picture that stood before it, dissolving out (see snapshot())
  if (uHold > 0.0) c = mix(c, texture(tHold, vUv).rgb, uHold);
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

export class Pipeline {
  constructor(renderer, params) {
    this.r = renderer;
    this.p = params;
    this.tri = new THREE.Mesh(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)));
    this.tri.frustumCulled = false;
    this.fsScene = new THREE.Scene();
    this.fsScene.add(this.tri);
    this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // sun shadow
    // (two maps at most: the state that is shown and, during a change of hour or season, the one it comes from;
    // each is painted when its state is first wanted and repainted if its slot was given to another meanwhile)
    this.shadowSlots = []; this.shadowTick = 0;
    this.shadowCam = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 260);
    G.uShadowTexel.value = 1 / 2048;   // blur step in UV: kept at ~5 cm of world regardless of map resolution

    this.kuw = pass(KUWAHARA_FS, { tColor: { value: null }, tAux: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 3 },
      tBrush: G.uBrush, uInvView: { value: new THREE.Matrix4() }, uTanHalf: { value: new THREE.Vector2() }, uLensShift: { value: 0 }, uPixelK: G.uPixelK,
      uQuiet: { value: 1 }, uDbg: { value: DBG } });
    this.depthDown = pass(DEPTH_DOWN_FS, { tAux: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.litDown = pass(LIT_DOWN_FS, { tAux: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.blur = pass(BLUR_FS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.comp = pass(COMPOSITE_FS, {
      tColor: { value: null }, tNormal: { value: null }, tAux: { value: null }, tDepthBlur: { value: null },
      tBrush: G.uBrush, uTexel: { value: new THREE.Vector2() }, uHazeCol: G.uHazeCol, uSunDir: G.uSunDir,
      uLine: { value: 1 }, uCounter: { value: 1 }, uEdgeLight: { value: 1 }, uWobble: { value: 1 }, uPixelK: G.uPixelK,
      uInvView: { value: new THREE.Matrix4() }, uTanHalf: { value: new THREE.Vector2() }, uLensShift: { value: 0 },
      uTime: G.uTime, uCloud: { value: CSHADOW }, uCloudDbg: { value: CSHADOW_DBG },
      tLitBlur: { value: null }, uArris: { value: 1 }, uKiwa: { value: 1 }, uEve: G.uEve, uEdgeDbg: { value: EDGE_DBG },
    });
    this.bright = pass(BRIGHT_FS, { tSrc: { value: null } });
    this.final = pass(FINAL_FS, {
      tSrc: { value: null }, tBloom: { value: null }, tPaper: { value: null }, tRaw: { value: null }, tNormal: { value: null }, tAux: { value: null },
      uMode: { value: 0 }, uSunDir: G.uSunDir,
      uRes: { value: new THREE.Vector2() }, uBloom: { value: 0.5 }, uGrain: { value: 0.1 }, uVignette: { value: 0.5 },
      tHold: { value: null }, uHold: { value: 0 },
      uPara: { value: 1 }, uEve: G.uEve, uSunScreen: { value: new THREE.Vector3() },
    });
  }

  setSize(w, h) {
    this.w = w; this.h = h;
    const dispose = (t) => t && t.dispose();
    [this.gbuf, this.rtA, this.rtB, this.q1, this.q2, this.q3, this.q4, this.b1, this.b2, this.hold].forEach(dispose);
    this.gbuf = new THREE.WebGLRenderTarget(w, h, { count: 3, samples: this.p.msaa, depthBuffer: true, type: THREE.UnsignedByteType });
    this.gbuf.textures[2].type = THREE.HalfFloatType;
    for (const t of this.gbuf.textures) { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }
    this.gbuf.textures[2].minFilter = this.gbuf.textures[2].magFilter = THREE.NearestFilter;
    // the paint filter reads broad dabs from the mips
    this.gbuf.textures[0].generateMipmaps = true; this.gbuf.textures[0].minFilter = THREE.LinearMipmapLinearFilter;
    const mk = (W, H, type = THREE.UnsignedByteType) => {
      const t = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false, type });
      t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter; t.texture.generateMipmaps = false;
      return t;
    };
    this.rtA = mk(w, h); this.rtB = mk(w, h); this.hold = mk(w, h);
    this.final.uniforms.tHold.value = this.hold.texture; this.final.uniforms.uHold.value = 0;
    const qw = Math.max(2, w >> 2), qh = Math.max(2, h >> 2);
    this.q1 = mk(qw, qh, THREE.HalfFloatType); this.q2 = mk(qw, qh, THREE.HalfFloatType);
    this.q3 = mk(qw, qh, THREE.HalfFloatType); this.q4 = mk(qw, qh, THREE.HalfFloatType);
    this.b1 = mk(qw, qh); this.b2 = mk(qw, qh);
    this.qTexel = new THREE.Vector2(1 / qw, 1 / qh);
  }

  // hands the post passes to the driver to link (see precompile() in src/main.js); nothing waits for them
  precompile() {
    const r = this.r, prev = r.getRenderTarget();
    for (const [m, t] of [[this.kuw, this.rtA], [this.depthDown, this.q1], [this.litDown, this.q3], [this.blur, this.q2], [this.comp, this.rtB],
      [this.bright, this.b1], [this.final, this.hold], [this.final, null]]) {
      this.tri.material = m;
      r.setRenderTarget(t);
      r.compile(this.fsScene, this.fsCam);
    }
    r.setRenderTarget(prev);
  }

  _fs(material, target) {
    this.tri.material = material;
    this.r.setRenderTarget(target);
    this.r.render(this.fsScene, this.fsCam);
  }

  // Makes the sun map of the state `key` the current one (G.uShadowMap / G.uShadowMat), painting it if no slot
  // holds it (or if `force`). Returns true if it was painted. `keep` is a key whose slot must not be taken.
  shadowFor(key, keep, scene, sunDir, center, force = false) {
    let slot = this.shadowSlots.find((q) => q.key === key), painted = false;
    if (!slot) {
      if (this.shadowSlots.length < 2) {
        // (its colour is the kind of caster - G.uShadowKind - read blurred, from the mips)
        slot = { rt: this.shadowRT(), mat: new THREE.Matrix4(), used: 0 };
        this._preRT = null;
        this.shadowSlots.push(slot);
      } else slot = this.shadowSlots.filter((q) => q.key !== keep).sort((a, b) => a.used - b.used)[0];
      slot.key = key; force = true;
    }
    slot.used = ++this.shadowTick;
    if (force) { this.renderShadow(scene, sunDir, center, slot); painted = true; }
    G.uShadowMap.value = slot.rt.depthTexture;
    G.uShadowKind.value = slot.rt.texture;
    G.uShadowMat.value.copy(slot.mat);
    return painted;
  }

  // a sun map target (the one the next slot will take, so that programs can be linked for it before it is wanted)
  shadowRT() {
    if (this._preRT) return this._preRT;
    const S = 4096, rt = new THREE.WebGLRenderTarget(S, S, { depthBuffer: true, format: THREE.RedFormat });
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.magFilter = THREE.LinearFilter; rt.texture.generateMipmaps = true;
    rt.depthTexture = new THREE.DepthTexture(S, S, THREE.UnsignedIntType);
    rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
    return (this._preRT = rt);
  }

  renderShadow(scene, sunDir, center, slot) {
    const cam = this.shadowCam;
    cam.position.copy(center).addScaledVector(sunDir, 120);
    cam.up.set(0, 1, 0);
    cam.lookAt(center);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    slot.mat.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    G.uShadowMat.value.copy(slot.mat);
    const swapped = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      swapped.push([o, o.material, o.visible]);
      // (shadowOnly: a caster that is no thing in the picture - a shadow the painter lays where none falls)
      if (o.userData.shadowMat) { o.material = o.userData.shadowMat; if (o.userData.shadowOnly) o.visible = true; } else o.visible = false;
    });
    this.r.setRenderTarget(slot.rt);
    this.r.setClearColor(0x000000, 0);
    this.r.clear();
    this.r.render(scene, cam);
    for (const [o, m, v] of swapped) { o.material = m; o.visible = v; }
  }

  // toHold: the finished picture goes to the hold target instead of the screen (the state a change comes from;
  // the next render dissolves out of it by uHold)
  render(scene, camera, toHold = false) {
    const p = this.p, r = this.r;
    r.setRenderTarget(this.gbuf);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);

    // paint filter
    this.kuw.uniforms.tColor.value = this.gbuf.textures[0];
    this.kuw.uniforms.tAux.value = this.gbuf.textures[2];
    this.kuw.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this.kuw.uniforms.uRadius.value = p.kuwahara * (this.h / 720);
    this.kuw.uniforms.uQuiet.value = p.quiet ?? 1;
    this.kuw.uniforms.uInvView.value.copy(camera.matrixWorld);
    const th = Math.tan((camera.fov * Math.PI) / 360);
    this.kuw.uniforms.uTanHalf.value.set(th * camera.aspect, th);
    this.kuw.uniforms.uLensShift.value = camera.projectionMatrix.elements[9];
    this._fs(this.kuw, this.rtA);

    // blurred depth
    this.depthDown.uniforms.tAux.value = this.gbuf.textures[2];
    this.depthDown.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
    this._fs(this.depthDown, this.q1);
    for (let i = 0; i < 3; i++) {
      const s = (i + 1) * 1.6;
      this.blur.uniforms.tSrc.value = this.q1.texture; this.blur.uniforms.uDir.value.set(this.qTexel.x * s, 0); this._fs(this.blur, this.q2);
      this.blur.uniforms.tSrc.value = this.q2.texture; this.blur.uniforms.uDir.value.set(0, this.qTexel.y * s); this._fs(this.blur, this.q1);
    }

    // the painter's licence (src/glsl.js): p.licence switches it while looking
    const lic = p.licence ?? 1;
    this.comp.uniforms.uArris.value = LICENCE.arris * lic; this.comp.uniforms.uKiwa.value = LICENCE.kiwa * lic;
    this.final.uniforms.uPara.value = LICENCE.para * lic; G.uFacing.value = LICENCE.facing * lic;
    // the share of light among what is built (kiwa), blurred over a hand's breadth of canvas
    if (this.comp.uniforms.uKiwa.value > 0) {
      this.litDown.uniforms.tAux.value = this.gbuf.textures[2];
      this.litDown.uniforms.uTexel.value.set(1 / this.w, 1 / this.h);
      this._fs(this.litDown, this.q3);
      for (let i = 0; i < 3; i++) {
        const s = (i + 1) * 1.2;
        this.blur.uniforms.tSrc.value = this.q3.texture; this.blur.uniforms.uDir.value.set(this.qTexel.x * s, 0); this._fs(this.blur, this.q4);
        this.blur.uniforms.tSrc.value = this.q4.texture; this.blur.uniforms.uDir.value.set(0, this.qTexel.y * s); this._fs(this.blur, this.q3);
      }
    }

    // composite
    const cu = this.comp.uniforms;
    cu.tLitBlur.value = this.q3.texture;
    cu.tColor.value = this.rtA.texture; cu.tNormal.value = this.gbuf.textures[1]; cu.tAux.value = this.gbuf.textures[2];
    cu.tDepthBlur.value = this.q1.texture; cu.uTexel.value.set(1 / this.w, 1 / this.h);
    cu.uLine.value = p.line; cu.uCounter.value = p.counter ?? 1; cu.uWobble.value = p.wobble ?? 1;
    cu.uInvView.value.copy(camera.matrixWorld);
    cu.uTanHalf.value.set(th * camera.aspect, th);
    cu.uLensShift.value = camera.projectionMatrix.elements[9];
    this._fs(this.comp, this.rtB);

    // bloom
    this.bright.uniforms.tSrc.value = this.rtB.texture; this._fs(this.bright, this.b1);
    for (let i = 0; i < 2; i++) {
      const s = (i + 1) * 1.5;
      this.blur.uniforms.tSrc.value = this.b1.texture; this.blur.uniforms.uDir.value.set(this.qTexel.x * s, 0); this._fs(this.blur, this.b2);
      this.blur.uniforms.tSrc.value = this.b2.texture; this.blur.uniforms.uDir.value.set(0, this.qTexel.y * s); this._fs(this.blur, this.b1);
    }

    const fu = this.final.uniforms;
    fu.tSrc.value = this.rtB.texture; fu.tBloom.value = this.b1.texture;
    fu.tRaw.value = this.gbuf.textures[0]; fu.tNormal.value = this.gbuf.textures[1]; fu.tAux.value = this.gbuf.textures[2]; fu.uMode.value = p.mode | 0;
    {
      // where the sun stands on the canvas: xy = the direction to it from the middle of the picture, z = how far the view is turned toward it
      const sv = this._sv ?? (this._sv = new THREE.Vector3());
      sv.copy(G.uSunDir.value).transformDirection(camera.matrixWorldInverse);
      const l = Math.hypot(sv.x, sv.y) || 1;
      fu.uSunScreen.value.set(sv.x / l, sv.y / l, Math.min(1, Math.max(0, (-sv.z + 0.15) / 0.8)) * Math.min(1, l * 3));
    }
    fu.uRes.value.set(this.w, this.h); fu.uBloom.value = p.bloom; fu.uGrain.value = p.grain; fu.uVignette.value = p.vignette;
    if (toHold) { const h = fu.uHold.value; fu.uHold.value = 0; fu.tHold.value = null; this._fs(this.final, this.hold); fu.tHold.value = this.hold.texture; fu.uHold.value = h; }
    else this._fs(this.final, null);
  }
}
