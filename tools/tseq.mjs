// Time sequence from fixed cameras. usage: node tools/tseq.mjs <tag> <view...> [--t0=0 --dt=5 --n=12 --q=...]
// writes shots/<tag>-<view>-NN.png
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0], views = pos.slice(1);
const t0 = +(flags.t0 || 0), dt = +(flags.dt || 5), n = +(flags.n || 12);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 10, null, { timeout: 60000 });
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.__app.freeze(t), t0 + i * dt);
    await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
    await p.screenshot({ path: `shots/${tag}-${v}-${String(i).padStart(2, '0')}.png` });
  }
}
if (errs.length) console.log([...new Set(errs)].slice(0, 8).join('\n'));
await b.close(); await srv.close();
