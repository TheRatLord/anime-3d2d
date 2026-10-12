// clicks the quality button through its cycle and prints label + level. usage: node tools/qui.mjs
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 90000 });
const btn = p.locator('button', { hasText: '⚙' });
for (let i = 0; i < 6; i++) { console.log(await btn.textContent(), await p.evaluate(() => `${__app.quality.name} ${__app.pipe.w}x${__app.pipe.h} msaa${__app.params.msaa}`)); await btn.click(); await p.waitForTimeout(300); }
await p.screenshot({ path: 'shots/qui.png' });
await b.close(); await srv.close();
