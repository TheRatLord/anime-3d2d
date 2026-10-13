import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage();
await p.goto(srv.url + '?hud=0&prebake=0&workers=0');
await p.waitForFunction(() => window.__app);
const r = await p.evaluate(async () => {
  const ga = await import('/src/extra/grass-atlas.js');
  const out = {};
  for (let i = 0; i < 2; i++) { const t = performance.now(); ga.tuftPixels(256); out['main' + i] = performance.now() - t; }
  const url = new URL('/src/paint.worker.js', location.href).href;
  for (let i = 0; i < 2; i++) {
    const w = new Worker(url, { type: 'module' });
    const t = performance.now();
    await new Promise((res) => { w.onmessage = res; w.postMessage(['tuft']); });
    out['worker' + i] = performance.now() - t; w.terminate();
  }
  return out;
});
console.log(r);
await b.close(); await srv.close();
