// usage: node tools/dbg.mjs <tag> name:pos:look:fov ... [--js="code run in page before shooting"] [--crop=x,y,w,h] (pos/look as x,y,z; or name=view name)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0];
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
await p.evaluate(() => window.__app.freeze(3));
if (flags.js) console.log('js ->', JSON.stringify(await p.evaluate(flags.js)));
const V = (s) => s.split(',').map(Number);
for (const v of pos.slice(1)) {
  const [name, a, l, fov] = v.split(':');
  if (a) await p.evaluate((v) => window.__app.setView(v), { pos: V(a), look: V(l), fov: +(fov || 40) });
  else await p.evaluate((v) => window.__app.view(v), name);
  await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 4 ? r() : requestAnimationFrame(f)); f(); }));
  const o = { path: `shots/${tag}-${name}.png` };
  if (flags.crop) { const c = V(flags.crop); o.clip = { x: c[0], y: c[1], width: c[2], height: c[3] }; }
  await p.screenshot(o);
}
if (errs.length) console.log('ERR:\n' + [...new Set(errs)].slice(0, 10).join('\n'));
await b.close(); await srv.close();
