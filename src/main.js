import './setup.js';
import * as THREE from 'three';
import { G } from './glsl.js';
import { Pipeline } from './pipeline.js';
import { makeBrushTexture, makeCloudTexture, makeLeafAtlas, makeGrassAtlas, makePaperTexture } from './brush.js';
import { SUN, height } from './world.js';
import { buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import * as RUIN from './ruin.js';
const { buildRuin, ROCKS } = RUIN;
import { VIEWS } from './views.js';

const params = {
  msaa: 4, kuwahara: 3, line: 0.8, halo: 0, bloom: 0.3, grain: 0.035, vignette: 0.2,
  fov: 32, fps12: true, scale: 1, mode: 0, hud: 1,
  // layout lens: `shift` keeps verticals vertical (the tilt is taken by a lens shift, as a background
  // painter draws it); `tele` pulls the real camera back behind the viewer and narrows the lens so the
  // subject keeps its size but perspective flattens
  shift: 1, tele: -1, wobble: 1,
};
const q = new URLSearchParams(location.search);
for (const k of Object.keys(params)) if (q.has(k)) params[k] = parseFloat(q.get(k));

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(params.fov, 1, 0.3, 6000);

G.uBrush.value = makeBrushTexture();
G.uSunDir.value.copy(SUN);
const cloudTex = makeCloudTexture();
const tex = { cloud: cloudTex, leaf: makeLeafAtlas(), grass: makeGrassAtlas(), paper: makePaperTexture() };

const pipe = new Pipeline(renderer, params);
pipe.final.uniforms.tPaper.value = tex.paper;

buildSky(scene, cloudTex);
buildTerrain(scene);
buildRuin(scene);
const mods = import.meta.glob('./extra/*.js', { eager: true });
for (const m of Object.values(mods)) m.default?.(scene, tex, params);

// distance from a point on the ground plan to the nearest standing stone (walls as segments, loose stones as discs)
const WALLS = [[-5, -9, -5, 7.6], [5, -9, 5, 7.6], [-5.6, -9, 5.6, -9]];
// Lying stones are split by height: one whose top is no more than LOW.h above the turf cannot reach the
// near-plane window of a standing viewer while the pull is small (see lowCap() in frame()), so it only
// limits the pull above that; everything taller limits it by distance alone.
const LOW = { h: 0.8, margin: 0.15 };
let ROCK_TALL = null, ROCK_LOW = null;
function sortRocks() {
  ROCK_TALL = []; ROCK_LOW = [];
  for (const r of ROCKS) if (r[2] > 0.3) (r[3] !== undefined && r[3] - height(r[0], r[1]) <= LOW.h ? ROCK_LOW : ROCK_TALL).push(r);
}
function solidDist(x, z) {
  if (!ROCK_TALL) sortRocks();
  let d = 1e9;
  for (const [ax, az, bx, bz] of WALLS) {
    const dx = bx - ax, dz = bz - az, t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t) - 0.6);
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
// standing things one can bump into: columns, altar, piers, buttresses (ruin.js SOLIDS), tree trunks (tree.js TRUNKS)
let STAND = null;
function standDist(x, z) {
  if (!STAND) {
    STAND = [...(RUIN.SOLIDS ?? [])];
    for (const m of Object.values(mods)) if (Array.isArray(m.TRUNKS)) STAND.push(...m.TRUNKS);
    // the low east wall is a knee-high footing: not to be walked through. Circles of the same size and
    // spacing as the rest of that wall (so the face stays even), only where ruin.js left them out
    for (let z = 1.22; z < 7; z += 0.695) if (!STAND.some((r) => Math.abs(r[0] - 5) < 0.1 && Math.abs(r[1] - z) < 0.35)) STAND.push([5, z, 0.56]);
  }
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
function setView(v) {
  state.pos.set(...v.pos);
  const d = new THREE.Vector3(...v.look).sub(state.pos).normalize();
  state.yaw = Math.atan2(-d.x, -d.z); state.pitch = Math.asin(d.y);
  if (v.fov) { params.fov = v.fov; }
  state.fly = true; lensSnap = true;
}
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF') state.fly = !state.fly;
  if (/^Digit[1-5]$/.test(e.code)) params.mode = +e.code.slice(5) - 1;
  if (e.code === 'KeyH') { params.hud = 1 - params.hud; hud.style.display = params.hud ? '' : 'none'; }
  if (e.code === 'KeyK') params.kuwahara = params.kuwahara ? 0 : 3;
  if (e.code === 'KeyL') params.line = params.line ? 0 : 0.8;
  if (e.code === 'KeyT') params.tele = params.tele < 0 ? 0 : params.tele >= 0.7 ? -1 : params.tele + 0.35;
  if (e.code === 'KeyG') params.shift = 1 - params.shift;
  if (e.code === 'BracketLeft') params.fov = Math.max(14, params.fov - 2);
  if (e.code === 'BracketRight') params.fov = Math.min(70, params.fov + 2);
  if (e.code === 'KeyV') { const names = Object.keys(VIEWS); viewIdx = (viewIdx + 1) % names.length; setView(VIEWS[names[viewIdx]]); state.fly = true; }
});
let viewIdx = 0;
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;left:14px;bottom:12px;color:#fff;font:12px/1.5 system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;white-space:pre;opacity:.9';
hud.textContent = 'click to look · WASD move · Shift run · F fly (Q/E down/up) · V next viewpoint\n1 painted · 2 paint only · 3 underlying 3D · 4 normals · 5 depth · K paint filter · L lines · [ ] lens · T telephoto (auto/off/0.35/0.7) · G upright verticals · H hide';
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
  pace += ((keys.ShiftLeft ? 9 : 3.2) - pace) * Math.min(1, dt / GAIT.shift);
  if (!going) pace = 3.2;
  const sp = pace * dt * gait * gait * (3 - 2 * gait);
  const f = new THREE.Vector3(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  const r = new THREE.Vector3(-f.z, 0, f.x);
  if (state.fly) f.set(-Math.sin(state.yaw) * Math.cos(state.pitch), Math.sin(state.pitch), -Math.cos(state.yaw) * Math.cos(state.pitch));
  if (keys.KeyW) state.pos.addScaledVector(f, sp);
  if (keys.KeyS) state.pos.addScaledVector(f, -sp);
  if (keys.KeyD) state.pos.addScaledVector(r, sp);
  if (keys.KeyA) state.pos.addScaledVector(r, -sp);
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
  const w = Math.floor(innerWidth * params.scale * Math.min(devicePixelRatio, 1.5)), h = Math.floor(innerHeight * params.scale * Math.min(devicePixelRatio, 1.5));
  renderer.setSize(w, h, false);
  pipe.setSize(w, h);
  camera.aspect = w / h;
}
addEventListener('resize', resize);
resize();

let last = performance.now(), time = 0, frozen = null, shadowTick = -1;
let pullS = 0, pullT = 0, laX = 0, laZ = 0, lensSnap = true, walkSpeed = 0, velX = 0, velZ = 0;
const LENS = { vel: 0.2, ahead: [0.15, 0.3, 0.45, 0.6], t1: 0.08, t2: 0.08, up: 0.9, clear: [0.9, 1.2, 1.5], k: 0.4 };
const GAIT = { t: 0.18, shift: 0.12 };
let gait = 0, pace = 3.2, freeX = 9, freeZ = 22;
const stat = { ms: 0, frames: 0 }, lens = {};
const fwd = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
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
  const sh = lim > 0 ? Math.sign(state.pitch) * lim * Math.tanh(ap / lim) * (1 - sm(0.8, 1.3, ap)) : 0;
  const pitch = state.pitch - sh;
  camera.rotation.set(pitch, state.yaw, 0, 'YXZ');
  // telephoto: the subject distance is how far we stand from the chapel (never less than a few metres);
  // the camera backs off by tele * that, the lens narrows to keep the subject's size, and the near
  // plane stays at the viewer so nothing behind them enters the picture
  // (never less than 3 m, and without a corner at 3 m: with a pull held constant, a corner in D is a
  // step in the zoom rate)
  const D = Math.hypot(state.pos.x, state.pos.z + 1, 3);
  // tele < 0: automatic - strongest in and around the chapel, where wide-angle foreshortening gives the
  // model away; none out on the hill
  const tele = params.tele >= 0 ? params.tele : 0.5 - 0.2 * sm(8, 18, D) - 0.3 * sm(18, 26, D);
  // the near plane is a window at the viewer: keep it clear of anything solid beside them. Only this
  // part, which depends on where one stands, is smoothed: it looks ahead along the walk so the lens
  // starts giving way before a pier arrives, returns slowly, and only while walking (a standing
  // picture must not keep zooming). The clamp at the present position is always enforced.
  // `lens` only reports these values to window.__app for measuring.
  const moving = walkSpeed > 0.05;
  // the look-ahead velocity eases in, so the first step toward a pier does not drop the lens at once
  if (!moving) { laX = 0; laZ = 0; }
  else { const kv = Math.min(1, dt / LENS.vel); laX += (velX - laX) * kv; laZ += (velZ - laZ) * kv; }
  // a smooth minimum (never above the true minimum): where one limit hands over to another the pull turns
  // a corner over LENS.k metres instead of in one frame
  const smin = (a, b) => { const m = Math.min(a, b); return Math.max(0, m - LENS.k * Math.log(1 + Math.exp(-Math.abs(a - b) / LENS.k))); };
  // lowCap: the largest pull at which the bottom of the near-plane window (at the viewer) still clears a
  // lying stone LOW.h high by LOW.margin, at whatever tilt (the worst is a slight downward look: the
  // lens shift lowers the window while the pitch factor below has not yet taken the pull away)
  let lowCap = 0;
  {
    const room = state.pos.y - height(state.pos.x, state.pos.z) - LOW.h - LOW.margin, t0 = Math.tan((params.fov * Math.PI) / 360);
    if (room > 0) {
      lowCap = 1e9;
      for (let pt = 0; pt >= -0.3001; pt -= 0.02) {
        const f = sm(-0.30, -0.08, pt); if (f < 1e-3) break;
        const s2 = lim > 0 ? lim * Math.tanh(-pt / lim) : 0;
        lowCap = Math.min(lowCap, (room / (t0 + Math.tan(s2)) - 0.3) / f);
      }
      lowCap = Math.max(0, lowCap);
    }
  }
  const clampAt = (t) => {
    const x = state.pos.x + laX * t, z = state.pos.z + laZ * t;
    // (a lying stone limits the pull by distance or by lowCap, whichever allows more; the corner between the
    // two is rounded: a shifted soft-plus that never rises above either and only grows with distance)
    const lo = 1.7 * Math.max(0, lowDist(x, z) - 0.35);
    const low = Math.max(0, lowCap - 0.405 * LENS.k + LENS.k * Math.log(1 + 0.5 * Math.exp(Math.min(40, (lo - lowCap) / LENS.k))));
    return smin(1.7 * Math.max(0, solidDist(x, z) - 0.35), low);
  };
  const c0raw = clampAt(0), want = tele * Math.min(D, 40);
  const c0 = Math.min(c0raw, smin(want, c0raw));
  let tgt = c0;
  for (const t of LENS.ahead) tgt = Math.min(tgt, clampAt(t));
  tgt = Math.min(tgt, smin(want, tgt));
  if (lensSnap) pullS = pullT = c0;
  else if (moving) {
    // two stages: the first takes the target (down quickly, up slowly), the second rounds the corners
    // of the first, so the zoom rate changes over several frames instead of one
    if (tgt < pullT) pullT += (tgt - pullT) * Math.min(1, dt / LENS.t1);
    else {
      // it comes back only as far as the way further ahead allows, or it would pump between the columns
      let back = tgt;
      for (const t of LENS.clear) back = Math.min(back, clampAt(t));
      if (back > pullT) pullT += (back - pullT) * Math.min(1, dt * LENS.up * Math.min(1, walkSpeed / 1.5));
    }
    pullS += (pullT - pullS) * Math.min(1, dt / LENS.t2);
  }
  pullT = Math.min(pullT, c0); pullS = Math.min(pullS, c0); lensSnap = false;
  lens.pullS = pullS; lens.c0 = c0; lens.want = want; lens.tgt = tgt; lens.lowCap = lowCap;
  // looking down the near plane would cut the ground: that part follows the tilt directly, both ways
  let pull = pullS * sm(-0.30, -0.08, state.pitch);
  const th0 = Math.tan((params.fov * Math.PI) / 360);
  {
    const eye = state.pos.y - height(state.pos.x, state.pos.z);
    const thA = th0 * D / (D + pull);
    pull = Math.max(0, Math.min(pull, 0.8 * eye / Math.max(thA - Math.tan(sh), 1e-3) - 0.3));
  }
  const th = th0 * D / (D + pull);
  camera.fov = (Math.atan(th) * 360) / Math.PI;
  camera.near = 0.3 + pull; camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[9] = Math.tan(sh) / th;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.getWorldDirection(fwd);
  camera.position.copy(state.pos).addScaledVector(fwd, -pull);
  camera.updateMatrixWorld(true);
  G.uCamPos.value.copy(camera.position);
  G.uPixelK.value = (2 * Math.tan((camera.fov * Math.PI) / 360)) / pipe.h;
  G.uCamRight.value.setFromMatrixColumn(camera.matrixWorld, 0);
  G.uCamUp.value.setFromMatrixColumn(camera.matrixWorld, 1);

  // nothing that casts a shadow moves (leaf shadows are held still), so the sun map is painted once
  if (stat.frames < 8) pipe.renderShadow(scene, SUN, new THREE.Vector3(0, 0, 4));
  pipe.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__app = {
  params, state, stat, lens, scene, camera, renderer, pipe, VIEWS, setView,
  view: (name) => setView(VIEWS[name]),
  freeze: (t) => { frozen = t; },
  gpu: () => { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; },
};
if (q.has('view')) setView(VIEWS[q.get('view')]); else setView(VIEWS.hero);
