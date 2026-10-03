// Motion-stability contact sheet.
// usage: node tools/seq.mjs <tag> <x,y,z> <lookx,looky,lookz> <x2,y2,z2> <look2> [--n=6 --fov=32 --crop=x,y,w,h --cols=3 --q=...]
// Renders n frames interpolating camera A -> B and tiles them (optionally cropped) into shots/<tag>-seq.png
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
import fs from 'fs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0];
const V = (s) => s.split(',').map(Number);
const A = V(pos[1]), AL = V(pos[2]), B = V(pos[3]), BL = V(pos[4]);
const n = +(flags.n || 6), cols = +(flags.cols || 3), fov = +(flags.fov || 32);
const W = 1280, H = 720;
const crop = flags.crop ? V(flags.crop) : [0, 0, W, H];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
await p.evaluate(() => window.__app.freeze(3));
const imgs = [];
for (let i = 0; i < n; i++) {
  const t = n === 1 ? 0 : i / (n - 1);
  const L = (a, c) => a.map((v, k) => v + (c[k] - v) * t);
  await p.evaluate((v) => window.__app.setView(v), { pos: L(A, B), look: L(AL, BL), fov });
  await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
  const buf = await p.screenshot({ clip: { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } });
  imgs.push('data:image/png;base64,' + buf.toString('base64'));
}
const rows = Math.ceil(n / cols);
const sheet = await b.newPage({ viewport: { width: crop[2] * cols, height: crop[3] * rows }, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#000;font-size:0">${imgs.map(s => `<img src="${s}" style="width:${crop[2]}px;height:${crop[3]}px">`).join('')}</body>`);
await sheet.waitForFunction(() => [...document.images].every(i => i.complete));
fs.writeFileSync(`shots/${tag}-seq.png`, await sheet.screenshot());
console.log(`wrote shots/${tag}-seq.png (${n} frames, crop ${crop.join(',')})`);
await b.close();
await srv.close();
