// The hills and the crowns of the distant landscape (src/extra/far.js), as arrays. No dependency on the page or on
// THREE, so that src/paint.worker.js can lay them out while the page loads; far.js makes the meshes of them.
import { rng } from '../rng.js';
import { height, fbm, smooth } from '../noise.js';
import { stepFog } from '../haze.js';
import { SUN_X, SUN_Y, SUN_Z } from '../sun.js';

const SUN = { x: SUN_X, y: SUN_Y, z: SUN_Z };
export const TAU = Math.PI * 2;
const S2 = (() => { const k = 1 / Math.sqrt(SUN_X * SUN_X + SUN_Z * SUN_Z); return { x: SUN_X * k, y: SUN_Z * k }; })();
// at azimuth a (as seen from the hilltop): sT > 0 = sun on the viewer's right; f = 1 fully front-lit, -1 against the light
export const sunAt = (a) => ({ sT: -Math.sin(a) * S2.x + Math.cos(a) * S2.y, f: -(Math.cos(a) * S2.x + Math.sin(a) * S2.y) });
export const annY = (r) => -31 + 4 * smooth(400, 520, r) + 22 * smooth(520, 1150, r);
export const groundY = (x, z) => { const r = Math.hypot(x, z); return r < 500 ? height(x, z) : annY(r); };
// eye height of a viewer standing at the origin (the far landscape is composed for this eye)
export const EYE_Y = height(0, 0) + 1.7;
export const gauss = (R) => (R() + R() + R() + R() - 2) * 1.2;

export const HILLS = [
  // near tier: wooded, readable individual crowns
  { x: -150, z: -350, rx: 250, rz: 150, rot: 0.3, H: 86, wood: 0.06, fog: 0.12 },    // north / north-west, behind the chapel
  { x: 270, z: -330, rx: 190, rz: 130, rot: -0.5, H: 70, wood: -0.02, fog: 0.24 },   // north-east
  { x: 480, z: -30, rx: 160, rz: 230, rot: 0.2, H: 64, wood: 0.02, fog: 0.24 },      // east
  { x: 400, z: 300, rx: 150, rz: 115, rot: 0.6, H: 40, wood: 0.10, fog: 0.24 },      // south-east: low wooded rise beside the open plain
  { x: -300, z: 330, rx: 210, rz: 140, rot: 0.6, H: 60, wood: 0.0, fog: 0.24 },      // south-west
  { x: -460, z: -20, rx: 150, rz: 250, rot: -0.1, H: 78, wood: 0.26, fog: 0.24 },    // west
  // far tier: paler second hills
  { x: 140, z: -780, rx: 340, rz: 210, rot: 0.1, H: 96, wood: 0.04, fog: 0.48 },
  { x: -650, z: -520, rx: 300, rz: 220, rot: 0.7, H: 104, wood: 0.0, fog: 0.48 },
  { x: 900, z: -350, rx: 300, rz: 240, rot: -0.3, H: 92, wood: -0.04, fog: 0.48 },   // the castle hill
  { x: -330, z: 860, rx: 280, rz: 180, rot: -0.2, H: 58, wood: 0.06, fog: 0.48 },
  { x: -820, z: 420, rx: 300, rz: 240, rot: 0.4, H: 86, wood: 0.02, fog: 0.48 },
  { x: 880, z: 800, rx: 250, rz: 180, rot: 0.5, H: 40, wood: 0.07, fog: 0.48 },
];
export function hillH(h, x, z) {
  const dx = x - h.x, dz = z - h.z, c = Math.cos(h.rot), s = Math.sin(h.rot);
  const d = Math.hypot((dx * c + dz * s) / h.rx, (-dx * s + dz * c) / h.rz);
  if (d >= 1) return h.yb;
  const n = fbm(x * 0.0055 + h.seed * 7.3, z * 0.0055 + h.seed * 3.1, 3);
  const n2 = fbm(x * 0.021 + h.seed, z * 0.021, 2);
  const p = 1 - smooth(0, 1, d);
  return h.yb + h.H * Math.pow(p, 0.8) * (0.55 + 0.9 * n) + (n2 - 0.5) * h.H * 0.12 * p;
}
export function hillN(h, x, z, e = 4) {
  const nx = hillH(h, x - e, z) - hillH(h, x + e, z), nz = hillH(h, x, z - e) - hillH(h, x, z + e), l = Math.hypot(nx, 2 * e, nz);
  return [nx / l, (2 * e) / l, nz / l];
}
// where the woods are: > 0 inside. Big irregular woods with ragged edges, leaving the high shoulders and some slopes bare.
export function hillWood(h, x, y, z) {
  const n1 = fbm(x * 0.0046 + h.seed * 13.1, z * 0.0046 + h.seed * 5.7, 3), n2 = fbm(x * 0.024 + h.seed, z * 0.024 + 9, 2);
  const hn = Math.min(1, Math.max(0, (y - h.yb - 8) / h.H));
  return (n1 - 0.5) * 2.6 + (n2 - 0.5) * 0.5 + h.wood + (0.42 - hn) * 0.5 - 0.03;
}

// Per hill, once: where it stands and how it is hazed (the crowns read these too).
HILLS.forEach((h, i) => {
    h.seed = i + 1;
    h.dist = Math.hypot(h.x, h.z);
    h.az = Math.atan2(h.z, h.x);
    h.yb = groundY(h.x, h.z) - 12;
    h.far = h.dist > 600;
    h.flip = sunAt(h.az).sT > 0 ? -1 : 1;
    h.tile = 120;
    h.off = (i * 0.317) % 1;
    { const df = h.dist - 0.7 * Math.min(h.rx, h.rz); h.mistY = (annY(df) + 9 - EYE_Y) / df; }      // (taken at the hill's near foot)
    h.mist = h.far ? 1 : 0;      // (a slope from the eye: see mistStep)
});

// The one mesh of the twelve hills, as arrays: positions, normals, wood (uv), per-vertex hill data, index.
export function hillArrays() {
  const pos = [], nrm = [], uv = [], idx = [], aH = [], aP = [], aQ = [];
  HILLS.forEach((h, i) => {
    const NR = 40, NS = 96, v0 = pos.length / 3;
    const c = Math.cos(h.rot), s = Math.sin(h.rot);
    const P = (d, a) => { const lx = Math.cos(a) * d * h.rx, lz = Math.sin(a) * d * h.rz; return [h.x + lx * c - lz * s, h.z + lx * s + lz * c]; };
    const push = (x, z) => {
      const y = hillH(h, x, z);
      pos.push(x, y, z); nrm.push(...hillN(h, x, z, 3));
      uv.push(Math.min(1, Math.max(0, 0.5 + hillWood(h, x, y, z) * 2.5)), 0);
      aH.push(Math.cos(h.az), Math.sin(h.az), h.dist, h.flip);
      aP.push(h.fog, h.tile, h.mistY, h.mist);
      aQ.push(h.yb, h.H, h.off, 0.45 + h.fog * 0.5);
    };
    push(h.x, h.z);
    for (let r = 1; r <= NR; r++) for (let j = 0; j < NS; j++) { const [x, z] = P(r / NR, (j / NS) * TAU); push(x, z); }
    for (let j = 0; j < NS; j++) idx.push(v0, v0 + 1 + ((j + 1) % NS), v0 + 1 + j);
    for (let r = 1; r < NR; r++) {
      const a0 = v0 + 1 + (r - 1) * NS, b0 = v0 + 1 + r * NS;
      for (let j = 0; j < NS; j++) { const j1 = (j + 1) % NS; idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j); }
    }
  });
  const f32 = (a) => new Float32Array(a);
  return { pos: f32(pos), nrm: f32(nrm), uv: f32(uv), aH: f32(aH), aP: f32(aP), aQ: f32(aQ), idx: new Uint32Array(idx) };
}

// ------------------------------------------------------------------------------------ crown cards
export function crownArrays(search = '') {
  const Q_ = new URLSearchParams(search);
  const CAP_N = +(Q_.get('capn') ?? 1.5), CAP_T = +(Q_.get('capt') ?? 0.34);
  const WOOD_CAP = +(Q_.get('woodcap') ?? 0.52);
  let woodMasses = 0;
  const R = rng(321);
  const P = [], A = [], B = [], NB = 4, GP = [];      // (GP: the wood a crown belongs to, see the masses below)
  let curGrp = 0;
  // foot at (x, y, z); s = card size; th = cap threshold (low = big sun cap); mist = top of the ground mist there; wd = width factor
  // HAZE RULE: a card is never paler than the plane directly behind it. The ground steps paler with
  // distance, but the near hills are painted darker than the ground at their feet (one firm dark plane each),
  // so a copse standing on the rolling ground in front of such a hill, given the ground's step, was a pale
  // shape sliding over a darker one - it read as a translucent overlay. Looking out from the hilltop along
  // the card's azimuth (and a little to either side: the eye walks about), any hill within reach behind it
  // caps its haze. Crowns that stand on a hill keep that hill's own step (capOn = false while they are placed).
  let capOn = false;
  const capFog = (x, z, fog) => {
    if (!capOn) return fog;
    const r = Math.hypot(x, z), a0 = Math.atan2(z, x);
    for (const h of HILLS) {
      if (h.fog >= fog || h.dist + Math.max(h.rx, h.rz) < r) continue;
      const c = Math.cos(h.rot), s = Math.sin(h.rot);
      let hit = false;
      for (let k = -1; k <= 1 && !hit; k++) for (let t = r; t < r + 700 && !hit; t += 20) {
        const px = Math.cos(a0 + k * 0.05) * t - h.x, pz = Math.sin(a0 + k * 0.05) * t - h.z;
        if (Math.hypot((px * c + pz * s) / h.rx, (-px * s + pz * c) / h.rz) < 0.92) hit = true;
      }
      if (hit) fog = h.fog;
    }
    return fog;
  };
  const add = (x, y, z, s, cell, th, fog, kind = 0, mist = -1e5, wd = 1) => {
    fog = capFog(x, z, fog);
    const a = Math.atan2(z, x);
    // neighbouring crowns lean the same way (yellower stands, tealer stands), with a little individual scatter
    const j = (fbm(x * 0.013 + 70, z * 0.013, 2) - 0.5) * 3.2 + gauss(R) * 0.35;
    // (a crown of a wood is the wood's own tone: only the slow drift of hue from stand to stand, no value of
    // its own - forty overlapping crowns each a twentieth lighter or darker than the next are a mush)
    const inWood = kind > 0.2 && kind < 0.3, jw = (fbm(x * 0.013 + 70, z * 0.013, 2) - 0.5) * 2.2, vj = R() < 0.3 ? 0.4 + R() * 0.6 : -R() * 0.5;
    if (inWood) GP[B.length / NB] = curGrp;
    P.push(x, y, z, s); A.push(cell, (sunAt(a).sT > 0 ? -1 : 1) * wd, th, fog); B.push(kind, kind > 0.5 ? 0 : Math.max(-1, Math.min(1, inWood ? jw : j)), inWood ? 0 : vj, mist);
  };
  // cap threshold from how much sun a crown gets: L = 1 broad cap (first grey level), 0 = a sliver or nothing
  const capTh = (L, x, z) => {
    const f = sunAt(Math.atan2(z, x)).f;
    // neighbours agree (clusters of sunlit tops inside a shadow mass, not an even sprinkle)
    // (in stands of a dozen crowns and more: at the scale of single crowns the caps were an even speckle of
    // equal light blobs over the whole wood under a long lens; most of a wood is its dark mass)
    const l = Math.min(1, Math.max(0, L * (0.72 + 0.28 * f))) + (fbm(x * 0.017 + 31, z * 0.017 + 17, 2) - 0.5) * CAP_N + (fbm(x * 0.06 + 3, z * 0.06 + 7, 2) - 0.5) * 0.35 + (R() - 0.5) * 0.12;
    return l < CAP_T ? 1.5 : l < CAP_T + 0.10 ? 0.9 : l < 0.62 ? 0.52 : 0.24;
  };
  // contact: a low dark stroke of undergrowth and shadow standing at the foot of a tree or a wood edge, a
  // little in front of it (toward the hilltop), so nothing leafy meets the pale ground on a bare line.
  // It is the hedge cell, never sunlit, stretched sideways: wide = its width in metres.
  const SR = rng(4711), BQ = rng(5151);
  const strip = (x, yG, z, wide, fog, mist, gy) => {
    // (a lone tree's stroke stays right at its foot: its ground height is only known there)
    // (the foot of a WOOD - gy given - is no stroke of its own: it stands right at the crown's foot in the wood's
    // own darkened body tone, so the mass comes down to the ground on one closed edge)
    const rr = Math.hypot(x, z), k = 1 - (gy ? 0.5 : 0.4) / rr, sx = x * k, sz = z * k;
    const wd = 2.4 + SR() * 0.8, s = wide / wd;
    P.push(sx, (gy ? gy(sx, sz) : yG) - s * 0.10, sz, s); A.push(19, (SR() < 0.5 ? -1 : 1) * wd, 1.5, capFog(x, z, fog));
    if (gy) B.push(2.5, Math.max(-1, Math.min(1, (fbm(x * 0.013 + 70, z * 0.013, 2) - 0.5) * 2.2)), -2, mist ?? -1e5); else B.push(2, 0, 0, mist ?? -1e5);
  };
  // (shade = the crown stands on a slope the hill paints in its SHADE tone: there it gets a sliver of sun at most.
  // A broad sun cap is paler than the shaded grass behind it, and a whole wood of them reads as a pale
  // translucent sheet sliding over the hill.)
  const shadeIdx = new Set();
  const woodCrown = (x, yG, z, r, L, fog, mist, shade) => { const s = (2 * r) / 0.62, cell = Math.floor(R() * 8), th = capTh(L, x, z); if (shade) shadeIdx.add(B.length / NB); add(x, yG + r * 0.55 - s * 0.47, z, s, cell, shade ? Math.max(th, 0.9) : Math.max(th, WOOD_CAP), fog, 0.25, mist); };
  // lone trees: every one its own proportions (W is a separate stream so the placement stays as it was),
  // and never a crown that is all sun: the cap stops at the second level, leaving a shadow side and a dark underside
  const W = rng(977);
  const loneTree = (x, yG, z, hgt, L, fog, cell = 8 + Math.floor(R() * 8), mist) => {
    const s = hgt / 0.8, th = capTh(L, x, z);
    // (no pillars: the columnar cell is rare, and no tree is squeezed narrower than it was painted)
    if (cell === 13 && W() < 0.85) cell = 8 + Math.floor(W() * 5);
    add(x, yG - s * 0.075, z, s, cell, Math.max(th, (W(), 0.52)), fog, 0, mist, 0.92 + W() * 0.42);
    strip(x, yG, z, hgt * 0.85, fog, mist);
  };
  // a loose group of lone trees: 3-7, overlapping, mixed kinds and sizes, never in a row
  const group = (cx, cz, gy, fog, n, rad, base, mist) => {
    for (let i = 0; i < n; i++) {
      const b = R() * TAU, d = Math.sqrt(R()) * rad, x = cx + Math.cos(b) * d, z = cz + Math.sin(b) * d;
      const sc = Math.min(1.6, Math.max(0.6, Math.exp(gauss(R) * 0.38)));
      loneTree(x, gy(x, z), z, base * sc, 0.35 + R() * 0.5, fog, undefined, mist);
    }
  };

  for (const h of HILLS) {
    curGrp = h.seed;
    const hillG = (u, v) => Math.max(groundY(u, v), hillH(h, u, v));
    const area = h.rx * h.rz * Math.PI, n = Math.floor(area / (h.far ? 110 : 30));
    const c = Math.cos(h.rot), s = Math.sin(h.rot);
    const rMed = h.far ? 8.5 : 5.0, rMin = h.far ? 5.5 : 3, rMax = h.far ? 15 : 9;
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(R()) * 0.98, a = R() * TAU;
      const lx = Math.cos(a) * d * h.rx, lz = Math.sin(a) * d * h.rz;
      const x = h.x + lx * c - lz * s, z = h.z + lx * s + lz * c;
      const y = hillH(h, x, z);
      if (y < groundY(x, z) - 1 && Math.hypot(x, z) < 520) continue;
      const w = hillWood(h, x, y, z);
      const N = hillN(h, x, z), ndl = N[0] * SUN.x + N[1] * SUN.y + N[2] * SUN.z;
      // sun on the slope, broken into big light and dark masses (hollows, cloud shadow) rather than an even sprinkle
      const L = smooth(0.2, 0.62, ndl) * (0.1 + 0.9 * smooth(0.36, 0.44, fbm(x * 0.011 + 5 + h.seed, z * 0.011, 2)));
      const mist = h.mist ? h.mistY : -1e5;
      if (w > 0) {
        if (R() > 0.35 + w * 5) continue;                 // thinner toward the edge of a wood, so single crowns read there
        const r = Math.min(rMax, Math.max(rMin, rMed * Math.exp(gauss(R) * 0.38)));
        woodCrown(x, y, z, r, L * (0.45 + R() * 0.75), h.fog, mist, ndl < 0.34);
        // where the wood comes down to the valley floor, its edge stands on a dark stroke
        if (y - groundY(x, z) < 7 && SR() < 0.7) strip(x, 0, z, r * 2.7, h.fog, mist, hillG);
      } else {
        const hn = (y - h.yb) / h.H, q = R();
        // pale outcrops on the steep upper slopes, in a few clusters; a few loners and bushes on the grass
        const rk = fbm(x * 0.012 + h.seed * 3, z * 0.012 + 40, 2);
        if (hn > 0.3 && rk > 0.62 && N[1] < 0.985 && q < 0.12) { const rs = (h.far ? 15 : 8) * Math.exp(gauss(R) * 0.5); add(x, y - rs * 0.42, z, rs, 16 + Math.floor(R() * 3), ndl > 0.3 ? 0.5 : 1.5, h.fog, 1, mist); }
        else if (q > 0.975 && w > -0.3) group(x, z, (u, v) => hillH(h, u, v), h.fog, 1 + Math.floor(R() * 3), 7, h.far ? 17 : 11, mist);
        else if (q > 0.96) {
          // a bush on the open slope: never a lone low dash (a flat lozenge with a dark line under it is a sticker
          // on the hill) but a rounded bush with one or two smaller ones against it, overlapping - a small clump
          const bs = (h.far ? 16 : 9) * (0.7 + R() * 0.6), th = (R(), capTh(L, x, z));
          add(x, y - bs * 0.13, z, bs, 14, Math.max(th, 0.52), h.fog, 0, mist, 1.1);
          const rr = Math.hypot(x, z), tx = -z / rr, tz = x / rr;
          for (let b = 0, nb = 1 + Math.floor(BQ() * 2); b < nb; b++) {
            const off = (b ? -1 : 1) * bs * (0.32 + BQ() * 0.3), k = 1 - (0.6 + b) / rr, x2 = (x + tx * off) * k, z2 = (z + tz * off) * k, s2 = bs * (0.5 + BQ() * 0.3);
            P.push(x2, hillH(h, x2, z2) - s2 * 0.13, z2, s2); A.push(14, (BQ() < 0.5 ? -1 : 1) * (1.1 + BQ() * 0.4), Math.max(th, 0.9), h.fog); B.push(0, B[B.length - 3], -BQ() * 0.5, mist);
          }
        }
      }
    }
  }
  capOn = true;
  // lone trees and small copses on the rolling ground around the hill
  for (let k = 0; k < 64; k++) {
    const a = R() * TAU, rr = 112 + Math.pow(R(), 0.8) * 390;
    if (Math.cos(a - 1.1) > 0.55 && R() < 0.75) continue;     // keep the south-east open
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, fog = stepFog(rr);
    curGrp = 100 + k;
    if (R() < 0.3) {     // a copse: a pile of crowns with a few distinct trees at its edge
      const n = 8 + Math.floor(R() * 14), rad = 9 + n * 0.7, el = 0.5 + R() * 0.5, ea = R() * TAU;
      for (let i = 0; i < n; i++) {
        const b = R() * TAU, d = Math.sqrt(R()) * rad, ux = Math.cos(b) * d, uz = Math.sin(b) * d * el;
        const x = cx + ux * Math.cos(ea) - uz * Math.sin(ea), z = cz + ux * Math.sin(ea) + uz * Math.cos(ea);
        const r = Math.min(9, Math.max(3, 5.2 * Math.exp(gauss(R) * 0.35)));
        woodCrown(x, height(x, z) + r * 0.5, z, r, 0.5 + R() * 0.5, fog);
        if (i % 2 === 0) strip(x, 0, z, r * 2.7, fog, undefined, height);
      }
      group(cx, cz, height, fog, 3 + Math.floor(R() * 3), rad * 1.25, 12);
    } else group(cx, cz, height, fog, 3 + Math.floor(R() * 5), 7 + R() * 9, 11.5);
  }
  // --- the middle distance, between the home hill and the pale plain: broken BELTS of dark wood lying
  // along the foot of the hill (the one mid-dark plane every outward view crosses), and thin hedge lines
  // beyond them. Own random stream: everything placed before and after stays where it was.
  {
    const Q = rng(8086);
    // [azimuth (deg), half span (deg), distance, rows]
    for (const [azd, half, r0, rows] of [[38, 20, 200, 3], [92, 15, 172, 2], [141, 24, 188, 3], [197, 19, 214, 3], [249, 15, 178, 2], [303, 21, 204, 3], [351, 13, 168, 2]]) {
      curGrp = 200 + azd;
      const a0 = (azd * Math.PI) / 180, sp = (half * Math.PI) / 180, n = Math.round((2 * sp * r0) / 4.2 * rows);
      for (let i = 0; i < n; i++) {
        const u = Q() * 2 - 1, a = a0 + u * sp, taper = 1 - Math.pow(Math.abs(u), 2.5);
        const row = Q() * rows * taper;
        // the belt wanders in and out, and breaks where the noise says so
        const wob = (fbm(Math.cos(a) * 2.3 + azd, Math.sin(a) * 2.3, 2) - 0.5) * 60;
        if (fbm(Math.cos(a) * 7 + 3 + azd, Math.sin(a) * 7, 2) < 0.36) { Q(); Q(); continue; }
        const rr = r0 + wob + row * 6.5 + (Q() - 0.5) * 5, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        const r = Math.min(8.5, Math.max(3.4, 5.4 * Math.exp(gauss(Q) * 0.3))) * (0.75 + 0.25 * taper);
        // mostly in its own shadow: sun only on scattered tops
        { const q1 = Q(), q2 = Q(); woodCrown(x, height(x, z) + r * 0.45, z, r, smooth(0.50, 0.60, fbm(x * 0.021 + 77, z * 0.021 + 13, 2)) * (0.5 + q2 * 0.45) + (q1 < 0.06 ? 0.4 : 0), stepFog(rr) * 0.6); }
        if (row < 1.2) strip(x, 0, z, r * 2.7, stepFog(rr) * 0.6, undefined, height);
      }
    }
    // hedge lines: long, low, slightly bent runs across the slope, with a tree standing in them here and there
    for (let k = 0; k < 16; k++) {
      const a = Q() * TAU, rr = 235 + Q() * 230, len = 70 + Q() * 120, skew = (Q() - 0.5) * 0.9, bend = (Q() - 0.5) * 0.5;
      let x = Math.cos(a) * rr, z = Math.sin(a) * rr, dir = a + Math.PI / 2 + skew;
      for (let t = 0; t < len;) {
        const sz = 8 + Q() * 5, r = Math.hypot(x, z), fog = stepFog(r);
        if (r < 505 && r > 225 && !HILLS.some((h) => hillH(h, x, z) > height(x, z) + 1)) {
          if (Q() < 0.86) { P.push(x, height(x, z) - sz * 0.07, z, sz); A.push(19, (Q() < 0.5 ? -1 : 1) * 1.25, Q() < 0.5 ? 0.52 : 1.5, capFog(x, z, fog)); B.push(0, (Q() - 0.5) * 0.8, -Q() * 0.6, -1e5); }
          if (Q() < 0.07) loneTree(x, height(x, z), z, 9 + Q() * 5, 0.5, fog);
        }
        t += sz * 1.05; dir += bend * sz / len; x += Math.cos(dir) * sz * 1.05; z += Math.sin(dir) * sz * 1.05;
      }
    }
  }
  // far hedgerows and wood edges out on the plain, seen nearly edge-on: broken runs of crowns
  for (let k = 0; k < 60; k++) {
    const a = R() * TAU, rr = 545 + Math.pow(R(), 1.3) * 600, n = 5 + Math.floor(R() * 22), bend = (R() - 0.5) * 0.4;
    curGrp = 600 + k;
    for (let i = 0; i < n; i++) {
      if (R() < 0.22) continue;
      const t = (i - n / 2) * (8 + R() * 6), r = rr + t * bend + (R() - 0.5) * 14, aa = a + t / rr;
      const x = Math.cos(aa) * r, z = Math.sin(aa) * r;
      if (HILLS.some((h) => hillH(h, x, z) > annY(r) + 1)) continue;
      const big = 1 + smooth(600, 1100, r) * 0.7;
      if (R() < 0.25) loneTree(x, annY(r), z, (10 + R() * 8) * big, 0.5 + R() * 0.5, stepFog(r));
      else { const cr = (4 + R() * 4) * big; woodCrown(x, annY(r) + cr * 0.3, z, cr, 0.5 + R() * 0.5, stepFog(r)); }
    }
  }
  // --- A WOOD IS ONE MASS, painted as one (not a field of crowns each with its own light cap and dark speck,
  // and not lit patches lying anywhere on its face):
  //   - sun caps only along its TOP THIRD, in a few clusters of unequal length with the crowns' own scallops
  //     for an upper contour - deep on the side the sun is on, a rim of slivers against the light;
  //   - through its middle two or three big shapes of a second body tone;
  //   - its lowest sixth a soft step darker (both in the shader, from the lines found here).
  // Each wood (the woods of one hill, a belt, a copse) is drawn on a panorama from the hilltop eye; what hangs
  // together there is one mass. Per mass: its foot and its top as lines over the azimuth, widened to the
  // crowns' size and smoothed, so every card reads the same two lines at its own left and right edge.
  const nAll = B.length / NB, MC = new Float32Array(nAll * 4), MD = new Float32Array(nAll * 4);
  {
    const NA = 4096, NE = 720, E0 = -0.24, E1 = 0.44, occ = new Uint8Array(NA * NE), lab = new Int32Array(NA * NE), WQ = rng(60606);
    const wood = (i) => B[i * NB] > 0.2 && B[i * NB] < 0.3;
    const geo = (i) => { const x = P[i * 4], z = P[i * 4 + 2], sz = P[i * 4 + 3], r = Math.hypot(x, z); return [Math.atan2(z, x), (P[i * 4 + 1] + sz * 0.5 - EYE_Y) / r, (sz * 0.31) / r]; };
    const elOf = (e) => E0 + ((e + 0.5) / NE) * (E1 - E0);
    const groups = new Map();
    for (let i = 0; i < nAll; i++) if (wood(i)) { const g = GP[i] ?? 0; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
    const colLo = new Int16Array(NA), colHi = new Int16Array(NA).fill(-1), stack = [];
    // (every wood together: a mass with another wood standing right behind its top is not a top at all in the
    // picture - lit, it was a row of pale patches across the middle of the bigger shape)
    const occAll = new Uint8Array(NA * NE);
    for (let i = 0; i < nAll; i++) {
      if (!wood(i) || A[i * 4 + 3] > 0.3) continue;      // (the near tier only: a pale far hill behind a wood's top is another plane)
      const [az, el, ar] = geo(i), ca = (az / TAU) * NA, ra = (ar / TAU) * NA * 0.9, ce = ((el - E0) / (E1 - E0)) * NE, re = (ar / (E1 - E0)) * NE * 0.8;
      for (let e = Math.max(0, Math.floor(ce - re)); e <= Math.min(NE - 1, Math.ceil(ce + re)); e++) {
        const w = ra * Math.sqrt(Math.max(0, 1 - ((e - ce) / re) ** 2));
        for (let k = Math.floor(ca - w); k <= Math.ceil(ca + w); k++) { const q = e * NA + (((k % NA) + NA) % NA), fc = Math.round(A[i * 4 + 3] * 200) + 1; if (!occAll[q] || fc < occAll[q]) occAll[q] = fc; }
      }
    }
    // (1 where a wood of about the same haze step stands there: one of another step is another plane of the picture)
    let fogC = 0;
    const allAt = (az, el) => { const e = Math.floor(((el - E0) / (E1 - E0)) * NE); if (e < 0 || e >= NE) return 0; const v = occAll[e * NA + (((Math.floor((az / TAU) * NA) % NA) + NA) % NA)]; return v && Math.abs(v - fogC) < 13 ? 1 : 0; };
    let nMass = 0;
    for (const [grp, list] of groups) {
      const touched = [];
      for (const i of list) {
        const [az, el, ar] = geo(i), ca = (az / TAU) * NA, ra = (ar / TAU) * NA * 0.9, ce = ((el - E0) / (E1 - E0)) * NE, re = (ar / (E1 - E0)) * NE * 0.8;
        for (let e = Math.max(0, Math.floor(ce - re)); e <= Math.min(NE - 1, Math.ceil(ce + re)); e++) {
          const w = ra * Math.sqrt(Math.max(0, 1 - ((e - ce) / re) ** 2));
          for (let k = Math.floor(ca - w); k <= Math.ceil(ca + w); k++) { const q = e * NA + (((k % NA) + NA) % NA); if (!occ[q]) { occ[q] = 1; touched.push(q); } }
        }
      }
      const cellOf = (i) => { const [az, el] = geo(i); const e = Math.min(NE - 1, Math.max(0, Math.floor(((el - E0) / (E1 - E0)) * NE))); return e * NA + (((Math.floor((az / TAU) * NA) % NA) + NA) % NA); };
      const masses = [];
      for (const i of list) {
        const q0 = cellOf(i);
        if (!occ[q0] || lab[q0]) continue;
        // flood one mass, noting its lowest and highest row in every column
        const id = masses.length + 1, cols = [];
        lab[q0] = id; stack.length = 0; stack.push(q0);
        while (stack.length) {
          const q = stack.pop(), e = (q / NA) | 0, k = q - e * NA;
          if (colHi[k] < 0) { colHi[k] = colLo[k] = e; cols.push(k); } else { if (e > colHi[k]) colHi[k] = e; if (e < colLo[k]) colLo[k] = e; }
          for (let de = -1; de <= 1; de++) for (let dk = -1; dk <= 1; dk++) {
            const e2 = e + de; if (e2 < 0 || e2 >= NE) continue;
            const q2 = e2 * NA + ((k + dk + NA) % NA);
            if (occ[q2] && !lab[q2]) { lab[q2] = id; stack.push(q2); }
          }
        }
        // (a mass that crosses the seam of the azimuth is laid out past it)
        cols.sort((a, b) => a - b);
        let c0 = cols[0];
        if (cols[0] === 0 && cols[cols.length - 1] === NA - 1) { let g = 0; while (g + 1 < cols.length && cols[g + 1] === cols[g] + 1) g++; c0 = cols[g + 1] ?? 0; }
        const len = cols.length, top = new Float32Array(len), bot = new Float32Array(len);
        for (let a = 0; a < len; a++) { const k = (c0 + a) % NA; top[a] = elOf(colHi[k] >= 0 ? colHi[k] : 0); bot[a] = elOf(colLo[k] >= 0 ? colLo[k] : 0); }
        for (const k of cols) colHi[k] = -1;
        masses.push({ c0, len, top, bot, ar: 0, n: 0 });
      }
      for (const i of list) { const m = masses[lab[cellOf(i)] - 1]; if (m) { m.ar += geo(i)[2]; m.n++; } }
      for (const m of masses) {
        // widen each line to its extreme within a crown or so, then smooth it: a slow line the cards can share
        const W = Math.max(2, Math.min(48, Math.round((1.3 * (m.ar / Math.max(1, m.n)) / TAU) * NA))), { len } = m;
        const run = (src, f) => { const o = new Float32Array(len); for (let a = 0; a < len; a++) { let v = src[a]; for (let d = Math.max(0, a - W); d <= Math.min(len - 1, a + W); d++) v = f(v, src[d]); o[a] = v; } return o; };
        const blur = (src) => { const o = new Float32Array(len); for (let a = 0; a < len; a++) { let v = 0, c = 0; for (let d = Math.max(0, a - W); d <= Math.min(len - 1, a + W); d++) { v += src[d]; c++; } o[a] = v / c; } return o; };
        m.top = blur(blur(run(m.top, Math.max))); m.bot = blur(blur(run(m.bot, Math.min)));
        m.width = (len / NA) * TAU; m.seed = WQ(); m.kU = 3.4 / Math.max(m.width, 0.05);
        nMass++;
      }
      const at = (m, arr, az) => { let c = (az / TAU) * NA - 0.5 - m.c0; c -= Math.floor(c / NA) * NA; if (c > m.len - 1) c = c - m.len + 1 < NA - c ? m.len - 1 : 0; const a = Math.floor(c), f = c - a; return arr[a] + (arr[Math.min(m.len - 1, a + 1)] - arr[a]) * f; };
      const uAt = (m, az) => { let c = (az / TAU) * NA - m.c0; c -= Math.floor(c / NA) * NA; if (c > NA * 0.75) c -= NA; return (c / NA) * TAU * m.kU; };
      for (const i of list) {
        const m = masses[lab[cellOf(i)] - 1], [az, el, ar] = geo(i), q = WQ(), q2 = WQ();
        if (!m) continue;
        const r = Math.hypot(P[i * 4], P[i * 4 + 2]), hw = (P[i * 4 + 3] * 0.5 * Math.abs(A[i * 4 + 1])) / r, f = sunAt(az).f;
        MC.set([at(m, m.bot, az - hw), at(m, m.bot, az + hw), at(m, m.top, az - hw), at(m, m.top, az + hw)], i * 4);
        MD.set([uAt(m, az - hw), uAt(m, az + hw), m.seed, f], i * 4);
        B[i * NB + 2] = -2;
        // the sun caps: where the crown's top stands in the mass (1 = on its upper contour)
        const b0 = at(m, m.bot, az), t0 = at(m, m.top, az), hc = (el + 0.9 * ar - b0) / Math.max(t0 - b0, 1e-4);
        // clusters along the top: three to five to a mass, of unequal length, each reaching deepest at its middle
        const cn = fbm(uAt(m, az) * 2.3 + m.seed * 37.0, m.seed * 11.0 + 3.3, 2);
        const back = f < -0.3, cl = back ? smooth(0.30, 0.42, cn) : smooth(0.40, 0.56, cn);
        // (against the light: a rim of slivers along most of the top; a wood standing behind this top: nothing)
        const depth = back ? 0.17 : (0.12 + 0.19 * cl) * (0.45 + 0.55 * smooth(-0.3, 0.45, f));
        fogC = Math.round(A[i * 4 + 3] * 200) + 1;
        const backed = A[i * 4 + 3] <= 0.3 && allAt(az, t0 + 2.2 * ar) + allAt(az - ar, t0 + 3.2 * ar) + allAt(az + ar, t0 + 3.2 * ar) + allAt(az, t0 + 5 * ar) + allAt(az, t0 + 8 * ar) >= 2;
        // (against the light only the crowns of the top row itself)
        const isLit = cl > 0.05 && hc > 1 - depth && q < 0.74 && !backed && (!back || t0 - el - 0.9 * ar < 1.1 * ar) && (t0 - b0 > 7 * ar || t0 - el - 0.9 * ar < 2.2 * ar);
        if (isLit) A[i * 4 + 2] = !back ? (t0 - el - 0.9 * ar < 2.2 * ar || q2 < 0.35 ? 0.52 : 0.9) : 0.52;
        else A[i * 4 + 2] = 1.5;
        // (dark accents of their own only on the lit tops, where they are the shadow under a cap)
        if (!isLit) B[i * NB] = 0.35;
        // the stroke at this crown's foot is part of the same mass: it reads the same lines
        if (i + 1 < nAll && B[(i + 1) * NB] > 2.2) {
          const k = i + 1, sx = P[k * 4], sz = P[k * 4 + 2], sa = Math.atan2(sz, sx), sw = (P[k * 4 + 3] * 0.5 * Math.abs(A[k * 4 + 1])) / Math.hypot(sx, sz);
          MC.set([at(m, m.bot, sa - sw), at(m, m.bot, sa + sw), at(m, m.top, sa - sw), at(m, m.top, sa + sw)], k * 4);
          MD.set([uAt(m, sa - sw), uAt(m, sa + sw), m.seed, f], k * 4);
        }
      }
      for (const q of touched) { occ[q] = 0; lab[q] = 0; }
    }
    // a wood's foot strokes take the lines of the nearest crown before them in the list (only the flag matters: they are all foot)
    for (let i = 0; i < nAll; i++) if (B[i * NB] > 2.2 && MC[i * 4 + 2] === 0 && MC[i * 4] === 0) MC.set([1, 1, 2, 2], i * 4);      // (an orphan: all foot)
    woodMasses = nMass;
  }
  // nearest first (the camera never leaves the hilltop, so one fixed order serves every view): the
  // crowns of a wood overlap ten deep, and this way only the front ones are painted
  const N = B.length / NB, order = [...Array(N).keys()].sort((a, b) => Math.hypot(P[a * 4], P[a * 4 + 2]) - Math.hypot(P[b * 4], P[b * 4 + 2]));
  const pick = (src, n) => { const o = new Float32Array(N * n); order.forEach((s, i) => { for (let k = 0; k < n; k++) o[i * n + k] = src[s * n + k]; }); return o; };
  return { iPos: pick(P, 4), iA: pick(A, 4), iB: pick(B, NB), iC: pick(MC, 4), iD: pick(MD, 4), N, masses: woodMasses };
}

