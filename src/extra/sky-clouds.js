// Painted fair-weather cumulus for the sky (helper module for src/sky.js, no default export).
//
// A cloud is a CARD in direction space: a flat quad tangent to the sky sphere round the camera, so it
// is at infinity (no parallax against the far ranges), has no pole, and a straight cloud base stays
// straight at any tilt. Each card shows one "cel" of a small atlas baked once at start-up. The atlas
// does not store a picture but what a painter decides:
//   R = distance inside the silhouette (cel units), sky bays, satellite tufts and the broken lee end included
//   G = (cut mode only) distance inside the front heaps
//   B = for the heaps and the puff: -(2 + height above the base line, cel units);
//       for the wet ones (rows, flats): how soft the edge is there (0..1)
//   A = where the white may be laid thinner (the lower and lee parts of a heap)
// The shader lays the paint the way the aired backgrounds do: soft because round dabs overlap. Two sizes of
// dab fixed to the card (they cannot swim) push the outline in and out and mottle the body; the softness
// of the edge varies along it; the base is not an outline but the paint running out in tufts that lean to lee.
import * as THREE from 'three';
import { mat } from '../glsl.js';
import { rng, fbm } from '../world.js';

// Two ways of laying the paint, for comparison against the reference still (default: painted):
//   painted: soft dabbed edges, feathered ragged base, broad soft passages (a round brush pressed on)
//   cut (?cloudcut=1): one-pixel cut edges, level torn base with value bands, flat shade shapes
const CUT = /[?&]cloudcut=1/.test(globalThis.location?.search ?? '');

// ------------------------------------------------------------------------------------------ cels
const CW = 256, CH = 160, COLS = 3, ROWS = 3;
const AX = CW / CH;                     // cel space: x in [-AX, AX], y in [-1, 1], y up

// Each large mass is designed, not rolled: `p` lists its primary lobes [x, radius, lift] from the sunny
// (windward) end on the left to the lee end on the right; neighbours overlap by more than half, one lobe
// dominates. The generator adds the crown (many unequal scallops standing proud, sky biting in between
// some), a turret, the level trailing shelf, a few drawn-out streaks beyond it and the front heaps.
const CELS = {
  // the classic: one dominant dome, shoulders stepping down to lee; the lee end breaks up into separate tufts
  heapA: { kind: 'heap', seed: 11, p: [[-0.62, 0.26, 0.5], [-0.25, 0.46, 0.51], [0.22, 0.36, 0.55], [0.6, 0.25, 0.5]], turrets: 1, shelf: 0, fronts: [[-0.7, 0.5, 0.62], [0.62, 0.36, 1.0]], tail: 2, sat: 1, sh: [-0.05, 0.5, 0.13] },
  // the mass leans down-wind: lobes stacked up and over to lee, the lee shoulder dropped; one scallop much the largest
  heapE: { kind: 'heap', seed: 83, p: [[-0.72, 0.18, 0.45], [-0.56, 0.24, 0.5], [-0.3, 0.36, 0.55], [0.02, 0.4, 0.85], [0.4, 0.3, 0.8], [0.7, 0.2, 0.68]], sat: 2, turrets: 1, shelf: 0, fronts: [[-0.75, 0.74, 0.56]], tail: 0, sh: [-0.15, 0.6, 0.16] },
  // a compact pile: a second storey heaped on the middle; no front heap, only its lee side laid thinner
  heapG: { kind: 'heap', seed: 127, p: [[-0.35, 0.3, 0.75], [-0.12, 0.42, 0.7], [0.02, 0.3, 1.5], [0.36, 0.32, 0.6], [0.64, 0.2, 0.5]], turrets: 1, shelf: 0, fronts: [], tail: 1, sat: 1, bays: 0, sh: [0.1, 0.55, 0.15] },
  puffB: { kind: 'puff', seed: 73 },
  rowA: { kind: 'row', seed: 113 },
  flatA: { kind: 'flat', seed: 113 }, flatB: { kind: 'flat', seed: 131 },
};
const CEL_NAMES = Object.keys(CELS);
const CEL_INDEX = Object.fromEntries(CEL_NAMES.map((k, i) => [k, i]));
export { CEL_NAMES };

function skeleton(spec) {
  const { kind, seed } = spec;
  const R = rng(seed * 7919 + 13);
  const main = [], scraps = [], scoops = [], front = [], frontC = [], bites = [], tufts = [], bays = [];
  let squash = 1, softAll = 0, base = -0.42, eat = [0.14, 0.8], cut = 0, wedge = null;
  const add = (x, y, r, k = 0.055) => main.push(x, y, r, k);
  // a crown of scallops on the upper arc of a lobe: unequal (one large, two middling, the rest small), proud
  const crown = (x, y, r, m, a0, a1, to, bite) => {
    // (painted: few and broad - nothing smaller than a quarter of its lobe)
    const sizes = CUT ? [0.3, 0.2, 0.2, 0.13, 0.15, 0.12, 0.14, 0.13, 0.12] : [0.36, 0.28, 0.25, 0.3];
    const order = sizes.slice(0, m).map((s) => [s, R()]).sort((a, b) => a[1] - b[1]).map((s) => s[0]);
    let pa = 0, pr = 0;
    for (let k = 0; k < m; k++) {
      const a = (a0 + (k + 0.2 + R() * 0.6) * (a1 - a0) / m) * Math.PI / 180, rr = r * order[k] * (0.9 + R() * 0.2), q = r * ((CUT ? 0.92 : 0.74) + R() * 0.13);
      to(x + Math.cos(a) * q, y + Math.sin(a) * q, rr, CUT ? 0.03 : 0.07);
      // sky bites in at some of the junctions
      if (bite && k > 0 && R() < 0.4) { const am = (a + pa) / 2, qb = r * 1.0 + (rr + pr) * 0.85; bites.push([x + Math.cos(am) * qb, y + Math.sin(am) * qb, 0.03 + R() * 0.02]); }
      pa = a; pr = rr;
    }
  };
  if (kind === 'heap') {
    cut = CUT ? 0.12 : 0.04;
    const P = spec.p.map(([x, r, l]) => [x + (R() - 0.5) * 0.05, r * (0.94 + R() * 0.12), l]);
    let big = P[0];
    for (const [x, r, l] of P) { add(x, Math.max(r * l, 0.05 + r * 0.45), r); if (r > big[1]) big = [x, r, l]; }
    for (const [x, r, l] of P) if (r >= (CUT ? 0.19 : 0.34)) crown(x, r * l, r, CUT ? (r > 0.3 ? 6 + Math.floor(R() * 4) : 4) : (r > 0.3 ? 3 : 2), 165, 18, add, r > 0.28);
    // turrets: small knobs standing on the highest parts
    const tops = P.slice().sort((a, b) => (b[1] * (1 + b[2])) - (a[1] * (1 + a[2])));
    for (let k = 0; k < (CUT ? spec.turrets : 0); k++) {
      const [x, r, l] = tops[k % Math.min(tops.length, 3)], a = (65 + R() * 60) * Math.PI / 180, rr = 0.07 + R() * 0.05;
      add(x + Math.cos(a) * (r + rr * 0.5), r * l + Math.sin(a) * (r + rr * 0.5), rr, 0.03);
    }
    // the lee end: a short level shelf, or two or three flat scraps of thin paint trailing off along the base
    // line (lens-shaped, 3:1 to 5:1, sizes 1 : 0.5 : 0.25, the gaps growing), or nothing
    let lee = -1e3; for (const [x, r] of P) lee = Math.max(lee, x + r);
    for (let k = 0; k < spec.shelf * 3; k++) add(lee - 0.08 + k * 0.06, 0.25 + R() * 0.012, Math.max(0.05, 0.15 - k * 0.022), 0.08);
    let sx = lee + (spec.shelf ? 0.12 : -0.06);
    if (CUT) for (let k = 0; k < spec.tail; k++) { const a = 0.22 * Math.pow(0.5, k) * (0.9 + R() * 0.2), b = a / (5.5 + R() * 2) + 0.008; sx += a * 0.9; scraps.push([sx, a, b]); sx += a + 0.04 + k * 0.05; }
    // the base: nearly level, with two or three shallow scoops of unequal width
    let x0 = 1e3; for (const [x, r] of P) x0 = Math.min(x0, x - r);
    for (let k = 0, n = 2 + (R() < 0.5 ? 1 : 0); k < n; k++) { const a = 0.2 + R() * 0.22; scoops.push([x0 + (lee - x0) * (0.18 + 0.56 * (k + 0.25 + R() * 0.5) / n), a, a * (0.16 + R() * 0.1)]); }
    // front heaps: lower lobes standing before the mass, each with a scalloped crown of its own
    for (const [dx, sz, hy] of spec.fronts) {
      const fr = big[1] * sz, fx = big[0] + big[1] * dx, fy = Math.max(fr * hy, cut + 0.12);
      const tof = (x, y, r, kk) => front.push(x, y, r, kk);
      tof(fx, fy, fr, 0.05); crown(fx, fy, fr, 4 + Math.floor(R() * 2), 155, 25, tof, false);
      frontC.push([fx, fy, fr]);
    }
    if (!CUT) {
      // PAINTED. The outline is opened the way overlapping dabs leave it: sky bays reaching in at the junctions
      // of the lobes, one on the lee flank, one low on the windward side; small tufts standing off the outline,
      // some joined to it by a wisp; and the lee end breaking up into separate tufts on a slightly rising line.
      const T = rng(seed * 331 + 7);
      const sdm = (u, v) => { let d = 1e3; for (let i = 0; i < main.length; i += 4) d = Math.min(d, Math.hypot(u - main[i], v - main[i + 1]) - main[i + 2]); return d; };
      const cy = (p) => Math.max(p[1] * p[2], 0.05 + p[1] * 0.45);
      const bay = (jx, jy, ax, ay, r, deep, wide) => { const D = r * deep, o = r * 0.35, A = (D + o) / 2; bays.push([jx + ax * (D - o) / 2, jy + ay * (D - o) / 2, A, r * wide * 0.5, Math.atan2(ay, ax)]); };
      const Q = P.filter((p) => p[1] >= 0.19).sort((a, b) => a[0] - b[0]);
      const J = [];
      for (let i = 0; i + 1 < Q.length; i++) {
        const A = Q[i], B = Q[i + 1], ax = A[0], ay = cy(A), bx = B[0], by = cy(B), d = Math.hypot(bx - ax, by - ay);
        if (d >= A[1] + B[1] || d <= Math.abs(A[1] - B[1]) + 0.02) continue;
        const a = (A[1] * A[1] - B[1] * B[1] + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, A[1] * A[1] - a * a));
        const ex = (bx - ax) / d, ey = (by - ay) / d;
        J.push([ax + ex * a - ey * hh, ay + ey * a + ex * hh, Math.min(A[1], B[1]), T()]);
      }
      // one bay, where the two largest neighbours meet: a wedge, wide at the mouth, tapering in
      J.sort((a, b) => b[2] - a[2]);
      for (const j of J.slice(0, spec.bays ?? 1)) {
        const t = (20 + T() * 20) * (T() < 0.7 ? 1 : -1) * Math.PI / 180;     // off the vertical, mostly leaning to lee
        bay(j[0], j[1], Math.sin(t), -Math.cos(t), j[2], 0.3 + T() * 0.1, 0.4 + T() * 0.1);
      }
      // satellites: one or two, off the lee side only, each a single round soft dab (no wisps: nothing stands off the crown)
      for (let k = 0; k < (spec.sat ?? 1); k++) {
        const L = Q[Q.length - 1 - k], a = (22 + T() * 30) * Math.PI / 180, rs = (0.036 + T() * 0.008) * (k ? 0.75 : 1), gap = 0.03 + T() * 0.03;
        const dx = Math.cos(a), dy = Math.sin(a);
        let q = L[1]; while (sdm(L[0] + dx * q, cy(L) + dy * q) < gap + rs && q < 2) q += 0.01;
        tufts.push([L[0] + dx * q, cy(L) + dy * q, rs * 1.15, rs, T() * 3.1, 0.0]);
      }
      // the lee end: two tufts, 1 : 0.4, the nearer one touching the body, on a line rising 4 degrees
      let tx = lee - 0.06, ty = cut + 0.15;
      for (let k = 0; k < spec.tail; k++) {
        const a = 0.14 * [1, 0.4][k] * (0.9 + T() * 0.2);
        tx += a + k * 0.05;
        tufts.push([tx, ty + (tx - lee) * 0.07 + a * 0.2, a, a * (0.55 + T() * 0.12), 0.1 + T() * 0.2, k ? 0.0 : 0.08]);
        tx += a;
      }
    }
  } else if (kind === 'puff') {
    // a small cloud: one fuzzy blot - two dabs 1 : 0.7 pressed on over each other - and a few wisps trailing to lee
    squash = 0.9; softAll = 0.42; base = -0.3; eat = [0, 0];
    const r0 = 0.4;
    add(-0.2, r0, r0, 0.1); add(0.2, r0 * 0.8, r0 * 0.7, 0.1);
    tufts.push([0.62, r0 * 0.5, 0.2, 0.06, -0.25, 0.08], [0.78, r0 * 1.0, 0.13, 0.045, 0.3, 0.0], [1.0, r0 * 0.36, 0.09, 0.04, -0.1, 0.0]);
  } else if (kind === 'row') {
    squash = 0.72; softAll = 0.6; base = -0.2; if (!CUT) cut = 0.05;
    // sizes 1, 0.55, 0.3: the first two joined by a low bridge, the third a scrap beyond a wide gap
    let x = -0.9;
    [1, 0.55, 0.3].forEach((sz, i) => {
      const r0 = 0.26 * sz * (0.9 + R() * 0.2);
      add(x + r0, r0 * 0.6, r0); add(x + r0 * 1.9, r0 * 0.5, r0 * 0.72); add(x + r0 * 0.3, r0 * 0.35, r0 * 0.6);
      if (R() < 0.7) add(x + r0 * 1.2, r0 * 1.2, r0 * 0.5);
      if (i === 0) for (let k = 1; k <= 3; k++) add(x + r0 * 2.6 + k * 0.07, 0.07, 0.07);
      x += r0 * 2.7 + (i === 0 ? 0.12 : 0.42 + R() * 0.15);
    });
  } else {
    squash = 0.34; softAll = 0.75; base = -0.14;
    let x = -0.95;
    for (let i = 0, n = 5 + Math.floor(R() * 2); i < n; i++) { const r = (0.30 + R() * 0.26) * (i === 1 || i === 2 ? 1.25 : 0.9); x += r * 0.75; add(x, r * 0.5, r); x += r * 0.45; }
  }
  // bounds of everything drawn, scraps included (a scrap left out of them is cut by the cell border)
  let top = -1e3, x0 = 1e3, x1 = -1e3;
  for (let i = 0; i < main.length; i += 4) { top = Math.max(top, main[i + 1] + main[i + 2]); x0 = Math.min(x0, main[i] - main[i + 2]); x1 = Math.max(x1, main[i] + main[i + 2]); }
  for (const c of scraps) { x0 = Math.min(x0, c[0] - c[1]); x1 = Math.max(x1, c[0] + c[1]); }
  for (const c of tufts) { x0 = Math.min(x0, c[0] - c[2]); x1 = Math.max(x1, c[0] + c[2]); top = Math.max(top, c[1] + c[2]); }
  // centre it and keep everything well inside the cell
  const cx = (x0 + x1) / 2, half = (x1 - x0) / 2;
  for (let i = 0; i < main.length; i += 4) main[i] -= cx;
  for (let i = 0; i < front.length; i += 4) front[i] -= cx;
  for (const c of scraps) c[0] -= cx;
  for (const c of scoops) c[0] -= cx;
  if (wedge) wedge[0] -= cx;
  for (const c of frontC) c[0] -= cx;
  for (const c of bites) c[0] -= cx;
  for (const c of tufts) c[0] -= cx;
  for (const c of bays) c[0] -= cx;
  const sc = Math.min((0.74 - base) / (top * squash), (AX - 0.3) / half);
  return { kind, main: new Float32Array(main), front: new Float32Array(front), frontC, bites, tufts, bays, scraps, scoops, base, squash, half, top, softAll, sc, eat, cut, sh: spec.sh };
}

// smooth union of the circles (x, y, r, k)
function unionSd(M, nm, u, v) {
  let sd = 1e3;
  for (let c = 0; c < nm; c += 4) {
    const dx = u - M[c], dy = v - M[c + 1], lim = M[c + 2] + sd + 0.08, l2 = dx * dx + dy * dy;
    if (lim <= 0 || l2 >= lim * lim) continue;       // cannot change the smooth minimum
    const a = Math.sqrt(l2) - M[c + 2], k = M[c + 3], d = a < sd ? sd - a : a - sd, h = k > d ? (k - d) / k : 0;
    sd = (a < sd ? a : sd) - h * h * k * 0.25;
  }
  return sd;
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

function bakeCel(out, W, ox, oy, spec) {
  const S = skeleton(spec), seed = spec.seed, kind = spec.kind;
  const N = CW * CH, M = S.main, nm = M.length, F = S.front, nf = F.length;
  const msk = new Float32Array(N), tmp = new Float32Array(N);
  // the unsteady hand: no lobe is a true arc. Smooth fields are computed on a coarse grid:
  // two for the warp, one for where the edge goes soft, one that varies the passages.
  const o1 = seed * 3.17, o2 = seed * 1.31 + 40, GS = 8, gw = CW / GS + 1, gh = CH / GS + 1;
  const wxg = new Float32Array(gw * gh), wyg = new Float32Array(gw * gh), sg = new Float32Array(gw * gh), pg = new Float32Array(gw * gh);
  const wa = 0.18;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = (i * GS / CW * 2 - 1) * AX, y = j * GS / CH * 2 - 1, k = j * gw + i;
    wxg[k] = (fbm(x * 1.25 + o1, y * 1.25 + o2, 3) - 0.5) * wa;
    wyg[k] = (fbm(x * 1.25 + o2, y * 1.25 - o1, 3) - 0.5) * wa * 0.87;
    sg[k] = fbm(x * 1.6 - o1, y * 1.6 + o1, 2) - 0.5;
    pg[k] = fbm(x * 2.6 - o2, y * 2.6 + o1 * 2, 2);
  }
  const lerp2 = (g, fx, fy) => { const i = Math.min(gw - 2, Math.floor(fx)), j = Math.min(gh - 2, Math.floor(fy)), tx = fx - i, ty = fy - j, k = j * gw + i; return (g[k] * (1 - tx) + g[k + 1] * tx) * (1 - ty) + (g[k + gw] * (1 - tx) + g[k + gw + 1] * tx) * ty; };
  const fsc = S.sc * (S.squash < 1 ? Math.sqrt(S.squash) : 1);
  let bx0 = 1e3, bx1 = -1e3, by0 = 1e3, by1 = -1e3;
  for (let c = 0; c < nm; c += 4) { bx0 = Math.min(bx0, M[c] - M[c + 2] - 0.3); bx1 = Math.max(bx1, M[c] + M[c + 2] + 0.3); by0 = Math.min(by0, M[c + 1] - M[c + 2] - 0.3); by1 = Math.max(by1, M[c + 1] + M[c + 2] + 0.3); }
  for (const t of S.tufts) { bx0 = Math.min(bx0, t[0] - t[2] - 0.3); bx1 = Math.max(bx1, t[0] + t[2] + 0.3); by0 = Math.min(by0, t[1] - t[2] - 0.3); by1 = Math.max(by1, t[1] + t[2] + 0.3); }
  const TF = new Float32Array(S.tufts.flatMap((t) => [t[0], t[1], 1 / t[2], 1 / t[3], Math.cos(t[4]), Math.sin(t[4]), Math.min(t[2], t[3]), t[5], Math.max(t[2], t[3]) + 0.25])), nt = TF.length;
  const BY = new Float32Array(S.bays.flatMap((t) => [t[0], t[1], 1 / t[2], 1 / t[3], Math.cos(t[4]), Math.sin(t[4]), Math.min(t[2], t[3]), Math.max(t[2], t[3]) * 2 + 0.2])), nb = BY.length;
  // (one small function per pixel: it is compiled after a few hundred calls, where one long loop would run
  // interpreted for most of the first cel)
  const px = (i, j) => {
    const fx = (i + 0.5) / GS, fy = (j + 0.5) / GS;
    const x = ((i + 0.5) / CW * 2 - 1) * AX + lerp2(wxg, fx, fy), y = (j + 0.5) / CH * 2 - 1 + lerp2(wyg, fx, fy);
    // cloud space: base line at 0, heights unsquashed
    const u = x / S.sc, v = (y - S.base) / (S.squash * S.sc);
    let sd = 1e3, tuft = 1;
    if (u < bx0 || u > bx1 || v < by0 || v > by1) sd = 0.3 + Math.max(bx0 - u, u - bx1, by0 - v, v - by1, 0);
    else {
      sd = unionSd(M, nm, u, v);
      // sky bays (soft ellipses taken out) and tufts (single dabs added: satellites, wisps, the broken lee end)
      for (let b = 0; b < nb; b += 8) {
        const dx = u - BY[b], dy = v - BY[b + 1], m = BY[b + 7]; if (dx > m || dx < -m || dy > m || dy < -m) continue;
        const p = (dx * BY[b + 4] + dy * BY[b + 5]) * BY[b + 2], q = (dy * BY[b + 4] - dx * BY[b + 5]) * BY[b + 3];
        // a wedge: half-width 1 at the mouth (p = -1) tapering to nothing at the tip (p = 1)
        const e = Math.max((Math.abs(q) - 0.5 * (1 - p)) / BY[b + 3] * 0.9, (p - 1) / BY[b + 2]);
        sd = -smin(-sd, e, 0.07);
      }
      for (let b = 0; b < nt; b += 9) {
        const dx = u - TF[b], dy = v - TF[b + 1], m = TF[b + 8]; if (dx > m || dx < -m || dy > m || dy < -m) continue;
        const p = (dx * TF[b + 4] + dy * TF[b + 5]) * TF[b + 2], q = (dy * TF[b + 4] - dx * TF[b + 5]) * TF[b + 3], l = (Math.sqrt(p * p + q * q) - 1) * TF[b + 6];
        if (l < 0.3) { sd = TF[b + 7] ? smin(sd, l, TF[b + 7]) : Math.min(sd, l); if (l < tuft) tuft = l; }
      }
    }
    let f, scrap = 0;
    if (S.cut && !CUT) f = -sd;        // painted: the base is laid by the shader (a ramp along the base line, frayed)
    else if (S.cut) {
      // cut: the underside is CUT on a nearly level line, with a few shallow scoops out of it;
      // painted: the mass is eaten away toward its base line, leaving its lobes hanging unevenly
      f = CUT ? Math.min(-sd, v - S.cut) : -sd - Math.max(0, 0.24 - v) * 0.9;
      if (CUT) for (const c of S.scoops) { const dx = (u - c[0]) / c[1], dy = (v - S.cut) / c[2]; f = Math.min(f, (Math.sqrt(dx * dx + dy * dy) - 1) * c[2]); }
      for (const c of S.scraps) {
        // cut: a lens with pointed ends; painted: a smooth drawn-out dab
        const dx = (u - c[0]) / c[1], dv = v - S.cut - c[2], l = CUT ? (1 - dx * dx) * c[2] - Math.abs(dv) : (1 - Math.sqrt(dx * dx + dv * dv / (c[2] * c[2]))) * c[2] * 1.6;
        if (CUT) { if (l > f) { f = l; scrap = 1; } } else f = -smin(-f, -l, 0.06);
      }
    } else f = -sd - Math.max(0, S.eat[0] - v) * S.eat[1];   // the wet kinds are eaten away toward their base line
    // nothing reaches the border of the cell, not even the widest wet edge
    { let bd = i < CW - 1 - i ? i : CW - 1 - i; if (j < bd) bd = j; if (CH - 1 - j < bd) bd = CH - 1 - j; const lim = (bd / CH * 2 - 0.34) / fsc; if (lim < f) f = lim; }
    const k = j * CW + i, vt = v / S.top, ut = u / S.half;
    // the front heaps, and the thinner white behind the crown of each (upward and to lee of it only)
    let fd = 1;
    if (CUT && nf && sd < 0.05) for (let c = 0; c < nf; c += 4) { const dx = u - F[c], dy = v - F[c + 1]; fd = smin(fd, Math.sqrt(dx * dx + dy * dy) - F[c + 2], F[c + 3]); }
    // The thinner white lies on the lower and lee parts of the mass. Its far edge is a SHAPE: the silhouette
    // itself, moved away from the light - so every lobe and scallop of the crown keeps a cap of thick white,
    // wide on the sunny side and narrow to lee, and nothing thin reaches the top of a dome.
    // painted: where the white is laid thinner - two patches of unequal size, the larger low and to lee
    if (S.sh && !CUT) { const a = (ut - 0.22) / 0.42, b = (vt - 0.36) / 0.2, c = (ut + 0.42) / 0.2, d = (vt - 0.3) / 0.13; msk[k] = Math.min(1, Math.max(0, 1.6 - 1.6 * Math.sqrt(a * a + b * b), 1.6 - 1.6 * Math.sqrt(c * c + d * d))); }
    else if (S.sh && sd < 0.0) {
      const pu = u - 0.55 * S.sh[2], pv = v + 0.84 * S.sh[2];
      let s2 = 1e3;
      for (let c = 0; c < nm; c += 4) { const dx = pu - M[c], dy = pv - M[c + 1], q = Math.sqrt(dx * dx + dy * dy) - M[c + 2]; if (q < s2) s2 = q; }
      const reg = ((ut - S.sh[0]) * 0.7 + (S.sh[1] - vt)) / 0.16 + 0.5 + (lerp2(pg, fx, fy) - 0.5) * 3.0 + lerp2(sg, fx, fy) * 4.0;
      msk[k] = Math.min(1, Math.max(0, -s2 / 0.04)) * Math.min(1, Math.max(0, reg));
    }
    // how the edge is made changes along the outline: cut on the crown, wet and edgeless along the base
    // and at the lee end, and here and there a stretch that went soft for no reason but the hand
    let so = 0;
    if (!S.cut || kind === 'puff') { const sn = lerp2(sg, fx, fy); so = Math.max(1 - vt / 0.3, (ut - 0.5) / 0.5) + Math.max(0, sn - 0.12) * 2.2; so = Math.min(1, Math.max(S.softAll, scrap, so, 0)); }
    const o = ((oy * CH + j) * W + ox * CW + i) * 4;
    out[o] = f * fsc; out[o + 1] = Math.max(-1, -fd * fsc); // painted heaps: B = -(2 + height above the base line, cel units); a tuft off the lee end counts as standing above it
    const hb = Math.max((v - S.cut) * fsc, Math.min(0.3, Math.max(0, -tuft * 6)) - Math.max(0, (S.cut - v) * fsc * 0.5));
    out[o + 2] = kind === 'puff' && !CUT ? -3.9 : S.cut ? (CUT ? -(scrap ? 0.1 : Math.min(1, Math.max(0.01, (v - S.cut) / (S.top - S.cut)))) : -(2 + Math.max(-1.4, Math.min(1.9, hb)))) : so;
  };
  for (let j = 0; j < CH; j++) for (let i = 0; i < CW; i++) px(i, j);
  // the thinner white is laid with a soft brush: only its found edge (channel G) is cut
  const blur = (src, dst, n, st, r) => {       // running box blur along lines of length n with stride st
    for (let a = 0; a < N / n; a++) {
      const o = st === 1 ? a * n : a;
      let s = 0;
      for (let q = 0; q <= r; q++) s += src[o + Math.min(n - 1, q) * st];
      s += src[o] * r;
      for (let q = 0; q < n; q++) {
        dst[o + q * st] = s / (2 * r + 1);
        s += src[o + Math.min(n - 1, q + r + 1) * st] - src[o + Math.max(0, q - r) * st];
      }
    }
  };
  if (S.sh && CUT) for (let q = 0; q < 2; q++) { blur(msk, tmp, CW, 1, 3); blur(tmp, msk, CH, CW, 3); }
  for (let k = 0; k < N; k++) { const i = k % CW, j = (k - i) / CW; out[((oy * CH + j) * W + ox * CW + i) * 4 + 3] = msk[k]; }
}

export function bakeCelsRaw() {
  const W = CW * COLS, H = CH * ROWS;
  const f = new Float32Array(W * H * 4);
  CEL_NAMES.forEach((name, i) => bakeCel(f, W, i % COLS, Math.floor(i / COLS), CELS[name]));
  // guard: nothing may reach the border of its cell (it would be cut on a ruled line)
  CEL_NAMES.forEach((name, i) => {
    const ox = (i % COLS) * CW, oy = Math.floor(i / COLS) * CH;
    for (let j = 0; j < CH; j++) for (let k = 0; k < CW; k++) {
      if (j > 2 && j < CH - 3 && k > 2 && k < CW - 3) continue;
      if (f[((oy + j) * W + ox + k) * 4] > -0.02) { console.warn(`[sky] cel ${name} touches its cell border`); return; }
    }
  });
  return { f, W, H, CW, CH };
}
export function makeCloudCels() {
  const { f, W, H } = bakeCelsRaw();
  const d = new Uint16Array(f.length);
  for (let i = 0; i < f.length; i++) d[i] = THREE.DataUtils.toHalfFloat(f[i]);
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = t.minFilter = THREE.LinearFilter;     // a distance field: smooth, needs no mips
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------------------------- placement
// The art-directable part. Angles in degrees; az = atan2(z, x): 0 = east (+x), 90 = south (+z),
// -90 = north, 180 = west. The chapel as seen from the approach stands against az -90 .. -115: that
// sector is kept as plain wash (CALM). w = angular width of the CARD (the cloud fills about 3/4 of it).
// Optional: op, h (height scale), roll (deg), mirror, soft (softness floor), amp (edge noise scale),
// wide (edge width scale), drift (sway scale; the horizon family at half), calm: false (exempt from the calm sector).
export const CALM = { az: -104, inner: 34, outer: 62 };
// "One mass, one echo, one whisper", twice, and one mass high over the plain. Never more than one heap
// in a normal frame; long empty stretches (north, and the south-east) are part of the picture.
export const CLOUDS = [
  // east group
  { az: -12, el: 18, w: 38, cel: 'heapA' },
  { az: -33, el: 14, w: 8, cel: 'puffB', op: 0.85, amp: 0.8, wide: 1.6 },
  { az: 8, el: 5.6, w: 20, cel: 'flatA', op: 0.7, drift: 0.5 },
  // south-west group
  { az: 146, el: 19, w: 46, cel: 'heapE', roll: 7 },
  { az: 122, el: 7, w: 24, cel: 'rowA', op: 0.95, amp: 0.5, drift: 0.5, mirror: true },
  { az: 176, el: 5, w: 16, cel: 'flatB', op: 0.65, drift: 0.5 },
  // one mass high over the plain: above a level frame, found when the camera tilts up
  { az: 80, el: 36, w: 36, cel: 'heapG', roll: -2 },
];

const VS = /* glsl */`
in vec3 position;
in vec3 aCenter; in vec4 aSize; in vec4 aCell; in vec4 aLook; in vec3 aSoft;
uniform vec3 uCalm; uniform vec2 uDrift;
out vec2 vUv; out vec4 vLocal; out vec4 vK; out vec3 vDir; out vec4 vSoft;
void main(){
  // The layout is composed, so it must hold for hours: the clouds do not travel round the sky, they sway
  // a few degrees to and fro, very slowly. uTime is held at 12 fps: the cel slides in steps.
  float a = uDrift.x * sin(uTime * uDrift.y + 0.6) * aLook.z;
  float ca = cos(a), sa = sin(a);
  vec3 c = vec3(ca * aCenter.x - sa * aCenter.z, aCenter.y, sa * aCenter.x + ca * aCenter.z);
  // tangent frame at the cloud's centre; overhead the reference axis changes, so there is no pole
  vec3 ref = abs(c.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 r = normalize(cross(c, ref));
  vec3 u = cross(r, c);
  float cr = cos(aLook.x), sr = sin(aLook.x);
  vec2 l = position.xy * aSize.xy;                         // card plane, in radians of sky (tangent units)
  vec2 q = vec2(cr * l.x - sr * l.y, sr * l.x + cr * l.y);
  vDir = c + r * q.x + u * q.y;                            // gnomonic patch: exact with four corners
  vUv = aCell.xy + (position.xy * 0.5 + 0.5) * aCell.zw;
  // brush coordinates fixed to the cloud: xy for the broad noise (with the cloud's own offset), zw plain
  vLocal = vec4(l * 1.6 + aLook.w * vec2(0.37, 0.61), l);
  // The calm sector behind the chapel (at every elevation). A cloud in it thins and softens as a whole
  // and is dropped before anything is left to hang there.
  float az = degrees(atan(c.z, c.x));
  float dAz = abs(mod(az - uCalm.x + 180.0, 360.0) - 180.0);
  float calm = (1.0 - smoothstep(uCalm.y, uCalm.z, dAz)) * aSoft.z;
  vK = vec4(aSize.z, aSize.w, aLook.y, calm);
  vSoft = vec4(aSoft.xy, aLook.w, sign(aCell.z));          // .w: -1 when the cel is mirrored (lee to the card's left)
  vec4 p = projectionMatrix * viewMatrix * vec4(vDir * 3000.0 + uCamPos, 1.0);
  gl_Position = calm > 0.45 ? vec4(2.0, 2.0, 2.0, 1.0) : p.xyww;
}
`;
const FS_CUT = /* glsl */`
${CUT ? '#define CUT' : ''}
in vec2 vUv; in vec4 vLocal; in vec4 vK; in vec3 vDir; in vec4 vSoft;
uniform sampler2D uCels, uCloud; uniform float uCut;
void main(){
  vec4 k = texture(uCels, vUv);
  vec4 n1 = texture(uCloud, vLocal.xy);                    // broad: the wandering of the outline
  vec2 sd = vSoft.z * vec2(0.71, 0.23);
  // the dabs that shape the edges, fixed to the cloud. Cut: the brush's own dabs (polygons, like the leaves).
  // Painted: a round brush pressed on - lumps without corners, at any lens.
#ifdef CUT
  vec4 br = texture(uBrush, vLocal.zw * 3.4 + sd);
  float fine = texture(uBrush, vLocal.zw * 13.0 + sd).r - 0.5;
#else
  vec4 br = (texture(uCloud, vLocal.zw * 7.0 + sd).agbr - 0.5) * 2.0 + 0.5;
  float fine = (texture(uCloud, vLocal.zw * 26.0 + sd.yx).a - 0.5) * 2.0;
#endif
  // for the base: the same brush, larger (painted) or drawn out level (cut)
  vec4 bh = texture(uBrush, vLocal.zw * mix(vec2(1.7, 1.9), vec2(0.8, 6.0), uCut) + sd.yx);
  float S = vK.x;                                          // cel units per degree of sky
  float amp = vK.y, calm = vK.w;
  float e = normalize(vDir).y;
  float heapK = step(k.b, -0.004);                         // a heap or puff (B = -height) or a wet row / flat (B = softness)
  float vt = clamp(-k.b, 0.0, 1.0);                        // height above the base line, 0..1
  float fwDeg = length(vec2(dFdx(vLocal.z), dFdy(vLocal.z))) * 57.2958;    // one pixel, in degrees of sky
  float fw = fwDeg * S;                                                    // and in cel units
  float cutK = heapK * uCut;
  // how wet the edge is: a heap's crown is the firmest edge it has, its base and tatters the softest;
  // near the horizon nothing firm stands before the ranges
  float softH = (1.0 - smoothstep(0.03, 0.24, vt)) * (1.0 - uCut);
  float soft = clamp(max(max(mix(k.b, softH, heapK), vSoft.x), 0.6 * (1.0 - smoothstep(0.12, 0.17, e))) + calm * 1.5, 0.0, 1.0);
  // The dab. A quarter-degree dab is right for every lens but the long one, where it is larger than a leaf:
  // there a finer dab of the same brush (also fixed to the cloud) comes in under it.
  float tele = smoothstep(6.0, 16.0, 0.25 / fwDeg);
  float chew = ((br.r - 0.5) * 0.22 + (br.g - 0.5) * 0.13) * mix(1.0, 0.6, tele);
  chew += fine * mix(0.05, 0.07, uCut) * tele;
  // the underside is torn level: the dab drawn out sideways, twice as deep
  float baseK = heapK * (1.0 - smoothstep(0.05, mix(0.22, 0.14, uCut), vt));
  #ifdef CUT
  chew = mix(chew, (bh.r - 0.5) * 0.50 + (bh.g - 0.5) * 0.30, baseK) * S * amp;
#else
  chew = mix(chew, (br.g - 0.5) * 0.9 + (n1.a - 0.5) * 1.3, baseK) * S * amp;   // the base hangs in soft uneven lobes
#endif
  // (no crumbs of white in the sky and no holes in the body: the dab only works at the edge)
  float reach = 0.16 * mix(mix(1.5, 1.0, uCut), mix(3.6, 2.2, uCut), baseK) * S * amp;
  chew *= 1.0 - smoothstep(0.55 * reach, 1.2 * reach, abs(k.r));
  float wand = mix(mix(0.5, 0.85, heapK * (1.0 - uCut)), mix(1.6, 0.15, max(uCut, 1.0 - heapK)), max(baseK, smoothstep(0.3, 0.7, soft)));
  float d = k.r + (n1.r - 0.5) * wand * S * amp + chew * mix(1.0, 0.45, soft * (1.0 - heapK)) * mix(1.5, 1.0, max(uCut, 1.0 - heapK));
  // edge width. Painted (uCut 0): the crown is a round brush pressed on - it resolves over a few pixels, never
  // hard - and the base and the tatters feather away. Cut (uCut 1): one pixel all round, like the landscape.
  float wa = S * amp * vSoft.y;
  float wCrown = mix(clamp((0.10 + 0.5 * n1.g * n1.g) * wa, 3.0 * fw, 9.0 * fw), 1.3 * fw, max(cutK, 1.0 - heapK));
  float w = mix(wCrown, clamp(mix(2.2, 1.3, heapK) * wa, 10.0 * fw, mix(45.0, 30.0, heapK) * fw), soft * soft) * (1.0 + 3.0 * calm);
  float cover = smoothstep(-w, w, d - w * 0.6 * soft * heapK);       // (the feather grows inward: the base does not swell)
  cover *= 1.0 - smoothstep(0.4, 0.9, soft) * mix(smoothstep(0.42, 0.66, bh.b * 0.6 + bh.r * 0.4) * 0.24, smoothstep(0.40, 0.75, bh.a * 0.55 + br.a * 0.45) * 0.30, heapK);
  // One white, laid thick and laid thinner. The thinner white lies on the lower and lee parts.
  float pass = k.a + (n1.a - 0.5) * 0.22 + (br.g - 0.5) * 0.16 - 0.20;
  float found = smoothstep(-fw, fw, k.g + chew * 0.7);
  float shadeCut = (1.0 - found) * smoothstep(-0.02, 0.02, pass);              // cut: flat, a shape with a found edge
  float shadeWet = smoothstep(-0.22, 0.34, pass + (br.a - 0.5) * 0.25);      // painted: a broad soft passage
  float tone = mix(0.89, mix(0.72, 0.76, uCut), mix(shadeWet, shadeCut, uCut) * heapK);
  // cut: toward the base the softness is one of VALUE: thin, then thinner, each on a torn level boundary, with
  // a few dry streaks of sky. Painted: the white simply thins toward the base.
  float vb = vt + (bh.g - 0.5) * 0.09 + (bh.r - 0.5) * 0.06 + (n1.g - 0.5) * 0.14;
  float ew = 1.5 * fw;
  tone = mix(tone, min(tone, 0.76), cutK * (1.0 - smoothstep(0.17 - ew, 0.17 + ew, vb)));
  tone = mix(tone, 0.60, cutK * (1.0 - smoothstep(0.06 - ew, 0.06 + ew, vb)));
  float streak = smoothstep(0.76, 0.80, bh.b * 0.7 + bh.a * 0.3) * cutK * (1.0 - smoothstep(0.13, 0.17, vb));
  cover *= 1.0 - 0.35 * streak;
  tone = mix(tone, min(tone, 0.64), heapK * (1.0 - uCut) * (1.0 - smoothstep(0.02, 0.34, vb)));
  // poster colour: the body is not perfectly even (dab-sized, soft)
  tone *= 1.0 + (n1.g - 0.5) * 0.03 + ((br.a - 0.5) * 0.06 + (bh.a - 0.5) * 0.05) * (1.0 - uCut);
  float alpha = cover * tone * vK.z * smoothstep(0.03, 0.14, e) * (1.0 - smoothstep(0.0, 0.45, calm));
  if (alpha < 0.004) discard;
  vec3 col = mix(vec3(0.955, 0.985, 0.990), vec3(0.915, 0.965, 0.982), smoothstep(0.88, 0.76, tone));
  oColor  = vec4(col * alpha, alpha);                      // premultiplied; the blend leaves the sky's alpha
  oNormal = vec4(0.0);                                     // and its normal / aux untouched
  oAux    = vec4(0.0);
}
`;

// PAINTED (the default). The cloud is soft because round dabs overlap, not because a contour was blurred: the
// outline is pushed in and out by two sizes of dab fixed to the cloud, its softness changes along it from fairly
// firm to lost, the body is mottled by the same dabs, and the base is not an outline at all - the paint runs
// out along the base line in tufts that lean to lee.
const FS_PAINT = /* glsl */`
in vec2 vUv; in vec4 vLocal; in vec4 vK; in vec3 vDir; in vec4 vSoft;
uniform sampler2D uCels, uCloud; uniform float uCut;
void main(){
  vec4 k = texture(uCels, vUv);
  vec4 n1 = texture(uCloud, vLocal.xy);                    // broad: R 12, G 6, A 2.2 degrees per cycle
  vec2 sd = vSoft.z * vec2(0.71, 0.23);
  vec4 da = texture(uCloud, vLocal.zw * 7.0 + sd);         // the large dab: G 1.4, A 0.5 degrees per cycle
  vec4 db = texture(uCloud, vLocal.zw * 12.0 + sd.yx);     // the small dab: G 0.8, A 0.3
  float S = vK.x;                                          // cel units per degree of sky
  float amp = vK.y, calm = vK.w;
  float e = normalize(vDir).y;
  float heapK = step(k.b, -0.5);                           // a heap (B = -(2 + height)) or a wet kind (B = softness)
  float h = (-k.b - 2.0) / S;                              // degrees above the base line
  float fwDeg = length(vec2(dFdx(vLocal.z), dFdy(vLocal.z))) * 57.2958;    // one pixel, in degrees of sky
  float fw = fwDeg * S;
  float dab05 = da.g * 0.75 + da.a * 0.25, dab15 = db.a * 0.5 + db.g * 0.5;
  float soft = clamp(max(max(k.b * (1.0 - heapK), vSoft.x), 0.6 * (1.0 - smoothstep(0.12, 0.17, e))) + calm * 1.5, 0.0, 1.0);
  float tele = smoothstep(6.0, 16.0, 0.25 / fwDeg);
  // the outline, moved by the dabs (degrees): half a degree wide by a quarter, 0.15 wide by 0.08
  float chewH = (dab05 - 0.5) * 1.15 + (dab15 - 0.5) * 0.22;
  float chewW = ((da.a - 0.5) * 0.44 + (da.g - 0.5) * 0.26) * mix(1.0, 0.6, tele) + (db.a - 0.5) * 0.10 * tele;
  chewW *= (1.0 - smoothstep(0.13, 0.29, abs(k.r) / (S * amp))) * mix(1.0, 0.45, soft);
  float wand = mix(mix(0.5, 0.15, smoothstep(0.3, 0.7, soft)), 0.6, heapK);
  float d = k.r + ((n1.r - 0.5) * wand + mix(chewW, chewH, heapK)) * S * amp;
  // edge width: a round brush pressed on. On a heap it resolves over a few pixels where the hand was firm and
  // is lost altogether a little further along; the pixel bounds keep the long lens from turning it to fog.
  float wa = S * amp * vSoft.y;
  float firm = smoothstep(0.36, 0.62, n1.g * 0.6 + da.r * 0.4);
  float lost = smoothstep(0.50, 0.70, n1.a * 0.6 + n1.r * 0.4);
  float wHeap = clamp(0.24 * wa, 3.0 * fw, 12.0 * fw) * mix(1.0, 2.5, firm) * (1.0 + 2.5 * lost);
  float wWet = clamp(2.2 * wa, 10.0 * fw, 45.0 * fw);
  float w = mix(mix(1.3 * fw, wHeap, heapK), mix(wWet, clamp(1.3 * wa, 10.0 * fw, 30.0 * fw), heapK), soft * soft) * (1.0 + 3.0 * calm);
  float cover = smoothstep(-w, w, d - w * 0.45 * heapK);      // (the soft edge grows inward: the cloud does not swell)
  cover *= 1.0 - (1.0 - heapK) * smoothstep(0.4, 0.9, soft) * smoothstep(0.42, 0.66, db.g * 0.6 + da.r * 0.4) * 0.24;
  // The base. Not an edge of the silhouette: the white runs out over the lowest degree or two, sooner here and
  // later there (noise read in sheared coordinates, so what hangs below leans to lee), and frays into dabs.
  // (the lean and the length of what hangs change along the base: it is not combed)
  float hr = clamp(h, -4.0, 6.0) * 0.01745;
  vec2 q = vec2(vLocal.z * vSoft.w + mix(0.3, 0.9, smoothstep(0.3, 0.7, n1.g)) * hr, vLocal.w + hr * (0.6 / mix(0.5, 1.5, smoothstep(0.3, 0.7, n1.r)) - 1.0));
  vec4 ds = texture(uCloud, q * 5.5 + sd);                 // G about 1 degree across the lean, 2 along it
  float ero = ((ds.g - 0.5) * 1.1 + (ds.a - 0.5) * 0.6 + (n1.g - 0.5) * 0.6 + 0.25) * amp;
  float bt = clamp((h - ero) / (mix(1.4, 2.4, ds.r) * amp), 0.0, 1.0);
  float fray = dab05 * 0.65 + dab15 * 0.05 + ds.a * 0.3;
  float baseA = bt * bt * (3.0 - 2.0 * bt) * mix(smoothstep(0.10, 0.82, fray + (bt - 0.45) * 0.9), 1.0, bt * bt);
  cover *= mix(1.0, baseA, heapK);
  // One white, laid thick, and thinner in a few irregular patches (more of them low and to lee, none near the
  // crown), and never quite even: every dab shows a little.
  float inner = smoothstep(0.9, 2.6, k.r / S);
  float thin = smoothstep(0.05, 0.80, k.a + (n1.a - 0.5) * 0.9 + (da.g - 0.5) * 0.6 + (n1.g - 0.5) * 0.5) * inner * heapK;
  float tone = mix(0.89, mix(0.78, 0.60, thin), heapK);
  tone *= 1.0 + mix((n1.g - 0.5) * 0.03 + (da.r - 0.5) * 0.12 + (db.g - 0.5) * 0.05, (dab05 - 0.5) * 0.18 + (dab15 - 0.5) * 0.04, heapK);
  float alpha = cover * tone * vK.z * smoothstep(0.03, 0.14, e) * (1.0 - smoothstep(0.0, 0.45, calm));
  if (alpha < 0.004) discard;
  vec3 col = mix(vec3(0.950, 0.995, 0.992), vec3(0.910, 0.975, 0.984), smoothstep(0.80, 0.62, tone));
  if (uEve > 0.0){
    // evening: the thick white takes the low sun (peach on the sun's side of the sky, rose away from it),
    // the thinner white is the violet of the cloud's own shade
    float toSun = smoothstep(-0.5, 0.8, dot(normalize(vDir.xz + 1e-5), normalize(uSunDir.xz)));
    vec3 thick = mix(vec3(0.930, 0.740, 0.735), vec3(1.000, 0.870, 0.720), toSun);
    vec3 thinC = mix(vec3(0.700, 0.645, 0.810), vec3(0.800, 0.690, 0.790), toSun);
    col = mix(col, mix(thick, thinC, smoothstep(0.80, 0.62, tone)), uEve);
  }
  oColor  = vec4(col * alpha, alpha);                      // premultiplied; the blend leaves the sky's alpha
  oNormal = vec4(0.0);                                     // and its normal / aux untouched
  oAux    = vec4(0.0);
}
`;
const FS = CUT ? FS_CUT : FS_PAINT;

const D = Math.PI / 180;
function fill(g, list, sunDir) {
  const n = list.length;
  const aCenter = new Float32Array(n * 3), aSize = new Float32Array(n * 4), aCell = new Float32Array(n * 4), aLook = new Float32Array(n * 4);
  const aSoft = new Float32Array(list.flatMap((c) => [c.soft ?? 0, c.wide ?? 1, c.calm === false ? 0 : 1]));
  list.forEach((c, i) => {
    const az = c.az * D, el = c.el * D;
    const dir = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
    aCenter.set(dir, i * 3);
    const hx = Math.tan(c.w * 0.5 * D), hy = hx * (c.h ?? 1) / AX;
    const halfDeg = Math.atan(hy) / D;
    aSize.set([hx, hy, 1 / halfDeg, c.amp ?? Math.min(1, Math.max(0.45, halfDeg / 8))], i * 4);
    // the cel's dense side (drawn on its left) faces the sun: mirror when the sun stands to the card's right
    const right = [-dir[2], 0, dir[0]];      // +x of the card (see the vertex shader's frame)
    const mirror = c.mirror ?? (right[0] * sunDir.x + right[2] * sunDir.z > 0);
    const ci = CEL_INDEX[c.cel], cx = ci % COLS, cy = Math.floor(ci / COLS);
    const u0 = cx / COLS, du = 1 / COLS;
    aCell.set(mirror ? [u0 + du, cy / ROWS, -du, 1 / ROWS] : [u0, cy / ROWS, du, 1 / ROWS], i * 4);
    aLook.set([(c.roll ?? 0) * D, c.op ?? 1, c.drift ?? 1, i * 1.7 + 0.3], i * 4);
  });
  g.setAttribute('aCenter', new THREE.InstancedBufferAttribute(aCenter, 3));
  g.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 4));
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 4));
  g.setAttribute('aLook', new THREE.InstancedBufferAttribute(aLook, 4));
  g.setAttribute('aSoft', new THREE.InstancedBufferAttribute(aSoft, 3));
  g.instanceCount = n;
}

export function buildCloudCards(scene, cloudTex, cels, sunDir, list = CLOUDS) {
  const mk = (l) => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    fill(g, l, sunDir);
    return g;
  };
  const m = mat({
    vs: VS, fs: FS, side: THREE.DoubleSide, hour: false,
    uniforms: {
      uCels: { value: cels }, uCloud: { value: cloudTex },
      // 0 = painted (soft dabbed edges, as in the reference still); 1 = cut like the landscape. ?cloudcut=1 to compare.
      uCut: { value: CUT ? 1 : 0 },
      uCalm: { value: new THREE.Vector3(CALM.az, CALM.inner, CALM.outer) },
      uDrift: { value: new THREE.Vector2(5 * D, 0.0022) },   // sway: +-5 degrees, period 48 minutes (0.011 deg/s at most)
    },
    extra: {
      depthWrite: false, depthTest: true, transparent: true,
      // one blend state serves all three targets: colour is laid over premultiplied, and because normal and
      // aux are written as zero with zero alpha they (and the colour target's alpha) keep the sky's values
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    },
  });
  const mesh = new THREE.Mesh(mk(list), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 11;
  // review hook (tools/celsheet.mjs): replace the placement list at run time
  mesh.userData.setClouds = (l) => { mesh.geometry.dispose(); mesh.geometry = mk(l); };
  mesh.userData.celNames = CEL_NAMES;
  mesh.userData.list = list;
  scene.add(mesh);
  return mesh;
}
