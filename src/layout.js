// What stands where. ONE registry: every module that puts something on the hill declares its footprint
// here, and everything that has to keep clear of things reads it - the walker and the lens (src/main.js),
// the grass (src/extra/grass.js). Nothing else keeps a list of its own.
//
// Declare at MODULE LOAD (top level, from the module's data tables), not while building: all modules are
// imported before any of them builds, so whatever is declared at load is known to every builder, in any
// order. Footprints that are only known once the geometry exists (the rubble heaps, the measured feet of
// the trunks) may be pushed while building; the lists are read lazily, at use.
//
//   LAYOUT.stand   [x, z, radius, top]       upright things one bumps into; a wall is a chain of circles
//   LAYOUT.lying   [x, z, radius, topY]      stones lying about: nothing roots under one, the lens clears it
//   LAYOUT.walls   [ax, az, bx, bz, half]    long faces the lens keeps clear of (segments, half thickness)
//   LAYOUT.ground  { d, bb, per, ... }       plan shapes on the turf: grass keeps off them and gathers at
//                                            their foot (see the options of ground() below)
export const LAYOUT = { stand: [], lying: [], walls: [], ground: [] };

// ---- plan shapes: d(x, z) = signed distance (m), bb = [x0, x1, z0, z1], per = perimeter (m)
export const box = (cx, cz, hx, hz) => ({ d: (x, z) => Math.max(Math.abs(x - cx) - hx, Math.abs(z - cz) - hz), bb: [cx - hx, cx + hx, cz - hz, cz + hz], per: 4 * (hx + hz) });
export const disc = (cx, cz, r) => ({ d: (x, z) => Math.hypot(x - cx, z - cz) - r, bb: [cx - r, cx + r, cz - r, cz + r], per: 6.283 * r, c: [cx, cz, r] });
// a run of segments [[ax, az, bx, bz], ...] of half thickness `half`
export const run = (segs, half) => ({
  d: (x, z) => {
    let best = 1e9;
    for (const [ax, az, bx, bz] of segs) {
      const dx = bx - ax, dz = bz - az;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return best - half;
  },
  bb: [Math.min(...segs.map((s) => Math.min(s[0], s[2]))) - 0.3, Math.max(...segs.map((s) => Math.max(s[0], s[2]))) + 0.3,
    Math.min(...segs.map((s) => Math.min(s[1], s[3]))) - 0.3, Math.max(...segs.map((s) => Math.max(s[1], s[3]))) + 0.3],
  per: 2 * segs.reduce((a, s) => a + Math.hypot(s[2] - s[0], s[3] - s[1]), 0),
});

// A footprint on the turf. opts:
//   fringe  (default true)  a ring of short dark tufts stands at its foot, on a dark contact shape
//   apron   (default false) a wider apron of taller grass round it (trunks)
//   gate(x, z)              where along the footprint the fringe stands at all (a wall with fallen stretches)
//   solid(x, z)             where the footprint is really there (the same wall: nothing is blocked where it is down)
//   seq                     ONLY for the things the meadow was first composed around: their place in the one
//                           random sequence that scatter was drawn from, so it is reproduced exactly. Leave it
//                           out for anything new: a new footprint gets a random sequence of its own, and what
//                           already stands is cleared off it afterwards - nothing else on the hill moves.
export function ground(shape, opts = {}) {
  const s = { fringe: true, apron: false, ...shape, ...opts };
  LAYOUT.ground.push(s);
  return s;
}
// the footprints the meadow was composed around, in their sequence / the ones added since
export const composed = () => LAYOUT.ground.filter((s) => s.seq !== undefined).sort((a, b) => a.seq - b.seq);
export const added = () => LAYOUT.ground.filter((s) => s.seq === undefined);

// ---- the usual things, declared in one call each (everything that follows from standing there)
// an upright round thing (trunk, post, column): bumped into, kept off by the grass, a fringe at its foot
export function standing(x, z, r, top, opts = {}) {
  if (opts.walk !== false) LAYOUT.stand.push([x, z, r, top]);
  return ground(disc(x, z, opts.foot ?? r), opts);
}
// a stone lying in the grass (topY = world height of its top)
// (the fifth entry marks it as added since the meadow was composed: like a footprint without `seq`)
export function lyingStone(x, z, r, topY) { LAYOUT.lying.push([x, z, r, topY, 1]); }
// a straight wall from a to b, `thick` across, `top` high: a chain of circles for the walker, a face for the
// lens, a strip for the grass
export function wallRun(ax, az, bx, bz, thick, top, opts = {}) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.7)), r = thick / 2 + 0.14;
  for (let i = 0; i <= n; i++) LAYOUT.stand.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n, r, top]);
  LAYOUT.walls.push([ax, az, bx, bz, thick / 2 + 0.175]);
  return ground(run([[ax, az, bx, bz]], thick / 2), opts);
}
