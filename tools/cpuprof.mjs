// Steady-state CPU profile of the frame loop (dev server) -> top self-time functions. usage: node tools/cpuprof.mjs "<query>"
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const srv = await serve();
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await p.goto(srv.url + '?hud=0&t=3&' + (process.argv[2] || ''));
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 12, null, { timeout: 90000 });
await p.waitForTimeout(+(process.env.SETTLE||6000));
const c = await p.context().newCDPSession(p);
await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 200 }); await c.send('Profiler.start');
await p.waitForTimeout(4000);
const { profile } = await c.send('Profiler.stop');
const dt = profile.timeDeltas, self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
profile.samples.forEach((id, i) => { const n = byId.get(id), k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().split('?')[0]}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) || 0) + dt[i]); });
const tot = [...self.values()].reduce((a, b) => a + b, 0);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`);
await b.close(); await srv.close();
