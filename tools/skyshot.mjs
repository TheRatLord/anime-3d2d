// Sky review shots at arbitrary directions.
// usage: node tools/skyshot.mjs <tag> name:az,pitch,fov[,x,y,z] ... [--w= --h= --t= --q=]
//   az in degrees, az = atan2(z, x) (0 east, 90 south, -90 north); pitch in degrees; default eye (0,14,0)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const tag = pos[0];
const W = +(flags.w || 1280), H = +(flags.h || 720);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
const times = String(flags.t ?? 3).split(',').map(Number);
// --add='[{...card}]' appends cards to the placement list; name:@view uses a named view
if (flags.add) await p.evaluate((add) => { const m = window.__app.scene.children.find(o => o.userData.setClouds); m.userData.setClouds([...m.userData.list, ...add]); }, JSON.parse(flags.add));
for (const v of pos.slice(1)) {
  const [name, rest] = v.split(':');
  const [az, pitch, fov, x = 0, y = 14, z = 0] = rest.split(',').map(Number);
  const D = Math.PI / 180, ce = Math.cos(pitch * D);
  const view = rest[0] === '@' ? await p.evaluate((n) => window.__app.VIEWS[n], rest.slice(1)) : { pos: [x, y, z], look: [x + ce * Math.cos(az * D) * 100, y + Math.sin(pitch * D) * 100, z + ce * Math.sin(az * D) * 100], fov };
  for (const t of times) {
    await p.evaluate((t) => window.__app.freeze(t), t);
    await p.evaluate((v) => window.__app.setView(v), view);
    await p.evaluate(() => new Promise(r => { let n = 0; const f = () => (++n > 4 ? r() : requestAnimationFrame(f)); f(); }));
    await p.screenshot({ path: `shots/${tag}-${name}${times.length > 1 ? '-t' + t : ''}.png` });
  }
}
console.log('skyMs', await p.evaluate(() => window.__skyMs));
if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].filter(e => !/grass|ReadPixels|404/.test(e)).slice(0, 12).join('\n'));
await b.close(); await srv.close();
