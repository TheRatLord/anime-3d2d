// Canvas-painted textures for the distant landscape and the sky (helper module, no default export).
// Everything here is *drawn* (polygons, dabs, strokes) rather than computed from noise, slightly
// blurred, and thresholded again in the shaders: that keeps edges crisp under magnification and
// gives them the rounded corners of a loaded brush.
import * as THREE from 'three';
import { rng } from '../world.js';

function canvas(w, h, fill = '#000') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (fill) { x.fillStyle = fill; x.fillRect(0, 0, w, h); }
  return [c, x];
}
function blurred(c, px, wrap = true) {
  const [o, x] = canvas(c.width, c.height);
  x.filter = `blur(${px}px)`;
  x.drawImage(c, 0, 0);
  // wrap horizontally so the blur is seamless
  if (wrap) { x.drawImage(c, -c.width, 0); x.drawImage(c, c.width, 0); }
  x.filter = 'none';
  return o;
}
const red = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;

// pack up to four greyscale canvases (their red channel) into one RGBA texture; row 0 = canvas top
function pack(w, h, chans, { repeatS = true, repeatT = false, mip = true, aniso = 4 } = {}) {
  const d = new Uint8Array(w * h * 4);
  for (let k = 0; k < 4; k++) {
    if (!chans[k]) { if (k === 3) for (let i = 0; i < w * h; i++) d[i * 4 + 3] = 255; continue; }
    const s = chans[k] instanceof Uint8ClampedArray ? chans[k] : red(chans[k]);
    for (let i = 0; i < w * h; i++) d[i * 4 + k] = s[i * 4];
  }
  return dataTex(d, w, h, { repeatS, repeatT, mip, aniso });
}
function dataTex(d, w, h, { repeatS = true, repeatT = false, mip = true, aniso = 4 } = {}) {
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat);
  t.wrapS = repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = repeatT ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mip;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

// a lumpy rounded mass: union of circles around (0,0), radius r
function lumps(R, n, r, squash = 0.8) {
  const L = [];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.pow(R(), 0.7) * r * 0.55;
    L.push([Math.cos(a) * d, Math.sin(a) * d * squash, r * (0.38 + R() * 0.3)]);
  }
  return L;
}
function fillLumps(x, L, ox, oy, sc, col) {
  x.fillStyle = col;
  x.beginPath();
  for (const l of L) { x.moveTo(ox + l[0] * sc + l[2] * sc, oy + l[1] * sc); x.arc(ox + l[0] * sc, oy + l[1] * sc, l[2] * sc, 0, Math.PI * 2); }
  x.fill();
}

// foliage dabs scattered inside an ellipse: short blunt strokes at random angles
function dabs(x, R, cx, cy, rx, ry, n, size, col) {
  x.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R());
    const s = size * (0.6 + R() * 0.8);
    x.save(); x.translate(cx + Math.cos(a) * d * rx, cy + Math.sin(a) * d * ry); x.rotate((R() - 0.5) * 1.6);
    x.beginPath(); x.ellipse(0, 0, s, s * (0.45 + R() * 0.3), 0, 0, Math.PI * 2); x.fill(); x.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Crown atlas (4 x 5 cells). Every wood, copse and lone tree in the distance is assembled from
// these cards, one crown (or one small tree) each.
//   cells 0-7   wood crowns: a dome with a few side lobes, leaf-dab rim
//   cells 8-15  lone trees with trunks: round, tall, spreading, double, leaning, poplar, bushes, scraggly
//   cells 16-18 pale rock outcrops, 19 a low hedge
// R = sun field in three nested grey levels on the upper LEFT of every lobe (the shader thresholds
//     it per instance, so a crown on a sunny slope gets a big cap and one in shade a small one),
// G = dark accent (undersides, base stroke), B = trunk, A = coverage.
const TAU = Math.PI * 2;
// rag > 1: a brushed, leaf-scalloped edge - a smaller solid middle, a ring of medium slanted dabs
// overlapping it and a scatter of small leaf dabs just outside (notches and strays instead of round lobes)
function blobPath(x, R, cx, cy, rx, ry, n = 30, rag = 1) {
  if (rag > 1) {
    // (the middle is three overlapping slanted ovals, not one disc)
    for (let i = 0; i < 3; i++) {
      const ox = cx + (R() - 0.5) * rx * 0.36, oy = cy + (R() - 0.5) * ry * 0.36, ex = rx * (0.5 + R() * 0.16), ey = ry * (0.46 + R() * 0.16), rot = (R() - 0.5) * 1.2;
      x.moveTo(ox + ex * Math.cos(rot), oy + ex * Math.sin(rot)); x.ellipse(ox, oy, ex, ey, rot, 0, TAU);
    }
    const m = Math.max(rx, 14);
    for (let i = 0; i < n * 1.6; i++) {
      const a = R() * TAU, d = 0.6 + R() * 0.38, s = m * (0.07 + R() * 0.10);
      const px = cx + Math.cos(a) * d * rx, py = cy + Math.sin(a) * d * ry, rot = a + 1.57 + (R() - 0.5) * 1.6, sq = 0.38 + R() * 0.3;
      x.moveTo(px + s * Math.cos(rot), py + s * Math.sin(rot)); x.ellipse(px, py, s, s * sq, rot, 0, TAU);
    }
    for (let i = 0; i < n * 1.5; i++) {
      const a = R() * TAU, d = 0.9 + R() * 0.24 * rag * 0.6, s = m * (0.03 + R() * 0.045);
      const px = cx + Math.cos(a) * d * rx, py = cy + Math.sin(a) * d * ry, rot = R() * 3.14, sq = 0.4 + R() * 0.3;
      x.moveTo(px + s * Math.cos(rot), py + s * Math.sin(rot)); x.ellipse(px, py, s, s * sq, rot, 0, TAU);
    }
    return;
  }
  x.moveTo(cx + rx * 0.8, cy); x.ellipse(cx, cy, rx * 0.8, ry * 0.8, 0, 0, TAU);
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, d = 0.7 + R() * 0.32, s = rx * (0.12 + R() * 0.13);
    const px = cx + Math.cos(a) * d * rx, py = cy + Math.sin(a) * d * ry, rot = R() * 3.14, sq = 0.5 + R() * 0.4;
    x.moveTo(px + s, py); x.ellipse(px, py, s, s * sq, rot, 0, TAU);
  }
}
function leafBlob(x, sd, cx, cy, rx, ry, col, n = 30, rag = 1) { x.fillStyle = col; x.beginPath(); blobPath(x, rng(sd), cx, cy, rx, ry, n, rag); x.fill(); }

export const ATLAS = { cols: 4, rows: 5 };
export function makeCrownAtlas(cell = 256) {
  const W = cell * ATLAS.cols, H = cell * ATLAS.rows;
  const [cA, xA] = canvas(W, H), [cL, xL] = canvas(W, H), [cD, xD] = canvas(W, H), [cT, xT] = canvas(W, H);
  const R = rng(20261);
  // one foliage lobe, painted over whatever is behind it in every channel
  // lone = a tree standing by itself: its sun cap is smaller (a clear shadow side stays even at the lowest
  // threshold) and the underside of every lobe carries a broad dark stroke
  const lobe = (X0, Y0, l, sd, lone = false) => {
    const cx = X0 + l[0] * cell, cy = Y0 + l[1] * cell, rx = l[2] * cell, ry = l[3] * cell;
    leafBlob(xA, sd, cx, cy, rx, ry, '#fff', 30, 1.5);
    for (const x of [xL, xD, xT]) leafBlob(x, sd, cx, cy, rx * 1.03, ry * 1.03, '#000', 30, 1.5);
    const Q = rng(sd + 77);
    // the sun cap: three nested shapes on the upper left, each a mass with a dab-scalloped edge. Even the
    // broadest stops well above the foot of the lobe: every crown keeps a shadow under-plane, so a sunlit
    // wood reads as rows of light tops over dark undersides (crown scallops), never as one pale sheet
    // On a lobe big enough to be seen as a shape under the long lens the cap is not ONE mass (three ovals run
    // together are an amoeba when a crown is 80 px across) but a handful of smaller leaf masses, each a dome
    // with its own light top and a dark crescent of shadow under it, laid from the top of the cap downward
    // so that every one overlaps the shadow of those above: crown scallops. Each dome carries the three
    // nested levels itself, so at any threshold the cap is a cluster of scalloped tops, large or small.
    const cap = lone ? [cx - rx * 0.36, cy - ry * 0.42, rx * 0.84, ry * 0.76] : [cx - rx * 0.22, cy - ry * 0.36, rx * 0.86, ry * 0.70];
    if (rx > 0.105 * cell) {
      const nS = rx > 0.2 * cell ? 4 + Math.floor(Q() * 2) : 3, subs = [];
      for (let i = 0; i < nS; i++) {
        const an = Q() * TAU, d = Math.sqrt(Q()) * 0.66;
        subs.push([cap[0] + Math.cos(an) * d * cap[2], cap[1] + Math.sin(an) * d * cap[3], cap[2] * (0.44 + Q() * 0.18)]);
      }
      subs.sort((p, q) => p[1] - q[1]);
      subs.forEach(([sx, sy, sr], i) => {
        const k = sd * 31 + i * 7, flat = 0.66 + Q() * 0.14;
        leafBlob(xL, k + 5, sx + sr * 0.16, sy + sr * 0.40, sr * 1.0, sr * flat * 0.85, '#000', 14, 1.5);
        leafBlob(xL, k + 1, sx, sy, sr, sr * flat, 'rgb(96,96,96)', 16, 1.6);
        leafBlob(xL, k + 2, sx - sr * 0.08, sy - sr * 0.10, sr * 0.88, sr * flat * 0.82, 'rgb(176,176,176)', 14, 1.6);
        if (i < 2 || Q() < 0.45) leafBlob(xL, k + 3, sx - sr * 0.20, sy - sr * 0.28, sr * 0.46, sr * flat * 0.40, '#fff', 8, 1.5);
      });
    } else {
      leafBlob(xL, sd + 1, cap[0], cap[1], cap[2], cap[3], 'rgb(96,96,96)', 26, 1.6);
      dabs(xL, Q, cx + rx * 0.35, cy + ry * 0.1, rx * 0.4, ry * 0.5, 3, rx * 0.11, 'rgb(96,96,96)');
      leafBlob(xL, sd + 2, cx - rx * 0.38, cy - ry * 0.5, rx * 0.62, ry * 0.52, 'rgb(176,176,176)', 20, 1.6);
      leafBlob(xL, sd + 3, cx - rx * 0.4, cy - ry * 0.62, rx * 0.4, ry * 0.24, '#fff', 14, 1.5);
    }
    // a few shadow dabs left inside the cap (gaps between leaf masses)
    dabs(xL, Q, cx - rx * 0.1, cy - ry * 0.1, rx * 0.7, ry * 0.5, 2, rx * 0.07, '#000');
    // the under-plane: a broad dark stroke of dabs along the belly of the lobe
    if (lone) dabs(xD, Q, cx + rx * 0.12, cy + ry * 0.52, rx * 0.85, ry * 0.3, 20, rx * 0.2, '#fff');
    else dabs(xD, Q, cx + rx * 0.12, cy + ry * 0.56, rx * 0.8, ry * 0.25, 16, rx * 0.19, '#fff');
  };
  const trunk = (X0, Y0, pts, w) => {
    for (const x of [xA, xT]) {
      x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineJoin = 'round';
      for (let i = 0; i < pts.length - 1; i++) {
        x.lineWidth = w * cell * (1 - 0.45 * (i / (pts.length - 1)));
        x.beginPath(); x.moveTo(X0 + pts[i][0] * cell, Y0 + pts[i][1] * cell); x.lineTo(X0 + pts[i + 1][0] * cell, Y0 + pts[i + 1][1] * cell); x.stroke();
      }
    }
  };
  // a dark dabbed stroke where the tree meets the grass
  const foot = (X0, Y0, cx, wd) => {
    const Q = rng(Math.floor(X0 + Y0 * 7 + 3));
    for (const x of [xA, xD]) dabs(x, rng(Math.floor(X0 + Y0 * 7 + 3)), X0 + cx * cell, Y0 + 0.93 * cell, wd * cell, 0.01 * cell, 12, 0.026 * cell, '#fff');
    Q();
  };
  const cellXY = (i) => [(i % ATLAS.cols) * cell, Math.floor(i / ATLAS.cols) * cell];
  // wood crowns
  for (let v = 0; v < 8; v++) {
    const [X0, Y0] = cellXY(v);
    const wide = 0.85 + R() * 0.5, L = [[0.5, 0.47, 0.27 * Math.min(1.15, wide), 0.27 / Math.max(0.9, wide * 0.9)]];
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const a = (R() - 0.5) * 3.4 + Math.PI / 2, d = 0.17 + R() * 0.1, r = 0.13 + R() * 0.09;
      L.push([0.5 + Math.cos(a) * d * 1.15, 0.5 + Math.sin(a) * d * 0.8, r, r * (0.75 + R() * 0.3)]);
    }
    if (R() < 0.35) L.push([0.42 + R() * 0.16, 0.27, 0.13 + R() * 0.05, 0.11]);
    L.sort((a, b) => a[1] - b[1]);
    L.forEach((l, i) => lobe(X0, Y0, l, v * 50 + i + 1));
  }
  // lone trees: [lobes], [trunk segments], trunk width, foot width
  const T = [
    [[[0.5, 0.3, 0.2, 0.17], [0.5, 0.43, 0.3, 0.26], [0.3, 0.53, 0.17, 0.14], [0.71, 0.51, 0.18, 0.15]], [[[0.5, 0.94], [0.5, 0.56]]], 0.05, 0.13],
    [[[0.53, 0.19, 0.11, 0.12], [0.47, 0.32, 0.15, 0.17], [0.5, 0.5, 0.17, 0.19], [0.41, 0.63, 0.12, 0.09]], [[[0.5, 0.94], [0.49, 0.6]]], 0.04, 0.09],
    [[[0.45, 0.42, 0.2, 0.12], [0.64, 0.4, 0.15, 0.1], [0.5, 0.5, 0.3, 0.13], [0.24, 0.56, 0.16, 0.1], [0.77, 0.55, 0.17, 0.11]], [[[0.52, 0.94], [0.5, 0.72], [0.36, 0.56]], [[0.5, 0.72], [0.66, 0.55]]], 0.05, 0.15],
    [[[0.3, 0.3, 0.13, 0.12], [0.33, 0.43, 0.2, 0.2], [0.72, 0.42, 0.11, 0.1], [0.7, 0.53, 0.17, 0.16]], [[[0.5, 0.94], [0.48, 0.74], [0.36, 0.54]], [[0.48, 0.74], [0.66, 0.58]]], 0.045, 0.12],
    [[[0.66, 0.27, 0.13, 0.11], [0.48, 0.33, 0.15, 0.13], [0.6, 0.41, 0.24, 0.19], [0.76, 0.52, 0.13, 0.11]], [[[0.38, 0.94], [0.43, 0.72], [0.56, 0.5]]], 0.045, 0.11],
    [[[0.5, 0.2, 0.075, 0.14], [0.5, 0.4, 0.105, 0.2], [0.5, 0.63, 0.125, 0.2]], [[[0.5, 0.94], [0.5, 0.8]]], 0.035, 0.08],
    [[[0.5, 0.7, 0.13, 0.1], [0.38, 0.79, 0.19, 0.12], [0.63, 0.82, 0.15, 0.1]], [], 0.0, 0.2],
    [[[0.42, 0.34, 0.17, 0.14], [0.67, 0.43, 0.14, 0.12], [0.29, 0.53, 0.1, 0.08], [0.55, 0.57, 0.18, 0.09]], [[[0.5, 0.94], [0.52, 0.66], [0.42, 0.42]], [[0.52, 0.66], [0.66, 0.5]], [[0.51, 0.75], [0.32, 0.56]]], 0.04, 0.1],
  ];
  T.forEach(([L, tr, tw, fw], k) => {
    const [X0, Y0] = cellXY(8 + k);
    for (const seg of tr) trunk(X0, Y0, seg, tw);
    L.forEach((l, i) => lobe(X0, Y0, l, 900 + k * 50 + i, true));
    foot(X0, Y0, tr.length ? tr[0][0][0] : 0.5, fw);
  });
  // rock outcrops: a low, broken ledge of pale stone showing through the grass - a few lumpy overlapping
  // shapes much wider than high, light on top and to the upper left, a shade plane low on the right, and
  // their feet bitten into by grass dabs (never a clean chip standing on the slope: a sticker)
  for (let v = 0; v < 3; v++) {
    const [X0, Y0] = cellXY(16 + v), n = 3 + v;
    const path = (x, pts) => { x.beginPath(); pts.forEach((p, j) => (j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); x.fill(); };
    const feet = [];
    for (let i = 0; i < n; i++) {
      const cx = X0 + (0.22 + R() * 0.56) * cell, cy = Y0 + (0.66 + R() * 0.12) * cell, w = (0.10 + R() * 0.15) * cell, h = (0.05 + R() * 0.075) * cell;
      // outline: a flat foot and an irregular top of 6-8 points
      const m = 6 + Math.floor(R() * 3), P = [[cx - w, cy + h]];
      for (let j = 0; j <= m; j++) { const t = j / m, a = Math.PI * (1 - t); P.push([cx + Math.cos(a) * w * (0.92 + R() * 0.16), cy + h - Math.sin(a) * h * 2 * (0.55 + R() * 0.6) - (j > 0 && j < m ? h * 0.25 : 0)]); }
      P.push([cx + w, cy + h]);
      xA.fillStyle = '#fff'; path(xA, P);
      xL.fillStyle = '#fff'; path(xL, P); xD.fillStyle = '#000'; path(xD, P);
      // shade: the lower right part, cut along a broken diagonal
      const k = 2 + Math.floor(R() * (m - 3)), S = [[cx + w * (R() * 0.5 - 0.35), cy + h], [cx + w * (R() * 0.3 - 0.1), cy + h * (0.1 - R() * 0.5)]];
      for (let j = k + 1; j < P.length; j++) S.push(P[j]);
      xL.fillStyle = '#000'; path(xL, S);
      if (R() < 0.6) { xD.fillStyle = '#fff'; path(xD, [[cx + w * 0.35, cy + h], [cx + w * 0.5, cy + h * 0.2], P[P.length - 2], P[P.length - 1]]); }
      feet.push([cx, cy + h, w]);
    }
    // grass over the feet
    for (const [cx, fy, w] of feet) for (const x of [xA]) dabs(x, R, cx, fy + 0.012 * cell, w * 1.1, 0.012 * cell, 9, 0.022 * cell, '#000');
  }
  { // hedge: a low run of small lobes
    const [X0, Y0] = cellXY(19);
    for (let i = 0; i < 7; i++) lobe(X0, Y0, [0.14 + i * 0.12 + (R() - 0.5) * 0.04, 0.8 + (R() - 0.5) * 0.05, 0.09 + R() * 0.04, 0.08 + R() * 0.05], 1700 + i);
    foot(X0, Y0, 0.5, 0.4);
  }
  const a = red(blurred(cA, 0.9, false)), l = red(blurred(cL, 0.9, false)), dk = red(blurred(cD, 1.0, false)), t = red(blurred(cT, 1.0, false));
  const d = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { d[i * 4] = l[i * 4]; d[i * 4 + 1] = dk[i * 4]; d[i * 4 + 2] = t[i * 4]; d[i * 4 + 3] = a[i * 4]; }
  return dataTex(d, W, H, { repeatS: false, aniso: 2 });
}

// ---------------------------------------------------------------------------------------------
// Painted landmark cards. Drawn for a sun on the viewer's RIGHT. Returns RGBA with clean alpha
// (colour is painted on an opaque canvas so edges do not darken).
// Every shape is laid with a slightly unsteady hand: edges wobble by a pixel or two, fills are
// broken into two close tones by a few dabs, and roofs carry a dark stroke under the eave.
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const tone = (c, k) => { const [r, g, b] = hex(c); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
function landmark(w, h, bg, paint) {
  const [cC, xC] = canvas(w, h, bg), [cA, xA] = canvas(w, h);
  const P = rng(w * 7 + h);
  // patch = 0 flat, else strength of the second tone
  const shape = (col, fn, patch = 0.06) => {
    for (const [x, c] of [[xC, col], [xA, '#fff']]) { x.fillStyle = c; x.beginPath(); fn(x); x.fill(); }
    if (!patch || col[0] !== '#') return;
    xC.save(); xC.beginPath(); fn(xC); xC.clip();
    const bb = fn.bb;
    if (bb) {
      const n = 2 + Math.floor(P() * 4);
      for (let i = 0; i < n; i++) {
        xC.fillStyle = tone(col, P() < 0.6 ? 1 - patch : 1 + patch * 0.6);
        const px = bb[0] + P() * (bb[2] - bb[0]), py = bb[1] + P() * (bb[3] - bb[1]), rw = (bb[2] - bb[0]) * (0.2 + P() * 0.4), rh = (bb[3] - bb[1]) * (0.12 + P() * 0.3);
        xC.beginPath(); xC.ellipse(px, py, rw, Math.max(2, rh), (P() - 0.5) * 0.5, 0, TAU); xC.fill();
      }
    }
    xC.restore();
  };
  const mark = (col, fn) => { xC.fillStyle = col; xC.beginPath(); fn(xC); xC.fill(); };     // colour only (inside shapes)
  paint(shape, mark);
  const c = xC.getImageData(0, 0, w, h).data, a = red(blurred(cA, 2.4, false));     // a soft ramp: the shader cuts it with brush dabs
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { d[i * 4] = c[i * 4]; d[i * 4 + 1] = c[i * 4 + 1]; d[i * 4 + 2] = c[i * 4 + 2]; d[i * 4 + 3] = a[i * 4]; }
  return dataTex(d, w, h, { repeatS: false, aniso: 4 });
}
// a polygon whose edges wobble like a brushed line (the wobble is fixed per polygon, so colour and alpha agree)
let quadSeed = 1;
const WOBBLE = 1.7;      // texels: about a pixel and a half on screen under the 14-degree lens
const quad = (pts, amp = 1.3) => {
  amp *= WOBBLE;
  const R = rng(quadSeed++ * 977), out = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / 13));
    const nx = -(q[1] - p[1]) / (len || 1), ny = (q[0] - p[0]) / (len || 1);
    out.push([p[0] + (R() - 0.5) * amp, p[1] + (R() - 0.5) * amp]);
    for (let k = 1; k < n; k++) { const t = k / n, o = (R() - 0.5) * 2 * amp; out.push([p[0] + (q[0] - p[0]) * t + nx * o, p[1] + (q[1] - p[1]) * t + ny * o]); }
  });
  const fn = (x) => { out.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); };
  fn.bb = [Math.min(...out.map((p) => p[0])), Math.min(...out.map((p) => p[1])), Math.max(...out.map((p) => p[0])), Math.max(...out.map((p) => p[1]))];
  return fn;
};
const jit = (R, a) => (R() - 0.5) * a;

const WALL = '#ece2d0', WALL_SH = '#b0a2b0', ROOF = '#c98f68', ROOF_SH = '#9b6c6a', SLATE = '#93a0b6', SLATE_SH = '#6d7896', EAVE = '#77697f', DARK = '#5d536f';
// a small dark window dab: a slightly crooked upright stroke (Q = its own random stream)
const dab = (mark, Q, x, y, w, h) => mark(DARK, quad([[x + jit(Q, 1), y], [x + jit(Q, 1.5), y - h * (0.85 + Q() * 0.3)], [x + w + jit(Q, 1.5), y - h * (0.85 + Q() * 0.3)], [x + w + jit(Q, 1), y]], 0.45));
const TREE_D = '#4c7a52', TREE_L = '#a3bf6c', TREE_A = '#335c4c';

function tree(shape, mark, R, x, y, r) {
  const sd = Math.floor(R() * 1e6), ry = r * (0.75 + R() * 0.3);
  shape(TREE_D, (c) => blobPath(c, rng(sd), x, y, r, ry, 18), 0);
  mark(TREE_A, (c) => { const Q = rng(sd + 5); for (let i = 0; i < 4; i++) { const px = x - r * 0.1 + (Q() - 0.5) * r * 1.2, py = y + ry * (0.45 + Q() * 0.3), s = r * (0.14 + Q() * 0.12); c.moveTo(px + s, py); c.ellipse(px, py, s, s * 0.6, 0, 0, TAU); } });
  if (R() < 0.8) mark(TREE_L, (c) => blobPath(c, rng(sd + 9), x + r * 0.26, y - ry * 0.34, r * 0.56, ry * 0.5, 10));
}
function house(shape, mark, R, x, base, w, hgt, slate) {
  const sw = w * (0.28 + R() * 0.12), rh = hgt * (0.55 + R() * 0.35), ov = w * 0.06, sag = jit(R, 3);
  // shaded side wall (left), lit front wall, roof: lit plane + shaded gable strip
  shape(WALL_SH, quad([[x - sw, base], [x - sw, base - hgt * 0.92 + jit(R, 2)], [x, base - hgt], [x, base]]));
  shape(R() < 0.25 ? '#e3ceb6' : WALL, quad([[x, base], [x, base - hgt], [x + w + jit(R, 2), base - hgt + jit(R, 2)], [x + w, base]]), 0.07);
  // windows / a door as loose dark dabs, only sometimes
  const WQ = rng(Math.floor(x * 13 + base * 7));
  if (R() < 0.75) mark(DARK, (c) => { const n = 1 + Math.floor(R() * 3); for (let i = 0; i < n; i++) quad([[x + w * (0.16 + i * 0.28), base - hgt * 0.34], [x + w * (0.165 + i * 0.28), base - hgt * (0.55 + R() * 0.12)], [x + w * (0.25 + i * 0.28), base - hgt * 0.56], [x + w * (0.245 + i * 0.28), base - hgt * 0.33]], 0.9)(c); });
  else { const n = 1 + Math.floor(WQ() * 2); for (let i = 0; i < n; i++) dab(mark, WQ, x + w * (0.2 + i * 0.34 + WQ() * 0.1), base - hgt * 0.34, w * 0.09, hgt * 0.24); }
  // one on the shaded side wall, and a small one under the gable now and then
  if (WQ() < 0.6) dab(mark, WQ, x - sw * (0.6 + WQ() * 0.15), base - hgt * 0.36, sw * 0.22, hgt * 0.22);
  // dark stroke under the eave, broken
  mark(EAVE, (c) => { quad([[x - sw, base - hgt * 0.9], [x, base - hgt + 1], [x + w * (0.5 + R() * 0.5), base - hgt + 1], [x + w * 0.6, base - hgt + 5 + R() * 2], [x, base - hgt + 5.5], [x - sw, base - hgt * 0.9 + 4]], 1.0)(c); });
  shape(slate ? SLATE_SH : ROOF_SH, quad([[x - sw - ov, base - hgt * 0.9], [x - sw * 0.5, base - hgt - rh + jit(R, 2)], [x + ov, base - hgt + 1]]));
  shape(slate ? SLATE : ROOF, quad([[x - ov * 0.3, base - hgt + 2], [x - sw * 0.5, base - hgt - rh], [x + (w - sw * 0.5) * 0.5, base - hgt - rh + sag], [x + w - sw * 0.5 + jit(R, 3), base - hgt - rh + jit(R, 3)], [x + w + ov, base - hgt + 2]]), 0.09);
  // a darker broken ridge line
  mark(slate ? SLATE_SH : ROOF_SH, quad([[x - sw * 0.5, base - hgt - rh - 1], [x + (w - sw * 0.5) * (0.4 + R() * 0.5), base - hgt - rh + sag * 0.6 - 1], [x + (w - sw * 0.5) * 0.4, base - hgt - rh + 2.5]], 0.8));
  if (R() < 0.4) shape(WALL_SH, quad([[x + w * 0.6, base - hgt - rh * 0.5], [x + w * 0.6, base - hgt - rh * 1.25], [x + w * 0.72, base - hgt - rh * 1.25], [x + w * 0.72, base - hgt - rh * 0.5]]));
}

export function makeVillageTex() {
  const W = 1024, H = 320;
  quadSeed = 1;
  return landmark(W, H, '#b9c6a6', (shape, mark) => {
    const R = rng(77);
    const base = H - 34;
    // back row of trees
    for (let i = 0; i < 16; i++) tree(shape, mark, R, 60 + R() * (W - 120), base - 30 - R() * 26, 20 + R() * 20);
    // church with a spire, off-centre
    const cx = 590;
    shape(WALL_SH, quad([[cx - 22, base - 20], [cx - 22, base - 176], [cx, base - 180], [cx, base - 20]]));
    shape(WALL, quad([[cx, base - 20], [cx, base - 180], [cx + 30, base - 178], [cx + 30, base - 20]]), 0.07);
    mark(EAVE, quad([[cx - 22, base - 176], [cx, base - 180], [cx + 30, base - 178], [cx + 30, base - 172], [cx, base - 173], [cx - 22, base - 170]], 1));
    shape(SLATE_SH, quad([[cx - 26, base - 172], [cx + 4, base - 262], [cx + 4, base - 176]]));
    shape(SLATE, quad([[cx + 2, base - 176], [cx + 4, base - 262], [cx + 35, base - 174]]), 0.09);
    mark(DARK, quad([[cx + 10, base - 128], [cx + 11, base - 152], [cx + 18, base - 151], [cx + 18, base - 128]], 1));
    mark(DARK, quad([[cx + 9, base - 70], [cx + 10, base - 92], [cx + 16, base - 92], [cx + 17, base - 70]], 1));
    house(shape, mark, R, cx + 34, base - 16, 110, 62, true);
    // houses, back to front
    const hs = [];
    for (let i = 0; i < 19; i++) hs.push({ x: 110 + R() * (W - 300), y: base - 26 + R() * 34, w: 46 + R() * 44, h: 34 + R() * 26 });
    hs.sort((a, b) => a.y - b.y);
    for (const q of hs) { house(shape, mark, R, q.x, q.y, q.w, q.h, R() < 0.2); if (R() < 0.45) tree(shape, mark, R, q.x + q.w + 16 + R() * 20, q.y - 12, 14 + R() * 12); }
    // front hedge / orchard dabs and a ragged grass foot
    for (let i = 0; i < 22; i++) tree(shape, mark, R, 30 + R() * (W - 60), base + 8 + R() * 12, 12 + R() * 13);
    shape('#bdd3a0', (c) => { c.moveTo(0, H); for (let x = 0; x <= W; x += 16) c.lineTo(x, base + 14 + R() * 12 + Math.abs(x - W / 2) / W * 30); c.lineTo(W, H); c.closePath(); }, 0);
  });
}

export function makeCastleTex() {
  const W = 512, H = 512;
  quadSeed = 500;
  const STONE = '#ddd2be';
  return landmark(W, H, '#c9cbc4', (shape, mark) => {
    const R = rng(31);
    const base = H - 60;
    const tower = (x, w, top, roofH, slate = true) => {
      const sw = w * 0.36;
      shape(WALL_SH, quad([[x - sw, base + 10], [x - sw + jit(R, 2), top + 3], [x, top], [x, base + 10]]), 0.07);
      shape(STONE, quad([[x, base + 10], [x, top], [x + w - sw, top + 2], [x + w - sw + jit(R, 2), base + 10]]), 0.07);
      // corbelled head with a dark stroke beneath it
      mark(EAVE, quad([[x - sw, top + 2], [x, top], [x + w - sw, top + 1], [x + w - sw, top + 7], [x, top + 6], [x - sw, top + 8]], 1));
      shape(WALL_SH, quad([[x - sw - 4, top + 3], [x - sw - 4, top - 14], [x, top - 16], [x, top + 3]]));
      shape(STONE, quad([[x, top], [x, top - 16], [x + w - sw + 4, top - 14], [x + w - sw + 4, top + 2]]));
      if (roofH > 0) {
        shape(slate ? SLATE_SH : ROOF_SH, quad([[x - sw - 7, top - 13], [x + (w - 2 * sw) * 0.5, top - 16 - roofH], [x + 2, top - 15]]));
        shape(slate ? SLATE : ROOF, quad([[x, top - 15], [x + (w - 2 * sw) * 0.5, top - 16 - roofH], [x + w - sw + 7, top - 13]]), 0.09);
      } else {
        for (let i = 0; i < 4; i++) if (R() < 0.85) shape(i < 1 ? WALL_SH : STONE, quad([[x - sw + i * w / 4, top - 14], [x - sw + i * w / 4, top - 24 + jit(R, 3)], [x - sw + i * w / 4 + w / 7, top - 24 + jit(R, 3)], [x - sw + i * w / 4 + w / 7, top - 14]], 0.8), 0);
      }
      if (R() < 0.8) { const wy = top + 30 + R() * 30, wx = x + (w - sw) * 0.4; mark(DARK, quad([[wx, wy], [wx + 0.5, wy - 13], [wx + 5, wy - 14], [wx + 5.5, wy]], 0.8)); }
      // more slits down the tower, on both faces, staggered
      const WQ = rng(Math.floor(x * 17 + top));
      const n = 1 + Math.floor((base - top) / 90 + WQ() * 1.5);
      for (let i = 0; i < n; i++) {
        const wy = top + 62 + (i + WQ() * 0.6) * ((base - top - 80) / n);
        if (WQ() < 0.8) dab(mark, WQ, x + (w - sw) * (0.2 + WQ() * 0.55), wy, 4.5, 12);
        if (WQ() < 0.5) dab(mark, WQ, x - sw * (0.35 + WQ() * 0.4), wy + 8, 3.5, 11);
      }
    };
    // rocky knoll under the walls
    shape('#a9b29c', quad([[20, H], [60, base + 22], [150, base - 6], [380, base - 2], [470, base + 26], [500, H]], 3), 0.05);
    mark('#c4c8b8', quad([[230, base + 6], [300, base], [390, base + 4], [430, base + 30], [300, base + 34]], 2.5));
    tower(210, 78, base - 250, 0);                   // keep
    tower(288, 40, base - 300, 78);                  // tall turret behind
    // curtain wall with a broken crenellated top
    shape(WALL_SH, quad([[96, base + 12], [96, base - 92], [150, base - 96], [150, base + 12]]));
    shape(STONE, quad([[150, base + 12], [150, base - 96], [420, base - 90], [420, base + 12]]), 0.07);
    for (let x = 152; x < 418; x += 20) if (R() < 0.75) shape(STONE, quad([[x, base - 92], [x, base - 104 + jit(R, 3)], [x + 11, base - 104 + jit(R, 3)], [x + 11, base - 92]], 0.8), 0);
    mark('#cbc0b2', quad([[150, base - 40], [420, base - 36], [420, base + 12], [150, base + 12]], 2.5));
    tower(110, 62, base - 150, 60);
    tower(392, 66, base - 170, 66);
    tower(318, 44, base - 128, 44, false);
    { const WQ = rng(4141); for (let x = 170; x < 410; x += 34 + WQ() * 22) if (x < 236 || x > 286) dab(mark, WQ, x, base - 52 + jit(WQ, 8), 4, 11); }
    mark(DARK, (c) => { c.moveTo(250, base + 10); c.lineTo(251, base - 26); c.quadraticCurveTo(262, base - 44, 274, base - 26); c.lineTo(273, base + 10); c.closePath(); });
    for (let i = 0; i < 9; i++) tree(shape, mark, R, 50 + R() * 420, base + 22 + R() * 14, 14 + R() * 16);
  });
}
