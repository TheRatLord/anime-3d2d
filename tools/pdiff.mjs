// usage: node pdiff.mjs <tagA> <tagB> view...   -> per view: mean abs diff, % pixels with max-channel diff > 8
import { readPng as png } from './png.mjs';
const [A, B, ...views] = process.argv.slice(2); let worst = 0;
for (const v of views) { const a = png(`shots/${A}-${v}.png`), b = png(`shots/${B}-${v}.png`); let s = 0, n = 0, mx = 0;
  for (let i = 0; i < a.w * a.h; i++) { let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(a.d[i * a.bpp + k] - b.d[i * b.bpp + k]); s += d; if (d > m) m = d; } if (m > 8) n++; if (m > mx) mx = m; }
  const pct = 100 * n / (a.w * a.h); worst = Math.max(worst, pct);
  console.log(`${v.padEnd(10)} mean ${(s / (a.w * a.h * 3)).toFixed(4)}  >8: ${pct.toFixed(3)}%  max ${mx}`); }
console.log('worst %', worst.toFixed(3));
