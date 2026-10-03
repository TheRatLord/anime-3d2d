// Motion audit: frames + consecutive-frame difference images + stats.
// usage: node tools/mdiff.mjs <tag> <x,y,z> <look> <x2,y2,z2> <look2> [--n=6 --fov=32 --crop=x,y,w,h --zoom=1
//        --t0=3 --dt=0 --q=... --gain=4 --nodiff=1 --cols=n]
// Row 1: the n frames (cropped, zoomed, nearest). Row 2: |frame[i]-frame[i-1]| * gain (first cell = |last-first|).
// Prints, per pair: mean abs diff (0..255) and % of pixels whose max-channel diff > 24.
import { chromium } from 'playwright-core';
import fs from 'fs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0];
const V = (s) => s.split(',').map(Number);
const A = V(pos[1]), AL = V(pos[2]), B = V(pos[3] || pos[1]), BL = V(pos[4] || pos[2]);
const n = +(flags.n || 6), fov = +(flags.fov || 32), zoom = +(flags.zoom || 1), gain = +(flags.gain || 4);
const t0 = +(flags.t0 || 3), dt = +(flags.dt || 0);
const W = 1280, H = 720;
const crop = flags.crop ? V(flags.crop) : [0, 0, W, H];
const cols = +(flags.cols || n);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(`http://localhost:${process.env.PORT || 5311}/?hud=0&` + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
const imgs = [];
for (let i = 0; i < n; i++) {
  const t = n === 1 ? 0 : i / (n - 1);
  const L = (a, c) => a.map((v, k) => v + (c[k] - v) * t);
  await p.evaluate((tt) => window.__app.freeze(tt), t0 + dt * i + 1e-4);
  const P_ = L(A, B);
  if (flags.eye) P_[1] = +flags.eye + await p.evaluate(async ([x, z]) => (await import('/src/world.js')).height(x, z), [P_[0], P_[2]]);
  await p.evaluate((v) => window.__app.setView(v), { pos: P_, look: L(AL, BL), fov });
  await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
  let cx0 = crop[0], cy0 = crop[1];
  if (flags.track) {
    // centre the crop on the projection of a world point
    const sp = await p.evaluate((wp) => { const c = window.__app.camera; c.updateMatrixWorld(true);
      const m = c.matrixWorldInverse.clone().invert().invert().elements, P = c.projectionMatrix.elements;
      const v = [0,1,2,3].map(r => m[r]*wp[0] + m[4+r]*wp[1] + m[8+r]*wp[2] + m[12+r]);
      const q = [0,1,2,3].map(r => P[r]*v[0] + P[4+r]*v[1] + P[8+r]*v[2] + P[12+r]*v[3]);
      return [(q[0]/q[3]*0.5+0.5)*innerWidth, (0.5-q[1]/q[3]*0.5)*innerHeight]; }, V(flags.track));
    cx0 = Math.round(Math.min(W - crop[2], Math.max(0, sp[0] - crop[2] / 2)));
    cy0 = Math.round(Math.min(H - crop[3], Math.max(0, sp[1] - crop[3] / 2)));
  }
  const buf = await p.screenshot({ clip: { x: cx0, y: cy0, width: crop[2], height: crop[3] } });
  imgs.push('data:image/png;base64,' + buf.toString('base64'));
}
const cw = crop[2] * zoom, ch = crop[3] * zoom;
const nod = !!flags.nodiff;
const rows = Math.ceil(n / cols) * (nod ? 1 : 2);
const sheet = await b.newPage({ viewport: { width: cw * cols, height: ch * rows }, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#000;font-size:0"><canvas id=c width=${cw * cols} height=${ch * rows}></canvas></body>`);
const stats = await sheet.evaluate(async ({ imgs, cw, ch, cols, gain, w, h, nod }) => {
  const load = (s) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
  const ims = await Promise.all(imgs.map(load));
  const cv = document.getElementById('c'), cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const tx = tmp.getContext('2d', { willReadFrequently: true });
  const data = ims.map(im => { tx.drawImage(im, 0, 0); return tx.getImageData(0, 0, w, h); });
  const rr = Math.ceil(ims.length / cols);
  const out = [];
  ims.forEach((im, i) => {
    const cxp = (i % cols) * cw, cyp = Math.floor(i / cols) * ch * (nod ? 1 : 2);
    cx.drawImage(im, cxp, cyp, cw, ch);
    if (nod && i === 0) return;
    const a = data[i], bb = data[i === 0 ? ims.length - 1 : i - 1];
    const d = tx.createImageData(w, h);
    let sum = 0, big = 0;
    for (let k = 0; k < a.data.length; k += 4) {
      const r = Math.abs(a.data[k] - bb.data[k]), g = Math.abs(a.data[k + 1] - bb.data[k + 1]), b2 = Math.abs(a.data[k + 2] - bb.data[k + 2]);
      d.data[k] = Math.min(255, r * gain); d.data[k + 1] = Math.min(255, g * gain); d.data[k + 2] = Math.min(255, b2 * gain); d.data[k + 3] = 255;
      sum += (r + g + b2) / 3; if (Math.max(r, g, b2) > 24) big++;
    }
    out.push({ i, mean: +(sum / (w * h)).toFixed(3), pct: +((100 * big) / (w * h)).toFixed(3) });
    if (!nod) { tx.putImageData(d, 0, 0); cx.drawImage(tmp, cxp, cyp + ch, cw, ch); }
  });
  return out;
}, { imgs, cw, ch, cols, gain, w: crop[2], h: crop[3], nod });
fs.writeFileSync(`shots/${tag}-md.png`, await sheet.screenshot());
console.log(`wrote shots/${tag}-md.png  (${cw * cols}x${ch * rows})`);
console.log(stats.map(s => `${s.i === 0 ? 'last-first' : (s.i - 1) + '->' + s.i}: mean ${s.mean}  >24: ${s.pct}%`).join('\n'));
await b.close();
