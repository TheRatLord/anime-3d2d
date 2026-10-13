// bounding box + count of pixels that differ by > 8 between two shots. usage: node tools/where.mjs <tagA> <tagB> <view>
import { readPng as png } from './png.mjs';
const [A, B, v] = process.argv.slice(2); const a = png(`shots/${A}-${v}.png`), b = png(`shots/${B}-${v}.png`);
let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
for (let i = 0; i < a.w * a.h; i++) { let m = 0; for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(a.d[i * a.bpp + k] - b.d[i * b.bpp + k])); if (m > 8) { n++; const x = i % a.w, y = (i / a.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
console.log(`${n} px, box x ${x0}-${x1} y ${y0}-${y1}`);
