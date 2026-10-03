// How much of the picture changes from one 1/12 s tick to the next with the camera still (shimmer).
// usage: node tools/tdiff.mjs <view> [view ...] [--n=6 --t0=3 --th=10 --q=key=val&...]
// Prints, per view, the mean share of pixels whose largest channel differs by more than `th` between
// consecutive ticks, and writes shots/tdiff-<view>.png (the first tick darkened, the changing pixels in red).
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { readPng, writePng } from './png.mjs';
const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const views = args.filter((a) => !a.startsWith('--'));
const W = 1280, H = 720, N = +(flags.n || 6), t0 = +(flags.t0 || 3), TH = +(flags.th || 10);
const srv = await serve();
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(`${srv.url}?hud=0&grain=0&flakes=0&t=${t0}&${flags.q || ''}`);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 60000 });
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v);
  let prev = null, first = null, tot = 0; const mask = new Uint8Array(W * H);
  for (let i = 0; i < N; i++) {
    await p.evaluate((t) => window.__app.freeze(t), t0 + i / 12 + 1e-4);
    await p.evaluate(() => new Promise((r) => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
    const im = readPng(await p.screenshot());
    if (prev) for (let j = 0; j < W * H; j++) { let m = 0; for (let c = 0; c < 3; c++) m = Math.max(m, Math.abs(im.d[j * im.bpp + c] - prev.d[j * prev.bpp + c])); if (m > TH) { tot++; mask[j] = 1; } }
    else first = im;
    prev = im;
  }
  const d = Buffer.alloc(W * H * 3);
  for (let j = 0; j < W * H; j++) { const o = j * 3; if (mask[j]) d[o] = 255; else for (let c = 0; c < 3; c++) d[o + c] = first.d[j * first.bpp + c] * 0.45; }
  writePng(`shots/tdiff-${v}.png`, W, H, d);
  console.log(`${v.padEnd(10)} ${(100 * tot / ((N - 1) * W * H)).toFixed(3)}% of the picture changes per tick`);
}
await b.close(); await srv.close();
