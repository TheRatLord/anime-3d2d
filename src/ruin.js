// The ruined chapel. Walls are laid from small coursed stones; the break lines are noise-shaped
// and the stones along them are knocked loose, so no silhouette is a staircase of big boxes.
import { snowCaps } from './snowcap.js';
import * as THREE from 'three';
import { Builder, wobble, cutCorner, rockCuts } from './build.js';
import { rng, fbm, vnoise, smooth, height, SLABS, FLOOR } from './world.js';
import { LAYOUT, box, disc, ground } from './layout.js';
import { stoneMaterial, stoneShadow, stonePrepass } from './stone.js';

const R = rng(4242);
const R2 = rng(9173);
const R3 = rng(60211);                                         // (and of this one)                                          // new random numbers of this round: R keeps its sequence, so the building keeps its shape
const Y0 = -0.6;

// half-width of an equilateral pointed arch opening at height y (or -1 if outside it vertically)
function archHalf(o, y) {
  if (y < (o.sill ?? -1e9)) return -1;
  if (y <= o.spring) return o.w / 2;
  const dy = y - o.spring;
  if (dy >= o.w * 0.866) return -1;
  return Math.sqrt(o.w * o.w - dy * dy) - o.w / 2;
}

// Slow lean, sag and bulge shared by every stone of the building, so corners and arrises wander by
// a few centimetres instead of running ruler-straight. x moves as a function of (z, y) and z as a
// function of (x, y): for axis-aligned masonry that is either out-of-plane or a shear between
// courses, so neighbouring stones keep overlapping and no gaps open. y moves only very slowly.
export function ruinWarp(v) {
  const x = v.x, y = v.y, z = v.z;
  v.x += (fbm(z * 0.17 + 3.1, y * 0.17 + 7.7, 2) - 0.5) * 0.11 + (vnoise(z * 0.9 + 1.7, y * 0.9 + 5.3) - 0.5) * 0.036 + (vnoise(z * 2.9 + 8.1, y * 2.9 + 2.2) - 0.5) * 0.006;
  v.z += (fbm(x * 0.17 + 9.3, y * 0.17 + 1.9, 2) - 0.5) * 0.11 + (vnoise(x * 0.9 + 6.4, y * 0.9 + 9.9) - 0.5) * 0.036 + (vnoise(x * 2.9 + 3.3, y * 2.9 + 7.1) - 0.5) * 0.006;
  v.y += (vnoise(x * 0.2 + 5.5, z * 0.2 + 2.2) - 0.5) * 0.05 * smooth(0.5, 5, y);
}

// stones lying about (for anything that wants to keep clear of them): [x, z, radius]
// Each entry is [x, z, radius, topY]; covers the rubble heaps and their small debris (filled by
// buildRuin), the fallen column drums and the broken pieces beside them, the altar and the cross.
export const ROCKS = LAYOUT.lying;

// Fallen column drums in the nave (built by extra/props.js). The layout lives here so the
// footprints exist before any other module runs. frags = [x, z, size] of the pieces beside each.
export const FALLEN = (() => {
  const Rf = rng(909);
  // (a lying drum - |rz| > 1 - is sunk a third into the turf: sink 0.22-0.27 of a section 0.6 high)
  return [[1.2, -1.7, 0.4, 1.5, 0.95, 0.33, 0], [3.5, -0.4, 1.9, 1.48, 0.7, 0.26, 1], [0.9, 3.4, 2.6, 1.63, 0.85, 0.27, 0], [3.7, 3.2, 0.9, 1.5, 0.6, 0.22, 1], [-0.6, 0.6, 1.2, 0.07, 0.62, 0.1, 1]]
    .map(([x, z, ry, rz, len, sink, brk]) => {
      const frags = [];
      for (let i = 0; i < 1 + brk; i++) { const a = Rf() * 6.283, d = 0.5 + Rf() * 0.25; frags.push([x + Math.cos(a) * d, z + Math.sin(a) * d, 0.14 + Rf() * 0.16]); }
      const lying = Math.abs(rz) > 1, g = height(x, z);
      ROCKS.push([x, z, lying ? Math.max(0.42, len * 0.5) : 0.42, g + (lying ? 0.62 : len) - sink]);
      for (const f of frags) ROCKS.push([f[0], f[1], f[2] * 0.7, height(f[0], f[1]) + f[2] * 0.5]);
      return { x, z, ry, rz, len, sink, brk, frags };
    });
})();
// the piece broken off the altar slab, and the one at the foot of the wayside cross
ROCKS.push([-1.55, -5.65, 0.17, height(-1.55, -5.65) + 0.2], [-3.6, 14.6, 0.12, height(-3.6, 14.6) + 0.5]);

// ---------------------------------------------------------------------------------------------
// Layout of everything that stands (known at module load, before anything is built).
const ZB = FLOOR.z0, ZF = FLOOR.z1, XW = FLOOR.x0, XE = FLOOR.x1;
const HT = 0.425;                                             // half thickness of the side walls
// ---- back facade: a broken gable, tall toward the west, bitten away in a long curve to the east.
// It runs the full width, out to the outer faces of the side walls (s = 0 at x = XW - HT).
const backTop = (s0) => {
  const s = s0 - HT;
  const peak = 12.6 - Math.abs(s - 3.6) * 0.55;                             // gable slope
  const bite = s > 5.0 ? Math.pow((s - 5.0) / 5.0, 0.7) * 5.6 : 0;          // curved loss to the east
  return peak - bite + (fbm(s * 0.7 + 3, 1.3, 3) - 0.5) * 1.5 + (fbm(s * 3.1, 7.7, 2) - 0.5) * 0.5;
};
// ---- west arcade (x = XW): mostly standing, sagging toward the door
const westTop = (s) => {
  let h = 7.7 - Math.pow(Math.max(0, s - 8.5) / 7.5, 1.6) * 5.6;
  h += (fbm(s * 0.6 + 11, 4.1, 3) - 0.5) * 1.6 + (fbm(s * 2.9, 2.2, 2) - 0.5) * 0.5;
  return h;
};
// ---- east arcade (x = XE): one bay stands, the rest is down to ragged stubs
// (the corners of its break line beyond the standing bay, as drawn: [s, y]. No span steeper than 4 in 1.)
const EAST_K = [[5.5, 5.85], [5.95, 4.3], [6.9, 4.55], [7.5, 2.3], [8.4, 1.9], [8.7, 1.0], [10.2, 0.95], [10.7, 0.6], [11.3, 0.9],
  [12.1, 0.78], [12.38, 1.7], [12.62, 1.95], [12.9, 1.45], [13.1, 0.85], [14.6, 1.1], [15.4, 0.8], [17.2, 0.75]];
const eastTop = (s) => {
  // The fall is NOT a slope: the wall comes down in three unequal drops with uneven shelves
  // between (a tall torn end, a shoulder, a low step), then a knee-high footing with a shallow
  // breach, and further on ONE upright fragment still standing head-high before the footing runs
  // on to the door. (A monotonic fall read as a ramp from the side and a wedge from the end.)
  const K = [[0, 6.9], ...EAST_K];
  let h = K[K.length - 1][1];
  for (let i = 1; i < K.length; i++) if (s <= K[i][0]) { h = K[i - 1][1] + (K[i][1] - K[i - 1][1]) * Math.max(0, s - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); break; }
  return h + ((fbm(s * 0.75 + 21, 7.7, 3) - 0.5) * 1.7 + (fbm(s * 2.7, 5.1, 2) - 0.5) * 0.5) * (0.12 + 0.88 * smooth(2.6, 5.0, h));
};

// The drawing on the walls, as data (no geometry): per wall or buttress a few ruled lines
// [y, s0, s1, strength] - plinth, string course, cornice, set-off - and per wall some blind slits /
// putlog holes [s, y0, half width (< 0: square headed, > 0: pointed), height]. s runs along the wall
// from its origin. Every stone is told which line crosses it and which slit touches it
// (Builder.setFeat); stone.js paints them. A stone is a course high, so it meets one line at most.
const PLINTH = 0.92;
const lineFor = (lines, yb, yt, s) => {
  let best = null, bd = 1e9;
  for (const [y, s0 = -1e3, s1 = 1e3, w = 1, front = 0] of lines) {
    if (y < yb - 0.24 || y > yt + 0.16 || (s !== undefined && (s < s0 || s > s1))) continue;
    const d = Math.abs(y - (yb + yt) / 2);
    if (d < bd) { bd = d; best = [y, w, front]; }
  }
  return best;
};

const WALLS = [
  {
    // back facade, full width out to the outer faces of the side walls (s = 0 at x = XW - HT)
    // (its end faces stand 12 mm proud of the side walls' outer faces, so the two are never coplanar)
    x0: XW - HT - 0.012, z0: ZB, dx: 1, dz: 0, len: 10 + HT * 2 + 0.024, thick: 1.0, maxH: 13.6, top: (s) => backTop(s - 0.012), ledges: [4.25, 7.8],
    lines: [[PLINTH], [6.05, -1e3, 1e3, 0.7], [10.72, 1.1, 6.4, 0.9], [2.55, -1e3, 1e3, 0.55]],
    slits: [[1.5, 4.7, 0.17, 1.5], [2.35, 2.7, -0.075, 0.55], [9.35, 5.35, 0.11, 0.8]], putlogs: [[0.9, 6.6, 2], [7.6, 3.1, 3]],
    openings: [
      { c: 5 + HT + 0.012, w: 3.4, spring: 4.4, hood: true },
      { c: 2.3 + HT + 0.012, w: 0.75, spring: 9.3, sill: 8.25, ring: 0.2, hood: true },
      { c: 5.1 + HT + 0.012, w: 0.75, spring: 9.5, sill: 8.45, ring: 0.2, hood: true },
    ],
    // planes: the lower wall with the great arch, the east stub beyond it, and the gable above the string course
    // (a boundary between two planes runs up the middle of an OPENING, never through a pier: every pier is one tone)
    bays: [5 + HT + 0.012], tiers: [7.9],
  },
  {
    x0: XW, z0: ZB, dx: 0, dz: 1, len: ZF - ZB, thick: HT * 2, maxH: 9.4, top: westTop, ledges: [6.3], bays: [3.6, 8.2, 12.8],
    lines: [[PLINTH], [3.05, -1e3, 1e3, 0.8], [7.22, -1e3, 9.5, 0.75], [4.9, -1e3, 1e3, 0.5]],
    slits: [[5.55, 4.6, 0.16, 1.3], [6.5, 5.25, -0.07, 0.45], [1.0, 1.8, -0.1, 0.9]], putlogs: [[9.9, 4.3, 3], [0.5, 5.9, 2]],
    openings: [{ c: 3.6, w: 2.9, spring: 3.1, hood: true }, { c: 8.2, w: 2.9, spring: 3.1, hood: true }, { c: 12.8, w: 2.9, spring: 3.1, hood: true }],
  },
  {
    x0: XE, z0: ZB, dx: 0, dz: 1, len: ZF - ZB, thick: HT * 2, maxH: 8.4, top: eastTop, bays: [3.6, 8.7],
    lines: [[PLINTH], [3.05, -1e3, 1e3, 0.8], [6.0, -1e3, 5.6, 0.85], [4.9, -1e3, 1e3, 0.5]],
    slits: [[1.25, 4.1, 0.15, 1.15], [0.75, 2.0, -0.085, 0.6]], putlogs: [[5.2, 2.6, 2]],
    openings: [{ c: 3.6, w: 2.9, spring: 3.1, hood: true }],
    keys: EAST_K,
  },
];
// buttresses: [x, z, rotY, width, stages [[topY, depth], ...], ragged]. Angle buttresses at the two
// back corners (bedded 5 cm into the wall so no slit shows), then the ones on the side walls.
const BUTTRESSES = [
  [XW + 0.1, ZB - 0.45, Math.PI, 1.15, [[4.25, 1.15], [7.8, 0.8], [10.4, 0.45]], 0.6],
  [XW - 0.38, ZB + 0.1, -Math.PI / 2, 1.15, [[4.25, 1.15], [7.8, 0.8], [9.6, 0.45]], 0.8],
  [XE - 0.1, ZB - 0.45, Math.PI, 1.15, [[4.25, 1.15], [6.3, 0.8]], 1.2],
  [XE + 0.38, ZB + 0.1, Math.PI / 2, 1.15, [[4.25, 1.15], [5.4, 0.8]], 1.3],
  ...[5.9, 10.5].map((s) => [XW - 0.38, ZB + s, -Math.PI / 2, 0.9, [[3.2, 0.95], [Math.min(6.1, westTop(s) - 0.8), 0.55]], 0.5]),
  [XE + 0.38, ZB + 5.9, Math.PI / 2, 0.9, [[2.9, 0.95]], 1.0],
];
// door piers: [x, z, sx, sz, height, ragged]
const PIERS = [[XW, ZF + 0.25, 1.25, 1.25, 3.1, 1.5], [XE, ZF + 0.25, 1.25, 1.25, 1.7, 1.1]];
// the four columns of the nave (built by extra/props.js): [x, z, drums, hasCapital, stump height]
export const COLUMNS = [[-2.6, -3.6, 6, true, 0], [2.6, -3.6, 3, false, 0], [-2.6, 1.6, 2, false, 0], [2.6, 1.6, 1, false, 0.42]];
export const ALTAR = [0, -6.6], CROSS = [-4.2, 14.5];

// Everything standing that a viewer could walk into or stand right beside, as circles:
// [x, z, radius, top] (top = roughly how high it stands above the ground, in metres). The walls are
// chains of circles 0.7 m apart wherever masonry stands (not across the openings). For the camera:
// collision and lens clamping. Lying stones are in ROCKS.
export const SOLIDS = (() => {
  const out = [];
  for (const [x, z, drums, cap, stump] of COLUMNS) out.push([x, z, 0.78, cap ? 0.6 + drums * 0.8 + 1.2 : stump ? 0.6 + stump : 0.6 + drums * 0.8]);
  out.push([ALTAR[0] - 0.7, ALTAR[1], 1.0, 1.25], [ALTAR[0] + 0.55, ALTAR[1], 1.0, 1.25], [ALTAR[0] + 1.45, ALTAR[1], 0.75, 0.9]);
  out.push([CROSS[0], CROSS[1], 0.9, 2.9]);
  for (const [x, z, sx, sz, h] of PIERS) out.push([x, z, Math.hypot(sx, sz) / 2 + 0.05, h]);
  for (const [x, z, ry, width, stages] of BUTTRESSES) {
    const d = stages[0][1] / 2;                                   // local z (away from the wall) -> world
    // (the circle reaches past the outer corners of the lowest stage)
    out.push([x + Math.sin(ry) * d, z + Math.cos(ry) * d, Math.max(Math.max(width, stages[0][1]) / 2 + 0.2, Math.hypot(width / 2, stages[0][1] / 2) + 0.05), stages[stages.length - 1][0]]);
  }
  // Walls: every standing stretch between two openings gets its own row of circles. The row ends a
  // third of the wall's thickness inside each jamb face, so the circle covers the corners of the
  // jamb (nothing of the masonry sticks out past it) and leaves the opening clear: free width of an
  // arch = its width - 2 * (r - inset + 0.4 m margin), i.e. 1.57 m for the 2.9 m arches.
  for (const W of WALLS) {
    const r = W.thick / 2 + 0.14, inset = W.thick * 0.35;
    const cuts = W.openings.filter((o) => o.sill === undefined).map((o) => [o.c - o.w / 2, o.c + o.w / 2]).sort((p, q) => p[0] - q[0]);
    let a = 0;
    for (const [oa, oe] of [...cuts, [W.len, W.len]]) {
      const s0 = a === 0 ? 0.2 : a + inset, s1 = oa >= W.len ? W.len - 0.2 : oa - inset;
      if (s1 >= s0) {
        const n = Math.max(1, Math.ceil((s1 - s0) / 0.7));
        for (let i = 0; i <= n; i++) {
          const s = s0 + (s1 - s0) * i / n;
          if (W.top(s) < 0.5) continue;
          out.push([W.x0 + W.dx * s, W.z0 + W.dz * s, r, W.top(s)]);
        }
      }
      a = oe;
    }
  }
  return out.map((c) => c.map((v) => Math.round(v * 1000) / 1000));
})();

// ---- declared to the layout (src/layout.js), at module load
LAYOUT.stand.push(...SOLIDS);
// the low east wall is a knee-high footing: not to be walked through. Circles of the same size and
// spacing as the rest of that wall (so the face stays even), only where the row above left them out
for (let z = 1.22; z < 7; z += 0.695) if (!SOLIDS.some((r) => Math.abs(r[0] - XE) < 0.1 && Math.abs(r[1] - z) < 0.35)) LAYOUT.stand.push([XE, z, 0.56]);
// the faces the lens keeps clear of: the two side walls (to a little past the door) and the back facade
LAYOUT.walls.push([XW, ZB, XW, ZF + 0.6, 0.6], [XE, ZB, XE, ZF + 0.6, 0.6], [XW - 0.6, ZB, XE + 0.6, ZB, 0.6]);
// plan shapes on the turf, as the grass keeps off them and gathers at their foot (seq: the meadow was
// composed around these, in this order - see ground() in src/layout.js)
[
  box(XW, (ZB + ZF) / 2, HT + 0.005, (ZF - ZB) / 2), box(XE, (ZB + ZF) / 2, HT + 0.005, (ZF - ZB) / 2),   // nave walls (the east one is low stubs)
  box(0, ZB, 5.5, 0.52),                                                                                   // back facade
  box(-5.15, -8.9, 0.76, 0.82), box(5.15, -8.9, 0.76, 0.82),                                               // corner buttresses
  box(-5.55, -3.1, 0.47, 0.52), box(-5.55, 1.5, 0.47, 0.52), box(5.55, -3.1, 0.47, 0.52),
  box(XW, 7.2, 0.66, 0.66), box(XE, 7.2, 0.66, 0.66),                                                      // door piers
  ...COLUMNS.map(([x, z]) => box(x, z, 0.63, 0.63)),
  box(ALTAR[0], ALTAR[1], 1.46, 0.86),
  box(CROSS[0], CROSS[1], 0.76, 0.76),                                                                     // wayside cross
  box(0, 8.55, 2.5, 1.0),                                                                                  // door steps
  ...FALLEN.map((f) => disc(f.x, f.z, 0.46)),                                                              // fallen drums
].forEach((s, i) => ground(s, { seq: i }));


// The break line of a ruined wall, drawn the way a painter draws it: ONE continuous torn line. It
// is a polyline of STRAIGHT slanted spans through irregularly spaced points (0.2 - 3.8 m apart)
// around the smooth profile base(s); a few points are deep bites, a few are lumps left standing.
// No span is plumb and none is level for long. The stones under it are cut to the line on the slant
// (see wall()), so the silhouette is a few big slanted tears with small teeth - never stairs.
function breakLine(base, len, openings, keys) {
  const pts = [];                                             // [s, y]
  let s = -1 - R();
  while (s < len + 1.5) {
    const sl = (base(s + 0.6) - base(s)) / 0.6;
    // the length of a span, measured ALONG the break, varies about 1:10: nicks a hand or two long,
    // ordinary spans, and long plain slanted runs that cross several courses
    const r0 = R();
    const run = r0 < 0.30 ? 0.2 + R() * 0.3 : r0 < 0.62 ? 0.6 + R() * 0.9 : 1.6 + R() * 2.2;
    const long = run > 1.5;
    let off = (R() - 0.5) * (long ? 0.7 : 0.45);
    const r = R();
    if (r < 0.14) off -= 0.4 + R() * 1.0;                      // a deeper bite
    else if (r < 0.20) off += 0.15 + R() * 0.3;                // a lump left standing
    if (keys && s > keys[0][0] - 0.3) break;
    pts.push([s, base(s) + off]);
    s += Math.max(0.16, run / Math.hypot(1, sl));
  }
  // a stretch that is DRAWN (keys): its corners are taken as given, a hand off either way, with a
  // few small teeth between corners that lie far apart
  if (keys) for (let i = 0; i < keys.length; i++) {
    const [ks, ky] = keys[i];
    pts.push([ks + (R() - 0.5) * 0.08, ky + (R() - 0.5) * 0.14]);
    if (i < keys.length - 1) {
      const [ns, ny] = keys[i + 1];
      for (let u = ks + 0.35 + R() * 0.3; u < ns - 0.3; u += 0.3 + R() * 0.55) pts.push([u, ky + (ny - ky) * (u - ks) / (ns - ks) + (R() - 0.5) * 0.3 + (R() < 0.2 ? 0.1 + R() * 0.16 : 0)]);
    }
  }
  // no span is plumb or nearly so: the steepest tear falls about 2.4 in 1 (4 in 1 where it is drawn)
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0], lim = (keys && pts[i][0] > keys[0][0] - 0.2 ? 4.0 : 2.4) * dx;
    pts[i][1] = pts[i - 1][1] + Math.max(-lim, Math.min(lim, pts[i][1] - pts[i - 1][1]));
  }
  // every course reads the line with a small sideways slip of its own, so the cuts of
  // neighbouring courses do not line up into one ruled edge
  const jit = [];
  for (let i = 0; i < 96; i++) jit.push((R() - 0.5) * 0.05);
  // an arch that still stands keeps the masonry over its crown
  const guards = [];
  for (const o of openings) {
    const y = o.spring + o.w * 0.866 + (o.ring ?? 0.3) + 0.3;
    if (base(o.c) > y) guards.push([o.c, o.w / 2 + (o.ring ?? 0.3) + 0.35, y]);
  }
  const at = (xs) => {
    let lo = 0, hi = pts.length - 1;
    if (xs <= pts[0][0]) return pts[0][1];
    if (xs >= pts[hi][0]) return pts[hi][1];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m][0] <= xs) lo = m; else hi = m; }
    const p = pts[lo], q = pts[lo + 1];
    return p[1] + (q[1] - p[1]) * (xs - p[0]) / (q[0] - p[0]);
  };
  const f = (x, j = -1) => {
    let y = j < 0 ? at(x) : at(x + jit[j % 96]);
    // (kept as a mound over the arch, shoulders falling away - not a block with plumb ends)
    for (const g of guards) { const d = Math.abs(x - g[0]) - (g[1] - 0.3); y = Math.max(y, g[2] - Math.max(0, d) * 1.3 - Math.max(0, d - 0.5) * 1.2); }
    return y;
  };
  f.verts = (j) => pts.map((p) => p[0] - jit[j % 96]);
  return f;
}

// Coursed wall from (x0,z0) along unit (dx,dz). top(s) = break line. ledges = [y,...] of string courses.
function wall(b, W) {
  const { x0, z0, dx, dz, len, thick, openings = [], ledges = [] } = W;
  // Elements: a long wall is several planes for the painter - one per bay (W.bays = the s of the
  // bay boundaries), and a tall facade also splits by height (W.tiers = [y, ...]). Every stone
  // goes to the element its centre lies in; the element's centre is the middle of that cell.
  const bays = [0, ...(W.bays ?? []), len], tiers = [Y0, ...(W.tiers ?? []), W.maxH];
  const elemAt = (s, y) => {
    let i = 0; while (i < bays.length - 2 && s >= bays[i + 1]) i++;
    let k = 0; while (k < tiers.length - 2 && y >= tiers[k + 1]) k++;
    const cell = (i2, k2) => {
      const sm = (bays[i2] + bays[i2 + 1]) / 2;
      const ym = tiers.length > 2 ? (Math.max(0, tiers[k2]) + Math.min(tiers[k2 + 1], W.top(sm) + 0.5)) / 2 : Math.min(4, Math.max(1, W.top(sm) / 2));
      return [x0 + dx * sm, ym, z0 + dz * sm];
    };
    b.setElem(...cell(i, k));
    // the nearest boundary to another plane of this wall (see Builder.setEdge): the step between the
    // two is drawn by the shader as a brushed contour, not along the toothing of the stones
    let best = null, bd = 1e9;
    if (i > 0 && s - bays[i] < bd) { bd = s - bays[i]; best = [0, bays[i], 1, cell(i - 1, k)]; }
    if (i < bays.length - 2 && bays[i + 1] - s < bd) { bd = bays[i + 1] - s; best = [0, bays[i + 1], -1, cell(i + 1, k)]; }
    if (k > 0 && y - tiers[k] < bd) { bd = y - tiers[k]; best = [1, tiers[k], 1, cell(i, k - 1)]; }
    if (k < tiers.length - 2 && tiers[k + 1] - y < bd) { bd = tiers[k + 1] - y; best = [1, tiers[k + 1], -1, cell(i, k + 1)]; }
    if (!best) b.setEdge(null);
    else { const [ax, at, sg, c2] = best; b.setEdge((pos) => [c2[0], c2[1], c2[2], (ax ? pos.y : (pos.x - x0) * dx + (pos.z - z0) * dz) - at, sg]); }
  };
  elemAt(len / 2, 1);
  let top = breakLine(W.top, len, openings, W.keys);
  const lineVerts = top.verts;
  const rotY = Math.atan2(-dz, dx);
  // real height of the masonry along the wall, so loose stones sit on something
  const NS = Math.ceil(len / 0.05) + 1, surf = new Float32Array(NS).fill(-99);
  const SI = (x) => Math.max(0, Math.min(NS - 1, Math.round(x / 0.05)));
  // The arch rings are planned first, from the break line: a voussoir stays only while the wall
  // still stands over its haunch, and every one below it stays too. ringTop = height of the
  // extrados where the ring survives; that (and nothing else over an opening) can carry masonry.
  const ringTop = new Float32Array(NS).fill(-99);
  const planRing = (o) => {
    const ringT = o.ring ?? 0.3, rr = o.w + ringT / 2, n = Math.max(5, Math.round(o.w * 3.2));
    o.keep = {};
    for (const sgn of [-1, 1]) {
      const cx = o.c - sgn * o.w / 2;
      let k = 0;
      for (; k < n; k++) {
        const am = ((k + 0.5) / n) * (Math.PI / 3);
        const s = cx + sgn * Math.cos(am) * rr, y = o.spring + Math.sin(am) * rr;
        const out = s + sgn * 0.18 * (1 - k / n);
        if (Math.min(top(out), top(s)) < y + 0.2) break;
      }
      o.keep[sgn] = k;
    }
    return o.keep[-1] === n && o.keep[1] === n;
  };
  // An arch that no longer closes cannot hold a long half-ring, or a wall, out in the air. What
  // stays is the springing - the first voussoirs, still bedded in the haunch - and the wall beside
  // it rakes down to that stub in steps, like any other broken end.
  const brokenO = openings.filter((o) => !planRing(o));
  if (brokenO.length) {
    const top0 = top, ph = R() * 9;
    top = (x, j = -1) => {
      let y = top0(x, j);
      for (const o of brokenO) {
        const d = Math.abs(x - o.c) - o.w / 2;                    // > 0: in the pier beside the opening
        if (d > 4) continue;
        y = Math.min(y, o.spring + 0.3 * o.w * (0.75 + 0.5 * vnoise(o.c * 3.1 + Math.sign(x - o.c), ph)) + Math.max(0, d) * (1.25 + 0.5 * vnoise(x * 0.8 + ph, o.c)) + (fbm(x * 2.3 + ph, 3.3, 2) - 0.5) * 0.5 * Math.min(1, Math.max(0, d)));
      }
      return y;
    };
    for (const o of brokenO) planRing(o);
  }
  for (const o of openings) {
    const ringT = o.ring ?? 0.3, rr = o.w + ringT / 2, n = Math.max(5, Math.round(o.w * 3.2));
    for (const sgn of [-1, 1]) {
      const cx = o.c - sgn * o.w / 2;
      for (let k = 0; k < o.keep[sgn]; k++) {
        const am = ((k + 0.5) / n) * (Math.PI / 3);
        const ext = cx + sgn * Math.cos(am) * (o.w + ringT), half = (Math.PI / 3 / n) * rr * 0.5 + 0.06;
        for (let i = SI(ext - half); i <= SI(ext + half); i++) ringTop[i] = Math.max(ringTop[i], o.spring + Math.sin(am) * (o.w + ringT));
      }
      // the jamb below carries its own width
      if (o.keep[sgn] > 0) for (let i = SI(o.c + sgn * o.w / 2); i <= SI(o.c + sgn * (o.w / 2 + ringT)); i++) ringTop[i] = Math.max(ringTop[i], o.spring);
    }
  }
  // the drawn features of this wall: lines as given; a slit only where the wall
  // still stands well over it and no opening or dressed ring is in its way
  const lines = W.lines ?? [], slits = [];
  // putlog holes: rows of small square holes left by the builders' scaffolding, a few to a wall
  // (a painter puts in one short broken row here and there - two or three holes, no two the same size or
  // the same distance apart - never a grid over the wall. W.putlogs = [s of the first, y, how many])
  const Rp = rng(1300 + Math.round(len * 10)), putlogs = [];
  for (const [s0, y, n] of W.putlogs ?? []) for (let i = 0, sp = s0; i < n; i++, sp += 1.0 + Rp() * 1.1) putlogs.push([sp, y + (Rp() - 0.5) * 0.16, -(0.045 + Rp() * 0.04), 0.09 + Rp() * 0.09]);
  for (const [sc, y0, hwS, h] of [...(W.slits ?? []), ...putlogs]) {
    const hw = Math.abs(hwS);
    if (Math.min(top(sc - hw - 0.2), top(sc), top(sc + hw + 0.2)) < y0 + h + 0.4) continue;
    let clash = false;
    for (const o of openings) for (const y of [y0 - 0.2, y0 + h / 2, y0 + h + 0.2]) {
      const ah = archHalf(o, y);
      if (ah >= 0 && Math.abs(sc - o.c) < ah + (o.ring ?? 0.3) + hw + 0.22) clash = true;
      if (o.sill !== undefined && Math.abs(sc - o.c) < o.w + 0.5 && y > o.sill - 0.5 && y < o.spring + o.w + 0.5) clash = true;
    }
    for (const ly of ledges) if (ly > y0 - 0.25 && ly < y0 + h + 0.25) clash = true;
    for (const q of slits) if (Math.abs(q[0] - sc) < 0.9 && Math.abs(q[1] - y0) < 1.3) clash = true;   // (a stone carries one slit)
    if (!clash) slits.push([sc, y0, hwS, h]);
  }
  const O = [x0, z0, dx, dz];
  b.footFn = (pos) => 0.7 * smooth(3.2, 1.3, W.top((pos.x - x0) * dx + (pos.z - z0) * dz));
  // dirt shed by the broken top, the string courses and the sills, as a continuous field over the
  // wall face (per vertex): it must not step from stone to stone, or the stains come out as squares
  const stainW = (pos) => {
    const sv = (pos.x - x0) * dx + (pos.z - z0) * dz, y = pos.y;
    let st = 0.5 * Math.max(0, 1 - Math.max(0, top(sv) - y) / 1.1);          // (under a broken top: short and faint - the weeps belong to ledges and sills)
    for (const ly of ledges) if (y <= ly + 0.05 && ly - y < 1.5) st = Math.max(st, 1 - Math.max(0, ly - y) / 1.5);
    for (const o of openings) if (o.sill !== undefined && y <= o.sill + 0.05 && o.sill - y < 1.6) st = Math.max(st, (1 - Math.max(0, o.sill - y) / 1.6) * smooth(o.w / 2 + 0.6, o.w / 2 + 0.1, Math.abs(sv - o.c)));
    return st;
  };
  let yb = Y0, j = 0;
  while (yb < W.maxH) {
    const bh = 0.25 + R() * 0.09;
    const yt = yb + bh, yc = yb + bh / 2;
    for (const o of openings) if (o.sill !== undefined && yb < o.sill && yt >= o.sill) o.sillBase = yb;
    const T = (x) => top(x, j);
    const verts = lineVerts(j);                               // the corners of the break line, as this course reads it
    let s = -(j % 2) * 0.22 - R() * 0.2, si = 0;
    while (s < len) {
      const w = 0.32 + R() * 0.52;
      si++;
      const a = Math.max(0, s), e = Math.min(len, s + w);
      s += w;
      if (e - a < 0.06) continue;
      let any = false, lowest = 1e9;
      for (let i = 0; i <= 4; i++) { const t = T(a + (e - a) * i / 4); if (t > yb + 0.03) any = true; lowest = Math.min(lowest, t); }
      if (!any) continue;                                       // above the break line
      const segs = [[a, e]];
      for (const o of openings) {
        const hw = Math.max(archHalf(o, yb), archHalf(o, yt));
        if (hw < 0) continue;
        const oa = o.c - hw, oe = o.c + hw;
        for (let k = segs.length - 1; k >= 0; k--) {
          const [p, q] = segs[k];
          if (q <= oa - 0.09 || p >= oe + 0.09) continue;       // (a stone ending just short of the reveal is trimmed too)
          segs.splice(k, 1);
          // (the wall stone stops 9 cm short of the reveal, well inside the dressed jamb, so the
          // two can never end up coplanar: that showed as slivers and z-fighting stripes)
          if (p < oa - 0.16) segs.push([p, oa - 0.09]);
          if (q > oe + 0.16) segs.push([oe + 0.09, q]);
        }
      }
      // A stone that the break line enters is CUT to the line, on the slant: the line over it is one
      // straight span, so the cut is one plane through the stone (if a corner of the line lies over
      // the stone it is split there first). A slanted break therefore crosses course after course as
      // one torn edge; nothing along it is a tread or a riser.
      if (lowest < yt + 0.02) for (const v of verts) {
        if (v <= a + 0.06 || v >= e - 0.06 || T(v) > yt + 0.05) continue;
        for (let k = segs.length - 1; k >= 0; k--) { const [p, q] = segs[k]; if (v > p + 0.06 && v < q - 0.06) segs.splice(k, 1, [p, v], [v, q]); }
      }
      // stains gather under the broken top, under string courses and under window sills
      let stain = Math.max(0, 1 - Math.max(0, lowest - yt) / 1.7);
      for (const ly of ledges) if (yt <= ly && ly - yt < 1.5) stain = Math.max(stain, 1 - (ly - yt) / 1.5);
      for (const o of openings) if (o.sill !== undefined && yt <= o.sill && o.sill - yt < 1.6) {
        const c = (a + e) / 2;
        if (Math.abs(c - o.c) < o.w / 2 + 0.25) stain = Math.max(stain, 1 - (o.sill - yt) / 1.6);
      }
      for (let [p, q] of segs) {
        // the line over this piece, as a chord; a few stones stand a hand proud of it (teeth), and
        // every stone reads it a centimetre or two off
        // (the silhouette of a break is CHIPPED: every stone is cut a little short of or proud of the line, one in
        // five is a tooth left standing or a bite - small against the long slanted spans, so never a stair.
        // It moves only the cut through the stone - nothing that decides which stones exist - so the
        // building keeps its shape.)
        const chip = (R2() - 0.5) * 0.07 + (R2() < 0.2 ? (R2() < 0.6 ? 0.05 + R2() * 0.08 : -0.05 - R2() * 0.07) : 0);
        const p0 = p, q0 = q, dj = (R() - 0.5) * 0.05 + (R() < 0.07 ? 0.04 + R() * 0.07 : 0);
        const tl = T(p0 + 0.002) + dj, tr = T(q0 - 0.002) + dj;
        const chord = (x) => tl + (tr - tl) * (x - p0) / (q0 - p0);
        if (Math.max(tl, tr) < yb + 0.04) continue;
        // the stone begins where the line rises out of its bed
        if (tl < yb + 0.015) p = p0 + (yb + 0.015 - tl) / (tr - tl) * (q0 - p0);
        if (tr < yb + 0.015) q = q0 - (yb + 0.015 - tr) / (tl - tr) * (q0 - p0);
        if (q - p < 0.05) continue;
        // no stone hangs out over nothing: its ends are trimmed back to within 7 cm of what the
        // course below (or the arch ring of an opening) actually supports
        if (j > 0) {
          const sup = (i) => surf[i] >= yb - 0.04 || ringTop[i] >= yb - 0.4;
          let i0 = Math.max(0, Math.ceil(p / 0.05)), i1 = Math.min(NS - 1, Math.floor(q / 0.05));
          const j0 = i0, j1 = i1;
          while (i0 <= i1 && !sup(i0)) i0++;
          while (i1 >= i0 && !sup(i1)) i1--;
          if (i0 > i1) continue;
          if (i0 > j0) p = Math.max(p, i0 * 0.05 - 0.04);
          if (i1 < j1) q = Math.min(q, i1 * 0.05 + 0.04);
          if (q - p < 0.07) continue;
        }
        const c = (p + q) / 2, hw = (q - p) / 2;
        const cl = chord(p), cr = chord(q);
        const cut = cl < yt || cr < yt;
        const below = Math.min(cl, cr) - yt;                    // how far under the break this stone sits
        const edge = cut || below < 0.45, topmost = cut || below < 0.1;
        // (wall faces are planes: only the stones of the top course are out of true)
        const sk = wobble(R, topmost && !cut ? 0.03 : 0);
        const cuts = [];
        if (cut) {
          // unit-cube space: x = -1..1 is p..q, y = -1..1 is the course. Keep what lies under the
          // chord; the plane leans a little through the wall, so the two faces of the wall do not
          // break at quite the same height (seen from above the top is a lumpy core, not a slab)
          const yl = (cl - yc) / (bh / 2), yr = (cr - yc) / (bh / 2);
          cuts.push({ n: [-(yr - yl) / 2, 1, (R() - 0.5) * 0.5], d: (yl + yr) / 2 + chip / (bh / 2) });
        } else if (topmost) for (let k = 0; k < 8; k++) if (k & 2) sk[k].y -= R() * R() * 0.6;      // weathered, not sawn flat
        // Knocked corners. A corner cut is a little dark or light triangle; in the middle of a
        // wall face that reads as a hole, so real knocked corners are kept for stones with sky
        // above them. Everything else only gets its arrises worn: a narrow bevel running the
        // whole height of the stone (tapering), whose face is as upright as the wall's.
        const chips = [];
        if (topmost && !cut) {
          for (const kx of [-1, 1]) for (const kz of [-1, 1]) if (R() < 0.3)
            chips.push([kx, 1, kz, Math.min(hw, 0.05 + R() * 0.2), 0.04 + R() * bh * 0.5, 0.06 + R() * 0.28]);
        }
        const freeA = p > a + 1e-6 || a <= 0.001, freeE = q < e - 1e-6 || e >= len - 0.001;
        if (!cut) for (const [free, kx] of [[freeA, -1], [freeE, 1]]) if (free) {
          // (no tapering bevels on the arrises: a taper is a ruled diagonal on the wall, which the line pass inks)
          void kx;
        }
        // wall faces stay quiet: only the stones along the break have shifted on their beds
        const loose = topmost && !cut;
        const slip = loose ? (R() - 0.5) * 0.05 : 0;
        const rot = loose
          ? new THREE.Euler((R() - 0.5) * 0.06, rotY + (R() - 0.5) * 0.07, (R() - 0.5) * 0.07)
          : new THREE.Euler(0, rotY, 0);
        // Neighbouring stones overlap by 3 mm so no crack can open, which would leave their faces
        // coplanar in the overlap (z-fighting slivers of the other stone's tint). So each stone's
        // face sits at one of four levels, 2 mm apart, chosen so that no two neighbours - beside,
        // above or below - share one: the prouder stone simply hides the overlap.
        const lvl = ((j % 2) * 2 + (si % 2)) * 0.004 - 0.006;
        elemAt(c, yc);
        // (no ruled line right under the break: on a wall that is down to a footing the plinth line would run along its top edge)
        const lnF = lineFor(lines, yb, yt, c);
        b.setFeat({ o: O, line: lnF && Math.min(cl, cr) > lnF[0] + 0.5 ? lnF : null, slit: slits.find((q) => Math.abs(c - q[0]) < hw + Math.abs(q[2]) + 0.22 && yb < q[1] + q[3] + 0.22 && yt > q[1] - 0.22) });
        b.block(x0 + dx * c - dz * slip, yc, z0 + dz * c + dx * slip,
          q - p + 0.006, bh + 0.006, thick + (loose ? (R() - 0.5) * 0.05 : lvl), {
            rot, tone: R(), stain, stainW, cap: edge ? 1 : 0, skew: sk, chips, cuts,
            // tone by plane: both wall faces take the wall's own normal, a chip the face it was
            // knocked out of; the top, the slanted cut along the break and the short ends beside it
            // are all one "break surface" (toned with the wall face, mossy)
            ln: (fn, o, cutF) => {
              // (every face of the tear is break surface, however steep: toned with the wall face the viewer sees it over -
              // a plumb cut toned as the wall's OTHER face showed as a lit sliver along a shaded top)
              if (cutF) return edge ? [0, 0, 1, 3] : [0, 0, o.z >= 0 ? 1 : -1];
              if (fn[1] > 0) return [0, 0, 1, 3];
              if (fn[1] < 0) return [0, 0, o.z >= 0 ? 1 : -1];   // (an oversailing bed is not a dark soffit)
              if (fn[2] !== 0) return [0, 0, fn[2]];
              // the end of a stone that shows inside the wall's length (at a drop of the break, beside a
              // gap) is break surface too - toned with the wall face the viewer sees. Left to its own
              // normal it caught the sun as a pale ruled bracket on a shaded wall. Only the true ends
              // of the wall are faces of their own.
              if (fn[0] !== 0 && (topmost || (fn[0] < 0 ? a > 0.001 : e < len - 0.001))) return [0, 0, 1, 3];
              return null;
            },
          });
        for (let i = Math.max(0, Math.ceil(p / 0.05)); i <= Math.min(NS - 1, Math.floor(q / 0.05)); i++) surf[i] = Math.max(surf[i], Math.min(yt, chord(i * 0.05)));
      }
    }
    yb = yt; j++;
  }
  b.setFeat(null);
  // lumps of rubble core standing out of the break, bedded in the wall top (never loose): they
  // round the line off and make the top of the wall an uneven mass instead of a slab
  const WN = [-dz, 0, dx];
  for (let s2 = 0.15 + R() * 0.3; s2 < len - 0.12; s2 += 0.5 + R() * R() * 3.2) {
    const w = 0.2 + R() * 0.42, h = 0.14 + R() * 0.24, d = thick * (0.4 + R() * 0.5);
    const i0 = SI(s2 - w * 0.4), i1 = SI(s2 + w * 0.4);
    let lo = 1e9, hi = -1e9;
    for (let i = i0; i <= i1; i++) { lo = Math.min(lo, surf[i]); hi = Math.max(hi, surf[i]); }
    if (lo < 0.45 || hi - lo > 0.4) continue;                    // no wall here, or it straddles a notch
    const off = (R() - 0.5) * (thick - d) * 0.9;
    elemAt(s2, lo);
    b.rock(R, x0 + dx * s2 - dz * off, lo + h * 0.16, z0 + dz * s2 + dx * off, w, h, d, {
      rot: new THREE.Euler((R() - 0.5) * 0.3, rotY + (R() - 0.5) * 0.7, (R() - 0.5) * 0.3), n: 4 + Math.floor(R() * 3), lo: 0.62, hi: 0.9,
      fixed: true, loose: false, cap: 1, stain: 0,
      lnW: () => [WN[0], 0, WN[2], 3],                           // (every facet is break surface: one mode over the whole lump - a lump toned in two modes showed a pale zigzag where they met)
    });
  }

  // (more of them, smaller: chips of core that break the line between the big lumps)
  for (let s2 = 0.3 + R2() * 0.4; s2 < len - 0.15; s2 += 0.45 + R2() * R2() * 2.4) {
    const w = 0.12 + R2() * 0.22, h = 0.08 + R2() * 0.14, d = thick * (0.3 + R2() * 0.4);
    let lo = 1e9, hi = -1e9;
    for (let i = SI(s2 - w * 0.4); i <= SI(s2 + w * 0.4); i++) { lo = Math.min(lo, surf[i]); hi = Math.max(hi, surf[i]); }
    const off = (R2() - 0.5) * (thick - d) * 0.9, ry = (R2() - 0.5) * 0.7, n = 4 + Math.floor(R2() * 3);
    if (lo < 0.45 || hi - lo > 0.3) continue;
    elemAt(s2, lo);
    b.rock(R2, x0 + dx * s2 - dz * off, lo + h * 0.16, z0 + dz * s2 + dx * off, w, h, d, {
      rot: new THREE.Euler((R2() - 0.5) * 0.3, rotY + ry, (R2() - 0.5) * 0.3), n, lo: 0.62, hi: 0.9,
      fixed: true, loose: false, cap: 1, stain: 0,
      lnW: () => [WN[0], 0, WN[2], 3],                           // (every facet is break surface: one mode over the whole lump - a lump toned in two modes showed a pale zigzag where they met)
    });
  }

  // dressed stone around each opening: jambs, voussoirs and a projecting hood mould
  for (const o of openings) {
    const ringT = o.ring ?? 0.3, proud = thick + 0.024;
    // (dressed stone stands 2 cm proud and is toned as the wall: only the faces lining the opening differ)
    const wallLN = (fn, o2, cutF) => (!cutF && fn[1] !== 0 ? null : [0, 0, o2.z >= 0 ? 1 : -1]);
    const flatLN = (fn, o2) => [0, 0, o2.z >= 0 ? 1 : -1];
    elemAt(o.c, o.spring);
    const revealAO = (fn) => (fn[1] !== 0 ? 0.9 : 0);          // the faces lining the opening sit in deep shade
    const place = (s, y, ang, lenS, T, D, opts = {}) => {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, ang, 'YXZ'));
      m.compose(new THREE.Vector3(x0 + dx * s, y, z0 + dz * s), q, new THREE.Vector3(lenS / 2, T / 2, D / 2));
      b.box(m, { tone: R(), skew: wobble(R, 0.012), ao: revealAO, ln: wallLN, stainW, ...opts });
    };
    const sill = o.sill ?? Y0;
    const nRingO = Math.max(5, Math.round(o.w * 3.2));
    for (let y = sill; y < o.spring - 0.01;) {
      const h = Math.min(0.3 + R() * 0.25, o.spring - y);
      for (const sgn of [-1, 1]) {
        const sj = o.c + sgn * (o.w / 2 + ringT / 2);
        if (surf[SI(sj + sgn * 0.3)] < y + h * 0.5 && o.keep[sgn] === 0) continue;       // no wall beside it and no arch on it
        // (a jamb is a ruled edge: its stones differ by millimetres, and no joint is ruled up its two sides)
        // Only the face that lines the opening is reveal: the back of the jamb (the few millimetres it stands
        // proud of the wall) is wall, or it shows as a ruled dark vertical beside every arch.
        // (the stone is turned so that its local +y face lines the opening on either side: the shader
        // draws the light edge of the reveal along that arris - cap 4 - where the arch still closes)
        const whole = o.keep[sgn] >= nRingO;
        place(sj, y + h / 2, sgn * Math.PI / 2, h + 0.006, ringT + (R() - 0.5) * 0.008, proud + (R() - 0.5) * 0.006, { noFace: !whole, cap: whole ? 4 : 0,
          // (the jamb of an arch that no longer closes stands in the open: it is the plain end of a wall, not a dark reveal)
          ao: (fn) => (fn[1] > 0 && whole ? 0.9 : 0), ln: (fn, o2, cutF) => (!cutF && fn[1] > 0 ? null : [0, 0, o2.z >= 0 ? 1 : -1]) });
      }
      y += h;
    }
    const nRing = Math.max(5, Math.round(o.w * 3.2));
    const arc = (rr, T, D, n, opts, hood) => {
      for (const sgn of [-1, 1]) {
        const cx = o.c - sgn * o.w / 2;
        // a broken half-arch ends where the wall over it ends (see ringTop)
        const broken = o.keep[sgn] < nRing;
        const last = hood ? (broken ? 0 : n) : o.keep[sgn];        // (the hood mould of a broken arch went with it)
        for (let i = 0; i < last; i++) {
          const a0 = (i / n) * (Math.PI / 3), a1 = ((i + 1) / n) * (Math.PI / 3), am = (a0 + a1) / 2;
          // the hood mould has lost pieces and what is left sits unevenly
          if (hood && R() < 0.14) continue;
          const r2 = hood ? rr + (R() - 0.5) * 0.03 : rr;
          const s = cx + sgn * Math.cos(am) * r2, y = o.spring + Math.sin(am) * r2;
          const ang = sgn > 0 ? am + Math.PI / 2 : -(am + Math.PI / 2);
          const ex = {};
          const fromEnd = last - 1 - i;
          if (broken && fromEnd < 3) {
            // the last voussoirs of a broken ring: each is shorter through the wall than the one
            // before (the ring steps back like the masonry on it), and the end stone is snapped
            // off on a slant with its corners gone. Local x runs along the ring; the free end is
            // at +x for the right-hand half and -x for the left.
            const cuts = [];
            const kz = R() < 0.5 ? -1 : 1;
            if (fromEnd === 0) {
              cuts.push({ n: [sgn, (R() - 0.5) * 0.9, kz * (0.25 + R() * 0.5)], d: 0.25 + R() * 0.35 });
              cuts.push(cutCorner(sgn, 1, -kz, 0.5 + R() * 0.6, 0.6 + R() * 0.8, 0.3 + R() * 0.5));
              cuts.push(cutCorner(sgn, -1, kz, 0.4 + R() * 0.5, 0.5 + R() * 0.6, 0.5 + R() * 0.6));
            } else {
              cuts.push(cutCorner(sgn, 1, kz, (0.9 - fromEnd * 0.3) * (0.7 + R() * 0.6), 0.8 + R() * 0.8, (0.8 - fromEnd * 0.25) * (0.7 + R() * 0.6)));
            }
            ex.cuts = cuts;
          }
          // (what is left of a ring that no longer closes stands in the open: wall tone, no dark soffit)
          if (broken && !hood) { ex.ao = 0; ex.ln = flatLN; }
          else if (!hood) ex.cap = 4;                               // the light edge of the reveal (see the jambs)
          place(s, y, ang, (a1 - a0) * rr * 1.03, hood ? T + (R() - 0.5) * 0.04 : T, hood ? D - R() * 0.012 : D, { ...opts, ...ex });
        }
      }
    };
    arc(o.w + ringT / 2, ringT, proud, nRing);
    // the hood mould is drawn, not built: 3 cm proud, the wall's tone, a dark and a pale stroke
    if (o.hood) arc(o.w + ringT + 0.07, 0.13, thick + 0.06, Math.max(6, Math.round(o.w * 2.2)), { cap: 3, tone: 0.5, ao: 0, ln: flatLN }, true);
    if (o.sill !== undefined) {
      // the sill in two or three stones, one of them chipped
      const L = o.w + ringT * 2.6, n = 2 + (R() < 0.5 ? 1 : 0);
      let u = -L / 2;
      for (let i = 0; i < n; i++) {
        const wS = i === n - 1 ? L / 2 - u : L / n * (0.8 + R() * 0.4);
        // (the sill fills the whole course it sits in: the wall stones of that course stop at the
        // opening, and a thinner sill would hang over a slot)
        const D = thick + 0.06 - R() * 0.012, T = Math.max(0.18, o.sill - (o.sillBase ?? o.sill) + 0.02) + (R() - 0.5) * 0.02;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(x0 + dx * (o.c + u + wS / 2), o.sill - T / 2, z0 + dz * (o.c + u + wS / 2)),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, (R() - 0.5) * 0.02, 'YXZ')), new THREE.Vector3(wS / 2 + 0.003, T / 2, D / 2));
        const cuts = R() < 0.5 ? [cutCorner(R() < 0.5 ? -1 : 1, 1, R() < 0.5 ? -1 : 1, (0.06 + R() * 0.15) / (wS / 2), (0.04 + R() * 0.08) / (T / 2), (0.05 + R() * 0.1) / (D / 2))] : [];
        b.box(m, { tone: R(), skew: wobble(R, 0.03), cap: 2, ao: 0, cuts, ln: (fn, o2, cutF) => (!cutF && fn[1] > 0 ? null : [0, 0, o2.z >= 0 ? 1 : -1]) });
        u += wS;
      }
    }
  }

  // string courses: a row of stones standing 3 cm proud, drawn as a pale and a dark stroke; some have fallen
  // out and the rest no longer line up exactly
  for (const ly of ledges) {
    let s = 0;
    while (s < len) {
      const w = 0.5 + R() * 0.5;
      const c = s + w / 2;
      s += w;
      if (c > len || ly > top(c) - 0.35) continue;
      // a string-course stone needs the wall under both its ends
      if (surf[SI(c - w * 0.4)] < ly - 0.12 || surf[SI(c + w * 0.4)] < ly - 0.12 || surf[SI(c)] < ly - 0.12) continue;
      let inOpen = false;
      for (const o of openings) { const hw = archHalf(o, ly); if (hw >= 0 && Math.abs(c - o.c) < hw + (o.ring ?? 0.3) + w / 2) inOpen = true; }
      if (inOpen || R() < 0.1) continue;
      const D = thick + 0.06 - R() * 0.015, T = 0.17 + (R() - 0.5) * 0.025;
      elemAt(c, ly - 0.2);
      const chips = [];
      if (R() < 0.45) chips.push([R() < 0.5 ? -1 : 1, 1, R() < 0.5 ? -1 : 1, 0.05 + R() * 0.16, 0.04 + R() * 0.1, 0.04 + R() * 0.08]);
      b.block(x0 + dx * c, ly + (R() - 0.5) * 0.016, z0 + dz * c, w + 0.006, T, D, { rot: new THREE.Euler(0, rotY, (R() - 0.5) * 0.014, 'YXZ'), tone: R(), cap: 2, skew: wobble(R, 0.04), chips, ln: (fn, o2) => [0, 0, o2.z >= 0 ? 1 : -1] });
    }
  }
  b.footFn = null; b.setEdge(null);
}

// skew for a stone left on top of something broken: its upper corners have gone by different
// amounts (unit-cube units: 1 = half the stone's height), so the top slopes and no stack ends flat
function slumped(amt, drop) {
  const sk = wobble(R, amt);
  const side = Math.floor(R() * 4);                               // the side that went furthest
  for (let k = 0; k < 8; k++) if (k & 2) {
    const far = side < 2 ? ((k & 1) === side) : (((k >> 2) & 1) === side - 2);
    sk[k].y -= drop * (far ? 0.45 + R() * 0.55 : R() * 0.35);
  }
  return sk;
}

// chips for a stone standing at an outer corner: kx,kz = which vertical arris is exposed
// (a knocked corner - a small triangular facet - is only given to stones with open sky above
// them; lower down it reads as a dark hole in the wall, so there the arris is just worn: a narrow
// upright bevel the full height of the stone, tapering toward one end)
function cornerChips(kx, kz, p, hw, hh, hd, top = false) {
  const chips = [];
  if (R() < p) {
    if (!top || R() < 0.4) {
      const c = R() < 0.3 ? 0.03 + R() * 0.06 : 0.012 + R() * 0.03;
      chips.push([kx, R() < 0.5 ? 1 : -1, kz, Math.min(hw, c * (0.7 + R() * 0.6)), hh * 2 * (1.25 + R() * 4), Math.min(hd, c * (0.7 + R() * 0.6))]);
    } else chips.push([kx, 1, kz, Math.min(hw, 0.04 + R() * 0.13), Math.min(hh * 1.6, 0.05 + R() * 0.16), Math.min(hd, 0.04 + R() * 0.13)]);
  }
  return chips;
}

// tone by plane for a lump bedded in the top of something: up-facing facets are the break surface,
// the rest take the nearest of the four upright directions
const axisLN = () => [0, 1, 0, 3];
// The broken top of a pier or buttress is an ERODED MASS, drawn like the break of a wall: one torn
// line across its width and another across its depth (straight slanted spans, a bite, a shoulder
// left standing), and the top is whatever lies under both. Every stone is cut to the two lines on
// the slant, so from any side the outline is a torn profile - never a prism with a lid, a gabled
// "house", a stack of slabs or a flight of steps.
function tornLine(a, b, h, ragged) {
  const L = b - a, dir = R() < 0.5 ? -1 : 1, fall = 0.3 + R() * 0.45, bite = R() < 0.7 ? a + L * (0.15 + R() * 0.7) : 1e9, biteD = (0.3 + R() * 0.5) * ragged;
  // a shoulder left standing on the high side, a fall, a bite - and every corner of the line off by a hand or two
  const base = (x) => h - ragged * fall * smooth(0.25, 0.9, dir > 0 ? (x - a) / L : (b - x) / L) - biteD * Math.max(0, 1 - Math.abs(x - bite) / (0.2 + 0.15 * L));
  const pts = [];
  // (short spans that rise and fall: the top is a jagged crown of small facets, never one long ramp -
  // a big sloping facet on a pier reads as a lean-to roof)
  for (let x = a - 0.2 - R() * 0.2; x < b + 0.6;) { pts.push([x, base(x) + (R() - 0.5) * 0.6 * Math.min(ragged, 1.2) + (R() < 0.2 ? 0.12 + R() * 0.2 : 0)]); x += R() < 0.7 ? 0.13 + R() * 0.17 : 0.3 + R() * 0.25; }
  for (let i = 1; i < pts.length; i++) {
    const lim = 2.4 * (pts[i][0] - pts[i - 1][0]);
    pts[i][1] = pts[i - 1][1] + Math.max(-lim, Math.min(lim, pts[i][1] - pts[i - 1][1]));
  }
  const f = (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
    return pts[pts.length - 1][1];
  };
  f.verts = pts.map((p) => p[0]);
  return f;
}
// [lo, hi] split at the corners of line T that lie over it and matter to a course whose top is yt
function pieces(lo, hi, T, yt) {
  const out = [lo];
  for (const v of T.verts) if (v > out[out.length - 1] + 0.07 && v < hi - 0.07 && T(v) < yt + 0.05) out.push(v);
  out.push(hi);
  return out.slice(0, -1).map((p, i) => [p, out[i + 1]]);
}
// the cut that trims a stone (p..q along axis 0 = x or 2 = z, course yb..yb+bh) to line T: null if
// the stone lies wholly above the line, [] if wholly below it. (u maps p..q to the block's -1..1)
function lineCut(T, p, q, yb, bh, axis, dj = 0) {
  const tl = T(p + 0.002) + dj, tr = T(q - 0.002) + dj;
  if (Math.max(tl, tr) < yb + 0.04) return null;
  if (tl >= yb + bh && tr >= yb + bh) return [];
  const yl = (tl - yb) / bh * 2 - 1, yr = (tr - yb) / bh * 2 - 1;
  return [{ n: axis === 0 ? [-(yr - yl) / 2, 1, 0] : [0, 1, -(yr - yl) / 2], d: (yl + yr) / 2 }];
}
// Buttress built of small stones, with sloped set-offs. P = base matrix: local x along the wall,
// local z pointing away from it. stages = [[topY, depth], ...]
function buttress(b, P, width, stages, ragged = 0) {
  b.setElem(P.elements[12], 3, P.elements[14]);
  // drawn on it: the plinth line carried round from the wall, and under every set-off a cornice
  // line (with a fainter drip line a course and a half lower under the first)
  // (the plinth line is on the front face only, and on every buttress at its own height - a hand or
  // two off the wall's: it never runs round a corner as one ruled line)
  const pOff = (((Math.abs(P.elements[12] * 7.31 + P.elements[14] * 3.17)) % 1) - 0.5) * 0.34;
  const lines = [[PLINTH + pOff + (Math.abs(pOff) < 0.07 ? 0.14 : 0), -1e3, 1e3, 0.75, 1]];
  const Pinv = P.clone().invert(), lp = new THREE.Vector3();
  for (let i = 0; i < stages.length - 1; i++) lines.push([stages[i][0] - 0.03, -1e3, 1e3, 1]);
  if (stages.length > 1 && stages[0][0] > 3.5) lines.push([stages[0][0] - 0.47, -1e3, 1e3, 0.6]);
  let y = Y0, k = 0, j = 0;
  const H = stages[stages.length - 1][0];
  const Tx = tornLine(-width / 2, width / 2, H + 0.1 * ragged, ragged * 0.8), Tz = tornLine(0, stages[stages.length - 1][1], H + 0.25 * ragged, ragged * 0.6);
  const topAt = (x, z) => Math.min(Tx(x), Tz(z));
  const ex = [erosion(H, 0.07), erosion(H, 0.07)], ez = [null, erosion(H, 0.05)];
  while (y < H + 0.5) {
    const bh = 0.26 + R() * 0.1;
    while (k < stages.length - 1 && y >= stages[k][0]) k++;
    const d = stages[k][1];
    const split = (j % 2 ? 0.38 : 0.62) + (R() - 0.5) * 0.1;
    for (const [a, e] of [[0, split], [split, 1]]) {
      // (the faces of a buttress are planes: stones differ by millimetres, not centimetres,
      // and no two neighbours are flush - see the wall stones)
      const lv = ((j % 2) * 2 + (a === 0 ? 0 : 1)) * 0.002 - 0.003, dd = d + lv;
      for (const [p, q] of pieces(a * width - width / 2, e * width - width / 2, Tx, y + bh)) for (const [u, v] of pieces(0, dd, Tz, y + bh)) {
        const dj = (R() - 0.5) * 0.03;
        const cx_ = lineCut(Tx, p, q, y, bh, 0, dj), cz_ = lineCut(Tz, u, v, y, bh, 2, dj);
        if (!cx_ || !cz_) continue;
        const cuts = [...cx_, ...cz_], nearTop = cuts.length > 0;
        b.setFeat({ line: lineFor(lines, y, y + bh) });
        b.block((p + q) / 2, y + bh / 2, (u + v) / 2, q - p + 0.006 + lv * 2, bh + 0.006, v - u + (v >= dd - 1e-6 ? 0 : 0.006), {
          parent: P, tone: R(), cap: nearTop ? 1 : 0, stain: Math.max(0, 1 - (Math.min(stages[k][0], topAt((p + q) / 2, (u + v) / 2)) - y) / 1.5) * 0.8,
          // (the stain is a continuous field over the buttress, per vertex: per stone it comes out in squares)
          // (an upper stage sheds less and for a shorter way: stained over its whole height it was one dark ruled panel)
          stainW: ((sTop, len, amt) => (pos) => { lp.copy(pos).applyMatrix4(Pinv); const tA = topAt(lp.x, lp.z); return Math.max(0, 1 - (Math.min(sTop, tA) - pos.y) / len) * (tA < sTop ? 0.5 : amt); })(stages[k][0], k > 0 ? 0.8 : 1.5, k > 0 ? 0.55 : 0.8),
          cuts, breakTop: true, line: 2, fixed: nearTop,               // (bedded by construction: see pier)
          arris: [v >= dd - 1e-6 ? (p <= -width / 2 + 0.01 ? -1 : q >= width / 2 - 0.01 ? 1 : 0) : 0, v >= dd - 1e-6 ? 1 : 0],
          // (its two outer arrises and its front weather back along slanted lines - see erosion)
          skew: erodeSkew(wobble(R, 0), ex, ez, p <= -width / 2 + 0.01 ? -1 : q >= width / 2 - 0.01 ? 1 : 0, v >= dd - 1e-6 ? 1 : 0, y, y + bh, (q - p) / 2, (v - u) / 2),
        });
        b.setFeat(null);
      }
    }
    // sloped weathering where the buttress steps back: two or three stones of different height and
    // pitch, their noses worn, toned as the front face of the buttress (a set-off is drawn with a
    // pale line along its top, it is not a lit wedge)
    if (k < stages.length - 1 && y + bh >= stages[k][0] && topAt(0, stages[k + 1][1] * 0.5) > y + bh + 0.3) {
      const d2 = stages[k + 1][1];
      const n = R() < 0.45 ? 3 : 2, cuts = [0];
      for (let i = 1; i < n; i++) cuts.push(i / n + (R() - 0.5) * 0.22);
      cuts.push(1);
      for (let i = 0; i < n; i++) {
        const a = cuts[i], e = cuts[i + 1];
        const hh = 0.3 + R() * 0.22, w = (e - a) * (width + 0.04), dd = d - d2 + 0.02 + R() * 0.05;
        const sk = wobble(R, 0.03);
        const drop = 1.45 + R() * 0.45;
        sk[6].y -= drop * (0.9 + R() * 0.2); sk[7].y -= drop * (0.9 + R() * 0.2);      // the two outer top corners: a worn slope
        sk[2].y -= R() * 0.3; sk[3].y -= R() * 0.3;
        sk[6].z -= R() * 0.25; sk[7].z -= R() * 0.25;
        const chips = [];
        if (R() < 0.6) chips.push([R() < 0.5 ? -1 : 1, 1, 1, 0.05 + R() * 0.14, hh * (0.3 + R() * 0.5), 0.06 + R() * 0.16]);
        if (R() < 0.5) chips.push([a === 0 ? -1 : 1, 1, 1, 0.02 + R() * 0.05, hh * (2 + R() * 3), 0.02 + R() * 0.05]);
        b.block((a + e) / 2 * (width + 0.04) - (width + 0.04) / 2, y + bh + hh / 2 - 0.01, d2 + dd / 2 - 0.02, w + 0.006, hh, dd, {
          parent: P, tone: 0.55 + R() * 0.3, cap: 1, skew: sk, chips,
          ln: (fn, o, cutF) => (!cutF && fn[0] !== 0 ? null : [0, 0, 1]),
        });
      }
    }
    y += bh; j++;
  }
  // lumps of core bedded in the break, so its outline is not two ruled planes
  if (ragged > 0) for (let n = 0; n < 3; n++) {
    const d = stages[stages.length - 1][1];
    const px = (R() - 0.5) * width * 0.75, pz = d * (0.2 + R() * 0.6), hh = 0.14 + R() * 0.16;
    if (topAt(px, pz) < 0.6) continue;
    b.rock(R, px, topAt(px, pz) - 0.03 + hh * 0.05, pz, 0.22 + R() * 0.25, hh, 0.18 + R() * 0.18, { parent: P, rot: new THREE.Euler((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4), n: 8, lo: 0.66, hi: 0.82, fixed: true, loose: false, lnW: axisLN });   // (toned as the mass it sits on: never a sunlit chip on a shaded stump)
  }
}

// How far an arris of a pier or buttress has weathered back, as a function of height: a polyline of
// straight slanted spans (nothing near the ground, a hand or more toward the top, one deeper bite).
// The outer stones are sheared to it, so the side of the mass is a wandering drawn edge, never a
// ruled prism edge and never a stair of stone ends.
function erosion(h, amt) {
  const pts = [[Y0, 0], [0.5 + R() * 0.4, 0]];
  const bite = 0.9 + R() * Math.max(0.2, h - 1.3);
  for (let y = pts[1][0]; y < h + 1;) {
    y += 0.3 + R() * 0.9;
    const up = smooth(0.4, h, y);
    pts.push([y, amt * (0.25 * R() + up * (0.3 + 0.7 * R())) + (Math.abs(y - bite) < 0.5 ? amt * (0.3 + 0.6 * R()) : 0)]);
  }
  return (y) => {
    if (y <= pts[0][0]) return 0;
    for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
    return pts[pts.length - 1][1];
  };
}
// the skew (unit-cube corner offsets) that shears a stone's outer faces to the erosion lines:
// ex / ez = [fn for the -side, fn for the +side] or null, out = which sides of this stone are outer faces
function erodeSkew(sk, ex, ez, outX, outZ, yb, yt, hx, hz) {
  for (let k = 0; k < 8; k++) {
    const y = k & 2 ? yt : yb;
    if (outX && ((k & 1) ? 1 : -1) === outX) sk[k].x -= outX * Math.min(1.85, ex[outX > 0 ? 1 : 0](y) / hx);
    if (outZ && ((k & 4) ? 1 : -1) === outZ) sk[k].z -= outZ * Math.min(1.85, ez[outZ > 0 ? 1 : 0](y) / hz);
  }
  return sk;
}
// The top of a free-standing stump, as a deviation (<= 0) from its height along one axis: short
// slanted spans that rise and fall, a bite or two - and NO overall fall, so two of them ADDED
// together (see pier) give an uneven crown, not a lean-to, a gable or a hipped roof.
function crownLine(a, b, ragged) {
  const pts = [], L = b - a, bite = a + L * (0.15 + R() * 0.7), tilt = (R() - 0.5) * 0.25 * ragged;
  for (let x = a - 0.15 - R() * 0.2; x < b + 0.5;) {
    const u = (x - a) / L - 0.5;
    pts.push([x, -ragged * (R() * 0.34 + (R() < 0.25 ? 0.2 + R() * 0.3 : 0)) + tilt * u - ragged * 0.3 * Math.max(0, 1 - Math.abs(x - bite) / (0.15 + 0.25 * L))]);
    x += R() < 0.6 ? 0.14 + R() * 0.16 : 0.3 + R() * 0.3;
  }
  for (let i = 1; i < pts.length; i++) { const lim = 2.6 * (pts[i][0] - pts[i - 1][0]); pts[i][1] = pts[i - 1][1] + Math.max(-lim, Math.min(lim, pts[i][1] - pts[i - 1][1])); }
  const f = (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
    return pts[pts.length - 1][1];
  };
  f.verts = pts.map((q) => q[0]);
  f.min = Math.min(...pts.map((q) => q[1]));
  return f;
}
const splitAt = (lo, hi, T, on) => {
  const out = [lo];
  if (on) for (const v of T.verts) if (v > out[out.length - 1] + 0.2 && v < hi - 0.2) out.push(v);
  out.push(hi);
  return out.slice(0, -1).map((q, i) => [q, out[i + 1]]);
};

// free-standing pier of small stones. What is left of it is an ERODED STUMP: its top is an uneven
// crown (two torn lines added, every stone cut to the resulting plane on the slant), its four
// arrises have weathered back along slanted lines, and it is one mass for the painter.
function pier(b, x, z, sx, sz, h, ragged = 0.8) {
  b.setElem(x, h / 2, z);
  b.footK = 0.7;
  const Tx = crownLine(x - sx / 2, x + sx / 2, ragged), Tz = crownLine(z - sz / 2, z + sz / 2, ragged * 0.8);
  const topAt = (px, pz) => h + Tx(px) + Tz(pz);
  // (the arrises wander from the ground up - a hand in and out on a slow line of their own - so no side of the
  // stump is a ruled edge, and the foot stone is sheared to them like the rest)
  const wand = (f) => { const a = R3() * 9, c = R3() * 9, k = 0.035 + R3() * 0.03; return (y) => f(y) + k * (1 + Math.sin(y * 2.3 + a) * 0.6 + Math.sin(y * 5.1 + c) * 0.4) * smooth(Y0 - 0.2, 0.5, y); };
  const ex = [wand(erosion(h, 0.11)), wand(erosion(h, 0.11))], ez = [wand(erosion(h, 0.11)), wand(erosion(h, 0.11))];
  // one corner of the stump is knocked off somewhere up its height
  const kc = [R3() < 0.5 ? -1 : 1, R3() < 0.5 ? -1 : 1, 0.75 + R3() * Math.max(0.2, h * 0.45 - 0.6), 0.34 + R3() * 0.2, 0.13 + R3() * 0.1];
  const low = h + Tx.min + Tz.min;
  const pl = 0.07;
  let y = Y0, j = 0;
  while (y < h + 0.3) {
    const foot = j === 0, bh = foot ? 0.9 + R() * 0.06 : 0.26 + R() * 0.1, e = foot ? pl : 0;
    const xs = j % 2 ? [0, 0.34 + R() * 0.06, 0.64 + R() * 0.06, 1] : [0, 0.44 + R() * 0.12, 1];
    const zs = j % 2 ? [0, 0.42 + R() * 0.1, 1] : [0, 0.55 + R() * 0.1, 1];
    const near = y + bh > low - 0.05;                            // this course reaches the crown: cut it at every corner of the two lines
    for (let i = 0; i < xs.length - 1; i++) for (let k = 0; k < zs.length - 1; k++) {
      const lv = (((j + i + k) % 2) * 2 + ((i + k) % 2)) * 0.004 - 0.006;
      const outX = i === 0 ? -1 : i === xs.length - 2 ? 1 : 0, outZ = k === 0 ? -1 : 1;
      for (const [p, q] of splitAt(x - sx / 2 + xs[i] * sx, x - sx / 2 + xs[i + 1] * sx, Tx, near)) for (const [u, v] of splitAt(z - sz / 2 + zs[k] * sz, z - sz / 2 + zs[k + 1] * sz, Tz, near)) {
        const xl = Tx(p + 0.002), xr = Tx(q - 0.002), zl = Tz(u + 0.002), zr = Tz(v - 0.002);
        const c0 = h + (xl + xr) / 2 + (zl + zr) / 2 + (R() - 0.5) * 0.02;
        const hi = c0 + Math.abs(xr - xl) / 2 + Math.abs(zr - zl) / 2, lo = c0 - Math.abs(xr - xl) / 2 - Math.abs(zr - zl) / 2;
        if (hi < y + 0.04) continue;
        const cuts = lo >= y + bh ? [] : [{ n: [-(xr - xl) / bh, 1, -(zr - zl) / bh], d: (c0 - y) / bh * 2 - 1 }];
        const last = cuts.length > 0;
        // (only the true outer faces are sheared: a piece split off inside the stone keeps its plumb joint)
        const oX = outX < 0 && p > x - sx / 2 + xs[i] * sx + 1e-6 ? 0 : outX > 0 && q < x - sx / 2 + xs[i + 1] * sx - 1e-6 ? 0 : outX;
        const oZ = outZ < 0 && u > z - sz / 2 + zs[k] * sz + 1e-6 ? 0 : outZ > 0 && v < z - sz / 2 + zs[k + 1] * sz - 1e-6 ? 0 : outZ;
        const wx = q - p + Math.abs(outX) * e + 0.006 + lv, wz = v - u + e + 0.006 + lv;
        // the foot stone spreads outward only (the plinth), the others are flush
        const chips = [];
        if (oX === kc[0] && oZ === kc[1] && y + bh > kc[2] - kc[3] && y < kc[2] + kc[3]) {
          // (a notch tapering to nothing above and below: each course loses a different amount)
          const dk = kc[4] * Math.max(0.25, 1 - Math.abs(y + bh / 2 - kc[2]) / kc[3]) * (0.7 + R3() * 0.6);
          chips.push([oX, y + bh / 2 < kc[2] ? 1 : -1, oZ, Math.min(wx * 0.8, dk * (0.8 + R3() * 0.5)), bh * (1.6 + R3() * 3), Math.min(wz * 0.8, dk * (0.8 + R3() * 0.5))]);
        }
        b.block((p + q) / 2 + outX * e / 2, y + bh / 2, (u + v) / 2 + outZ * e / 2, wx, bh + 0.006, wz, {
          tone: R(), cap: last || foot ? 1 : 0, stain: Math.max(0, 1 - (topAt((p + q) / 2, (u + v) / 2) - y) / 1.4),
          stainW: (pos) => 0.5 * Math.max(0, 1 - (topAt(pos.x, pos.z) - pos.y) / 1.0), chips,
          arris: [oX, oZ],
          cuts, breakTop: true, line: 2, skew: foot ? erodeSkew(wobble(R3, 0), ex, ez, oX, oZ, y, y + bh, wx / 2, wz / 2) : erodeSkew(wobble(R, 0), ex, ez, oX, oZ, y, y + bh, wx / 2, wz / 2),
          // (the crown is one continuous surface: wherever a piece of it stands, the course below is full
          // height under that spot. So a cut piece is bedded by construction - the bounding-box support
          // test of prune() cannot see that for a sliver whose middle hangs over a lower neighbour.)
          fixed: last,
        });
      }
    }
    y += bh; j++;
  }
  // lumps of core left on the break, bedded in it
  for (let n = 0; n < 3; n++) {
    const px = x + (R() - 0.5) * sx * 0.6, pz = z + (R() - 0.5) * sz * 0.6, hh = 0.16 + R() * 0.16;
    if (topAt(px, pz) < 0.5) continue;
    b.rock(R, px, topAt(px, pz) - 0.04 + hh * 0.05, pz, 0.26 + R() * 0.3, hh, 0.22 + R() * 0.24, { rot: new THREE.Euler((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4), n: 9, lo: 0.66, hi: 0.82, fixed: true, loose: false, lnW: axisLN });
  }
  b.footK = 0;
}

// A heap of fallen stone: a few big lumps half sunk in the turf, smaller ones lying on and between
// them, some still recognisably dressed blocks, and a scatter of small debris around.
function heap(b, x, z, n, spread, big = 0.55) {
  b.setElem(x, 0.4, z);
  // One light for the whole heap: every stone is toned from the direction "out of the heap" (from
  // a point under its middle), lifted a little, so the pile resolves into a light top-and-sunward
  // mass and a shade mass with one brushed boundary - not one tone per facet. The facets are not
  // drawn either (mode 1): a rock is an outline and a terminator, like a painted boulder.
  const hc = [x, height(x, z) - 0.1 - 0.08 * spread, z];
  // (... blended with the stone's own rounded form, so a stone lying out on the far side of the heap is
  // still a stone with a light top and a shade side - not a flat dark shape on the sunlit grass)
  const lnW = (pos, nn) => {
    const ax = pos.x - hc[0], az = pos.z - hc[2], ay = Math.max((pos.y - hc[1]) * 1.3 + 0.04 * spread, 0.3 * Math.hypot(ax, az)), l = Math.hypot(ax, ay, az) || 1;
    const k = 0.45, bx = ax / l * k + nn.x * (1 - k), by = ay / l * k + nn.y * (1 - k) + 0.15, bz = az / l * k + nn.z * (1 - k), bl = Math.hypot(bx, by, bz) || 1;
    return [bx / bl, by / bl, bz / bl, 1];
  };
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : R();                         // big first, small last
    const a = R() * Math.PI * 2, rr = Math.pow(R(), 0.8) * spread * (0.3 + 0.7 * t);
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, g = height(px, pz);
    const s = Math.max(0.16, big * (1.1 - 0.75 * Math.pow(t, 0.6)) * (0.75 + R() * 0.5));
    const pile = Math.pow(Math.max(0, 1 - rr / spread), 1.5) * spread * 0.2;
    const lift = t < 0.3 ? 0 : pile * (0.4 + R() * 0.6);
    const kind = R();
    const sx = s * (1 + R() * 0.7), sy = s * (0.55 + R() * 0.35), sz = s * (0.7 + R() * 0.5);
    const bury = lift > 0.03 ? sy * 0.12 : sy * (0.34 + R() * 0.26);          // (half sunk in the turf)
    const y = g + sy / 2 - bury + lift;
    const rot = new THREE.Euler((R() - 0.5) * (t < 0.3 ? 0.4 : 0.9), R() * 6.28, (R() - 0.5) * (t < 0.3 ? 0.4 : 0.9));
    const ground = g - 0.6 + R() * 0.7;
    if (kind < 0.6) {
      // A fallen dressed block, still angular: a skewed cuboid with one corner (sometimes two) broken
      // away and an arris or two knocked. Each of its faces is ONE flat tone - a light top, a half-tone
      // sun side, a shade side - the way a painter blocks in a squared stone. Lying at any angle.
      const chips = [[R() < 0.5 ? -1 : 1, 1, R() < 0.5 ? -1 : 1, sx * (0.2 + R() * 0.3), sy * (0.3 + R() * 0.5), sz * (0.2 + R() * 0.3)]];
      if (R() < 0.5) chips.push([R() < 0.5 ? -1 : 1, R() < 0.5 ? -1 : 1, R() < 0.5 ? -1 : 1, sx * (0.1 + R() * 0.25), sy * (0.2 + R() * 0.4), sz * (0.1 + R() * 0.25)]);
      if (R() < 0.6) chips.push([R() < 0.5 ? -1 : 1, 1, 0, sx * (0.06 + R() * 0.1), sy * (0.1 + R() * 0.2), Infinity]);
      // (none of its edges is ruled: see Builder.chunk - a squared stone with wandering arrises and a knocked corner)
      b.chunk(px, y, pz, sx, sy * 0.95, sz, { tone: R(), cap: 0, skew: wobble(R, 0.22), chips, rot, ground, loose: true, seed: R3() * 50 });
    } else {
      b.rock(R, px, y, pz, sx, sy * (kind < 0.75 ? 0.7 : 1.1), sz, { rot, ground, n: (s > 0.3 ? 17 : 10) + Math.floor(R() * 4), lo: 0.66, hi: 0.82, lnW });
    }
    ROCKS.push([px, pz, Math.max(sx, sz) * 0.5, g + sy / 2 - bury + lift + sy * 0.45]);
  }
  // small debris: fist-sized pieces lying in the grass around the heap
  const m = Math.round(n * 1.6);
  for (let i = 0; i < m; i++) {
    const a = R() * Math.PI * 2, rr = (0.25 + R() * 1.25) * spread;
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, g = height(px, pz);
    const s = 0.07 + R() * R() * 0.14;
    if (R() < 0.55) b.chunk(px, g + s * 0.1, pz, s * (1 + R() * 0.6), s * (0.5 + R() * 0.4), s * (0.7 + R() * 0.4), {
      rot: new THREE.Euler((R() - 0.5) * 0.6, R() * 6.28, (R() - 0.5) * 0.6), ground: g - 0.4 + R() * 0.5, tone: R(), skew: wobble(R, 0.3),
      chips: [[R() < 0.5 ? -1 : 1, 1, R() < 0.5 ? -1 : 1, s * 0.4, s * 0.3, s * 0.3]], loose: true, seed: R3() * 50,
    });
    else b.rock(R, px, g + s * 0.12, pz, s * (1 + R() * 0.6), s * (0.5 + R() * 0.4), s * (0.7 + R() * 0.4), {
      rot: new THREE.Euler((R() - 0.5) * 0.6, R() * 6.28, (R() - 0.5) * 0.6), ground: g - 0.4 + R() * 0.5, n: 2, lo: 0.6, hi: 0.8, lnW,
    });
    ROCKS.push([px, pz, s * 0.6, g + s * 0.45]);
  }
}

export function buildRuin(scene) {
  const b = new Builder();
  b.warp = ruinWarp;

  const BM = (x, z, ry) => new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z);
  for (const W of WALLS) wall(b, W);
  for (const [x, z, ry, width, stages, ragged] of BUTTRESSES) buttress(b, BM(x, z, ry), width, stages, ragged);
  for (const [x, z, sx, sz, h, ragged] of PIERS) pier(b, x, z, sx, sz, h, ragged);
  b.clearElem();

  // ---- floor: remnants of the paving. Slabs lie tilted and sunk; some are cracked across, with
  // the two halves settled differently, some have lost a corner.
  // (the paving is a mesh of its own: its shader variant discards what the turf has covered - see stone.js)
  const pv = new Builder(); pv.warp = ruinWarp;
  // (c14: each slab is laid 4 cm wider than its record, so the slabs of an island close up - from
  // above the joints are drawn lines, not a grid of turf seams)
  for (const [cx, cz, w0, d0_, ry, tx, tz, sink, crack, corner] of SLABS) {
    const w = w0 + 0.04, d = d0_ + 0.04;
    const g = height(cx, cz) + 0.03 - sink;                      // (top 6 cm above the turf at most: no side face to speak of)
    // one element per patch of paving (cells of about 3.5 m)
    { const ex = Math.round(cx / 3.4) * 3.4, ez = Math.round((cz + 0.5) / 3.6) * 3.6 - 0.5; pv.setElem(ex, height(ex, ez), ez); }
    const chips = [];
    if (corner) chips.push([corner[0], 1, corner[1], Math.min(w * 0.6, corner[2]), Infinity, Math.min(d * 0.6, corner[3])]);
    // worn corners
    for (const kx of [-1, 1]) for (const kz of [-1, 1]) if (R() < 0.3 && !(corner && corner[0] === kx && corner[1] === kz)) chips.push([kx, 1, kz, 0.03 + R() * 0.08, Infinity, 0.03 + R() * 0.08]);
    // what is left of a slab is not a rectangle: one to three edges have broken away on a slant,
    // and it has turned a little on its bed. So from above the paving is scattered fragments, no grid.
    const edge = [];
    for (let i = 0, n = 1 + Math.floor(R() * 2.6); i < n; i++) {
      const a = Math.floor(R() * 4) * Math.PI / 2 + (R() - 0.5) * 0.9, nx = Math.cos(a), nz = Math.sin(a);
      edge.push({ n: [nx, 0, nz], d: (Math.abs(nx) + Math.abs(nz)) * (0.55 + R() * 0.3) });
    }
    const ry2 = ry + (R() - 0.5) * 0.22;
    // (the paving is two or three ISLANDS of stone, not a grid of tiles: every slab of an island is the same tone)
    const isl = fbm(cx * 0.21 + 7.3, cz * 0.21 + 3.1, 2) > 0.5 ? 0.0504 : 0.1763, tSlab = R();
    void tSlab;
    const base = { tone: isl, ground: -20, ln: () => [0, 1, 0] };   // (ground -20: the shader knows paving by it)   // (its edge faces are the tone of its top: a slab is one flat shape)
    if (!crack) {
      pv.block(cx, g, cz, w, 0.07, d, { ...base, rot: new THREE.Euler(tx, ry2, tz), skew: wobble(R, 0.025), chips, cuts: edge });
      continue;
    }
    const [t, k] = crack, long = w >= d;
    const n = long ? [1, 0, k] : [k, 0, 1], d0 = t * 2 - 1, gap = 0.012 / ((long ? w : d) / 2);
    const cornerCuts = (o) => o.chips.map(([kx, ky, kz, ax, ay, az]) => cutCorner(kx, ky, kz, ax / (w / 2), ay / 0.035, az / (d / 2)));
    const sk = wobble(R, 0.025);
    pv.block(cx, g, cz, w, 0.07, d, { ...base, rot: new THREE.Euler(tx, ry2, tz), skew: sk, cuts: [{ n, d: d0 - gap }, ...edge, ...cornerCuts({ chips })] });
    pv.block(cx, g - 0.006 - R() * 0.02, cz, w, 0.07, d, {
      ...base, tone: (R(), isl), rot: new THREE.Euler(tx + (R() - 0.5) * 0.05, ry2 + (R() - 0.5) * 0.03, tz + (R() - 0.5) * 0.05), skew: sk,
      cuts: [{ n: [-n[0], 0, -n[2]], d: -(d0 + gap) }, ...edge, ...cornerCuts({ chips })],
    });
  }
  // steps at the south door, worn and uneven
  // (they go with the paving: where the turf has covered a tread the ground shows, not a quad of turf colour)
  pv.setElem(0, height(0, ZF + 1.5), ZF + 1.5);
  for (let i = 0; i < 3; i++) {
    const z = ZF + 1.0 + i * 0.52;
    let x = -2.5 - R() * 0.2;
    while (x < 2.4) {
      const w = 0.7 + R() * 0.8;
      if (R() > 0.14) {
        const chips = [];
        if (R() < 0.6) chips.push([R() < 0.5 ? -1 : 1, 1, 1, 0.06 + R() * 0.2, 0.03 + R() * 0.07, 0.05 + R() * 0.14]);
        if (R() < 0.3) chips.push([R() < 0.5 ? -1 : 1, 1, 1, 0.1 + R() * 0.25, Infinity, 0.1 + R() * 0.2]);
        pv.block(x + w / 2, height(0, z) - 0.03 - i * 0.04 - R() * 0.03, z + (R() - 0.5) * 0.07, w - 0.02, 0.2, 0.54,
          { tone: R(), cap: 1, skew: wobble(R, 0.07), chips, rot: new THREE.Euler((R() - 0.5) * 0.05, (R() - 0.5) * 0.07, (R() - 0.5) * 0.05), ground: -20 });
      }
      x += w;
    }
  }

  b.clearElem();
  // ---- rubble: heaps of fallen stone spilled from the east wall and the gable
  heap(b, XE + 1.6, -1.2, 15, 2.2, 0.6);
  heap(b, XE + 2.6, 2.4, 13, 2.4);
  heap(b, XE + 0.9, 5.0, 9, 1.6, 0.4);
  heap(b, 3.2, -7.6, 8, 1.4, 0.45);
  heap(b, XE + 4.6, -0.2, 7, 2.6, 0.35);
  heap(b, XW - 1.8, 8.6, 6, 1.2, 0.35);
  for (let i = 0; i < 20; i++) { const a = R() * 6.28, rr = 2 + R() * 6.5; heap(b, XE + 1.5 + Math.cos(a) * rr * 0.8, 1.5 + Math.sin(a) * rr, 1, 0.2, 0.26); }

  const pruned = b.prune();
  const mesh = new THREE.Mesh(b.geometry(), stoneMaterial());
  mesh.userData.pruned = pruned;
  mesh.userData.shadowMat = stoneShadow();
  mesh.frustumCulled = false;
  scene.add(mesh);
  stonePrepass(scene, mesh);
  { const t0 = performance.now(), sc = snowCaps(mesh); scene.add(sc); console.info(`[ruin] snow caps: ${(sc.geometry?.index.count ?? 0) / 3} triangles in ${(performance.now() - t0).toFixed(0)} ms`); }
  const paving = new THREE.Mesh(pv.geometry(), stoneMaterial({ paving: true }));
  paving.frustumCulled = false;
  scene.add(paving);
  return mesh;
}
