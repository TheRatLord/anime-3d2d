import './setup.js';
import * as THREE from 'three';
import { G } from './glsl.js';
import { Pipeline } from './pipeline.js';
import { makeBrushTexture, makeCloudTexture, makeLeafAtlas, makeGrassAtlas, makePaperTexture } from './brush.js';
import { SUN, SUBJECT, height } from './world.js';
import { LAYOUT } from './layout.js';
import { buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import { buildRuin } from './ruin.js';
import { VIEWS, TOUR } from './views.js';
import { MODE, setMode, sunDir, sunKey, sunPainted } from './mode.js';
import { buildUI } from './ui.js';

const params = {
  msaa: 4, kuwahara: 3, line: 0.8, quiet: 1, counter: 1, bloom: 0.3, grain: 0.035, vignette: 0.2,
  fov: 40, fps12: true, scale: 1, mode: 0, hud: 1,
  // layout lens: `shift` keeps verticals vertical (the tilt is taken by a lens shift, as a background
  // painter draws it); `tele` pulls the real camera back behind the viewer and narrows the lens so the
  // subject keeps its size but perspective flattens
  shift: 1, tele: -1, wobble: 1,
  licence: 1,   // the painter's licence (LICENCE in src/glsl.js), switched with P
};
// on a phone or tablet (the same test as the touch interface in index.html) every lens is much wider - the
// opening one and the one each still asks for (setView): held upright, a 40 deg lens shows a sliver of the place
const WIDE = matchMedia('(pointer: coarse)').matches ? 1.55 : 1;
params.fov = Math.round(params.fov * WIDE);
const q = new URLSearchParams(location.search);
for (const k of Object.keys(params)) if (q.has(k)) params[k] = parseFloat(q.get(k));
// the hour and the season the picture opens in: ?eve=1 (or ?time=evening), ?snow=1 (or ?season=winter)
setMode({ eve: q.get('eve') === '1' || /^eve/.test(q.get('time') ?? ''), snow: q.get('snow') === '1' || /^(snow|winter)/.test(q.get('season') ?? '') });

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(params.fov, 1, 0.3, 6000);

G.uBrush.value = makeBrushTexture();
const cloudTex = makeCloudTexture();
const tex = { cloud: cloudTex, leaf: makeLeafAtlas(), grass: makeGrassAtlas(), paper: makePaperTexture() };

const pipe = new Pipeline(renderer, params);
pipe.final.uniforms.tPaper.value = tex.paper;

buildSky(scene, cloudTex);
buildTerrain(scene);
buildRuin(scene);
const mods = import.meta.glob('./extra/*.js', { eager: true });
for (const m of Object.values(mods)) m.default?.(scene, tex, params);

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
// a still stands where it was set (a high one stays in the air) until the first step: then one is on foot
let held = false;
function setView(v, keepFov = false) {
  state.pos.set(...v.pos);
  const d = new THREE.Vector3(...v.look).sub(state.pos).normalize();
  state.yaw = Math.atan2(-d.x, -d.z); state.pitch = Math.asin(d.y);
  if (v.fov && !keepFov) { params.fov = Math.min(70, Math.round(v.fov * WIDE)); }
  state.fly = false; held = true; lensSnap = true;
}
const keys = {};
// what a key does; the rows of the controls panel (src/ui.js) do the same by its code
function act(code) {
  if (code === 'KeyF') { state.fly = !state.fly; held = false; }
  if (/^Digit[1-5]$/.test(code)) params.mode = +code.slice(5) - 1;
  if (code === 'Picture') params.mode = (params.mode + 1) % 5;
  if (code === 'KeyH') { params.hud = 1 - params.hud; ui.show(params.hud); }
  if (code === 'KeyK') params.kuwahara = params.kuwahara ? 0 : 3;
  if (code === 'KeyL') params.line = params.line ? 0 : 0.8;
  if (code === 'KeyT') params.tele = params.tele < 0 ? 0 : params.tele >= 0.7 ? -1 : params.tele + 0.35;
  if (code === 'KeyG') params.shift = 1 - params.shift;
  if (code === 'KeyP') params.licence = params.licence ? 0 : 1;
  if (code === 'BracketLeft') params.fov = Math.max(14, params.fov - 2);
  if (code === 'BracketRight') params.fov = Math.min(70, params.fov + 2);
  if (code === 'KeyV') goView(1);
  if (code === 'KeyB') goView(-1);
  if (code === 'KeyC') { if (tour === null) { tour = 0; goView(1); } else tour = null; }
  if (code === 'KeyN') changeMode({ eve: 1 - MODE.eve });
  if (code === 'KeyM') changeMode({ snow: 1 - MODE.snow });
}
addEventListener('keydown', (e) => { keys[e.code] = true; act(e.code); ui.sync(); });
// the chosen stills (TOUR in src/views.js), one at a time; the slideshow (`tour`: seconds on the present still,
// null when off) steps on by itself every TOUR_HOLD seconds and ends the moment the viewer walks or looks
const TOUR_HOLD = 7;
let viewIdx = 0, tour = null;
function goView(step) {
  viewIdx = (viewIdx + step + TOUR.length) % TOUR.length;
  setView(VIEWS[TOUR[viewIdx]]);
  if (tour !== null) tour = 0;
}
function endTour() { if (tour !== null) { tour = null; ui.sync(); } }
const look = (dx, dy, k) => {
  endTour();
  state.yaw -= dx * k; state.pitch -= dy * k;
  state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
};
const onOff = (v) => (v ? 'on' : 'off');
const ui = buildUI({
  canvas: renderer.domElement, act, mode: () => MODE, view: () => ({ i: viewIdx + 1, n: TOUR.length, playing: tour !== null }), onLook: (dx, dy) => look(dx, dy, 0.0045),
  rows: [
    ['KeyV', 'Next viewpoint', 'V'],
    ['KeyB', 'Previous viewpoint', 'B'],
    ['KeyC', 'Slideshow', 'C', () => onOff(tour !== null)],
    ['KeyF', 'Fly', 'F', () => onOff(state.fly)],
    ['Picture', 'Picture', '1-5', () => ['painted', 'paint only', 'underlying 3D', 'normals', 'depth'][params.mode]],
    ['KeyK', 'Paint filter', 'K', () => onOff(params.kuwahara)],
    ['KeyL', 'Lines', 'L', () => onOff(params.line)],
    ['BracketLeft', 'Longer lens', '[', () => params.fov + '°'],
    ['BracketRight', 'Wider lens', ']'],
    ['KeyT', 'Telephoto', 'T', () => (params.tele < 0 ? 'auto' : params.tele || 'off')],
    ['KeyG', 'Upright verticals', 'G', () => onOff(params.shift)],
    ['KeyP', 'Painter’s licence', 'P', () => onOff(params.licence)],
    ['KeyH', 'Hide interface', 'H', null, true],
  ],
});
if (!params.hud) ui.show(false);
const stick = ui.stick;
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', (e) => { if (e.pointerType !== 'touch') renderer.domElement.requestPointerLock?.(); });
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement) look(e.movementX, e.movementY, 0.0022);
});
function move(dt) {
  const px0 = state.pos.x, pz0 = state.pos.z;
  // the first step is eased in over GAIT.t (the picture, and the lens that follows the walk, start
  // without a jolt); letting go of the keys stops at once. Shift changes the pace over GAIT.shift.
  const going = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || stick.x || stick.y || (state.fly && (keys.KeyE || keys.Space || keys.KeyQ));
  if (going) { endTour(); held = false; }
  gait = going ? Math.min(1, gait + dt / GAIT.t) : 0;
  pace += ((keys.ShiftLeft || stick.run ? GAIT.run : GAIT.walk) - pace) * Math.min(1, dt / GAIT.shift);
  if (!going) pace = GAIT.walk;
  const sp = pace * dt * gait * gait * (3 - 2 * gait);
  const f = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const r = new THREE.Vector3(-f.z, 0, f.x);
  if (state.fly) f.set(-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
  // one pace in every direction: a diagonal (W+D) is not sqrt(2) faster (a thumb stick short of its rim is slower)
  const dir = new THREE.Vector3().addScaledVector(f, (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) - stick.y).addScaledVector(r, (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + stick.x);
  const dl = dir.length();
  if (dl > 1e-3) state.pos.addScaledVector(dir, sp * Math.min(1, dl) / dl);
  // on foot, standing stone and trunks are solid: slide along them
  if (!state.fly && !held) {
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
  else if (!held) state.pos.y += (height(state.pos.x, state.pos.z) + 1.65 - state.pos.y) * Math.min(1, dt * 10);
}

function resize() {
  const w = Math.floor(innerWidth * params.scale * Math.min(devicePixelRatio, 1.5)), h = Math.floor(innerHeight * params.scale * Math.min(devicePixelRatio, 1.5));
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
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  stat.ms += (dt * 1000 - stat.ms) * 0.05; stat.frames++;
  move(dt);
  if (tour !== null && (tour += dt) > TOUR_HOLD) { goView(1); ui.sync(); }
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
    applyState(MODE, null, stat.frames < 8);
  }
  pipe.render(scene, camera);
  // Behind the loading screen, once the opening state stands: the three other states are visited once, so that
  // what each bakes from its sun map (src/mode.js onSun) is done before anyone can ask for a change - a change
  // of hour or season then never stalls. (?prebake=0 skips it: the first visit to a state bakes it instead.)
  if (stat.frames === 9) {
    if (q.get('prebake') !== '0') {
      const here = { eve: MODE.eve, snow: MODE.snow };
      for (const m of [{ eve: 1 - here.eve, snow: here.snow }, { eve: 1 - here.eve, snow: 1 - here.snow }, { eve: here.eve, snow: 1 - here.snow }]) applyState(m, null);
      applyState(here, null);
    }
    performance.mark('scene-ready');
    dispatchEvent(new Event('scene-ready'));
  }
  requestAnimationFrame(frame);
}
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
  trans = !instant && stat.frames > 8 && (from.eve !== to.eve || from.snow !== to.snow) ? { from, to, t: 0 } : null;
  ui.sync();
}
changeMode({}, true);

window.__app = {
  MODE, setMode: (m) => changeMode(m, true),
  params, state, stat, lens, scene, camera, renderer, pipe, VIEWS, setView,
  view: (name) => setView(VIEWS[name]),
  freeze: (t) => { frozen = t; },
  gpu: () => { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; },
};
if (q.has('view')) setView(VIEWS[q.get('view')]); else setView(VIEWS.hero, true); // the opening view keeps the default lens (params.fov)
