// usage: node tools/gcount.mjs view ...   -> instances drawn per grass mesh (tufts, flowers, strokes) and frame time
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const views = process.argv.slice(2).filter(a => !a.startsWith('--'));
const q = (process.argv.find(a => a.startsWith('--q=')) || '').slice(4);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&' + q);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
await p.evaluate(() => window.__app.freeze(3));
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v);
  // min over 10 chunks of 20 frames (the GPU is shared: the minimum is the least disturbed figure)
  const ms = await p.evaluate(() => new Promise(r => { let n = 0, t0 = 0, best = 1e9; const f = () => { const t = performance.now(); if (n >= 20 && n % 20 === 0) { if (n > 20) best = Math.min(best, (t - t0) / 20); t0 = t; } if (++n > 221) r(best); else requestAnimationFrame(f); }; f(); }));
  console.log(v, JSON.stringify(await p.evaluate(() => window.__grass.drawn())), ms.toFixed(2) + ' ms');
}
await b.close(); await srv.close();
