// Does auto quality stay put on a machine that keeps up, and step down on one that does not? usage: node tools/autoq.mjs [WxH] [seconds]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const [size = '1280x720', secs = '25', extra = ''] = process.argv.slice(2); const [W, H] = size.split('x').map(Number);
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = []; p.on('console', m => { if (m.text().startsWith('[quality]')) logs.push(m.text()); });
await p.goto(srv.url + '?hud=0' + extra);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 120000 });
const snap = () => p.evaluate(() => ({ level: __app.quality.name, auto: __app.quality.auto, msaa: __app.params.msaa, scale: __app.params.scale, buf: [__app.pipe.w, __app.pipe.h] }));
console.log('start', JSON.stringify(await snap()));
for (let i = 0; i < +secs; i += 5) { await p.waitForTimeout(5000); console.log(`t+${i + 5}s`, JSON.stringify(await snap())); }
console.log(logs.join('\n') || '(no changes)');
await b.close(); await srv.close();
