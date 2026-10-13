// GPU time per pipeline pass (synced with readPixels after each, so sums exceed a real frame). usage: node tools/passes.mjs [view] [--q=..]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const view = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'hero';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12);
await p.waitForTimeout(5000);
await p.evaluate((v) => window.__app.view(v), view);
const out = await p.evaluate(async () => {
  const { pipe, renderer, scene, camera } = window.__app, gl = renderer.getContext(), px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const acc = {}; let n = 0;
  const names = new Map([[pipe.kuw, 'kuwahara'], [pipe.depthDown, 'depthDown'], [pipe.litDown, 'litDown'], [pipe.blur, 'blur'], [pipe.comp, 'composite'], [pipe.bright, 'bright'], [pipe.final, 'final']]);
  const orig = pipe._fs.bind(pipe);
  pipe._fs = (m, t) => { sync(); const a = performance.now(); orig(m, t); sync(); const k = names.get(m); acc[k] = (acc[k] || 0) + performance.now() - a; };
  const origR = renderer.render.bind(renderer);
  renderer.render = (s, c) => { if (s === scene) { sync(); const a = performance.now(); origR(s, c); sync(); acc.scene = (acc.scene || 0) + performance.now() - a; } else origR(s, c); };
  await new Promise((r) => { const f = () => (++n > 60 ? r() : requestAnimationFrame(f)); f(); });
  for (const k in acc) acc[k] /= 60;
  return acc;
});
for (const [k, v] of Object.entries(out).sort((a, c) => c[1] - a[1])) console.log(v.toFixed(2).padStart(7), 'ms', k);
await b.close(); await srv.close();
