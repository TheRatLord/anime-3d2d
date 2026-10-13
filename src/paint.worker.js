// Paints textures for src/paint.js (see there). Only dependency-free painters are imported here.
import { brushPixels, cloudPixels, paperPixels } from './paint/brush-pixels.js';
import { crownPixels } from './extra/far-pixels.js';
import { foliagePixels } from './extra/foliage-pixels.js';
import { tuftPixels } from './extra/grass-atlas.js';
import { hillArrays, crownArrays } from './extra/far-crowns.js';
import { computePlan } from './terrain-plan.js';

const JOBS = {
  brush: () => brushPixels(512),
  cloud: () => cloudPixels(512),
  paper: () => paperPixels(512),
  crown: () => crownPixels(256),
  foliage: () => foliagePixels(256),
  tuft: () => tuftPixels(256),
  plan: () => computePlan(),
  hills: () => hillArrays(),
  crowns: () => crownArrays(''),
};

// what to paint comes with the name the page gave the worker
for (const name of self.name.split(',')) {
  const r = JOBS[name]();
  const bufs = [];
  for (const v of [r, ...Object.values(r)]) if (ArrayBuffer.isView(v)) bufs.push(v.buffer);
  self.postMessage({ name, r }, [...new Set(bufs)]);
}
