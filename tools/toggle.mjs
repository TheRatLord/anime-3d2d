// runtime mode toggle vs the same mode at load: node tools/toggle.mjs [--dir=...]
import { chromium } from 'playwright-core'; import http from 'http'; import fs from 'fs'; import path from 'path'; import zlib from 'zlib';
const dir = path.resolve(process.argv.find((a) => a.startsWith('--dir='))?.slice(6) || '.cloudflare/output/v0/workers/default/assets');
const srv = http.createServer((req, res) => { let f = path.join(dir, req.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); } }); });
await new Promise((r) => srv.listen(0, r));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
async function shot(q, mode) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto(`http://localhost:${srv.address().port}/?hud=0&t=3&${q}`);
  await p.waitForFunction(() => window.__app && window.__app.stat.frames > 6);
  await p.evaluate((m) => { window.__app.view('hero'); if (m) window.__app.setMode(m); }, mode);
  await p.waitForTimeout(6000);
  const px = await p.evaluate(() => { const c = document.createElement('canvas'); const s = document.querySelector('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d'); return null; });
  const buf = await p.screenshot(); await p.close(); return buf;
}
const a = await shot('eve=1&snow=1', null), c = await shot('', { eve: 1, snow: 1 });
fs.writeFileSync('/tmp/tog-a.png', a); fs.writeFileSync('/tmp/tog-b.png', c);
await b.close(); srv.close();
