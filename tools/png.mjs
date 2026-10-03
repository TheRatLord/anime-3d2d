// Minimal PNG read / write for the test tools (8-bit RGB or RGBA, not interlaced).
import fs from 'fs';
import zlib from 'zlib';

// file path or Buffer -> { w, h, bpp, d } (d: rows top to bottom, bpp bytes per pixel)
export function readPng(src) {
  const b = typeof src === 'string' ? fs.readFileSync(src) : src;
  let o = 8, w, h, ct; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(h * st);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], r = y * (st + 1) + 1, p = y * st;
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? out[p + x - bpp] : 0, u = y ? out[p - st + x] : 0, c = x >= bpp && y ? out[p - st + x - bpp] : 0;
      let v = raw[r + x];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const q = a + u - c, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      out[p + x] = v;
    }
  }
  return { w, h, bpp, d: out };
}

let TAB = null;
function crc(buf) {
  if (!TAB) TAB = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
// rgb: w * h * 3 bytes, rows top to bottom
export function writePng(file, w, h, rgb) {
  const st = w * 3, rows = Buffer.alloc(h * (st + 1));
  for (let y = 0; y < h; y++) Buffer.from(rgb.buffer, rgb.byteOffset + y * st, st).copy(rows, y * (st + 1) + 1);
  const chunk = (type, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]));
}
