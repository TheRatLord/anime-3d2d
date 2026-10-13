import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage();
await p.goto(srv.url + '?hud=0&prebake=0');
const r = await p.evaluate(async () => {
  const mod = await import('/src/brush.js');
  const world = await import('/src/world.js');
  const { rng } = world;
  function dabPath(ctx, len, wid, R) {
    ctx.beginPath(); const n = 14;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const rag = 0.82 + R() * 0.36; const cx = Math.cos(a), sy = Math.sin(a);
      const ex = Math.sign(cx) * Math.pow(Math.abs(cx), 0.6) * len * 0.5 * rag, ey = Math.sign(sy) * Math.pow(Math.abs(sy), 0.8) * wid * 0.5 * (0.9 + R() * 0.2);
      if (i === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey); }
    ctx.closePath();
  }
  function layer(mk, wrf, size, count, lenR, widR, spread, seed, base) {
    const R = rng(seed); const c = mk(size); const ctx = c.getContext('2d', wrf ? { willReadFrequently: true } : undefined);
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      const x = R() * size, y = R() * size, len = lenR[0] + R() * (lenR[1] - lenR[0]), wid = widR[0] + R() * (widR[1] - widR[0]);
      const ang = base + (R() - 0.5) * spread, g = Math.floor(R() * 256);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const px = x + ox * size, py = y + oy * size;
        if (px < -len || px > size + len || py < -len || py > size + len) continue;
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = `rgb(${g},${g},${g})`; dabPath(ctx, len, wid, R); ctx.fill(); ctx.restore();
      }
    }
    return ctx.getImageData(0, 0, size, size).data;
  }
  const dom = (s) => { const c = document.createElement('canvas'); c.width = c.height = s; return c; };
  const off = (s) => new OffscreenCanvas(s, s);
  const out = {};
  for (const [name, mk, wrf] of [['dom-default', dom, false], ['dom-wrf', dom, true], ['off-default', off, false], ['off-wrf', off, true]]) {
    const t = performance.now();
    const d = layer(mk, wrf, 512, 9000, [14, 40], [2.5, 6], 0.5, 37, 0.15);
    out[name] = { ms: performance.now() - t, d };
  }
  const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const e = Math.abs(a[i] - b[i]); if (e) { n++; if (e > mx) mx = e; } } return [n, mx]; };
  const res = {};
  for (const k of Object.keys(out)) res[k] = { ms: out[k].ms.toFixed(0), vsDefault: diff(out['dom-default'].d, out[k].d), vsWrf: diff(out['dom-wrf'].d, out[k].d) };
  // worker
  const code = `self.onmessage = (e) => { ${dabPath.toString()}; const rng = ${rng.toString()}; const layer = ${layer.toString()}; const t = performance.now(); const d = layer((s) => new OffscreenCanvas(s, s), e.data, 512, 9000, [14, 40], [2.5, 6], 0.5, 37, 0.15); self.postMessage({ ms: performance.now() - t, d }); }`;
  for (const wrf of [false, true]) {
    const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
    const m = await new Promise((r) => { w.onmessage = (e) => r(e.data); w.postMessage(wrf); });
    res['worker-' + (wrf ? 'wrf' : 'default')] = { ms: m.ms.toFixed(0), vsDefault: diff(out['dom-default'].d, m.d), vsWrf: diff(out['dom-wrf'].d, m.d) };
  }
  return res;
});
console.log(JSON.stringify(r, null, 1));
await b.close(); await srv.close();
