// Per-mesh cost: hide each scene mesh in turn and report the change in frame time.
// usage: node tools/perf.mjs [view] [--w=1920 --h=1080]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const view = args.find(a => !a.startsWith('--')) || 'hero';
const W = +(flags.w || 1280), H = +(flags.h || 720);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
await p.waitForTimeout(4000);
await p.evaluate((v) => { window.__app.view(v); }, view);
const ms = () => p.evaluate(() => new Promise(r => { const gl = window.__app.renderer.getContext(), px = new Uint8Array(4); let n = 0, t0; const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (n === 20) t0 = performance.now(); if (++n >= 140) r((performance.now() - t0) / 120); else requestAnimationFrame(f); }; f(); }));
const base = await ms();
console.log(`${view} ${W}x${H} baseline ${base.toFixed(2)} ms`);
const n = await p.evaluate(() => { window.__m = []; window.__app.scene.traverse(o => { if (o.isMesh) window.__m.push(o); }); return window.__m.length; });
const rows = [];
for (let i = 0; i < n; i++) {
  const info = await p.evaluate((i) => { const o = window.__m[i]; o.visible = false; const g = o.geometry; return `${g.instanceCount !== undefined && g.isInstancedBufferGeometry ? 'inst ' + g.instanceCount : 'verts ' + (g.attributes.position?.count ?? 0)}`; }, i);
  const t = await ms();
  await p.evaluate((i) => { window.__m[i].visible = true; }, i);
  rows.push([base - t, i, info]);
}
rows.sort((a, c) => c[0] - a[0]);
for (const r of rows.slice(0, 14)) console.log(`  -${r[0].toFixed(2)} ms  mesh#${r[1]} ${r[2]}`);
for (const [k, v] of [['kuwahara', 0], ['msaa', 0]]) {
  // post toggles (msaa needs a reload, so only kuwahara here)
  if (k !== 'kuwahara') continue;
  await p.evaluate(() => { window.__app.params.kuwahara = 0; }); const t = await ms(); await p.evaluate(() => { window.__app.params.kuwahara = 3; });
  console.log(`  -${(base - t).toFixed(2)} ms  paint filter`);
}
await b.close();
await srv.close();
