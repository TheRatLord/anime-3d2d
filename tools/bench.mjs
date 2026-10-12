// Load + frame-time benchmark on the production build (run `npx vite build` first).
// usage: node tools/bench.mjs [--runs=5] [--dir=.cloudflare/output/v0/workers/default/assets] [--view=hero]
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const dir = path.resolve(flags.dir || '.cloudflare/output/v0/workers/default/assets');
const RUNS = +(flags.runs || 5), view = flags.view || 'hero';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  let f = path.join(dir, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); } });
});
await new Promise((r) => srv.listen(0, r));
const url = `http://localhost:${srv.address().port}/?hud=0&t=3&${flags.q || ""}`;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const load = [], frame = [], mods = [];
for (let i = 0; i < RUNS; i++) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 120000 });
  const m = await p.evaluate(() => ({ ready: performance.getEntriesByName('scene-ready')[0]?.startTime, mod: performance.getEntriesByName('mods-done')[0]?.startTime }));
  load.push(m.ready); mods.push(m.mod ?? 0);
  await p.waitForTimeout(4000);
  await p.evaluate((v) => window.__app.view(v), view);
  await p.evaluate(() => new Promise((r) => { let n = 0; const f = () => (++n > 20 ? r() : requestAnimationFrame(f)); f(); }));
  frame.push(await p.evaluate(() => new Promise((r) => { const gl = window.__app.renderer.getContext(), px = new Uint8Array(4); let n = 0, t0; const f = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (n === 10) t0 = performance.now(); if (++n >= 130) r((performance.now() - t0) / 120); else requestAnimationFrame(f); }; f(); })));
  await ctx.close();
}
console.log(`scene-ready ms: ${load.map((x) => x.toFixed(0)).join(' ')}  median ${med(load).toFixed(0)}`);
console.log(`frame ms (${view}): ${frame.map((x) => x.toFixed(2)).join(' ')}  median ${med(frame).toFixed(2)}`);
await b.close(); srv.close();
