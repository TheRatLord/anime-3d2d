// CPU replica of windGust() in src/glsl.js: prints the gust at a point over time and a map at one time
const W = { dir: [0.924, -0.383], speed: +process.argv[2] || 4, along: +process.argv[3] || 30, across: 70, lo: +process.argv[4] || 0.46, hi: +process.argv[5] || 0.78 };
const fr = (x) => x - Math.floor(x), f32 = Math.fround;
const h = (x, y) => { let a = fr(x * .1031), b = fr(y * .1031), c = fr(x * .1031); const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d; return fr((a + b) * c); };
const n = (x, y) => { const i = Math.floor(x), j = Math.floor(y); let u = x - i, v = y - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); const m = (a, b, t) => a + (b - a) * t; return m(m(h(i, j), h(i + 1, j), u), m(h(i, j + 1), h(i + 1, j + 1), u), v); };
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gust = (x, z, T) => { const a = x * W.dir[0] + z * W.dir[1], b = -x * W.dir[1] + z * W.dir[0], t = T * W.speed;
  const v = 0.62 * n((a - t) / W.along, b / W.across) + 0.38 * n((a - t * 1.25) / (W.along * 0.45) + 17.3, b / (W.across * 0.4) + 5.1);
  const sw = Math.sin((a - t) / 83 + 1.7) * Math.sin(b / 140 + T * 0.045 + 0.6); return ss(W.lo, W.hi, v + sw * 0.12); };
const ch = ' .:-=+*#%@';
for (const [x, z] of [[-20, 20], [10, 22], [-11, 3], [30, 5]]) { let s = '', sum = 0, c = 0; for (let T = 0; T < 120; T += 0.5) { const g = gust(x, z, T); s += ch[Math.min(9, Math.floor(g * 10))]; sum += g; c += g > 0.3; } console.log(`(${x},${z}) mean ${(sum / 240).toFixed(2)} >0.3: ${(c / 240).toFixed(2)}\n${s}`); }
for (const T of [3, 5]) { console.log('map t=' + T + ' (x -60..60 ->, z -60..60 down; north up)'); for (let z = -60; z <= 60; z += 6) { let s = ''; for (let x = -60; x <= 60; x += 2) s += ch[Math.min(9, Math.floor(gust(x, z, T) * 10))]; console.log(s); } }
