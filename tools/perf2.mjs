// usage: PORT=.. node perf2.mjs setups.js view... [--w --h --rounds --n]
// setups.js exports default { name: 'js source run in page (may use window.__grp)', ... }; each config is applied before timing.
import { chromium } from '/home/david/anime-3d2d/node_modules/playwright-core/index.mjs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const pos = args.filter(a => !a.startsWith('--'));
const setups = (await import(pos[0])).default; const views = pos.slice(1);
const W = +(flags.w || 1280), H = +(flags.h || 720);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('PAGEERROR ' + e.message));
await p.goto(`http://localhost:${process.env.PORT}/?hud=0&` + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 60000 });
await p.evaluate(() => window.__app.freeze(3));
await p.evaluate(() => {
  const grp = (m) => {
    const u = m.material?.uniforms || {}, fs = m.material?.fragmentShader || '';
    if (u.uLeaf) return 'leaf'; if (u.uOlive) return 'trunk';
    if (u.uHill) return 'far'; if (u.uAtlas) return 'far'; if (u.uCol2) return 'far'; if (u.uTex && u.uC) return 'far';
    if (u.uA && u.uR) return 'far'; if (fs.includes('strip coordinate')) return 'far'; if (fs.includes('vFlap')) return 'far';
    if (u.uPano) return 'sky';
    return 'other';
  };
  window.__grp = {};
  window.__app.scene.traverse((m) => { if (m.isMesh) { const g = m.userData.grp || grp(m); (window.__grp[g] ||= []).push(m); } });
  window.__show = (...hide) => { for (const g of Object.keys(window.__grp)) window.__grp[g].forEach((m) => (m.visible = !hide.includes(g))); };
  window.__time = (n) => { const A = window.__app, gl = A.renderer.getContext(), px = new Uint8Array(4);
    A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const t0 = performance.now();
    for (let i = 0; i < n; i++) A.pipe.render(A.scene, A.camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return (performance.now() - t0) / n; };
  window.__shadow = (n) => { const A = window.__app, gl = A.renderer.getContext(), px = new Uint8Array(4);
    const sun = A.scene.children.length && window.__sun; const t0 = performance.now();
    for (let i = 0; i < n; i++) A.pipe.renderShadow(A.scene, window.__SUN, window.__C);
    A.pipe.render(A.scene, A.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return (performance.now() - t0) / n; };
});
console.log('groups', JSON.stringify(await p.evaluate(() => Object.fromEntries(Object.entries(window.__grp).map(([k, v]) => [k, v.length])))));
const n = +(flags.n || 5);
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v); await p.waitForTimeout(300);
  const res = {};
  for (let round = 0; round < +(flags.rounds || 14); round++) for (const [name, js] of Object.entries(setups)) {
    await p.evaluate(js);
    const ms = await p.evaluate((n) => window.__time(n), n);
    (res[name] ||= []).push(ms);
  }
  const names = Object.keys(res), ref = res[names[0]];
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  // per config: min time, and the median over rounds of (reference - config) = what hiding/changing it saves
  console.log(`${W}x${H} ${v.padEnd(8)} ` + names.map((k, j) => `${k} ${Math.min(...res[k]).toFixed(2)}` + (j ? ` (d ${med(res[k].map((x, i) => ref[i] - x)).toFixed(2)})` : ` (med ${med(ref).toFixed(2)})`)).join('  '));
}
await b.close();
