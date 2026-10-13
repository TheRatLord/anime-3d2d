// Review sheet for Clawd (src/extra/clawd.js): the same figure seen from many stations - walk-round (azimuth),
// height of the eye (elevation), distance - cropped to him and tiled into one contact sheet with labels.
// usage: node tools/clawdsheet.mjs <tag> [--pose=idle:0.3] [--heading=0] [--az=0,45,...] [--el=4,18,40,70]
//          [--dist=6] [--fov=32] [--q=key=val&...] [--cell=240] [--ml=-1]
//   shots/<tag>.png is the sheet. --heading is his heading in the world (deg); 0 = toward +z, the usual viewer.
//   --ml=1 keeps the main lens (tele pull); the default holds it off so a station is exactly where it says.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { serve } from './serve.mjs';
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const tag = args.find((a) => !a.startsWith('--')) || 'clawd';
const list = (s, d) => (s ?? d).split(',').map(Number);
const AZ = list(flags.az, '0,45,90,135,180,225,270,315'), EL = list(flags.el, '4,18,40,70');
const DIST = +(flags.dist || 6), FOV = +(flags.fov || 32), CELL = +(flags.cell || 240);
const [pose, ps] = (flags.pose || 'idle:0.3').split(':');
const HEAD = (+(flags.heading || 0) * Math.PI) / 180;
const POS = (flags.at || '4.5,12.8').split(',').map(Number);
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const W = 960, H = 720;
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + `?hud=0&t=3&tele=${flags.ml ? -1 : 0}&` + (flags.q || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3 && window.__clawd, null, { timeout: 60000 });
await p.evaluate(([x, z, h, pose, s]) => { window.__app.freeze(3); window.__clawd.put(x, z, h); window.__clawd.freeze(pose, s); }, [POS[0], POS[1], HEAD, pose, +ps]);
const cells = [];
for (const el of EL) for (const az of AZ) {
  const shot = await p.evaluate(async ([az, el, dist, fov]) => {
    const f = window.__clawd.feet();
    const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
    const cy = f[1] + 0.5;
    // az 0 = from +z (in front of him as he faces +z)
    const pos = [f[0] + Math.sin(a) * Math.cos(e) * dist, cy + Math.sin(e) * dist, f[2] + Math.cos(a) * Math.cos(e) * dist];
    window.__app.setView({ pos, look: [f[0], cy, f[2]], fov });
    window.__app.state.fly = true;
    await new Promise((r) => { let n = 0; const g = () => (++n > 5 ? r() : requestAnimationFrame(g)); g(); });
    const cam = window.__app.camera;
    const v = new cam.position.constructor(f[0], cy, f[2]).project(cam);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (1 - (v.y * 0.5 + 0.5)) * innerHeight };
  }, [az, el, DIST, FOV]);
  const png = await p.screenshot({ clip: { x: Math.max(0, Math.min(W - CELL, shot.x - CELL / 2)), y: Math.max(0, Math.min(H - CELL, shot.y - CELL / 2)), width: CELL, height: CELL } });
  cells.push({ az, el, png: png.toString('base64') });
}
// tile with labels
const page2 = await b.newPage({ viewport: { width: 100, height: 100 } });
await page2.setContent('<body style="margin:0;background:#222"><canvas id=c></canvas></body>');
const out = await page2.evaluate(async ([cells, cols, CELL]) => {
  const rows = Math.ceil(cells.length / cols);
  const cv = document.getElementById('c'); cv.width = cols * CELL; cv.height = rows * CELL;
  const g = cv.getContext('2d');
  let i = 0;
  for (const c of cells) {
    const im = new Image(); im.src = 'data:image/png;base64,' + c.png; await im.decode();
    const x = (i % cols) * CELL, y = Math.floor(i / cols) * CELL;
    g.drawImage(im, x, y);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y, 96, 16);
    g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(`az ${c.az}  el ${c.el}`, x + 4, y + 12);
    g.strokeStyle = '#000'; g.strokeRect(x + .5, y + .5, CELL - 1, CELL - 1);
    i++;
  }
  return cv.toDataURL('image/png').split(',')[1];
}, [cells, AZ.length, CELL]);
fs.mkdirSync('shots', { recursive: true });
fs.writeFileSync(`shots/${tag}.png`, Buffer.from(out, 'base64'));
console.log(`shots/${tag}.png  ${cells.length} cells`);
if (errs.length) console.log('CONSOLE:\n' + [...new Set(errs)].slice(0, 10).join('\n'));
await b.close(); await srv.close();
