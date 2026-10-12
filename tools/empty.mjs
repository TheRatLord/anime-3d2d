import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12);
await p.waitForTimeout(5000);
const ms = () => p.evaluate(() => new Promise(r => { const gl = window.__app.renderer.getContext(), px = new Uint8Array(4); let n = 0, t0; const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (n === 10) t0 = performance.now(); if (++n >= 90) r((performance.now() - t0) / 80); else requestAnimationFrame(f); }; f(); }));
console.log('full', (await ms()).toFixed(2));
await p.evaluate(() => { window.__m = []; window.__app.scene.traverse(o => { if (o.isMesh && o.visible) { window.__m.push(o); o.visible = false; } }); });
console.log('no meshes', (await ms()).toFixed(2));
await p.evaluate(() => { window.__app.params.kuwahara = 0; });
console.log('no meshes, no kuwahara', (await ms()).toFixed(2));
await b.close(); await srv.close();
