import { startPainting } from './paint.js';
// (the textures are painted by worker threads from here on, while the main module is fetched and built)
startPainting();
const loading = document.getElementById('loading');
function fail() {
  loading.querySelector('.loading-ring')?.remove();
  document.getElementById('loading-message').textContent = 'Unable to paint the world';
  document.getElementById('loading-detail').textContent = 'Please reload. A browser with WebGL 2 support is required.';
}
addEventListener('error', fail);
addEventListener('unhandledrejection', fail);
addEventListener('scene-ready', () => {
  loading.remove();
  removeEventListener('error', fail);
  removeEventListener('unhandledrejection', fail);
}, { once: true });
// Let the static loading screen paint before evaluating procedural scene modules.
requestAnimationFrame(() => requestAnimationFrame(() => {
  import('./main.js').catch((error) => {
    fail();
    console.error(error);
  });
}));
