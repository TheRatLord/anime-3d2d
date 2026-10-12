// The pixels of the procedural "paint" textures (src/brush.js makes textures of them). No dependency on the page or
// on THREE: src/paint.worker.js paints them in a worker thread while the rest of the page is built.
import { rng } from '../rng.js';

// (a canvas of the page, or an OffscreenCanvas where there is no page: the painters run in worker threads too)
function canvas(w, h) {
  if (typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// draw fn at all wrapped positions so the result tiles
function wrapDraw(ctx, size, x, y, r, fn) {
  for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
    const px = x + ox * size, py = y + oy * size;
    if (px < -r || px > size + r || py < -r || py > size + r) continue;
    ctx.save(); ctx.translate(px, py); fn(ctx); ctx.restore();
  }
}

// One opaque brush dab: a slightly irregular elongated blob with ragged ends.
function dabPath(ctx, len, wid, R) {
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rag = 0.82 + R() * 0.36;
    // superellipse-ish: flat sides, blunt ends
    const cx = Math.cos(a), sy = Math.sin(a);
    const ex = Math.sign(cx) * Math.pow(Math.abs(cx), 0.6) * len * 0.5 * rag;
    const ey = Math.sign(sy) * Math.pow(Math.abs(sy), 0.8) * wid * 0.5 * (0.9 + R() * 0.2);
    if (i === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
  }
  ctx.closePath();
}

// A tileable patchwork of overlapping opaque dabs with random grey values.
function strokeLayer(size, count, lenRange, widRange, dirSpread, seed, baseAngle = 0) {
  const R = rng(seed);
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < count; i++) {
    const x = R() * size, y = R() * size;
    const len = lenRange[0] + R() * (lenRange[1] - lenRange[0]);
    const wid = widRange[0] + R() * (widRange[1] - widRange[0]);
    const ang = baseAngle + (R() - 0.5) * dirSpread;
    const g = Math.floor(R() * 256);
    wrapDraw(ctx, size, x, y, len, (k) => {
      k.rotate(ang);
      k.fillStyle = `rgb(${g},${g},${g})`;
      dabPath(k, len, wid, R);
      k.fill();
    });
  }
  return ctx.getImageData(0, 0, size, size).data;
}

// tileable value-noise fbm
function fbmLayer(size, seed, baseFreq = 4, octaves = 5) {
  const R = rng(seed);
  const out = new Float32Array(size * size);
  let amp = 0.5, freq = baseFreq, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const g = new Float32Array(freq * freq);
    for (let i = 0; i < g.length; i++) g[i] = R();
    // (the lattice cell and the smoothstep of every column, found once per octave instead of once per texel)
    const cx0 = new Int32Array(size), cx1 = new Int32Array(size), csx = new Float64Array(size);
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * freq, x0 = Math.floor(fx), tx = fx - x0;
      cx0[x] = x0 % freq; cx1[x] = (x0 + 1) % freq; csx[x] = tx * tx * (3 - 2 * tx);
    }
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * freq, y0 = Math.floor(fy), ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % freq) * freq, r1 = ((y0 + 1) % freq) * freq;
      for (let x = 0; x < size; x++) {
        const sx = csx[x], i0 = cx0[x], i1 = cx1[x];
        const a = g[r0 + i0], b = g[r0 + i1], c2 = g[r1 + i0], d = g[r1 + i1];
        out[y * size + x] += amp * (a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy);
      }
    }
    norm += amp; amp *= 0.5; freq *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

// R: medium dabs   G: large dabs   B: fine directional bristle strokes   A: soft fbm
export function brushPixels(size = 512) {
  const med = strokeLayer(size, 2600, [26, 60], [12, 26], 0.8, 11, 0.06);
  const big = strokeLayer(size, 520, [70, 150], [36, 70], 0.9, 23, -0.2);
  const fine = strokeLayer(size, 9000, [14, 40], [2.5, 6], 0.5, 37, 0.15);
  const f = fbmLayer(size, 51, 4, 5);
  const d = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    d[i * 4] = med[i * 4];
    d[i * 4 + 1] = big[i * 4];
    d[i * 4 + 2] = fine[i * 4];
    d[i * 4 + 3] = Math.floor(Math.min(1, Math.max(0, (f[i] - 0.5) * 1.9 + 0.5)) * 255);
  }
  return d;
}

// Cloud-shaping noise. R: low fbm  G: mid fbm  B: big dabs (for painterly edge breakup)  A: fine fbm
export function cloudPixels(size = 512) {
  const a = fbmLayer(size, 101, 3, 6);
  const b = fbmLayer(size, 202, 6, 5);
  const c = strokeLayer(size, 1400, [30, 80], [18, 40], 3.14, 77, 0);
  const e = fbmLayer(size, 303, 16, 4);
  const d = new Uint8Array(size * size * 4);
  const cl = (v) => Math.floor(Math.min(1, Math.max(0, (v - 0.5) * 1.8 + 0.5)) * 255);
  for (let i = 0; i < size * size; i++) {
    d[i * 4] = cl(a[i]); d[i * 4 + 1] = cl(b[i]); d[i * 4 + 2] = c[i * 4]; d[i * 4 + 3] = cl(e[i]);
  }
  return d;
}

// Paper / canvas tooth. Tileable, neutral grey = no change.
export function paperPixels(size = 512) {
  // white noise softened once (fibre-scale tooth) plus a faint large-scale mottle
  const R = rng(99);
  const w = new Float32Array(size * size);
  for (let i = 0; i < w.length; i++) w[i] = R();
  const b = fbmLayer(size, 8, 6, 4);
  const d = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const xm = (x + size - 1) % size, xp = (x + 1) % size, ym = (y + size - 1) % size, yp = (y + 1) % size;
    const soft = (w[i] * 2 + w[y * size + xm] + w[y * size + xp] + w[ym * size + x] + w[yp * size + x]) / 6;
    const v = 0.5 + (soft - 0.5) * 1.3 + (b[i] - 0.5) * 0.5;
    const u = Math.floor(Math.min(1, Math.max(0, v)) * 255);
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = u; d[i * 4 + 3] = 255;
  }
  return d;
}
