// Textures of the distant landscape and the sky (helper module, no default export): the pixels are painted by
// src/extra/far-pixels.js - in a worker thread while the page loads (src/paint.js), else here.
import * as THREE from 'three';
import { painted } from '../paint.js';
import { crownPixels, villagePixels, castlePixels, ATLAS } from './far-pixels.js';

export { ATLAS };

function texture({ d, w, h, repeatS, repeatT, mip, aniso }) {
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat);
  t.wrapS = repeatS ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = repeatT ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.generateMipmaps = mip;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

export const makeCrownAtlas = () => texture(painted.crown ?? crownPixels());
// (the two landmark cards stay on the page: a blur filter in a worker does not give the page's pixels)
export const makeVillageTex = () => texture(villagePixels());
export const makeCastleTex = () => texture(castlePixels());
