// CPU (JS submit) time of pipe.render vs. synced GPU frame time. usage: node tools/cpuft.mjs "<query>"
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const q = process.argv[2] || '';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3&' + q);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 90000 });
await p.waitForTimeout(4000);
const r = await p.evaluate(() => { const a = window.__app, pipe = a.pipe; const orig = pipe.render.bind(pipe); let t = 0, n = 0;
  pipe.render = (...x) => { const s = performance.now(); orig(...x); t += performance.now() - s; n++; };
  const info = a.renderer.info;
  return new Promise(res => setTimeout(() => { pipe.render = orig; res({ cpuMs: t / n, n, calls: info.render.calls, tris: info.render.triangles }); }, 3000)); });
console.log(JSON.stringify(r));
await b.close(); await srv.close();
