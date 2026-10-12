// Quality: how much the picture costs, and what it gives up when the machine cannot afford it.
//
// Level 0 ("high") is the picture as it is painted: 4x MSAA, one render pixel per css pixel (to 1.5 dppx).
// The lower levels trade only resolution and edge smoothing - the painted look (paint filter, lines, light,
// haze) is the same picture, a little softer - in steps that each take a fair share off the frame:
//
//   level     msaa  scale  dppx cap   (cost at 1080p on an integrated GPU, relative)
//   high        4    1.00    1.5       1.00
//   medium      2    0.85    1.5       ~0.70
//   low         0    0.70    1.0       ~0.45
//   minimum     0    0.50    1.0       ~0.25
//
// "auto" (the default) starts at high and only ever steps DOWN, when frames stay slow for a whole window: a
// machine that holds the frame rate is never touched, and one that cannot is not made to oscillate (a step up
// would only find the slow level again). Whatever the viewer picks by hand (?quality=, key U) stays.
export const LEVELS = [
  { name: 'high', msaa: 4, scale: 1, dpr: 1.5 },
  { name: 'medium', msaa: 2, scale: 0.85, dpr: 1.5 },
  { name: 'low', msaa: 0, scale: 0.7, dpr: 1 },
  { name: 'minimum', msaa: 0, scale: 0.5, dpr: 1 },
];

const SLOW_MS = 25;       // a window whose median frame is slower than this (under 40 fps) costs a level
const WINDOW = 60;        // frames per window (a second at 60 fps)
const SETTLE = 90;        // frames left alone after a change (targets are reallocated; caches warm up)
const WARM = 180;         // frames left alone after the picture is first shown

// params: the live parameter object (msaa, scale are written); apply(): resizes the targets after a change.
// pin: true when msaa/scale were given in the url (or the clock is frozen for a test picture): nothing is touched.
export function createQuality(params, { query, pinned, apply }) {
  const want = query.get('quality');
  const byName = (n) => LEVELS.findIndex((l) => l.name === n);
  let auto = !pinned && (want === null || want === 'auto');
  let level = Math.max(0, byName(want));
  const q = { level, auto, get name() { return LEVELS[this.level].name; }, dpr: LEVELS[level].dpr };
  const samples = [], listeners = [];
  q.pinned = pinned;
  q.onChange = (fn) => { listeners.push(fn); };
  let hold = WARM;

  function set(i, manual = false) {
    q.level = Math.max(0, Math.min(LEVELS.length - 1, i));
    const L = LEVELS[q.level];
    if (!pinned) { params.msaa = L.msaa; params.scale = L.scale; }
    q.dpr = L.dpr;
    if (manual) q.auto = false;
    samples.length = 0; hold = SETTLE;
    apply();
    console.info(`[quality] ${L.name}${q.auto ? ' (auto)' : ''}`);
    for (const fn of listeners) fn(q);
  }
  // the key: through the levels, then back to auto
  q.cycle = () => {
    if (pinned) return;
    if (q.auto) set(0, true);
    else if (q.level < LEVELS.length - 1) set(q.level + 1, true);
    else { q.auto = true; set(0); }
  };
  q.set = (i) => { if (!pinned) set(typeof i === 'string' ? byName(i) : i, true); };
  // dt: this frame's interval in ms; busy: a frame that is slow for a reason of its own (a change of hour or season
  // draws the scene twice; a hidden tab; the loading frames)
  q.tick = (dt, busy) => {
    if (!q.auto || pinned) return;
    if (busy || document.hidden || dt > 500) { samples.length = 0; return; }
    if (hold > 0) { hold--; return; }
    samples.push(dt);
    if (samples.length < WINDOW) return;
    const med = samples.sort((a, b) => a - b)[samples.length >> 1];
    samples.length = 0;
    if (med > SLOW_MS && q.level < LEVELS.length - 1) set(q.level + 1);
  };
  // the opening level (also for a url that names one)
  if (!pinned) { const L = LEVELS[level]; params.msaa = L.msaa; params.scale = L.scale; }
  return q;
}
