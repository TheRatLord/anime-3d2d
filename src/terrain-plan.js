// The planned drifts of the meadow: the meadow map and the plan baked from it (PLAN). Pure arithmetic with no
// dependency on the page or on THREE, so that src/paint.worker.js can bake the plan while the page loads;
// src/terrain.js reads the meadow map here and makes textures of it.
import { rng } from './rng.js';
import { SUBJECT } from './subject.js';

// ---- meadow map: a small tileable noise texture (1 texel = 1 m, period 256 m) that both the
// shaders and the CPU scatter code (src/extra/grass.js) can read, so flower drifts in the wash,
// flower instances, tuft clumps and the ragged path edge all agree with each other.
//   R yellow drift   G pink drift   B lilac/blue drift   A white drift / clump / path-edge wobble
export const MN = 256;
function periodicFbm(seed, baseFreq, octaves, sx = 1) {
  const R = rng(seed);
  const out = new Float32Array(MN * MN);
  let amp = 0.5, freq = baseFreq, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const fx_ = Math.max(1, Math.round(freq * sx)), fy_ = freq;
    const g = new Float32Array(fx_ * fy_);
    for (let i = 0; i < g.length; i++) g[i] = R();
    // (the lattice cell and the smoothstep of every column, found once per octave instead of once per texel)
    const cx0 = new Int32Array(MN), cx1 = new Int32Array(MN), csx = new Float64Array(MN);
    for (let x = 0; x < MN; x++) {
      const fx = (x / MN) * fx_, x0 = Math.floor(fx), tx = fx - x0;
      cx0[x] = x0 % fx_; cx1[x] = (x0 + 1) % fx_; csx[x] = tx * tx * (3 - 2 * tx);
    }
    for (let y = 0; y < MN; y++) {
      const fy = (y / MN) * fy_, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % fy_) * fx_, r1 = ((y0 + 1) % fy_) * fx_;
      for (let x = 0; x < MN; x++) {
        const sxx = csx[x], i0 = cx0[x], i1 = cx1[x];
        const a = g[r0 + i0], b = g[r0 + i1];
        const c = g[r1 + i0], d = g[r1 + i1];
        out[y * MN + x] += amp * (a + (b - a) * sxx + (c - a) * sy + (a - b - c + d) * sxx * sy);
      }
    }
    norm += amp; amp *= 0.5; freq *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.max(0, (out[i] / norm - 0.5) * 1.7 + 0.5));
  return out;
}
export const MEADOW = new Uint8Array(MN * MN * 4);
{
  // drifts are stretched east-west a little so they band together down the slopes
  const ch = [periodicFbm(301, 7, 4, 0.6), periodicFbm(302, 6, 4, 0.6), periodicFbm(303, 8, 4, 0.7), periodicFbm(304, 8, 5)];
  for (let i = 0; i < MN * MN; i++) for (let k = 0; k < 4; k++) MEADOW[i * 4 + k] = Math.round(ch[k][i] * 255);
}
// bilinear lookup, identical to texture(uMeadow, (p + 0.5) / 256.) in the shaders; returns [r,g,b,a] in 0..1
export function meadowAt(x, z) {
  return meadowInto(x, z, [0, 0, 0, 0]);
}
// (the same, into an array the caller keeps: for the loops that read it a million times)
export function meadowInto(x, z, o) {
  const x0 = Math.floor(x), z0 = Math.floor(z), tx = x - x0, tz = z - z0;
  // MN is a power of two; masking wraps negative integer coordinates as well.
  const xi = x0 & (MN - 1), zi = z0 & (MN - 1), xj = (xi + 1) & (MN - 1), zj = (zi + 1) & (MN - 1);
  const ia = (zi * MN + xi) * 4, ib = (zi * MN + xj) * 4;
  const ic = (zj * MN + xi) * 4, id = (zj * MN + xj) * 4;
  for (let k = 0; k < 4; k++) {
    const a = MEADOW[ia + k], b = MEADOW[ib + k];
    const c = MEADOW[ic + k], d = MEADOW[id + k];
    o[k] = (a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz) / 255;
  }
  return o;
}
// one channel of meadowAt (k = 0..3), without the other three or the array
export function meadowCh(x, z, k) {
  const x0 = Math.floor(x), z0 = Math.floor(z), tx = x - x0, tz = z - z0;
  const xi = x0 & (MN - 1), zi = z0 & (MN - 1), xj = (xi + 1) & (MN - 1), zj = (zi + 1) & (MN - 1);
  const a = MEADOW[(zi * MN + xi) * 4 + k], b = MEADOW[(zi * MN + xj) * 4 + k];
  const c = MEADOW[(zj * MN + xi) * 4 + k], d = MEADOW[(zj * MN + xj) * 4 + k];
  return (a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz) / 255;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { sstep };
const EDGE_SCALE = 9, EDGE_OX = 31, EDGE_OZ = 77, EDGE_AMP = 0.34, PLAN_WARP = 2.4;
// Hue palettes: a band has ONE dominant family and two or three minority accents, mixed in CLUSTERS 1-3 m
// across (a world noise decides, see flowerFam): [dominant, accent, accent, accent]; 0 white, 1 yellow, 3 magenta, 4 orange
export const PALS = [[1, 4, 3, 0], [3, 0, 1, 4], [4, 1, 0, 3], [0, 1, 3, 4], [1, 0, 4, 3], [3, 4, 0, 1]];
const palCh = (p) => { const d = PALS[p][0]; return d === 3 ? 1 : d === 0 ? 2 : 0; };
// Planned drifts. Within ~30 m of the chapel the noise field is switched off (NOISE_IN .. NOISE_OUT) and the
// meadow is composed by hand: a FEW bands, each an arc around the chapel - so that it lies across any view
// toward the chapel or out from it. A band is not a carpet: its depth swells and pinches along its length and
// it is broken into drifts with gaps (a world noise, GAP_*), and about it lie small satellite drifts.
// [radius of the centre line (m, from 0,-1), angle of the middle (deg; 0 east, 90 south), half length (deg),
//  half depth (m), amount, palette, how far it swells / pinches / breaks with the gap noise (1 = to nothing; 0 = a plain satellite)]
const ARCS = [
  [16.6, 53, 27, 2.5, 0.82, 0, 0.5],      // the lawn east of the path: lower third of hero
  [11.4, 60, 33, 1.45, 0.92, 3, 0.25],    // the pale band at the foot of the chapel, east of the door (hero, low, pathback)
  [27.5, 73, 24, 2.4, 0.80, 2, 1],      // across the path further down: foreground of pathback
  [11.7, 119, 26, 1.45, 0.92, 1, 0.25],   // the band at the foot of the chapel west of the door (front, pathback)
  [18.5, 127, 22, 2.0, 0.74, 4, 1],     // the west lawn
  [26.6, 137, 22, 2.1, 0.80, 0, 1],     // the west rim (feet, rim, meadow)
  [22.5, 180, 19, 2.0, 0.74, 2, 1],     // west of the chapel
  [17.5, -112, 24, 1.8, 0.74, 1, 1],    // north-west, behind the chapel
  [28.0, -72, 23, 1.9, 0.70, 5, 1],     // north
  [22.5, 3, 21, 1.8, 0.66, 4, 1],       // east: foreground of the view in from the east rim
  [13.8, -27, 20, 1.5, 0.76, 0, 1],     // east-north-east, near the wall
  [35.0, 33, 19, 1.5, 0.64, 2, 1],      // south-east, further out
  [39.0, 103, 22, 1.8, 0.70, 3, 1],     // south, further out
  [33.5, -166, 17, 1.8, 0.72, 1, 1],    // west, further out: foreground of the views out over the west rim
  [43.0, 156, 13, 2.2, 0.80, 4, 1],     // south-west slope
  [40.0, -30, 15, 1.5, 0.64, 5, 1],     // north-east slope
];
// Drifts that do NOT lie on a ring about the chapel (rings alone stack up the lawn as parallel ribbons in any view
// along a radius): each an oblique, slightly bent body that swells, pinches and breaks with the same gap noise.
// [x, z, half length (m), half depth (m), direction of the long axis (deg; 0 = east-west), amount, palette, gap share, bend]
const BLOBS = [
  [9.6, 10.4, 3.4, 1.5, -28, 0.80, 2, 0.6, 0.5],      // between the foot band and the hero lawn
  [13.5, 15.5, 2.6, 1.3, 62, 0.78, 1, 0.5, -0.4],    // right edge of hero
  [6.6, 15.4, 2.4, 1.1, 35, 0.80, 4, 0.3, 0.3],      // by the path: lower left of hero
  [2.3, 19.6, 3.3, 1.3, 42, 0.80, 3, 0.6, 0.4],      // west of the path (front, pathback, path)
  [10.8, 19.0, 2.6, 1.2, 52, 0.80, 5, 0.5, -0.5],    // east of the path: foreground of path
  [6.3, 25.0, 3.0, 1.3, 58, 0.78, 0, 0.6, 0.4],      // west of the path further down (pathback)
  [15.0, 23.5, 3.2, 1.5, -64, 0.78, 3, 0.6, 0.5],    // east of the path further down
  [-7.6, 12.6, 3.0, 1.3, 18, 0.80, 0, 0.6, -0.4],    // the front lawn west of the cross
  [-1.0, 13.3, 1.8, 0.9, -12, 0.78, 4, 0.3, 0.3],    // by the path below the steps (front)
  [-17.6, 21.6, 3.0, 1.5, -38, 0.80, 3, 0.5, 0.5],   // meadow, feet
  [-19.2, 17.6, 2.3, 1.3, 30, 0.82, 1, 0.3, -0.3],   // feet
  [-24.0, 10.5, 3.0, 1.4, 74, 0.78, 5, 0.6, 0.4],    // treeW, rim
  [-27.0, 4.0, 2.4, 1.1, -70, 0.74, 3, 0.6, -0.5],   // treeW
  [2.6, -19.6, 3.4, 1.4, 8, 0.80, 3, 0.5, 0.4],      // out180, nosegable
  [1.6, -15.2, 2.6, 1.0, -10, 0.80, 1, 0.4, -0.3],   // nosegable
  [13.6, -2.6, 2.6, 1.2, 80, 0.78, 3, 0.5, 0.4],     // eastside
  [9.4, -4.2, 2.6, 0.9, 86, 0.86, 3, 0.3, 0.3],      // in the rough grass at the foot of the east wall (eastside)
  [16.5, 3.5, 2.4, 1.1, -72, 0.76, 2, 0.6, -0.4],    // eastside, rubble
  [-13.0, -8.5, 2.6, 1.1, 60, 0.74, 4, 0.6, 0.4],    // north-west lawn
  [-15.17, 15.17, 2.6, 1.7, 45, 0.84, 1, 0.1, 0.3],    // a swelling drift across the near ground of grasslow, 2-4 m from the eye
  [-1.2, 20.1, 2.7, 0.9, 4, 0.82, 1, 0.3, -0.3],     // the pink and white drift at the lower right of out0
  [-3.4, 8.9, 2.2, 0.85, -33, 0.84, 4, 0.25, 0.35], // entering front from its lower left, toward the steps
  // the slopes below the west and south-west rim (drift, rimdown): broad bodies, seen from the brow as bands
  [-41.0, 25.5, 4.0, 1.8, 62, 0.84, 3, 0.4, 0.4], [-45.5, 15.5, 3.5, 1.5, 70, 0.84, 5, 0.4, -0.4],   // the near plane of drift
  [-30.6, 33.4, 2.8, 1.3, -30, 0.84, 1, 0.4, -0.4], [-36.0, 34.5, 2.6, 1.2, 40, 0.84, 3, 0.4, 0.4],     // and of rimdown
  [-36.5, 18.5, 5.0, 2.0, 68, 0.84, 1, 0.5, 0.4], [-44.0, 22.0, 6.5, 2.4, 60, 0.84, 0, 0.6, -0.4], [-52.0, 27.0, 8.0, 3.0, 66, 0.84, 4, 0.6, 0.4],
  [-62.0, 31.0, 9.0, 3.4, 72, 0.84, 3, 0.6, -0.3], [-74.0, 37.0, 11.0, 4.0, 70, 0.84, 2, 0.6, 0.3],
  [-35.0, 31.0, 4.5, 1.8, 30, 0.84, 4, 0.5, 0.4], [-39.0, 38.5, 6.0, 2.3, 35, 0.84, 0, 0.6, -0.4], [-45.0, 47.0, 8.0, 3.0, 28, 0.84, 1, 0.6, 0.4],
  [-52.0, 58.0, 10.0, 3.6, 30, 0.84, 5, 0.6, -0.3], [-31.0, 40.0, 3.0, 1.3, 20, 0.80, 2, 0.4, 0.3],
].map((b) => [...b, Math.cos(b[4] * Math.PI / 180), Math.sin(b[4] * Math.PI / 180)]);
const RAD = Math.PI / 180;
{
  // satellites: three to five small drifts (1.5-5 m long, about 1 m deep) lying off every band, most in its palette
  const R = rng(5150), n0 = ARCS.length;
  for (let i = 0; i < n0; i++) {
    const [rc, a0, ha, hd, , pal] = ARCS[i];
    for (let k = 0, n = 3 + Math.floor(R() * 3); k < n; k++) {
      const a = a0 + (R() * 2 - 1) * ha * 1.15, side = R() < 0.5 ? -1 : 1;
      const r = rc + side * (hd * 1.3 + 1.2 + R() * 3.2), len = 0.8 + R() * 1.8;
      const p = R() < 0.7 ? pal : Math.floor(R() * PALS.length);
      const rec = [r, a, len / r / RAD, 0.42 + R() * 0.5, 0.60 + R() * 0.12, p, 0];
      if (r > 9.5) ARCS.push(rec);
    }
  }
  // and by hand in the foregrounds that the bands leave empty [x, z, half length (m), half depth (m), palette]
  for (const [x, z, len, hd, pal] of [
    [-27.5, -0.5, 1.5, 0.6, 1], [-30.0, -3.6, 2.2, 0.8, 0], [-26.0, -4.6, 1.1, 0.5, 3],          // flowers
    [-3.3, 16.5, 1.2, 0.55, 4], [-1.4, 16.0, 0.8, 0.45, 1], [-5.6, 17.3, 1.3, 0.5, 0],            // cross, crossnear
    [-5.5, -15.6, 2.2, 0.8, 0], [-2.4, -13.4, 1.3, 0.6, 2], [-8.6, -14.4, 1.4, 0.6, 4],          // back
    [-33.0, 16.2, 1.7, 0.65, 0], [-36.5, 19.6, 2.2, 0.8, 1], [-34.5, 13.2, 1.0, 0.5, 3],          // drift
    [-43.5, 21.5, 3.4, 1.2, 0], [-49.5, 25.5, 4.2, 1.5, 4], [-46.5, 17.5, 2.2, 0.9, 1], [-41.0, 25.5, 1.6, 0.7, 3],
    [-37.0, 36.0, 3.0, 1.1, 2], [-40.5, 41.5, 4.0, 1.4, 0], [-34.5, 40.5, 1.8, 0.8, 1], [-42.0, 35.0, 1.5, 0.7, 3],     // rimdown, the slope below
    [-63.0, 31.0, 6.0, 1.8, 0], [-72.0, 39.0, 8.0, 2.4, 2], [-58.0, 38.0, 3.5, 1.3, 1], [-80.0, 33.0, 5.0, 2.0, 4],     // the far slope west (drift)
    [-50.0, 56.0, 6.0, 2.0, 4], [-56.0, 66.0, 8.0, 2.6, 0], [-44.0, 62.0, 3.5, 1.3, 1],                                 // and south-west (rimdown)
    [-32.0, 28.2, 1.6, 0.6, 4], [-34.8, 30.8, 2.0, 0.7, 2], [-30.6, 31.6, 1.0, 0.5, 1],           // rimdown
  ]) { const r = Math.hypot(x - SUBJECT.x, z - SUBJECT.z); ARCS.push([r, Math.atan2(z - SUBJECT.z, x - SUBJECT.x) / RAD, len / r / RAD, hd, 0.66, pal, 0]); }
}
const ARC_WARP = 4.0, ARC_WS = 0.8, ARC_WOX = 17, ARC_WOZ = 9, ARC_MIN = 0.14, NOISE_IN = 34, NOISE_OUT = 50, NOISE_DROP = 0.30, NOISE_K = 0.0;
const GAP_S = 3.2, GAP_OX = 7, GAP_OZ = 83;
// Conservative radial bins omit only arcs already rejected by the v test below.
// Keep original order: accumulation and strongest-palette ties must stay identical.
const ARC_BIN = 4;
const arcBins = [];       // per bin: [satellites, warped bands], as indices into ARCS (ascending: the original order)
ARCS.forEach((A, n) => {
  const reach = 2.4 * A[3] * (A[6] ? 1.6 : 1);
  const lo = Math.floor((A[0] - reach) / ARC_BIN) - 1;
  const hi = Math.floor((A[0] + reach) / ARC_BIN) + 1;
  for (let i = lo; i <= hi; i++) {
    const bin = arcBins[i] ??= [[], []];
    bin[A[6] ? 1 : 0].push(n);
  }
});
// on the lower slopes and at the foot of the hill (seen from the brow as bands lying toward the horizon) the noise
// drifts are let grow: this much is added to the three fields from FOOT_IN to FOOT_OUT metres out
const FOOT = 0.11, FOOT_IN = 68, FOOT_OUT = 88;
const EMPTY_ARCS = [];
// the planned drifts at (x, z): [yellow, pink, white, palette of the strongest one or -1]
// (wx, wz: the push of the edge noise - the bands are read at the pushed place, the small satellites at a
// third of it, or they would be torn to shreds)
// the blobs whose reach (|dx| + |dz| <= 2.6 * (half length + half depth)) touches each 8 m cell of the plan
const BLOB_CELL = 8, BLOB_N = 32, BLOB_OFF = 128, ALL_BLOBS = BLOBS.map((_, i) => i);
const blobCells = Array.from({ length: BLOB_N * BLOB_N }, (_, ci) => {
  const cx = -BLOB_OFF + ((ci % BLOB_N) + 0.5) * BLOB_CELL, cz = -BLOB_OFF + (Math.floor(ci / BLOB_N) + 0.5) * BLOB_CELL;
  return ALL_BLOBS.filter((i) => { const B = BLOBS[i]; return Math.abs(cx - B[0]) + Math.abs(cz - B[1]) <= 2.6 * (B[2] + B[3]) + BLOB_CELL; });
});
function blobsNear(x, z) {
  const i = Math.floor((x + BLOB_OFF) / BLOB_CELL), j = Math.floor((z + BLOB_OFF) / BLOB_CELL);
  return i < 0 || j < 0 || i >= BLOB_N || j >= BLOB_N ? ALL_BLOBS : blobCells[j * BLOB_N + i];
}
function arcField(x0, z0, wx, wz) {
  const x = x0 + wx, z = z0 + wz, xs = x0 + wx * 0.3, zs = z0 + wz * 0.3;
  const ddx = x - SUBJECT.x, ddz = z - SUBJECT.z, ex = xs - SUBJECT.x, ez = zs - SUBJECT.z;
  const r0 = Math.sqrt(ddx * ddx + ddz * ddz);
  // The blobs that can reach this place (a coarse grid of lists, in the original order)
  const cand = blobsNear(x, z);
  // Nowhere near any drift (the warp of the bands is at most ARC_WARP / 2 metres): nothing to add.
  if (!cand.length) {
    const w2 = ARC_WARP / 2, rs0 = Math.sqrt(ex * ex + ez * ez);
    let near = !!arcBins[Math.floor(rs0 / ARC_BIN)]?.[0].length;
    for (let b = Math.floor((r0 - w2) / ARC_BIN), b1 = Math.floor((r0 + w2) / ARC_BIN); b <= b1 && !near; b++) near = !!arcBins[b]?.[1].length;
    if (!near) return [0, 0, 0, -1];
  }
  const rw = r0 + (meadowCh(x * ARC_WS + ARC_WOX, z * ARC_WS + ARC_WOZ, 3) - 0.5) * ARC_WARP;
  const rs = Math.sqrt(ex * ex + ez * ez);
  const gx = x * GAP_S + GAP_OX, gz = z * GAP_S + GAP_OZ, gm2 = meadowCh(gx, gz, 2);
  const gap = sstep(0.28, 0.44, meadowCh(gx, gz, 3)), wid = 0.45 + 1.15 * gm2;
  const o = [0, 0, 0, -1];
  let bw = ARC_MIN;
  // Merge the satellite and warped-band lists in their original ARCS order.
  const small = arcBins[Math.floor(rs / ARC_BIN)]?.[0] ?? EMPTY_ARCS;
  const bands = arcBins[Math.floor(rw / ARC_BIN)]?.[1] ?? EMPTY_ARCS;
  // (the two bearings only where a list is not empty)
  const a = bands.length ? Math.atan2(ddz, ddx) : 0, as = small.length ? Math.atan2(ez, ex) : 0;
  let si = 0, bi = 0;
  while (si < small.length || bi < bands.length) {
    const A = ARCS[bi >= bands.length || (si < small.length && small[si] < bands[bi]) ? small[si++] : bands[bi++]];
    const hd = A[3] * (A[6] ? wid : 1), v = ((A[6] ? rw : rs) - A[0]) / hd;
    if (Math.abs(v) > 2.4) continue;
    let da = (A[6] ? a : as) - A[1] * RAD; da -= 6.2831853 * Math.round(da / 6.2831853);
    const u = da / (A[2] * RAD), u2 = u * u;
    if (u2 > 2.4) continue;
    const w = A[4] * (1 - A[6] * (1 - gap)) * Math.exp(-u2 * u2 - v * v);
    o[palCh(A[5])] += w;
    if (w > bw) { bw = w; o[3] = A[5]; }
  }
  const wr = rw - r0;                       // the push of the slow warp (m), shared with the bands
  for (let bi = 0; bi < cand.length; bi++) {
    const B = BLOBS[cand[bi]];
    const dx = x - B[0], dz = z - B[1];
    if (Math.abs(dx) + Math.abs(dz) > 2.6 * (B[2] + B[3])) continue;
    const u = (dx * B[9] + dz * B[10]) / B[2], u2 = u * u;
    if (u2 > 2.4) continue;
    const hd = B[3] * (0.55 + 0.9 * gm2);
    const v = (-dx * B[10] + dz * B[9] + wr * 0.45 + B[8] * B[3] * (u2 - 0.4)) / hd;
    if (Math.abs(v) > 2.4) continue;
    const w = B[5] * (1 - B[7] * (1 - gap)) * Math.exp(-u2 * u2 - v * v);
    o[palCh(B[6])] += w;
    if (w > bw) { bw = w; o[3] = B[6]; }
  }
  return o;
}

const PN = 768, PEXT = 96;
export { PN, PEXT };
const _me = [0, 0, 0, 0];
// the plan: 768 x 768 texels over +-96 m. rgb = what the planned drifts add to the three colour fields,
// a = palette * 32 (255 = none)
export function computePlan() {
  const PLAN = new Uint8Array(PN * PN * 4);
  for (let j = 0; j < PN; j++) for (let i = 0; i < PN; i++) {
    const x = -PEXT + ((i + 0.5) / PN) * 2 * PEXT, z = -PEXT + ((j + 0.5) / PN) * 2 * PEXT, o = (j * PN + i) * 4;
    if (x * x + z * z > 95 * 95) { PLAN[o + 3] = 255; continue; }
    const e = meadowInto(x * EDGE_SCALE + EDGE_OX, z * EDGE_SCALE + EDGE_OZ, _me);
    const p = arcField(x, z, (e[0] - 0.5) * PLAN_WARP, (e[1] - 0.5) * PLAN_WARP);
    for (let k = 0; k < 3; k++) PLAN[o + k] = Math.round(Math.min(1, p[k]) * 255);
    PLAN[o + 3] = p[3] < 0 ? 255 : p[3] * 32;
  }
  return PLAN;
}

export { EDGE_SCALE, EDGE_OX, EDGE_OZ, EDGE_AMP, PLAN_WARP, FOOT, FOOT_IN, FOOT_OUT, NOISE_IN, NOISE_OUT, NOISE_DROP, NOISE_K };
