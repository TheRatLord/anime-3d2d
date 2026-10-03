// A/B frame time: node tools/ab.mjs <rootA> <rootB> view... ; alternates A,B per round. Prints medians/min, tri counts, loadavg.
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import os from 'os';
const args = process.argv.slice(2); const pos = args.filter(a => !a.startsWith('--'));
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const roots = pos.slice(0, 2), views = pos.slice(2);
const launch = () => chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const S = [], P = [], BR = [];
for (const r of roots) {
  const s = await createServer({ root: r, logLevel: 'error', server: { port: 0, hmr: false, watch: null, fs: { strict: false } }, resolve: { preserveSymlinks: true } }); await s.listen(); S.push(s);
  const b = await launch(); BR.push(b);
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:${s.httpServer.address().port}/?hud=0`, { timeout: 120000 }); await p.waitForFunction(() => window.__app && window.__app.stat.frames > 10, null, { timeout: 60000 });
  await p.evaluate(() => { window.__app.freeze(3);
    window.__time = (n) => { const A = window.__app, gl = A.renderer.getContext(), px = new Uint8Array(4); A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); for (let i = 0; i < n; i++) A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return (performance.now() - t0) / n; }; });
  P.push(p);
  console.log(r, await p.evaluate(() => { const o = {}; window.__app.scene.traverse(m => { if (m.isMesh) { const g = m.userData.grp || 'other'; const gm = m.geometry; const t = (gm.index ? gm.index.count : gm.attributes.position.count) / 3 * (gm.isInstancedBufferGeometry ? gm.instanceCount : 1); o[g] = (o[g] || 0) + Math.round(t); } }); return JSON.stringify(o) + ' TRUNKS ' + JSON.stringify(window.__trunks); }));
}
const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
for (const v of views) {
  const res = [[], []];
  for (let k = 0; k < 2; k++) { await P[k].evaluate((v) => window.__app.view(v), v); await P[k].waitForTimeout(400); }
  for (let r = 0; r < +(flags.rounds || 12); r++) for (let k = 0; k < 2; k++) { res[k].push(await P[k].evaluate(() => window.__time(8))); }
  console.log(`${v.padEnd(9)} A med ${med(res[0]).toFixed(2)} min ${Math.min(...res[0]).toFixed(2)} | B med ${med(res[1]).toFixed(2)} min ${Math.min(...res[1]).toFixed(2)} | load ${os.loadavg()[0].toFixed(2)}`);
}
for (const b of BR) await b.close(); for (const s of S) await s.close();
