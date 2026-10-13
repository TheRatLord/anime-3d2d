// compares the pixels painted by the workers with the same painters run on the main thread
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage();
await p.goto(srv.url + '?hud=0&prebake=0');
await p.waitForFunction(() => window.__app);
const r = await p.evaluate(async () => {
  const { painted } = await import('/src/paint.js');
  const bp = await import('/src/paint/brush-pixels.js'), fp = await import('/src/extra/far-pixels.js'), fo = await import('/src/extra/foliage-pixels.js'), ga = await import('/src/extra/grass-atlas.js');
  const inline = { brush: bp.brushPixels(512), cloud: bp.cloudPixels(512), paper: bp.paperPixels(512), crown: fp.crownPixels(256), village: fp.villagePixels(), castle: fp.castlePixels(), foliage: fo.foliagePixels(256), tuft: ga.tuftPixels(256) };
  const out = {}; { const a1 = bp.brushPixels(512), a2 = bp.brushPixels(512); let n = 0; for (let i = 0; i < a1.length; i++) if (a1[i] !== a2[i]) n++; out.brushTwice = n + ' differ main vs main'; }
  for (const k of Object.keys(inline)) {
    const a = inline[k], w = painted[k];
    if (!w) { out[k] = 'not painted by worker'; continue; }
    const da = a.d ?? a, dw = w.d ?? w;
    let n = 0, mx = 0; for (let i = 0; i < da.length; i++) { const e = Math.abs(da[i] - dw[i]); if (e) { n++; if (e > mx) mx = e; } }
    out[k] = `${n} of ${da.length} differ, max ${mx}`;
  }
  return out;
});
console.log(r);
await b.close(); await srv.close();
