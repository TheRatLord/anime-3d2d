import { chromium } from 'playwright-core';
const variants = {
  vulkan: ['--use-angle=vulkan','--enable-features=Vulkan','--ignore-gpu-blocklist','--enable-gpu'],
  gl: ['--use-angle=gl','--ignore-gpu-blocklist','--enable-gpu'],
  egl: ['--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist','--enable-gpu'],
  default: ['--ignore-gpu-blocklist','--enable-gpu'],
};
for (const [name,args] of Object.entries(variants)) {
  try {
    const b = await chromium.launch({ executablePath:'/usr/bin/google-chrome', headless:true, args });
    const p = await b.newPage();
    await p.goto('http://localhost:5311/');
    await p.waitForFunction(()=>window.__gpu);
    console.log(name, JSON.stringify(await p.evaluate(()=>window.__gpu.renderer)));
    await b.close();
  } catch(e){ console.log(name,'ERR',e.message.split('\n')[0]); }
}
