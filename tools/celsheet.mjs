// Atlas contact sheet rendered on the GPU through the real pipeline: every cel as one card.
// usage: node tools/celsheet.mjs <tag> [--fov=50 --w=28 --cols=6 --only=heapA,heapB --el=40 --tw=480]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import fs from 'fs';
const srv = await serve();
const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split(/=(.*)/s).slice(0, 2)));
const tag = args.filter(a => !a.startsWith('--'))[0] || 'cels';
const fov = +(flags.fov || 50), cw = +(flags.w || 28), cols = +(flags.cols || 6), el = +(flags.el || 40), TW = +(flags.tw || 480), TH = Math.round(TW * 9 / 16);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto(srv.url + '?hud=0&shift=0&tele=0');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3, null, { timeout: 30000 });
await p.evaluate(() => window.__app.freeze(3));
let names = await p.evaluate(() => window.__app.scene.children.find(o => o.userData.setClouds).userData.celNames);
if (flags.only) names = flags.only.split(',');
const az = +(flags.az ?? 60), D = Math.PI / 180, ce = Math.cos(el * D);
await p.evaluate((v) => window.__app.setView(v), { pos: [0, 14, 0], look: [ce * Math.cos(az * D) * 100, 14 + Math.sin(el * D) * 100, ce * Math.sin(az * D) * 100], fov });
const imgs = [];
for (const n of names) {
  await p.evaluate(([n, az, el, cw]) => window.__app.scene.children.find(o => o.userData.setClouds).userData.setClouds([{ az, el, w: cw, cel: n, mirror: false }]), [n, az + +(flags.daz || 0), el + +(flags.del || 0), cw]);
  await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 3 ? r() : requestAnimationFrame(f)); f(); }));
  imgs.push([n, 'data:image/png;base64,' + (await p.screenshot()).toString('base64')]);
}
const rows = Math.ceil(names.length / cols);
const sheet = await b.newPage({ viewport: { width: TW * cols, height: TH * rows }, deviceScaleFactor: 1 });
await sheet.setContent(`<body style="margin:0;background:#000;font:13px sans-serif;color:#124">${imgs.map(([n, s]) => `<div style="display:inline-block;position:relative;width:${TW}px;height:${TH}px;vertical-align:top"><img src="${s}" style="width:${TW}px;height:${TH}px"><span style="position:absolute;left:6px;top:4px">${n}</span></div>`).join('')}</body>`);
await sheet.waitForFunction(() => [...document.images].every(i => i.complete));
fs.writeFileSync(`shots/${tag}.png`, await sheet.screenshot());
console.log(`wrote shots/${tag}.png`, 'skyMs', await p.evaluate(() => window.__skyMs));
const e2 = [...new Set(errs)].filter(e => !/grass|ReadPixels|404/.test(e)); if (e2.length) console.log('CONSOLE:\n' + e2.slice(0, 10).join('\n'));
await b.close(); await srv.close();
