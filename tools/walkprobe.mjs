// Measures how the camera moves against the walker: per-frame camera travel / walker travel along
// walks in and out of the chapel, diagonal input, and the camera dolly while tilting down at rest.
// usage: node tools/walkprobe.mjs   (CHROME=<path> to pick the browser)
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const exe = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const b = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&scale=0.5');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 60000 });
await p.evaluate(() => {
  const a = window.__app; a.log = [];
  const f = () => { const s = a.state.pos, c = a.camera.position; a.log.push([s.x, s.z, c.x, c.y, c.z, a.camera.fov, performance.now(), a.lens.pullS, a.lens.c0, a.lens.tgt, a.lens.want, a.lens.D]); requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
// (through setView, so the lens snaps to the spot as after a teleport)
const place = (pos, yaw, pitch) => p.evaluate(([pos, yaw, pitch]) => {
  const a = window.__app; a.setView({ pos, look: [pos[0] - Math.sin(yaw), pos[1], pos[2] - Math.cos(yaw)] }, true);
  a.state.pitch = pitch; a.state.fly = false;
}, [pos, yaw, pitch]);
const frames = (n) => p.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i > n ? r() : requestAnimationFrame(f)); f(); }), n);
const take = () => p.evaluate(() => { const l = window.__app.log; window.__app.log = []; return l; });
// walk with keys held for `ms`, report walker speed and the ratio camera/walker ground travel over windows
async function walk(name, pos, yaw, keys, ms) {
  await place(pos, yaw, 0.0); await frames(20); await take();
  for (const k of keys) await p.keyboard.down(k);
  await p.waitForTimeout(ms);
  for (const k of keys) await p.keyboard.up(k);
  const l = await take();
  let worst = [9, 0], line = '';
  const W = 6; // frames per window
  for (let i = W; i < l.length; i += W) {
    const a = l[i - W], c = l[i];
    const ws = Math.hypot(c[0] - a[0], c[1] - a[1]), cs = Math.hypot(c[2] - a[2], c[4] - a[4]);
    if (ws < 0.02) continue;
    const r = cs / ws; worst = [Math.min(worst[0], r), Math.max(worst[1], r)];
    line += r.toFixed(2) + (process.env.V ? `[D${c[11].toFixed(1)} p${c[7].toFixed(2)} c${c[8].toFixed(2)} t${c[9].toFixed(2)} w${c[10].toFixed(2)}]` : '') + ' ';
  }
  const t = (l.at(-1)[6] - l[0][6]) / 1000, d = Math.hypot(l.at(-1)[0] - l[0][0], l.at(-1)[1] - l[0][1]);
  console.log(`${name}: walker ${(d / t).toFixed(2)} m/s, camera/walker ${worst[0].toFixed(2)}..${worst[1].toFixed(2)}, fov ${l[0][5].toFixed(1)}->${l.at(-1)[5].toFixed(1)}\n  ${line}`);
}
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
await walk('in from hill (D 26->12)', [9, 1.7, 22], yawTo(9, 22, 0, -1), ['w'], 3500);
await walk('out to hill (D 12->26)', [3.5, 1.7, 9.5], yawTo(3.5, 9.5, 12, 27), ['w'], 3500);
await walk('nave toward altar', [0, 1.7, 6], 0, ['w'], 2500);
await walk('door into nave (continuous)', [0.5, 1.7, 22], Math.PI * 0, ['w'], 5000);
await walk('diagonal W+D', [-20, 1.7, 20], 0, ['w', 'd'], 1500);
await walk('straight W', [-20, 1.7, 20], 0, ['w'], 1500);
// tilt down at rest: camera travel and lens against pitch
for (const [name, pos, tgt] of [['tilt in front of chapel', [1, 1.7, 13], [0, -4]], ['tilt in nave', [0, 1.7, 5], [0, -8]]]) {
  await place(pos, yawTo(pos[0], pos[2], ...tgt), 0); await frames(10);
  let row = '', c0 = null;
  for (let deg = 0; deg <= 60; deg += 5) {
    await p.evaluate((v) => { window.__app.state.pitch = v; }, -deg * Math.PI / 180); await frames(3);
    const c = await p.evaluate(() => { const a = window.__app; return [a.camera.position.x, a.camera.position.y, a.camera.position.z, a.camera.fov, a.lens.pullS]; });
    c0 ??= c;
    if (process.env.SHOTS && deg % 15 === 0) await p.screenshot({ path: `${process.env.SHOTS}/${name.split(' ').pop()}-${deg}.png` });
    row += `\n  ${String(deg).padStart(2)}deg: camera moved ${Math.hypot(c[0] - c0[0], c[1] - c0[1], c[2] - c0[2]).toFixed(2)} m, fov ${c[3].toFixed(1)}  (pull at rest ${c[4].toFixed(2)})`;
  }
  console.log(name + row);
}
await b.close();
await srv.close();
