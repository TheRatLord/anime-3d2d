// Regression check that is immune to the renderer's own frame-to-frame noise.
//
// The picture is not bit-stable: with nothing changing, a few hundred pixels per view (along silhouettes of the
// ground and of the far crowns) wobble by a level or two from frame to frame, because some texture lookups take
// their screen derivatives from neighbouring pixels that did not run the same branch. So one frame cannot be
// compared with one frame. Instead every view is captured several times and kept as an ENVELOPE (per pixel and
// channel, the lowest and highest value seen); a check fails a pixel only if the new envelope lies clear of the
// saved one by more than a tolerance. The ambient clock stands still from the first frame (?t=), so the sun map
// painted at start-up is the same in every run.
//
//   node tools/regress.mjs save  <tag> [view ...]      capture the reference          (default views: REVIEW below)
//   node tools/regress.mjs check <tag> [view ...]      compare the working tree with it; exit code 1 if any view fails
//   options: --frames=6  --tol=2  --allow=0 (pixels per view that may lie outside)  --t=3  --q=key=val&...
// Files: shots/<tag>-<view>.png (the first frame, to look at), .lo.png / .hi.png (the envelope), and for a view that
// fails shots/<tag>-<view>.diff.png (the picture darkened, the pixels outside the envelope in red).
import fs from 'fs';
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { readPng, writePng } from './png.mjs';

const REVIEW = ['hero', 'front', 'inside', 'westwall', 'back', 'high', 'vista', 'low', 'close', 'down', 'tree', 'path', 'meadow', 'farN', 'farSE',
  'flowers', 'feet', 'rubble', 'cross', 'wallfoot', 'topTree', 'pathdown', 'shade', 'village', 'sap', 'topPath', 'pathback', 'footLime', 'footElm', 'footSap'];
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const [cmd, tag, ...rest] = args.filter((a) => !a.startsWith('--'));
if (!['save', 'check'].includes(cmd) || !tag) { console.log('usage: node tools/regress.mjs save|check <tag> [view ...] [--frames=6 --tol=2 --allow=0]'); process.exit(2); }
const views = rest.length ? rest : REVIEW;
const FRAMES = +(flags.frames || 6), TOL = +(flags.tol || 2), ALLOW = +(flags.allow || 0), W = 1280, H = 720;

const srv = await serve();
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && /Shader Error|WebGL/.test(m.text())) errs.push(m.text().slice(0, 400)); });
await p.goto(`${srv.url}?hud=0&t=${flags.t || 3}&${flags.q || ''}`);
try { await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 60000 }); }
catch (e) { console.log('LOAD FAILED\n' + errs.join('\n')); await b.close(); await srv.close(); process.exit(1); }
const wait = (n) => p.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k > n ? r() : requestAnimationFrame(f)); f(); }), n);
fs.mkdirSync('shots', { recursive: true });

let failed = 0;
for (const v of views) {
  await p.evaluate((v) => window.__app.view(v), v);
  await wait(4);
  let lo = null, hi = null, first = null;
  for (let k = 0; k < FRAMES; k++) {
    const buf = await p.screenshot(), im = readPng(buf);
    if (!lo) { first = buf; lo = Buffer.alloc(W * H * 3, 255); hi = Buffer.alloc(W * H * 3, 0); }
    for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) { const x = im.d[i * im.bpp + c], o = i * 3 + c; if (x < lo[o]) lo[o] = x; if (x > hi[o]) hi[o] = x; }
    await wait(2);
  }
  const base = `shots/${tag}-${v}`;
  if (cmd === 'save') { fs.writeFileSync(base + '.png', first); writePng(base + '.lo.png', W, H, lo); writePng(base + '.hi.png', W, H, hi); console.log(`saved ${v}`); continue; }
  if (!fs.existsSync(base + '.lo.png')) { console.log(`${v.padEnd(10)} no reference (run: node tools/regress.mjs save ${tag} ${v})`); failed++; continue; }
  const rl = readPng(base + '.lo.png'), rh = readPng(base + '.hi.png');
  let out = 0, worst = 0;
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    let e = 0;
    for (let c = 0; c < 3; c++) { const o = i * 3 + c; e = Math.max(e, lo[o] - rh.d[o] - TOL, rl.d[o] - hi[o] - TOL); }
    if (e > 0) { out++; mask[i] = 1; if (e > worst) worst = e; }
  }
  const ok = out <= ALLOW;
  console.log(`${v.padEnd(10)} ${ok ? 'same  ' : 'DIFFERS'}  ${out} px outside the envelope${out ? ` (${(100 * out / (W * H)).toFixed(3)}%, by up to ${worst} levels)` : ''}`);
  if (!ok) {
    failed++;
    const d = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) { const o = i * 3; if (mask[i]) { d[o] = 255; } else { d[o] = lo[o] * 0.45; d[o + 1] = lo[o + 1] * 0.45; d[o + 2] = lo[o + 2] * 0.45; } }
    writePng(base + '.diff.png', W, H, d);
    fs.writeFileSync(`shots/${tag}-${v}.new.png`, await p.screenshot());
  } else for (const f of ['.diff.png', '.new.png']) fs.rmSync(base + f, { force: true });
}
if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].slice(0, 8).join('\n'));
if (cmd === 'check') console.log(failed ? `${failed} of ${views.length} views differ (see shots/${tag}-<view>.diff.png and .new.png)` : `all ${views.length} views match`);
await b.close(); await srv.close();
process.exit(failed ? 1 : 0);
