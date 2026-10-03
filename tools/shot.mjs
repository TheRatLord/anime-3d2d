// usage: node tools/shot.mjs <tag> [view ...] [--w=1280 --h=720] [--q=key=val&...]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0] || 'shot';
let views = pos.slice(1);
const W = +(flags.w || 1280), H = +(flags.h || 720);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
try { await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 }); }
catch (e) { console.log('LOAD FAILED'); console.log(errs.join('\n')); await b.close();
await srv.close(); process.exit(1); }
if (!views.length || views[0] === 'all') views = await p.evaluate(() => Object.keys(window.__app.VIEWS));
await p.evaluate((t) => window.__app.freeze(t), +(flags.t || 3));
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v);
  await p.evaluate(() => new Promise(r => { let n = 0; const f = () => (++n > 4 ? r() : requestAnimationFrame(f)); f(); }));
  await p.screenshot({ path: `shots/${tag}-${v}.png` });
}
// frame time on the last view (vsync disabled)
const ms = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => (++n >= 60 ? r((performance.now() - t0) / 60) : requestAnimationFrame(f)); f(); }));
console.log(`gpu: ${await p.evaluate(() => window.__app.gpu())}`);
console.log(`frame: ${ms.toFixed(2)} ms @ ${W}x${H} (${views[views.length - 1]})`);
if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
await b.close();
await srv.close();
