// Procedural "paint" textures, generated once on the CPU with canvas 2D.
// Everything painterly in the scene samples these instead of computing noise per pixel
// (cheap on an integrated GPU) and, more importantly, they are made of *strokes*, not
// of smooth noise, so thresholding them yields brush-shaped edges.
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
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
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * freq, y0 = Math.floor(fy), ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * freq, x0 = Math.floor(fx), tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const a = g[(y0 % freq) * freq + (x0 % freq)];
        const b = g[(y0 % freq) * freq + ((x0 + 1) % freq)];
        const c2 = g[((y0 + 1) % freq) * freq + (x0 % freq)];
        const d = g[((y0 + 1) % freq) * freq + ((x0 + 1) % freq)];
        out[y * size + x] += amp * (a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy);
      }
    }
    norm += amp; amp *= 0.5; freq *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

function dataTex(data, size, opts = {}) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = opts.aniso ?? 4;
  t.needsUpdate = true;
  return t;
}

// R: medium dabs   G: large dabs   B: fine directional bristle strokes   A: soft fbm
export function makeBrushTexture(size = 512) {
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
  return dataTex(d, size);
}

// Cloud-shaping noise. R: low fbm  G: mid fbm  B: big dabs (for painterly edge breakup)  A: fine fbm
export function makeCloudTexture(size = 512) {
  const a = fbmLayer(size, 101, 3, 6);
  const b = fbmLayer(size, 202, 6, 5);
  const c = strokeLayer(size, 1400, [30, 80], [18, 40], 3.14, 77, 0);
  const e = fbmLayer(size, 303, 16, 4);
  const d = new Uint8Array(size * size * 4);
  const cl = (v) => Math.floor(Math.min(1, Math.max(0, (v - 0.5) * 1.8 + 0.5)) * 255);
  for (let i = 0; i < size * size; i++) {
    d[i * 4] = cl(a[i]); d[i * 4 + 1] = cl(b[i]); d[i * 4 + 2] = c[i * 4]; d[i * 4 + 3] = cl(e[i]);
  }
  return dataTex(d, size, { aniso: 1 });
}

// Atlas of leaf-clump cards (2x2). R = per-leaf random tone, A = coverage.
// Each clump is a pile of small opaque leaf dabs, denser in the middle, so the alpha
// silhouette is ragged in the way a foliage brush leaves it.
export function makeLeafAtlas(cell = 256) {
  const size = cell * 2;
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (let v = 0; v < 4; v++) {
    const R = rng(500 + v * 17);
    const ox = (v % 2) * cell + cell / 2, oy = Math.floor(v / 2) * cell + cell / 2;
    const n = 150;
    for (let i = 0; i < n; i++) {
      // sqrt-less radius => denser centre
      const rr = Math.pow(R(), 0.75) * cell * 0.4;
      const th = R() * Math.PI * 2;
      const squash = 0.78;
      const x = ox + Math.cos(th) * rr, y = oy + Math.sin(th) * rr * squash;
      const len = cell * (0.075 + R() * 0.075), wid = len * (0.42 + R() * 0.25);
      // leaves lean outward/downward a little, like hanging foliage
      const ang = th + (R() - 0.5) * 1.6;
      const g = Math.floor(R() * 256);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = `rgba(${g},${g},${g},1)`;
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.quadraticCurveTo(0, -wid, len / 2, 0);
      ctx.quadraticCurveTo(0, wid, -len / 2, 0);
      ctx.fill();
      ctx.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Atlas of grass tufts (4x1). R = per-blade tone, A = coverage. Blades fan from the base centre.
export function makeGrassAtlas(cell = 256) {
  const c = canvas(cell * 4, cell);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cell * 4, cell);
  for (let v = 0; v < 4; v++) {
    const R = rng(900 + v * 31);
    const ox = v * cell + cell / 2;
    const n = 15 + Math.floor(R() * 8);
    const blades = [];
    for (let i = 0; i < n; i++) blades.push({ t: (i + R() * 0.9) / n, h: 0.35 + R() * 0.6, g: Math.floor(R() * 256) });
    blades.sort((a, b) => b.h - a.h); // tall ones behind
    for (const b of blades) {
      const lean = (b.t - 0.5) * 1.3 + (R() - 0.5) * 0.5;
      const bx = ox + (b.t - 0.5) * cell * 0.42;
      const h = b.h * cell * 0.96;
      const w = cell * (0.016 + R() * 0.02);
      const curl = (R() - 0.5) * 0.5 + lean * 0.5;
      const tipx = bx + lean * h * 0.38 + curl * h * 0.25, tipy = cell - h;
      const midx = bx + lean * h * 0.10, midy = cell - h * 0.6;
      ctx.fillStyle = `rgba(${b.g},${b.g},${b.g},1)`;
      ctx.beginPath();
      ctx.moveTo(bx - w, cell);
      ctx.quadraticCurveTo(midx - w * 1.1, midy, tipx, tipy);
      ctx.quadraticCurveTo(midx + w * 1.1, midy, bx + w, cell);
      ctx.closePath();
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Paper / canvas tooth. Tileable, neutral grey = no change.
export function makePaperTexture(size = 512) {
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
  const t = dataTex(d, size, { aniso: 1 });
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
