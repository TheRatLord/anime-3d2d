import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(`http://localhost:5311/?hud=0`);
await p.waitForFunction(() => window.__app && window.__app.stat.frames > 3);
console.log(JSON.stringify(await p.evaluate(() => {
  const out = [];
  window.__app.scene.traverse(o => { const m = o.material; if (m && m.uniforms && m.uniforms.uTuft) {
    const P = o.geometry.attributes.iPos.array, D = o.geometry.attributes.iData.array;
    for (let i = 0; i < P.length / 3; i++) { const x = P[i*3], z = P[i*3+2]; if (Math.hypot(x + 16, z - 19) < 4 && D[i*4] > 0.45 && D[i*4+3] === 0) out.push([+x.toFixed(2), +P[i*3+1].toFixed(2), +z.toFixed(2), +D[i*4].toFixed(2), +D[i*4+2].toFixed(2)]); } } });
  return out.slice(0, 12);
})));
await b.close();
