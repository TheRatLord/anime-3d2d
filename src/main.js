import './setup.js';
import * as THREE from 'three';
import { G, onMaterial } from './glsl.js';
import { Pipeline } from './pipeline.js';
import { makeBrushTexture, makeCloudTexture, makeLeafAtlas, makeGrassAtlas, makePaperTexture } from './brush.js';
import { SUN, SUBJECT, height } from './world.js';
import { LAYOUT } from './layout.js';
import { buildTerrain, fillPlan } from './terrain.js';
import { buildSky } from './sky.js';
import { buildRuin } from './ruin.js';
import { VIEWS } from './views.js';
import { whenPainted, painted } from './paint.js';
import { createQuality } from './quality.js';
import { MODE, setMode, sunDir, sunKey, sunPainted, BOOT, flushDeferred, onDeferred } from './mode.js';

const params = {
  msaa: 4, kuwahara: 3, line: 0.8, quiet: 1, counter: 1, bloom: 0.3, grain: 0.035, vignette: 0.2,
  fov: 40, fps12: true, scale: 1, mode: 0, hud: 1,
  // layout lens: `shift` keeps verticals vertical (the tilt is taken by a lens shift, as a background
  // painter draws it); `tele` pulls the real camera back behind the viewer and narrows the lens so the
  // subject keeps its size but perspective flattens
  shift: 1, tele: -1, wobble: 1,
  licence: 1,   // the painter's licence (LICENCE in src/glsl.js), switched with P
};
const q = new URLSearchParams(location.search);
for (const k of Object.keys(params)) if (q.has(k)) params[k] = parseFloat(q.get(k));
// how much the picture costs (src/quality.js). Naming msaa or scale in the url, or a frozen clock (a repeatable test
// picture), holds the picture at what is given; otherwise it opens at "high" and falls only when it cannot keep up.
const quality = createQuality(params, { query: q, pinned: q.has('msaa') || q.has('scale') || (q.has('t') && !q.has('quality')), apply: () => resize() });
// the hour and the season the picture opens in: ?eve=1 (or ?time=evening), ?snow=1 (or ?season=winter)
setMode({ eve: q.get('eve') === '1' || /^eve/.test(q.get('time') ?? ''), snow: q.get('snow') === '1' || /^(snow|winter)/.test(q.get('season') ?? '') });

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(params.fov, 1, 0.3, 6000);

const pipe = new Pipeline(renderer, params);

// Shader programs are linked by the GPU process while the page goes on building: after each stage everything
// built so far is handed to the driver (renderer.compile only issues the links; nothing waits), so that the
// first frame finds its programs ready instead of waiting for each in turn.
const casters = new Set();
function precompile() {
  scene.updateMatrixWorld(true);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(pipe.gbuf);
  renderer.compile(scene, camera);
  // (the sun map's materials: see Pipeline.renderShadow)
  renderer.setRenderTarget(pipe.shadowRT());
  scene.traverse((o) => {
    if (!o.isMesh || !o.userData.shadowMat || casters.has(o.userData.shadowMat)) return;
    casters.add(o.userData.shadowMat);
    const m = o.material;
    o.material = o.userData.shadowMat;
    renderer.compile(o, camera, scene);
    o.material = m;
  });
  renderer.setRenderTarget(prev);
}
onDeferred(precompile);
resize();
pipe.precompile();
{
  const none = new THREE.BufferGeometry();
  onMaterial((m, forSunMap) => {
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(forSunMap ? pipe.shadowRT() : pipe.gbuf);
    renderer.compile(new THREE.Mesh(none, m), camera, scene);
    renderer.setRenderTarget(prev);
  });
}
buildTerrain(scene);
buildRuin(scene);
precompile();
// (the textures are painted by workers meanwhile: each is waited for only where it is first needed. The brush
// map is only read by shaders, so it is waited for last)
await whenPainted('cloud', 'paper');
const cloudTex = makeCloudTexture();
const tex = { cloud: cloudTex, leaf: makeLeafAtlas(), grass: makeGrassAtlas(), paper: makePaperTexture() };
pipe.final.uniforms.tPaper.value = tex.paper;
{
  const n0 = scene.children.length;
  buildSky(scene, cloudTex);
  scene.children.unshift(...scene.children.splice(n0));
}
precompile();
await whenPainted('plan');
fillPlan(painted.plan);       // (the planned drifts of the meadow: first read by src/extra/grass.js)
// the extras, those that wait for no texture first
const NEEDS = {
  './extra/tree.js': ['foliage'],
  './extra/grass.js': ['tuft'],
  './extra/far.js': ['crown', 'hills', 'crowns'],
};
const RANK = { './extra/far.js': 4 };
const mods = import.meta.glob('./extra/*.js', { eager: true });
const added = new Map();
for (const [path, m] of Object.entries(mods).sort((a, b) => (RANK[a[0]] ?? 0) - (RANK[b[0]] ?? 0))) {
  if (NEEDS[path]) await whenPainted(...NEEDS[path]);
  const n0 = scene.children.length;
  m.default?.(scene, tex, params);
  added.set(path, scene.children.splice(n0));
  scene.children.push(...added.get(path));
  precompile();
}
// (but laid in the scene in the order of the files, as they were when they were built in that order)
{
  const all = new Set([...added.values()].flat());
  const rest = scene.children.filter((o) => !all.has(o));
  scene.children.length = 0;
  scene.children.push(...rest, ...Object.keys(mods).flatMap((p) => added.get(p)));
}
await whenPainted('brush');
G.uBrush.value = makeBrushTexture();

// Everything the walker and the lens keep clear of comes from the layout (src/layout.js): LAYOUT.walls
// (long faces), LAYOUT.stand (upright things, as circles) and LAYOUT.lying (stones lying about). The lists
// are read at first use, after everything is built.
// distance from a point on the ground plan to the nearest standing stone (walls as segments, loose stones as discs)
// Lying stones are split by height: one whose top is no more than LOW.h above the turf cannot reach the
// near-plane window of a standing viewer while the pull is small (see lowCap() in frame()), so it only
// limits the pull above that; everything taller limits it by distance alone.
const LOW = { h: 0.8, margin: 0.15 };
let ROCK_TALL = null, ROCK_LOW = null;
function sortRocks() {
  ROCK_TALL = []; ROCK_LOW = [];
  for (const r of LAYOUT.lying) if (r[2] > 0.3) (r[3] !== undefined && r[3] - height(r[0], r[1]) <= LOW.h ? ROCK_LOW : ROCK_TALL).push(r);
}
function solidDist(x, z) {
  if (!ROCK_TALL) sortRocks();
  let d = 1e9;
  for (const [ax, az, bx, bz, half] of LAYOUT.walls) {
    const dx = bx - ax, dz = bz - az, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t) - half);
  }
  for (const r of ROCK_TALL) d = Math.min(d, Math.hypot(x - r[0], z - r[1]) - r[2]);
  return Math.min(d, standDist(x, z));
}
function lowDist(x, z) {
  if (!ROCK_LOW) sortRocks();
  let d = 1e9;
  for (const r of ROCK_LOW) d = Math.min(d, Math.hypot(x - r[0], z - r[1]) - r[2]);
  return d;
}
// standing things one can bump into: columns, altar, piers, buttresses, walls, tree trunks
function standDist(x, z) {
  const STAND = LAYOUT.stand;
  // a smooth minimum: a chain of circles along a wall becomes one even face to slide along, not scallops
  let d = 1e9, acc = 0;
  const K = 0.12;
  for (const r of STAND) {
    const di = Math.hypot(x - r[0], z - r[1]) - (r[2] ?? 0.3);
    if (di < d) d = di;
    if (di < 1.2) acc += Math.exp(-di / K);
  }
  return acc > 0 ? Math.min(d, -K * Math.log(acc)) : d;
}

// ---------------- camera: walk / fly
const state = { pos: new THREE.Vector3(9, 1.7, 22), yaw: 0.45, pitch: 0.06, fly: false };
function setView(v, keepFov = false) {
  state.pos.set(...v.pos);
  const d = new THREE.Vector3(...v.look).sub(state.pos).normalize();
  state.yaw = Math.atan2(-d.x, -d.z); state.pitch = Math.asin(d.y);
  if (v.fov && !keepFov) { params.fov = v.fov; }
  state.fly = true; lensSnap = true;
}
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF') state.fly = !state.fly;
  if (/^Digit[1-5]$/.test(e.code)) params.mode = +e.code.slice(5) - 1;
  if (e.code === 'KeyU') quality.cycle();
  if (e.code === 'KeyH') { params.hud = 1 - params.hud; hud.style.display = params.hud ? '' : 'none'; }
  if (e.code === 'KeyK') params.kuwahara = params.kuwahara ? 0 : 3;
  if (e.code === 'KeyL') params.line = params.line ? 0 : 0.8;
  if (e.code === 'KeyT') params.tele = params.tele < 0 ? 0 : params.tele >= 0.7 ? -1 : params.tele + 0.35;
  if (e.code === 'KeyG') params.shift = 1 - params.shift;
  if (e.code === 'KeyP') params.licence = params.licence ? 0 : 1;
  if (e.code === 'BracketLeft') params.fov = Math.max(14, params.fov - 2);
  if (e.code === 'BracketRight') params.fov = Math.min(70, params.fov + 2);
  if (e.code === 'KeyV') { const names = Object.keys(VIEWS); viewIdx = (viewIdx + 1) % names.length; setView(VIEWS[names[viewIdx]]); state.fly = true; }
});
let viewIdx = 0;
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;left:14px;bottom:12px;color:#fff;font:12px/1.5 system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;white-space:pre;opacity:.9';
hud.textContent = 'click to look · WASD move · Shift run · F fly (Q/E down/up) · V next viewpoint\n1 painted · 2 paint only · 3 underlying 3D · 4 normals · 5 depth · K paint filter · L lines · [ ] lens · T telephoto (auto/off/0.35/0.7) · G upright verticals · P painter\'s licence · H hide\nN day / evening · M summer / winter';
document.body.appendChild(hud);
if (!params.hud) hud.style.display = 'none';
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock?.());
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  state.yaw -= e.movementX * 0.0022; state.pitch -= e.movementY * 0.0022;
  state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
});
function move(dt) {
  const px0 = state.pos.x, pz0 = state.pos.z;
  // the first step is eased in over GAIT.t (the picture, and the lens that follows the walk, start
  // without a jolt); letting go of the keys stops at once. Shift changes the pace over GAIT.shift.
  const going = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || (state.fly && (keys.KeyE || keys.Space || keys.KeyQ));
  gait = going ? Math.min(1, gait + dt / GAIT.t) : 0;
  pace += ((keys.ShiftLeft ? GAIT.run : GAIT.walk) - pace) * Math.min(1, dt / GAIT.shift);
  if (!going) pace = GAIT.walk;
  const sp = pace * dt * gait * gait * (3 - 2 * gait);
  const f = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const r = new THREE.Vector3(-f.z, 0, f.x);
  if (state.fly) f.set(-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
  // one pace in every direction: a diagonal (W+D) is not sqrt(2) faster
  const dir = new THREE.Vector3().addScaledVector(f, (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0)).addScaledVector(r, (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0));
  if (dir.lengthSq() > 1e-6) state.pos.addScaledVector(dir.normalize(), sp);
  // on foot, standing stone and trunks are solid: slide along them
  if (!state.fly) {
    const d1 = standDist(state.pos.x, state.pos.z);
    if (d1 < 0.4) {
      // pushed back out along the gradient of the distance field: one slides round a trunk or a pier,
      // and a walker who starts inside the margin can always leave
      const e = 0.05;
      let gx = standDist(state.pos.x + e, state.pos.z) - standDist(state.pos.x - e, state.pos.z);
      let gz = standDist(state.pos.x, state.pos.z + e) - standDist(state.pos.x, state.pos.z - e);
      const gl = Math.hypot(gx, gz);
      // inside the stone itself (fly mode left there), or where the field has no slope (the axis of a
      // wall, the centre of a column): the way out is back to where one last stood free
      const fx = freeX - state.pos.x, fz = freeZ - state.pos.z, fl = Math.hypot(fx, fz);
      if ((d1 < 0 || gl < 2e-3) && fl > 1e-3) { const k = Math.min(fl, Math.max(1.5 * sp, 0.03)) / fl; state.pos.x += fx * k; state.pos.z += fz * k; }
      else if (gl > 1e-6) { const k = Math.min(0.4 - d1, Math.max(1.5 * sp, 0.01)) / gl; state.pos.x += gx * k; state.pos.z += gz * k; }
      else if (d1 < standDist(px0, pz0)) { state.pos.x = px0; state.pos.z = pz0; }
    }
  }
  if (standDist(state.pos.x, state.pos.z) >= 0.4) { freeX = state.pos.x; freeZ = state.pos.z; }
  velX = (state.pos.x - px0) / Math.max(dt, 1e-4); velZ = (state.pos.z - pz0) / Math.max(dt, 1e-4);
  walkSpeed = Math.hypot(velX, velZ);
  if (state.fly) { if (keys.KeyE || keys.Space) state.pos.y += sp; if (keys.KeyQ) state.pos.y -= sp; }
  else state.pos.y += (height(state.pos.x, state.pos.z) + 1.65 - state.pos.y) * Math.min(1, dt * 10);
}

function resize() {
  const dpr = Math.min(devicePixelRatio, quality.dpr);
  const w = Math.floor(innerWidth * params.scale * dpr), h = Math.floor(innerHeight * params.scale * dpr);
  renderer.setSize(w, h, false);
  pipe.setSize(w, h);
  camera.aspect = w / h;
}
addEventListener('resize', resize);
resize();

// ?t=<seconds>: the ambient clock stands at that time from the first frame (for repeatable test pictures: the sun
// map, which is painted once at start-up, holds the leaves as the wind has them at that moment)
let last = performance.now(), time = 0, frozen = q.has('t') ? parseFloat(q.get('t')) : null, shadowTick = -1;
let pullS = 0, pullT = 0, laX = 0, laZ = 0, lensSnap = true, walkSpeed = 0, velX = 0, velZ = 0;
const LENS = { vel: 0.2, ahead: [0.5, 1, 1.5, 2, 3, 4, 5, 6.5, 8, 10, 12.5], down: 0.35, up: 0.2, t2: 0.15, k: 0.4 };
const GAIT = { t: 0.18, shift: 0.12, walk: 4.2, run: 10 };
let gait = 0, pace = GAIT.walk, freeX = 9, freeZ = 22;
const stat = { ms: 0, frames: 0 }, lens = {};
const fwd = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  if (readyFired) quality.tick(now - last, !!trans);
  last = now;
  stat.ms += (dt * 1000 - stat.ms) * 0.05; stat.frames++;
  move(dt);
  time = frozen ?? time + dt;
  // ambient motion is held on a 12 fps cadence ("on twos"), the camera stays smooth
  const tick = Math.floor(time * 12);
  G.uTime.value = params.fps12 ? tick / 12 : time;

  // ---- layout lens
  // tilt: up to ~24 deg of it is a vertical lens shift, the rest is real pitch
  // (eased in, and given back to real pitch toward straight up / down, where a shifted lens would
  // stretch things as you turn)
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lim = 0.5 * params.shift, ap = Math.abs(state.pitch);
  let sh = lim > 0 ? Math.sign(state.pitch) * lim * Math.tanh(ap / lim) * (1 - sm(0.8, 1.3, ap)) : 0;
  // telephoto: the subject distance is how far we stand from the chapel (never less than a few metres);
  // the camera backs off by tele * that, the lens narrows to keep the subject's size, and the near
  // plane stays at the viewer so nothing behind them enters the picture
  // (never less than 3 m, and without a corner at 3 m: with a pull held constant, a corner in D is a
  // step in the zoom rate)
  const D = Math.hypot(state.pos.x - SUBJECT.x, state.pos.z - SUBJECT.z, 3);
  // tele < 0: automatic - strongest in and around the chapel, where wide-angle foreshortening gives the
  // model away; none out on the hill
  const tele = params.tele >= 0 ? params.tele : 0.5 - 0.2 * sm(8, 18, D) - 0.3 * sm(18, 26, D);
  // the near plane is a window at the viewer: keep it clear of anything solid beside them. The pull
  // changes only while walking (a standing picture must not keep zooming) and never faster than
  // LENS.down / LENS.up metres per metre walked: the camera moves by the walk minus the change of pull,
  // so a faster change would read as a sudden spurt (or stall) of one's own pace. It looks ahead along
  // the walk far enough to give way at that rate before a pier arrives. The clamp at the present
  // position is always enforced. `lens` only reports these values to window.__app for measuring.
  const moving = walkSpeed > 0.05;
  // the look-ahead direction eases in, so a sidestep does not swing it at once
  if (!moving) { laX = 0; laZ = 0; }
  else { const kv = Math.min(1, dt / LENS.vel); laX += (velX - laX) * kv; laZ += (velZ - laZ) * kv; }
  const laL = Math.hypot(laX, laZ), ux = laL > 1e-4 ? laX / laL : 0, uz = laL > 1e-4 ? laZ / laL : 0;
  // a smooth minimum (never above the true minimum): where one limit hands over to another the pull turns
  // a corner over LENS.k metres instead of in one frame
  const smin = (a, b) => { const m = Math.min(a, b); return Math.max(0, m - LENS.k * Math.log(1 + Math.exp(-Math.abs(a - b) / LENS.k))); };
  const eye = state.pos.y - height(state.pos.x, state.pos.z), th0 = Math.tan((params.fov * Math.PI) / 360);
  // lowCap: the largest pull at which the bottom of the near-plane window (at the viewer, on a level look)
  // still clears a lying stone LOW.h high by LOW.margin. Looking down, the lens shift is held back so the
  // window does not sink below that (see below), so the level look is the worst case.
  const room = eye - LOW.h - LOW.margin, lowCap = room > 0 ? Math.max(0, room / th0 - 0.3) : 0;
  const clampAt = (d) => {
    const x = state.pos.x + ux * d, z = state.pos.z + uz * d;
    // (a lying stone limits the pull by distance or by lowCap, whichever allows more; the corner between the
    // two is rounded: a shifted soft-plus that never rises above either and only grows with distance)
    const lo = 1.7 * Math.max(0, lowDist(x, z) - 0.35);
    const low = Math.max(0, lowCap - 0.405 * LENS.k + LENS.k * Math.log(1 + 0.5 * Math.exp(Math.min(40, (lo - lowCap) / LENS.k))));
    return smin(1.7 * Math.max(0, solidDist(x, z) - 0.35), low);
  };
  // (only the clearance is a hard limit; the telephoto pull `want` is a preference, reached at the capped rate)
  const c0 = clampAt(0), want = tele * Math.min(D, 40);
  // the most pull from which, giving way at LENS.down per metre, the lens still clears every limit ahead
  // (planned at 0.75 of that rate: the smoothing stage below lags the first)
  let clear = c0;
  if (laL > 1e-4) for (const d of LENS.ahead) clear = Math.min(clear, clampAt(d) + 0.75 * LENS.down * d);
  const tgt = smin(want, clear);
  if (lensSnap) pullS = pullT = smin(want, c0);
  else if (moving) {
    // the first stage follows the target at a capped rate per metre walked, the second rounds its corners.
    // Giving way to a stone ahead may go at LENS.down; easing toward `want` alone goes at LENS.up both ways.
    const step = walkSpeed * dt;
    pullT = tgt >= pullT ? Math.min(tgt, pullT + LENS.up * step) : Math.max(tgt, pullT - (clear < pullT ? LENS.down : LENS.up) * step);
    pullS += (pullT - pullS) * Math.min(1, dt / LENS.t2);
  }
  pullT = Math.min(pullT, c0); pullS = Math.min(pullS, c0); lensSnap = false;
  lens.pullS = pullS; lens.c0 = c0; lens.want = want; lens.tgt = tgt; lens.lowCap = lowCap; lens.D = D;
  // The camera stands BEHIND the viewer by the pull, on the level: turning the head up or down turns the camera
  // where it stands - its height never changes and nothing dollies (pulled back along the line of sight
  // instead, it swung up and down an arc about the viewer as the head tilted, and the ground came and went).
  // Only looking almost straight down does the pull give way, level and gradually: there the camera would
  // look at the ground behind the viewer's feet.
  let pull = pullS * sm(-1.35, -0.9, state.pitch);
  // the near-plane window at the viewer stays above the ground: on a level look th * (0.3 + pull) <= 0.8 eye
  pull = Math.max(0, Math.min(pull, 0.8 * eye / (th0 * D / (D + pull)) - 0.3));
  const th = th0 * D / (D + pull), n = 0.3 + pull;
  // looking down, a lens shift lowers that window by n * tan(sh). Where it would reach the ground (or the top
  // of a lying stone near enough to be in it), the shift is held and the rest of the tilt is real pitch: the
  // camera turns about the viewer rather than dollying in and widening, which reads as a step forward.
  if (sh < 0) {
    const lo = 1.7 * Math.max(0, lowDist(state.pos.x, state.pos.z) - 0.35);
    const floor = 0.2 * eye + (LOW.h + LOW.margin - 0.2 * eye) * sm(lo - 0.3, lo + 0.3, pull);
    const maxSh = Math.atan(Math.max(0, (eye - floor) / n - th)), k = 0.04;
    // (a smooth minimum of the two, never above either)
    sh = -Math.max(0, -k * Math.log(Math.exp(sh / k) + Math.exp(-maxSh / k)));
  }
  camera.rotation.set(state.pitch - sh, state.yaw, 0, 'YXZ');
  camera.fov = (Math.atan(th) * 360) / Math.PI;
  // (the near plane is the window at the viewer: the viewer stands pull * cos(tilt) down the line of sight)
  // ... and looking down it comes in to stay clear of the ground at the foot of the picture (the lowest ray of
  // the lens meets the ground eye / sin(a) away; the ground may rise toward it, so a margin)
  {
    const beta = Math.atan(th - Math.tan(sh)), a = -(state.pitch - sh) + beta;
    camera.near = 0.3 + pull * Math.cos(state.pitch - sh);
    if (a > 0.02) camera.near = Math.max(0.3, Math.min(camera.near, 0.6 * eye * Math.cos(beta) / Math.sin(a)));
  }
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[9] = Math.tan(sh) / th;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.getWorldDirection(fwd);
  camera.position.set(state.pos.x + Math.sin(state.yaw) * pull, state.pos.y, state.pos.z + Math.cos(state.yaw) * pull);
  camera.updateMatrixWorld(true);
  G.uCamPos.value.copy(camera.position);
  G.uPixelK.value = (2 * Math.tan((camera.fov * Math.PI) / 360)) / pipe.h;
  G.uCamRight.value.setFromMatrixColumn(camera.matrixWorld, 0);
  G.uCamUp.value.setFromMatrixColumn(camera.matrixWorld, 1);

  // nothing that casts a shadow moves (leaf shadows are held still), so the sun map of a state is painted once.
  // During a change of hour or season BOTH states are painted, from this frame's camera, and the picture
  // goes from one to the other: a dissolve that holds while walking and turning.
  if (trans && (trans.t += dt / DISSOLVE) >= 1) trans = null;
  if (trans) {
    applyState(trans.from, sunKey(trans.to));
    pipe.render(scene, camera, true);
    applyState(trans.to, sunKey(trans.from));
    const k = trans.t * trans.t * (3 - 2 * trans.t);
    pipe.final.uniforms.uHold.value = 1 - k;
  } else {
    pipe.final.uniforms.uHold.value = 0;
    applyState(MODE, null, stat.frames < 3);
  }
  pipe.render(scene, camera);
  // Once the opening state stands the picture is shown. The three other states are then visited once, one per
  // idle moment while the viewer stands still, so that what each bakes from its sun map (src/mode.js onSun) is
  // done before a change of hour or season is asked for - which then never stalls. (?prebake=0 skips it: the
  // first visit to a state bakes it instead; a change asked for sooner than that bakes its state on the spot.)
  if (stat.frames >= 4 && !readyFired && !BOOT.pending) {
    readyFired = true;
    performance.mark('scene-ready');
    dispatchEvent(new Event('scene-ready'));
    if (q.get('prebake') !== '0') {
      const todo = [[1, 0], [1, 1], [0, 1], [0, 0]].map(([eve, snow]) => ({ eve, snow })).filter((m) => m.eve !== MODE.eve || m.snow !== MODE.snow);
      const step = () => {
        if (!todo.length) return;
        if (trans || walkSpeed > 0.05) return void setTimeout(step, 400);
        flushDeferred();
        const here = { eve: MODE.eve, snow: MODE.snow };
        applyState(todo.shift(), null);
        applyState(here, null);
        setTimeout(step, 150);
      };
      setTimeout(step, 600);
    }
  }
  // (the opening frames, behind the loading screen, follow one another without waiting for the display)
  if (readyFired) requestAnimationFrame(frame); else bootStep();
}
let readyFired = false;
const bootChannel = new MessageChannel();
bootChannel.port1.onmessage = () => frame(performance.now());
const bootStep = () => bootChannel.port2.postMessage(0);
requestAnimationFrame(frame);

// ---------------------------------------------------------------- the hour and the season
// A change is a dissolve between two paintings of the place, both painted from where the viewer is NOW on every
// frame of it (see frame()), so it holds while walking: the scene is drawn twice for that second.
const DISSOLVE = 1.2;
let trans = null, applied = sunKey();
const CENTER = new THREE.Vector3(0, 0, 4);
// makes a state the current one: its uniforms, its sun map, and what is baked from that map
function applyState(m, keep, force = false) {
  if (m !== MODE) setMode(m);
  const key = sunKey(m);
  const painted = pipe.shadowFor(key, keep, scene, sunDir(), CENTER, force);
  if (key !== applied || (painted && !force)) { applied = key; sunPainted(renderer); }
}
function changeMode(m, instant = false) {
  const from = { eve: MODE.eve, snow: MODE.snow };
  setMode(m);
  const to = { eve: MODE.eve, snow: MODE.snow };
  trans = !instant && stat.frames > 3 && (from.eve !== to.eve || from.snow !== to.snow) ? { from, to, t: 0 } : null;
  for (const [k, b] of Object.entries(modeBtn)) { b.textContent = LABEL[k][MODE[k]]; b.setAttribute('aria-pressed', MODE[k] ? 'true' : 'false'); }
}
const LABEL = { eve: ['☀ Day', '☾ Evening'], snow: ['✿ Summer', '❄ Winter'] };
const modeBtn = {};
const modeBtnCSS = 'appearance:none;border:1px solid rgba(255,255,255,.55);border-radius:999px;padding:8px 14px;min-width:96px;color:#fff;background:rgba(40,52,60,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);text-shadow:0 1px 2px rgba(0,0,0,.45);cursor:pointer;font:inherit';
{
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;right:14px;top:12px;display:flex;gap:8px;font:13px/1 system-ui,sans-serif;z-index:5';
  for (const k of ['eve', 'snow']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = k === 'eve' ? 'Time of day (N)' : 'Season (M)';
    b.style.cssText = modeBtnCSS;
    b.addEventListener('click', (e) => { e.stopPropagation(); changeMode({ [k]: 1 - MODE[k] }); b.blur(); });
    modeBtn[k] = b; bar.appendChild(b);
  }
  // quality (src/quality.js): Auto -> High -> Medium -> Low -> Minimum -> Auto
  {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.cssText = modeBtnCSS;
    const cap = (s) => s[0].toUpperCase() + s.slice(1);
    const paint = () => {
      b.textContent = quality.pinned ? '⚙ Custom' : quality.auto ? `⚙ Auto${quality.level ? ' · ' + cap(quality.name) : ''}` : `⚙ ${cap(quality.name)}`;
      b.title = quality.pinned ? 'Quality is set by the url (msaa / scale)' : 'Quality (U): Auto steps down only if frames are slow';
      b.disabled = quality.pinned;
    };
    b.addEventListener('click', (e) => { e.stopPropagation(); quality.cycle(); b.blur(); });
    quality.onChange(paint); paint();
    bar.appendChild(b);
  }
  document.body.appendChild(bar);
  if (!params.hud) bar.style.display = 'none';
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyN') changeMode({ eve: 1 - MODE.eve });
    if (e.code === 'KeyM') changeMode({ snow: 1 - MODE.snow });
    if (e.code === 'KeyH') bar.style.display = params.hud ? '' : 'none';
  });
  changeMode({}, true);
}

window.__app = {
  MODE, setMode: (m) => changeMode(m, true),
  params, quality, state, stat, lens, scene, camera, renderer, pipe, VIEWS, setView,
  view: (name) => setView(VIEWS[name]),
  freeze: (t) => { frozen = t; },
  gpu: () => { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; },
};
if (q.has('view')) setView(VIEWS[q.get('view')]); else setView(VIEWS.hero, true); // the opening view keeps the default lens (params.fov)
