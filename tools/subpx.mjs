// Sub-pixel stability: render at yaw 0 and yaw + s px (default 0.5), compare frame B with frame A resampled
// (bilinear) by the same shift. Residual = what flickers/boils when the camera creeps. Central crop only.
// usage: node tools/subpx.mjs <tag> <pos> <look> [--fov=32 --crop=x,y,w,h --q=.. --s=0.5 --gain=4 --zoom=2 --variants="|kuwahara=0|line=0"]
import { chromium } from 'playwright-core';
import fs from 'fs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0]; const V = (s) => s.split(',').map(Number);
const fov = +(flags.fov || 32), s = +(flags.s || 0.5), gain = +(flags.gain || 4), zoom = +(flags.zoom || 2);
const W = 1280, H = 720; const crop = flags.crop ? V(flags.crop) : [480, 260, 320, 200];
const variants = (flags.variants ?? '').split('|');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const cells = [];
for (const q of variants) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:${process.env.PORT || 5311}/?hud=0&grain=0&` + q);
  await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
  await p.evaluate(() => window.__app.freeze(3));
  const P_ = V(pos[1]);
  if (flags.eye) P_[1] = +flags.eye + await p.evaluate(async ([x, z]) => (await import('/src/world.js')).height(x, z), [P_[0], P_[2]]);
  await p.evaluate((v) => window.__app.setView(v), { pos: P_, look: V(pos[2]), fov });
  const wait = () => p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
  const shot = async () => 'data:image/png;base64,' + (await p.screenshot({ clip: { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } })).toString('base64');
  await wait(); const A = await shot();
  await p.evaluate((px) => { const a = window.__app; a.state.yaw += Math.atan(px * 2 * Math.tan(a.camera.fov * Math.PI / 360) / innerHeight); }, s);
  await wait(); const B = await shot();
  cells.push({ q: q || 'full', A, B }); await p.close();
}
const cw = crop[2] * zoom, ch = crop[3] * zoom;
const sheet = await b.newPage({ viewport: { width: cw * 2, height: ch * cells.length }, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#000"><canvas id=c width=${cw * 2} height=${ch * cells.length}></canvas></body>`);
const stats = await sheet.evaluate(async ({ cells, cw, ch, w, h, s, gain }) => {
  const load = (u) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = u; });
  const cv = document.getElementById('c'), cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const tx = tmp.getContext('2d', { willReadFrequently: true });
  const out = [];
  for (let ci = 0; ci < cells.length; ci++) {
    const A = await load(cells[ci].A), B = await load(cells[ci].B);
    tx.drawImage(A, 0, 0); const a = tx.getImageData(0, 0, w, h).data;
    tx.drawImage(B, 0, 0); const bd = tx.getImageData(0, 0, w, h).data;
    let best = null;
    for (const sg of [1, -1]) {
      const d = new ImageData(w, h); let sum = 0, big = 0, cnt = 0;
      const sh = s * sg, i0 = Math.floor(sh), fr = sh - i0;
      for (let y = 0; y < h; y++) for (let x = 2; x < w - 2; x++) {
        const k = (y * w + x) * 4, k0 = (y * w + x - i0) * 4, k1 = k0 - 4; let mx = 0, av = 0;
        for (let c = 0; c < 3; c++) { const pr = a[k0 + c] * (1 - fr) + a[k1 + c] * fr; const e = Math.abs(bd[k + c] - pr); d.data[k + c] = Math.min(255, e * gain); mx = Math.max(mx, e); av += e / 3; }
        d.data[k + 3] = 255; sum += av; cnt++; if (mx > 24) big++;
      }
      const r = { mean: sum / cnt, pct: 100 * big / cnt, d };
      if (!best || r.mean < best.mean) best = r;
    }
    cx.drawImage(B, 0, ci * ch, cw, ch);
    tx.putImageData(best.d, 0, 0); cx.drawImage(tmp, cw, ci * ch, cw, ch);
    cx.fillStyle = '#fff'; cx.font = '14px sans-serif'; cx.fillText(cells[ci].q, cw + 6, ci * ch + 16);
    out.push(`${cells[ci].q}: residual mean ${best.mean.toFixed(3)}  >24: ${best.pct.toFixed(3)}%`);
  }
  return out;
}, { cells, cw, ch, w: crop[2], h: crop[3], s, gain });
fs.writeFileSync(`shots/${tag}-sp.png`, await sheet.screenshot());
console.log(`wrote shots/${tag}-sp.png`); console.log(stats.join('\n'));
await b.close();
