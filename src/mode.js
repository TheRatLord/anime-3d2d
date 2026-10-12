// The two things about the picture that can be changed while it is looked at: the HOUR (the day the scene
// was painted for / evening) and the SEASON (summer / under snow). Four pictures of one place.
//
// Nothing is rebuilt: every material is authored for the summer day, and the other states are laid over it
//  - by the shared shader contract in src/glsl.js (uEve, uSnow, snowLand(), evening(), the colours of the
//    air G.uHazeCol / G.uHazeFarCol), which every material falls under without code of its own;
//  - by the materials that paint a season or an hour themselves (the sky, the clouds, the ground of the
//    hilltop, the masonry, the trees), which read uEve / uSnow;
//  - by what depends on where the sun stands: the sun map is painted again, and whoever baked something
//    from it at start-up (the meadow's per-tuft light, the ground's sun mask) registers with onSun() and
//    does it again (each keeps what it baked, so going back costs nothing).
import * as THREE from 'three';
import { G } from './glsl.js';
import { SUN } from './world.js';

// The evening sun stands on the side the day's did (so the same walls are in the light and the crowns, whose
// light is planned once, keep their sunny side) - only low: long shadows across the hilltop.
// (turned toward the door side, so that the low light comes up the nave and half of the gable stands in it:
// the long shadow of the big tree lies across the west arcade, not over the whole subject)
const _sq = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('sunev') : null;   // ?sunev=x,z,elevation (review)
const [EX, EZ, EEL] = _sq ? _sq.split(',').map(Number) : [-0.20, 0.98, 0.33];
export const SUN_EVE = new THREE.Vector3(EX, 0, EZ).normalize().multiplyScalar(Math.cos(EEL)).setY(Math.sin(EEL));

// colours of the air [near, far], per (hour, season)
const AIR = {
  '00': [0xe4f0ee, 0xedf5f6],
  '10': [0xd9b7ae, 0xf0cdb6],     // evening: rose-mauve near, the peach of the horizon far off
  '01': [0xe6edf4, 0xeef3f8],     // snow: a colder, whiter air
  '11': [0xd3b6ba, 0xedcbbd],
};

export const MODE = { eve: 0, snow: 0 };
// Things that are drawn only under snow (the drifts laid on the stone) are not built for a summer picture until
// it is wanted: deferBuild(fn) runs fn at once under snow, otherwise at flushDeferred() - which main.js calls
// when the picture has been shown, and which setMode() calls the moment snow is asked for.
const deferred = [];
let afterFlush = null;
export const deferBuild = (fn) => { if (MODE.snow) fn(); else deferred.push(fn); };
export const onDeferred = (fn) => { afterFlush = fn; };
export function flushDeferred() {
  if (!deferred.length) return;
  for (const fn of deferred.splice(0)) fn();
  afterFlush?.();
}
// work queued for the next animation frame that the opening picture must wait for (src/main.js scene-ready)
export const BOOT = { pending: 0 };
const sunHooks = [], changeHooks = [];
// fn(renderer, key): the sun map of the state `key` (see sunKey) has just become the current one
export const onSun = (fn) => { sunHooks.push(fn); };
// fn(MODE): the hour or the season has changed
export const onMode = (fn) => { changeHooks.push(fn); };

export const sunDir = () => (MODE.eve ? SUN_EVE : SUN);
// (the sun map differs by season too: the bare winter crowns throw the shadow of their boughs only)
export const sunKey = (m = MODE) => `${m.eve ? 'eve' : 'day'}${m.snow ? '-snow' : ''}`;

// Sets the uniforms of a state (the caller then makes that state's sun map current and calls sunPainted()).
export function setMode({ eve = MODE.eve, snow = MODE.snow } = {}) {
  eve = eve ? 1 : 0; snow = snow ? 1 : 0;
  MODE.eve = eve; MODE.snow = snow;
  if (snow) flushDeferred();
  G.uEve.value = eve; G.uSnow.value = snow;
  const air = AIR[`${eve}${snow}`];
  G.uHazeCol.value.setHex(air[0]); G.uHazeFarCol.value.setHex(air[1]);
  G.uSunDir.value.copy(sunDir());
  // (a low sun rakes the ground: the depth test of the sun map needs more room there)
  G.uShadowBias.value = eve ? 0.0030 : 0.0016;
  for (const fn of changeHooks) fn(MODE);
}
export function sunPainted(renderer) { for (const fn of sunHooks) fn(renderer, sunKey()); }
