// usage: node tools/modeseq.mjs <tag>   - toggles the hour and the season with the keys / buttons and captures the dissolve
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const tag = process.argv[2] || 'modeseq';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || /baked/.test(m.text())) errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?t=3');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 20, null, { timeout: 30000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await p.screenshot({ path: `shots/${tag}-0.png` });
let t0 = Date.now();
await p.keyboard.press('KeyN');
await wait(350); await p.screenshot({ path: `shots/${tag}-1-mid.png` });
await wait(1500); await p.screenshot({ path: `shots/${tag}-2-eve.png` });
await p.click('button[title^="Season"]');
await wait(350); await p.screenshot({ path: `shots/${tag}-3-mid.png` });
await wait(1500); await p.screenshot({ path: `shots/${tag}-4-evesnow.png` });
await p.keyboard.press('KeyN');
await wait(1800); await p.screenshot({ path: `shots/${tag}-5-snow.png` });
await p.keyboard.press('KeyM');
await wait(1800); await p.screenshot({ path: `shots/${tag}-6-day.png` });
// hitch: the longest frame during a toggle back to evening (the bake is kept from the first time)
const hitch = await p.evaluate(() => new Promise((res) => { let last = performance.now(), worst = 0, n = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' })); const f = () => { const t = performance.now(); worst = Math.max(worst, t - last); last = t; if (++n < 90) requestAnimationFrame(f); else res(worst); }; requestAnimationFrame(f); }));
console.log('worst frame on a repeated toggle:', hitch.toFixed(1), 'ms');
console.log(errs.join('\n'));
await b.close(); await srv.close();
