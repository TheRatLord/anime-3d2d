// usage: node tools/gshot.mjs <tag> [view ...]   (named views from src/views.js plus the critic's custom cameras)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const CUSTOM = {
  nosewall: { pos: [-3.6, 1.6, -3.1], look: [-5, 1.5, -3.1], fov: 40 },
  graze: { pos: [-5.9, 1.6, 8.5], look: [-5.55, 3, -9], fov: 40 },
  upinside: { pos: [0, 1.6, -2], look: [0.01, 30, -2.6], fov: 55 },
  northgraze: { pos: [-4.2, 1.6, -11.2], look: [5, 4.5, -9.7], fov: 40 },
  doorview: { pos: [0, 1.6, -6], look: [0.5, 1.5, 30], fov: 40 },
  floordown: { pos: [0, 1.7, -3], look: [0.2, 0, -3.3], fov: 50 },
  noserubble: { pos: [7.6, 0.8, 0.6], look: [6.6, 0.3, -1.2], fov: 40 },
  gableup: { pos: [0, 1.6, -4], look: [0, 10, -9], fov: 45 },
  archwest: { pos: [3, 1.6, -1], look: [-20, 1.6, -0.8], fov: 40 },
  buttress: { pos: [7.6, 1.5, -11.2], look: [5.2, 1.6, -9.5], fov: 40 },
  rake: { pos: [6, 1.6, 10], look: [-1, 10.5, -9], fov: 14 },
  colcap: { pos: [0.5, 1.6, 0.5], look: [-2.6, 5.6, -3.6], fov: 30 },
  drum: { pos: [2.2, 1.2, 0.8], look: [1.2, 0.3, -1.7], fov: 40 },
  crossnear: { pos: [-2.6, 1.5, 17.2], look: [-4.2, 1.2, 14.5], fov: 40 },
  heapE: { pos: [10.5, 1.4, 4.5], look: [7, 0.3, 0.5], fov: 40 },
  eaststub: { pos: [10, 1.6, 6], look: [5, 1, 2], fov: 36 },
  topfloor: { pos: [0, 24, 0.5], look: [0, 0, -0.5], fov: 45 },
};
const srv = await serve();
const args = process.argv.slice(2);
const tag = args[0]; const views = args.slice(1);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
const t0 = Date.now();
await p.goto(srv.url + '?hud=0');
try { await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 40000 }); }
catch (e) { console.log('LOAD FAILED\n' + errs.join('\n')); await b.close(); await srv.close(); process.exit(1); }
console.log('load ms', Date.now() - t0);
await p.evaluate(() => window.__app.freeze(3));
for (const v of views) {
  if (CUSTOM[v]) await p.evaluate((c) => window.__app.setView(c), CUSTOM[v]);
  else await p.evaluate((v) => window.__app.view(v), v);
  await p.evaluate(() => new Promise(r => { let n = 0; const f = () => (++n > 4 ? r() : requestAnimationFrame(f)); f(); }));
  await p.screenshot({ path: `shots/${tag}-${v}.png` });
}
const tris = await p.evaluate(() => { const out = []; window.__app.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.aFace) out.push(o.geometry.index.count / 3); }); return out; });
console.log('stone-mesh triangles:', tris.join(' + '), '=', tris.reduce((a, c) => a + c, 0));
const ms = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => (++n >= 60 ? r((performance.now() - t0) / 60) : requestAnimationFrame(f)); f(); }));
console.log(`frame: ${ms.toFixed(2)} ms`);
if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
await b.close(); await srv.close();
