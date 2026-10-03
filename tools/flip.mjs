// Finds pixels that alternate A-B-A-B on consecutive 1/12 s ticks with the camera still (a depth-order swap
// between two cards flips a filled patch at 6 Hz). usage: PORT=.. node tools/flip.mjs <tag> <view> [--t0=3]
// Prints the number of such pixels and the size of the largest 8-connected patch; writes a mask image.
import { chromium } from 'playwright-core';
import fs from 'fs';
const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const [tag, ...views] = args.filter(a => !a.startsWith('--'));
const W = 1280, H = 720, t0 = +(flags.t0 || 3), N = +(flags.n || 4);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(`http://localhost:${process.env.PORT}/?hud=0&grain=0`);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
const sheet = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#000"><canvas id=c width=${W} height=${H}></canvas></body>`);
for (const v of views) {
  const imgs = [];
  for (let i = 0; i < N; i++) {
    await p.evaluate(([t, v]) => { window.__app.freeze(t); window.__app.view(v); }, [t0 + i / 12 + 1e-4, v]);
    await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
    imgs.push('data:image/png;base64,' + (await p.screenshot()).toString('base64'));
  }
  const r = await sheet.evaluate(async ({ imgs, W, H }) => {
    const load = (s) => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = s; });
    const cx = document.getElementById('c').getContext('2d', { willReadFrequently: true }), D = [];
    for (const s of imgs) { cx.drawImage(await load(s), 0, 0); D.push(cx.getImageData(0, 0, W, H).data); }
    const df = (a, b, k) => Math.max(Math.abs(a[k] - b[k]), Math.abs(a[k + 1] - b[k + 1]), Math.abs(a[k + 2] - b[k + 2]));
    const m = new Uint8Array(W * H); let cnt = 0;
    for (let i = 0; i < W * H; i++) { const k = i * 4; let ok = true;
      for (let j = 0; j + 2 < D.length && ok; j++) if (df(D[j], D[j + 2], k) > 10 || df(D[j], D[j + 1], k) < 30) ok = false;
      if (ok) { m[i] = 1; cnt++; } }
    // largest 8-connected patch
    const seen = new Uint8Array(W * H); let best = 0, bx = 0, by = 0;
    for (let i = 0; i < W * H; i++) if (m[i] && !seen[i]) { let n = 0; const st = [i]; seen[i] = 1;
      while (st.length) { const q = st.pop(); n++; const x = q % W, y = (q / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X; if (m[j] && !seen[j]) { seen[j] = 1; st.push(j); } } }
      if (n > best) { best = n; bx = i % W; by = (i / W) | 0; } }
    const o = cx.getImageData(0, 0, W, H); for (let i = 0; i < W * H; i++) if (m[i]) { o.data[i * 4] = 255; o.data[i * 4 + 1] = 0; o.data[i * 4 + 2] = 255; } else { o.data[i * 4] *= 0.4; o.data[i * 4 + 1] *= 0.4; o.data[i * 4 + 2] *= 0.4; }
    cx.putImageData(o, 0, 0);
    return { cnt, best, at: [bx, by] };
  }, { imgs, W, H });
  fs.writeFileSync(`shots/${tag}-flip-${v}.png`, await sheet.screenshot());
  console.log(`${v}: ${r.cnt} px alternate every tick; largest patch ${r.best} px at ${r.at}`);
}
await b.close();
