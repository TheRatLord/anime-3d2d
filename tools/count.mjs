import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage();
await p.goto(srv.url + '?hud=0&prebake=0');
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 5);
const st = await p.evaluate(() => window.__st); for (const [k, v] of Object.entries(st).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(v * 997).padStart(8), k);
await b.close(); await srv.close();
