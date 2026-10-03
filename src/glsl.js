// Shared GLSL. Everything is RawShaderMaterial / GLSL ES 3.0 writing to three render targets:
//   oColor  rgb = painted colour (display space), a = paint-filter weight
//   oNormal xyz = world normal * .5 + .5,        a = line weight (0 = never draw lines here)
//   oAux    r = view depth (m), g = shape id (0..1), b = plane id (depth layer), a = flags
import * as THREE from 'three';
import { SUBJECT } from './world.js';

// uniforms shared by every material (single object instances, updated once per frame)
export const G = {
  uTime: { value: 0 },          // stepped time ("on threes") for ambient motion
  uCamPos: { value: new THREE.Vector3() },
  uPixelK: { value: 0.001 },    // world size of one pixel at distance 1
  uSunDir: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
  uBrush: { value: null },
  uShadowMap: { value: null },
  uShadowMat: { value: new THREE.Matrix4() },
  uShadowTexel: { value: 1 / 2048 },
  uHazeCol: { value: new THREE.Color(0xe4f0ee) },
  uHazeFarCol: { value: new THREE.Color(0xedf5f6) },
  uShadowTint: { value: new THREE.Color(0x6f7fae) },
  uCamRight: { value: new THREE.Vector3(1, 0, 0) },
  uCamUp: { value: new THREE.Vector3(0, 1, 0) },
  uWindAmp: { value: 1 },       // overall wind strength (URL ?wind=0..2), read by WIND_GLSL
};

// ---- wind: one shared world-space field for everything that moves in it (grass, flowers, leaves).
// A prevailing wind from the west-south-west (blowing toward +x / -z, i.e. east-north-east) with slow,
// broad gusts carried downwind: two octaves of value noise advected with the wind (the finer one a little
// faster, so the pattern evolves instead of sliding rigidly), stretched across the wind into soft bands,
// thresholded so most of the time is calm, and a very slow swell that makes whole spells calmer or gustier.
// Everything reads uTime, so the wind is held on the same 12 fps steps as the rest of the ambient motion.
export const WIND = {
  dir: [0.924, -0.383],   // unit xz direction the wind blows TOWARD (from WSW toward ENE)
  speed: 4.0,             // m/s, how fast gust bands travel downwind
  along: 30.0,            // m, gust wavelength along the wind
  across: 70.0,           // m, gust band length across the wind
  calm: 0.12,             // strength between gusts (0..1 of a full gust)
  lo: 0.46, hi: 0.78,     // the noise is thresholded between these: higher lo = rarer gusts
};
{
  const w = typeof location !== 'undefined' ? parseFloat(new URLSearchParams(location.search).get('wind')) : NaN;
  if (Number.isFinite(w)) G.uWindAmp.value = Math.max(0, w);
}
const f = (x) => (+x).toFixed(4);
export const WIND_GLSL = /* glsl */`
uniform float uWindAmp;
const vec2 windDir = vec2(${f(WIND.dir[0])}, ${f(WIND.dir[1])});
float wnd_h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wnd_n(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wnd_h(i), wnd_h(i + vec2(1, 0)), f.x), mix(wnd_h(i + vec2(0, 1)), wnd_h(i + vec2(1, 1)), f.x), f.y);
}
// gust amount at a ground point, 0 (calm) .. 1 (a full gust); smooth over metres, slow in time
float windGust(vec2 xz){
  // wind frame: a = metres along the wind (downwind +), b = across
  float a = dot(xz, windDir), b = dot(xz, vec2(-windDir.y, windDir.x));
  float t = uTime * ${f(WIND.speed)};
  float n = 0.62 * wnd_n(vec2((a - t) / ${f(WIND.along)}, b / ${f(WIND.across)}))
          + 0.38 * wnd_n(vec2((a - t * 1.25) / ${f(WIND.along * 0.45)} + 17.3, b / ${f(WIND.across * 0.4)} + 5.1));
  // a very slow swell (minutes): spells of calm and spells of gusts
  float swell = sin((a - t) / 83.0 + 1.7) * sin(b / 140.0 + uTime * 0.045 + 0.6);
  return smoothstep(${f(WIND.lo)}, ${f(WIND.hi)}, n + swell * 0.12);
}
// wind strength at a ground point: the calm baseline plus the gusts, scaled by ?wind=
float windAt(vec2 xz){ return uWindAmp * mix(${f(WIND.calm)}, 1.0, windGust(xz)); }
`;

// ---- the haze contract: atmosphere is laid in flat steps by distance from the hilltop (the camera never
// leaves it), like the layers of a background painting. [from this distance (m), this much haze]. The ground
// (src/terrain.js) and everything beyond the hill (src/extra/far.js) read the same table.
export const HAZE = [[110, 0.12], [230, 0.24], [380, 0.36], [739, 0.48], [1049, 0.58]];
export const HAZE_HOLD = +(typeof location !== 'undefined' && new URLSearchParams(location.search).get('hold') || 0.62);
export const stepFog = (r) => { let a = 0; for (const [d, h] of HAZE) if (r >= d) a = h; return a; };
export const STEP_FOG_GLSL = `float stepFog(float r){ return ${HAZE.map(([d, h], i) => `r < ${d.toFixed(1)} ? ${(i ? HAZE[i - 1][1] : 0).toFixed(2)} : `).join('')}${HAZE[HAZE.length - 1][1].toFixed(2)}; }`;
// the subject of the picture (src/world.js SUBJECT), for every shader
const SHARED_GLSL = /* glsl */`
const vec3 SUBJECT = vec3(${f(SUBJECT.x)}, ${f(SUBJECT.y)}, ${f(SUBJECT.z)});
`;

export const HEAD = /* glsl */`
precision highp float;
precision highp int;
precision highp sampler2D;
`;

export const VS_COMMON = /* glsl */`
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
${SHARED_GLSL}
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
`;

export const FS_COMMON = /* glsl */`
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormal;
layout(location=2) out vec4 oAux;

uniform float uTime;
uniform vec3 uCamPos;
uniform float uPixelK;
uniform vec3 uSunDir;
uniform sampler2D uBrush;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMat;
uniform float uShadowTexel;
uniform vec3 uHazeCol;
uniform vec3 uHazeFarCol;
uniform vec3 uShadowTint;
${SHARED_GLSL}
float aastep(float th, float v){ float w = max(fwidth(v), 1e-4); return smoothstep(th - w, th + w, v); }

float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

// triplanar fetch with hard-ish blending so dabs stay crisp
vec4 tri(vec3 p, vec3 n){
  vec3 w = pow(abs(n), vec3(8.0)); w /= (w.x + w.y + w.z);
  vec4 c = vec4(0.0);
  if (w.x > 0.01) c += w.x * texture(uBrush, p.zy);
  if (w.y > 0.01) c += w.y * texture(uBrush, p.xz);
  if (w.z > 0.01) c += w.z * texture(uBrush, p.xy);
  return c;
}

// Brush marks anchored to the surface but kept at a constant size ON SCREEN:
// pick the two power-of-two world scales that bracket the wanted pixel size and crossfade.
// (the "fractalization" idea from dynamic solid textures) -> no swimming, no shower door,
// and no texture foreshortening with distance.
vec4 brushStable(vec3 p, vec3 n, float dist, float tilePx){
  float worldTile = max(dist, 0.4) * uPixelK * tilePx;
  float l = log2(worldTile);
  float l0 = floor(l);
  float f = l - l0;
  float s0 = exp2(-l0);
  vec4 a = tri(p * s0, n);
  vec4 b = tri(p * s0 * 0.5 + 0.37, n);
  float k = smoothstep(0.15, 0.85, f);
  // a plain mix loses contrast in mid-crossfade, which makes thresholded marks thin out and
  // return ("breathing" on a dolly). Restore the variance so mark density stays constant.
  vec4 m = mix(a, b, k);
  return clamp(0.5 + (m - 0.5) / sqrt(k * k + (1.0 - k) * (1.0 - k)), 0.0, 1.0);
}

// fixed world scale version (for things that should stay put, like big colour patches)
vec4 brushWorld(vec3 p, vec3 n, float tileMeters){ return tri(p / tileMeters, n); }

// Soft shadow lookup -> a blurred "lit fraction" that the tone step later hardens again.
// Blurring first and thresholding after rounds the shadow into designed-looking shapes.
float shadowLit(vec3 wp, float radius){
  vec4 sc = uShadowMat * vec4(wp, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float lit = 0.0;
  float r = radius * uShadowTexel;   // uShadowTexel is a fixed ~5 cm world step, independent of the map size
  const vec2 P[12] = vec2[12](
    vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
    vec2( 0.962,-0.195), vec2( 0.473,-0.480), vec2( 0.519, 0.767), vec2( 0.185,-0.893),
    vec2( 0.507, 0.064), vec2( 0.896, 0.412), vec2(-0.322,-0.933), vec2(-0.792,-0.598));
  for (int i = 0; i < 12; i++){
    float d = texture(uShadowMap, s.xy + P[i] * r).r;
    lit += step(s.z - 0.0016, d);
  }
  return lit / 12.0;
}

// hard, anti-aliased tone boundary with a brush-noise offset
float toneStep(float v, float th, float noise, float amp){
  float x = v + (noise - 0.5) * amp - th;
  float w = max(fwidth(x), 0.004);
  return smoothstep(-w, w, x);
}

// atmospheric perspective as a painter does it: one flat amount per depth plane. The air is not laid
// evenly over everything in the plane, though: that takes the contrast out of all of it alike and the far
// country washes out. The lights go fully to the haze, the plane's darks (a wood's shadow body, the dark
// under a hedge, a form shadow) keep part of their depth, so each plane still has its own boundary between
// light and dark however pale it is. HAZE_HOLD = the share of the air a dark takes.
const float HAZE_HOLD = ${f(HAZE_HOLD)};
vec3 atmo(vec3 c, float amount){
  vec3 h = mix(uHazeCol, uHazeFarCol, smoothstep(0.3, 0.9, amount));
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, h, amount * mix(HAZE_HOLD, 1.0, smoothstep(0.34, 0.62, l)));
}

void writeAux(vec3 n, float lineW, float depth, float id, float plane, float flags){
  oNormal = vec4(normalize(n) * 0.5 + 0.5, lineW);
  oAux = vec4(depth, id, plane, flags);
}
`;

export function mat({ vs, fs, uniforms = {}, defines = {}, side = THREE.FrontSide, extra = {} }) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: HEAD + VS_COMMON + vs,
    fragmentShader: HEAD + FS_COMMON + fs,
    uniforms: { ...G, ...uniforms },
    defines,
    side,
    ...extra,
  });
}

// depth-only materials for the sun shadow pass
export const SHADOW_VS = /* glsl */`
in vec3 position;
uniform mat4 uShadowMat;
void main(){ gl_Position = uShadowMat * modelMatrix * vec4(position, 1.0); }
`;
export const SHADOW_FS = /* glsl */`
out vec4 o;
void main(){ o = vec4(1.0); }
`;
export function shadowMat(vs = SHADOW_VS, fs = SHADOW_FS, uniforms = {}, side = THREE.DoubleSide) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: HEAD + VS_COMMON + vs,
    fragmentShader: HEAD + fs,
    uniforms: { ...G, ...uniforms },
    side,
  });
}
