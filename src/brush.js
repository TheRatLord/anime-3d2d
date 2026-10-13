// Procedural "paint" textures, generated once on the CPU with canvas 2D.
// Everything painterly in the scene samples these instead of computing noise per pixel
// (cheap on an integrated GPU) and, more importantly, they are made of *strokes*, not
// of smooth noise, so thresholding them yields brush-shaped edges.
import * as THREE from 'three';
import { rng } from './rng.js';
import { painted } from './paint.js';
import { brushPixels, cloudPixels, paperPixels } from './paint/brush-pixels.js';

// (a canvas of the page: the leaf and grass atlases are uploaded from one)
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function dataTex(data, size, opts = {}) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = opts.aniso ?? 4;
  t.needsUpdate = true;
  return t;
}

// R: medium dabs   G: large dabs   B: fine directional bristle strokes   A: soft fbm
// (the pixels come from the worker that painted them while the page loaded, else are painted here)
export function makeBrushTexture(size = 512) {
  return dataTex(painted.brush ?? brushPixels(size), size);
}

// Cloud-shaping noise. R: low fbm  G: mid fbm  B: big dabs (for painterly edge breakup)  A: fine fbm
export function makeCloudTexture(size = 512) {
  return dataTex(painted.cloud ?? cloudPixels(size), size, { aniso: 1 });
}

// Atlas of leaf-clump cards (2x2). R = per-leaf random tone, A = coverage.
// Each clump is a pile of small opaque leaf dabs, denser in the middle, so the alpha
// silhouette is ragged in the way a foliage brush leaves it.
export function makeLeafAtlas(cell = 256) {
  const size = cell * 2;
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (let v = 0; v < 4; v++) {
    const R = rng(500 + v * 17);
    const ox = (v % 2) * cell + cell / 2, oy = Math.floor(v / 2) * cell + cell / 2;
    const n = 150;
    for (let i = 0; i < n; i++) {
      // sqrt-less radius => denser centre
      const rr = Math.pow(R(), 0.75) * cell * 0.4;
      const th = R() * Math.PI * 2;
      const squash = 0.78;
      const x = ox + Math.cos(th) * rr, y = oy + Math.sin(th) * rr * squash;
      const len = cell * (0.075 + R() * 0.075), wid = len * (0.42 + R() * 0.25);
      // leaves lean outward/downward a little, like hanging foliage
      const ang = th + (R() - 0.5) * 1.6;
      const g = Math.floor(R() * 256);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = `rgba(${g},${g},${g},1)`;
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.quadraticCurveTo(0, -wid, len / 2, 0);
      ctx.quadraticCurveTo(0, wid, -len / 2, 0);
      ctx.fill();
      ctx.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Atlas of grass tufts (4x1). R = per-blade tone, A = coverage. Blades fan from the base centre.
export function makeGrassAtlas(cell = 256) {
  const c = canvas(cell * 4, cell);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, cell * 4, cell);
  for (let v = 0; v < 4; v++) {
    const R = rng(900 + v * 31);
    const ox = v * cell + cell / 2;
    const n = 15 + Math.floor(R() * 8);
    const blades = [];
    for (let i = 0; i < n; i++) blades.push({ t: (i + R() * 0.9) / n, h: 0.35 + R() * 0.6, g: Math.floor(R() * 256) });
    blades.sort((a, b) => b.h - a.h); // tall ones behind
    for (const b of blades) {
      const lean = (b.t - 0.5) * 1.3 + (R() - 0.5) * 0.5;
      const bx = ox + (b.t - 0.5) * cell * 0.42;
      const h = b.h * cell * 0.96;
      const w = cell * (0.016 + R() * 0.02);
      const curl = (R() - 0.5) * 0.5 + lean * 0.5;
      const tipx = bx + lean * h * 0.38 + curl * h * 0.25, tipy = cell - h;
      const midx = bx + lean * h * 0.10, midy = cell - h * 0.6;
      ctx.fillStyle = `rgba(${b.g},${b.g},${b.g},1)`;
      ctx.beginPath();
      ctx.moveTo(bx - w, cell);
      ctx.quadraticCurveTo(midx - w * 1.1, midy, tipx, tipy);
      ctx.quadraticCurveTo(midx + w * 1.1, midy, bx + w, cell);
      ctx.closePath();
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

// Paper / canvas tooth. Tileable, neutral grey = no change.
export function makePaperTexture(size = 512) {
  const t = dataTex(painted.paper ?? paperPixels(size), size, { aniso: 1 });
  t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
