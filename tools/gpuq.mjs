// GPU time per pipeline pass with EXT_disjoint_timer_query_webgl2. usage: node tools/gpuq.mjs [view]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const view = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'hero';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--enable-webgl-developer-extensions', '--disable-gpu-watchdog'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12);
await p.waitForTimeout(5000);
await p.evaluate((v) => window.__app.view(v), view);
const out = await p.evaluate(async () => {
  const { pipe, renderer, scene } = window.__app, gl = renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return 'no timer query';
  const names = new Map([[pipe.kuw, 'kuwahara'], [pipe.depthDown, 'depthDown'], [pipe.litDown, 'litDown'], [pipe.blur, 'blur'], [pipe.comp, 'composite'], [pipe.bright, 'bright'], [pipe.final, 'final']]);
  let pending = [], acc = {};
  const timed = (k, fn) => { const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); fn(); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([k, q]); };
  const orig = pipe._fs.bind(pipe);
  pipe._fs = (m, t) => timed(names.get(m), () => orig(m, t));
  const origR = renderer.render.bind(renderer);
  renderer.render = (s, c) => { if (s === scene && !renderer.getRenderTarget()?.isShadow) timed(renderer.getRenderTarget() === pipe.gbuf ? 'scene' : 'other', () => origR(s, c)); else origR(s, c); };
  const frames = 40; let n = 0;
  await new Promise((r) => { const f = () => { if (++n > frames) return r(); requestAnimationFrame(() => { drain(); f(); }); }; f(); });
  function drain() { const keep = []; for (const [k, q] of pending) { if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) { acc[k] = (acc[k] || 0) + gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(q); } else keep.push([k, q]); } pending = keep; }
  await new Promise((r) => setTimeout(r, 500)); drain();
  for (const k in acc) acc[k] /= frames;
  return acc;
});
console.log(out);
await b.close(); await srv.close();
