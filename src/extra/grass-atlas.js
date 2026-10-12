// Tuft atlas for src/extra/grass.js (4 x 7 cells: ten silhouettes seen from the side, eight from above).
// R = tone of the stroke (dark base / mid / light), A = mask. Tone is dilated past the mask so
// filtering never drags a dark rim around light strokes.
//
// Strokes are broad and blunt on purpose: a blade is 2.5-5 cm wide in the world whatever the size
// of the tuft (so small tufts are a few fat dabs, tall ones have more, thinner blades) and ends in
// a rounded tip about half its width. Nothing in the foreground band is thinner than ~3 px at
// 720p, which is what keeps the paint filter from turning blade edges into crawling stair-steps.
// (No dependency on the page or on THREE: src/paint.worker.js paints it in a worker thread; src/extra/grass.js
// makes the texture and the cell boxes of the result.)
import { rng } from '../rng.js';

export const COLS = 4, ROWS = 7;
// the last two rows hold the tufts as seen from ABOVE (kinds 10-17): low clumps lying on the ground.
// None is a rosette: one to three sub-clumps with roots off the centre of the cell, each sweeping
// its strokes to one side over a part of the circle, overlapping its neighbour.
//   10-11 a few fat dabs   12-14 medium   15 broad leaves   16-17 dense
export const TOP_ROW = 5;
// kinds:  small (0.14-0.25 m)   0 fan of dabs            1 low wide mound
//         medium (0.25-0.47 m)  2 upright fan            3 swept to one side      4 wedge (tall on one side)
//                               5 broad-leaf rosette (under flowers)
//         large (0.47-1 m)      6 tall dense clump       7 a few long arching blades
//                               8 long blades with seed heads                     9 leafy weed
const KIND = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 13, 14, 15, 16, 17];
export const CELLS = Array.from({ length: 10 }, (_, k) => KIND.map((v, i) => (v === k ? i : -1)).filter((i) => i >= 0));

export function tuftPixels(cell = 256) {
  const W = cell * COLS, H = cell * ROWS;
  const mk = () => {
    if (typeof document === 'undefined') return new OffscreenCanvas(W, H);
    const c = document.createElement('canvas'); c.width = W; c.height = H; return c;
  };
  const cm = mk(), ct = mk();
  const m = cm.getContext('2d', { willReadFrequently: true }), t = ct.getContext('2d', { willReadFrequently: true });
  m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
  t.fillStyle = '#808080'; t.fillRect(0, 0, W, H);
  const TONE = [30, 128, 226];
  const fillBoth = (path, tone, grow) => {
    const g = TONE[tone];
    for (const ctx of [m, t]) {
      path(ctx);
      ctx.fillStyle = ctx === m ? '#fff' : `rgb(${g},${g},${g})`;
      ctx.fill();
      if (ctx === t) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = grow; ctx.lineJoin = 'round'; ctx.stroke(); }
    }
  };
  const dab = (x, y, rx, ry, ang, tone) => fillBoth((ctx) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, ang, 0, Math.PI * 2); }, tone, 4);
  // one brush stroke: fat near the root, tapering to a blunt rounded tip (about half the width),
  // curved, optionally kinked (a bent blade). w0 is the half width. Returns the centre line.
  // WK: blades are 0.6 of the old ribbon width and run out to a point (a tapered brush stroke)
  const WK = 0.6;
  const stroke = (bx, by, ang, len, w0, curl, tone, R, kink = 0, leaf = 0) => {
    const n = 10, L = [], Rr = [], C = [];
    let x = bx, y = by, a = ang, wEnd = w0;
    const ki = 4 + Math.floor(R() * 4);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const dx = Math.sin(a), dy = -Math.cos(a);
      let w = Math.max(w0 * WK, Math.min(w0, 0.019 * cell)) * (0.55 + 0.45 * Math.min(1, u * 3)) * Math.max(0.10, 1 - Math.pow(u, 1.6) * 0.93) * (0.92 + R() * 0.16);
      if (leaf) w = w0 * (0.30 + 0.70 * Math.sin(Math.PI * Math.pow(u, 0.75))) * (0.9 + R() * 0.2);
      L.push([x - dy * w, y + dx * w]); Rr.push([x + dy * w, y - dx * w]); C.push([x, y, a]);
      wEnd = w;
      if (i < n) { x += (dx * len) / n; y += (dy * len) / n; a += (2 * curl) / n + (i === ki ? kink : 0); }
    }
    fillBoth((ctx) => {
      ctx.beginPath();
      ctx.moveTo(L[0][0], L[0][1]);
      for (let i = 1; i <= n; i++) ctx.lineTo(L[i][0], L[i][1]);
      for (let i = n; i >= 0; i--) ctx.lineTo(Rr[i][0], Rr[i][1]);
      ctx.closePath();
    }, tone, 7);
    return C;
  };

  for (let v = 0; v < COLS * ROWS; v++) {
    const R = rng(4100 + v * 77);
    const kind = KIND[v];
    const cx0 = (v % COLS) * cell, cy0 = Math.floor(v / COLS) * cell;
    const ox = cx0 + cell / 2, oy = cy0 + cell - 3;
    for (const ctx of [m, t]) { ctx.save(); ctx.beginPath(); ctx.rect(cx0 + 3, cy0 + 3, cell - 6, cell - 6); ctx.clip(); }
    if (kind >= 10) {
      const tk = kind - 10, mx = cx0 + cell / 2, my = cy0 + cell / 2;
      // n: strokes per tone (dark, mid, light); l: length; w: half width; c: sub-clumps; span: how much
      // of the circle one clump sweeps (rad); leaf: share of leaf-shaped strokes
      const P = [
        { n: [2, 5, 2], l: [0.24, 0.38], w: [0.052, 0.068], c: 1, span: 2.4, leaf: 0.25 },
        { n: [2, 6, 2], l: [0.20, 0.34], w: [0.050, 0.064], c: 2, span: 1.9, leaf: 0.3 },
        { n: [3, 8, 3], l: [0.24, 0.40], w: [0.040, 0.054], c: 2, span: 3.0, leaf: 0.15 },
        { n: [3, 9, 4], l: [0.24, 0.40], w: [0.038, 0.052], c: 3, span: 2.1, leaf: 0.15 },
        { n: [4, 10, 4], l: [0.26, 0.44], w: [0.034, 0.048], c: 2, span: 3.9, leaf: 0.1 },
        { n: [3, 7, 4], l: [0.24, 0.40], w: [0.050, 0.066], c: 2, span: 2.7, leaf: 1 },
        { n: [5, 14, 5], l: [0.26, 0.44], w: [0.030, 0.042], c: 3, span: 3.2, leaf: 0.1 },
        { n: [5, 12, 6], l: [0.28, 0.46], w: [0.032, 0.044], c: 2, span: 4.6, leaf: 0.1 },
      ][tk];
      const sweep = R() * 6.283;                                   // the whole tuft lies over this way
      const clumps = [];
      for (let c = 0; c < P.c; c++) {
        const a = sweep + Math.PI + (R() - 0.5) * (c === 0 ? 1.0 : 3.4), d = (c === 0 ? 0.05 + R() * 0.05 : 0.09 + R() * 0.10) * cell;
        clumps.push({ x: mx + Math.sin(a) * d, y: my - Math.cos(a) * d, head: sweep + (c === 0 ? 0 : (R() - 0.5) * 1.8), span: P.span * (0.7 + R() * 0.5),
          k: c === 0 ? 1 : 0.55 + R() * 0.35, curl: (R() < 0.5 ? -1 : 1) * (0.15 + R() * 0.5) });
      }
      for (let tone = 0; tone < 3; tone++) {
        const n = P.n[tone];
        for (let i = 0; i < n; i++) {
          const cl = clumps[R() < 0.5 ? 0 : Math.floor(R() * clumps.length)];
          const dev = (R() + R() - 1) * 0.5 * cl.span;            // most strokes near the heading, a few splayed wide
          const a = cl.head + dev;
          let len = (P.l[0] + R() * (P.l[1] - P.l[0])) * cell * (tone === 0 ? 0.75 : tone === 2 ? 0.8 : 1) * cl.k * (1 - 0.45 * Math.abs(dev) / (0.5 * cl.span)) * (0.7 + 0.3 * Math.sqrt(R()));
          // (keep the tip inside the cell)
          const sx = Math.sin(a), sy = -Math.cos(a);
          const room = Math.min(sx > 0 ? (cx0 + cell - 10 - cl.x) / sx : sx < 0 ? (cx0 + 10 - cl.x) / sx : 1e9, sy > 0 ? (cy0 + cell - 10 - cl.y) / sy : sy < 0 ? (cy0 + 10 - cl.y) / sy : 1e9);
          len = Math.min(len, room * 0.86);
          const r0 = R() * 0.03 * cell;
          const wd = (P.w[0] + R() * (P.w[1] - P.w[0])) * cell * (P.leaf >= 1 ? 1 : 0.85);
          stroke(cl.x + sx * r0 + (R() - 0.5) * 0.03 * cell, cl.y + sy * r0 + (R() - 0.5) * 0.03 * cell, a + (R() - 0.5) * 0.25, len, wd,
            cl.curl * (0.5 + R()) + (R() - 0.5) * 0.3, tone, R, R() < 0.2 ? (R() - 0.5) * 0.8 : 0, R() < P.leaf ? 1 : 0);
        }
      }
      for (const ctx of [m, t]) ctx.restore();
      continue;
    }
    const spread = [0.34, 0.58, 0.34, 0.30, 0.40, 0.34, 0.36, 0.26, 0.26, 0.30][kind] * cell;
    const list = [];
    let lean = (R() - 0.5) * 0.4;
    const dirn = R() < 0.5 ? -1 : 1;
    if (kind === 3) lean = dirn * (0.45 + R() * 0.25);
    // blades fan out from the root; some lean back across their neighbours, some are bent
    // hf(u): height factor across the tuft (wedges), wLo/wHi: half widths as a fraction of the cell
    const add = (n, hLo, hHi, wLo, wHi, fan, tonePick, cross = 0.25, bent = 0.2, hf = () => 1) => {
      for (let i = 0; i < n; i++) {
        const u = (i + 0.2 + R() * 0.6) / n - 0.5;
        const crossing = R() < cross ? -(0.6 + R() * 0.9) : 1;
        list.push({
          x: ox + u * spread + (R() - 0.5) * 6, h: (hLo + R() * (hHi - hLo)) * cell * hf(u),
          w: (wLo + R() * (wHi - wLo)) * cell, ang: lean + u * fan * crossing + (R() - 0.5) * 0.3,
          curl: (R() - 0.5) * 0.5 + lean * 0.5, tone: tonePick(R()),
          kink: R() < bent ? (R() < 0.5 ? -1 : 1) * (0.3 + R() * 0.4) : 0,
        });
      }
    };
    if (kind === 0) {
      add(3, 0.22, 0.38, 0.085, 0.115, 0.5, () => 0, 0.1, 0);                       // dark feet
      add(Math.round((3 + Math.floor(R() * 2)) * 1.45), 0.50, 0.90, 0.062, 0.090, 0.8, () => 1, 0.15, 0.15);
      add(Math.round((1) * 1.9), 0.45, 0.75, 0.055, 0.070, 0.8, () => 2, 0.2, 0);
    } else if (kind === 1) {
      add(4, 0.16, 0.30, 0.085, 0.115, 0.5, () => 0, 0.1, 0);
      add(Math.round((5 + Math.floor(R() * 2)) * 1.45), 0.32, 0.56, 0.060, 0.085, 0.9, () => 1, 0.2, 0.1);
      add(Math.round((1 + Math.floor(R() * 2)) * 1.9), 0.30, 0.48, 0.052, 0.066, 0.9, () => 2, 0.2, 0);
    } else if (kind === 2) {
      add(5, 0.20, 0.40, 0.052, 0.072, 0.5, () => 0, 0.1, 0);
      add(Math.round((6 + Math.floor(R() * 3)) * 1.45), 0.50, 0.92, 0.038, 0.054, 0.75, (r) => (r < 0.25 ? 0 : 1), 0.3, 0.25);
      add(Math.round((2) * 1.9), 0.45, 0.78, 0.034, 0.044, 0.8, () => 2, 0.3, 0.2);
    } else if (kind === 3) {
      add(5, 0.18, 0.36, 0.052, 0.072, 0.3, () => 0, 0.05, 0);
      add(Math.round((5 + Math.floor(R() * 3)) * 1.45), 0.36, 0.94, 0.038, 0.056, 0.6, (r) => (r < 0.25 ? 0 : 1), 0.15, 0.25);
      add(Math.round((2) * 1.9), 0.40, 0.80, 0.034, 0.044, 0.5, () => 2, 0.1, 0.1);
      for (const s of list) { s.curl = R() < 0.25 ? -dirn * R() * 0.2 : dirn * (0.1 + R() * 0.55); s.ang += (R() - 0.5) * 0.35; }
    } else if (kind === 4) {
      const hf = (u) => 0.42 + 0.58 * Math.min(1, Math.max(0, 0.5 + dirn * u * 1.3));
      add(5, 0.20, 0.36, 0.052, 0.072, 0.4, () => 0, 0.1, 0);
      add(Math.round((7 + Math.floor(R() * 2)) * 1.45), 0.62, 0.94, 0.038, 0.054, 0.5, (r) => (r < 0.25 ? 0 : 1), 0.2, 0.2, hf);
      add(Math.round((2) * 1.9), 0.50, 0.80, 0.034, 0.044, 0.5, () => 2, 0.2, 0.1, hf);
    } else if (kind === 5) {
      add(4, 0.12, 0.22, 0.045, 0.06, 0.6, () => 0, 0.1, 0);
    } else if (kind === 6) {
      add(7, 0.18, 0.38, 0.038, 0.052, 0.5, () => 0, 0.1, 0);
      add(Math.round((8 + Math.floor(R() * 4)) * 1.45), 0.50, 0.94, 0.026, 0.038, 0.65, (r) => (r < 0.4 ? 0 : 1), 0.35, 0.3);
      add(Math.round((3) * 1.45), 0.42, 0.76, 0.024, 0.032, 0.7, (r) => (r < 0.4 ? 1 : 2), 0.35, 0.25);
    } else if (kind === 7) {
      add(4, 0.14, 0.26, 0.036, 0.050, 0.5, () => 0, 0.1, 0);
      add(Math.round((4 + Math.floor(R() * 2)) * 1.45), 0.66, 0.95, 0.026, 0.036, 1.5, (r) => (r < 0.3 ? 0 : r < 0.85 ? 1 : 2), 0.0, 0.1);
      for (const s of list) if (s.h > 0.5 * cell) s.curl = Math.sign(s.ang - lean || 1) * (0.35 + R() * 0.45);
    } else if (kind === 8) {
      add(5, 0.14, 0.28, 0.036, 0.050, 0.5, () => 0, 0.1, 0);
      add(Math.round((5) * 1.45), 0.30, 0.50, 0.026, 0.036, 0.6, (r) => (r < 0.7 ? 1 : 2));
      add(Math.round((3 + Math.floor(R() * 2)) * 1.45), 0.66, 0.92, 0.017, 0.022, 0.35, () => 1, 0.2, 0.1);
    } else {
      add(6, 0.12, 0.26, 0.038, 0.054, 0.6, () => 0, 0.1, 0);
      add(Math.round((5) * 1.45), 0.26, 0.50, 0.028, 0.038, 0.8, (r) => (r < 0.45 ? 0 : 1), 0.35, 0.3);
      add(Math.round((2) * 1.9), 0.30, 0.50, 0.024, 0.030, 0.8, () => 2, 0.3, 0.3);
    }
    // dark first, light last; within a tone the tall ones go behind
    list.sort((a, b) => a.tone - b.tone || b.h - a.h);
    const drawList = (tone) => {
      for (const s of list) {
        if (s.tone !== tone) continue;
        // roots at uneven heights: the foot of a tuft is a ragged line, not a level one
        const ry = oy - 3 - R() * R() * 0.11 * cell;
        const C = stroke(s.x, ry, s.ang, s.h, s.w, s.curl, s.tone, R, s.kink);
        if (kind === 8 && s.h > 0.6 * cell) {
          // seed head: three fat dabs near the tip
          const [tx, ty, ta] = C[C.length - 1];
          for (let k = 0; k < 6; k++) dab(tx - Math.sin(ta) * k * 7 + (R() - 0.5) * 7, ty + Math.cos(ta) * k * 7, 2.6, 7.5, ta + (R() - 0.5) * 0.9, k % 3 === 2 ? 1 : 2);
        }
      }
    };
    drawList(0);
    if (kind === 5) {
      // broad leaves radiating low from the root
      const n = 7 + Math.floor(R() * 4);
      const lv = [];
      for (let i = 0; i < n; i++) lv.push({ a: ((i + R() * 0.8) / n - 0.5) * 2.7, l: (0.24 + R() * 0.26) * cell, w: (0.040 + R() * 0.028) * cell, tone: R() < 0.5 ? 0 : R() < 0.9 ? 1 : 2 });
      lv.sort((a, b) => a.tone - b.tone);
      for (const l of lv) stroke(ox + (R() - 0.5) * 14, oy - 5 - R() * 10, l.a, l.l, l.w, Math.sign(l.a) * (0.25 + R() * 0.3), l.tone, R, 0, 1);
    }
    if (kind === 9) {
      // leafy stalks: a stem carrying pairs of drooping leaves that get smaller toward the top
      const ns = 3 + Math.floor(R() * 3);
      for (let k = 0; k < ns; k++) {
        const sx = ox + ((k + R()) / ns - 0.5) * spread, sh = (0.58 + R() * 0.36) * cell;
        const sa = lean * 0.5 + (R() - 0.5) * 0.5, sc = (R() - 0.5) * 0.4;
        const stemT = R() < 0.6 ? 0 : 1;
        const C = stroke(sx, oy, sa, sh, (0.016 + R() * 0.006) * cell, sc, stemT, R, R() < 0.3 ? (R() - 0.5) * 0.8 : 0);
        for (let i = 2; i < C.length; i++) {
          const u = i / (C.length - 1);
          for (const sd of [-1, 1]) {
            if (R() < 0.22) continue;
            const ll = (0.19 - 0.12 * u) * cell * (0.7 + R() * 0.6);
            const tone = u > 0.62 && R() < 0.5 ? 2 : R() < 0.4 ? 0 : 1;
            stroke(C[i][0], C[i][1], C[i][2] + sd * (0.9 + R() * 0.6), ll, (0.050 - 0.02 * u) * cell, sd * (0.35 + R() * 0.3), tone, R, 0, 1);
          }
        }
        const [tx, ty, ta] = C[C.length - 1];
        for (let i = 0; i < 4; i++) dab(tx - Math.sin(ta) * i * 7 + (R() - 0.5) * 8, ty + Math.cos(ta) * i * 7, 4.5, 7, ta + (R() - 0.5), R() < 0.6 ? 2 : 1);
      }
    }
    drawList(1); drawList(2);
    for (const ctx of [m, t]) ctx.restore();
  }
  const dm = m.getImageData(0, 0, W, H).data, dt = t.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = (y * W + x) * 4, d = ((H - 1 - y) * W + x) * 4;      // flip: v = 0 at the canvas bottom
    out[d] = dt[s]; out[d + 1] = dt[s]; out[d + 2] = dt[s]; out[d + 3] = dm[s];
  }
  // tight trapezoid around every silhouette (cards are cut to it, which saves a third to a half of
  // the fill of a full-cell card): bottom edge x0..x1 at the root, top edge x0..x1 at height `top`,
  // all as fractions of the cell
  const boxB = [], boxT = [];
  for (let v = 0; v < COLS * ROWS; v++) {
    if (KIND[v] >= 10) { boxB.push([0, 1]); boxT.push([0, 1, 1]); continue; }
    const cx0 = (v % COLS) * cell, cy0 = Math.floor(v / COLS) * cell;
    const px = [];
    let x0 = cell, x1 = 0, top = 0, b0 = cell, b1 = 0;
    const yb = 0.12 * cell;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      if (dm[((cy0 + y) * W + cx0 + x) * 4] <= 6) continue;
      const up = cell - y;                                        // height above the bottom of the cell
      px.push(x, up);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (up > top) top = up;
      if (up < yb) { if (x < b0) b0 = x; if (x > b1) b1 = x; }
    }
    const pad = 4;
    top = Math.min(cell, top + pad); x0 = Math.max(0, x0 - pad); x1 = Math.min(cell, x1 + pad);
    b0 = Math.max(0, Math.min(b0, cell / 2) - pad); b1 = Math.min(cell, Math.max(b1, cell / 2) + pad);
    // the top corners: as far in as the silhouette allows, keeping every pixel inside the two side lines
    let t0 = b0, t1 = b1, ok0 = true, ok1 = true;
    for (let i = 0; i < px.length; i += 2) {
      const x = px[i], up = px[i + 1];
      if (up < yb) continue;
      t0 = Math.min(t0, b0 + ((x - pad - b0) * top) / up);
      t1 = Math.max(t1, b1 + ((x + pad - b1) * top) / up);
    }
    if (t0 < 0) ok0 = false; if (t1 > cell) ok1 = false;
    // (a side that would leave the cell falls back to the straight side of the box)
    boxB.push([(ok0 ? b0 : x0) / cell, (ok1 ? b1 : x1) / cell]);
    boxT.push([(ok0 ? t0 : x0) / cell, (ok1 ? t1 : x1) / cell, top / cell]);
  }
  return { d: out, W, H, boxB, boxT };
}
