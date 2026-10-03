// collision check for ruin.js SOLIDS: free width of every opening (0.4 m walker margin) and how far masonry corners lie outside the circles
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage();
await p.goto(srv.url + '?hud=0');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 40000 });
const res = await p.evaluate(async () => {
const { SOLIDS } = await import('/src/ruin.js');
const out = [];
const dmin = (x, z) => Math.min(...SOLIDS.map(([cx, cz, r]) => Math.hypot(x - cx, z - cz) - r));
const walls = [
  { name: 'back', x0: -5.437, z0: -9, dx: 1, dz: 0, thick: 1.0, ops: [[5.437, 3.4]] },
  { name: 'west', x0: -5, z0: -9, dx: 0, dz: 1, thick: 0.85, ops: [[3.6, 2.9], [8.2, 2.9], [12.8, 2.9]] },
  { name: 'east', x0: 5, z0: -9, dx: 0, dz: 1, thick: 0.85, ops: [[3.6, 2.9]] },
];
for (const W of walls) for (const [c, w] of W.ops) {
  let free = 0, lo = null;
  for (let s = c - w / 2 - 0.5; s <= c + w / 2 + 0.5; s += 0.01) {
    // walkable across the whole thickness of the wall at this s?
    let ok = true;
    for (let t = -W.thick / 2 - 0.3; t <= W.thick / 2 + 0.3; t += 0.05) if (dmin(W.x0 + W.dx * s - W.dz * t, W.z0 + W.dz * s + W.dx * t) < 0.4) ok = false;
    if (ok) free += 0.01;
  }
  const corners = [];
  for (const e of [c - w / 2, c + w / 2]) for (const t of [-W.thick / 2 - 0.03, W.thick / 2 + 0.03]) corners.push(dmin(W.x0 + W.dx * e - W.dz * t, W.z0 + W.dz * e + W.dx * t).toFixed(2));
  out.push(`${W.name} arch at s=${c}: free width ${free.toFixed(2)} m; jamb corners outside circles by ${corners.join(', ')} m`);
}
let door = 0; for (let x = -6; x <= 6; x += 0.01) { let ok = true; for (let z = 6.2; z <= 8.2; z += 0.05) if (dmin(x, z) < 0.4) ok = false; if (ok) door += 0.01; }
out.push('door free width ' + door.toFixed(2));
for (const [x, z] of [[5.6, -11.0], [-5.7, -10.9], [6.9, -9.6], [5.475, -10.6], [4.325, -10.6], [6.53, -9.475], [6.53, -8.325], [-5.475, -10.6], [-6.53, -9.475]]) out.push('buttress corner ' + x + ' ' + z + ' outside by ' + dmin(x, z).toFixed(2));
out.push('circles ' + SOLIDS.length);

return out;
});
console.log(res.join('\n'));
await b.close(); await srv.close();
