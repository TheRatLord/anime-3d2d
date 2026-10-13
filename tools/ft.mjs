// usage: node ft.mjs "<query>" [view] [WxH]   -> median synced frame ms
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const [q = '', view = 'hero', size = '1280x720'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3&' + q);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 90000 });
await p.waitForTimeout(4000);
await p.evaluate((v) => window.__app.view(v), view);
await p.waitForTimeout(500);
const win = () => p.evaluate(() => new Promise(r => { const gl = window.__app.renderer.getContext(), px = new Uint8Array(4); let n = 0, t0; const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (n === 10) t0 = performance.now(); if (++n >= 70) r((performance.now() - t0) / 60); else requestAnimationFrame(f); }; f(); }));
const w = []; for (let i = 0; i < 7; i++) w.push(await win());
w.sort((a, b) => a - b); const ms = w[3];
console.log(`${(q || 'default').padEnd(28)} ${view} ${size}  ${ms.toFixed(2)} ms  (min ${w[0].toFixed(2)} max ${w[6].toFixed(2)})`);
await b.close(); await srv.close();
