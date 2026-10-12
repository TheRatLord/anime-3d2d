// The hill. Ground colour is a shared GLSL function so grass tufts can take the exact
// colour of the ground under them.
import * as THREE from 'three';
import { mat, shadowMat, WIND_GLSL, HAZE } from './glsl.js';
import { height, PATH, PATH_LEN, rng, SUN, vnoise, cachedNoise, SUBJECT, floorRect } from './world.js';
import {
  MN, MEADOW, meadowAt, meadowCh, meadowInto, sstep, PALS, PN, PEXT, computePlan,
  EDGE_SCALE, EDGE_OX, EDGE_OZ, EDGE_AMP, FOOT, FOOT_IN, FOOT_OUT, NOISE_IN, NOISE_OUT, NOISE_DROP, NOISE_K,
} from './terrain-plan.js';

export { meadowAt, meadowCh, PALS };

// (the meadow map and the planned drifts are src/terrain-plan.js)

const meadowTex = new THREE.DataTexture(MEADOW, MN, MN, THREE.RGBAFormat, THREE.UnsignedByteType);
meadowTex.wrapS = meadowTex.wrapT = THREE.RepeatWrapping;
meadowTex.magFilter = THREE.LinearFilter; meadowTex.minFilter = THREE.LinearMipmapLinearFilter;
meadowTex.generateMipmaps = true; meadowTex.needsUpdate = true;

// CPU mirror of the path layout in the shader: distance, arc length, side
export function pathInfo(x, z) {
  let best = 1e9, s = 0, acc = 0, side = 1;
  for (let i = 0; i < PATH.length - 1; i++) {
    const ax = PATH[i][0], az = PATH[i][1], dx = PATH[i + 1][0] - ax, dz = PATH[i + 1][1] - az;
    const L = Math.hypot(dx, dz);
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (L * L)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; s = acc + t * L; side = dx * (z - az) - dz * (x - ax) >= 0 ? 1 : -1; }
    acc += L;
  }
  return { d: best, s, side };
}
// edge > 0: grass beside the path; strip > 0: inside the central grass strip (brush-noise jitter excluded)
export function pathEdge(x, z) {
  const pi = pathInfo(x, z);
  const wob = meadowCh(x * 4, z * 4, 3) - 0.5;
  const taper = 1 - 0.45 * sstep(0.72, 1.0, pi.s / PATH_LEN);
  const edge = pi.d - (1.0 + wob * 1.0) * taper;
  const pres = sstep(0.46, 0.60, meadowCh(pi.s * 3, 0, 0)) * sstep(2.5, 6.0, pi.s);
  const strip = pres * 0.30 + wob * 0.28 - 0.06 - pi.d;
  return { edge, strip, d: pi.d, s: pi.s };
}

// ---- grass masses: the meadow is three planned values - the light wash, drifts of a mid green
// (0.8-3 m deep, 2-8 m long, lying ACROSS the view from the hilltop, with large quiet stretches of
// bare wash between them) and dark accents in their cores. massRaw() is the field the drifts are
// cut from; src/extra/grass.js thresholds it, bakes it into the ground map and stands its tufts
// inside the drifts.
const mnA = cachedNoise(), mnB = cachedNoise(), mnC = cachedNoise(), mnD = cachedNoise();
export function massRaw(x, z) {
  const k = sstep(0.25, 0.75, (z * z) / (x * x + z * z + 1));
  const a = mnA(x / 9.5 + 3.1, z / 2.9 + 8.7), b = mnB(x / 2.9 + 13.1, z / 9.5 + 2.7);
  const m = 0.5 + (b + (a - b) * k - 0.5) / Math.sqrt(k * k + (1 - k) * (1 - k));
  let v = 0.60 * m + 0.07 * mnC(x / 1.1 + 40.7, z / 1.1 + 90.2) + 0.34 * (mnD(x / 19 + 7.7, z / 19 + 3.3) - 0.5);
  // (a few drifts placed by hand on the lawn south of the chapel, which the noise leaves bare:
  // the lower third of the principal views)
  // (a drift further than ~6 widths away adds less than 1e-17: left out)
  for (let i = 0; i < MASS_PLAN.length; i++) {
    const P = MASS_PLAN[i], dx = (x - P[0]) / P[2], dz = (z - P[1]) / P[3], e = dx * dx + dz * dz;
    if (e < 40) v += P[4] * Math.exp(-e);
  }
  return v;
}
const MASS_PLAN = [[12.5, 19.3, 3.6, 1.4, 0.22], [0.0, 22.0, 4.2, 1.3, 0.22], [-6.5, 23.0, 4.5, 1.5, 0.20], [3.0, 24.5, 4.0, 1.4, 0.18]];
// More planned masses, kept apart from massRaw() (whose values decide the placement of every tuft of
// the band, and with it the random sequence everything after them is drawn from): the foreground of
// the view in from the west rim, which the noise leaves bare. They lie north-south, across that view.
// src/extra/grass.js adds them to the baked field and stands their tufts in a pass of its own.
const MASS_PLAN2 = [[-21.5, 17.5, 1.5, 4.2, 0.22], [-15.0, 12.5, 1.4, 3.8, 0.20], [-25.5, 15.0, 1.3, 3.4, 0.20], [-18.5, 9.0, 1.3, 3.0, 0.18]];
export const MASS2_BOX = [-30, -11, 3, 24];      // x0, x1, z0, z1: where massExtra() can be > 0.005
export function massExtra(x, z) {
  let v = 0;
  for (const [px, pz, rx, rz, a] of MASS_PLAN2) v += a * Math.exp(-(((x - px) / rx) ** 2 + ((z - pz) / rz) ** 2));
  return v;
}

// ground map (filled in by src/extra/grass.js): R = dark turf gathered at the foot of things,
// G = the grass masses (0.5 = their edge, 1 = deep inside)
export const GMAP = { x0: -80, z0: -76, w: 160, h: 160, N: 1024 };
const noContact = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
noContact.needsUpdate = true;

// ---- far-ground stroke map, addressed in polar space around the hilltop (u = azimuth, wraps).
//   R: smooth 2D wobble of the stroke lines
//   G, B, A: every ROW is an independent 1D noise (sampled at row centres): G = where a line is
//   drawn (dash gate), B = its thickness, A = tone / lens patches. All rank-normalised to a flat
//   0..1 distribution, so a threshold t leaves exactly (1 - t) of the length.
const FW = 512, FH = 64;
const farTex = (() => {
  const R = rng(4711);
  const d = new Uint8Array(FW * FH * 4);
  const rank = (v) => {
    const idx = Array.from(v.keys()).sort((i, j) => v[i] - v[j]);
    const o = new Float32Array(v.length);
    idx.forEach((k, i) => { o[k] = i / (v.length - 1); });
    return o;
  };
  const noise1 = (cells) => {
    const o = new Float32Array(FW);
    let amp = 1;
    for (const c of cells) {
      const g = Array.from({ length: c }, () => R());
      for (let x = 0; x < FW; x++) {
        const f = (x / FW) * c, i = Math.floor(f), t = f - i, sm = t * t * (3 - 2 * t);
        o[x] += amp * (g[i % c] + (g[(i + 1) % c] - g[i % c]) * sm);
      }
      amp *= 0.5;
    }
    return rank(o);
  };
  // R: periodic 2D value noise, two octaves
  const w = new Float32Array(FW * FH);
  let amp = 1;
  for (const [cx, cy] of [[6, 5], [13, 11]]) {
    const g = Array.from({ length: cx * cy }, () => R());
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const fx = (x / FW) * cx, fy = (y / FH) * cy, x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const G_ = (i, j) => g[(j % cy) * cx + (i % cx)];
      const a_ = G_(x0, y0), b_ = G_(x0 + 1, y0), c_ = G_(x0, y0 + 1), d_ = G_(x0 + 1, y0 + 1);
      w[y * FW + x] += amp * (a_ + (b_ - a_) * sx + (c_ - a_) * sy + (a_ - b_ - c_ + d_) * sx * sy);
    }
    amp *= 0.45;
  }
  const wr = rank(w);
  for (let y = 0; y < FH; y++) {
    const g = noise1([9, 21]), b = noise1([14]), a = noise1([5, 11]);
    for (let x = 0; x < FW; x++) {
      const i = (y * FW + x) * 4;
      d[i] = Math.round(wr[y * FW + x] * 255); d[i + 1] = Math.round(g[x] * 255); d[i + 2] = Math.round(b[x] * 255); d[i + 3] = Math.round(a[x] * 255);
    }
  }
  const t = new THREE.DataTexture(d, FW, FH, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();

// ---- field strips toward the village (south-south-east): long rectangles on the valley floor,
// seen from the hill as thin parallelograms. [distance, azimuth (deg), half length, half depth, twist, tone]
const FIELDS = [
  [300, 62, 55, 15, 0.12, 1], [335, 92, 62, 13, -0.10, 1], [375, 64, 60, 17, 0.20, 2], [405, 88, 78, 14, -0.05, 1],
  [445, 58, 72, 16, 0.15, 1], [470, 85, 62, 18, -0.18, 2], [352, 108, 48, 11, 0.08, 1],
].map(([r, az, hl, hd, rot, tone]) => {
  const a = (az * Math.PI) / 180, t = a + Math.PI / 2 + rot;
  return { c: [r * Math.cos(a), r * Math.sin(a)], h: [hl, hd], d: [Math.cos(t), Math.sin(t)], tone };
});
const f1 = (v) => v.toFixed(3);

// sun-facing term of the big landforms (N.L of a normal taken over an 11 m base), baked so the
// far slopes can be shaded per pixel with painted edges instead of per mesh facet
const SN = 384, SEXT = 540;
const slopeTex = (() => {
  const hg = new Float32Array((SN + 1) * (SN + 1)), st = (2 * SEXT) / SN;
  for (let j = 0; j <= SN; j++) for (let i = 0; i <= SN; i++) hg[j * (SN + 1) + i] = height(-SEXT + i * st, -SEXT + j * st);
  const H = (i, j) => hg[Math.min(SN, Math.max(0, j)) * (SN + 1) + Math.min(SN, Math.max(0, i))];
  const d = new Uint8Array(SN * SN * 4);
  for (let j = 0; j < SN; j++) for (let i = 0; i < SN; i++) {
    const nx = H(i - 2, j) - H(i + 2, j), nz = H(i, j - 2) - H(i, j + 2), ny = 4 * st;
    const v = (nx * SUN.x + ny * SUN.y + nz * SUN.z) / Math.hypot(nx, ny, nz);
    d[(j * SN + i) * 4] = Math.round(Math.min(1, Math.max(0, v)) * 255); d[(j * SN + i) * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, SN, SN, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();
export const GROUND_UNIFORMS = {
  uSlope: { value: slopeTex },
  uPath: { value: PATH.map((p) => new THREE.Vector2(p[0], p[1])) },
  uMeadow: { value: meadowTex },
  uContact: { value: noContact },
  uFarTex: { value: farTex },
};

// Flower drifts. Every colour (yellow / pink-red / white) has its own field: the meadow map read at
// DRIFT_SCALE (bodies 5-12 m long, lying east-west) plus a few drifts planned by hand, its rim torn by a
// second, finer reading of the same map (EDGE_SCALE: lobes 0.5-4 m). Where the field passes a threshold
// the drift is there: src/terrain.js lays it as separate world-anchored DABS of mixed flower colours with the
// green left between them (no flat underlay, no outline - see flowerDabs() in the fragment shader), and
// src/extra/grass.js stands its blooms in the same place. The three fields overlap, so the colours mix. The thresholds are set so that each colour covers
// a fixed share of the hilltop; the rest is left quiet.
//   flowerDrift() returns { y, p, w: density 0..1 of the blooms, orange: yellow is orange here, lilac }
export const DRIFT_SCALE = 1.5;
// baked once (25 cm texels; read at a position pushed about by the edge noise, or each drift would be a clean
// arc): rgb = what the planned drifts add to the three colour fields, a = palette * 32 (255 = none).
// src/terrain-plan.js computes it - in a worker thread while the page loads if it can be (src/paint.js).
const PLAN = new Uint8Array(PN * PN * 4);
export function fillPlan(data) { PLAN.set(data ?? computePlan()); planTex.needsUpdate = true; }
const planTex = new THREE.DataTexture(PLAN, PN, PN, THREE.RGBAFormat, THREE.UnsignedByteType);
planTex.wrapS = planTex.wrapT = THREE.ClampToEdgeWrapping;
planTex.magFilter = THREE.LinearFilter; planTex.minFilter = THREE.LinearMipmapLinearFilter;
planTex.generateMipmaps = true; planTex.needsUpdate = true;
GROUND_UNIFORMS.uPlan = { value: planTex };
function planAt(x, z) {
  const fx = ((x + PEXT) / (2 * PEXT)) * PN - 0.5, fz = ((z + PEXT) / (2 * PEXT)) * PN - 0.5;
  const x0 = Math.floor(fx), z0 = Math.floor(fz);
  if (x0 < 0 || z0 < 0 || x0 >= PN - 1 || z0 >= PN - 1) return [0, 0, 0, -1];
  const tx = fx - x0, tz = fz - z0, i = (z0 * PN + x0) * 4, o = [0, 0, 0, -1];
  for (let k = 0; k < 3; k++) o[k] = (PLAN[i + k] * (1 - tx) * (1 - tz) + PLAN[i + 4 + k] * tx * (1 - tz) + PLAN[i + PN * 4 + k] * (1 - tx) * tz + PLAN[i + PN * 4 + 4 + k] * tx * tz) / 255;
  const pa = PLAN[(Math.min(PN - 1, Math.floor(fz + 0.5)) * PN + Math.min(PN - 1, Math.floor(fx + 0.5))) * 4 + 3];
  o[3] = pa > 230 ? -1 : Math.round(pa / 32);
  return o;
}
const _dm = [0, 0, 0, 0], _de = [0, 0, 0, 0];
function driftRaw(x, z) {
  const m = meadowInto(x * DRIFT_SCALE, z * DRIFT_SCALE, _dm), e = meadowInto(x * EDGE_SCALE + EDGE_OX, z * EDGE_SCALE + EDGE_OZ, _de);
  const o = [m[0] + (e[0] - 0.5) * EDGE_AMP, m[1] + (e[1] - 0.5) * EDGE_AMP, m[2] + (e[2] - 0.5) * EDGE_AMP, -1];
  // (near the chapel the noise only tears the rim of the planned bands)
  const g = sstep(NOISE_IN, NOISE_OUT, Math.hypot(x - SUBJECT.x, z - SUBJECT.z));
  // (and nowhere does it sink far below the level the planned drifts are set on: a low stretch of the noise would swallow them)
  const r1 = Math.hypot(x - SUBJECT.x, z - SUBJECT.z), ft = FOOT * sstep(FOOT_IN, FOOT_OUT, r1);
  for (let k = 0; k < 3; k++) o[k] = Math.max(DRIFT_T[k] - NOISE_DROP - 0.06, (DRIFT_T[k] - NOISE_DROP + (o[k] - 0.5) * NOISE_K) * (1 - g) + (o[k] + ft) * g);
  const p = planAt(x, z);
  for (let k = 0; k < 3; k++) o[k] += p[k];
  o[3] = p[3];
  return o;
}
// share of the hilltop each colour's bodies cover (before the planned drifts)
const DRIFT_SHARE = [0.095, 0.105, 0.07];
const DRIFT_T = (() => {
  const R = rng(733), v = [[], [], []];
  for (let i = 0; i < 16000; i++) {
    const a = R() * 6.2832, r = Math.sqrt(R()) * 75, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const m = meadowAt(x * DRIFT_SCALE, z * DRIFT_SCALE), e = meadowAt(x * EDGE_SCALE + EDGE_OX, z * EDGE_SCALE + EDGE_OZ);
    for (let k = 0; k < 3; k++) v[k].push(m[k] + (e[k] - 0.5) * EDGE_AMP);
  }
  return v.map((l, k) => l.sort((p, q) => p - q)[Math.floor(l.length * (1 - DRIFT_SHARE[k]))]);
})();
export function flowerDrift(x, z) {
  const b = driftRaw(x, z);
  const m2 = meadowCh(x * 0.9 + 40, z * 0.9 + 17, 3);
  const d = (k) => sstep(DRIFT_T[k] - 0.02, DRIFT_T[k] + 0.14, b[k]);
  // (skirt: the thin outskirts of a planned drift, where a few loose blooms stand off it)
  return { y: d(0), p: d(1), w: d(2), orange: m2 > 0.62, lilac: m2 < 0.24, skirt: Math.max(b[0] - DRIFT_T[0], b[1] - DRIFT_T[1], b[2] - DRIFT_T[2]) };
}

// Hue. Inside a drift the families are mixed in CLUSTERS (the flower-field board): a world noise read at
// HUE_S picks, per bloom / per dab, the dominant family of the drift's palette over most of it and one of its
// accents in islands 1-3 m across (shares HUE_SHARE). Outside the planned drifts the palette changes in rings
// ~7 m deep around the hilltop. The same function runs here (blooms of src/extra/grass.js) and in the ground shader.
export const BAND_SHARE = 0.86;
const HUE_S = 8, HUE_OX = 19, HUE_OZ = 67, HUE_SHARE = [0.19, 0.71, 0.90];
const HUE_Q = (() => {
  const R = rng(911), v = [];
  for (let i = 0; i < 12000; i++) v.push(meadowCh(R() * 256, R() * 256, 3));
  v.sort((a, b) => a - b);
  return HUE_SHARE.map((s) => v[Math.floor(v.length * s)]);
})();
const ringPal = (x, z) => { const n = PALS.length; return ((Math.floor(Math.hypot(x - SUBJECT.x, z - SUBJECT.z) / 7 + (meadowCh(x * 1.3 + 91, z * 1.3 + 53, 3) - 0.5) * 2.0) % n) + n) % n; };
//   returns a flower colour index: 0 white, 1 yellow, 3 magenta, 4 orange
export function flowerFam(x, z, jit = 0) {
  const pl = planAt(x, z)[3], pal = pl >= 0 ? pl : ringPal(x, z);
  const n = meadowCh(x * HUE_S + HUE_OX, z * HUE_S + HUE_OZ, 3) + jit;
  return PALS[pal][n < HUE_Q[0] ? 1 : n < HUE_Q[1] ? 0 : n < HUE_Q[2] ? 2 : 3];
}

// Gathering. Inside a drift the blooms are not spread evenly: they GATHER in clumps 1-4 m across (the top
// ~30% of a world noise read at GATH_S) that hold ~60% of them, the rest thin between, and a coarser noise
// (REST_S) leaves big rests - drift areas 3-8 m across with nothing on them but grass. bloomGather() is a
// density weight with a mean of ~1 over the hilltop; the standing blooms (src/extra/grass.js) and the dabs
// painted on the ground further out (flowerDabs below) read the same field, so a clump stays a clump at the
// hand-over.
const GATH_S = 7.0, GATH_O = [123, 123], REST_S = 1.6, REST_O = [113, 29], GATH_LO = 0.45, GATH_HI = 1.35;
const GATH_Q = (() => {
  const R = rng(4471), a = [], b = [];
  for (let i = 0; i < 20000; i++) { const x = R() * 256, z = R() * 256; a.push(meadowCh(x, z, 3)); b.push(meadowCh(x, z, 1)); }
  a.sort((p, q) => p - q); b.sort((p, q) => p - q);
  return [a[Math.floor(a.length * 0.70)], b[Math.floor(b.length * 0.11)]];
})();
// (raw: a weight about 1; then baked on a 25 cm grid and divided by its own mean over ~6 m around, so that the
// gathering only MOVES the blooms of a drift about - into clumps, out of the rests - and never thins or thickens a
// drift as a whole: the density that was set for each view stays)
const gathRaw = (x, z) => (GATH_LO + GATH_HI * sstep(GATH_Q[0] - 0.035, GATH_Q[0] + 0.035, meadowCh(x * GATH_S + GATH_O[0], z * GATH_S + GATH_O[1], 3)))
  * sstep(GATH_Q[1] - 0.03, GATH_Q[1] + 0.03, meadowCh(x * REST_S + REST_O[0], z * REST_S + REST_O[1], 1));
const GN_ = 768, GEXT = 96, GMAX = 3.0;
const GATH = new Uint8Array(GN_ * GN_);
{
  const raw = new Float32Array(GN_ * GN_), tmp = new Float32Array(GN_ * GN_), R_ = 12;
  for (let j = 0; j < GN_; j++) for (let i = 0; i < GN_; i++) raw[j * GN_ + i] = gathRaw(-GEXT + ((i + 0.5) / GN_) * 2 * GEXT, -GEXT + ((j + 0.5) / GN_) * 2 * GEXT);
  // (two passes of a running box, rows then columns, each pass twice: near a gaussian of ~3 m)
  const box = (src, dst, horiz) => {
    for (let l = 0; l < GN_; l++) {
      let acc = 0, n = 0;
      const at = (k) => (horiz ? src[l * GN_ + k] : src[k * GN_ + l]);
      for (let k = 0; k <= R_ && k < GN_; k++) { acc += at(k); n++; }
      for (let k = 0; k < GN_; k++) {
        if (horiz) dst[l * GN_ + k] = acc / n; else dst[k * GN_ + l] = acc / n;
        if (k + R_ + 1 < GN_) { acc += at(k + R_ + 1); n++; }
        if (k - R_ >= 0) { acc -= at(k - R_); n--; }
      }
    }
  };
  const m = new Float32Array(GN_ * GN_);
  box(raw, tmp, true); box(tmp, m, false); box(m, tmp, true); box(tmp, m, false);
  const g = new Float32Array(GN_ * GN_);
  for (let i = 0; i < GN_ * GN_; i++) g[i] = raw[i] / Math.max(m[i], 0.25);
  // (and a few swelling masses planned by hand in near foregrounds that the noise leaves thin: there the drift is
  // one thick mass, its edge torn by the same noise) [x, z, radius (m)]
  for (const [cx, cz, r] of [[-15.6, 15.6, 2.2], [-1.4, 20.0, 1.6], [-3.6, 10.0, 1.8]]) {
    const i0 = Math.floor(((cx - r * 1.4 + GEXT) / (2 * GEXT)) * GN_), i1 = Math.ceil(((cx + r * 1.4 + GEXT) / (2 * GEXT)) * GN_);
    const j0 = Math.floor(((cz - r * 1.4 + GEXT) / (2 * GEXT)) * GN_), j1 = Math.ceil(((cz + r * 1.4 + GEXT) / (2 * GEXT)) * GN_);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -GEXT + ((i + 0.5) / GN_) * 2 * GEXT, z = -GEXT + ((j + 0.5) / GN_) * 2 * GEXT, k = j * GN_ + i;
      const e = sstep(r * 1.4, r * 0.5, Math.hypot(x - cx, z - cz) + (raw[k] - 0.9) * 0.5);
      g[k] = Math.max(g[k], e * (1.5 + 0.4 * raw[k]));
    }
  }
  for (let i = 0; i < GN_ * GN_; i++) GATH[i] = Math.round(Math.min(GMAX, g[i]) / GMAX * 255);
}
const gathTex = new THREE.DataTexture(GATH, GN_, GN_, THREE.RedFormat, THREE.UnsignedByteType);
gathTex.wrapS = gathTex.wrapT = THREE.ClampToEdgeWrapping;
gathTex.magFilter = THREE.LinearFilter; gathTex.minFilter = THREE.LinearMipmapLinearFilter;
gathTex.generateMipmaps = true; gathTex.needsUpdate = true;
GROUND_UNIFORMS.uGather = { value: gathTex };
// bilinear, as the texture is read in the shader
export function bloomGather(x, z) {
  const fx = ((x + GEXT) / (2 * GEXT)) * GN_ - 0.5, fz = ((z + GEXT) / (2 * GEXT)) * GN_ - 0.5;
  const x0 = Math.floor(fx), z0 = Math.floor(fz);
  if (x0 < 0 || z0 < 0 || x0 >= GN_ - 1 || z0 >= GN_ - 1) return 1;
  const tx = fx - x0, tz = fz - z0, i = z0 * GN_ + x0;
  return (GATH[i] * (1 - tx) * (1 - tz) + GATH[i + 1] * tx * (1 - tz) + GATH[i + GN_] * (1 - tx) * tz + GATH[i + GN_ + 1] * tx * tz) / 255 * GMAX;
}
const GATHER_GLSL = /* glsl */`
uniform sampler2D uGather;
float bloomGather(vec2 p){
  vec2 uv = (p + ${GEXT.toFixed(1)}) / ${(2 * GEXT).toFixed(1)};
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 1.0;
  return texture(uGather, uv).r * ${GMAX.toFixed(1)};
}
`;

// grassWash(): the lit meadow colour only. Small enough to run in a vertex shader (tufts take
// the colour of the wash under their root). Needs `uniform sampler2D uBrush`.
export const GRASS_GLSL = /* glsl */`
const vec3 GRASS_A = vec3(0.863, 0.929, 0.525);   // #DCED86 sunlit pale yellow-green
const vec3 GRASS_W = vec3(0.914, 0.929, 0.470);   // toward #EBED71, warm
const vec3 GRASS_K = vec3(0.831, 0.902, 0.600);   // #D4E59B, cool
const vec3 GRASS_D = vec3(0.760, 0.880, 0.510);   // a quiet deeper patch
vec3 grassWash(vec3 wp){
  vec2 p = wp.xz;
  float drift = texture(uBrush, p / 97.0 + 0.13).a;
  // soft value/temperature drift across the meadow ...
  vec3 g = mix(GRASS_K, GRASS_A, smoothstep(0.25, 0.50, drift));
  g = mix(g, GRASS_W, smoothstep(0.52, 0.80, drift) * 0.75);
  // ... and long soft marks laid over it: fbm stretched 4:1 so that it runs across the view from
  // the hilltop (east-west north and south of the chapel, north-south east and west of it).
  // Only the soft channel is used: no stamp edge survives.
  float tz = smoothstep(0.25, 0.75, p.y * p.y / (dot(p, p) + 1.0));
#ifdef GW_FRAG
  // (only one of the two readings is needed where tz is 0 or 1 - two thirds of the hilltop; explicit gradients,
  // so that the choice leaves no seam)
  vec2 ua = p * vec2(1.0 / 46.0, 1.0 / 11.5) + 0.27, ub = p * vec2(1.0 / 11.5, 1.0 / 46.0) + 0.61;
  vec2 uax = dFdx(ua), uay = dFdy(ua), ubx = dFdx(ub), uby = dFdy(ub);
  float m;
  if (tz <= 0.0) m = textureGrad(uBrush, ub, ubx, uby).a;
  else if (tz >= 1.0) m = textureGrad(uBrush, ua, uax, uay).a;
  else m = mix(textureGrad(uBrush, ub, ubx, uby).a, textureGrad(uBrush, ua, uax, uay).a, tz);
#else
  float ax = texture(uBrush, p * vec2(1.0 / 46.0, 1.0 / 11.5) + 0.27).a;
  float az = texture(uBrush, p * vec2(1.0 / 11.5, 1.0 / 46.0) + 0.61).a;
  float m = mix(az, ax, tz);
#endif
  float gate = smoothstep(0.38, 0.62, texture(uBrush, p / 29.0 + 0.5).a);   // marks gather; the rest stays quiet
  g = mix(g, GRASS_D, smoothstep(0.60, 0.70, m) * 0.45 * gate);
  g = mix(g, GRASS_W * vec3(1.02, 1.02, 1.0), smoothstep(0.37, 0.29, m) * 0.5 * (1.0 - gate));
  return g;
}
// the mid green of a grass mass, and the deeper tone of its core
const vec3 MASS_M = vec3(0.655, 0.825, 0.420);
const vec3 MASS_D = vec3(0.500, 0.740, 0.410);
vec3 massWash(vec3 wash){ return mix(wash, MASS_M, 0.82); }
// The ground of a flower drift (ground map B, baked by src/extra/grass.js from the clusters it stands): the
// drift's floor is a greener, deeper green than the bare lawn, and under every cluster of blooms lies a darker
// dab of foliage green - what shows between the blooms is leaf, never lawn.
const vec3 DRIFT_G = vec3(0.660, 0.820, 0.410);
const vec3 DRIFT_D = vec3(0.485, 0.715, 0.375);
vec3 driftWash(vec3 g, float body, float dab){ return mix(mix(g, DRIFT_G, body * 0.80), DRIFT_D, dab * 0.86); }
// grass in shadow: a clear cool green and one deeper tone, laid as long strokes lying on the
// ground (bristle channel stretched 2.5:1), not as round patches
const vec3 GSH_A = vec3(0.335, 0.540, 0.450);     // #5D9479
const vec3 GSH_B = vec3(0.270, 0.455, 0.410);     // #4B7E6E
float shadePatch(vec2 p){ return texture(uBrush, p * vec2(1.0 / 9.0, 1.0 / 3.6) + 0.31).b * 0.62 + texture(uBrush, p * vec2(1.0 / 3.4, 1.0 / 2.1) + 0.57).b * 0.38; }
`;

// groundPaint(): lit local colour of the ground at a world position (fragment shaders only).
// (nothing reads the path further than PATH_REACH from it: outside this box it is not looked up at all)
const PATH_REACH = 6.5;
const PATH_BOX = [Math.min(...PATH.map((p) => p[0])) - PATH_REACH, Math.max(...PATH.map((p) => p[0])) + PATH_REACH, Math.min(...PATH.map((p) => p[1])) - PATH_REACH, Math.max(...PATH.map((p) => p[1])) + PATH_REACH];
// inside(rect, p): 1 inside [x0, x1, z0, z1]
const rectGLSL = (r, p) => `(step(${r[0].toFixed(2)}, ${p}.x) * step(${p}.x, ${r[1].toFixed(2)}) * step(${r[2].toFixed(2)}, ${p}.y) * step(${p}.y, ${r[3].toFixed(2)}))`;
// the floor of the building (src/world.js FLOOR): no dirt of the path shows through its gaps, and no drift
// grows through it or hard against its walls
const FLOOR_DIRT = floorRect(0, 0.7), FLOOR_BLOOM = floorRect(0.6, 0.6, 0.8);
export const GROUND_GLSL = /* glsl */`
uniform vec2 uPath[${PATH.length}];
uniform sampler2D uMeadow;
uniform sampler2D uContact;
uniform sampler2D uSlope;
// x: distance to the path centre line, y: arc length along it, z: side (+1/-1)
vec3 pathInfo(vec2 p){
  if (${rectGLSL(PATH_BOX, 'p')} < 0.5) return vec3(1e3, 0.0, 1.0);
  float best = 1e9, s = 0.0, acc = 0.0, side = 1.0;
  for (int i = 0; i < ${PATH.length - 1}; i++){
    vec2 a = uPath[i], b = uPath[i+1];
    vec2 ab = b - a;
    float L = length(ab);
    float t = clamp(dot(p - a, ab) / (L * L), 0.0, 1.0);
    float d = distance(p, a + ab * t);
    if (d < best){ best = d; s = acc + t * L; side = ab.x * (p.y - a.y) - ab.y * (p.x - a.x) >= 0.0 ? 1.0 : -1.0; }
    acc += L;
  }
  return vec3(best, s, side);
}
float pathDist(vec2 p){ return pathInfo(p).x; }
#define GW_FRAG 1
${GRASS_GLSL}
const vec3 DIRT_A  = vec3(0.914, 0.816, 0.737);   // #E9D0BC pale pink-beige
const vec3 DIRT_L  = vec3(0.953, 0.882, 0.800);   // worn, lighter
const vec3 DIRT_B  = vec3(0.850, 0.735, 0.655);   // streak
const vec3 DIRT_V  = vec3(0.760, 0.640, 0.630);   // darker mauve-brown streak

vec3 dirtPaint(vec3 wp, vec3 pi){
  // (along, across) track space: every mark is drawn out along the direction of travel
  vec2 q = vec2(pi.y, pi.x * pi.z);
  float st  = texture(uBrush, q * vec2(1.0 / 12.0, 1.0 / 2.7)).b;
  vec4  st2 = texture(uBrush, q * vec2(1.0 / 25.0, 1.0 / 5.5) + 0.4);
  vec3 d = DIRT_A;
  d = mix(d, DIRT_L, step(0.60, st2.r) * 0.85);
  d = mix(d, DIRT_B, step(0.66, st));
  d = mix(d, DIRT_V, step(0.90, st) * 0.8);
  // two faint wheel ruts
  float rut = 1.0 - smoothstep(0.05, 0.13, abs(pi.x - 0.52 - (st2.g - 0.5) * 0.18));
  d = mix(d, DIRT_B * vec3(0.96, 0.95, 0.99), rut * step(0.38, st2.a) * 0.75);
  // a few stones and pale touches lying along the track (10-40 cm, fixed size in the world: they are what is
  // left of the path's drawing when it is seen from far off or from above)
  {
    vec2 qc = q / vec2(1.45, 0.62), ci2 = floor(qc), cf2 = fract(qc);
    float h2 = hash21(ci2 + 17.3);
    if (h2 > 0.66){
      vec2 o2 = vec2(hash21(ci2 + 1.7), hash21(ci2 + 9.2)) * 0.5 + 0.25;
      float len = 0.09 + 0.14 * fract(h2 * 31.7), wid = 0.055 + 0.05 * fract(h2 * 13.1), sk = (fract(h2 * 7.9) - 0.5) * 0.5;
      vec2 dv2 = (cf2 - o2) * vec2(1.45, 0.62);
      dv2.y -= dv2.x * sk;
      float an2 = atan(dv2.y, dv2.x);
      float v2 = 1.0 + 0.16 * sin(an2 * 3.0 + h2 * 50.0) - length(dv2 / vec2(len, wid));
      float c2 = clamp(v2 / max(fwidth(v2), 1e-4) + 0.5, 0.0, 1.0);
      // (two in three are stones with a mauve under-side, the rest a pale dry touch)
      vec3 sc2 = fract(h2 * 3.3) < 0.66 ? (dv2.y / wid > 0.25 ? vec3(0.660, 0.575, 0.625) : vec3(0.925, 0.900, 0.850)) : DIRT_L * vec3(1.02, 1.02, 1.0);
      d = mix(d, sc2, c2);
    }
  }
  // pebbles: a light top and a mauve under-side away from the sun
  float dist = distance(wp, uCamPos);
  vec2 pc = wp.xz * 2.3, ci = floor(pc), cf = fract(pc);
  float h = hash21(ci);
  if (h > 0.70){
    float rad = (0.09 + 0.20 * fract(h * 17.31)) * smoothstep(0.9, 2.2, 0.05 / (dist * uPixelK));
    vec2 o = vec2(hash21(ci + 3.1), hash21(ci + 7.7)) * 0.44 + 0.28;
    vec2 dv = (cf - o) * vec2(1.0, 1.0 + 0.6 * fract(h * 5.7));
    float ang = atan(dv.y, dv.x);
    float r = length(dv) / max(rad * (0.85 + 0.15 * sin(ang * 3.0 + h * 40.0)), 1e-4);
    if (r < 1.0){
      float lightSide = dot(dv, normalize(uSunDir.xz)) / max(rad, 1e-4);
      d = lightSide > -0.25 ? vec3(0.900, 0.880, 0.830) : vec3(0.640, 0.560, 0.620);
      if (fract(h * 91.7) > 0.6) d *= vec3(0.93, 0.92, 0.95);
    }
  }
  return d;
}

// returns lit colour; grass = 1 on grass, 0 on bare path
vec3 groundPaint(vec3 wp, out float grass){
  vec3 g = grassWash(wp);
  vec3 pi = pathInfo(wp.xz);
  grass = 1.0;
  // (no dirt showing through the gaps of the nave floor)
  if (pi.x > 3.0 || ${rectGLSL(FLOOR_DIRT, 'wp.xz')} > 0.5) return g;
  float jit = texture(uBrush, wp.xz / 2.3 + 0.7).r - 0.5;
  float wob = texture(uMeadow, (wp.xz * 4.0 + 0.5) / 256.0).a - 0.5;
  float taper = 1.0 - 0.45 * smoothstep(0.72, 1.0, pi.y / ${PATH_LEN.toFixed(3)});
  // (the rim of the dirt is BROKEN: lobes and islands of turf and of bare earth half a metre across, cut by
  // the soft channel of the brush map - not one line that follows the track)
  float brk = texture(uBrush, wp.xz / 1.9 + 0.33).a - 0.5;
  float edge = pi.x - (1.0 + wob * 1.0) * taper - jit * 0.24 - brk * 0.55;
  // a strip of grass left standing between the ruts, in places
  float pres = smoothstep(0.46, 0.60, texture(uMeadow, vec2(pi.y * 3.0 + 0.5, 0.5) / 256.0).r) * smoothstep(2.5, 6.0, pi.y);
  float strip = pres * 0.30 + wob * 0.28 - 0.06 + jit * 0.16 - pi.x;
  float e = max(edge, strip);
  float w = max(fwidth(e), 0.004);
  grass = smoothstep(-w, w, e);
  // the rim of the turf is a touch deeper and greener (blades shading their own feet)
  g = mix(g, vec3(0.60, 0.78, 0.44), (1.0 - step(0.13 + jit * 0.16, e)) * 0.8);
  if (grass > 0.999) return g;
  return mix(dirtPaint(wp, pi), g, grass);
}
// ---- THE HILLTOP UNDER SNOW. The meadow's plan stays (its masses, the feet of things, the track), laid in
// whites instead of greens: a warm and a cool white in broad drifts, long pale-blue hollows lying across
// the view where the wind has scooped it, a rougher, bluer snow where the tall grass stands under it, and
// the track trodden to a blue-grey with the earth showing in its ruts. Every edge is a brushed step.
vec3 snowGround(vec3 wp, float dist, float grass, float mass, float core, float cm, vec4 wn, float s1, float upv){
  vec2 p = wp.xz;
  float drift = texture(uBrush, p / 97.0 + 0.13).a;
  vec3 s = mix(SNOW_C, SNOW_L, smoothstep(0.36, 0.52, drift));
  // hollows: long shapes lying across the view from the hilltop (the layout of the meadow's own marks)
  float tz = smoothstep(0.25, 0.75, p.y * p.y / (dot(p, p) + 1.0));
  float m = mix(texture(uBrush, p * vec2(1.0 / 11.5, 1.0 / 46.0) + 0.61).a, texture(uBrush, p * vec2(1.0 / 46.0, 1.0 / 11.5) + 0.27).a, tz);
  float gate = smoothstep(0.38, 0.62, texture(uBrush, p / 29.0 + 0.5).a);
  float hollow = aastep(0.615, m + (wn.a - 0.5) * 0.07 + (wn.g - 0.5) * 0.03) * gate;
  s = mix(s, vec3(0.855, 0.895, 0.962), hollow * 0.9);
  // ... and the crest beside a hollow, the whitest white
  s = mix(s, vec3(0.992, 0.990, 0.982), aastep(0.335, 0.70 - m + (wn.a - 0.5) * 0.06) * (1.0 - gate) * 0.9);
  // DEEP snow lies in banks: big rounded swells a few metres across with a shaded flank away from the sun - one
  // flat blue step with a brushed edge, on a slow field of the ground (the relief of a drift, painted)
  {
    vec2 sd = normalize(uSunDir.xz);
    float b0 = texture(uBrush, p / 13.0 + 0.71).a, b1 = texture(uBrush, (p + sd * 0.9) / 13.0 + 0.71).a;
    float flank = aastep(0.030, (b0 - b1) + (wn.a - 0.5) * 0.018 + (wn.g - 0.5) * 0.008) * smoothstep(0.50, 0.62, b0 + 0.08);
    s = mix(s, vec3(0.800, 0.852, 0.948), flank * 0.9 * (1.0 - 0.5 * upv));
    s = mix(s, vec3(0.995, 0.994, 0.988), aastep(0.035, (b1 - b0) + (wn.r - 0.5) * 0.015) * 0.8);
  }
  // where the tall grass stood: rougher snow, a step bluer, deeper dabs toward its core
  s = mix(s, vec3(0.890, 0.920, 0.968), mass * 0.85 * (1.0 - 0.4 * upv));
  s = mix(s, vec3(0.800, 0.850, 0.945), core * 0.75 * (1.0 - 0.6 * upv));
  // near the eye: short dry strokes, blue in the rough snow and white on the smooth
  if (dist < 18.0){
    float nk = (1.0 - smoothstep(7.0, 18.0, dist)) * grass;
    float s2 = texture(uBrush, mat2(0.88, 0.47, -0.47, 0.88) * p / 3.6 + 0.71).b;
    float pt = texture(uBrush, p / 5.2 + 0.23).r;
    s = mix(s, s * vec3(0.905, 0.930, 0.975), aastep(0.86, s1) * nk * mix(0.35, 0.8, mass));
    s = mix(s, vec3(0.995, 0.995, 0.990), aastep(0.925, 1.0 - s2) * nk * 0.8 * (1.0 - mass));
    s = mix(s, s * vec3(0.940, 0.955, 0.985), aastep(0.86, pt) * nk * 0.8 * (1.0 - mass));
  }
  // the foot of walls, trunks and stones: a blue pocket where the drift turns under
  s = mix(s, vec3(0.745, 0.805, 0.925), cm * 0.85);
  // the track
  if (grass < 0.999){
    vec3 pi = pathInfo(p);
    vec2 q = vec2(pi.y, pi.x * pi.z);
    float st = texture(uBrush, q * vec2(1.0 / 12.0, 1.0 / 2.7)).b;
    vec4 st2 = texture(uBrush, q * vec2(1.0 / 25.0, 1.0 / 5.5) + 0.4);
    vec3 d = vec3(0.835, 0.865, 0.940);
    d = mix(d, vec3(0.900, 0.922, 0.965), step(0.58, st2.r) * 0.9);
    d = mix(d, vec3(0.740, 0.785, 0.905), step(0.70, st));
    // two ruts, a step deeper; in stretches the earth shows in them
    float rut = 1.0 - smoothstep(0.07, 0.17, abs(pi.x - 0.52 - (st2.g - 0.5) * 0.18));
    d = mix(d, vec3(0.690, 0.735, 0.875), rut * step(0.30, st2.a) * 0.9);
    float bare = 1.0 - smoothstep(0.03, 0.08, abs(pi.x - 0.52 - (st2.g - 0.5) * 0.18));
    d = mix(d, vec3(0.600, 0.545, 0.585), bare * step(0.60, st2.a) * step(0.50, st) * step(0.45, texture(uBrush, q * vec2(1.0 / 3.1, 1.0 / 1.3) + 0.17).r) * 0.85);
    // (deep snow: the track is drifted over in stretches - only parts of it are trodden through)
    float open = smoothstep(0.34, 0.50, texture(uBrush, vec2(pi.y / 23.0, 0.37)).a + (st2.r - 0.5) * 0.2);
    s = mix(mix(s, d, open * 0.9 + 0.1), s, grass);
  }
  return s;
}
// r: dark turf gathered at the foot of walls, trunks, stones; g: masses of the foreground band
// b: the ground of the flower drifts (0.25 = the floor of a drift, 0.5 = the edge of the dab under a cluster)
// a: 0 where the ground is certainly in the sun (no cast shadow within about a metre: baked once from the sun map by
// src/extra/grass.js - the sun does not move), anything else = the shadow has to be worked out
vec4 groundMap(vec2 p){
  vec2 uv = (p - vec2(${GMAP.x0.toFixed(1)}, ${GMAP.z0.toFixed(1)})) / vec2(${GMAP.w.toFixed(1)}, ${GMAP.h.toFixed(1)});
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0, 0.0, 0.0, 1.0);
  return texture(uContact, uv);
}
vec3 groundShade(vec3 lit, float grass, float deep){
  // grass shadow: #4C7C6A / #3C675E; dirt shadow goes violet (#7E6881)
  vec3 gs = mix(GSH_A, GSH_B, deep) * (0.72 + 0.31 * lit.g);
  vec3 ds = vec3(0.494, 0.408, 0.506) * (0.52 + 0.58 * lit.r);
  return mix(ds, gs, grass);
}
// Sun shadow for the ground, rebuilt as a SMOOTH field like shadowSpline() in src/stone.js: the
// binary depth test is taken on a coarse lattice (12 cm) and blended with a quadratic B-spline, so
// the lit fraction is continuous and its 0.5 contour is a rounded curve - no texel can show.
float groundShadow(vec3 wp){
  vec4 sc = uShadowMat * vec4(wp, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  float pitch = uShadowTexel * 2.5;
  vec2 g = s.xy / pitch;
  vec2 c = floor(g) + 0.5, f = g - c;
  vec2 w0 = 0.5 * (0.5 - f) * (0.5 - f), w1 = 0.75 - f * f, w2 = 0.5 * (0.5 + f) * (0.5 + f);
  float zr = s.z - uShadowBias, lit = 0.0;
  for (int j = 0; j < 3; j++){
    float wy = j == 0 ? w0.y : (j == 1 ? w1.y : w2.y);
    float yy = (c.y + float(j - 1)) * pitch;
    lit += wy * (w0.x * step(zr, textureLod(uShadowMap, vec2((c.x - 1.0) * pitch, yy), 0.0).r)
               + w1.x * step(zr, textureLod(uShadowMap, vec2(c.x * pitch, yy), 0.0).r)
               + w2.x * step(zr, textureLod(uShadowMap, vec2((c.x + 1.0) * pitch, yy), 0.0).r));
  }
  return lit;
}
// "how deep inside the shadow": 4 taps ~40 cm out (only fetched where the ground is in shadow)
float groundShadowDeep(vec3 wp){
  vec4 sc = uShadowMat * vec4(wp, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  float zc = s.z - uShadowBias, r = uShadowTexel;
  return 0.25 * (step(zc, textureLod(uShadowMap, s.xy + vec2( 6.6,  7.4) * r, 0.0).r)
               + step(zc, textureLod(uShadowMap, s.xy + vec2(-7.4,  6.6) * r, 0.0).r)
               + step(zc, textureLod(uShadowMap, s.xy + vec2(-6.6, -7.4) * r, 0.0).r)
               + step(zc, textureLod(uShadowMap, s.xy + vec2( 7.4, -6.6) * r, 0.0).r));
}
`;

const VS = /* glsl */`
in vec3 position; in vec3 normal;
out vec3 vW; out vec3 vN; out float vDepth; out float vGust;
${WIND_GLSL}
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normal;
  // the gust on the home meadow (for the sheen, see the fragment shader): a field that is smooth over many
  // metres, read at the vertices (1-5 m apart there)
  vGust = dot(w.xz, w.xz) < 125.0 * 125.0 ? windGust(w.xz) : 0.0;
  vec4 mv = viewMatrix * w; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

// flower colours shared with the instanced dabs in src/extra/grass.js
// 0 white, 1 yellow, 2 lilac, 3 pink-red, 4 orange (the warm palette of the flower-field board)
// (the saturated set of the board: lemon-gold yellow, magenta, orange, white; pink is the light tint of the magenta)
export const FLOWER_COLS = [0xf8f4e4, 0xfcdb42, 0xd8c8e6, 0xe0577b, 0xf48f36];

// ONE palette for the dabs painted on the ground here and the blooms that stand in src/extra/grass.js: three
// tones per family (a lighter tint, the colour, a deeper one), chosen per dab / per bloom.
//   family: 0 white, 1 yellow, 3 magenta, 4 orange
export const FLOWER_HUE_GLSL = /* glsl */`
const vec3 FL_Y = vec3(0.988, 0.860, 0.260);   // #FCDB42
const vec3 FL_P = vec3(0.878, 0.340, 0.482);   // #E0577B magenta, a step off crimson
const vec3 FL_O = vec3(0.957, 0.560, 0.210);   // #F48F36
const vec3 FL_W = vec3(0.973, 0.957, 0.894);   // #F8F4E4
vec3 famHue(float fam, float h2){
  if (fam < 0.5) return h2 < 0.62 ? FL_W : h2 < 0.82 ? vec3(0.975, 0.820, 0.850) : vec3(0.992, 0.945, 0.700);
  if (fam < 1.5) return h2 < 0.24 ? vec3(0.996, 0.925, 0.520) : h2 < 0.80 ? FL_Y : vec3(0.972, 0.760, 0.180);
  if (fam < 3.5) return h2 < 0.36 ? vec3(0.957, 0.610, 0.690) : h2 < 0.50 ? vec3(0.975, 0.820, 0.850) : h2 < 0.88 ? FL_P : vec3(0.790, 0.250, 0.400);
  return h2 < 0.24 ? vec3(0.980, 0.690, 0.340) : h2 < 0.78 ? FL_O : vec3(0.920, 0.410, 0.230);
}
`;

// strength of the wind's sheen on the far meadow (0 = none)
const SHEEN = +(typeof location !== 'undefined' ? new URLSearchParams(location.search).get('sheen') ?? 0.8 : 0.8);
const FS = /* glsl */`
in vec3 vW; in vec3 vN; in float vDepth; in float vGust;
${GROUND_GLSL}
uniform sampler2D uFarTex;
// the valley floor: two base greens within ~2% value of each other (they read #D3E6BC / #DCE9AE
// under the first haze step), everything else is a thin stroke
const vec3 FIELD_G = vec3(0.818, 0.897, 0.710);
const vec3 FIELD_Y = vec3(0.859, 0.910, 0.648);
const vec3 FIELD_T = vec3(0.553, 0.702, 0.604);   // #8DB39A hedge / tree line
// the planned drifts, baked (see PLAN in the module): rgb = what they add to the three colour fields, a = palette
uniform sampler2D uPlan;
uniform float uWindAmp;
// hue: the family of a dab from the palette of its drift and a world noise read at the dab's own place
const float PAL_FAM[${PALS.length * 4}] = float[${PALS.length * 4}](${PALS.flat().map((v) => v.toFixed(1)).join(', ')});
float ringPal(vec2 p){
  return mod(floor(length(p - SUBJECT.xz) / 7.0 + (textureLod(uMeadow, (p * 1.3 + vec2(91.0, 53.0) + 0.5) / 256.0, 0.0).a - 0.5) * 2.0), ${PALS.length}.0);
}
float famAt(vec2 p, float pal, float jit){
  float n = textureLod(uMeadow, (p * ${HUE_S.toFixed(1)} + vec2(${HUE_OX.toFixed(1)}, ${HUE_OZ.toFixed(1)}) + 0.5) / 256.0, 0.0).a + jit;
  int s = n < ${HUE_Q[0].toFixed(4)} ? 1 : n < ${HUE_Q[1].toFixed(4)} ? 0 : n < ${HUE_Q[2].toFixed(4)} ? 2 : 3;
  return PAL_FAM[int(pal + 0.5) * 4 + s];
}
${FLOWER_HUE_GLSL}
${GATHER_GLSL}
vec3 dabHue(vec3 D, float m2, float fam, float h, float h2){
  // two thirds of the dabs take the family of their band, the rest the colour of the drift they stand in
  float hb = fract(h * 7.13 + h2 * 3.31);
  if (hb < ${BAND_SHARE.toFixed(2)}) return famHue(fam, h2);
  float mx = max(D.x, max(D.y, D.z));
  vec3 w = D + vec3(0.20, 0.13, 0.22) * mx;
  float t = h * (w.x + w.y + w.z);
  if (t < w.x) return famHue(m2 > 0.62 ? 4.0 : 1.0, h2);
  if (t < w.x + w.y) return famHue(3.0, h2);
  return h2 < 0.68 ? FL_W : (m2 < 0.24 ? vec3(0.847, 0.784, 0.902) : vec3(0.975, 0.820, 0.850));
}
// one grid of dabs (cell size s, in metres): at most one dab per cell, an ellipse with its long axis toward
// the eye (dir: unit, from the camera POSITION only), so that a dab lying on the ground at a grazing angle
// is still a lozenge on screen and not a hairline
float gMono = 0.0, gRag = 0.0, gUneven = 0.0;
void dabGrid(vec2 p, float s, float wgt, vec3 D, float Dt, float m2, float pal, float r0, float asp, vec2 dir, vec2 fw, float soft, mat2 back, float sh, float up, inout vec3 col, inout float cov){
  vec2 q = p / s;
  vec2 ci = floor(q), cf = q - ci;
  float h = hash21(ci + 0.37), h2 = fract(h * 61.7), h3 = fract(h * 157.3), h4 = fract(h * 419.1);
  float pres = smoothstep(0.0, 0.25, Dt * min(wgt * 1.5, 1.0) * 1.2 - h * 0.85);
  if (pres <= 0.0) return;
  float r = r0 * mix(0.72 + 0.28 * h2, 0.50 + 0.50 * h2, gUneven) * sqrt(pres);
  vec2 d = cf - (0.5 + (vec2(h3, h4) - 0.5) * max(0.98 - 2.0 * r, 0.0));
  float al = dot(d, dir), ac = dot(d, vec2(-dir.y, dir.x)) * asp;
  float rd = length(vec2(al, ac));
  // (an uneven outline: no dab is a clean ellipse)
  float ww = max(fw.x, fw.y * asp) / s;
  if (rd > r * 1.45 + 0.5 * ww * soft) return;
  float an = atan(ac, al);
  float v = r * (1.0 + 0.11 * sin(an * 3.0 + h * 40.0) + 0.07 * sin(an * 2.0 + h3 * 40.0) + gRag) - rd;
  // (a soft edge a pixel and a half wide: a brush mark, and nothing for a creeping camera to catch on)
  float c1 = clamp(v / max(ww * soft, 1e-5) + 0.5, 0.0, 1.0) * clamp(1.6 * r / ww, 0.0, 1.0);
  if (c1 <= 0.0) return;
  float tot = c1 + cov * (1.0 - c1);
  // (the family is that of the dab's own place - the middle of its cell - so no dab is cut in two colours)
  // (one dab in five is a stroke of LEAF green, not a bloom: the blooms of a drift stand among grass strokes,
  // and a drift of nothing but flower colours is a rug laid on the lawn)
  float hg = fract(h * 733.3);
  vec3 dc;
  if (hg < 0.21) dc = hg < 0.12 ? vec3(0.570, 0.770, 0.380) : vec3(0.450, 0.675, 0.365);
  else {
    vec2 wc = back * ((ci + 0.5) * s - sh);
    float fam = famAt(wc, pal < 0.0 ? ringPal(wc) : pal, (h3 - 0.5) * 0.05);
    // (from high above the dabs of a patch are nearly one tone: a brushed patch, not a heap of discs)
    dc = mix(dabHue(D, m2, fam, h4, fract(h * 977.7)), famHue(fam, 0.55), gMono);
  }
  col = mix(col, dc, c1 / tot);
  cov = tot;
}
float flowerDabs(vec2 p, vec3 D, float Dt, float m2, float pal, float dist, float el, float up, float upFar, vec2 toCamXZ, out vec3 col){
  float hl = length(toCamXZ);
  vec2 dir = hl > 1e-3 ? toCamXZ / hl : vec2(1.0, 0.0);
  // A dab is SMALL on screen: about 9 px wide and 3 px tall at eye level (a lozenge lying toward the eye, drawn
  // out in the world as the view flattens so that it never becomes a hairline), about 6 px round from above;
  // never the size of a fallen petal.
  float asp = clamp(0.36 / el, 1.0, 5.0);
  asp = mix(1.0, asp, smoothstep(0.02, 0.2, hl));
  float px = dist * uPixelK;
  // (looked down on from high up the dabs are larger and soft-edged, and they run together: brushed patches of
  // colour, one hue cluster a patch - not confetti)
  float sT = max(px * max(3.7 / el, mix(7.0, 11.0, smoothstep(0.4, 0.8, el)) * asp), 0.05) * mix(1.0, mix(1.5, 1.7, upFar), up);
  float l = log2(sT), l0 = floor(l), f = l - l0;
  float sA = exp2(l0);
  // pixel footprint along / across the direction to the eye (world metres; analytic - no derivative
  // of anything that is discontinuous or singular under the camera)
  vec2 fw = vec2(px / el, px) * 0.75;
  col = vec3(1.0);
  float cov = 0.0;
  // seen flat the dabs are drawn out toward the eye and cover less of their cell each: they are larger in
  // it, and a third grid joins in (its dabs grow from nothing as the view flattens), so that the green left
  // between them stays near 35-45% at any angle
  float flat_ = 1.0 - smoothstep(0.30, 0.60, el);
  // (crisp at eye level and looked down on from near by - small dabs with a brushed edge; only from high up do they
  // soften and run together)
  float r0 = mix(mix(0.35, 0.50, flat_), mix(0.40, 0.50, upFar), up), soft = mix(1.0, 4.5, upFar);
  gMono = mix(0.45, 0.75, upFar) * up;
  gUneven = up * (1.0 - upFar);
  const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);
  const mat2 ROT3 = mat2(0.28, 0.96, -0.96, 0.28);
  const mat2 ID = mat2(1.0, 0.0, 0.0, 1.0), ROTI = mat2(0.8, -0.6, 0.6, 0.8), ROT3I = mat2(0.28, -0.96, 0.96, 0.28);
  vec2 p2 = ROT * p + 13.7, dir2 = ROT * dir;
  float wA = 1.0 - f, wB = f;
  dabGrid(p, sA * 2.0, wB, D, Dt, m2, pal, r0, asp, dir, fw, soft, ID, 0.0, up, col, cov);
  dabGrid(p2, sA * 2.0, wB, D, Dt, m2, pal, r0, asp, dir2, fw, soft, ROTI, 13.7, up, col, cov);
  // (the same grids at every octave: when the octave steps, grid B simply becomes grid A)
  dabGrid(p, sA, wA, D, Dt, m2, pal, r0, asp, dir, fw, soft, ID, 0.0, up, col, cov);
  dabGrid(p2, sA, wA, D, Dt, m2, pal, r0, asp, dir2, fw, soft, ROTI, 13.7, up, col, cov);
  // (the third grid only from above: at eye level two grids of somewhat larger dabs leave the green between them)
  // (and in the clumps of a drift, where the blooms stand thick and run together into one mass)
  float w3 = max(up, smoothstep(1.4, 2.0, Dt));
  if (w3 > 0.0){
    vec2 p3 = ROT3 * p + 71.3, dir3 = ROT3 * dir;
    dabGrid(p3, sA * 2.0, wB * w3, D, Dt, m2, pal, r0, asp, dir3, fw, soft, ROT3I, 71.3, up, col, cov);
    dabGrid(p3, sA, wA * w3, D, Dt, m2, pal, r0, asp, dir3, fw, soft, ROT3I, 71.3, up, col, cov);
  }
  return cov;
}

const vec4 FLD_C[${FIELDS.length}] = vec4[${FIELDS.length}](${FIELDS.map((f) => `vec4(${f1(f.c[0])}, ${f1(f.c[1])}, ${f1(f.h[0])}, ${f1(f.h[1])})`).join(', ')});
const vec3 FLD_D[${FIELDS.length}] = vec3[${FIELDS.length}](${FIELDS.map((f) => `vec3(${f1(f.d[0])}, ${f1(f.d[1])}, ${f1(f.tone)})`).join(', ')});

// The valley floor and the far slopes: the quietest part of the picture. One flat green; long
// lens-shaped patches of a second green barely apart from it; a few thin strokes. Everything is
// laid out in polar space around the hilltop with the radial coordinate s = 1000 / r, which is
// (nearly) how the ground projects on screen from up here: marks are rings in the world and
// thin level streaks in the picture, and they are spaced evenly down the picture at any distance.
// Stroke thickness is set in pixels (2-5 px tall whatever the lens).
vec3 farPaint(vec3 wp, float rr, vec4 pn){
  float th = atan(wp.z, wp.x) * (1.0 / 6.2831853);
  float s = 1000.0 / rr;
  float wob = textureLod(uFarTex, vec2(th * 6.0, s * 0.11), 0.0).r;
  float f = s * 1.5 + (wob - 0.5) * 0.7 + wp.y * 0.02;
  float fw = clamp(fwidth(f), 1e-5, 0.5);
  float k = floor(f + 0.5), df = f - k;
  float h = hash11(k * 7.31 + 3.0);
  float u = th * 4.0 + h * 7.13;
  vec4 g = textureLod(uFarTex, vec2(u, (mod(k, 64.0) + 0.5) / 64.0), 0.0);

  // lens patches of the second green, lying along the rings
  float lens = g.a - 0.72 - abs(df) * 0.9;
  float w = 0.9 * fw + 0.004;
  vec3 c = mix(FIELD_G, FIELD_Y, smoothstep(-w, w, lens));

  // field strips toward the village, each with a 1 px hedge line along most of its edge
  if (rr > 220.0 && wp.z > 200.0){
    for (int i = 0; i < ${FIELDS.length}; i++){
      vec2 q = wp.xz - FLD_C[i].xy, d = FLD_D[i].xy;
      vec2 e = abs(vec2(dot(q, d), dot(q, vec2(-d.y, d.x)))) - FLD_C[i].zw;
      float sd = max(e.x, e.y) + (pn.r - 0.5) * 3.0;
      float sw = clamp(fwidth(sd), 1e-3, 40.0);
      vec3 fc = FLD_D[i].z < 1.5 ? FIELD_Y : FIELD_G * vec3(0.975, 0.985, 0.955);
      c = mix(c, fc, 1.0 - smoothstep(-0.7 * sw, 0.7 * sw, sd));
      float hl = clamp(1.3 - abs(sd) / sw, 0.0, 1.0) * step(0.34, pn.g) * step(sw, 30.0);
      c = mix(c, fc * vec3(0.885, 0.925, 0.90), hl * 0.9);
    }
  }

  // marks on the ring lines: broad soft-edged dabs (10-18 px tall, never a line), a touch lighter or
  // darker than the green they lie on, most of every ring left empty
  float on = smoothstep(0.71, 0.84, g.g);
  float kind = hash11(k * 3.17 + floor(u * 9.0) * 1.31);
  float halfw = on * mix(5.0, 9.0, g.b);
  float line = (1.0 - smoothstep(halfw * 0.35, halfw, abs(df) / fw)) * smoothstep(0.0, 2.0, halfw) * step(fw, 0.10);
  vec3 lc = kind < 0.55 ? c * vec3(0.962, 0.972, 0.952) : mix(c, vec3(0.905, 0.945, 0.770), 0.6);
  return mix(c, lc, line * 0.8);
}

// Planned value bands of the valley floor between the foot of the home hill and r ~ 480 (beyond that
// farPaint() is left exactly as it was, so the plain of src/extra/far.js still continues it without a
// seam). Four or five long bands lying along the rings (level in the picture), +/- 3% in value,
// warm near the hill and cooling with distance. (No line is drawn along the band edges: a 2 px
// hedge line reads as pen work.)
vec3 valleyBands(vec3 c, vec3 wp, float rr, float rw){
  float amp = 1.0 - smoothstep(380.0, 480.0, rr);
  if (amp <= 0.0) return c;
  float th = atan(wp.z, wp.x) * (1.0 / 6.2831853);
  float s = 1000.0 / rr;
  float wob = textureLod(uFarTex, vec2(th * 3.0 + 0.37, s * 0.06 + 0.43), 0.0).r;
  float f = s * 0.62 + (wob - 0.5) * 0.75 + wp.y * 0.012;
  float fw = clamp(fwidth(f), 1e-5, 0.5);
  float k = floor(f + 0.5), df = f - k;                 // the edge between band k-1 (further) and band k (nearer)
  float e = smoothstep(-fw, fw, df);
  float ha = hash11(k * 5.3 + 0.7), hb = hash11(k * 5.3 + 6.0);
  vec3 ta = mix(vec3(0.962, 0.978, 0.972), vec3(1.022, 1.014, 0.960), fract(k * 0.5) * 2.0) * (0.992 + 0.016 * ha);
  vec3 tb = mix(vec3(0.962, 0.978, 0.972), vec3(1.022, 1.014, 0.960), fract((k + 1.0) * 0.5) * 2.0) * (0.992 + 0.016 * hb);
  vec3 o = c * mix(vec3(1.0), mix(ta, tb, e), amp);
  // the first band past the hill keeps some of the hill's warmth
  o *= mix(vec3(1.0), vec3(1.022, 1.008, 0.925), 1.0 - aastep(168.0, rw));
  return o;
}

void main(){
  vec3 n = normalize(vN);
  float dist = distance(vW, uCamPos);
  float rr = length(vW.xz);

  // ---- depth planes, baked by distance from the hilltop: three firm, brush-warped rings
  vec4 pn = texture(uBrush, vW.xz / 173.0 + 0.21);
  float rw = rr * (1.0 + (pn.a - 0.5) * 0.24 + (pn.g - 0.5) * 0.06);
  float p1 = aastep(${HAZE[0][0].toFixed(1)}, rw), p2 = aastep(${HAZE[1][0].toFixed(1)}, rw), p3 = aastep(${HAZE[2][0].toFixed(1)}, rw);

  vec3 c = vec3(0.0);
  float tLit = 1.0;
  if (p1 < 0.999){
    float grass;
    vec3 lit = groundPaint(vW, grass);
    vec4 wn = texture(uBrush, vW.xz / 3.1 + 0.4);
    vec4 gm = groundMap(vW.xz);

    // ---- grass masses: a mid green laid in drifts over the wash, fixed in the world (baked field,
    // src/extra/grass.js), its edge torn by dabs and by short blade strokes; a deeper tone in the
    // core. The tufts stand inside it, so they read as the blades of one mass, not as icons.
    float s1 = texture(uBrush, vW.xz / 2.7 + 0.37).b;
    float mEdge = gm.g + (wn.r - 0.5) * 0.23 + (wn.a - 0.5) * 0.11 + (s1 - 0.5) * 0.07;
    // (looked down on from high up the masses are plan shapes - banded blotches with a cut edge: there their
    // edge is a soft wash and their tone comes halfway back to the meadow)
    float elG = abs(dot((uCamPos - vW) / dist, n));
    float upv = smoothstep(0.40, 0.80, elG) * smoothstep(10.0, 24.0, dist);
    float mass = aastep(0.5, mEdge) * grass;
    // (the deeper tone is not a zone nested inside the mass - that reads as camouflage - but separate
    // dabs that gather toward its core)
    float core = aastep(0.5, (gm.g - 0.70) * 1.5 + (wn.g - 0.5) * 0.9 + (wn.r - 0.5) * 0.30 + (s1 - 0.5) * 0.16 - 0.20) * mass;
    lit = mix(lit, massWash(lit), mass * (1.0 - 0.3 * upv));
    lit = mix(lit, MASS_D, core * 0.72 * (1.0 - 0.65 * upv));

    // ---- the ground of the flower drifts: a greener floor, and a darker dab of foliage under every cluster
    // (brush-torn edges; a little quieter with distance and from above, where the blooms are dabs too)
    float dEdge = gm.b + (wn.r - 0.5) * 0.20 + (wn.a - 0.5) * 0.10;
    // (the floor and the pads belong to the STANDING blooms: where those have shrunk away - from ~12 m - they go
    // too, or they are dark patches with nothing on them; the paint that takes over carries its own leaf dabs)
    float dQuiet = 1.0 - 0.86 * smoothstep(9.0, 16.0, dist) - 0.14 * upv * (1.0 - smoothstep(9.0, 16.0, dist));
    float dBody = aastep(0.20, dEdge + (s1 - 0.5) * 0.06) * grass * dQuiet;
    float dDab = aastep(0.50, dEdge + (s1 - 0.5) * 0.12) * grass * dQuiet;
    lit = driftWash(lit, dBody, dDab);

    // ---- the bare lawn between the drifts and the masses is not left one empty lime: a few QUIET value shapes
    // (large brush dabs lying across the view from the hilltop, a step deeper and greener, 4-9 m long, gathered
    // in places and absent in others), fixed in the world, out to the brow of the hill
    if (dist > 5.0 && dist < 75.0){
      float tzq = smoothstep(0.25, 0.75, vW.z * vW.z / (dot(vW.xz, vW.xz) + 1.0));
      vec2 uqa = vW.xz * vec2(1.0 / 23.0, 1.0 / 7.5) + 0.83, uqb = vW.xz * vec2(1.0 / 7.5, 1.0 / 23.0) + 0.29;
      vec2 qax = dFdx(uqa), qay = dFdy(uqa), qbx = dFdx(uqb), qby = dFdy(uqb);
      float qm;
      if (tzq <= 0.0) qm = textureGrad(uBrush, uqb, qbx, qby).g;
      else if (tzq >= 1.0) qm = textureGrad(uBrush, uqa, qax, qay).g;
      else qm = mix(textureGrad(uBrush, uqb, qbx, qby).g, textureGrad(uBrush, uqa, qax, qay).g, tzq);
      float qgate = smoothstep(0.40, 0.60, texture(uBrush, vW.xz / 37.0 + 0.61).a);
      float quiet = aastep(0.63, qm + (wn.a - 0.5) * 0.10) * qgate * (1.0 - mass) * (1.0 - dBody) * grass
                  * smoothstep(5.0, 9.0, dist) * (1.0 - smoothstep(50.0, 75.0, dist)) * (1.0 - 0.5 * upv);
      lit = mix(lit, lit * vec3(0.925, 0.972, 0.900), quiet * 0.85);
    }

    // the ground near the viewer is painted: a few value shapes 0.3-0.7 m across, and short
    // dry-brush strokes in two directions: darker ones in the masses, lighter ones in the bare wash.
    // All fixed in the world; they thin out with distance (mip-mapped) and are gone by 18 m.
    // Looking straight down still shows brushwork.
    float nk = 0.0, sDark = 0.0, sLight = 0.0;
    if (dist < 18.0){
      nk = (1.0 - smoothstep(7.0, 18.0, dist)) * grass;
      float gate = smoothstep(0.47, 0.66, texture(uBrush, vW.xz / 6.3 + 0.9).a);
      float pt = texture(uBrush, vW.xz / 5.2 + 0.23).r;
      float s2 = texture(uBrush, mat2(0.88, 0.47, -0.47, 0.88) * vW.xz / 3.6 + 0.71).b;
      lit = mix(lit, lit * vec3(0.945, 0.975, 0.89), aastep(0.86 - 0.10 * gate, pt) * nk * 0.85 * (1.0 - mass));
      lit = mix(lit, lit * vec3(1.035, 1.030, 1.130), aastep(0.90, 1.0 - pt) * (1.0 - gate) * nk * 0.8 * (1.0 - mass));
      sDark = aastep(0.86 - 0.08 * core, s1) * nk * mass;
      sLight = aastep(0.925, 1.0 - s2) * (1.0 - 0.7 * gate) * (1.0 - mass) * nk;
      lit = mix(lit, lit * vec3(0.84, 0.925, 0.86), sDark * 0.8);
      lit = mix(lit, lit * vec3(1.045, 1.035, 1.17), sLight * 0.75 * (1.0 - dBody));
    }

    // looked down on from high up the lawn is a painted ground plane: long dry-brush strokes lying on it (1-4 m,
    // fixed in the world, in two directions), a step deeper inside the masses and a step lighter on the bare wash.
    // They come in with the elevation and the distance of the eye (never at eye level, where the wash is calm).
    if (upv > 0.001){
      float b1 = texture(uBrush, vW.xz * vec2(1.0 / 13.0, 1.0 / 9.0) + 0.47).b;
      float b2 = texture(uBrush, mat2(0.80, 0.60, -0.60, 0.80) * vW.xz / 11.0 + 0.13).b;
      lit = mix(lit, lit * vec3(0.930, 0.968, 0.880), aastep(0.80, b1 + 0.10 * mass) * upv * 0.75 * grass);
      lit = mix(lit, lit * vec3(1.030, 1.026, 1.120), aastep(0.87, b2) * upv * 0.65 * grass * (1.0 - mass));
    }

    // dark turf at the foot of things (kept inside the footprint of the tufts that stand on it)
    float cm = smoothstep(0.46, 0.52, gm.r + (wn.a - 0.5) * 0.30 + (wn.r - 0.5) * 0.30 + (wn.b - 0.5) * 0.34) * grass * (1.0 - 0.6 * upv);
    lit = mix(lit, vec3(0.44, 0.67, 0.42), cm * 0.78);

    // the slopes of the home hill step toward the valley green in two planned bands (firm,
    // brush-warped rings, level in the picture), so the hilltop does not end on one hue jump
    lit = mix(lit, lit * vec3(0.985, 0.992, 1.10), aastep(50.0, rw) * grass);
    lit = mix(lit, lit * vec3(0.982, 0.990, 1.10), aastep(78.0, rw) * grass);

    // ---- THE WIND ON THE MEADOW AT A DISTANCE: where the tufts are too small to be seen bending, a gust shows as
    // a faint paler sheen on the grass (bent blades turn their pale sides up) - the same shared field the tufts
    // and leaves read (windGust, src/glsl.js), so the band rolls downwind with them, at their speed. One wide
    // soft-edged band per gust, a few percent lighter: no edge to boil against the fixed brushwork, nothing to
    // flicker. It comes in beyond the standing tufts and scales with ?wind= (uWindAmp).
    if (${SHEEN > 0 ? 'true' : 'false'} && uWindAmp > 0.0 && dist > 9.0){
      float band = smoothstep(0.22, 0.80, vGust);
      float wk = band * min(uWindAmp, 2.0) * smoothstep(9.0, 24.0, dist) * grass * (1.0 - 0.5 * cm);
      lit = mix(lit, lit * vec3(1.060, 1.048, 1.100) + vec3(0.010, 0.012, 0.004), wk * ${SHEEN.toFixed(3)});
    }

    // ---- flower drifts: DABS, never a filled shape. There is no underlay: a drift is made of separate flat
    // dabs in two or three flower colours with the green left between them, densest in its core and thinning
    // out raggedly (smaller, fewer dabs) toward its rim. Every dab is anchored in the world (a cell of a
    // power-of-two grid); the grid is chosen by distance and by the angle of view so that a dab keeps about
    // the same size ON SCREEN, and two neighbouring octaves are crossfaded by letting single dabs shrink away
    // (flowerDabs). With distance, and seen from above, the dabs pale toward the meadow and thin out.
    float fm = 0.0;
    vec3 fcol = vec3(1.0);
    if (rr < 150.0 && rr > 7.0 && dist > 5.5){
      // Within ~${NOISE_IN} m of the chapel the meadow is composed by hand (the baked plan) and the noise field is off:
      // it is read only further out. (At a level set by the distance alone: the mip chosen for a grazing view is
      // flat grey, and the drifts of the far slopes would thin away to nothing.)
      float r1 = length(vW.xz - SUBJECT.xz), famP = -1.0;
      float nz = smoothstep(${NOISE_IN.toFixed(1)}, ${NOISE_OUT.toFixed(1)}, r1);
      vec3 md = vec3(${DRIFT_T.map((t) => (t - NOISE_DROP).toFixed(4)).join(', ')});
      if (nz > 0.0){
        float dl = log2(max(dist * uPixelK * 1.5, 1e-4));
        vec3 mn = textureLod(uMeadow, (vW.xz * ${DRIFT_SCALE.toFixed(2)} + 0.5) / 256.0, clamp(dl + ${Math.log2(DRIFT_SCALE).toFixed(2)}, 0.0, 6.0)).rgb;
        vec3 ed = textureLod(uMeadow, (vW.xz * ${EDGE_SCALE.toFixed(1)} + vec2(${EDGE_OX.toFixed(1)}, ${EDGE_OZ.toFixed(1)}) + 0.5) / 256.0, clamp(dl + ${Math.log2(EDGE_SCALE).toFixed(2)}, 0.0, 6.0)).rgb;
        mn += (ed - 0.5) * ${EDGE_AMP.toFixed(2)};
        md = max(md - 0.06, mix(md, mn + ${FOOT.toFixed(3)} * smoothstep(${FOOT_IN.toFixed(1)}, ${FOOT_OUT.toFixed(1)}, r1), nz));
      }
      vec2 puv = (vW.xz + ${PEXT.toFixed(1)}) / ${(2 * PEXT).toFixed(1)};
      if (r1 < 94.0) md += texture(uPlan, puv).rgb;
      // (the rim of a planned drift is torn by the brush map too, and dissolves: no contour to follow)
      md += ((wn.a - 0.5) * 0.20 + (wn.r - 0.5) * 0.10) * (1.0 - nz);
      vec3 b = md - vec3(${DRIFT_T.map((t) => t.toFixed(4)).join(', ')});
      // density of each colour: nothing outside, full a good way inside (a wide, ragged falloff)
      vec3 D = smoothstep(vec3(-0.10), vec3(0.30), b);
      D.z *= 0.8;
      float Dm = max(D.x, max(D.y, D.z));
      // nothing grows through the nave floor
      float nave = 1.0 - ${rectGLSL(FLOOR_BLOOM, 'vW.xz')};
      float gate = grass * (1.0 - cm) * nave;
      if (Dm * gate > 0.004){
        float m2 = texture(uMeadow, (vW.xz * 0.9 + vec2(40.0, 17.0) + 0.5) / 256.0).a;
        if (r1 < 94.0){
          float pa = texelFetch(uPlan, ivec2(puv * ${PN}.0), 0).a;
          if (pa < 0.9) famP = floor(pa * 255.0 / 32.0 + 0.5);
        }
        vec3 tc = (uCamPos - vW) / dist;
        float el = clamp(abs(dot(tc, n)), 0.03, 1.0);
        float up = smoothstep(0.34, 0.72, el) * smoothstep(4.5, 10.0, dist);   // looking down on the field from high up
        float upFar = up * smoothstep(13.0, 26.0, dist);
        float far = smoothstep(12.0, 62.0, dist);
        // (the blooms stand to ~8 m and shrink away by ~12 m - sooner seen from above: the paint comes in under them)
        float pStart = mix(8.0, 5.5, smoothstep(0.40, 0.75, el));
        // (the body of a drift is not one even stipple: it gathers in clumps a metre or two across with the
        // green showing between them)
        // (the same gathering as the standing blooms: clumps that hold most of a drift, thin ground between, rests)
        float clump = bloomGather(vW.xz);
        // (within ~8 m of the eye nothing is painted on the ground: there the drift is the standing blooms of
        // src/extra/grass.js among their stems and blades, and a dab lying on the lawn would be a fallen petal)
        // (and out to ~16 m a dab lies only on the floor of the drift, among the clusters that stand there: it is
        // one of their lower blooms, on the same dark green, and the hand-over to the standing blooms has no seam)
        float onFloor = mix(smoothstep(0.10, 0.34, gm.b), 1.0, max(smoothstep(11.0, 17.0, dist), up));
        float Dt = clamp(D.x + D.y + D.z, 0.0, 1.0) * gate * (1.0 - 0.20 * upFar) * (1.0 - 0.25 * far) * smoothstep(pStart, pStart + 5.0, dist) * onFloor * clump;
        gRag = (wn.b - 0.5) * 0.5 * up * (1.0 - upFar);
        if (Dt > 0.004) fm = flowerDabs(vW.xz, D, Dt, m2, famP, dist, el, up, upFar, tc.xz, fcol);
        // paler with distance and from above: toward the meadow colour, never toward grey
        float pale = clamp(0.38 * smoothstep(12.0, 45.0, dist) + mix(0.12, 0.34, upFar) * up, 0.0, 0.80);
        // a faint warm glaze where the drift is densest, without an edge (the dabs carry the drift)
        vec3 mean = (FL_Y * D.x + FL_P * D.y + FL_W * D.z) / max(D.x + D.y + D.z, 1e-3);
        lit = mix(lit, mean, 0.10 * smoothstep(0.25, 1.0, Dm) * gate * (1.0 - 0.6 * far));
        fcol = mix(fcol, lit, pale);
        lit = mix(lit, fcol, fm);
      }
    }

    // ---- under snow (see snowGround): the summer paint is covered
    if (uSnow > 0.5){ lit = snowGround(vW, dist, grass, mass, core, cm, wn, s1, upv); fm = 0.0; sLight = 0.0; gOwnSnow = true; }

    // ---- light. Cast shadow: a smooth rebuilt field (groundShadow) looked up at a softly warped
    // position and cut by one hard step whose threshold is pushed by LARGE world-fixed noise only:
    // a rounded, lobed, firm contour. A wider ring of taps finds the deeper tone further inside.
    float t = 1.0, deep = 0.0;
    bool maskRim = gm.a - max(abs(dFdx(gm.a)), abs(dFdy(gm.a))) <= 0.002;
    if (rr < 80.0 && gm.a > 0.002){
      vec2 wv = vec2(texture(uBrush, vW.xz / 4.7 + 0.15).a, texture(uBrush, vW.xz / 4.7 + 0.65).a) - 0.5;
      vec3 sp = vW + n * 0.05 + vec3(wv.x, 0.0, wv.y) * 0.30;

      float sh = groundShadow(sp);
      t = toneStep(sh, 0.5, wn.g * 0.5 + wn.r * 0.3 + wn.a * 0.2, 0.62);
      // (on the rim of the baked sun mask the screen derivatives inside toneStep() are those of a pixel quad half
      // outside this branch: there the ground is a metre from any shadow, and fully lit)
      if (sh > 0.9999 && maskRim) t = 1.0;
      // LICENCE (see leafShade in src/glsl.js): the shadow of leaves is laid, not projected. Where foliage
      // stands between the sun and the ground the shadow is the soft pool of it, cut into dabs that lie on
      // the ground: a closed mass in its middle with a few dabs of light let in, single dabs of shade off
      // its fringe. What a wall casts stays as it was cut, also under the leaves.
      if (uLoose > 0.0 && uSnow < 0.5 && !maskRim){
        vec2 suv = (uShadowMat * vec4(sp, 1.0)).xy * 0.5 + 0.5;
        float leaf = leafShade(suv);
        float lw = smoothstep(0.03, 0.20, leaf) * min(uLoose, 1.0);
        if (lw > 0.0){
          vec4 dn = texture(uBrush, vW.xz / 2.6 + 0.37);
          float tl = toneStep(1.0 - leaf, 0.5, dn.g * 0.6 + dn.r * 0.25 + wn.a * 0.15, 0.95);
          float solid = (1.0 - t) * (1.0 - smoothstep(0.25, 0.6, leafCaster(suv)));
          t = min(mix(t, tl, lw), 1.0 - solid);
        }
      }
      if (t < 0.999){
        // inside: the second, deeper tone in large dab-shaped patches; the lighter one keeps the rim
        float inside = 1.0 - toneStep(min(sh * 2.0, 1.0) * 0.5 + groundShadowDeep(sp) * 0.5, 0.30, wn.a, 0.16);
        deep = inside * aastep(0.66, shadePatch(vW.xz) + (wn.a - 0.5) * 0.10 + (wn.r - 0.5) * 0.06);
      }
    }
    deep = max(deep, cm * 0.8);
    vec3 shade = groundShade(lit, grass, deep);
    // in shade the lighter strokes are blades catching the sky: a clear lighter green over the tone
    shade = mix(shade, vec3(0.470, 0.690, 0.545), sLight * 0.55);
    // (a bloom in cast shadow keeps its hue: the colour a step down and a little cooler - never mixed into the
    // shadow green, which turns yellow to khaki)
    shade = mix(shade, fcol * vec3(0.76, 0.69, 0.82), fm * 0.94);
    if (uSnow > 0.5){
      // snow in shade: the sky's blue, a deeper tone inside, the paint under it still told (hollow, track) a step down
      shade = mix(SNOW_S, SNOW_D, deep) * (0.80 + 0.21 * lit.g / 0.97);
      shade = mix(shade, shade * vec3(0.93, 0.90, 0.97), (1.0 - grass) * 0.8);
    }
    c = mix(shade, lit, t);
    tLit = t;

    // the foot of the home hill: a slightly deeper band, so the hill ends on a firm edge against the valley
    c *= 1.0 - 0.035 * smoothstep(84.0, 108.0, rw);
  }

  // ---- beyond the first ring the home meadow gives way to the valley floor
  if (p1 > 0.001) c = mix(c, valleyBands(farPaint(vW, max(rr, 60.0), pn), vW, max(rr, 60.0), rw), p1);

  // stepped haze (the shared table, src/glsl.js HAZE) toward uHazeCol
  // (the season and the hour are laid before the air; on the hilltop the ground knows which side it painted)
  if (p1 < 0.001) gLit = tLit; else gOwnSnow = false;
  c = hourOf(c);
  c = mix(c, uHazeCol, ${HAZE[0][1].toFixed(4)} * p1 + ${(HAZE[1][1] - HAZE[0][1]).toFixed(4)} * p2 + ${(HAZE[2][1] - HAZE[1][1]).toFixed(4)} * p3);

  oColor = vec4(c, 1.0);
  writeAux(n, 0.0, vDepth, 0.011, 0.0, 0.0);
}
`;

export function buildTerrain(scene) {
  const rings = 150, sect = 144, RMAX = 520;
  const pos = [], nrm = [], idx = [];
  const push = (x, z) => {
    const y = height(x, z);
    // far normals are taken over a wider base: slope shading there is about the big forms
    const e = 0.5 + 6.0 * sstep(40, 130, Math.hypot(x, z));
    pos.push(x, y, z);
    const nx = height(x - e, z) - height(x + e, z), nz = height(x, z - e) - height(x, z + e);
    const l = Math.hypot(nx, 2 * e, nz);
    nrm.push(nx / l, (2 * e) / l, nz / l);
  };
  push(0, 0);
  for (let i = 1; i <= rings; i++) {
    const r = RMAX * Math.pow(i / rings, 2.3);
    for (let j = 0; j < sect; j++) {
      const a = (j / sect) * Math.PI * 2 + (i % 2) * (Math.PI / sect);
      push(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  for (let j = 0; j < sect; j++) idx.push(0, 1 + ((j + 1) % sect), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * sect, b0 = 1 + i * sect;
    for (let j = 0; j < sect; j++) {
      const j1 = (j + 1) % sect;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  const m = mat({ vs: VS, fs: FS, uniforms: { ...GROUND_UNIFORMS }, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  // (drawn after everything that stands on it - walls, trunks, stones, tufts, blooms - and before the far layers
  // and the sky: the ground shader then runs only where the ground is seen)
  mesh.renderOrder = 0.5;
  mesh.userData.shadowMat = shadowMat();
  scene.add(mesh);
  return mesh;
}
