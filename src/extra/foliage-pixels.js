// The pixels of the foliage atlas of src/extra/tree.js (no dependency on the page or on THREE: src/paint.worker.js
// paints it in a worker thread; tree.js makes the texture and the cell boxes of the result).
import { rng } from '../rng.js';

const gauss = (R) => (R() + R() + R() + R() - 2) * 1.732;
const logn = (R, sigma, lo, hi) => Math.min(hi, Math.max(lo, Math.exp(gauss(R) * sigma)));

// ------------------------------------------------------------------ leaf atlas
// 4x4 cells. R = per-leaf tone, G = leaf centre y in the cell, B = leaf centre x, A = coverage.
// row 0: closed base masses with a fringe of small leaves, row 1: dense sprays, row 2: loose sprays, row 3: a few floating leaves.
const ATLAS_N = 4;
export function foliagePixels(cell = 256) {
  const size = cell * ATLAS_N;
  const d = new Uint8Array(size * size * 4);
  const U = [-0.5, -0.38, -0.2, 0.0, 0.2, 0.37, 0.5], W = [0.22, 0.66, 0.95, 1.0, 0.8, 0.45, 0.0];
  const put = (cx0, cy0, x, y, ang, len, wid, tone, R) => {
    // a pointed leaf: blunt base, widest before the middle, sharp tip, a little bent and lopsided
    const bend = (R() - 0.5) * 0.7, lop = 0.8 + R() * 0.4;
    const pts = [];
    for (let i = 0; i < U.length; i++) pts.push([U[i], bend * (U[i] * U[i] - 0.25) + W[i] * lop * (0.88 + R() * 0.24)]);
    for (let i = U.length - 2; i >= 0; i--) pts.push([U[i], bend * (U[i] * U[i] - 0.25) - W[i] * (2 - lop) * (0.88 + R() * 0.24)]);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = pts.map(([u, v]) => [x + (u * len) * ca - (v * wid) * sa, y + (u * len) * sa + (v * wid) * ca]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const m = 3;
    x0 = Math.max(m, Math.floor(x0)); x1 = Math.min(cell - 1 - m, Math.ceil(x1));
    y0 = Math.max(m, Math.floor(y0)); y1 = Math.min(cell - 1 - m, Math.ceil(y1));
    const g = Math.floor(y / cell * 255), b = Math.floor(x / cell * 255);
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
        if ((yi > py + 0.5) !== (yj > py + 0.5) && px + 0.5 < ((xj - xi) * (py + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) continue;
      const o = ((cy0 + py) * size + cx0 + px) * 4;
      d[o] = tone; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
  };
  for (let v = 0; v < ATLAS_N * ATLAS_N; v++) {
    const R = rng(7100 + v * 37);
    const cx0 = (v % ATLAS_N) * cell, cy0 = Math.floor(v / ATLAS_N) * cell;
    const row = Math.floor(v / ATLAS_N);
    const n = row === 0 ? 200 + Math.floor(R() * 30) : row === 1 ? 26 + Math.floor(R() * 12) : row === 2 ? 10 + Math.floor(R() * 7) : 2 + Math.floor(R() * 4);
    // a few sub-blobs so no card is a disc
    const blobs = [];
    const nb = row === 3 ? 2 : 3;
    for (let i = 0; i < nb; i++) {
      const a = R() * 6.283, rr = (row === 0 ? 0.13 : row === 1 ? 0.15 : 0.2) * cell * (0.4 + R());
      blobs.push([cell / 2 + Math.cos(a) * rr, cell / 2 + Math.sin(a) * rr * 0.7, cell * (row === 0 ? 0.24 + R() * 0.07 : row === 1 ? 0.16 + R() * 0.1 : 0.14 + R() * 0.1)]);
    }
    if (row === 0) {
      // the base masses: a closed shape (the union of the sub-blobs) fringed all round with small leaves
      const tone = 110 + Math.floor(R() * 30);
      for (let py = 0; py < cell; py++) for (let px = 0; px < cell; px++) {
        let inside = false;
        for (const bl of blobs) if (Math.hypot(px - bl[0], (py - bl[1]) / 0.85) < bl[2] * 0.86) { inside = true; break; }
        if (!inside) continue;
        const o = ((cy0 + py) * size + cx0 + px) * 4;
        d[o] = tone; d[o + 1] = 128; d[o + 2] = 128; d[o + 3] = 255;
      }
      // sky holes: a few ragged gaps in two or three loose groups (each a couple of overlapping slanted ovals),
      // leaf-sized to hand-sized. The leaf marks painted next partly overlap them. Under minification they
      // close by themselves, so a crown seen from afar keeps its closed base.
      const ng = 3 + Math.floor(R() * 3);
      for (let gI = 0; gI < ng; gI++) {
        const bl = blobs[Math.floor(R() * nb)], ga = R() * 6.283, gr = Math.sqrt(R()) * bl[2] * 0.62;
        const gx = bl[0] + Math.cos(ga) * gr, gy = bl[1] + Math.sin(ga) * gr * 0.85;
        const nh = 2 + Math.floor(R() * 4);
        for (let hI = 0; hI < nh; hI++) {
          const hx = gx + (R() - 0.5) * cell * 0.16, hy = gy + (R() - 0.5) * cell * 0.16;
          const ra = cell * (0.02 + R() * R() * 0.06), rb = ra * (0.35 + R() * 0.5), rot = R() * 3.1416, cr = Math.cos(rot), sr = Math.sin(rot);
          const m = Math.ceil(ra) + 1;
          for (let py = Math.max(0, Math.floor(hy - m)); py <= Math.min(cell - 1, hy + m); py++) for (let px = Math.max(0, Math.floor(hx - m)); px <= Math.min(cell - 1, hx + m); px++) {
            const u = (px - hx) * cr + (py - hy) * sr, v = -(px - hx) * sr + (py - hy) * cr;
            if ((u * u) / (ra * ra) + (v * v) / (rb * rb) < 1) d[((cy0 + py) * size + cx0 + px) * 4 + 3] = 0;
          }
        }
      }
    }
    // TWIGS: a spray hangs on a thin dark stem that forks out to its leaf groups (drawn first: the leaves overlap
    // it, and it shows between them and where it leaves the spray). Tone 0..2 marks a twig texel (leaves start
    // at 3). Own random stream: the leaves are where they were.
    if (row === 1 || row === 2) {
      const Q = rng(9300 + v * 53);
      const a0 = Math.PI * 0.5 + (Q() - 0.5) * 1.6, L0 = cell * 0.24;
      const bx0 = cell / 2 + Math.cos(a0) * L0, by0 = cell / 2 + Math.sin(a0) * L0;
      const segs = [];
      // (the stem to the group nearest the cell's middle, a kink on the way; side twigs to the other groups)
      const hub = [cell / 2 + (Q() - 0.5) * cell * 0.12, cell / 2 + (Q() - 0.5) * cell * 0.12];
      const kx = (bx0 + hub[0]) / 2 + (Q() - 0.5) * cell * 0.08, ky = (by0 + hub[1]) / 2 + (Q() - 0.5) * cell * 0.08;
      segs.push([bx0, by0, kx, ky, 0.013, 0.011], [kx, ky, hub[0], hub[1], 0.011, 0.009]);
      for (const bl of blobs) {
        const ex = bl[0] + (bl[0] - hub[0]) * 0.35 + (Q() - 0.5) * cell * 0.05, ey = bl[1] + (bl[1] - hub[1]) * 0.35 + (Q() - 0.5) * cell * 0.05;
        const mx = (hub[0] + ex) / 2 + (Q() - 0.5) * cell * 0.05, my = (hub[1] + ey) / 2 + (Q() - 0.5) * cell * 0.05;
        segs.push([hub[0], hub[1], mx, my, 0.009, 0.006], [mx, my, ex, ey, 0.006, 0.003]);
      }
      for (const [x0, y0, x1, y1, w0, w1] of segs) {
        const lx = x1 - x0, ly = y1 - y0, ll = lx * lx + ly * ly || 1, m = cell * 0.02;
        for (let py = Math.max(3, Math.floor(Math.min(y0, y1) - m)); py <= Math.min(cell - 4, Math.ceil(Math.max(y0, y1) + m)); py++)
          for (let px = Math.max(3, Math.floor(Math.min(x0, x1) - m)); px <= Math.min(cell - 4, Math.ceil(Math.max(x0, x1) + m)); px++) {
            const tt = Math.max(0, Math.min(1, ((px + 0.5 - x0) * lx + (py + 0.5 - y0) * ly) / ll));
            const dd = Math.hypot(px + 0.5 - x0 - lx * tt, py + 0.5 - y0 - ly * tt), hw = Math.max(0.75, cell * (w0 + (w1 - w0) * tt) * 0.5);
            if (dd > hw) continue;
            const o = ((cy0 + py) * size + cx0 + px) * 4;
            d[o] = 1; d[o + 1] = 128; d[o + 2] = 128; d[o + 3] = 255;
          }
      }
    }
    for (let i = 0; i < n; i++) {
      const bl = blobs[Math.floor(R() * nb)];
      // (base masses: most leaves on the rim, the rest scattered inside as marks)
      const a = R() * 6.283, rr = (row === 0 ? (i % 3 ? 0.72 + R() * 0.42 : Math.sqrt(R()) * 0.8) : Math.pow(R(), 0.6)) * bl[2];
      let x = bl[0] + Math.cos(a) * rr, y = bl[1] + Math.sin(a) * rr * 0.8;
      // leaf marks differ about 3:1 in length inside one card as well
      const len = cell * (row === 0 ? 0.064 : 0.115) * logn(R, 0.36, 0.55, 1.75);
      const wid = len * (row === 0 ? 0.24 + R() * 0.1 : 0.19 + R() * 0.1);
      const lim = cell * 0.5 - len * 0.6 - 4;
      const dx = x - cell / 2, dy = y - cell / 2, dl = Math.hypot(dx, dy);
      if (dl > lim) { x = cell / 2 + dx / dl * lim; y = cell / 2 + dy / dl * lim; }
      // leaves fan outward from the blob and hang a little
      const ang = a + (R() - 0.5) * 2.2 - 0.25 * Math.sign(Math.cos(a));
      put(cx0, cy0, x, y, ang, len, wid, Math.max(3, Math.floor(R() * 256)), R);
    }
  }
  // the box each cell's leaves actually fill (in cell units, with a 3-texel margin): the cards are cut
  // down to it, so the empty border of a cell is never rasterised
  const boxes = [];
  for (let v = 0; v < ATLAS_N * ATLAS_N; v++) {
    const cx0 = (v % ATLAS_N) * cell, cy0 = Math.floor(v / ATLAS_N) * cell;
    let x0 = cell, x1 = 0, y0 = cell, y1 = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (d[((cy0 + y) * size + cx0 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    boxes.push([Math.max(0, x0 - 3) / cell, Math.max(0, y0 - 3) / cell, Math.min(cell, x1 + 4) / cell, Math.min(cell, y1 + 4) / cell]);
  }
  // bleed leaf data into the empty texels around leaves so filtering never mixes in zeros
  let filled = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) filled[i] = d[i * 4 + 3] ? 1 : 0;
  for (let it = 0; it < 6; it++) {
    const nf = filled.slice();
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      if (filled[i]) continue;
      const nb = filled[i - 1] ? i - 1 : filled[i + 1] ? i + 1 : filled[i - size] ? i - size : filled[i + size] ? i + size : -1;
      if (nb < 0) continue;
      d[i * 4] = d[nb * 4]; d[i * 4 + 1] = d[nb * 4 + 1]; d[i * 4 + 2] = d[nb * 4 + 2];
      nf[i] = 1;
    }
    filled = nf;
  }
  return { d, size, boxes };
}
