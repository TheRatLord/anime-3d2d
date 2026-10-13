// Value noise, fractal noise and the height of the hill (no dependencies: the builders that run in worker threads,
// src/paint.worker.js, use them too; src/world.js re-exports them).
export function h2(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, z) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const tx = x - x0, tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = h2(x0, z0), b = h2(x0 + 1, z0), c = h2(x0, z0 + 1), d = h2(x0 + 1, z0 + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
// A value noise that remembers the lattice cell it read last (the same values as vnoise): for the call site that
// walks a field in order, the four corners are hashed once per cell instead of once per sample.
export function cachedNoise() {
  let cx = NaN, cz = NaN, a = 0, b = 0, c = 0, d = 0;
  return (x, z) => {
    const x0 = Math.floor(x), z0 = Math.floor(z);
    if (x0 !== cx || z0 !== cz) { cx = x0; cz = z0; a = h2(x0, z0); b = h2(x0 + 1, z0); c = h2(x0, z0 + 1); d = h2(x0 + 1, z0 + 1); }
    const tx = x - x0, tz = z - z0;
    const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
}
export function fbm(x, z, oct = 4) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The hill: a gentle plateau at the origin that rolls away on all sides.
export function height(x, z) {
  const r = Math.hypot(x, z * 0.92);
  let h = -24 * Math.pow(smooth(13, 95, r), 1.25);
  h += (fbm(x * 0.022 + 3.1, z * 0.022 - 1.7) - 0.5) * 16 * smooth(18, 70, r);
  h += (fbm(x * 0.11, z * 0.11) - 0.5) * 0.9 * smooth(7, 16, r);
  h += (fbm(x * 0.5 + 9, z * 0.5) - 0.5) * 0.12;
  return h;
}
