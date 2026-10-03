// Falling snow, for the winter picture only (src/mode.js). Sparse on purpose: a painted background shows a
// snowfall as a few dozen separate white touches at very different sizes, never as a curtain.
//
// The flakes live in a box that travels with the eye (wrapped, so there is no edge and nothing is spawned):
// each falls on a line of its own, carried by the scene's one wind (src/glsl.js WIND), with a slow sway.
// They read the held clock (uTime), so they move on the same 12 fps steps as everything else that moves.
// A flake is a round dab, never smaller than a few pixels (so the paint filter keeps it a dab) and it goes
// through the same hour as the rest of the picture (peach in the evening sun).
// ?flakes=0 leaves them out, ?flakes=<n> sets how many there are in the box.
import * as THREE from 'three';
import { mat, WIND_GLSL } from '../glsl.js';
import { rng } from '../world.js';
import { MODE, onMode } from '../mode.js';

const q = new URLSearchParams(globalThis.location?.search ?? '');
const COUNT = q.has('flakes') ? Math.max(0, parseInt(q.get('flakes')) || 0) : 2600;
const BOX = 34;      // m, the side of the box round the eye

const VS = /* glsl */`
in vec3 position; in vec4 iSeed;
uniform float uPixelK;
${WIND_GLSL}
out vec2 vP; out float vDepth; flat out float vA; flat out float vR;
void main(){
  const float L = ${BOX.toFixed(1)};
  float r = iSeed.w;
  // (a flake falls at about a metre a second and is carried half as fast again down the wind)
  vec3 vel = vec3(windDir.x * 1.5, -1.0, windDir.y * 1.5) * (0.65 + 0.7 * r);
  vec3 p = iSeed.xyz * L + vel * uTime;
  p.xz += vec2(sin(uTime * 0.9 + r * 40.0), cos(uTime * 0.7 + r * 17.0)) * 0.22;
  p = mod(p - uCamPos + 0.5 * L, L) - 0.5 * L;
  float dist = length(p);
  // most are small; one in eight is a big near touch
  float big = step(0.875, fract(r * 7.31));
  float size = max(mix(0.016, 0.028, fract(r * 3.7)) * (1.0 + 1.2 * big), dist * uPixelK * mix(1.6, 2.6, fract(r * 5.1)));
  float edge = max(abs(p.x), max(abs(p.y), abs(p.z))) / (0.5 * L);
  vA = smoothstep(1.2, 2.4, dist) * (1.0 - smoothstep(0.80, 1.0, edge));
  vR = r;
  vP = position.xy;
  vec4 mv = viewMatrix * vec4(uCamPos + p + (uCamRight * position.x + uCamUp * position.y) * size, 1.0);
  vDepth = -mv.z;
  gl_Position = vA <= 0.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * mv;
}
`;
const FS = /* glsl */`
in vec2 vP; in float vDepth; flat in float vA; flat in float vR;
void main(){
  // a dab, not a disc: a little longer one way, on its own slant
  float a = vR * 6.283;
  vec2 d = mat2(cos(a), sin(a), -sin(a), cos(a)) * vP * vec2(1.0, 1.0 + 0.5 * fract(vR * 9.7));
  float v = 1.0 - length(d);
  float cov = clamp(v / max(fwidth(v), 1e-4) + 0.5, 0.0, 1.0) * vA;
  if (cov <= 0.02) discard;
  gOwnSnow = true; gLit = 1.0;
  oColor = vec4(mix(SNOW_C, SNOW_L, step(0.4, fract(vR * 13.3))), cov);
  writeAux(vec3(0.0, 1.0, 0.0), 0.0, vDepth, 0.97, 0.0, 0.0);
}
`;

export default function (scene) {
  if (!COUNT) return;
  const R = rng(4242), seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT * 4; i++) seed[i] = R();
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.setAttribute('iSeed', new THREE.InstancedBufferAttribute(seed, 4));
  g.instanceCount = COUNT;
  const mesh = new THREE.Mesh(g, mat({ vs: VS, fs: FS, side: THREE.DoubleSide, extra: { alphaToCoverage: true } }));
  mesh.frustumCulled = false; mesh.name = 'snowfall';
  mesh.renderOrder = 0.4;
  mesh.visible = !!MODE.snow;
  onMode((m) => { mesh.visible = !!m.snow; });
  scene.add(mesh);
}
