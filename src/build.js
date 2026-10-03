// Accumulates lots of slightly irregular stones into one BufferGeometry.
// Per-vertex aData = (shape id, random tone, line weight, height above ground),
// aFace = (u, v, w, h of the block face in metres; joints are painted from these),
// aMisc = (stain, ao, cap (2 = a moulding drawn as two strokes), kind: 0 dressed block, 0.5 irregular lump, 1 turned stone),
// aWall = (s along the wall, y and strength of the ruled line drawn across this stone, share of the foot band it loses), aSlit = the blind
// slit drawn on it (s, y0, half width, height) - the architect's drawing, painted by stone.js; see setFeat.
// aLN = (lighting normal, mode): the painter's plane this vertex is toned with instead of its own
// face normal. mode 0 = none (the face normal is used), 1 = lit AND drawn with it (no ink crease
// on that stone), 2 = lit with it but drawn with the real facets (ink on the arrises of a lump),
// 3 = the weathered top of a broken wall (rubble core, moss and grass tone): xyz is then the wall's
// horizontal normal (or straight up if it has none), and the top is lit as the wall face on the
// viewer's side - see stone.js.
// Primitives: box/block (skewed cuboid, optionally with corners and arrises knocked off),
// rock (irregular convex lump, flat-shaded) and lathe (turned stone: drums, bases, capitals).
import * as THREE from 'three';
import { height } from './world.js';

const FACES = [
  // normal, 4 corners (CCW from outside)
  [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
  [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
  [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
  [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
  [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
];
// value noise in space (metres), -0.5..0.5, two octaves; `seed` picks the field
const hsh3 = (a, b, c, seed) => { const t = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + seed) * 43758.5453; return t - Math.floor(t); };
const vn3 = (x, y, z, seed) => {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z), tx = x - x0, ty = y - y0, tz = z - z0;
  const ux = tx * tx * (3 - 2 * tx), uy = ty * ty * (3 - 2 * ty), uz = tz * tz * (3 - 2 * tz);
  let r = 0;
  for (let i = 0; i < 8; i++) { const a = i & 1, b = (i >> 1) & 1, c = i >> 2; r += hsh3(x0 + a, y0 + b, z0 + c, seed) * (a ? ux : 1 - ux) * (b ? uy : 1 - uy) * (c ? uz : 1 - uz); }
  return r - 0.5;
};
// (wl = wavelength in metres)
export const lumpNoise = (x, y, z, seed, wl = 0.5) => vn3(x / wl, y / wl, z / wl, seed) * 0.72 + vn3(x / wl * 2.3 + 5, y / wl * 2.3 + 5, z / wl * 2.3 + 5, seed + 9) * 0.28;
// The planes that break the outline of a loose stone (unit-cube space, keep n.p <= d): ONE upper
// corner knocked off on a tilted plane, and two or three planes across the top that lean different
// ways, so the top edge is two or three straight chipped runs - never one level arris or one fillet.
export function chipPlanes(seed) {
  const h = (k) => hsh3(k, 3.3, 7.7, seed), out = [];
  const kx = h(1) < 0.5 ? -1 : 1, kz = h(2) < 0.5 ? -1 : 1;
  out.push({ n: [kx * (0.7 + h(3) * 0.5), 0.75 + h(4) * 0.5, kz * (0.35 + h(5) * 0.6)], d: 0.95 + h(6) * 0.3 });      // the corner
  const a0 = h(7) * 6.283, nT = h(8) < 0.5 ? 2 : 3;
  for (let i = 0; i < nT; i++) {
    const a = a0 + i * (6.283 / nT) + (h(9 + i) - 0.5) * 0.9, t = 0.22 + h(12 + i) * 0.3;
    out.push({ n: [Math.cos(a) * t, 1, Math.sin(a) * t], d: 0.80 + h(15 + i) * 0.16 });
  }
  return out;
}
const NOFACE = [50, 50, 100, 100];      // far from every edge: no joint is painted
const Z4 = [0, 0, 0, 0];

// Plane (unit-cube space, keeps n.p <= d) that knocks off corner (cx,cy,cz = +-1), removing
// lx, ly, lz (in unit-cube units; the cube edge is 2) along the three edges that meet there.
// An infinite length makes it a chamfer along that axis.
export const cutCorner = (cx, cy, cz, lx, ly, lz) => ({ n: [cx / lx, cy / ly, cz / lz], d: 1 / lx + 1 / ly + 1 / lz - 1 });

// random planes that turn a cube into a 5-12 sided lump
export function rockCuts(R, n, lo = 0.5, hi = 0.85) {
  const cuts = [];
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const nx = s * Math.cos(a), ny = u, nz = s * Math.sin(a);
    cuts.push({ n: [nx, ny, nz], d: (Math.abs(nx) + Math.abs(ny) + Math.abs(nz)) * (lo + R() * (hi - lo)) });
  }
  return cuts;
}

export class Builder {
  constructor() { this.pos = []; this.nrm = []; this.data = []; this.face = []; this.misc = []; this.lnA = []; this.idx = []; this.n = 0; this._id = 1; this.warp = null; this.elemA = []; this.elem = [0, 0, 0, 0]; this.prims = []; this.wallA = []; this.slitA = []; this.feat = null; this._fw = Z4; this._fs = Z4; this.footK = 0; this.footFn = null; this.elem2A = []; this.edgeFn = null; }
  // What is DRAWN on the following stones (see stone.js): feat = null, or
  //   { o: [x0, z0, dx, dz] the wall's origin and direction (omit for a pier or buttress: lines go round it),
  //     line: [y, strength] the ruled line (plinth, string course, cornice, set-off) that crosses this stone,
  //     slit: [s, y0, half width (< 0 square headed, > 0 pointed), height] the blind slit that touches it }
  // On a wall only the two wall faces (local z) and their chips carry the drawing.
  setFeat(f) { this.feat = f; }
  // the architectural element (a whole wall, a pier, a buttress, a column...) that the following stones belong to:
  // its centre, and w = 1. The shader gives each element one flat depth-plane tone. w = 0: none.
  setElem(x, y, z) { this.elem = [x, y, z, 1]; }
  clearElem() { this.elem = [0, 0, 0, 0]; this.edgeFn = null; }
  // The boundary between this element and its neighbour in the same wall, for the following stones:
  // fn(pos) -> [x, y, z of the neighbouring element's centre, signed distance to the boundary in
  // metres (the same signed field for the stones on both sides), +1 / -1: the side this element is on],
  // evaluated per vertex (the side is stored in aElem.w: 1 = +, 2 = -). stone.js draws the step between the
  // two planes as a brushed contour through the stones (aElem2). null: none.
  setEdge(fn) { this.edgeFn = fn; }
  // every primitive is remembered (vertex and index range) so prune() can test it for support
  _rec(v0, i0, opts) { this.prims.push({ v0, v1: this.n, i0, i1: this.idx.length, loose: !!opts.loose, fixed: !!opts.fixed, noPre: !!opts.noPre }); }

  // General support check, run once after everything is placed. A stone is supported if it reaches
  // the ground, or if it rests on / leans against a supported stone that starts lower and lies
  // under a fair part of it (bounding boxes: a quarter of its plan area, or under its centre).
  // Loose lumps (rocks) with nothing under them are lowered onto whatever is below; anything else
  // that hangs in the air is removed. Returns { removed, settled } (lists of [x, y, z]).
  prune() {
    const P = this.prims, pos = this.pos;
    for (const p of P) {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (let i = p.v0; i < p.v1; i++) for (let k = 0; k < 3; k++) { const c = pos[i * 3 + k]; if (c < mn[k]) mn[k] = c; if (c > mx[k]) mx[k] = c; }
      p.mn = mn; p.mx = mx; p.cx = (mn[0] + mx[0]) / 2; p.cz = (mn[2] + mx[2]) / 2;
    }
    const order = P.filter((p) => p.v1 > p.v0).sort((a, b) => a.mn[1] - b.mn[1]);
    const done = [], removed = [], settled = [];
    for (const A of order) {
      const g = height(A.cx, A.cz);
      if (A.fixed || A.mn[1] <= g + 0.1) { done.push(A); continue; }
      const area = (A.mx[0] - A.mn[0]) * (A.mx[2] - A.mn[2]);
      let ok = false, under = g;
      for (const B of done) {
        const ox = Math.min(A.mx[0], B.mx[0]) - Math.max(A.mn[0], B.mn[0]); if (ox < 0.03) continue;
        const oz = Math.min(A.mx[2], B.mx[2]) - Math.max(A.mn[2], B.mn[2]); if (oz < 0.03) continue;
        const holds = A.cx > B.mn[0] - 0.02 && A.cx < B.mx[0] + 0.02 && A.cz > B.mn[2] - 0.02 && A.cz < B.mx[2] + 0.02;
        if (holds && B.mx[1] > under && B.mx[1] < A.mn[1] + 0.06) under = B.mx[1];
        if (B.mx[1] >= A.mn[1] - 0.05 && (holds || ox * oz >= 0.25 * area)) { ok = true; break; }
      }
      if (ok) { done.push(A); continue; }
      const at = [A.cx, (A.mn[1] + A.mx[1]) / 2, A.cz];
      if (A.loose) {
        const dy = A.mn[1] - under + 0.03;
        for (let i = A.v0; i < A.v1; i++) { pos[i * 3 + 1] -= dy; this.data[i * 4 + 3] -= dy; }
        A.mn[1] -= dy; A.mx[1] -= dy; settled.push(at); done.push(A);
      } else { A.dead = true; removed.push(at); }
    }
    return { removed, settled };
  }

  nextId() { this._id = (this._id * 0.61803398875 + 0.137) % 1; return 0.02 + this._id * 0.96; }

  // v is mutated (warped). Returns the vertex index.
  _put(v, n, id, tone, line, ground, f, stain, ao, cap, cyl, ln) {
    if (this.warp) this.warp(v);
    if (ln) this.lnA.push(ln[0], ln[1], ln[2], ln[3] ?? 1); else this.lnA.push(0, 0, 0, 0);
    this.pos.push(v.x, v.y, v.z);
    this.nrm.push(n.x, n.y, n.z);
    this.data.push(id, tone, line, v.y - (ground ?? height(v.x, v.z)));
    this.face.push(f[0], f[1], f[2], f[3]);
    this.misc.push(stain, ao, cap, cyl);
    const e2 = this.edgeFn ? this.edgeFn(v) : null;
    this.elemA.push(this.elem[0], this.elem[1], this.elem[2], e2 && e2[4] < 0 ? 2 : this.elem[3]);
    if (e2) this.elem2A.push(e2[0], e2[1], e2[2], e2[3]); else this.elem2A.push(0, 0, 0, 1e3);
    this.wallA.push(this._fw[0], this._fw[1], this._fw[2], this._fw[3]); this.slitA.push(this._fs[0], this._fs[1], this._fs[2], this._fs[3]);
    return this.n++;
  }

  // m: Matrix4 placing a unit cube [-1,1]^3 already scaled.
  // opts: id, tone, line, ground, stain, cap, ao (number | fn(localNormal)), skew (8 corner offsets),
  //       cuts ([{n,d}] clip planes in unit-cube space), trueN (flat geometric normals on every face),
  //       noFace (no block coordinates on any face: nothing is painted from the edges)
  // aFace always spans the whole original face of the stone and stays affine across it, also after
  // cuts; the new faces made by a cut carry no block coordinates.
  box(m, opts = {}) {
    const v0_ = this.n, i0_ = this.idx.length;
    const id = opts.id ?? this.nextId();
    const tone = opts.tone ?? Math.random();
    const line = opts.line ?? 1;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    const skew = opts.skew;
    // half extents in metres, for per-face block coordinates
    const e = m.elements;
    const hx = Math.hypot(e[0], e[1], e[2]), hy = Math.hypot(e[4], e[5], e[6]), hz = Math.hypot(e[8], e[9], e[10]);
    const stain = opts.stain ?? 0, cap = opts.cap ?? 0;
    const cl = (x) => Math.min(1, Math.max(-1, x));

    // faces as polygons in unit space; orig keeps the unskewed coordinate for the joint painting
    let faces = FACES.map(([fn, cs]) => ({
      fn, pts: cs.map((c) => {
        const p = new THREE.Vector3(c[0], c[1], c[2]);
        p.o = new THREE.Vector3(c[0], c[1], c[2]);
        if (skew) p.add(skew[(c[0] > 0 ? 1 : 0) + (c[1] > 0 ? 2 : 0) + (c[2] > 0 ? 4 : 0)]);
        return p;
      }),
    }));
    for (const cut of opts.cuts ?? []) {
      const [nx, ny, nz] = cut.n, d = cut.d;
      const next = [], capPts = [];
      const dist = (p) => nx * p.x + ny * p.y + nz * p.z - d;
      for (const f of faces) {
        const out = [], P = f.pts;
        for (let i = 0; i < P.length; i++) {
          const A = P[i], B = P[(i + 1) % P.length], da = dist(A), db = dist(B);
          if (da <= 0) { out.push(A); if (da === 0) capPts.push(A); }
          if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
            const t = da / (da - db);
            const X = A.clone().lerp(B, t); X.o = A.o.clone().lerp(B.o, t);
            out.push(X); capPts.push(X);
          }
        }
        if (out.length >= 3) next.push({ fn: f.fn, pts: out, cut: f.cut });
      }
      // the new face closing the cut
      const uniq = [];
      for (const p of capPts) if (!uniq.some((q) => q.distanceToSquared(p) < 1e-10)) uniq.push(p);
      if (uniq.length >= 3) {
        const N = new THREE.Vector3(nx, ny, nz).normalize();
        const c = new THREE.Vector3(); for (const p of uniq) c.add(p); c.multiplyScalar(1 / uniq.length);
        const U = new THREE.Vector3(Math.abs(N.x) < 0.8 ? 1 : 0, Math.abs(N.x) < 0.8 ? 0 : 1, 0); U.addScaledVector(N, -U.dot(N)).normalize();
        const V = new THREE.Vector3().crossVectors(N, U);
        const ang = (p) => Math.atan2((p.x - c.x) * V.x + (p.y - c.y) * V.y + (p.z - c.z) * V.z, (p.x - c.x) * U.x + (p.y - c.y) * U.y + (p.z - c.z) * U.z);
        uniq.sort((p, q) => ang(p) - ang(q));
        next.push({ fn: [N.x, N.y, N.z], pts: uniq, cut: true });
      }
      faces = next;
    }

    // lighting normals: opts.ln(fn, o, cut) -> direction in the stone's own (unit-cube) frame, or
    // null to keep the face normal; opts.lnW(worldPos, faceNormal) -> world direction or null.
    const w = [], lv = new THREE.Vector3();
    const lnMode = opts.lnMode ?? 1;
    for (const f of faces) {
      const fn = f.fn;
      const ao = typeof opts.ao === 'function' ? (f.cut ? 0 : opts.ao(fn)) : (opts.ao ?? 0);
      w.length = 0;
      for (const p of f.pts) w.push(new THREE.Vector3().copy(p).applyMatrix4(m));
      if (f.cut || opts.trueN) {
        // Newell normal of the placed polygon
        nn.set(0, 0, 0);
        for (let i = 0; i < w.length; i++) { const a = w[i], b2 = w[(i + 1) % w.length]; nn.x += (a.y - b2.y) * (a.z + b2.z); nn.y += (a.z - b2.z) * (a.x + b2.x); nn.z += (a.x - b2.x) * (a.y + b2.y); }
        if (nn.lengthSq() < 1e-14) continue;
        nn.normalize();
      } else nn.set(fn[0], fn[1], fn[2]).applyMatrix3(nm).normalize();
      // a chip or chamfer is toned (and drawn) as the face it was knocked out of: the nearest of
      // the stone's own six faces. So a worn arris is a change of outline, not a facet with its
      // own light. (Lumps - trueN - keep every facet unless the caller plans their tone.)
      let snap = null;
      if (f.cut && !opts.trueN && opts.snapCuts !== false) {
        let best = -2;
        for (const [g] of FACES) { lv.set(g[0], g[1], g[2]).applyMatrix3(nm).normalize(); const d = lv.dot(nn); if (d > best) { best = d; snap = [lv.x, lv.y, lv.z, opts.breakTop && g[1] > 0 ? 3 : 1]; } }
        // (a cut through a stone of a broken top that looks up at all is part of the break surface, however steep)
        if (opts.breakTop && nn.y > 0.15) { lv.set(0, 1, 0).applyMatrix3(nm).normalize(); snap = [lv.x, lv.y, lv.z, 3]; }
      } else if (opts.breakTop && !f.cut && fn[1] > 0) {
        // (opts.breakTop: the stone's top, and any cut that looks more up than sideways, is the weathered top of a ruin)
        lv.set(0, 1, 0).applyMatrix3(nm).normalize(); snap = [lv.x, lv.y, lv.z, 3];
      }
      const first = this.n;
      for (let i = 0; i < w.length; i++) {
        const o = f.pts[i].o;
        let fc = NOFACE;
        if (!f.cut && !opts.noFace) {
          if (fn[0] !== 0) fc = [(cl(o.z) + 1) * hz, (cl(o.y) + 1) * hy, 2 * hz, 2 * hy];
          else if (fn[1] !== 0) fc = [(cl(o.x) + 1) * hx, (cl(o.z) + 1) * hz, 2 * hx, 2 * hz];
          else fc = [(cl(o.x) + 1) * hx, (cl(o.y) + 1) * hy, 2 * hx, 2 * hy];
        }
        let L = null;
        if (opts.ln) { const l = opts.ln(fn, o, !!f.cut); if (l) { lv.set(l[0], l[1], l[2]).applyMatrix3(nm).normalize(); L = [lv.x, lv.y, lv.z, l[3] ?? lnMode]; } else if (l === undefined) L = snap; }
        else if (opts.lnW) { const l = opts.lnW(w[i], nn); if (l) L = [l[0], l[1], l[2], l[3] ?? lnMode]; }
        else L = snap;
        const F = this.feat;
        // (aWall.w = how much of the foot band this stone LOSES: low free-standing masses are not stained like a wall)
        const fk = this.footFn ? this.footFn(w[i]) : this.footK;
        if (F && (!F.o || f.cut || fn[2] !== 0)) {
          // (F.front: a line that is carried by the front face only does not run round the corner)
          const ln = F.line && !(F.line[2] && fn[2] === 0) ? F.line : null;
          this._fw = [F.o ? (w[i].x - F.o[0]) * F.o[2] + (w[i].z - F.o[1]) * F.o[3] : 0, ln ? ln[0] : 0, ln ? ln[1] : 0, fk];
          this._fs = F.slit ?? Z4;
        } else { this._fw = fk ? [0, 0, 0, fk] : Z4; this._fs = Z4; }
        v.copy(w[i]);
        // (opts.arris = [ax, az]: the upright edge of the +-z faces (ax) / of the +-x faces (az) that is an outer
        // corner of the mass: -1 the low-u side, 1 the high-u side, 2 both. Carried as the fraction of the line weight.)
        let lineF = line;
        if (opts.arris && !f.cut && fn[1] === 0) { const a = fn[2] !== 0 ? opts.arris[0] : opts.arris[1]; lineF = line + (a === 2 ? 0.75 : a < 0 ? 0.25 : a > 0 ? 0.5 : 0); }
        // (opts.stainW(worldPos): stain as a continuous field over the element, read before the warp)
        this._put(v, nn, id, tone, lineF, opts.ground, fc, opts.stainW ? opts.stainW(w[i]) + 2 : stain, ao, cap, opts.lump ? 0.5 : 0, L);
      }
      for (let i = 1; i < w.length - 1; i++) this.idx.push(first, first + i, first + i + 1);
    }
    this._fw = Z4; this._fs = Z4;
    this._rec(v0_, i0_, opts);
    return id;
  }

  // convenience: block by centre/size/rotation. opts.chips = [[cx,cy,cz, ax,ay,az], ...]: corner
  // (cx,cy,cz = +-1) knocked off, removing ax/ay/az METRES along the edges (Infinity = chamfer).
  block(cx, cy, cz, sx, sy, sz, opts = {}) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    if (opts.rot) q.setFromEuler(opts.rot);
    m.compose(new THREE.Vector3(cx, cy, cz), q, new THREE.Vector3(sx / 2, sy / 2, sz / 2));
    if (opts.parent) m.premultiply(opts.parent);
    if (opts.chips && opts.chips.length) {
      const cuts = opts.chips.map(([kx, ky, kz, ax, ay, az]) => cutCorner(kx, ky, kz, ax / (sx / 2), ay / (sy / 2), az / (sz / 2)));
      opts = { ...opts, cuts: opts.cuts ? opts.cuts.concat(cuts) : cuts };
    }
    return this.box(m, opts);
  }

  // irregular convex lump of about sx*sy*sz, flat-shaded. R = rng. opts.n = number of cuts.
  // A lump is still a "block" for the shader (aMisc.w = 0, so it gets its own tint) but none of
  // its faces carries block coordinates (noFace): no joints, lips or painted chips on it.
  rock(R, cx, cy, cz, sx, sy, sz, opts = {}) {
    // Unless the caller plans its tone, a lump is lit as ONE rounded mass: by the direction out from
    // its middle (lifted a little), not facet by facet, and its facets are not drawn.
    if (!opts.lnW && !opts.ln) {
      const c = new THREE.Vector3(cx, cy - sy * 0.25, cz); if (opts.parent) c.applyMatrix4(opts.parent);
      opts = { ...opts, lnW: (pos) => { const ax = pos.x - c.x, ay = (pos.y - c.y) * 1.2, az = pos.z - c.z, l = Math.hypot(ax, ay, az) || 1; return [ax / l, ay / l, az / l, 1]; } };
    }
    // (the same random numbers as the faceted lump this used to be, so every stone keeps its place)
    return this.blob(cx, cy, cz, sx, sy, sz, {
      skew: wobble(R, opts.skewAmt ?? 0.3), cuts: rockCuts(R, opts.n ?? 5, opts.lo ?? 0.5, opts.hi ?? 0.85), tone: R(), cap: 0, loose: true, ...opts,
    });
  }

  // A boulder as a painter draws one: a rounded, irregular mass with no straight edge on it. A
  // subdivided icosahedron (42 vertices for a fist-sized stone, 162 for a boulder) pushed about by
  // a few slow lobes and worn flat in a few places, sunk flat underneath. Smooth normals; toned
  // with the planned direction (opts.lnW, as for rock), so nothing of the mesh shows in the paint.
  // opts.skew / opts.cuts (as made by wobble / rockCuts) are the random numbers that shape it;
  // opts.boxy: a fallen dressed block - squarer, with flatter sides.
  blob(cx, cy, cz, sx, sy, sz, opts = {}) {
    const v0_ = this.n, i0_ = this.idx.length;
    const id = opts.id ?? this.nextId(), tone = opts.tone ?? Math.random(), line = opts.line ?? 1;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    if (opts.rot) q.setFromEuler(opts.rot);
    m.compose(new THREE.Vector3(cx, cy, cz), q, new THREE.Vector3(sx / 2, sy / 2, sz / 2));
    if (opts.parent) m.premultiply(opts.parent);
    const sk = opts.skew ?? [], cuts = opts.cuts ?? [];
    const big = Math.max(sx, sy, sz) > 0.24;
    // A loose stone (opts.loose) is WEATHERED, not cut: no clip plane touches it (planes gave it
    // planar facets and ruled arrises - a low-poly boulder). Its rounded mass is pushed in and out
    // ALONG ITS SMOOTHED NORMAL by two octaves of noise of 6-10 cm (half-metre wave) and a third of
    // ~2 cm (a hand's wave). It is toned with that smoothed normal (or the planned direction, opts.lnW),
    // so the paint sees a rounded mass and only the outline carries the knocks.
    const rough = !!opts.loose && opts.chipped !== false && Math.min(sx, sy, sz) > 0.12;
    const seedN = opts.seed ?? (Math.abs(cx * 12.9898 + cz * 78.233 + cy * 37.7) % 97.0);
    const mn = Math.min(sx, sy, sz);
    const nAmp = rough ? Math.min(0.10, Math.max(0.06, 0.2 * mn)) * Math.min(1, mn / 0.3) : 0, nAmp2 = rough ? Math.min(0.022, 0.06 * mn) : 0;
    const lvl = rough ? (Math.max(sx, sy, sz) > 0.9 ? 3 : big ? 2 : 1) : (big ? 2 : 1);
    const { pos: U, idx: I } = ICO[lvl];
    // lobes: three slow swellings / hollows; flats (only a stone that is not loose): worn plane places
    const lobes = [];
    for (let i = 0; i < 3 && i < sk.length; i++) { const d = sk[i].clone().add(sk[i + 3] ?? sk[i]); const l = d.length() || 1; lobes.push([d.x / l, d.y / l, d.z / l, (i === 0 ? 0.2 : 0.13) * (sk[i + 4] && sk[i + 4].x < 0 ? -1 : 1)]); }
    const flats = rough ? [] : cuts.slice(0, opts.boxy ? 0 : 5).map((c) => { const l = Math.hypot(c.n[0], c.n[1], c.n[2]) || 1; return [c.n[0] / l, c.n[1] / l, c.n[2] / l, 0.74 + 0.22 * ((c.d * 7.31) % 1)]; });
    const pw = opts.boxy ? 0.42 : 0.8;                          // < 1: squarer
    const nv = U.length / 3, W = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), low = new Uint8Array(nv);
    const p = new THREE.Vector3(), nn = new THREE.Vector3(), v = new THREE.Vector3(), w = new THREE.Vector3();
    for (let j = 0; j < nv; j++) {
      const ux = U[j * 3], uy = U[j * 3 + 1], uz = U[j * 3 + 2];
      // superellipsoid: push the unit direction toward the cube
      const ax = Math.pow(Math.abs(ux), pw) * Math.sign(ux), ay = Math.pow(Math.abs(uy), pw) * Math.sign(uy), az = Math.pow(Math.abs(uz), pw) * Math.sign(uz);
      const al = Math.max(Math.abs(ax), Math.abs(ay), Math.abs(az)) * (opts.boxy ? 0.8 : 0.72) + Math.hypot(ax, ay, az) * (opts.boxy ? 0.2 : 0.28);
      p.set(ax / (al || 1), ay / (al || 1), az / (al || 1));
      let k = 1;
      for (const [lx, ly, lz, a] of lobes) { const c = ux * lx + uy * ly + uz * lz; k += a * c * Math.abs(c); }
      for (const [fx, fy, fz, K] of flats) { const c = ux * fx + uy * fy + uz * fz; if (c > 0.35) { const lim = K / c; if (k > lim) k = lim * 0.75 + k * 0.25; } }
      p.multiplyScalar(k);
      if (p.y < -0.62) { p.y = -0.62 - (p.y + 0.62) * 0.15; low[j] = 1; }      // it lies on (and a little in) the ground
      w.copy(p).applyMatrix4(m);
      W[j * 3] = w.x; W[j * 3 + 1] = w.y; W[j * 3 + 2] = w.z;
    }
    // smoothed normal: area-weighted face normals of the undisplaced mass, then one pass of averaging
    // over the neighbours (so the tone boundary on it is a slow curve, not a facet edge)
    const acc = (arr, a, x, y, z) => { arr[a * 3] += x; arr[a * 3 + 1] += y; arr[a * 3 + 2] += z; };
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b2 = I[t + 1], c = I[t + 2];
      const e1x = W[b2 * 3] - W[a * 3], e1y = W[b2 * 3 + 1] - W[a * 3 + 1], e1z = W[b2 * 3 + 2] - W[a * 3 + 2];
      const e2x = W[c * 3] - W[a * 3], e2y = W[c * 3 + 1] - W[a * 3 + 1], e2z = W[c * 3 + 2] - W[a * 3 + 2];
      const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
      for (const k of [a, b2, c]) acc(Nn, k, fx, fy, fz);
    }
    const norm = (arr) => { for (let j = 0; j < nv; j++) { const l = Math.hypot(arr[j * 3], arr[j * 3 + 1], arr[j * 3 + 2]) || 1; arr[j * 3] /= l; arr[j * 3 + 1] /= l; arr[j * 3 + 2] /= l; } };
    norm(Nn);
    if (rough) {
      const S = new Float32Array(Nn);
      for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) { const a = I[t + e], b2 = I[t + (e + 1) % 3]; acc(S, a, Nn[b2 * 3], Nn[b2 * 3 + 1], Nn[b2 * 3 + 2]); acc(S, b2, Nn[a * 3], Nn[a * 3 + 1], Nn[a * 3 + 2]); }
      norm(S); Nn.set(S);
    }
    const first = this.n;
    for (let j = 0; j < nv; j++) {
      w.set(W[j * 3], W[j * 3 + 1], W[j * 3 + 2]); nn.set(Nn[j * 3], Nn[j * 3 + 1], Nn[j * 3 + 2]);
      if (rough) {
        // (the knocks fade out where the stone goes into the ground, so it never floats on a ledge of its own)
        const kG = low[j] ? 0.35 : 1;
        const d = (lumpNoise(w.x, w.y, w.z, seedN, 0.5) * 2.6 * nAmp + lumpNoise(w.x, w.y, w.z, seedN + 17, 0.13) * 2 * nAmp2) * kG;
        w.addScaledVector(nn, d);
      }
      let L = null;
      if (opts.lnW) { const l = opts.lnW(w, nn); if (l) L = [l[0], l[1], l[2], l[3] ?? 1]; }
      const fk = this.footFn ? this.footFn(w) : this.footK;
      this._fw = fk ? [0, 0, 0, fk] : Z4; this._fs = Z4;
      v.copy(w);
      this._put(v, nn.clone(), id, tone, line, opts.ground, NOFACE, opts.stain ?? 0, 0, opts.cap ?? 0, 0.5, L);
    }
    for (let i = 0; i < I.length; i++) this.idx.push(first + I[i]);
    this._fw = Z4;
    this._rec(v0_, i0_, opts);
    return id;
  }

  // A fallen dressed block: still a squared stone, but weathered round - a boxy mass (blob, boxy) with
  // no clip plane on it, pushed in and out along its smoothed normal (see blob). opts.chips are ignored
  // (a knocked corner is left to the noise: planes made planar facets and ruled arrises).
  chunk(cx, cy, cz, sx, sy, sz, opts = {}) {
    return this.blob(cx, cy, cz, sx, sy, sz, { ...opts, boxy: true, loose: opts.loose ?? true, cuts: [] });
  }

  // Turned stone. m places a unit cylinder (radius 1, y in [-1,1]); prof = [[y, r], ...] bottom to
  // top. Each profile segment is its own band (crisp mouldings), smooth around the axis.
  // opts: sides, lump (radius wander), notches [{a, w, y, reach, depth, drop}] (chipped rims: within
  //   angle w of a and `reach` of height y the radius shrinks by `depth` and the rim drops by `drop`),
  //   cut {a, slope, y0, rough} (broken top: everything above the tilted plane is removed),
  //   capTop / capBottom (default true)
  lathe(m, prof, opts = {}) {
    const v0_ = this.n, i0_ = this.idx.length;
    const id = opts.id ?? this.nextId();
    const tone = opts.tone ?? Math.random();
    const line = opts.line ?? 1;
    const sides = opts.sides ?? 20;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const v = new THREE.Vector3(), nn = new THREE.Vector3();
    const stain = opts.stain ?? 0, ao = opts.ao ?? 0;
    const lump = opts.lump ?? 0, ph = ((id * 97.13) % 1) * 6.28, ph2 = ((id * 41.71) % 1) * 6.28;   // same every start-up
    const notches = opts.notches ?? [], cut = opts.cut, ringWob = opts.ringWob ?? 0;
    // Not a surface of revolution: opts.ell = how oval the section is (radius * (1 + ell sin(2a + phi)), the
    // oval turning slowly up the axis), opts.noise = metres of in-and-out on a half-metre wave (world-fixed),
    // opts.bend(worldY) -> [dx, dz]: the axis itself wanders, opts.sub = rings per profile segment (so the
    // noise and the bend have something to move), opts.clip = [{ n, d }] planes in unit space (keep n.p <= d).
    const ell = opts.ell ?? 0, nzA = opts.noise ?? 0, nz2 = opts.noise2 ?? 0, bend = opts.bend, sub = opts.sub ?? 1, clip = opts.clip ?? [], nzSeed = opts.seed ?? id * 53.1;
    if (sub > 1) { const pr = []; for (let k = 0; k < prof.length - 1; k++) for (let u = 0; u < sub; u++) pr.push([prof[k][0] + (prof[k + 1][0] - prof[k][0]) * u / sub, prof[k][1] + (prof[k + 1][1] - prof[k][1]) * u / sub]); pr.push(prof[prof.length - 1]); prof = pr; }
    const radW = new THREE.Vector3();
    // unit-space point -> world, with the world-space irregularities (the same for sides and caps)
    const toWorld = (p, a, out) => {
      for (const c of clip) { const d = c.n[0] * p.x + c.n[1] * p.y + c.n[2] * p.z - c.d; if (d > 0) { const l2 = c.n[0] * c.n[0] + c.n[1] * c.n[1] + c.n[2] * c.n[2]; p.x -= c.n[0] * d / l2; p.y -= c.n[1] * d / l2; p.z -= c.n[2] * d / l2; } }
      out.copy(p).applyMatrix4(m);
      if (nzA) { radW.set(Math.cos(a), 0, Math.sin(a)).applyMatrix3(nm).normalize(); out.addScaledVector(radW, lumpNoise(out.x, out.y, out.z, nzSeed) * 2 * nzA + (nz2 ? lumpNoise(out.x, out.y, out.z, nzSeed + 17, 0.13) * 2 * nz2 : 0)); }
      if (bend) { const b2 = bend(out.y); out.x += b2[0]; out.z += b2[1]; }
      return out;
    };
    const yLo = prof[0][0];
    // position of the surface point at angle index i, profile height y, profile radius r
    const P = (i, y, r, out) => {
      const a = (i % sides) / sides * Math.PI * 2;
      let rr = r * (1 + lump * (Math.sin(a * 2 + ph) * 0.5 + Math.sin(a * 5 + ph2 + y * 1.3) * 0.35 + Math.sin(a * 9 + ph * 2 + y * 2.1) * 0.2) + ell * Math.sin(a * 2 + ph2 + y * (opts.twist ?? 0.6)));
      // (opts.ringWob: the rings of the profile are not plane circles - each rises and falls a little round the shaft)
      let yy = y + ringWob * (Math.sin(a + ph2) * 0.55 + Math.sin(a * 2 + ph) * 0.3 + Math.sin(a * 3 + ph2 * 2 + y * 2.3) * 0.25);
      for (const nt of notches) {
        let da = Math.abs(a - nt.a) % (Math.PI * 2); if (da > Math.PI) da = Math.PI * 2 - da;
        const fa = Math.max(0, 1 - da / nt.w), fy = Math.max(0, 1 - Math.abs(y - nt.y) / nt.reach);
        if (fa <= 0 || fy <= 0) continue;
        const f = fa * fa * (3 - 2 * fa);
        rr *= 1 - nt.depth * f * fy;
        yy -= Math.sign(nt.y) * nt.drop * f * fy * fy;
      }
      let x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (cut) {
        const yc = cut.y0 + cut.slope * (x * Math.cos(cut.a) + z * Math.sin(cut.a))
          + (cut.rough ?? 0) * (Math.sin(a * 3 + ph) * 0.6 + Math.sin(a * 7 + ph2) * 0.4);
        if (yy > yc) yy = Math.max(yc, yLo);
      }
      return out.set(x, yy, z);
    };
    // Painted, not turned: every band of the profile is toned with the plain radial direction of
    // the shaft (so a bevel or a roll gets no tone of its own: the shaft is one lit strip and one
    // shade strip), and carries its height in the drum (v, H in metres) so the bed joints at the
    // two ends can be drawn as lines by the shader.
    const me = m.elements, hy = Math.hypot(me[4], me[5], me[6]);
    const yHi = prof[prof.length - 1][0], Hm = (yHi - yLo) * hy;
    const lnv = new THREE.Vector3();
    const put = (p, n, a, y) => {
      toWorld(p, a, v);
      let L = null;
      if (opts.lnC) { lnv.set(v.x - opts.lnC[0], (v.y - opts.lnC[1]) * 1.2, v.z - opts.lnC[2]).normalize(); L = [lnv.x, lnv.y, lnv.z, 1]; }
      else if (opts.radial !== false) { lnv.set(Math.cos(a), opts.lnUp ?? 0, Math.sin(a)).applyMatrix3(nm).normalize(); L = [lnv.x, lnv.y, lnv.z, 1]; }
      const fc = opts.joints === false ? NOFACE : [50, (y - yLo) * hy, 100, Hm];
      return this._put(v, n, id, tone, line, opts.ground, fc, stain, ao, opts.cap ?? 0, opts.lnC ? 0.5 : 1, L);
    };
    const p = new THREE.Vector3();
    for (let k = 0; k < prof.length - 1; k++) {
      const [y0, r0] = prof[k], [y1, r1] = prof[k + 1];
      const dy = y1 - y0, dr = r1 - r0;
      const ring = [];
      for (let i = 0; i <= sides; i++) {
        const a = (i % sides) / sides * Math.PI * 2;
        nn.set(Math.cos(a) * dy, -dr, Math.sin(a) * dy).applyMatrix3(nm).normalize();
        ring.push([put(P(i, y0, r0, p), nn, a, y0), put(P(i, y1, r1, p), nn, a, y1)]);
      }
      for (let i = 0; i < sides; i++) this.idx.push(ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][0], ring[i][1], ring[i + 1][1]);
    }
    // end caps: a fan around the mean of the rim, with the rim's own (possibly tilted) normal
    const capAt = (y, r, up) => {
      const rim = [], c = new THREE.Vector3();
      for (let i = 0; i < sides; i++) { rim.push(toWorld(P(i, y, r, new THREE.Vector3()), i / sides * Math.PI * 2, new THREE.Vector3())); c.add(rim[i]); }
      c.multiplyScalar(1 / sides);
      nn.set(0, 0, 0);
      for (let i = 0; i < sides; i++) { const a = rim[i], b2 = rim[(i + 1) % sides]; nn.x += (a.y - b2.y) * (a.z + b2.z); nn.y += (a.z - b2.z) * (a.x + b2.x); nn.z += (a.x - b2.x) * (a.y + b2.y); }
      nn.normalize();
      // the rim runs counter-clockwise seen from -y (x = cos, z = sin), so its Newell normal points down
      if (up) nn.negate();
      const n0 = nn.clone();
      v.copy(c);
      // (opts.lnC: the ends are toned with the mass too; opts.capLN: the planned direction for both ends)
      const LN = (q) => (opts.lnC ? (lnv.set(q.x - opts.lnC[0], (q.y - opts.lnC[1]) * 1.2, q.z - opts.lnC[2]).normalize(), [lnv.x, lnv.y, lnv.z, 1]) : opts.capLN ?? null);
      const c0 = this._put(v, n0, id, tone, line, opts.ground, NOFACE, stain, ao, 0, opts.lnC ? 0.5 : 1, LN(c));
      const ids = rim.map((q) => { v.copy(q); return this._put(v, n0, id, tone, line, opts.ground, NOFACE, stain, ao, 0, opts.lnC ? 0.5 : 1, LN(q)); });
      for (let i = 0; i < sides; i++) { const j = (i + 1) % sides; up ? this.idx.push(c0, ids[j], ids[i]) : this.idx.push(c0, ids[i], ids[j]); }
    };
    if (opts.capTop !== false) capAt(prof[prof.length - 1][0], prof[prof.length - 1][1], true);
    if (opts.capBottom !== false) capAt(prof[0][0], prof[0][1], false);
    this._rec(v0_, i0_, opts);
    return id;
  }

  // plain drum / frustum (kept for older callers): r1 scales the top radius
  cyl(m, opts = {}) { return this.lathe(m, [[-1, 1], [1, opts.r1 ?? 1]], { sides: 24, ...opts }); }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('aData', new THREE.Float32BufferAttribute(this.data, 4));
    g.setAttribute('aFace', new THREE.Float32BufferAttribute(this.face, 4));
    g.setAttribute('aMisc', new THREE.Float32BufferAttribute(this.misc, 4));
    g.setAttribute('aElem', new THREE.Float32BufferAttribute(this.elemA, 4));
    g.setAttribute('aElem2', new THREE.Float32BufferAttribute(this.elem2A, 4));
    g.setAttribute('aLN', new THREE.Float32BufferAttribute(this.lnA, 4));
    g.setAttribute('aWall', new THREE.Float32BufferAttribute(this.wallA, 4));
    g.setAttribute('aSlit', new THREE.Float32BufferAttribute(this.slitA, 4));
    let idx = this.idx;
    if (this.prims.some((p) => p.dead)) {
      idx = [];
      for (const p of this.prims) if (!p.dead) for (let i = p.i0; i < p.i1; i++) idx.push(this.idx[i]);
    }
    g.setIndex(idx);
    // (opts.noPre: primitives the depth pre-pass must leave out - see stonePrepass)
    if (this.prims.some((p) => p.noPre)) {
      const pre = [];
      for (const p of this.prims) if (!p.dead && !p.noPre) for (let i = p.i0; i < p.i1; i++) pre.push(this.idx[i]);
      g.userData.preIndex = pre;
    }
    g.computeBoundingSphere();
    return g;
  }
}

// unit icospheres, subdivided once and twice: { pos: [x, y, z, ...], idx: [...] }
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2;
  let P = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((q) => { const l = Math.hypot(...q); return q.map((c) => c / l); });
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const out = [];
  for (let lv = 0; lv < 4; lv++) {
    out.push({ pos: P.flat(), idx: F.flat() });
    const mid = new Map(), F2 = [];
    const M = (a, b) => { const key = a < b ? a * 4096 + b : b * 4096 + a; if (!mid.has(key)) { const q = [0, 1, 2].map((k) => P[a][k] + P[b][k]), l = Math.hypot(...q); P.push(q.map((c) => c / l)); mid.set(key, P.length - 1); } return mid.get(key); };
    P = P.slice();
    for (const [a, b, c] of F) { const ab = M(a, b), bc = M(b, c), ca = M(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    F = F2;
  }
  return out;
})();

// small random corner offsets so no block is a perfect cuboid (in unit-cube space)
export function wobble(R, amt) {
  const s = [];
  for (let i = 0; i < 8; i++) s.push(new THREE.Vector3((R() - 0.5) * amt, (R() - 0.5) * amt, (R() - 0.5) * amt));
  return s;
}
