// Time sequence from a fixed camera (wind review).
// usage: node tools/wseq.mjs <tag> <view> [--t0=0 --t1=20 --dt=0.5 --q=wind=1 --crop=x,y,w,h]
// writes shots/<tag>/f000.png ... (one frame per time step, ambient time frozen at each t)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import fs from 'fs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const [tag, view] = args.filter(a => !a.startsWith('--'));
const t0 = +(flags.t0 ?? 0), t1 = +(flags.t1 ?? 20), dt = +(flags.dt ?? 0.5);
const W = 1280, H = 720, crop = flags.crop ? flags.crop.split(',').map(Number) : [0, 0, W, H];
fs.mkdirSync(`shots/${tag}`, { recursive: true });
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 10, null, { timeout: 60000 });
if (flags.pos) await p.evaluate((v) => window.__app.setView(v), { pos: flags.pos.split(',').map(Number), look: flags.look.split(',').map(Number), fov: +(flags.fov || 32) });
else await p.evaluate((v) => window.__app.view(v), view);
let i = 0;
for (let t = t0; t <= t1 + 1e-6; t += dt, i++) {
  await p.evaluate((t) => window.__app.freeze(t), t);
  await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
  await p.screenshot({ path: `shots/${tag}/f${String(i).padStart(3, '0')}.png`, clip: { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } });
}
console.log(`${i} frames -> shots/${tag}/`);
if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
await b.close(); await srv.close();
