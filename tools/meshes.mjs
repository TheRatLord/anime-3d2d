import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12);
await p.waitForTimeout(5000);
await p.evaluate((v) => window.__app.view(v), process.argv[2] || 'hero');
const ms = () => p.evaluate(() => new Promise(r => { const gl = window.__app.renderer.getContext(), px = new Uint8Array(4); let n = 0, t0; const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (n === 10) t0 = performance.now(); if (++n >= 70) r((performance.now() - t0) / 60); else requestAnimationFrame(f); }; f(); }));
const base = await ms();
const n = await p.evaluate(() => { window.__m = []; window.__app.scene.traverse(o => { if (o.isMesh && o.visible) window.__m.push(o); }); return window.__m.length; });
console.log('base', base.toFixed(2), 'meshes', n);
const rows = [];
for (let i = 0; i < n; i++) {
  const info = await p.evaluate((i) => { const o = window.__m[i]; o.visible = false; const g = o.geometry, m = o.material; return `${o.name || ''} ${m.type} ${g.isInstancedBufferGeometry ? 'inst ' + g.instanceCount : 'verts ' + (g.attributes.position?.count ?? 0)} src=${(m.fragmentShader||'').length}/${(m.vertexShader||'').match(/uSnow < 0\.5\) *\{? *gl_Position|uSnow/)?'snowvs':''} ${Object.keys(m.uniforms||{}).slice(0,3).join(',')} tr=${m.transparent ? 1 : 0} side=${m.side} dt=${m.depthTest} aTc=${m.alphaToCoverage ? 1 : 0}`; }, i);
  const t = await ms();
  await p.evaluate((i) => { window.__m[i].visible = true; }, i);
  rows.push([base - t, i, info]);
}
rows.sort((a, c) => c[0] - a[0]);
for (const r of rows) console.log(`${r[0].toFixed(2).padStart(6)} ms  #${r[1]} ${r[2]}`);
await b.close(); await srv.close();
