// World layout helpers shared by all scene builders.
import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function h2(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, z) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const tx = x - x0, tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = h2(x0, z0), b = h2(x0 + 1, z0), c = h2(x0, z0 + 1), d = h2(x0 + 1, z0 + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
export function fbm(x, z, oct = 4) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The hill: a gentle plateau at the origin that rolls away on all sides.
export function height(x, z) {
  const r = Math.hypot(x, z * 0.92);
  let h = -24 * Math.pow(smooth(13, 95, r), 1.25);
  h += (fbm(x * 0.022 + 3.1, z * 0.022 - 1.7) - 0.5) * 16 * smooth(18, 70, r);
  h += (fbm(x * 0.11, z * 0.11) - 0.5) * 0.9 * smooth(7, 16, r);
  h += (fbm(x * 0.5 + 9, z * 0.5) - 0.5) * 0.12;
  return h;
}
export function normalAt(x, z, e = 0.4) {
  const n = new THREE.Vector3(height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e));
  return n.normalize();
}

// The dirt path: from the chapel door down the hill.
export const PATH = [
  [0, 6.5], [0.6, 11], [3.5, 16], [8.5, 21], [12, 28], [12.5, 37], [9, 47], [3, 58],
];
export function pathDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const ax = PATH[i][0], az = PATH[i][1], bx = PATH[i + 1][0], bz = PATH[i + 1][1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

export const SUN = new THREE.Vector3(-0.58, 0.62, 0.42).normalize();

// Floor of the nave: what is left of the paving. Three bands (west aisle, nave, east aisle), each
// laid in its own courses so no joint runs wall to wall; the nave band has the big slabs. Most of
// the floor is gone: slabs survive in broken clusters, some of them cracked, shifted or with a
// corner missing. Generated once and shared so grass can avoid the stone.
// Each slab: [cx, cz, w, d, rotY, tiltX, tiltZ, sink, crack, corner]
//   crack  = null | [t, k]        split across the long axis at fraction t, skewed by k
//   corner = null | [sx, sz, ax, az]  the (sx,sz = +-1) corner broken off, ax/az metres along the edges
export const SLABS = (() => {
  const R = rng(555), out = [];
  const bands = [[-4.45, -2.8, 0.7, 1.3], [-2.8, 2.75, 1.0, 2.4], [2.75, 4.45, 0.7, 1.3]];
  for (const [bx0, bx1, lo, hi] of bands) {
    let z = -8.35 + R() * 0.25;
    while (z < 7.0) {
      const d = Math.min(lo * 0.95 + R() * (hi - lo) * 0.6, 7.45 - z);
      let x = bx0;
      while (x < bx1 - 0.3) {
        let w = lo + R() * R() * (hi - lo) * 1.3;
        if (bx1 - x - w < 0.5) w = bx1 - x;
        const cx = x + w / 2, cz = z + d / 2;
        x += w;
        // survival: clusters, thinning toward the door and the fallen east side
        const keep = fbm(cx * 0.26 + 40, cz * 0.26 + 40, 2) - smooth(2, 7.4, cz) * 0.1 - smooth(1, 4.5, cx) * 0.06;
        const r = R(), loose = R() < 0.25, r2 = R(), r3 = R();
        const rec = [cx, cz, w - 0.04, d - 0.04, (R() - 0.5) * (loose ? 0.2 : 0.035), (R() - 0.5) * (loose ? 0.09 : 0.02), (R() - 0.5) * (loose ? 0.09 : 0.02), R() * (loose ? 0.085 : 0.03),
          r2 < 0.32 && Math.max(w, d) > 0.95 ? [0.3 + R() * 0.4, (R() - 0.5) * 0.7] : null,
          r3 < 0.34 ? [R() < 0.5 ? -1 : 1, R() < 0.5 ? -1 : 1, 0.12 + R() * 0.4, 0.12 + R() * 0.4] : null];
        if ((keep > 0.5 && r > 0.13) || (keep > 0.42 && r < 0.09)) out.push(rec);
      }
      z += d;
    }
  }
  return out;
})();
// true if (x,z) lies on a slab (margin > 0 shrinks the slabs so tufts can sit in the joints)
export function onSlab(x, z, margin = 0.06) {
  if (x < -4.6 || x > 4.6 || z < -8.5 || z > 7.6) return false;
  for (const s of SLABS) if (Math.abs(x - s[0]) < s[2] / 2 - margin && Math.abs(z - s[1]) < s[3] / 2 - margin) return true;
  return false;
}
