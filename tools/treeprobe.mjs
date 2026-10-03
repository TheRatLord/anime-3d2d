// Leaf stability while moving: strafes past a crown in small steps (wind frozen) and measures, in the depth
// view, how much of the crown is covered and how many crown pixels flip between leaf and sky per step.
// usage: node tools/treeprobe.mjs [view] [--q=extra&query] [--shots=dir]   (CHROME=<path> to pick the browser)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const view = args.find((a) => !a.startsWith('--')) || 'tree';
const srv = await serve();
const exe = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&' + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 60000 });
await p.evaluate(() => window.__app.freeze(3));
const frames = (n) => p.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i > n ? r() : requestAnimationFrame(f)); f(); }), n);
// leaf mask from a screenshot of the depth view: anything in front of the sky
const mask = async () => {
  const png = (await p.screenshot()).toString('base64');
  return p.evaluate(async (png) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + png; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    // (sky is black in the depth view; only the upper 55% of the frame, where the crowns stand against it)
    const h = Math.floor(c.height * 0.55), d = g.getImageData(0, 0, c.width, h).data, m = new Uint8Array(c.width * h);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] > 30 ? 1 : 0;
    return Array.from(m);
  }, png);
};
const STEPS = 10, STEP = +(flags.step || 0.2);
const masks = [];
for (let i = 0; i <= STEPS; i++) {
  await p.evaluate(([v, off]) => {
    const a = window.__app, V = a.VIEWS[v];
    const dx = V.look[0] - V.pos[0], dz = V.look[2] - V.pos[2], l = Math.hypot(dx, dz);
    const rx = -dz / l, rz = dx / l;   // strafe right, looking at the same point shifted with us
    a.setView({ pos: [V.pos[0] + rx * off, V.pos[1], V.pos[2] + rz * off], look: [V.look[0] + rx * off, V.look[1], V.look[2] + rz * off] }, true);
  }, [view, i * STEP]);
  await p.evaluate(() => { window.__app.params.mode = 0; }); await frames(4);
  if (flags.shots) await p.screenshot({ path: `${flags.shots}/${view}-${i}.png` });
  await p.evaluate(() => { window.__app.params.mode = 4; }); await frames(4);
  if (flags.shots && i === 0) await p.screenshot({ path: `${flags.shots}/${view}-depth.png` });
  masks.push(await mask());
}
let flips = 0, cover = 0, n = masks[0].length;
for (let i = 1; i < masks.length; i++) { let f = 0; for (let j = 0; j < n; j++) f += masks[i][j] !== masks[i - 1][j]; flips += f / n; }
for (const m of masks) cover += m.reduce((s, v) => s + v, 0) / n;
console.log(`${view} ${flags.q || '(default)'}: coverage ${(100 * cover / masks.length).toFixed(1)}%, flipped per ${STEP} m step ${(100 * flips / (masks.length - 1)).toFixed(2)}% of region`);
await b.close();
await srv.close();
