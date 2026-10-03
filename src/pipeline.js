// Render pipeline: sun shadow depth -> scene (3 targets) -> paint filter -> ink & depth composite
// -> diffusion bloom -> grade/grain.
import * as THREE from 'three';
import { G, HEAD } from './glsl.js';

const FS_VS = HEAD + /* glsl */`
in vec3 position;
out vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// cloud shadows: ?cshadow=0..2 scales their strength (0 = off, 1 = default)
const _q = new URLSearchParams(globalThis.location?.search ?? '');
const CSHADOW = _q.has('cshadow') ? Math.max(0, Math.min(2, parseFloat(_q.get('cshadow')) || 0)) : 1;
const CSHADOW_DBG = parseInt(_q.get('cshadowdbg') ?? '0') || 0;

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

// ---- 1. paint filter: 4-sector Kuwahara. Flattens small detail into dabs, rounds corners,
// keeps edges hard. Per-pixel strength comes from colour alpha.
const KUWAHARA_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tColor, tAux; uniform vec2 uTexel; uniform float uRadius;
// Generalised Kuwahara with 8 smooth sectors and polynomial weights (after Kyprianidis).
// Each pixel takes the mean of whichever surrounding sector is the most uniform, which turns
// fine detail into flat dabs with crisp borders - gouache, in other words.
void main(){
  vec4 c0 = texture(tColor, vUv);
  if (uRadius < 0.5 || texture(tAux, vUv).r > 5000.0) { o = c0; return; }   // sky needs no filtering
  const int R = 3;                       // fixed 7x7 tap grid, spread over the radius (bilinear taps)
  float stepPx = uRadius / 3.0;
  float zeta = 2.0 / 3.0;
  const float zc = 0.58;
  float eta = (zeta + cos(zc)) / (sin(zc) * sin(zc));
  vec4 m[8]; vec3 s[8];
  for (int k = 0; k < 8; k++){ m[k] = vec4(0.0); s[k] = vec3(0.0); }
  for (int j = -R; j <= R; j++) for (int i = -R; i <= R; i++){
    vec2 v = vec2(float(i), float(j)) / 3.0;
    if (dot(v, v) > 1.0) continue;
    vec3 c = texture(tColor, vUv + vec2(float(i), float(j)) * stepPx * uTexel).rgb;
    float w[8]; float sum = 0.0; float z, vxx, vyy;
    vxx = zeta - eta * v.x * v.x; vyy = zeta - eta * v.y * v.y;
    z = max(0.0,  v.y + vxx); w[0] = z * z; sum += w[0];
    z = max(0.0, -v.x + vyy); w[2] = z * z; sum += w[2];
    z = max(0.0, -v.y + vxx); w[4] = z * z; sum += w[4];
    z = max(0.0,  v.x + vyy); w[6] = z * z; sum += w[6];
    vec2 u = 0.70710678 * vec2(v.x - v.y, v.x + v.y);
    vxx = zeta - eta * u.x * u.x; vyy = zeta - eta * u.y * u.y;
    z = max(0.0,  u.y + vxx); w[1] = z * z; sum += w[1];
    z = max(0.0, -u.x + vyy); w[3] = z * z; sum += w[3];
    z = max(0.0, -u.y + vxx); w[5] = z * z; sum += w[5];
    z = max(0.0,  u.x + vyy); w[7] = z * z; sum += w[7];
    float g = exp(-3.125 * dot(v, v)) / max(sum, 1e-5);
    for (int k = 0; k < 8; k++){
      float wk = w[k] * g;
      m[k] += vec4(c * wk, wk); s[k] += c * c * wk;
    }
  }
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

// ---- 2. blurred log-depth (quarter res) for the depth halo
const DEPTH_DOWN_FS = /* glsl */`
in vec2 vUv; out vec4 o;
uniform sampler2D tAux;
void main(){ float d = texture(tAux, vUv).r; o = vec4(min(log2(max(d, 0.1)), 11.0), 0., 0., 1.); }
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
uniform sampler2D tColor, tNormal, tAux, tDepthBlur, tBrush;
uniform vec2 uTexel; uniform vec3 uHazeCol; uniform vec3 uSunDir;
uniform float uLine, uHalo, uEdgeLight, uWobble;
uniform mat4 uInvView; uniform vec2 uTanHalf; uniform float uLensShift;
uniform float uTime, uPixelK, uCloud; uniform int uCloudDbg;

// ---- cloud shadows. Fair-weather cumulus drift over the country; each lays one flat, cooler tone on
// the sunlit land. The field lives in the plane of the cloud bases (CS_ALT) and is rigid: it only
// translates down-wind on the held clock, so a shadow slides over hill and hollow as one shape (a
// point of the land looks up along the sun to find its cloud).
const float CS_ALT = 1100.0;                      // cloud base above the hilltop datum, m
const float CS_CELL = 430.0;                      // one cloud (or none) per cell of this size, m
const float CS_FILL = 0.45;                       // share of cells that hold a cloud
const vec2  CS_WIND = vec2(0.924, -0.383);        // toward east-north-east (x east, -z north)
const float CS_SPEED = 4.0;                       // m/s
const float CS_LANE = 130.0;                      // half-width of the sunnier lane through the chapel, m
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

// x = crease within one man-made stone, y = silhouette of a man-made form (near side)
vec2 edgesAt(vec2 uv){
  vec2 e = uTexel;
  vec4 nr = texture(tNormal, uv), ax = texture(tAux, uv);
  vec3 n0 = nr.xyz * 2. - 1.;
  vec4 aL = texture(tAux, uv - vec2(e.x, 0.)), aR = texture(tAux, uv + vec2(e.x, 0.));
  vec4 aD = texture(tAux, uv - vec2(0., e.y)), aU = texture(tAux, uv + vec2(0., e.y));
  vec3 nL = texture(tNormal, uv - vec2(e.x, 0.)).xyz * 2. - 1., nD = texture(tNormal, uv - vec2(0., e.y)).xyz * 2. - 1.;
  float d = ax.r;
  float dmax = max(max(aL.r, aR.r), max(aD.r, aU.r)), dmin = min(min(aL.r, aR.r), min(aD.r, aU.r));
  float sameDepth = 1.0 - smoothstep(0.02, 0.05, (dmax - dmin) / max(d, 0.1));
  float cr = max(1. - dot(n0, nL), 1. - dot(n0, nD));
  float sameStone = step(abs(aL.g - ax.g) + abs(aD.g - ax.g), 0.002);
  float crease = smoothstep(0.3, 0.6, cr) * ax.a * min(aL.a, aD.a) * sameDepth * sameStone;
  float sil = smoothstep(0.04, 0.10, (dmax - d) / max(d, 0.1)) * ax.a;
  return vec2(crease, sil);
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

  // --- cloud shadow, laid on the paint before the drawing
  if (uCloud > 0.0 && d < 5000.0){
    vec3 rc = vec3((uv * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0);
    vec3 pw = (uInvView * vec4(rc * d, 1.0)).xyz;
    // (the land's own height is counted only in part: taken in full, a shadow on a slope that falls away
    // from the sun is drawn out into streaks)
    vec2 P = pw.xz + uSunDir.xz * ((CS_ALT - pw.y * 0.35) / uSunDir.y);
    vec2 P0 = vec2(0.0, -1.0) + uSunDir.xz * (CS_ALT / uSunDir.y);
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

  // world position of this pixel, so that line break-up is anchored to the surface, not the screen
  vec3 ray = vec3((uv * 2. - 1. + vec2(0.0, uLensShift)) * uTanHalf, -1.0);
  vec3 wp = (uInvView * vec4(ray * min(d, 3000.0), 1.0)).xyz;
  float br = texture(tBrush, wp.xz * 0.31 + wp.y * 0.27).b;
  float br2 = texture(tBrush, wp.xz * 0.083 + wp.y * 0.11 + 0.3).r;
  float gap = smoothstep(0.30, 0.52, br * 0.55 + br2 * 0.55);       // ~half of every line drops out

  // edges are evaluated at four half-pixel offsets and averaged: a soft ~2 px brush line
  // instead of a hard 1 px step that flickers as the camera moves
  float crease = 0.0, sil = 0.0;
  for (int k = 0; k < 4; k++){
    vec2 o2 = vec2(k < 2 ? -0.5 : 0.5, (k == 0 || k == 2) ? -0.5 : 0.5) * uTexel;
    vec2 e = edgesAt(uv + o2);
    crease += e.x * 0.25; sil += e.y * 0.25;
  }
  float facing = dot(n0, uSunDir);
  float fade = 1.0 - smoothstep(22.0, 60.0, d);
  // dark painted line: a deeper, more saturated version of the local colour (never black)
  vec3 ink = c * vec3(0.50, 0.46, 0.58);
  // the drawing thins out toward the back planes of the building: firm in front, nearly lost behind
  float dC = distance(uInvView[3].xyz, vec3(0.0, 4.0, -1.0));
  float back = clamp((d - max(dC - 12.0, 1.5)) / 24.0, 0.0, 1.0);
  float lineK = mix(1.0, 0.3, smoothstep(0.25, 0.8, back));
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
  // pale highlight line where a sunlit plane ends (wall tops, lit corners)
  float hl = max(sil, crease) * step(0.25, facing) * step(0.5, aux.b) * smoothstep(0.35, 0.6, br2 * 0.6 + br * 0.5);
  c = mix(c, vec3(1.0, 0.985, 0.93), hl * fade * uEdgeLight * 0.55 * smoothstep(1.5, 4.5, d));

  // --- plane separation inside the building: stone that sits well behind the stone around it
  // (the far wall seen through an arcade) takes one flat step paler and bluer, as on the boards.
  // Man-made surfaces in shadow only, and a step - no soft halo round silhouettes.
  float lb = texture(tDepthBlur, uv).r;
  float ld = log2(max(d, 0.1));
  float behind = smoothstep(0.22, 0.30, ld - lb) * aux.a * (1.0 - step(0.5, aux.b));
  c = mix(c, vec3(0.584, 0.608, 0.663), behind * uHalo);

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
uniform sampler2D tSrc, tBloom, tPaper, tRaw, tNormal, tAux;
uniform vec2 uRes; uniform float uBloom, uGrain, uVignette; uniform int uMode; uniform vec3 uSunDir;
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
    const S = 4096;
    this.shadowRT = new THREE.WebGLRenderTarget(S, S, { depthBuffer: true });
    this.shadowRT.depthTexture = new THREE.DepthTexture(S, S, THREE.UnsignedIntType);
    this.shadowRT.depthTexture.minFilter = this.shadowRT.depthTexture.magFilter = THREE.NearestFilter;
    this.shadowCam = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 260);
    G.uShadowMap.value = this.shadowRT.depthTexture;
    G.uShadowTexel.value = 1 / 2048;   // blur step in UV: kept at ~5 cm of world regardless of map resolution

    this.kuw = pass(KUWAHARA_FS, { tColor: { value: null }, tAux: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 3 } });
    this.depthDown = pass(DEPTH_DOWN_FS, { tAux: { value: null } });
    this.blur = pass(BLUR_FS, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.comp = pass(COMPOSITE_FS, {
      tColor: { value: null }, tNormal: { value: null }, tAux: { value: null }, tDepthBlur: { value: null },
      tBrush: G.uBrush, uTexel: { value: new THREE.Vector2() }, uHazeCol: G.uHazeCol, uSunDir: G.uSunDir,
      uLine: { value: 1 }, uHalo: { value: 1 }, uEdgeLight: { value: 1 }, uWobble: { value: 1 }, uPixelK: G.uPixelK,
      uInvView: { value: new THREE.Matrix4() }, uTanHalf: { value: new THREE.Vector2() }, uLensShift: { value: 0 },
      uTime: G.uTime, uCloud: { value: CSHADOW }, uCloudDbg: { value: CSHADOW_DBG },
    });
    this.bright = pass(BRIGHT_FS, { tSrc: { value: null } });
    this.final = pass(FINAL_FS, {
      tSrc: { value: null }, tBloom: { value: null }, tPaper: { value: null }, tRaw: { value: null }, tNormal: { value: null }, tAux: { value: null },
      uMode: { value: 0 }, uSunDir: G.uSunDir,
      uRes: { value: new THREE.Vector2() }, uBloom: { value: 0.5 }, uGrain: { value: 0.1 }, uVignette: { value: 0.5 },
    });
  }

  setSize(w, h) {
    this.w = w; this.h = h;
    const dispose = (t) => t && t.dispose();
    [this.gbuf, this.rtA, this.rtB, this.q1, this.q2, this.b1, this.b2].forEach(dispose);
    this.gbuf = new THREE.WebGLRenderTarget(w, h, { count: 3, samples: this.p.msaa, depthBuffer: true, type: THREE.UnsignedByteType });
    this.gbuf.textures[2].type = THREE.HalfFloatType;
    for (const t of this.gbuf.textures) { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }
    this.gbuf.textures[2].minFilter = this.gbuf.textures[2].magFilter = THREE.NearestFilter;
    const mk = (W, H, type = THREE.UnsignedByteType) => {
      const t = new THREE.WebGLRenderTarget(W, H, { depthBuffer: false, type });
      t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter; t.texture.generateMipmaps = false;
      return t;
    };
    this.rtA = mk(w, h); this.rtB = mk(w, h);
    const qw = Math.max(2, w >> 2), qh = Math.max(2, h >> 2);
    this.q1 = mk(qw, qh, THREE.HalfFloatType); this.q2 = mk(qw, qh, THREE.HalfFloatType);
    this.b1 = mk(qw, qh); this.b2 = mk(qw, qh);
    this.qTexel = new THREE.Vector2(1 / qw, 1 / qh);
  }

  _fs(material, target) {
    this.tri.material = material;
    this.r.setRenderTarget(target);
    this.r.render(this.fsScene, this.fsCam);
  }

  renderShadow(scene, sunDir, center) {
    const cam = this.shadowCam;
    cam.position.copy(center).addScaledVector(sunDir, 120);
    cam.up.set(0, 1, 0);
    cam.lookAt(center);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    G.uShadowMat.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const swapped = [];
    scene.traverse((o) => {
      if (!o.isMesh) return;
      swapped.push([o, o.material, o.visible]);
      if (o.userData.shadowMat) o.material = o.userData.shadowMat; else o.visible = false;
    });
    this.r.setRenderTarget(this.shadowRT);
    this.r.clear();
    this.r.render(scene, cam);
    for (const [o, m, v] of swapped) { o.material = m; o.visible = v; }
  }

  render(scene, camera) {
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
    this._fs(this.kuw, this.rtA);

    // blurred depth
    this.depthDown.uniforms.tAux.value = this.gbuf.textures[2];
    this._fs(this.depthDown, this.q1);
    for (let i = 0; i < 2; i++) {
      const s = (i + 1) * 1.6;
      this.blur.uniforms.tSrc.value = this.q1.texture; this.blur.uniforms.uDir.value.set(this.qTexel.x * s, 0); this._fs(this.blur, this.q2);
      this.blur.uniforms.tSrc.value = this.q2.texture; this.blur.uniforms.uDir.value.set(0, this.qTexel.y * s); this._fs(this.blur, this.q1);
    }

    // composite
    const cu = this.comp.uniforms;
    cu.tColor.value = this.rtA.texture; cu.tNormal.value = this.gbuf.textures[1]; cu.tAux.value = this.gbuf.textures[2];
    cu.tDepthBlur.value = this.q1.texture; cu.uTexel.value.set(1 / this.w, 1 / this.h);
    cu.uLine.value = p.line; cu.uHalo.value = p.halo; cu.uWobble.value = p.wobble ?? 1;
    cu.uInvView.value.copy(camera.matrixWorld);
    { const th = Math.tan((camera.fov * Math.PI) / 360); cu.uTanHalf.value.set(th * camera.aspect, th); }
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
    fu.uRes.value.set(this.w, this.h); fu.uBloom.value = p.bloom; fu.uGrain.value = p.grain; fu.uVignette.value = p.vignette;
    this._fs(this.final, null);
  }
}
