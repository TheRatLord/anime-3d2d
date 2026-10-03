// Frame time of one tree, measured synchronously (N renders then one readPixels). Run it alternately on two trees to compare.
// usage: node tools/xperf.mjs <root> [view ...] [--w --h]
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
const args = process.argv.slice(2); const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const pos = args.filter(a => !a.startsWith('--')); const views = pos.slice(1).length ? pos.slice(1) : ['hero', 'front', 'inside', 'close'];
const W = +(flags.w || 1280), H = +(flags.h || 720);
const s = await createServer({ root: pos[0], logLevel: 'error', server: { port: 0, hmr: false, watch: null, fs: { strict: false } }, resolve: { preserveSymlinks: true } }); await s.listen();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(`http://localhost:${s.httpServer.address().port}/?hud=0`); await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 60000 });
await p.evaluate(() => { window.__app.freeze(3);
  window.__time = (n) => { const A = window.__app, gl = A.renderer.getContext(), px = new Uint8Array(4); A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); for (let i = 0; i < n; i++) A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return (performance.now() - t0) / n; }; });
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const out = [];
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v); await p.waitForTimeout(500);
  const a = []; for (let r = 0; r < 14; r++) a.push(await p.evaluate(() => window.__time(6)));
  out.push(`${v} med ${med(a).toFixed(2)} min ${Math.min(...a).toFixed(2)}`);
}
const tri = await p.evaluate(() => { const o = []; window.__app.scene.traverse(m => { if (m.isMesh && m.geometry.attributes.aFace) o.push(m.geometry.index.count / 3); }); return o.join('+') + '=' + o.reduce((x, y) => x + y, 0); });
console.log(`${W}x${H} ` + out.join(' | ') + ' | stone tris ' + tri);
await b.close(); await s.close();
