// Look (almost) straight up and yaw in place: each frame is rotated back by its yaw, so a crown whose cards
// depend on the camera POSITION only gives identical tiles; cards built from the view axes turn in the tiles.
// usage: PORT=.. node tools/uproll.mjs <tag> <x,y,z> [--fov=50 --n=4 --step=30 --size=400]
// Prints % of pixels (>24/255) differing between tile 0 and each back-rotated tile, inside the inscribed disc.
import { chromium } from 'playwright-core';
import fs from 'fs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const P = pos[1].split(',').map(Number), n = +(flags.n || 4), step = +(flags.step || 30), fov = +(flags.fov || 50), S = +(flags.size || 400);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(`http://localhost:${process.env.PORT}/?hud=0&grain=0&vignette=0`);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
await p.evaluate(() => window.__app.freeze(3));
const imgs = [];
for (let i = 0; i < n; i++) {
  await p.evaluate(([P, fov, yaw]) => { const a = window.__app; a.setView({ pos: P, look: [P[0], P[1] + 10, P[2] - 0.001], fov }); a.state.pitch = Math.PI / 2 - 1e-4; a.state.yaw = yaw; }, [P, fov, (i * step * Math.PI) / 180]);
  await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
  imgs.push('data:image/png;base64,' + (await p.screenshot({ clip: { x: 640 - 360, y: 0, width: 720, height: 720 } })).toString('base64'));
}
const sheet = await b.newPage({ viewport: { width: S * n, height: S }, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#000"><canvas id=c width=${S * n} height=${S}></canvas></body>`);
const out = await sheet.evaluate(async ({ imgs, S, step }) => {
  const load = (s) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
  const cx = document.getElementById('c').getContext('2d'); const D = [];
  for (let i = 0; i < imgs.length; i++) {
    const im = await load(imgs[i]);
    cx.save(); cx.beginPath(); cx.arc(i * S + S / 2, S / 2, S / 2, 0, 7); cx.clip();
    cx.translate(i * S + S / 2, S / 2); cx.rotate((i * step * Math.PI) / 180); cx.drawImage(im, -360, -360); cx.restore();
    D.push(cx.getImageData(i * S, 0, S, S).data);
  }
  return D.slice(1).map((d) => { let big = 0, cnt = 0; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { if (Math.hypot(x - S / 2, y - S / 2) > S / 2 - 4) continue; const k = (y * S + x) * 4; cnt++; if (Math.max(Math.abs(d[k] - D[0][k]), Math.abs(d[k + 1] - D[0][k + 1]), Math.abs(d[k + 2] - D[0][k + 2])) > 24) big++; } return (100 * big / cnt).toFixed(2); });
}, { imgs, S, step });
fs.writeFileSync(`shots/${pos[0]}-uproll.png`, await sheet.screenshot());
console.log(`wrote shots/${pos[0]}-uproll.png; differs from tile 0 after rotating back: ${out.join('%, ')}%`);
await b.close();
