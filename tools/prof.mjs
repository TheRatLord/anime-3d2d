// CPU profile of the load (production build) -> top self-time functions. usage: node tools/prof.mjs [--dir=...]
import http from 'http'; import fs from 'fs'; import path from 'path';
import { chromium } from 'playwright-core';
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const dir = path.resolve(flags.dir || '.cloudflare/output/v0/workers/default/assets');
const srv = http.createServer((req, res) => { let f = path.join(dir, req.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(d); } }); });
await new Promise((r) => srv.listen(0, r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', (m) => { if (m.type() === 'info' || m.type() === 'log') console.log('  [console]', m.text().slice(0, 160)); });
const c = await p.context().newCDPSession(p);
await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start');
await p.goto(`http://localhost:${srv.address().port}/?hud=0&t=3`);
await p.waitForFunction(() => performance.getEntriesByName('scene-ready').length, null, { timeout: 120000 });
let { profile } = await c.send('Profiler.stop');
if (flags.steady) {
  await p.evaluate(() => window.__app.view('hero'));
  await c.send('Profiler.start'); await p.waitForTimeout(3000); ({ profile } = await c.send('Profiler.stop'));
  const fr = await p.evaluate(() => new Promise((r) => { const gl = window.__app.renderer.getContext(), px = new Uint8Array(4); let n = 0, t0 = performance.now(), cpu = 0; const f = () => { const a = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (++n >= 60) r((performance.now() - t0) / 60); else requestAnimationFrame(f); }; f(); }));
  console.log('steady frame ms', fr);
}
if (flags.until) {
  // keep only the samples of the first `until` ms of the profile
  const keepS = [], keepD = []; let t = 0;
  profile.samples.forEach((id, i) => { t += profile.timeDeltas[i] / 1000; if (t <= +flags.until) { keepS.push(id); keepD.push(profile.timeDeltas[i]); } });
  profile.samples = keepS; profile.timeDeltas = keepD;
}
const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas; profile.samples.forEach((id, i) => { const n = byId.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${path.basename(n.callFrame.url)}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + dt[i] / 1000); });
const kids = new Map(); for (const n of profile.nodes) for (const ch of n.children || []) kids.set(ch, n.id);
const selfBy = new Map(); profile.samples.forEach((id, i) => selfBy.set(id, (selfBy.get(id) || 0) + dt[i] / 1000));
const incl = new Map();
for (const [id, v] of selfBy) { const seen = new Set(); let cur = id; while (cur !== undefined) { const n = byId.get(cur); const k = `${n.callFrame.functionName || '(anon)'} ${path.basename(n.callFrame.url)}:${n.callFrame.lineNumber}`; if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + v); } cur = kids.get(cur); } }
console.log('--- inclusive'); for (const [k, v] of [...incl].sort((a, z) => z[1] - a[1]).slice(0, 45)) console.log(v.toFixed(0).padStart(6), k);
const lines = new Map();
for (const n of profile.nodes) for (const t of n.positionTicks || []) { const k = `${path.basename(n.callFrame.url)}:${t.line}`; lines.set(k, (lines.get(k) || 0) + t.ticks); }
const dtAvg = profile.timeDeltas.reduce((a, v) => a + v, 0) / profile.timeDeltas.length / 1000;
console.log('--- hot lines (ms)'); for (const [k, v] of [...lines].sort((a, z) => z[1] - a[1]).slice(0, 60)) console.log((v * dtAvg).toFixed(0).padStart(6), k);
console.log('--- self');
const tot = [...self.values()].reduce((a, v) => a + v, 0);
console.log('total sampled ms', tot.toFixed(0));
for (const [k, v] of [...self].sort((a, z) => z[1] - a[1]).slice(0, 30)) console.log(v.toFixed(0).padStart(6), k);
await b.close(); srv.close();
if (flags.timeline) {
  const B = new Map(); let t = 0;
  profile.samples.forEach((id, i) => { t += dt[i] / 1000; const n = byId.get(id).callFrame.functionName; const k = Math.floor(t / 100); const o = B.get(k) || { idle: 0, gc: 0, all: 0 }; o.all += dt[i] / 1000; if (n === '(idle)') o.idle += dt[i] / 1000; if (n === '(program)') o.gc += dt[i] / 1000; B.set(k, o); });
  for (const [k, o] of [...B].sort((a, b) => a[0] - b[0])) console.log(String(k * 100).padStart(5), 'idle', o.idle | 0, 'program', o.gc | 0);
}
