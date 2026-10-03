// Run-to-run noise: loads the page twice per configuration and counts the pixels that differ between the two
// loads, per view. usage: node tools/noise.mjs [view,view,...] [query query ...]   ('' = the default picture)
import { chromium } from 'playwright-core';
import { readPng as png } from './png.mjs';
import { serve } from './serve.mjs';
const srv = await serve();
const views = (process.argv[2] || 'meadow,farSE').split(',');
const configs = process.argv.length > 3 ? process.argv.slice(3) : [''];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
async function load(q) {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await p.goto(srv.url + '?hud=0&' + q);
  await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 60000 });
  if (process.env.SETTLE) await p.evaluate(() => window.__app.settled?.());
  await p.evaluate(() => window.__app.freeze(3));
  const out = [];
  for (const v of views) {
    await p.evaluate((v) => window.__app.view(v), v);
    await p.evaluate(() => new Promise(r => { let n = 0; const f = () => (++n > 4 ? r() : requestAnimationFrame(f)); f(); }));
    out.push(png(await p.screenshot()));
  }
  await p.close();
  return out;
}
for (const q of configs) {
  const A = await load(q), B = await load(q);
  const res = views.map((v, i) => { const a = A[i], c = B[i]; let n = 0, mx = 0;
    for (let k = 0; k < a.w * a.h; k++) { let m = 0; for (let j = 0; j < 3; j++) m = Math.max(m, Math.abs(a.d[k * a.bpp + j] - c.d[k * c.bpp + j])); if (m) n++; if (m > mx) mx = m; }
    return `${v}: ${n} px (max ${mx})`; });
  console.log(`[${q || 'default'}]  ${res.join('   ')}`);
}
await b.close(); await srv.close();
