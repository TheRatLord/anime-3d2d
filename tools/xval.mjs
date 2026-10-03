// usage: node tools/xval.mjs <view> [<view> ...] [--q=...]
// Luminance range of the STONE pixels of a view in the final picture. Stone pixels are found by
// comparing the depth view (mode 5) with and without the stone meshes; the mask is eroded 3 px.
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const CUSTOM = { nosewall: { pos: [-3.6, 1.6, -3.1], look: [-5, 1.5, -3.1], fov: 40 } };
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const views = args.filter(a => !a.startsWith('--'));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 40000 });
await p.evaluate(() => window.__app.freeze(3));
const settle = () => p.evaluate(() => new Promise(r => { let n = 0; const f = () => (++n > 4 ? r() : requestAnimationFrame(f)); f(); }));
const shot = async () => 'data:image/png;base64,' + (await p.screenshot()).toString('base64');
for (const v of views) {
  if (CUSTOM[v]) await p.evaluate((c) => window.__app.setView(c), CUSTOM[v]); else await p.evaluate((v) => window.__app.view(v), v);
  await settle(); const full = await shot();
  await p.evaluate(() => { window.__app.params.mode = 4; }); await settle(); const d1 = await shot();
  await p.evaluate(() => { window.__app.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.aFace) o.visible = false; }); }); await settle(); const d2 = await shot();
  await p.evaluate(() => { window.__app.scene.traverse(o => { if (o.isMesh && o.geometry.attributes.aFace) o.visible = true; }); window.__app.params.mode = 0; });
  const out = await p.evaluate(async ([full, d1, d2]) => {
    const load = async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
    const F = await load(full), A = await load(d1), B = await load(d2), W = F.width, H = F.height;
    const m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = Math.abs(A.data[i * 4] - B.data[i * 4]) > 1 ? 1 : 0;
    const px = [];
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      const i = y * W + x;
      if (!(m[i] && m[i - 3] && m[i + 3] && m[i - 3 * W] && m[i + 3 * W] && m[i - 2 * W - 2] && m[i + 2 * W + 2] && m[i - 2 * W + 2] && m[i + 2 * W - 2])) continue;
      const d = F.data; px.push([0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2], d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    }
    px.sort((a, c) => a[0] - c[0]);
    const mean = (a, b2) => { const s = [0, 0, 0, 0]; const i0 = Math.floor(a * px.length), i1 = Math.max(i0 + 1, Math.floor(b2 * px.length)); for (let i = i0; i < i1; i++) for (let k = 0; k < 4; k++) s[k] += px[i][k]; return s.map(v => v / (i1 - i0)); };
    const f = (v) => (v[0] / 255).toFixed(3) + ' rgb(' + v.slice(1).map(Math.round).join(',') + ')';
    return `n=${px.length} darkest1% ${f(mean(0, 0.01))} | darkest5% ${f(mean(0, 0.05))} | p25 ${f(px[px.length >> 2])} | median ${f(px[px.length >> 1])} | p75 ${f(px[Math.floor(px.length * 0.75)])} | lightest5% ${f(mean(0.95, 1))} | lightest1% ${f(mean(0.99, 1))}`;
  }, [full, d1, d2]);
  console.log(v + ': ' + out);
}
await b.close(); await srv.close();
