// usage: node tools/modemove.mjs <tag>   - changes hour / season WHILE WALKING and turning; captures the middle of each dissolve
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const tag = process.argv[2] || 'mm';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || /baked/.test(m.text())) errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?t=3&hud=0');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 20, null, { timeout: 30000 });
await p.evaluate(() => { const a = window.__app; a.state.fly = false; a.state.pos.set(6, 1.7, 30); a.state.yaw = 0.25; a.state.pitch = 0.05; });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const worst = () => p.evaluate(() => new Promise((res) => { let last = performance.now(), w = 0, n = 0, s = 0; const f = () => { const t = performance.now(); w = Math.max(w, t - last); s += t - last; last = t; if (++n < 70) requestAnimationFrame(f); else res([w, s / n]); }; requestAnimationFrame(f); }));
let i = 0;
for (const key of ['KeyN', 'KeyM', 'KeyN', 'KeyM', 'KeyN', 'KeyM']) {
  await p.keyboard.down('KeyW');
  await wait(300);
  await p.keyboard.press(key);
  const wp = worst();
  await wait(550);
  await p.evaluate(() => { window.__app.state.yaw += 0.12; });
  await p.screenshot({ path: `shots/${tag}-${i}-mid.png` });
  const [w, avg] = await wp;
  await p.keyboard.up('KeyW');
  await wait(900);
  await p.screenshot({ path: `shots/${tag}-${i}-end.png` });
  console.log(`${key}: worst frame ${w.toFixed(0)} ms, mean ${avg.toFixed(1)} ms during the change`);
  await p.keyboard.down('KeyS'); await wait(700); await p.keyboard.up('KeyS');
  i++;
}
console.log([...new Set(errs)].join('\n'));
await b.close(); await srv.close();
