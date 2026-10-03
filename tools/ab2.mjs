// A/B frame time with both pages' own render loops PAUSED, so only the page being timed uses the GPU.
// usage: node tools/ab2.mjs <rootA> <rootB> view|name:az,pitch,fov ... [--rounds=12 --n=20 --w=1280 --h=720]
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import os from 'os';
const args = process.argv.slice(2); const pos = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const roots = pos.slice(0, 2), views = pos.slice(2);
const W = +(flags.w || 1280), H = +(flags.h || 720), N = +(flags.n || 20);
const S = [], P = [], BR = [];
for (const r of roots) {
  const s = await createServer({ root: r, logLevel: 'error', server: { port: 0, hmr: false, watch: null, fs: { strict: false } }, resolve: { preserveSymlinks: true } }); await s.listen(); S.push(s);
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] }); BR.push(b);
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:${s.httpServer.address().port}/?hud=0&${flags.q || ''}`, { timeout: 120000 }); await p.waitForFunction(() => window.__app && window.__app.stat.frames > 10, null, { timeout: 60000 });
  await p.evaluate(() => { window.__app.freeze(3);
    const raf = window.requestAnimationFrame.bind(window); window.__paused = false; window.__pend = null;
    window.requestAnimationFrame = (f) => window.__paused ? (window.__pend = f, 0) : raf(f);
    window.__step = (k) => new Promise((res) => { let i = 0; const g = (t) => { if (window.__pend) { const f = window.__pend; window.__pend = null; f(t); } (++i < k) ? raf(g) : res(); }; raf(g); });
    window.__time = (n) => { const A = window.__app, gl = A.renderer.getContext(), px = new Uint8Array(4); A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); for (let i = 0; i < n; i++) A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return (performance.now() - t0) / n; }; });
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.__paused = true; });
  P.push(p);
}
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const v of views) {
  const res = [[], []];
  for (let k = 0; k < 2; k++) {
    await P[k].evaluate((v) => { const A = window.__app; if (v.includes(':')) { const [az, pitch, fov] = v.split(':')[1].split(',').map(Number), D = Math.PI / 180, ce = Math.cos(pitch * D); A.setView({ pos: [0, 14, 0], look: [ce * Math.cos(az * D) * 100, 14 + Math.sin(pitch * D) * 100, ce * Math.sin(az * D) * 100], fov }); } else A.view(v); }, v);
    await P[k].evaluate(() => window.__step(4));     // let the app's own frame() apply the camera
  }
  for (let r = 0; r < +(flags.rounds || 12); r++) for (let k = 0; k < 2; k++) res[k].push(await P[k].evaluate((n) => window.__time(n), N));
  console.log(`${v.split(':')[0].padEnd(9)} A med ${med(res[0]).toFixed(2)} min ${Math.min(...res[0]).toFixed(2)} | B med ${med(res[1]).toFixed(2)} min ${Math.min(...res[1]).toFixed(2)} | load ${os.loadavg()[0].toFixed(2)}`);
}
for (const b of BR) await b.close(); for (const s of S) await s.close();
