// The sky, painted in direction space (a function of view direction only, so it cannot betray parallax).
//
//  1. The WASH: a wet cyan wash thinned to bare paper at the horizon. Its colour comes from one table of
//     measured stops (STOPS, by elevation), baked into a small ramp texture with a smooth monotone
//     interpolation - no steps, no kinks. The hand is uneven: the height at which the ramp is read and
//     the value wander with broad, long diagonal passes and finer mottling, all laid in the stereographic
//     map of the sky (conformal, regular at the zenith: no pole, no ring, no stretched texture overhead).
//  2. The CLOUDS: a few cumulus cards, see extra/sky-clouds.js.
import * as THREE from 'three';
import { mat, G } from './glsl.js';
import { makeCloudCels, buildCloudCards } from './extra/sky-clouds.js';

// elevation (degrees) -> colour wanted in the FINAL picture
export const STOPS = [
  [0, '#F2FEFD'], [2, '#F1FDFC'], [5, '#D2F0FA'], [9, '#B7E3F7'], [14, '#92D4F4'], [24, '#78C8F0'], [50, '#66BBEA'], [90, '#5AB0E5'],
];
// Evening. Two tables: the sky on the side of the low sun (the peach of the horizon climbing through rose
// into the lavender overhead) and the sky opposite (a duller rose band under the same lavender). The picture
// goes from one to the other round the horizon.
export const STOPS_EVE_SUN = [
  [0, '#FFEBC6'], [2, '#FFE5BF'], [5, '#FCD6B0'], [9, '#F4C6B1'], [14, '#DFB8C0'], [24, '#BBAED5'], [50, '#9BA4DA'], [90, '#8895D0'],
];
export const STOPS_EVE_FAR = [
  [0, '#EBCDC6'], [2, '#E8C7C6'], [5, '#DCBBC9'], [9, '#C9B1D0'], [14, '#B6ACD6'], [24, '#A4A8DA'], [50, '#949ED7'], [90, '#8895D0'],
];
// Under snow the day's sky is a winter one: the same wash, a little paler and greyer (the air is full of light
// thrown back by the ground), so that the white land still has something to stand against.
export const STOPS_SNOW = [
  [0, '#F4FAFD'], [2, '#F0F8FC'], [5, '#D9ECF7'], [9, '#C0DEF2'], [14, '#A3CEEC'], [24, '#8CC0E6'], [50, '#7BB3DF'], [90, '#70AADA'],
];
// The photography pass screens a bloom of the bright parts over the picture (pipeline.js: BRIGHT_FS,
// FINAL_FS) and the whole sky is bright, so what is written here comes out paler. The stops are
// corrected for that, for the pipeline's default bloom strength.
const BLOOM = 0.3;
function preBloom(t) {
  const c = t.slice();
  for (let it = 0; it < 30; it++) {
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    const x = Math.min(1, Math.max(0, (l - 0.62) / 0.33)), s = x * x * (3 - 2 * x);
    for (let k = 0; k < 3; k++) c[k] = 1 - (1 - t[k]) / (1 - BLOOM * c[k] * s);
  }
  return c;
}
const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// ramp texture, read at u = sqrt(sin(elevation)) (so the quick change near the horizon gets most texels)
const RAMP_N = 256;
// one row per table: 0 day, 1 evening toward the sun, 2 evening away from it, 3 the day under snow
const TABLES = [STOPS, STOPS_EVE_SUN, STOPS_EVE_FAR, STOPS_SNOW];
function makeRamp() {
  const d = new Uint16Array(RAMP_N * TABLES.length * 4);
  TABLES.forEach((T, row) => rampRow(d, row, T));
  const t = new THREE.DataTexture(d, RAMP_N, TABLES.length, THREE.RGBAFormat, THREE.HalfFloatType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
function rampRow(d, row, T) {
  const xs = T.map((s) => s[0]), cs = T.map((s) => preBloom(hex3(s[1])));
  const n = xs.length;
  // monotone cubic (Fritsch-Carlson) per channel
  const tang = (k) => {
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((cs[i + 1][k] - cs[i][k]) / (xs[i + 1] - xs[i]));
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 3 * (xs[i + 1] - xs[i - 1]) / ((2 * (xs[i + 1] - xs[i]) + xs[i] - xs[i - 1]) / d[i - 1] + (xs[i + 1] - xs[i] + 2 * (xs[i] - xs[i - 1])) / d[i]);
    return m;
  };
  const M = [tang(0), tang(1), tang(2)];
  for (let p = 0; p < RAMP_N; p++) {
    const u = p / (RAMP_N - 1), el = Math.asin(Math.min(1, u * u)) * 180 / Math.PI;
    let i = 0; while (i < n - 2 && el > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (el - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    for (let k = 0; k < 3; k++) {
      const v = (2 * t3 - 3 * t2 + 1) * cs[i][k] + (t3 - 2 * t2 + t) * h * M[k][i] + (-2 * t3 + 3 * t2) * cs[i + 1][k] + (t3 - t2) * h * M[k][i + 1];
      d[(row * RAMP_N + p) * 4 + k] = THREE.DataUtils.toHalfFloat(v);
    }
    d[(row * RAMP_N + p) * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
}

const VS = /* glsl */`
in vec3 position;
out vec3 vDir;
void main(){
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position * 3000.0 + uCamPos, 1.0);
  gl_Position = p.xyww;
}
`;
const FS = /* glsl */`
in vec3 vDir;
uniform sampler2D uCloud, uRamp;
void main(){
  vec3 d = normalize(vDir);
  // stereographic map of the sky: conformal, regular at the zenith
  vec2 s = d.xz / (1.0 + max(d.y, -0.5));
  // the uneven hand: long diagonal passes of the broad brush, and finer mottling where the wash pooled
  vec4 broad = texture(uCloud, vec2(s.x * 0.80 + s.y * 0.60, s.y * 0.80 - s.x * 0.60) * vec2(0.05, 0.30) + 0.21);
  vec4 fine  = texture(uCloud, s * 1.70 + 0.37);
  // the passes of the flat brush: long, nearly level, a little on the slant. They follow the horizon, so they
  // are laid in azimuth and elevation, and are given up toward the zenith (where that map pinches)
  float azt = atan(d.z, d.x) / 6.2831853;
  float lay = 1.0 - smoothstep(0.45, 0.80, d.y);
  vec4 pass = textureLod(uCloud, vec2(azt * 3.0, d.y * 4.0 + azt * 5.0), log2(max(length(fwidth(d)) * 2048.0, 1.0)));
  // higher up the passes are long straight strokes on one heading, laid in the stereographic frame:
  // they neither pinch at the zenith nor bend as the camera tilts
  vec4 hi = texture(uCloud, vec2(s.x * 0.94 + s.y * 0.34, s.y * 0.94 - s.x * 0.34) * vec2(0.05, 0.45) + 0.63);
  float h = d.y + (broad.r - 0.5) * 0.05 * smoothstep(-0.02, 0.12, d.y) + (pass.r - 0.5) * 0.018 * lay + (hi.r - 0.5) * 0.05 * (1.0 - lay) + (fine.g - 0.5) * 0.010;
  float ru = sqrt(clamp(h, 0.0, 1.0)) * ${((RAMP_N - 1) / RAMP_N).toFixed(6)} + ${(0.5 / RAMP_N).toFixed(6)};
  vec3 c = texture(uRamp, vec2(ru, mix(0.125, 0.875, uSnow))).rgb;
  if (uEve > 0.0){
    // which side of the sky: toward the low sun or away from it (a broad, uneven turn - the brush passes move it)
    vec2 sh = normalize(uSunDir.xz);
    float toSun = dot(normalize(d.xz + 1e-5), sh) + (broad.a - 0.5) * 0.30;
    vec3 ce = mix(texture(uRamp, vec2(ru, 0.625)).rgb, texture(uRamp, vec2(ru, 0.375)).rgb, smoothstep(-0.55, 0.75, toSun));
    // the sun itself is out of the picture's key: what shows is where it bleaches the wash - a wide pale
    // yellow bloom low in the sky on its side
    vec3 sv = normalize(vec3(sh.x, 0.16, sh.y));
    float ang = acos(clamp(dot(d, sv), -1.0, 1.0));
    float glow = exp(-ang * ang / 0.10) * 0.55 + exp(-ang * ang / 0.012) * 0.35;
    ce = mix(ce, vec3(1.0, 0.975, 0.80), clamp(glow + (fine.g - 0.5) * 0.06 * glow, 0.0, 1.0) * smoothstep(-0.02, 0.05, d.y));
    c = mix(c, ce, uEve);
  }
  float sat = smoothstep(0.04, 0.30, h);
  c *= 1.0 + ((broad.g - 0.5) * mix(0.026, 0.014, lay) + (pass.g - 0.5) * 0.012 * lay + (hi.g - 0.5) * 0.045 * (1.0 - lay)) * sat + (fine.a - 0.5) * 0.014 * (0.35 + 0.65 * sat);
  // below the horizon: pale ground haze (normally hidden by terrain)
  c = mix(c, uHazeCol, smoothstep(0.0, -0.08, d.y));
  oColor = vec4(c, 0.0);
  writeAux(vec3(0., 0., 1.), 0.0, 1.0e4, 0.0, 1.0, 0.0);
}
`;

export function buildSky(scene, cloudTex) {
  const t0 = performance.now();
  const cels = makeCloudCels();
  const ramp = makeRamp();
  window.__skyMs = performance.now() - t0;
  const g = new THREE.IcosahedronGeometry(1, 4);
  const m = mat({
    vs: VS, fs: FS, side: THREE.BackSide, hour: false,
    uniforms: { uCloud: { value: cloudTex }, uRamp: { value: ramp } },
    extra: { depthWrite: false, depthTest: true },
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  scene.add(mesh);
  if (new URLSearchParams(location.search).get('clouds') !== '0') mesh.userData.clouds = buildCloudCards(scene, cloudTex, cels, G.uSunDir.value);
  return mesh;
}
