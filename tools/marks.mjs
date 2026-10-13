import { chromium } from 'playwright-core';

import http from 'http'; import fs from 'fs'; import path from 'path';
const dir = path.resolve('.cloudflare/output/v0/workers/default/assets');
const srv0 = http.createServer((req, res) => { let f = path.join(dir, req.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(d); } }); });
await new Promise((r) => srv0.listen(0, r));
const srv = { url: `http://localhost:${srv0.address().port}/`, close: async () => srv0.close() };
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(srv.url + '?hud=0&t=3');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12);
const L = await p.evaluate(() => ({ t1: window.__t1, L: window.__L, F: window.__F, pt: window.__pt, boot: window.__boot, wc: window.__wc, pcs: [window.__pcs, window.__pc1, window.__pc2], G: window.__G, FT: window.__FT, pc: window.__pc, pt: window.__pt, ready: performance.getEntriesByName('scene-ready')[0].startTime, nav: performance.getEntriesByType('resource').filter(r=>/\.js/.test(r.name)).map(r=>[r.name.split('/').pop(), r.startTime|0, r.responseEnd|0]) }));
let prev = 0; for (const [n, t] of L.L ?? []) { console.log(String((t - prev) | 0).padStart(5), n, '@', t | 0); prev = t; }
console.log(JSON.stringify((L.F ?? []).map(([f,t])=>[f,t|0])));console.log(JSON.stringify(L.pt), 'boot', JSON.stringify(L.boot), 'ctor', JSON.stringify(L.wc)); if (L.G) { let pv = 0; for (const [n, t] of L.G) { console.log('  grass', String((t - pv) | 0).padStart(5), n); pv = t; } }console.log('programs', JSON.stringify(L.pcs));if (L.FT) { let pv = L.FT[0][1]; for (const [n, t] of L.FT) { console.log('  far', String((t - pv) | 0).padStart(5), n); pv = t; } } console.log('PC', JSON.stringify(L.pc)); console.log('t1', L.t1|0, 'ready', L.ready | 0, JSON.stringify(L.nav));
await b.close(); await srv.close();
