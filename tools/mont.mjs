// usage: node tools/mont.mjs <out.png> <cols> <scale> <img[:x,y,w,h]> ...   (tiles images, optional crop, nearest-neighbour scale)
import { chromium } from 'playwright-core';
import fs from 'fs';
const [out, cols, scale, ...imgs] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const items = imgs.map((s) => { const [f, c] = s.split(':'); return { src: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'), c: c ? c.split(',').map(Number) : null }; });
const p = await b.newPage({ viewport: { width: 100, height: 100 }, deviceScaleFactor: 1 });
await p.setContent('<body style="margin:0;background:#000"><canvas id=c></canvas></body>');
const size = await p.evaluate(async ([items, cols, scale]) => {
  const ims = []; for (const it of items) { const im = new Image(); im.src = it.src; await im.decode(); ims.push(im); }
  const cw = (items[0].c ? items[0].c[2] : ims[0].width) * scale, ch = (items[0].c ? items[0].c[3] : ims[0].height) * scale;
  const cv = document.getElementById('c'); cv.width = cw * Math.min(cols, ims.length); cv.height = ch * Math.ceil(ims.length / cols);
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = scale < 1;
  ims.forEach((im, i) => { const c = items[i].c || [0, 0, im.width, im.height]; g.drawImage(im, c[0], c[1], c[2], c[3], (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch); });
  return [cv.width, cv.height];
}, [items, +cols, +scale]);
await p.setViewportSize({ width: size[0], height: size[1] });
await p.locator('#c').screenshot({ path: out });
await b.close();
