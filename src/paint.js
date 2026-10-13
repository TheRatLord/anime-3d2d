// The big procedural textures are painted by worker threads (src/paint.worker.js) from the moment the page
// starts, while the main thread evaluates and builds the scene. Whoever needs one reads it from `painted` and
// paints it itself (the same code) if it is not there - without workers, after an error, or with ?workers=0.
export const painted = {};

// Which worker paints what, by how many there are (each is handed its list once and for all: the main thread is
// too busy to answer a request for more). About 200 ms of painting each at three workers. The tuft atlas goes
// first: after a long typed-array job in the same worker it was seen to take several times longer.
const PLANS = {
  1: [['tuft', 'crown', 'brush', 'cloud', 'foliage', 'plan', 'paper', 'hills', 'crowns']],
  2: [['tuft', 'plan', 'cloud', 'paper', 'foliage', 'hills', 'crowns'], ['crown', 'brush']],
  3: [['crown', 'hills'], ['tuft', 'crowns'], ['brush', 'plan', 'cloud', 'paper', 'foliage']],
  4: [['tuft'], ['crown'], ['brush'], ['plan', 'cloud', 'paper', 'foliage'], ['crowns', 'hills']],
};
const NAMES = PLANS[1][0];
const settled = new Map();

export function startPainting() {
  if (settled.size) return;
  const done = new Map();
  for (const name of NAMES) settled.set(name, new Promise((resolve) => done.set(name, resolve)));
  const finish = (names) => { for (const k of names) done.get(k)(); };
  const off = typeof Worker === 'undefined' || new URLSearchParams(location.search).get('workers') === '0';
  if (off) return finish(NAMES);
  const hc = navigator.hardwareConcurrency || 2, n = hc >= 6 ? 4 : Math.min(3, Math.max(1, hc - 1));
  const lists = PLANS[n].map((names) => ({ names }));
  for (const { names } of lists) {
    let w = null;
    // (the list of what to paint goes in the worker's name: a message posted at once is held back until the page
    // yields, which it does not while it builds the scene)
    try { w = new Worker(new URL('./paint.worker.js', import.meta.url), { type: 'module', name: names.join(',') }); } catch (e) { /* the page paints */ }
    if (!w) { finish(names); continue; }
    let left = names.slice();
    w.onmessage = (e) => {
      const { name, r } = e.data;
      if (r) painted[name] = r;
      left = left.filter((k) => k !== name);
      done.get(name)();
      if (!left.length) w.terminate();
    };
    // (a worker that fails leaves what it had not painted to the page)
    w.onerror = () => { finish(left); left = []; w.terminate(); };
  }
}

// resolves when the named textures (all of them without names) have been painted, or have failed to be
export const whenPainted = (...names) => Promise.all((names.length ? names : [...settled.keys()]).map((k) => settled.get(k)));
