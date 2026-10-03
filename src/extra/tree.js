// Broadleaf trees and shrubs in the painted-foliage language of the boards.
//
// A tree is a forking skeleton (lumpy, kinked, tapered tubes: trunk -> limbs -> thin dark twigs)
// carrying a number of separate foliage CLUMPS (flattened ellipsoids at the limb ends). Each clump is
//   - a few big, almost solid "mass" cards in its core, all one dark tone  -> the dark base shape
//   - leaf-spray cards on its shell (log-normal sizes), fewer on the shaded side -> the marks
//   - small loose sprays / single leaves outside it                        -> the ragged silhouette
// Every card gets a baked light level from where it sits on its own clump (sun-facing top = light,
// underside = dark) and how much foliage of the other clumps lies between it and the sun. The
// lightest tone is only allowed on the sun-facing top ~30% of a clump, navy only on chosen underside
// cards. Each leaf inside a card is then one flat colour from a 5-step palette.
// The leaf atlas is rasterised here (pointed leaf dabs of varying size, with a per-leaf tone and the
// leaf's position inside the card, so leaves at the top of a card go lighter than those below).
import * as THREE from 'three';
import { mat, shadowMat, WIND_GLSL } from '../glsl.js';
import { rng, height, SUN, fbm, smooth } from '../world.js';
import { LAYOUT, disc, ground } from '../layout.js';

const gauss = (R) => (R() + R() + R() + R() - 2) * 1.732;
const logn = (R, sigma, lo, hi) => Math.min(hi, Math.max(lo, Math.exp(gauss(R) * sigma)));

// ------------------------------------------------------------------ leaf atlas
// 4x4 cells. R = per-leaf tone, G = leaf centre y in the cell, B = leaf centre x, A = coverage.
// row 0: closed base masses with a fringe of small leaves, row 1: dense sprays, row 2: loose sprays, row 3: a few floating leaves.
const ATLAS_N = 4;
function makeFoliageAtlas(cell = 256) {
  const size = cell * ATLAS_N;
  const d = new Uint8Array(size * size * 4);
  const U = [-0.5, -0.38, -0.2, 0.0, 0.2, 0.37, 0.5], W = [0.22, 0.66, 0.95, 1.0, 0.8, 0.45, 0.0];
  const put = (cx0, cy0, x, y, ang, len, wid, tone, R) => {
    // a pointed leaf: blunt base, widest before the middle, sharp tip, a little bent and lopsided
    const bend = (R() - 0.5) * 0.7, lop = 0.8 + R() * 0.4;
    const pts = [];
    for (let i = 0; i < U.length; i++) pts.push([U[i], bend * (U[i] * U[i] - 0.25) + W[i] * lop * (0.88 + R() * 0.24)]);
    for (let i = U.length - 2; i >= 0; i--) pts.push([U[i], bend * (U[i] * U[i] - 0.25) - W[i] * (2 - lop) * (0.88 + R() * 0.24)]);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = pts.map(([u, v]) => [x + (u * len) * ca - (v * wid) * sa, y + (u * len) * sa + (v * wid) * ca]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const m = 3;
    x0 = Math.max(m, Math.floor(x0)); x1 = Math.min(cell - 1 - m, Math.ceil(x1));
    y0 = Math.max(m, Math.floor(y0)); y1 = Math.min(cell - 1 - m, Math.ceil(y1));
    const g = Math.floor(y / cell * 255), b = Math.floor(x / cell * 255);
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1];
        if ((yi > py + 0.5) !== (yj > py + 0.5) && px + 0.5 < ((xj - xi) * (py + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) continue;
      const o = ((cy0 + py) * size + cx0 + px) * 4;
      d[o] = tone; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
  };
  for (let v = 0; v < ATLAS_N * ATLAS_N; v++) {
    const R = rng(7100 + v * 37);
    const cx0 = (v % ATLAS_N) * cell, cy0 = Math.floor(v / ATLAS_N) * cell;
    const row = Math.floor(v / ATLAS_N);
    const n = row === 0 ? 200 + Math.floor(R() * 30) : row === 1 ? 26 + Math.floor(R() * 12) : row === 2 ? 10 + Math.floor(R() * 7) : 2 + Math.floor(R() * 4);
    // a few sub-blobs so no card is a disc
    const blobs = [];
    const nb = row === 3 ? 2 : 3;
    for (let i = 0; i < nb; i++) {
      const a = R() * 6.283, rr = (row === 0 ? 0.13 : row === 1 ? 0.15 : 0.2) * cell * (0.4 + R());
      blobs.push([cell / 2 + Math.cos(a) * rr, cell / 2 + Math.sin(a) * rr * 0.7, cell * (row === 0 ? 0.24 + R() * 0.07 : row === 1 ? 0.16 + R() * 0.1 : 0.14 + R() * 0.1)]);
    }
    if (row === 0) {
      // the base masses: a closed shape (the union of the sub-blobs) fringed all round with small leaves
      const tone = 110 + Math.floor(R() * 30);
      for (let py = 0; py < cell; py++) for (let px = 0; px < cell; px++) {
        let inside = false;
        for (const bl of blobs) if (Math.hypot(px - bl[0], (py - bl[1]) / 0.85) < bl[2] * 0.86) { inside = true; break; }
        if (!inside) continue;
        const o = ((cy0 + py) * size + cx0 + px) * 4;
        d[o] = tone; d[o + 1] = 128; d[o + 2] = 128; d[o + 3] = 255;
      }
      // sky holes: a few ragged gaps in two or three loose groups (each a couple of overlapping slanted ovals),
      // leaf-sized to hand-sized. The leaf marks painted next partly overlap them. Under minification they
      // close by themselves, so a crown seen from afar keeps its closed base.
      const ng = 3 + Math.floor(R() * 3);
      for (let gI = 0; gI < ng; gI++) {
        const bl = blobs[Math.floor(R() * nb)], ga = R() * 6.283, gr = Math.sqrt(R()) * bl[2] * 0.62;
        const gx = bl[0] + Math.cos(ga) * gr, gy = bl[1] + Math.sin(ga) * gr * 0.85;
        const nh = 2 + Math.floor(R() * 4);
        for (let hI = 0; hI < nh; hI++) {
          const hx = gx + (R() - 0.5) * cell * 0.16, hy = gy + (R() - 0.5) * cell * 0.16;
          const ra = cell * (0.02 + R() * R() * 0.06), rb = ra * (0.35 + R() * 0.5), rot = R() * 3.1416, cr = Math.cos(rot), sr = Math.sin(rot);
          const m = Math.ceil(ra) + 1;
          for (let py = Math.max(0, Math.floor(hy - m)); py <= Math.min(cell - 1, hy + m); py++) for (let px = Math.max(0, Math.floor(hx - m)); px <= Math.min(cell - 1, hx + m); px++) {
            const u = (px - hx) * cr + (py - hy) * sr, v = -(px - hx) * sr + (py - hy) * cr;
            if ((u * u) / (ra * ra) + (v * v) / (rb * rb) < 1) d[((cy0 + py) * size + cx0 + px) * 4 + 3] = 0;
          }
        }
      }
    }
    // TWIGS: a spray hangs on a thin dark stem that forks out to its leaf groups (drawn first: the leaves overlap
    // it, and it shows between them and where it leaves the spray). Tone 0..2 marks a twig texel (leaves start
    // at 3). Own random stream: the leaves are where they were.
    if (row === 1 || row === 2) {
      const Q = rng(9300 + v * 53);
      const a0 = Math.PI * 0.5 + (Q() - 0.5) * 1.6, L0 = cell * 0.24;
      const bx0 = cell / 2 + Math.cos(a0) * L0, by0 = cell / 2 + Math.sin(a0) * L0;
      const segs = [];
      // (the stem to the group nearest the cell's middle, a kink on the way; side twigs to the other groups)
      const hub = [cell / 2 + (Q() - 0.5) * cell * 0.12, cell / 2 + (Q() - 0.5) * cell * 0.12];
      const kx = (bx0 + hub[0]) / 2 + (Q() - 0.5) * cell * 0.08, ky = (by0 + hub[1]) / 2 + (Q() - 0.5) * cell * 0.08;
      segs.push([bx0, by0, kx, ky, 0.013, 0.011], [kx, ky, hub[0], hub[1], 0.011, 0.009]);
      for (const bl of blobs) {
        const ex = bl[0] + (bl[0] - hub[0]) * 0.35 + (Q() - 0.5) * cell * 0.05, ey = bl[1] + (bl[1] - hub[1]) * 0.35 + (Q() - 0.5) * cell * 0.05;
        const mx = (hub[0] + ex) / 2 + (Q() - 0.5) * cell * 0.05, my = (hub[1] + ey) / 2 + (Q() - 0.5) * cell * 0.05;
        segs.push([hub[0], hub[1], mx, my, 0.009, 0.006], [mx, my, ex, ey, 0.006, 0.003]);
      }
      for (const [x0, y0, x1, y1, w0, w1] of segs) {
        const lx = x1 - x0, ly = y1 - y0, ll = lx * lx + ly * ly || 1, m = cell * 0.02;
        for (let py = Math.max(3, Math.floor(Math.min(y0, y1) - m)); py <= Math.min(cell - 4, Math.ceil(Math.max(y0, y1) + m)); py++)
          for (let px = Math.max(3, Math.floor(Math.min(x0, x1) - m)); px <= Math.min(cell - 4, Math.ceil(Math.max(x0, x1) + m)); px++) {
            const tt = Math.max(0, Math.min(1, ((px + 0.5 - x0) * lx + (py + 0.5 - y0) * ly) / ll));
            const dd = Math.hypot(px + 0.5 - x0 - lx * tt, py + 0.5 - y0 - ly * tt), hw = Math.max(0.75, cell * (w0 + (w1 - w0) * tt) * 0.5);
            if (dd > hw) continue;
            const o = ((cy0 + py) * size + cx0 + px) * 4;
            d[o] = 1; d[o + 1] = 128; d[o + 2] = 128; d[o + 3] = 255;
          }
      }
    }
    for (let i = 0; i < n; i++) {
      const bl = blobs[Math.floor(R() * nb)];
      // (base masses: most leaves on the rim, the rest scattered inside as marks)
      const a = R() * 6.283, rr = (row === 0 ? (i % 3 ? 0.72 + R() * 0.42 : Math.sqrt(R()) * 0.8) : Math.pow(R(), 0.6)) * bl[2];
      let x = bl[0] + Math.cos(a) * rr, y = bl[1] + Math.sin(a) * rr * 0.8;
      // leaf marks differ about 3:1 in length inside one card as well
      const len = cell * (row === 0 ? 0.064 : 0.115) * logn(R, 0.36, 0.55, 1.75);
      const wid = len * (row === 0 ? 0.24 + R() * 0.1 : 0.19 + R() * 0.1);
      const lim = cell * 0.5 - len * 0.6 - 4;
      const dx = x - cell / 2, dy = y - cell / 2, dl = Math.hypot(dx, dy);
      if (dl > lim) { x = cell / 2 + dx / dl * lim; y = cell / 2 + dy / dl * lim; }
      // leaves fan outward from the blob and hang a little
      const ang = a + (R() - 0.5) * 2.2 - 0.25 * Math.sign(Math.cos(a));
      put(cx0, cy0, x, y, ang, len, wid, Math.max(3, Math.floor(R() * 256)), R);
    }
  }
  // the box each cell's leaves actually fill (in cell units, with a 3-texel margin): the cards are cut
  // down to it, so the empty border of a cell is never rasterised
  const boxes = [];
  for (let v = 0; v < ATLAS_N * ATLAS_N; v++) {
    const cx0 = (v % ATLAS_N) * cell, cy0 = Math.floor(v / ATLAS_N) * cell;
    let x0 = cell, x1 = 0, y0 = cell, y1 = 0;
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) if (d[((cy0 + y) * size + cx0 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    boxes.push(new THREE.Vector4(Math.max(0, x0 - 3) / cell, Math.max(0, y0 - 3) / cell, Math.min(cell, x1 + 4) / cell, Math.min(cell, y1 + 4) / cell));
  }
  // bleed leaf data into the empty texels around leaves so filtering never mixes in zeros
  let filled = new Uint8Array(size * size);
  for (let i = 0; i < size * size; i++) filled[i] = d[i * 4 + 3] ? 1 : 0;
  for (let it = 0; it < 6; it++) {
    const nf = filled.slice();
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      const i = y * size + x;
      if (filled[i]) continue;
      const nb = filled[i - 1] ? i - 1 : filled[i + 1] ? i + 1 : filled[i - size] ? i - size : filled[i + size] ? i + size : -1;
      if (nb < 0) continue;
      d[i * 4] = d[nb * 4]; d[i * 4 + 1] = d[nb * 4 + 1]; d[i * 4 + 2] = d[nb * 4 + 2];
      nf[i] = 1;
    }
    filled = nf;
  }
  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  t.userData.boxes = boxes;
  return t;
}

// ------------------------------------------------------------------ shaders
// Where the deeper of the two dark teals goes: big dabs of the brush texture laid through the crown
// on a fixed oblique plane (about 1.5 m x 0.8 m, leaning), the same for the leaf cards and the base shapes.
// how much of a crown seen from the side is opened to the sky (0 = none). Off by default: the holes lie on a
// plane that turns with the eye, so walking sweeps them across the crown and every spray they pass shrinks
// away and grows back - the leaves are seen changing size. (?sidehole=0.55 brings them back to compare.)
const SIDE_HOLE = +(new URLSearchParams(location.search).get('sidehole') ?? 0);
const SIDE_GLSL = /* glsl */`
const float SIDE_HOLE = ${SIDE_HOLE.toFixed(3)};
// SKY HOLES THROUGH A CROWN SEEN FROM THE SIDE. A crown is many layers of leaves deep, so a gap in one layer
// shows only the next layer. The holes are therefore laid out on ONE plane per crown - the plane through the
// crown's centre that faces the eye - and every spray, base mass and core is asked along its own line of sight
// (hv: where that line crosses the plane, metres from the crown's centre): all layers open in the same
// places and the sky (and the boughs inside) shows through. A leaf spray goes or stays whole (asked once per
// card, in the vertex shader: it shrinks away smoothly as it enters a hole, so nothing pops and the hole's
// edge is whole leaves, smaller toward it); the cores are cut along the hole's edge. As the eye moves the plane
// turns with it about the crown's centre, slowly. k: 0 under the crown (there the vertical shafts below take
// over) .. 1 from a crown's width away. Returns the coverage left.
float sideHole(vec2 hv, float r, float seed, float k, float w){
  vec2 uv = hv * (2.3 / r) + vec2(seed * 13.0, seed * 7.0);
  vec4 t = textureLod(uBrush, uv, 0.0);
  float f = t.a * 0.8 + t.r * 0.2;
  // (no holes in the outer rim of the crown: its edge is ragged already, and a bite out of the outline is a hole in the silhouette)
  float rim = smoothstep(0.55, 0.95, length(hv * vec2(1.0, 1.25)) / r);
  // (in: where this line of sight crosses the plane - lateral offset from the eye-to-centre axis, height)
  return 1.0 - smoothstep(-w, 0.02, f - (1.0 - SIDE_HOLE * k) - rim * 0.3);
}
vec2 sidePlane(vec3 w, vec4 cr, out float k){
  vec2 toC = cr.xz - uCamPos.xz;
  float D = length(toC);
  k = smoothstep(cr.w, cr.w * 2.2, D);
  vec2 d = toC / max(D, 1e-3);
  float persp = D / max(dot(w.xz - uCamPos.xz, d), 0.3 * D);
  return vec2(dot(w.xz - uCamPos.xz, vec2(-d.y, d.x)) * persp, (w.y - uCamPos.y) * persp + uCamPos.y - cr.y);
}
`;
const DEEP_GLSL = /* glsl */`
const float DEEP_TH = 0.54;
const float HOLE_K = 0.31;
const float CORE_NEAR = 3.7;     // metres from the eye inside which cores and base masses are taken away
float deepMask(vec3 p){
  // Two readings of the brush texture on planes at right angles to each other. A single reading of a 2D
  // texture is constant along one line in space; through the depth of a crown (card behind card) its edges
  // were drawn out along that line and showed as long parallel stripes of the two teals (and the big-dab
  // channel, whose edges are ruled, made them sharper still). Soft noise decides where the broad masses
  // lie, the medium dabs cut their edges.
  vec2 q = vec2(p.x * 0.80 + p.z * 0.58, p.y * 0.95 + p.z * 0.40 - p.x * 0.10);
  vec2 q2 = vec2(p.x * 0.58 - p.z * 0.80, p.y * 0.90 - p.x * 0.42 + p.z * 0.12);
  vec4 a = textureLod(uBrush, q * 0.075 + 0.3, 0.0), b = textureLod(uBrush, q2 * 0.083 + vec2(0.61, 0.17), 0.0);
  // (the mean of two readings spreads less than one: stretched about the threshold, so the two teals keep their shares)
  return DEEP_TH + ((a.a + b.a) * 0.34 + (a.r + b.r) * 0.16 - DEEP_TH) * 1.41;
}
// The field along which base masses and cores are taken away next to the lens (metres, added to the
// distance). Two readings of the brush texture on planes at right angles to each other: a single reading
// of a 2D texture is constant along one line in space, and on every card or shell that this line lies
// in, the cut came out as long parallel streaks (leaf marks "smeared" down the picture under a crown,
// diagonal stripes on a crown beside the eye).
float nearField(vec3 w){
  vec4 a = textureLod(uBrush, w.xz * 0.23 + w.y * 0.19, 0.0);
  vec4 b = textureLod(uBrush, vec2(w.x - w.z, w.y * 1.3) * 0.19 + vec2(0.37, 0.11), 0.0);
  // (the soft channel gives the cut its rounded lobes, the medium dabs its ragged edge; the bristle channel
  // is thin parallel strokes and drew stripes across every card it cut, the big dabs gave ruled edges)
  return (a.a + b.a - 1.0) * 3.0 + (a.r + b.r - 1.0) * 0.5;
}
// Sky holes for an eye looking steeply UP into a crown: vertical shafts (a fixed pattern on the ground
// plan, the same for every card and core, so they line up through all the layers) open as the line of
// sight to a leaf rises above about 35 degrees. They grow from nothing along a soft noise, their edges
// cut by brush dabs, so nothing pops; seen from the side they do not exist. Returns the coverage left.
float skyHole(vec3 w){
  float k = smoothstep(0.50, 0.86, normalize(w - uCamPos).y);
  // (the widths are taken OUTSIDE the branch, from quantities that are continuous: a derivative inside
  // non-uniform control flow is undefined, and along the cone where the holes begin - 30 degrees above the
  // eye - fwidth() of the hole field drew a dotted line one pixel thick across every crown)
  vec2 uv = w.xz * 0.27 + 0.17;
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  float fk = fwidth(k);
  if (k <= 0.0) return 1.0;
  vec4 t = textureLod(uBrush, uv, 0.0);      // (the soft field, its edge cut by the big dabs)
  vec4 tx = textureLod(uBrush, uv + dx, 0.0), ty = textureLod(uBrush, uv + dy, 0.0);
  float f = t.a * 0.74 + t.g * 0.26;
  float fw = abs(tx.a * 0.74 + tx.g * 0.26 - f) + abs(ty.a * 0.74 + ty.g * 0.26 - f) + HOLE_K * fk;
  float h = f - (1.0 - HOLE_K * k);
  return clamp(0.5 - h / max(fw, 1e-4), 0.0, 1.0);
}
`;
// response of the leaves to the shared wind (src/glsl.js WIND_GLSL): how far the outermost sprays of a crown
// give downwind in a full gust (fraction of the crown radius; shrubs: x their own nod), and the nod of every
// spray in a calm and what a gust adds to it (x uWind, the old amplitude)
const WIND_K = { give: '0.018', bush: '2.5', flutter0: '0.6', flutter1: '1.6' };
const CARD_VS = /* glsl */`
in vec3 position;
in vec3 iPos; in vec4 iData; in vec4 iLight;   // (size, rotation, variant, random) (level, tone spread, light-tone ok, navy)
in float iTree;                                 // row of this tree in the palette table
#ifdef PROBE
in vec3 iProbe;
#endif
uniform vec3 uBillRight, uBillUp;               // fixed axes facing the sun (shadow pass)
const float BASE_NEAR0 = 3.5, BASE_NEAR1 = 7.0;
uniform float uWind, uPixelK, uMaxPx;
uniform vec4 uBox[16];                          // per atlas cell: the part of the cell that holds leaves (min xy, max xy)
#ifndef SHADOW_PASS
uniform sampler2D uBrush;
uniform sampler2D uPal;                         // per tree: navy, teal, deep teal, mid, lit, pale (haze already in), (tone spread, shape id, bias), crown (centre, radius)
flat out vec3 vC0, vC1, vC1b, vC2, vC3, vC4, vP;
${WIND_GLSL}
${SIDE_GLSL}
#endif
#ifdef SHADOW_PASS
uniform mat4 uShadowMat;
#endif
#ifdef PROBE
uniform mat4 uShadowMat; uniform sampler2D uShadowMap; uniform float uShadowTexel;
#endif
out vec2 vUv; out float vDepth; out vec3 vW; flat out vec4 vK; flat out vec3 vF;   // (level, base mass, cos, sin) (spread, light ok, navy)
void main(){
  float size = iData.x, rot = iData.y, variant = iData.z, rnd = iData.w;
  float cr = cos(rot), sr = sin(rot);
#ifdef SHADOW_PASS
  // the cast shadow is STILL (a painted background): fixed axes, no wind. The receivers threshold a coarse
  // lattice, so a few centimetres of sway would flip whole lobes of the shadow on single ticks.
  vec3 R = uBillRight, U = uBillUp, c = iPos;
#else
  // The card faces the camera POSITION, never the view direction: turning or tilting the head moves nothing
  // (a card built from the camera's right/up axes counter-rotates against the branches when one looks up
  // and turns). Its roll is fixed by an axis of its own, leaning up to ~20 degrees off the vertical in a
  // direction per card: so the one direction from which a card would spin (straight along that axis) is a
  // different one for every card - there is no place to stand where the leaves overhead turn in unison.
  vec3 tc = normalize(uCamPos - iPos);
  float ra = rnd * 40.0 + iPos.z * 1.7;
  vec3 ax = normalize(vec3(cos(ra) * 0.36, 1.0, sin(ra) * 0.36));
  vec3 R = cross(ax, tc);
  float rl = length(R);
  R = rl > 1e-3 ? R / rl : vec3(1.0, 0.0, 0.0);
  vec3 U = cross(tc, R);
  // held wind: whole sprays nod a little, on the stepped clock. They move IN their own plane only, so the
  // distance of a card from the eye never changes with the wind and two overlapping cards cannot swap
  // their depth order from one tick to the next.
  float ph = rnd * 6.283 + iPos.x * 0.4;
  // The shared wind (src/glsl.js): the strength where the card stands. In a gust the sprays nod more, and
  // the crown gives downwind: the outer and upper sprays most, those next to the limbs hardly (a smooth
  // field over the crown: neighbouring cards move together, no gap opens and none leaves the mass).
  float wS = windAt(iPos.xz);
  vec4 crown = texelFetch(uPal, ivec2(7, int(iTree + 0.5)), 0);
  vec3 rel = (iPos - crown.xyz) / max(crown.w, 1e-3);
  float outer = crown.w > 0.0 ? clamp(0.25 + 0.75 * smoothstep(0.25, 1.0, length(rel)) + 0.35 * rel.y, 0.15, 1.3) : 0.8;
  float reach = crown.w > 0.0 ? ${WIND_K.give} * crown.w : uWind * ${WIND_K.bush};
  vec3 give = vec3(windDir.x, -0.25, windDir.y) * (wS * outer * reach);
  // (a slow breathing of the give, per region of the crown, so a held gust is not a frozen pose)
  give *= 0.85 + 0.15 * sin(uTime * 0.9 + iPos.x * 0.6 + iPos.z * 0.45);
  vec3 c = iPos + (R * sin(uTime * 1.3 + ph) + U * (sin(uTime * 1.7 + ph * 1.3) * 0.6)) * (uWind * (${WIND_K.flutter0} * min(uWindAmp, 1.0) + ${WIND_K.flutter1} * wS * outer))
         + R * dot(give, R) + U * dot(give, U);
  // near limit: a card never gets bigger on screen than uMaxPx (half-size), so walking or flying into
  // the crown gives leaf-sized marks, not polygons; right at the lens it shrinks away to nothing
  float cd = distance(c, uCamPos);
  // (the base masses carry leaves half the size, so from a distance they may stay about twice as big and
  // keep the crown closed; within a few metres of the lens they come down to the cap of every other card,
  // or one flat mass fills a third of the frame)
  float capK = variant < 3.5 ? mix(1.0, 2.1, smoothstep(BASE_NEAR0, BASE_NEAR1, cd)) : 1.0;
  size = min(size, uMaxPx * capK * uPixelK * cd * smoothstep(0.15, 1.2, cd));
  // the side holes of the crown (see sideHole): a dark spray standing in one shrinks away
  float holeK = 0.0;
  vec3 pP = texelFetch(uPal, ivec2(6, int(iTree + 0.5)), 0).rgb;
  if (SIDE_HOLE > 0.0 && crown.w > 0.0 && iLight.x + pP.z < 0.82) {
    vec2 hv = sidePlane(iPos, crown, holeK);
    // (a card gives way before its centre is in the hole - a base mass, the bigger, sooner - or the hole is covered by its neighbours)
    if (holeK > 0.0) size *= sideHole(hv, crown.w, pP.y, holeK, variant > 3.5 ? 0.09 : 0.16);
  }
#endif
  vec4 bx = uBox[int(variant + 0.5)];
  vec2 cu = mix(bx.xy, bx.zw, position.xy * 0.5 + 0.5), lq = cu * 2.0 - 1.0;      // corner inside the cell, 0..1 and -1..1
  vec2 q = vec2(lq.x * cr - lq.y * sr, lq.x * sr + lq.y * cr) * size;
  vec3 w = c + R * q.x + U * q.y;
  vUv = (cu * 0.992 + 0.004 + vec2(mod(variant, 4.0), floor(variant / 4.0))) * 0.25;
  float lvl = iLight.x;
  float hi = iLight.z;
#ifndef SHADOW_PASS
  // THE PALE LIGHTS OF A CROWN LIE ON THE SIDE OF ITS SILHOUETTE THE SUN IS ON, from wherever it is seen: the
  // sprays that may carry them (iLight.z: 1 on the lit lobes, 2 anywhere on the outer, upper shell) take them
  // only where they stand on the sunward (and upper) part of the crown AS THE EYE SEES IT - never pasted on
  // the middle of the mass, and there from every side. "on" rises smoothly with the eye's position and the
  // fragment shader lets the leaves of a spray in one by one, so nothing switches as a card.
  if (crown.w > 0.0 && hi > 0.5) {
    vec3 vd = normalize(crown.xyz - uCamPos);
    vec3 sunD = vec3(${SUN.x.toFixed(4)}, ${SUN.y.toFixed(4)}, ${SUN.z.toFixed(4)});
    vec3 Lp = sunD - vd * dot(sunD, vd) + (vec3(0.0, 1.0, 0.0) - vd * vd.y) * 0.18;
    float sP = dot(rel, normalize(Lp));
    // (the lit lobes lie on the crown's sunward flank already: they lose their lights only where the eye sees
    // them on the far side of the outline from the sun; the others take one only well onto the sunward rim)
    hi = hi > 1.5 ? -smoothstep(0.0, 0.16, sP - (0.22 + rnd * 0.26)) : smoothstep(0.0, 0.16, sP + 0.30 - rnd * 0.3);
    // (seen from beneath, a leaf lit from above is no pale light: the lights go out as the eye looks up into the crown)
    // (seen from beneath, a leaf lit from above is no pale light: most lights go out as the eye looks up into the
    // crown - but not all. The leaves between the eye and the sun, and those on the crown's outer shell where it
    // meets the sky, glow through: from below they keep a share of their lights, let in leaf by leaf)
    float upK = smoothstep(0.45, 0.80, -tc.y);
    float thru = smoothstep(0.05, 0.75, dot(-tc, sunD)) * 0.75 + smoothstep(0.55, 1.0, length(rel)) * 0.45;
    hi *= 1.0 - upK * (1.0 - clamp(0.15 + thru, 0.0, 0.95));
  }
#endif
#ifdef PROBE
  // shrubs: one shadow-map probe per bush (a point lifted out of the bush toward the sun)
  vec4 sc = uShadowMat * vec4(iProbe, 1.0);
  vec3 s = sc.xyz * 0.5 + 0.5;
  float lit = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 o = vec2(float(i % 2) - 0.5, float(i / 2) - 0.5) * 6.0 * uShadowTexel;
    lit += step(s.z - 0.0016, texture(uShadowMap, s.xy + o).r);
  }
  if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) lit = 4.0;
  float sh = 1.0 - step(1.5, lit);
  lvl = max(lvl - sh * 0.26, 0.17);
  hi *= 1.0 - sh;
#endif
  vK = vec4(lvl, step(variant, 3.5), cr, sr);
  vW = w;
#ifndef SHADOW_PASS
  int row = int(iTree + 0.5);
  vC0 = texelFetch(uPal, ivec2(0, row), 0).rgb; vC1 = texelFetch(uPal, ivec2(1, row), 0).rgb; vC1b = texelFetch(uPal, ivec2(2, row), 0).rgb;
  vC2 = texelFetch(uPal, ivec2(3, row), 0).rgb; vC3 = texelFetch(uPal, ivec2(4, row), 0).rgb; vC4 = texelFetch(uPal, ivec2(5, row), 0).rgb;
  vP = texelFetch(uPal, ivec2(6, row), 0).rgb;
#endif
  vF = vec3(iLight.y, hi, iLight.w);
#ifdef SHADOW_PASS
  vDepth = 0.0;
  gl_Position = uShadowMat * vec4(w, 1.0);
#else
  vec4 mv = viewMatrix * vec4(w, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
#endif
}
`;

const CARD_FS = /* glsl */`
in vec2 vUv; in float vDepth; in vec3 vW; flat in vec4 vK; flat in vec3 vF;
uniform sampler2D uLeaf;
flat in vec3 vC0, vC1, vC1b, vC2, vC3, vC4, vP;
${DEEP_GLSL}
void main(){
  vec4 t = texture(uLeaf, vUv);
  // A base mass right at the lens would be one flat shape a hundred and more pixels wide (or, shrunk to the
  // size of a leaf card, a dark ball hanging in the air): there it is taken away, in the same brush-shaped
  // pieces as the solid core behind it, and the leaf sprays alone are left.
  float nearCut = 1.0;
  if (vK.y > 0.5) {
    float nd = distance(vW, uCamPos);
    if (nd < CORE_NEAR + 2.3) {
      float nearH = nd + nearField(vW) - CORE_NEAR;
      nearCut = clamp(nearH / (nd * uPixelK * 2.0) + 0.5, 0.0, 1.0);     // (no derivatives inside a branch)
    }
  }
#ifdef A2C
  // alpha-to-coverage: the leaf edge is resolved over the 4 MSAA samples instead of a hard test
  float cov = clamp((t.a - 0.5) / max(fwidth(t.a), 1e-4) + 0.5, 0.0, 1.0);
  // (the pale and lit leaves stay: backlit leaves hang in and around the holes)
  if (vK.x + vP.z < 0.5) cov *= skyHole(vW);
  cov *= nearCut;
  // leaf position inside the card
  vec2 lp = t.bg * 2.0 - 1.0;
  if (cov <= 0.0) discard;
#else
  if (t.a < 0.5 || nearCut < 0.5) discard;
  if (vK.x + vP.z < 0.5 && skyHole(vW) < 0.5) discard;
  vec2 lp = t.bg * 2.0 - 1.0;
  float cov = 1.0;
#endif
  // turned to screen-up: upper leaves of a spray catch the light
  float up = lp.x * vK.w + lp.y * vK.z;
  // (the lights: see the vertex shader. vF.y: how far this spray is let into the light, negative on a spray
  // that is dark by itself - its leaves are lifted as they are let in)
  float lon = step(t.r * 0.97 + 0.02, abs(vF.y));
  float b = (vF.y < 0.0 && lon > 0.5 ? max(vK.x, 0.80 + t.r * 0.2 - vP.z) : vK.x) + vP.z + up * 0.15 * vF.x;
  float v = b + (t.r - 0.5) * vP.x * vF.x;
  // 5 flat tones. The palest only where the card is allowed it (sun-facing top of its clump),
  // navy only on cards chosen for it (undersides), as grouped accents with a few teal leaves left
  vec3 c = v > 0.60 ? vC3 : vC2;
  // a base mass in the mid green is broken by a few dark and a few light leaf marks
  if (vK.y > 0.5 && v > 0.36) c = t.r > 0.86 ? vC1 : t.r < 0.08 ? vC3 : vC2;
  if (v <= 0.36) {
    // the darkest teal comes in two values, the deeper one in broad brush-shaped areas fixed in the crown
    // (the same field as on the solid cores); inside a base mass some leaf marks take the other value
    float dk = step(DEEP_TH, deepMask(vW));
    if (vK.y > 0.5 && t.r > 0.80) dk = 1.0 - dk;
    c = dk > 0.5 ? vC1b : vC1;
    // (a dark mass carries small marks of the mid green - single leaves that catch some light - so no mass is
    // one flat teal; the sprays in the deepest shade stay closed)
    if (vK.y > 0.5 ? t.r < 0.10 : (t.r < 0.07 && vK.x + vP.z > 0.24)) c = vC2;
  }
  if (lon > 0.5 && v > 0.84) c = vC4;
  if (vF.z > 0.5 && t.r > 0.22) c = vC0;
  // a FOURTH value in single leaf marks: a few dark teal leaves in a lit spray, a few deep ones in a mid spray
  // (leaf by leaf, from the leaf's own tone; under minification they average away with their neighbours)
  if (vK.y < 0.5) {
    if (c == vC3 && t.r > 0.025 && t.r < 0.075) c = vC1;
    else if (c == vC2 && t.r > 0.935) c = vC1b;
    // the spray's twig (tone 0..2 in the atlas): a thin dark stroke
    if (t.r < 0.011) c = mix(vC1b, vec3(0.30, 0.27, 0.30), 0.45);
  }
  // under snow a crown is its own snow: the lights of a spray are the snow lying on it, its body the blue of
  // snow seen from beneath, the dark accents what is left of the leaves (a leaf's tone is lifted a step, so
  // the mid green of a crown is snow in shade and not the dark of a wood)
  if (uSnow > 0.0){ c = mix(c, snowTone(dot(c, LUMA) + 0.07), uSnow); gOwnSnow = true; }
  oColor = vec4(c, cov);
  writeAux(vec3(0.0, 1.0, 0.0), 0.0, vDepth, vP.y, 0.0, 0.0);
}
`;

const CARD_SHADOW_FS = /* glsl */`
in vec2 vUv; flat in vec4 vK; flat in vec3 vF;
uniform sampler2D uLeaf;
out vec4 o;
void main(){ if (texture(uLeaf, vUv).a < 0.5) discard; o = vec4(1.0); }
`;

// The dark base of the crown: one lumpy solid inside every clump, in the two dark teals. Far away it
// is hidden behind the leaf cards; close up, where the cards shrink to leaf-sized marks, it is what
// keeps the crown a closed dark shape (and it hides the limb ends).
const BLOB_VS = /* glsl */`
in vec3 position; in vec3 aC1; in vec3 aC1b; in vec3 aC2; in vec2 aId; in vec3 aN; in vec3 aC0; in vec4 aCr;
uniform sampler2D uBrush;
${SIDE_GLSL}
out float vSide;
out vec3 vW; out vec3 vA; out vec3 vB; out vec3 vC; out vec3 vD; out vec3 vN; out float vDepth; out float vLvl; flat out float vId;
void main(){
  // (the side holes of the crown, see sideHole: read at the vertices - the core's skin is finer than a hole)
  vSide = 1.0;
  if (SIDE_HOLE > 0.0 && aCr.w > 0.0) { float hk; vec2 hv = sidePlane(position, aCr, hk); if (hk > 0.0) vSide = sideHole(hv, aCr.w, aId.x, hk, 0.05); }
  vW = position; vA = aC1; vB = aC1b; vC = aC2; vD = aC0; vN = aN; vId = aId.x; vLvl = aId.y;
  vec4 mv = viewMatrix * vec4(position, 1.0); vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
// The core is not a closed skin but a SHELL OF LEAVES: two layers of leaf sprays from the atlas are laid
// on it at real leaf size (fixed in the world, on the plane the surface faces most), and what lies
// between the sprays is cut away. Seen from beneath, the near shell is dark leaf masses with ragged
// holes, through which the inside of the far shell shows a tone deeper, and through its holes the sky.
// Where a leaf would be smaller than about a pixel and a half the holes close (smoothly: the alpha is
// read from a blurred mip there), so at a distance the core is the closed dark base it always was.
const BLOB_FS = /* glsl */`
in vec3 vW; in vec3 vA; in vec3 vB; in vec3 vC; in vec3 vD; in vec3 vN; in float vDepth; in float vLvl; flat in float vId; in float vSide;
uniform sampler2D uLeaf;
${DEEP_GLSL}
vec4 spray(vec2 lu, float row, float lod){
  vec2 cell = floor(lu);
  float h = hash21(cell + row * 17.0);
  vec2 f = lu - cell;
  if (h > 0.5) f.x = 1.0 - f.x;                                   // mirrored half the time
  vec2 cu = (f * 0.96 + 0.02 + vec2(floor(fract(h * 7.0) * 3.99), row)) * 0.25;
  return textureLod(uLeaf, cu, lod);
}
void main(){
  float dist = distance(vW, uCamPos);
  float px = dist * uPixelK;                                      // metres per pixel here
  // the plane this part of the surface faces most; the choice wanders with a soft noise so the seams
  // between the three planes are irregular lines lost among the leaf edges
  vec4 nz = texture(uBrush, vW.xz * 0.23 + vW.y * 0.19);
  vec3 an = abs(normalize(vN)) + (nz.rgb - 0.5) * 0.22;
  vec2 pl = an.y > max(an.x, an.z) ? vW.xz : an.x > an.z ? vW.zy : vW.xy;
  pl += (nz.ga - 0.5) * 0.5;                                      // the sprays do not sit on a grid
  vec2 l1 = pl * 0.62 + 3.7, l2 = pl * 1.05 + vec2(0.37, 8.1);
  float lod1 = log2(max(px * 256.0 * 0.62, 1.0)), lod2 = log2(max(px * 256.0 * 1.05, 1.0));
  vec4 t1 = spray(l1, 0.0, lod1), t2 = spray(l2, 1.0, lod2);
  float close = smoothstep(0.012, 0.028, px) * 0.7;
  // where the shell turns edge-on to the eye its leaves are seen edge-on too: nothing is painted there, so
  // the outline of a core is the ragged edge of its leaves, never the polygon (the cut wanders with the noise)
  float ndv = abs(dot(normalize(vN), normalize(uCamPos - vW)));
  float graze = (1.0 - smoothstep(0.22, 0.42, ndv + (nz.a - 0.5) * 0.25)) * (1.0 - close / 0.7);
  float a1 = t1.a + close - graze, a2 = t2.a + close - graze;
  float a = max(a1, a2);
  // the side holes of the crown (see sideHole): the core opens where the leaves before and behind it do
  float sideCov = smoothstep(0.35, 0.65, vSide);
#ifdef A2C
  float cov = clamp((a - 0.5) / max(fwidth(a), 1e-4) + 0.5, 0.0, 1.0) * skyHole(vW) * sideCov;
  // Right at the lens the core is taken away (a closed flat shape hundreds of pixels wide is a polygon, not
  // paint): it goes in brush-shaped pieces fixed in the crown, the way the leaf cards shrink to single
  // leaves there. Seen from the ground under a crown (5 m and more) it is whole.
  // (the field is only fetched where it can cut: it is worth at most +/- 2.3 m)
  if (dist < CORE_NEAR + 2.3) cov *= clamp((dist + nearField(vW) - CORE_NEAR) / (px * 2.0) + 0.5, 0.0, 1.0);
  if (cov <= 0.0) discard;
#else
  if (a < 0.5 || skyHole(vW) < 0.5 || sideCov < 0.5) discard;
  if (dist < CORE_NEAR + 2.3 && dist + nearField(vW) < CORE_NEAR) discard;
  float cov = 1.0;
#endif
  vec4 t = a2 > 0.5 ? t2 : t1;                                    // the loose sprays lie over the masses
  float m = deepMask(vW);
  float w = max(fwidth(m), 0.004);
  float dk = smoothstep(DEEP_TH - w, DEEP_TH + w, m);
  // single leaves take the other dark value
  float mark = step(0.78, t.r) * (1.0 - close / 0.7);
  dk = mix(dk, 1.0 - dk, mark);
  vec3 c = mix(vA, vB, dk);
  if (gl_FrontFacing) {
    // the side of the mass turned to the sun is the mid green, split from the dark along a brushed edge
    // (never the bristle channel here: its thin parallel strokes drew diagonal stripes through the crown)
    c = mix(c, vC, toneStep(vLvl, 0.37, nz.r * 0.6 + nz.g * 0.4, 0.42) * (1.0 - mark));
  } else {
    // the inside of the far shell: the deep teal, with navy leaves in broad patches
    c = mix(vB, vD, step(0.45, t.r) * step(0.5, nz.g) );
  }
  if (uSnow > 0.0){ c = mix(c, snowTone(dot(c, LUMA) + 0.07), uSnow); gOwnSnow = true; }
  oColor = vec4(c, cov);
  writeAux(vec3(0.0, 1.0, 0.0), 0.0, vDepth, vId, 0.0, 0.0);
}
`;

const TRUNK_VS = /* glsl */`
in vec3 position; in vec3 normal; in vec3 aV; in vec3 aL; in vec3 aT;
uniform sampler2D uPal;       // per tree: bark lit, mid, shade, deep, olive, violet, (haze, shape id, ground height), crown (centre, radius)
out vec3 vW; out vec3 vN; out float vDepth; out float vV; out float vIn; out vec3 vL; out vec3 vT;
flat out vec3 vLit, vMid, vShade, vDeep, vOlive, vViolet, vP;
${WIND_GLSL}
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normal; vV = aV.x; vIn = aV.y; vL = aL; vT = aT;      // (the paint is laid on the limb at rest: nothing swims on it as it sways)
  int row = int(aV.z + 0.5);
  // LIMBS SWAY WITH THEIR LEAVES: the same give downwind as the leaf cards take (the same field over the crown,
  // read at the limb's own place, the same shared wind), let in along the limb by its place in the tree - the
  // trunk stands still, the boughs hardly move, the twigs go all the way with the sprays they carry. One
  // smooth field over space, so a twig never slides on the bough it grows from. (The cast shadow is still.)
  vec4 crown = texelFetch(uPal, ivec2(7, row), 0);
  float gate = smoothstep(0.22, 0.75, aV.x);
  if (gate > 0.0 && crown.w > 0.0) {
    float wS = windAt(w.xz);
    vec3 rel = (w.xyz - crown.xyz) / crown.w;
    float outer = clamp(0.25 + 0.75 * smoothstep(0.25, 1.0, length(rel)) + 0.35 * rel.y, 0.15, 1.3);
    vec3 give = vec3(windDir.x, -0.25, windDir.y) * (wS * outer * ${WIND_K.give} * crown.w);
    give *= 0.85 + 0.15 * sin(uTime * 0.9 + w.x * 0.6 + w.z * 0.45);
    w.xyz += give * gate;
  }
  vLit = texelFetch(uPal, ivec2(0, row), 0).rgb; vMid = texelFetch(uPal, ivec2(1, row), 0).rgb; vShade = texelFetch(uPal, ivec2(2, row), 0).rgb;
  vDeep = texelFetch(uPal, ivec2(3, row), 0).rgb; vOlive = texelFetch(uPal, ivec2(4, row), 0).rgb; vViolet = texelFetch(uPal, ivec2(5, row), 0).rgb;
  vP = texelFetch(uPal, ivec2(6, row), 0).rgb;
  vec4 mv = viewMatrix * w; vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;
// aV: (0 on the trunk, rising to 1 on the twigs; 1 where the limb runs inside a leaf mass; tree row). aL: (turn around the limb 0..1, metres along it, radius)
const TRUNK_FS = /* glsl */`
in vec3 vW; in vec3 vN; in float vDepth; in float vV; in float vIn; in vec3 vL; in vec3 vT;
uniform vec3 uRim;
flat in vec3 vLit, vMid, vShade, vDeep, vOlive, vViolet, vP;
void main(){
  vec3 n = normalize(vN);
  float dist = distance(vW, uCamPos);
  // every mark lives on the limb itself (turn, metres along): nothing swims or breathes with distance.
  // long patches, and finer strokes running along the limb
  float along = vL.y + vP.y * 7.0;
  // Along the limb one texel of the brush texture is 2-4 cm: at nose range every tone edge cut from it was a
  // staircase of blocks. The reading is pushed along the limb by a fine noise (bristle-sized, a few
  // centimetres), so close up an edge is a ragged, brushed one; far away the noise averages out to nothing.
  vec4 hf = texture(uBrush, vec2(vL.x * 7.0 + 0.19, along * 1.3));
  along += (hf.a + hf.r - 1.0) * 0.07 + (hf.b - 0.5) * 0.03;
  vec4 bk = texture(uBrush, vec2(vL.x * 2.0 + (hf.r - 0.5) * 0.004, along * 0.10));
  vec4 bf = texture(uBrush, vec2(vL.x * 4.0 + 0.37, along * 0.17));
  float ndl = dot(n, uSunDir);
  // the canopy's own shadow (blurred, then hardened) dapples trunk and limbs
  // (under a wide crown the trunk would be all shade, so world-anchored dabs let sun patches through)
  float dap = brushWorld(vW * vec3(1.0, 0.45, 1.0), n, 2.6).g;
  // (only on the trunk: on a bough a single patch of sun is a pale star stuck on a dark stroke - the
  // "fork patch" - so the boughs take the canopy's shadow nearly as it falls)
  float sl = shadowLit(vW + n * 0.12, 5.0) * 0.6 - 0.14;
  float sh = sl + dap * mix(0.8, 0.56, smoothstep(0.02, 0.22, vV)), shRim = sl + dap * 0.8;
  // a limb entering its foliage goes into shade (its end is lost in the dark of the leaves, not a pale stump)
  // THE TRUNK HAS A LIGHT FLANK AND A SHADE FLANK FROM EVERY SIDE (a trunk seen from where the sun stands was one
  // lit shape from edge to edge): the light it is drawn with leans to the side of the outline the sun is on,
  // so the terminator runs down the trunk near its middle. Continuous in the eye's position: it slides round
  // the trunk as one walks.
  vec3 axT = normalize(vT), veT = normalize(uCamPos - vW);
  vec3 vpT = veT - axT * dot(veT, axT); vpT /= max(length(vpT), 1e-3);
  vec3 sdT = cross(axT, vpT), spT = uSunDir - axT * dot(uSunDir, axT);
  float sgT = dot(sdT, spT); sgT = sgT / (abs(sgT) + 0.05);
  vec3 LdT = normalize(spT * 0.55 + sdT * sgT * 0.85 + vpT * 0.12);
  float ndT = mix(dot(n, LdT) - 0.12, ndl, smoothstep(0.10, 0.20, vV));
  // (the terminator WANDERS: a slow swing round the trunk along its length, fixed to the bark, so it is a
  // painted edge that bulges into the light flank and back - never a ruled line from root to fork)
  float swing = texture(uBrush, vec2(0.13 + vP.y, along * 0.045)).a - 0.5 + (texture(uBrush, vec2(0.41 + vP.y, along * 0.12)).g - 0.5) * 0.6;
  ndT += swing * 0.9 * (1.0 - smoothstep(0.10, 0.20, vV));
  float l = smoothstep(-0.05, 0.35, ndT) * smoothstep(0.24, 0.42, sh) * (1.0 - smoothstep(0.25, 0.6, vIn + (bk.r - 0.5) * 0.3));
  float t = toneStep(l, 0.5, bk.r * 0.55 + bf.r * 0.45, 0.5);
  float tw = smoothstep(0.45, 0.9, vV);              // twigs read as one dark stroke
  // lit side: warm grey with mid patches, olive drags and a few violet-grey furrows
  vec3 lit = mix(vLit, vMid, step(0.56, bk.g) * 0.8);
  lit = mix(lit, vOlive, step(0.74, bf.r) * step(bk.r, 0.6) * 0.7);
  lit = mix(lit, vShade, step(0.86, bf.b) * 0.8);
  // bark strokes: thin dark furrows running up the lit flank, a few lighter cool ones in the shade
  float trunkK = 1.0 - smoothstep(0.12, 0.30, vV);
  lit = mix(lit, mix(vMid, vShade, 0.55), step(0.72, bf.b) * step(bf.b, 0.86) * step(bk.g, 0.70) * 0.85 * trunkK);
  // shade side: violet-grey with deeper furrows, olive-grey and cooler grey drags
  vec3 shade = mix(vShade, vViolet, step(0.52, bk.g) * 0.7);
  shade = mix(shade, vDeep, step(0.78, bf.b) * 0.85);
  shade = mix(shade, mix(vOlive, vShade, 0.5), step(0.80, bf.r) * step(0.45, bk.r) * (1.0 - tw));
  shade = mix(shade, mix(vShade, vMid, 0.45), step(0.62, bf.b) * step(bf.b, 0.78) * step(0.35, bk.g) * 0.6 * trunkK);
  shade = mix(shade, vDeep, tw * 0.75);
  // mossy olive drifting up from the roots
  // (flat dabs at about hand size, thinning out upward: never a wash with an edge)
  vec4 bm = texture(uBrush, vec2(vL.x * 9.0 + 0.11, along * 0.8));
  float mossN = bm.r * 0.55 + bf.g * 0.45, mh = vW.y - vP.z;
  lit = mix(lit, vec3(0.50, 0.53, 0.42), toneStep(0.25 - mh * 0.55, 0.0, mossN, 1.5) * 0.7);
  // bark strokes ACROSS the lit flank: short dark cracks, and pale grey lichen dabs (both on the trunk only)
  vec4 bx = texture(uBrush, vec2(vL.x * 3.0 + 0.53, along * 0.55));
  lit = mix(lit, mix(vMid, vShade, 0.7), step(0.80, bx.b) * step(0.45, bk.r) * trunkK * 0.9);
  lit = mix(lit, vec3(0.58, 0.60, 0.55), step(0.83, bx.r) * step(bk.g, 0.5) * trunkK * 0.8);
  // never a golden ochre: the lit bark is a grey-olive (ac13 ~ #6C6851), saturation held at 0.30
  { float mx = max(lit.r, max(lit.g, lit.b)), sat = (mx - min(lit.r, min(lit.g, lit.b))) / max(mx, 1e-3);
    lit = mix(vec3(mx), lit, min(1.0, 0.30 / max(sat, 1e-3))); }
  shade = mix(shade, vec3(0.30, 0.38, 0.40), toneStep(0.30 - mh * 0.5, 0.0, mossN, 1.5) * 0.75);
  // thin limbs are one quiet stroke: no two-tone planes or pale rim on anything under ~25 cm across
  float thin = 1.0 - smoothstep(0.05, 0.13, vL.z);
  lit = mix(lit, mix(vMid, vShade, 0.5), thin * 0.85);
  vec3 c = mix(shade, lit, t);
  // pale light edge, anchored to the limb: a narrow band along the line that faces the sun (turned a
  // little round the limb so it sits toward one side), painted as a broken dry-brush stroke - it drops
  // out along the limb and its width wanders (about 2-8 px, converted to an angle on the limb)
  vec3 ax = normalize(vT);
  vec3 sp = uSunDir - ax * dot(uSunDir, ax);
  float spl = length(sp);
  sp /= max(spl, 1e-3);
  vec3 spr = sp * 0.80 + cross(ax, sp) * 0.60;
  float seg = texture(uBrush, vec2(0.31 + vP.y, along * 0.045)).g;       // on/off runs along the limb
  float wn = texture(uBrush, vec2(0.67, along * 0.12 + vP.y)).r;
  float wpx = mix(1.5, 8.0, wn * wn) * (0.5 + bf.r);
  float phi = clamp(0.5 * wpx * dist * uPixelK / max(vL.z, 0.01), 0.025, 0.42);   // half-width as an angle
  float x = dot(n, spr) - cos(phi);
  float fw = max(fwidth(x), 1e-4);
  // BOUGHS (everything above the trunk) are painted as a brush paints a branch: ONE stroke of a light tone
  // and one of a shade tone lying side by side along it, the edge between them a brush edge that wanders
  // along the limb. Where that edge lies is decided for the picture, not by the sun alone: the light the
  // limb is drawn with leans toward the eye and to the side of the outline the sun is on, so from every
  // direction - straight up from beneath the crown as well - a limb shows a light flank and a shade flank
  // (a limb that is one flat tone from edge to edge is a plank cut out of card). All of it is continuous in
  // the eye's position: the edge slides round the limb as one walks, it never jumps.
  // (the bark marks of the trunk give way to the bough's strokes along a ragged edge some way up each bough,
  // never on a ring round the fork)
  float limbK = smoothstep(0.16, 0.30, vV + (bk.r - 0.5) * 0.10 + (hf.a - 0.5) * 0.06);
  float rim = smoothstep(-fw, fw, x) * step(0.40, seg) * step(0.22, bk.g)
            * step(0.2, shRim) * smoothstep(0.25, 0.5, spl) * (1.0 - tw) * (1.0 - thin) * step(vIn, 0.61) * (1.0 - limbK);
  c = mix(c, uRim, rim * 0.88);
  // a bough inside its foliage is LOST in it: it takes the dark teal of the leaf masses, so the stretch
  // seen in a gap between two masses is no violet plank
  float run = texture(uBrush, vec2(0.71 + vP.y, along * 0.09)).a;
  float lost = smoothstep(0.30, 0.75, vIn + (run - 0.5) * 0.5 + (bk.r - 0.5) * 0.22) * smoothstep(0.16, 0.26, vV);     // (never the trunk: bark up to the fork)
  vec3 lostC = mix(vec3(0.180, 0.400, 0.390), vDeep, mix(0.42, 0.14, smoothstep(5.0, 14.0, dist)));
  if (limbK > 0.0) {
    vec3 ve = normalize(uCamPos - vW);
    vec3 vp = ve - ax * dot(ve, ax);
    vp /= max(length(vp), 1e-3);
    vec3 sd = cross(ax, vp);                                     // toward one outline of the limb
    float sgn = dot(sd, sp) * spl;
    sgn = sgn / (abs(sgn) + 0.04);
    vec3 Ld = sp * spl * 0.6 + vp * 0.8 + sd * sgn * 0.8;
    Ld /= max(length(Ld), 1e-3);
    // the edge between the two strokes: wide slow swings along the limb, cut by the bristles
    // (and broken: it swings wide, is bitten by dabs, and for a stretch here and there the light stroke gives out)
    // A BOUGH IS ONE DARK FLAT STROKE. The lighter stroke is laid on it only here and there - in runs of a
    // metre or two along the limb (about a third of its length), narrow, starting and ending in a ragged
    // point - never a light flank from end to end (two tones side by side all the way along are the light
    // and shade sides of a cylinder: a pipe).
    float runL = texture(uBrush, vec2(0.23 + vP.y * 3.0, along * 0.062)).a;
    float on = smoothstep(0.50, 0.60, seg * 0.6 + runL * 0.4 + (bk.r - 0.5) * 0.10);
    float wob = (runL - 0.5) * 0.7 + (bk.r - 0.5) * 0.42 + (bf.b - 0.5) * 0.22 + (hf.a - 0.5) * 0.10 - 1.3 * (1.0 - on);
    float e = dot(n, Ld) - 0.70 + wob;
    float ew = max(fwidth(e), 1e-4);
    float two = smoothstep(-ew, ew, e);
    // in the sun: warm grey and violet-grey; in the canopy's shade a step down, cooler and closer; lost in the
    // leaves: the teal of the leaf masses and a tone lighter. Never the many small marks of the trunk.
    float sunny = toneStep(smoothstep(0.24, 0.42, sh) * (1.0 - smoothstep(0.25, 0.6, vIn + (run - 0.5) * 0.3)), 0.5, run, 0.5);
    vec3 lightT = mix(mix(vShade, vMid, 0.38), mix(vLit, vMid, 0.62), sunny);
    vec3 darkT = mix(mix(vDeep, vShade, 0.30), mix(vShade, vViolet, 0.30), sunny * 0.6);
    lightT = mix(lightT, mix(lostC, vec3(0.40, 0.56, 0.50), 0.36), lost * 0.94);
    darkT = mix(darkT, lostC, lost * 0.94);
    // a limb that is only a few pixels across in the picture is one quiet dark stroke: the light flank is
    // let in as the stroke gets wide enough to carry two tones (by its width ON SCREEN - a bough drawn in
    // toward its centre line inside the leaves is still a broad shape from beneath)
    two *= smoothstep(1.6, 4.0, vL.z / (dist * uPixelK)) * (1.0 - 0.5 * tw);
    c = mix(mix(c, lostC, lost * 0.94), mix(darkT, lightT, two), limbK);
  } else {
    c = mix(c, lostC, lost * 0.94);
  }
  // snow lies along the upper side of every bough (a brushed line, broken in places); the bark under it a step deeper
  if (uSnow > 0.0){
    float lie = toneStep(n.y, 0.50, bk.r * 0.5 + hf.a * 0.3 + bf.g * 0.2, 0.42) * smoothstep(0.35, 0.60, bk.a + 0.25);
    c = mix(snowLand(c) * vec3(0.90, 0.89, 0.93), mix(SNOW_S, SNOW_L, smoothstep(0.24, 0.42, sh)), lie * uSnow);
    gOwnSnow = true;
  }
  c = atmo(c, vP.x);
  oColor = vec4(c, 1.0);
  writeAux(n, 0.0, vDepth, vP.y, 0.0, 0.0);
}
`;

// ------------------------------------------------------------------ geometry helpers
const UP = new THREE.Vector3(0, 1, 0);
// A lumpy tube along a polyline. rad(i, s) = radius at ring i (s = metres along), lobes(ang, s) = extra
// per-angle factor (root flare). Normals come from the displaced surface, so the lumps catch light.
function tube(out, pts, rad, sides, va, vb, seed, lobes) {
  const t = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  const base = out.pos.length / 3;
  const n = pts.length, S1 = sides + 1;
  if (out.tubes) out.tubes.push([base, n, S1]);
  let s = 0;
  const P = new Float32Array(n * S1 * 3);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (i > 0) s += p.distanceTo(pts[i - 1]);
    t.copy(pts[Math.min(i + 1, n - 1)]).sub(pts[Math.max(i - 1, 0)]).normalize();
    // parallel-transported frame so rings never twist against each other
    if (i === 0) a.set(1, 0, 0.31);
    a.addScaledVector(t, -a.dot(t)).normalize();
    b.crossVectors(t, a).normalize();
    const f = i / (n - 1);
    const r = rad(i, s);
    for (let j = 0; j <= sides; j++) {
      const ang = ((j % sides) / sides) * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
      const nx = a.x * ca + b.x * sa, ny = a.y * ca + b.y * sa, nz = a.z * ca + b.z * sa;
      // about +-12% lumps, slower along the limb than around it
      const nz1 = fbm(s * 0.8 + ca * 0.9 + seed, sa * 0.9 + s * 0.25 + seed * 0.37, 3) - 0.5;
      const rr = r * (1 + 0.36 * nz1) * (lobes ? lobes(ang, s) : 1);
      const o = (i * S1 + j) * 3;
      P[o] = p.x + nx * rr; P[o + 1] = p.y + ny * rr; P[o + 2] = p.z + nz * rr;
      out.pos.push(P[o], P[o + 1], P[o + 2]);
      out.v.push(va + (vb - va) * f);
      if (out.f) out.f.push(f);
      out.l.push(j / sides, s, r);
      out.t.push(t.x, t.y, t.z);
      out.c.push(p.x, p.y, p.z);
    }
  }
  // normals from neighbours on the displaced surface
  const du = new THREE.Vector3(), dv = new THREE.Vector3(), nn = new THREE.Vector3();
  const at = (i, j, v) => { const o = (i * S1 + ((j + sides) % sides)) * 3; return v.set(P[o], P[o + 1], P[o + 2]); };
  const q0 = new THREE.Vector3(), q1 = new THREE.Vector3();
  for (let i = 0; i < n; i++) for (let j = 0; j <= sides; j++) {
    du.copy(at(i, j + 1, q0)).sub(at(i, j - 1, q1));
    dv.copy(at(Math.min(i + 1, n - 1), j, q0)).sub(at(Math.max(i - 1, 0), j, q1));
    nn.crossVectors(du, dv).normalize();
    // keep it pointing outward
    at(i, j, q0).sub(pts[i]);
    if (nn.dot(q0) < 0) nn.negate();
    out.nrm.push(nn.x, nn.y, nn.z);
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) {
    const p0 = base + i * S1, p1 = p0 + S1;
    out.idx.push(p0 + j, p0 + j + 1, p1 + j, p0 + j + 1, p1 + j + 1, p1 + j);
  }
}

// summed chord length of the ray p + t*dir (t > 0) through a set of ellipsoid clumps
function thickness(p, dir, clumps, skip) {
  let s = 0;
  for (const c of clumps) {
    if (c === skip) continue;
    const ox = (p.x - c.c.x) / c.a, oy = (p.y - c.c.y) / c.b, oz = (p.z - c.c.z) / c.a;
    const dx = dir.x / c.a, dy = dir.y / c.b, dz = dir.z / c.a;
    const A = dx * dx + dy * dy + dz * dz, B = ox * dx + oy * dy + oz * dz, C = ox * ox + oy * oy + oz * oz - 1;
    const disc = B * B - A * C;
    if (disc <= 0) continue;
    const sq = Math.sqrt(disc), t0 = Math.max(0, (-B - sq) / A), t1 = (-B + sq) / A;
    if (t1 > t0) s += (t1 - t0) * (c.dens ?? 1);
  }
  return s;
}

// one row of numbers per tree, read by the vertex shaders: lets every tree share one mesh and one draw
class Table {
  constructor(cols) { this.cols = cols; this.rows = []; }
  add(vals) { this.rows.push(vals); return this.rows.length - 1; }       // vals: cols x [r, g, b] (or THREE.Color)
  texture() {
    const d = new Float32Array(this.cols * this.rows.length * 4);
    this.rows.forEach((row, j) => row.forEach((v, i) => { const o = (j * this.cols + i) * 4; if (v.isColor) { d[o] = v.r; d[o + 1] = v.g; d[o + 2] = v.b; } else { d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = v[3] ?? 0; } }));
    const t = new THREE.DataTexture(d, this.cols, this.rows.length, THREE.RGBAFormat, THREE.FloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }
}
// a tree's leaf palette row: the five tones and the deep teal with its flat haze mixed in, then (tone spread, shape id, bias)
const leafRow = (o) => {
  const pal = o.palette ?? PALETTE, f = o.fog ?? 0, c = (h) => hazed(new THREE.Color(h), f);
  // (last: the crown, centre and radius, for the wind; radius 0 = no crown, e.g. the shrubs)
  const cr = o.crown ? [o.crown.c.x, o.crown.c.y, o.crown.c.z, o.crown.r] : [0, 0, 0, 0];
  return [c(pal[0]), c(pal[1]), hazed(deepTeal(pal[1]), f), c(pal[2]), c(pal[3]), c(pal[4]), [o.jitter ?? 0.22, o.id ?? 0.4, o.bias ?? 0], cr];
};

// collects leaf cards (of any number of trees: `row` is the palette row the next cards belong to)
class Cards {
  constructor() { this.P = []; this.D = []; this.L = []; this.B = []; this.T = []; this.row = 0; }
  add(p, size, variant, lvl, R, probe, spread = 1, hi = 0, navy = 0) {
    this.P.push(p.x, p.y, p.z);
    this.D.push(size, (R() - 0.5) * 1.7, variant, R());
    this.L.push(lvl, spread, hi, navy);
    this.T.push(this.row);
    if (probe) this.B.push(probe.x, probe.y, probe.z);
  }
  mesh(atlas, pal, o) {
    const ig = new THREE.InstancedBufferGeometry();
    ig.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    ig.setIndex([0, 1, 2, 0, 2, 3]);
    ig.setAttribute('iPos', new THREE.InstancedBufferAttribute(new Float32Array(this.P), 3));
    ig.setAttribute('iData', new THREE.InstancedBufferAttribute(new Float32Array(this.D), 4));
    ig.setAttribute('iLight', new THREE.InstancedBufferAttribute(new Float32Array(this.L), 4));
    ig.setAttribute('iTree', new THREE.InstancedBufferAttribute(new Float32Array(this.T), 1));
    if (o.probe) ig.setAttribute('iProbe', new THREE.InstancedBufferAttribute(new Float32Array(this.B), 3));
    ig.instanceCount = this.P.length / 3;
    const sr = new THREE.Vector3().crossVectors(UP, SUN).normalize();
    const su = new THREE.Vector3().crossVectors(SUN, sr).normalize();
    const shared = { uLeaf: { value: atlas }, uBox: { value: atlas.userData.boxes }, uBillRight: { value: sr }, uBillUp: { value: su }, uWind: { value: o.wind ?? 0.035 } };
    const defines = {};
    if (o.probe) defines.PROBE = 1;
    if (A2C) defines.A2C = 1;
    const m = new THREE.Mesh(ig, mat({
      vs: CARD_VS, fs: CARD_FS, defines,
      uniforms: { ...shared, uBillboard: { value: 1 }, uPal: { value: pal }, uMaxPx: { value: MAX_PX } },
      extra: A2C ? { alphaToCoverage: true } : {},
    }));
    const sm = shadowMat(CARD_VS, CARD_SHADOW_FS, { ...shared, uBillboard: { value: 0 } });
    sm.defines = { SHADOW_PASS: 1 };
    m.userData.shadowMat = sm;
    m.userData.grp = 'leaf';
    m.frustumCulled = false;
    // the cap is in pixels of a 720-line frame, growing a little with resolution (marks neither balloon nor turn to dust)
    const v2 = new THREE.Vector2(), um = m.material.uniforms.uMaxPx;
    // DRAW ORDER: nearest cards first. The cards overlap many deep (and the holed cores no longer hide what is
    // behind them), so drawn in a fixed order most of the leaf paint is laid down only to be painted over;
    // nearest first, the depth test throws the hidden fragments away before they are shaded (measured:
    // 0.15-0.35 ms of a 720p frame under a crown; farthest first costs 0.6-1.0 ms MORE than the fixed order).
    // The order only has to be roughly right, so it is renewed when the eye has moved 2 m: one counting
    // sort over the cards (about 20 000) and a re-upload of their attributes. Visibility is decided by the
    // depth buffer, never by this order, so a re-sort cannot be seen.
    const n = ig.instanceCount, names = ['iPos', 'iData', 'iLight', 'iTree'].concat(o.probe ? ['iProbe'] : []);
    const src = names.map((k) => ig.getAttribute(k).array.slice()), P0 = src[0];
    for (const k of names) ig.getAttribute(k).setUsage(THREE.DynamicDrawUsage);
    const NB = 1024, count = new Uint32Array(NB + 1), key = new Uint16Array(n), order = new Uint32Array(n), last = new THREE.Vector3(1e9, 0, 0);
    const sort = (c) => {
      count.fill(0);
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(P0[i * 3] - c.x, P0[i * 3 + 1] - c.y, P0[i * 3 + 2] - c.z);
        const b = Math.min(NB - 1, (Math.sqrt(d * (1 / 160)) * NB) | 0);      // finer steps near the eye
        key[i] = b; count[b + 1]++;
      }
      for (let b = 0; b < NB; b++) count[b + 1] += count[b];
      for (let i = 0; i < n; i++) order[count[key[i]]++] = i;
      names.forEach((k, a) => {
        const at = ig.getAttribute(k), sz = at.itemSize, from = src[a], to = at.array;
        for (let i = 0; i < n; i++) { const f = order[i] * sz, t = i * sz; for (let j = 0; j < sz; j++) to[t + j] = from[f + j]; }
        at.needsUpdate = true;
      });
    };
    m.onBeforeRender = (r, sc, cam) => {
      um.value = MAX_PX * Math.pow(r.getDrawingBufferSize(v2).y / 720, 0.6);
      if (m.userData.sort && cam.isPerspectiveCamera && cam.position.distanceToSquared(last) > 4) { last.copy(cam.position); sort(last); }
    };
    // (for measuring: userData.sort = false and unsort() put the cards back in the order they were built in)
    m.userData.sort = SORT;
    m.userData.unsort = () => { names.forEach((k, a) => { const at = ig.getAttribute(k); at.array.set(src[a]); at.needsUpdate = true; }); last.set(1e9, 0, 0); };
    return m;
  }
}
const BOW_K = +(new URLSearchParams(location.search).get('bow') ?? 1);
const A2C = new URLSearchParams(location.search).get('a2c') !== '0';
const SORT = new URLSearchParams(location.search).get('leafsort') !== '0';
const BLOB_SIDE = new URLSearchParams(location.search).get('blob2') === '1' ? THREE.DoubleSide : THREE.FrontSide;

// navy accent, dark teal, mid green, lit green, pale yellow-green
const PALETTE = [0x284466, 0x33716a, 0x518a56, 0x80c074, 0xcbe37c];
// the second, deeper dark teal: #33716A -> #285C5C, the same step for the other species
const deepTeal = (hex) => { const c = new THREE.Color(hex); c.r *= 0.784; c.g *= 0.814; c.b *= 0.868; return c; };
// largest half-size of a leaf card on screen (px at 720p): the biggest single leaf comes out near 28 px
const MAX_PX = +(new URLSearchParams(location.search).get('maxpx') ?? 62);
// colour after the flat per-object haze (same as atmo() in the shaders)
const HAZE = new THREE.Color(0xe4f0ee);
const hazed = (c, f) => c.clone().lerp(HAZE, f);

// collects the dark base solids of every crown and bush: one mesh, one draw
const BLOB = { pos: [], c1: [], c1b: [], c2: [], c0: [], nrm: [], id: [], idx: [], cr: [] };
const ICO = [0, 1, 2, 3].map((d) => new THREE.IcosahedronGeometry(1, d)).map((g) => {
  // weld the icosphere so it can be displaced without cracks
  const p = g.getAttribute('position'), key = new Map(), verts = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    if (!key.has(k)) { key.set(k, verts.length / 3); verts.push(p.getX(i), p.getY(i), p.getZ(i)); }
    idx.push(key.get(k));
  }
  return { verts, idx };
});
// one clump's solid core. o: palette, fog, id, minY; lvl(unit direction) -> light level there
function addBlob(cl, o, lvl) {
  const pal = o.palette ?? PALETTE, f = o.fog ?? 0;
  const c1 = hazed(new THREE.Color(pal[1]), f), c1b = hazed(deepTeal(pal[1]), f), c2 = hazed(new THREE.Color(pal[2]), f);
  const c0 = hazed(new THREE.Color(pal[0]).lerp(deepTeal(pal[1]), 0.35), f);
  const k = BLOB_K;
  // (finely rounded only on the trees one can stand under; a far tree's cores are a few pixels across)
  const ico = ICO[o.fine ? (cl.a > 1.3 ? 3 : 2) : cl.a > 0.95 ? 1 : 0], base = BLOB.pos.length / 3;
  const sx = cl.c.x * 0.7 + 3.1, sz = cl.c.z * 0.7 + cl.c.y * 1.3;
  for (let i = 0; i < ico.verts.length; i += 3) {
    const x = ico.verts[i], y = ico.verts[i + 1], z = ico.verts[i + 2];
    // lumpy: a few big bulges and hollows, so no outline is an ellipse
    const n = fbm(x * 1.1 + sx, z * 1.1 + sz + y * 1.5, 2) - 0.5;
    const r = k * (1 + n * 0.7);
    const vy = y < 0 ? y * 0.55 : y;      // domed top, flattened belly (as the leaf shell)
    let py = cl.c.y + (vy * r - SUN.y * BLOB_SHIFT * 1.25) * cl.b;
    const px = cl.c.x + (x * r - SUN.x * BLOB_SHIFT) * cl.a, pz = cl.c.z + (z * r - SUN.z * BLOB_SHIFT) * cl.a;
    if (o.minY) py = Math.max(py, o.minY(px, pz) - 0.1);
    BLOB.pos.push(px, py, pz);
    BLOB.c1.push(c1.r, c1.g, c1.b); BLOB.c1b.push(c1b.r, c1b.g, c1b.b); BLOB.c2.push(c2.r, c2.g, c2.b);
    BLOB.c0.push(c0.r, c0.g, c0.b);
    BLOB.id.push(o.id ?? 0.4, lvl(x, y, z));
    if (o.crown) BLOB.cr.push(o.crown.c.x, o.crown.c.y, o.crown.c.z, o.crown.r); else BLOB.cr.push(0, 0, 0, 0);
  }
  for (const i of ico.idx) BLOB.idx.push(base + i);
  // normals of the LUMPY surface (area-weighted face normals), not of the ellipsoid it was made from: the
  // shader lays its leaf sprays on the world plane the surface faces most and leaves out what is seen
  // edge-on, and with the ellipsoid's normal a bulge turned edge-on to the eye kept its sprays, drawn out
  // into long smears and arcs
  {
    const nv = ico.verts.length / 3, acc = new Float32Array(nv * 3), P = BLOB.pos, b3 = base * 3;
    for (let t = 0; t < ico.idx.length; t += 3) {
      const i0 = ico.idx[t], i1 = ico.idx[t + 1], i2 = ico.idx[t + 2];
      const ax = P[b3 + i1 * 3] - P[b3 + i0 * 3], ay = P[b3 + i1 * 3 + 1] - P[b3 + i0 * 3 + 1], az = P[b3 + i1 * 3 + 2] - P[b3 + i0 * 3 + 2];
      const bx = P[b3 + i2 * 3] - P[b3 + i0 * 3], by = P[b3 + i2 * 3 + 1] - P[b3 + i0 * 3 + 1], bz = P[b3 + i2 * 3 + 2] - P[b3 + i0 * 3 + 2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      for (const i of [i0, i1, i2]) { acc[i * 3] += nx; acc[i * 3 + 1] += ny; acc[i * 3 + 2] += nz; }
    }
    for (let i = 0; i < nv; i++) {
      let nx = acc[i * 3], ny = acc[i * 3 + 1], nz = acc[i * 3 + 2];
      // (outward)
      if (nx * ico.verts[i * 3] + ny * ico.verts[i * 3 + 1] + nz * ico.verts[i * 3 + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const nl = Math.hypot(nx, ny, nz) || 1;
      BLOB.nrm.push(nx / nl, ny / nl, nz / nl);
    }
  }
}
function blobMesh(atlas) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(BLOB.pos, 3));
  g.setAttribute('aC1', new THREE.Float32BufferAttribute(BLOB.c1, 3));
  g.setAttribute('aC1b', new THREE.Float32BufferAttribute(BLOB.c1b, 3));
  g.setAttribute('aC2', new THREE.Float32BufferAttribute(BLOB.c2, 3));
  g.setAttribute('aId', new THREE.Float32BufferAttribute(BLOB.id, 2));
  g.setAttribute('aC0', new THREE.Float32BufferAttribute(BLOB.c0, 3));
  g.setAttribute('aN', new THREE.Float32BufferAttribute(BLOB.nrm, 3));
  g.setAttribute('aCr', new THREE.Float32BufferAttribute(BLOB.cr, 4));
  g.setIndex(BLOB.idx);
  const m = new THREE.Mesh(g, mat({ vs: BLOB_VS, fs: BLOB_FS, uniforms: { uLeaf: { value: atlas } }, side: BLOB_SIDE,
    defines: A2C ? { A2C: 1 } : {}, extra: A2C ? { alphaToCoverage: true } : {} }));
  m.frustumCulled = false;
  m.renderOrder = -1;      // before the cards: whatever lies behind a core is rejected by depth
  m.userData.grp = 'leaf';
  return m;
}

// the solid core of a clump: radius as a fraction of the clump, and how far it sits back from the sun
const BLOB_K = 0.5, BLOB_SHIFT = 0.2;
const BASE_DIRS = [new THREE.TetrahedronGeometry(1, 0), new THREE.BoxGeometry(1, 1, 1)].map((g) => {
  const p = g.getAttribute('position'), seen = new Set(), out = [];
  for (let i = 0; i < p.count; i++) { const k = [p.getX(i), p.getY(i), p.getZ(i)].map((x) => x.toFixed(3)).join(); if (!seen.has(k)) { seen.add(k); out.push(p.getX(i), p.getY(i), p.getZ(i)); } }
  return out;
});
// place leaf cards on a set of clumps. Clump: { c, a (horizontal radius), b (vertical radius), dens }
function leafClumps(cards, clumps, R, o) {
  const v = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const cs = o.card;
  const level = (cl, shellPos) => {
    n.set(v.x / cl.a, v.y / cl.b, v.z / cl.a).normalize();
    const own = thickness(shellPos, SUN, [cl]);
    const oth = thickness(shellPos, SUN, clumps, cl);
    let lvl = 0.54 + 0.24 * n.dot(SUN) + 0.24 * v.y;
    let ct = 1;
    if (o.crown) {
      // A CROWN IS TWO OR THREE BIG VALUE MASSES - the top and sun side light, a middle, the underside and the
      // core deep - not twenty clumps each with its own light cap and dark belly (an even speckle of light and
      // dark leaves over the whole tree). Most of a card's light comes from where it sits on the WHOLE crown;
      // its place on its own clump only breaks the edges between the masses into clumped lobes.
      ct = ((shellPos.x - o.crown.c.x) * o.crown.d.x + (shellPos.y - o.crown.c.y) * o.crown.d.y + (shellPos.z - o.crown.c.z) * o.crown.d.z) / o.crown.r;
      lvl = 0.60 + 0.11 * n.dot(SUN) + 0.10 * v.y + 0.36 * Math.max(-0.72, Math.min(1, ct * 1.25));
    }
    lvl -= 0.36 * (1 - Math.exp(-oth / (o.scale * 2.4)));
    lvl -= 0.12 * (1 - Math.exp(-own / (o.scale * 1.2)));
    return { lvl, sun: ct > 0.05 ? n.dot(SUN) : -1, oth };
  };
  const baseLvl = (cl, pos) => {
    v.set((pos.x - cl.c.x) / cl.a, (pos.y - cl.c.y) / cl.b, (pos.z - cl.c.z) / cl.a).normalize();
    return Math.min(0.5, Math.max(0.24, level(cl, pos).lvl - 0.1));
  };
  // THE LIGHTS AND THE ACCENTS OF A CROWN are few and placed: the pale yellow-green goes on the sun-side rim
  // of the two or three largest lit lobes only (and those lobes are a clear step lighter than the body:
  // the lit green), navy into the largest dark masses, in groups. Everything else keeps the big masses.
  // (own random stream: the cards stay where they were)
  let lobes = null, darks = null;
  const FL = new THREE.Vector3(SUN.x, SUN.y * 0.3, SUN.z).normalize(), RIM = new THREE.Vector3(SUN.x, SUN.y * 0.6, SUN.z).normalize();
  const X = rng(9001 + clumps.length * 131 + Math.round(clumps[0].c.x * 7));
  if (o.crown) {
    const cr = o.crown, aMax = Math.max(...clumps.map((c) => c.a));
    const sc = clumps.map((cl) => {
      const ct = ((cl.c.x - cr.c.x) * cr.d.x + (cl.c.y - cr.c.y) * cr.d.y + (cl.c.z - cr.c.z) * cr.d.z) / cr.r;
      // (the lights are for an eye on the ground: the lobes on the crown's sunward FLANK, not its roof)
      const cf = ((cl.c.x - cr.c.x) * FL.x + (cl.c.y - cr.c.y) * FL.y + (cl.c.z - cr.c.z) * FL.z) / cr.r;
      p.copy(cl.c).addScaledVector(SUN, cl.b * 0.9);
      return { cl, ct, s: cf + 0.45 * cl.a / aMax - 0.5 * (1 - Math.exp(-thickness(p, SUN, clumps, cl) / (o.scale * 1.2))) };
    });
    const nL = clumps.length >= 9 ? 3 : clumps.length >= 4 ? 2 : 1;
    // a lobe is a PLACE on the crown (several clumps wide), about a third of the crown's radius across
    const Rl = cr.r * (clumps.length >= 9 ? 0.46 : 0.6);
    lobes = [];
    for (const q of sc.slice().sort((a, b) => b.s - a.s)) {
      if (lobes.length >= nL) break;
      if (lobes.every((l) => l.c.distanceTo(q.cl.c) > Rl * 1.9)) lobes.push({ c: q.cl.c.clone().addScaledVector(RIM, -Rl * 0.6), r: Rl * (lobes.length ? 0.8 : 1) });
    }
    const inLobe = (cl) => lobes.some((l) => l.c.distanceTo(cl.c) < l.r * 1.1);
    const nD = clumps.length >= 9 ? 3 : clumps.length >= 4 ? 2 : 1;
    darks = new Set(sc.filter((q) => !inLobe(q.cl)).sort((a, b) => (a.ct - 0.6 * a.cl.a / aMax) - (b.ct - 0.6 * b.cl.a / aMax)).slice(0, nD).map((q) => q.cl));
  }
  const lb = -(o.bias ?? 0) * 0.6;
  // (nd: how far this place on its clump is turned to the sun)
  const lobeLight = (cl, lvl, nd, oth) => {
    if (!lobes || oth > o.scale * 2.2 || nd < 0.0) return [lvl, -1];
    // (p: where the card is. Its place on the lobe: 1 on the rim turned to the sun)
    let k = -9;
    for (const l of lobes) { const d = p.distanceTo(l.c); if (d < l.r) k = Math.max(k, ((p.x - l.c.x) * RIM.x + (p.y - l.c.y) * RIM.y + (p.z - l.c.z) * RIM.z) / l.r + 0.5 * (1 - d / l.r)); }
    if (k < -1) return [lvl, -1];
    if (k > 0.30 && nd > 0.15) return [Math.max(lvl, 0.90 + lb + X() * 0.08), 1];
    if (k > -0.25) return [Math.max(lvl, 0.70 + lb + X() * 0.06), 0];
    return [lvl, -1];
  };
  // ... and sprays that may take a light when they stand on the sunward rim of the crown's outline as the eye
  // sees it (the vertex shader decides): on the outer shell, turned up or to the sun, in a few clusters of
  // unequal size fixed in the crown (p: where the card is, nrm: where it faces on its clump)
  const rimCand = (nrm) => {
    const cr = o.crown, d = p.distanceTo(cr.c) / cr.r;
    return d > 0.55 && (nrm.y > 0.15 || nrm.dot(SUN) > 0.25) && fbm(p.x * 0.42 + cr.c.x, p.z * 0.42 + p.y * 0.31 + cr.c.z, 2) > 0.57;
  };
  for (const cl of clumps) {
    const area = cl.a * (cl.a + cl.b);
    const cnt = Math.max(o.minCards ?? 6, Math.round(area / (cs * cs) * 3.4 * (o.density ?? 1)));
    // --- base: nearly solid dark masses standing all round the clump's solid core (see addBlobs), so
    // its outline is leaves from every side. This is the shape the marks sit on.
    const big = cl.a > 0.9, dirs = big ? BASE_DIRS[1] : BASE_DIRS[0], kb = BLOB_K;
    for (let i = 0; i < dirs.length; i += 3) {
      v.set(dirs[i] + (R() - 0.5) * 0.5, dirs[i + 1] + (R() - 0.5) * 0.5, dirs[i + 2] + (R() - 0.5) * 0.5).normalize();
      const vy = v.y < 0 ? v.y * 0.55 : v.y;
      p.set(cl.c.x + (v.x * kb - SUN.x * BLOB_SHIFT) * cl.a, cl.c.y + (vy * kb - SUN.y * BLOB_SHIFT * 1.25) * cl.b, cl.c.z + (v.z * kb - SUN.z * BLOB_SHIFT) * cl.a);
      if (o.minY !== undefined) p.y = Math.max(p.y, o.minY(p.x, p.z));
      const size = kb * cl.a * (big ? 0.74 : 1.0) * logn(R, 0.18, 0.75, 1.3);
      // dark on the shaded side and below, the mid green where the clump faces the sun: never the light tones
      cards.add(p, size, Math.floor(R() * 4), baseLvl(cl, p) + (R() - 0.5) * 0.06, R, o.probe, 0.5, 0, 0);
    }
    if (o.blob) addBlob(cl, { ...o.blob, minY: o.minY, crown: o.crown }, (x, y, z) => {
      v.set(x, y < 0 ? y * 0.55 : y, z);
      p.set(cl.c.x + v.x * cl.a * 0.75, cl.c.y + v.y * cl.b * 0.75, cl.c.z + v.z * cl.a * 0.75);
      return o.probe ? 0.28 : baseLvl(cl, p) + (o.bias ?? 0);
    });
    // --- shell: the leaf marks. Log-normal sizes; on the shaded half only every other one is kept
    const nShell = Math.round(cnt * 0.8);
    for (let i = 0; i < nShell; i++) {
      v.set(R() - 0.5, R() - 0.5, R() - 0.5);
      if (v.lengthSq() < 0.01) v.set(0, 1, 0);
      v.normalize();
      const shell = 0.6 + R() * 0.32;
      const vy = v.y < 0 ? v.y * 0.55 : v.y;      // domed top, flattened belly
      p.set(cl.c.x + v.x * cl.a * shell, cl.c.y + vy * cl.b * shell, cl.c.z + v.z * cl.a * shell);
      if (o.minY !== undefined) p.y = Math.max(p.y, o.minY(p.x, p.z));
      const L = level(cl, p);
      let lvl = L.lvl;
      const shaded = lvl < 0.42;
      const under = v.y < -0.3 && (L.oth > o.scale * 0.5 || L.sun < -0.45);
      // (navy accents come in a few groups through the crown, not as an even sprinkle of dark specks)
      const navy = (under && R() < 0.14 ? 1 : 0) * (!o.crown || fbm(p.x * 0.55 + 3.3, p.z * 0.55 + p.y * 0.4, 2) > 0.52 ? 1 : 0);
      if (shaded && !navy && R() < 0.22) { R(); R(); R(); continue; }
      lvl = Math.max(lvl, 0.15) + (R() - 0.5) * 0.08;
      // the palest tone belongs to the sun-facing top ~30% of the clump, and only where nothing shades it
      let hi = L.sun > 0.42 && L.oth < o.scale * 0.5 ? 1 : 0;
      let nv = navy;
      if (o.crown) {
        hi = 0;
        const [l2, h2] = lobeLight(cl, lvl, n.dot(SUN), L.oth);
        if (h2 >= 0) { lvl = l2; hi = h2; }
        if (!hi && rimCand(n)) hi = 2;
        // navy: groups of a few sprays low in the largest dark masses
        if (darks.has(cl) && v.y < 0.05 && lvl < 0.42 && fbm(p.x * 0.9 + 7.7, p.z * 0.9 + p.y * 0.7, 2) > 0.51 && X() < 0.6) nv = 1;
      }
      const sz = logn(R, 0.38, 0.5, 2.2);
      // big cards carry the dense sprays, small ones the loose ones
      const variant = sz > 0.9 ? 4 + Math.floor(R() * 6) : 6 + Math.floor(R() * 6);
      cards.add(p, cs * sz, navy ? 4 + Math.floor(R() * 5) : variant, lvl, R, o.probe, shaded && hi < 0.5 ? 0.75 : 1, hi, nv);
    }
    // --- loose sprays and single leaves outside the clump: the ragged edge and the strays
    const nLoose = Math.round(cnt * 0.3);
    for (let i = 0; i < nLoose; i++) {
      v.set(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      const shell = 0.95 + R() * 0.32;
      const vy = v.y < 0 ? v.y * 0.55 : v.y;
      p.set(cl.c.x + v.x * cl.a * shell, cl.c.y + vy * cl.b * shell, cl.c.z + v.z * cl.a * shell);
      if (o.minY !== undefined) p.y = Math.max(p.y, o.minY(p.x, p.z));
      const L = level(cl, p);
      let lvl = Math.max(L.lvl, 0.15) + (R() - 0.5) * 0.08;
      let hi = L.sun > 0.42 && L.oth < o.scale * 0.5 ? 1 : 0;
      if (o.crown) { hi = 0; const [l2, h2] = lobeLight(cl, lvl, n.dot(SUN), L.oth); if (h2 >= 0) { lvl = l2; hi = h2; } if (!hi && rimCand(n)) hi = 2; }
      cards.add(p, cs * 0.85 * logn(R, 0.35, 0.5, 1.6), 8 + Math.floor(R() * 8), lvl, R, o.probe, lvl < 0.42 ? 0.45 : 1, hi, 0);
    }
  }
}

// the whole crown of a tree: centre and radius of its clumps, and the direction its light comes from (the sun, lifted a little)
function crownOf(clumps) {
  const c = new THREE.Vector3(); let w = 0, r = 0;
  for (const cl of clumps) { c.addScaledVector(cl.c, cl.a * cl.a); w += cl.a * cl.a; }
  c.multiplyScalar(1 / w);
  for (const cl of clumps) r = Math.max(r, cl.c.distanceTo(c) + cl.a * 0.7);
  return { c, r, d: new THREE.Vector3(SUN.x, SUN.y + 0.45, SUN.z).normalize() };
}

// ------------------------------------------------------------------ tree
// o: x, z, height, trunk (radius), seed, lean [x,z], forks, spread, trunkH (fraction of height below the first fork),
//    depth, clump (clump size factor), card (leaf card half-size in m), density, bias, palette, bark, fog,
//    habit: 'fork' (default: spreading crown on a short trunk) | 'leader' (one stem with side limbs: slender crown)
// ctx: { cards, leafTab, barkTab, trunk: { pos, nrm, v, l, t, idx } } - everything is collected and built once at the end
export function makeTree(ctx, o) {
  const R = rng(o.seed ?? 7);
  const ground = height(o.x, o.z);
  const base = new THREE.Vector3(o.x, ground - 0.35, o.z);
  const H = o.height ?? 11, S = H / 12;
  const r0 = o.trunk ?? 0.5;
  const geo = { pos: [], nrm: [], v: [], l: [], t: [], c: [], f: [], idx: [], tubes: [] };
  const clumps = [];
  const spread = o.spread ?? 1.3;
  const maxDepth = o.depth ?? 3;
  const leader = o.habit === 'leader';
  const clumpAt = (p, k = 1) => {
    const a = S * (1.25 + R() * 0.95) * k * (o.clump ?? 1);
    clumps.push({ c: p.clone().add(new THREE.Vector3((R() - 0.5) * 0.6 * S, 0.25 * S, (R() - 0.5) * 0.6 * S)), a, b: a * ((o.clumpY ?? 0.48) + R() * 0.18) });
  };
  const ax = new THREE.Vector3(), bx = new THREE.Vector3();
  const childDir = (d, theta, phi, lift) => {
    ax.crossVectors(d, Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
    bx.crossVectors(d, ax).normalize();
    const nd = d.clone().multiplyScalar(Math.cos(theta)).addScaledVector(ax, Math.sin(theta) * Math.cos(phi)).addScaledVector(bx, Math.sin(theta) * Math.sin(phi));
    nd.x *= spread; nd.z *= spread;
    nd.y += lift; if (nd.y < 0.06) nd.y = 0.06;
    return nd.normalize();
  };
  // root lobes: a handful of buttress bumps around the foot
  const lobeA = [], nl = 4 + Math.floor(R() * 3);
  for (let i = 0; i < nl; i++) lobeA.push([(i + R() * 0.7) / nl * 6.283, 0.5 + R() * 0.7, 2.5 + R() * 3]);
  const rootLobes = (ang, s) => {
    const h = s - 0.35;                       // metres above the ground
    const k = 1 - smooth(-0.1, 0.75, h);
    if (k <= 0) return 1;
    let m = 0;
    for (const [a0, amp, sharp] of lobeA) m = Math.max(m, amp * Math.pow(0.5 + 0.5 * Math.cos(ang - a0), sharp));
    return 1 + k * (0.08 + 0.55 * m);
  };
  const kv = new THREE.Vector3(), acc = new THREE.Vector3();
  let limbId = 0, foot = null;
  const limbPts = [];      // points along every limb (for the leaf sleeves, see below)
  // one limb: a kinked polyline, then children. forksAtEnd = whether its end is a fork (swollen)
  // pDir, join: the direction of the parent where this limb leaves it, and how much of it the limb keeps at its origin
  const tubeParent = [];      // per tube: [parent tube, ring of the parent it leaves from]
  const limb = (start, dir, len, r, depth, rParent = 0, pDir = null, join = 0, pT = -1, pK = 0, vStart = -1) => {
    const twig = r < 0.07 * Math.max(1, S);
    const segLen = depth === 0 ? 0.45 : twig ? 0.3 : 0.42;
    const seg = Math.max(3, Math.min(26, Math.round(len / segLen)));
    const step = len / seg;
    let pts = [start.clone()], knee = null;
    const d = dir.clone();
    let p = start.clone();
    // kinks: an abrupt change of direction every 1-1.5 m (closer on twigs), zig-zagging about the line,
    // with only a slight wander in between
    const kinkGap = depth === 0 ? 1.5 : twig ? 0.55 : 1.0;
    const kinkAng = depth === 0 ? (o.kink ?? 0.09) : twig ? 0.3 : 0.2;
    let next = kinkGap * (0.5 + R() * 0.6), s = 0;
    acc.set(0, 0, 0);
    for (let i = 0; i < seg; i++) {
      if (s >= next && i < seg - 1) {
        kv.set(R() - 0.5, (R() - 0.5) * 0.8, R() - 0.5).multiplyScalar(2 * kinkAng * (0.6 + R() * 0.8)).addScaledVector(acc, -0.7);
        acc.add(kv);
        d.add(kv);
        next = s + kinkGap * (0.75 + R() * 0.6);
      } else {
        d.x += (R() - 0.5) * 0.05; d.z += (R() - 0.5) * 0.05;
      }
      // limbs sag out then turn up toward the light; twigs more so
      if (depth > 0) d.y += (twig ? 0.2 : 0.11) / seg;
      d.normalize();
      p = p.clone().addScaledVector(d, step);
      s += step;
      pts.push(p);
    }
    // (the kinks are rounded off first - two passes: the elbows go, the wander stays; the bow below is laid on
    // top of that, or the smoothing would draw the limb back to a straight bar between its ends)
    if (depth > 0) {
      const prev = new THREE.Vector3(), cur = new THREE.Vector3();
      for (let pass = 0; pass < 4; pass++) {
        prev.copy(pts[0]);
        for (let i = 1; i < seg; i++) { cur.copy(pts[i]); pts[i].multiplyScalar(0.5).addScaledVector(prev, 0.25).addScaledVector(pts[i + 1], 0.25); prev.copy(cur); }
      }
    }
    // Thin limbs and twigs are BOWED: a long thin limb that only zig-zags about a straight line reads as a
    // wire across the picture. Both ends stay where they were (everything attached to them is unchanged):
    // an arc to one side with some sag, and a weaker S on top, set by the limb's own position (no draw
    // from R: the tree's shape must not change).
    if (depth > 0 && len > 0.9) {
      const e = pts[seg], c0 = pts[0], h1 = (((c0.x * 12.9898 + c0.y * 78.233 + e.z * 37.719) % 1) + 1) % 1, h2 = (((e.x * 39.346 + c0.z * 11.135 + e.y * 83.155) % 1) + 1) % 1;
      const ch = e.clone().sub(c0), cl = ch.length() || 1;
      ch.multiplyScalar(1 / cl);
      const s1 = new THREE.Vector3().crossVectors(ch, Math.abs(ch.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : UP).normalize(), s2 = new THREE.Vector3().crossVectors(ch, s1);
      const ang = h1 * 6.283, thin = 1 - smooth(0.05, 0.14, r / Math.max(1, S));
      // (the arc is a real one - an eighth to a fifth of the limb's length at its middle, stout boughs included:
      // half that still read as a ruled bar under a long lens and from beneath - and it mostly HANGS: a bough
      // leaves its parent, dips and turns up to its fork; only a part of the bow is to a side of its own)
      const bow = s1.clone().multiplyScalar((h1 < 0.5 ? -1 : 1) * (0.55 + 0.35 * Math.abs(Math.cos(ang)))).addScaledVector(s2, Math.sin(ang) * 0.3);      // (s1 is level: a bow to the side shows from beneath the crown too)
      const gv = new THREE.Vector3(0, -1, 0).addScaledVector(ch, ch.y);      // straight down, less its part along the limb
      if (gv.lengthSq() > 0.04) bow.addScaledVector(gv.normalize(), 0.85);
      bow.normalize().multiplyScalar(cl * (0.075 + 0.055 * h2) * (1 + 0.35 * thin) * BOW_K);
      const ess = s1.clone().multiplyScalar(-Math.sin(ang)).addScaledVector(s2, Math.cos(ang)).multiplyScalar(cl * 0.06 * BOW_K * (h2 < 0.5 ? -1 : 1));
      for (let i = 1; i < seg; i++) {
        const f = i / seg;
        pts[i].addScaledVector(bow, Math.sin(Math.PI * Math.pow(f, 0.8))).addScaledVector(ess, Math.sin(2 * Math.PI * f) * (1 - f * 0.4));
      }
      // ... and it has a KNEE: one place, a third to two thirds along, where it turns by 15-25 degrees (a limb
      // that is one even arc from end to end is a bent pipe, a banana). Both ends stay; no draw from R.
      const h3 = (((c0.z * 51.731 + e.y * 19.917 + c0.x * 7.133) % 1) + 1) % 1, h4 = (((e.z * 27.411 + c0.y * 63.127 + e.x * 3.71) % 1) + 1) % 1;
      const fk = 0.30 + 0.38 * h3, ka = h4 * 6.283;
      const kd = s1.clone().multiplyScalar(Math.cos(ka)).addScaledVector(s2, Math.sin(ka)).multiplyScalar(cl * (0.045 + 0.05 * h3) * (twig ? 0.6 : 1) * BOW_K);
      for (let i = 1; i < seg; i++) { const f = i / seg; pts[i].addScaledVector(kd, f < fk ? f / fk : (1 - f) / (1 - fk)); }
      knee = { k: Math.max(1, Math.min(seg - 1, Math.round(fk * seg))), dir: kd.clone().normalize(), h: h4, s: fk * len };
    }
    // A limb is a SMOOTH ARC through its joints (both ends stay where they were, so everything attached to
    // them is unchanged; no draw from R):
    //  - the kinks are rounded off (a zig-zag of straight runs with elbows reads as a folded plank);
    //  - it leaves its parent along the parent's own direction and swings out to its heading from there
    //    (a cubic that adds nothing at either end), so a fork is two curves parting, not a Y of three bars.
    if (depth > 0) {
      if (pDir && join > 0) {
        const dv = pDir.clone().normalize().sub(dir).multiplyScalar(len * join);
        for (let i = 1; i < seg; i++) { const f = i / seg; pts[i].addScaledVector(dv, f * (1 - f) * (1 - f)); }
      }
    }
    // the direction the limb really arrives with at its end, after the bow (its children part from THAT, or
    // every fork has a small elbow in it)
    const dEnd = depth > 0 ? pts[seg].clone().sub(pts[seg - 1]).normalize() : d;
    const isEnd = depth >= maxDepth;
    const r1 = r * (depth === 0 ? (leader ? 0.3 : 0.72) : isEnd ? 0.3 : 0.58);
    // (a branch that leaves its parent part-way along starts with the parent's own value there - vStart - so
    // everything read off it, the sway in the wind above all, is continuous across the joint)
    const va = vStart >= 0 ? vStart : Math.max(0, (depth - 0.5) / maxDepth), vb = Math.max(va + 0.05, Math.min(1, (depth + 0.5) / maxDepth));
    const va0 = depth === 0 ? 0 : va, vAt = (k) => va0 + (vb - va0) * Math.min(1, k / (seg + (isEnd ? 0 : 2)));
    const girthSeed = (o.seed ?? 7) * 1.7 + limbId * 3.31;
    const collar = depth === 0 ? 0 : Math.min(0.45, Math.max(0.15, rParent / r * 0.5 - 0.3));
    let rad = (i, sm) => {
      const f = i / seg;
      let rr = isEnd ? r * (0.02 + 0.98 * Math.pow(1 - f, 0.85)) : r + (r1 - r) * (depth > 0 ? Math.pow(f, 0.62) : f);      // (a bough loses most of its girth soon after it leaves its parent: an even taper is a pipe)   // twigs run out to a point
      rr *= 1 + collar * Math.exp(-sm / (r * 3));                         // branch collar at its origin
      // (slight on a limb: a bough that keeps its girth to a club at the fork is a plank)
      if (!isEnd && !(leader && depth === 0)) rr *= 1 + (depth === 0 ? 0.22 : 0.07) * smooth(len - r * 4, len, sm);   // swelling below the fork
      if (depth === 0) rr *= 1 + 0.38 * (1 - smooth(0.2, 1.0, sm));        // flare toward the ground
      // the girth of a bough is IRREGULAR: it swells and thins along its length (not an even taper), with a
      // knot where it turns
      if (depth > 0 && r > 0.05) {
        rr *= 1 + 0.80 * (fbm(sm * 1.25 + girthSeed, girthSeed * 0.37, 2) - 0.5) + 0.30 * (fbm(sm * 3.7 + girthSeed * 1.9, 4.1, 2) - 0.5);
        if (knee) rr *= 1 + 0.16 * Math.exp(-(((sm - knee.s) / (r * 2.4)) ** 2));
      }
      return rr;
    };
    // (sides by girth: a twig is a dark stroke two or three pixels wide from anywhere one can stand - a square
    // section is all it needs; only the trunk and the first boughs are ever seen broad enough to show a facet)
    const sides = r > 0.3 ? 14 : r > 0.14 ? 10 : r > 0.075 ? 7 : r > 0.035 ? 5 : 4;
    // a limb that forks is closed with a rounded knuckle, so no open, sawn-off ring ever shows
    const nRing = pts.length, radMain = rad;
    if (!isEnd) {
      const re = rad(seg, s);
      pts = pts.concat([p.clone().addScaledVector(dEnd, re * 0.3), p.clone().addScaledVector(dEnd, re * 0.5)]);
      const rad0 = rad;
      rad = (i, sm) => (i < nRing ? rad0(i, sm) : i === nRing ? re * 0.74 : re * 0.1);
    }
    if (depth > 0) for (let i = 1; i < nRing; i++) limbPts.push({ p: pts[i], r: rad(i, i * step), tip: isEnd && i > nRing - 3, d: depth, f: i / seg });
    if (depth === 0 && !foot) {
      // the trunk where a walker meets it: centre line and radius 1.6 m above the ground (the trunk leans,
      // so this is not the foot), with the lumps of the bark (+13%) included
      let bi = 1;
      for (let i = 1; i < nRing; i++) if (Math.abs(pts[i].y - ground - 1.6) < Math.abs(pts[bi].y - ground - 1.6)) bi = i;
      foot = [pts[bi].x, pts[bi].z, rad(bi, bi * step) * 1.13];
    }
    // the tube of a limb follows a curve THROUGH its points (a Catmull-Rom point between every two): at 0.3-0.4 m
    // a ring, a bend showed as a corner between two straight pieces from close by
    let tp = pts, trad = rad, subK = 2;
    // (only the boughs: on a twig the extra rings are never seen - and a thin limb keeps every second joint only)
    const stout = r > 0.075;
    if (depth > 0 && !stout && nRing > 4 && isEnd) {
      const thinned = [];
      for (let i = 0; i < nRing; i += 2) thinned.push(pts[i]);
      if ((nRing - 1) % 2) thinned.push(pts[nRing - 1]);
      const nt = thinned.length;
      tp = thinned;
      trad = (i, sm) => radMain(Math.min(nRing - 1, i === nt - 1 ? nRing - 1 : i * 2), sm);
    } else if (depth > 0 && stout) {
      // (the first boughs - the ones one stands under - get three points between every two: at one, a bend seen
      // from 3-6 m beneath still showed as straight pieces with corners between them)
      const fine = [], sub = r > 0.13 ? 4 : 2;
      for (let i = 0; i < nRing - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, nRing - 1)];
        fine.push(p1);
        for (let k = 1; k < sub; k++) {
          const u = k / sub, u2 = u * u, u3 = u2 * u;
          fine.push(p1.clone().multiplyScalar(0.5 * (2 - 5 * u2 + 3 * u3)).addScaledVector(p0, 0.5 * (-u + 2 * u2 - u3)).addScaledVector(p2, 0.5 * (u + 4 * u2 - 3 * u3)).addScaledVector(p3, 0.5 * (-u2 + u3)));
        }
      }
      fine.push(pts[nRing - 1]);
      const nf = fine.length, radK = rad;
      subK = sub;
      tp = fine.concat(pts.slice(nRing));
      trad = (i, sm) => (i < nf ? radMain(i / sub, sm) : radK(nRing + (i - nf), sm));
    }
    const myT = geo.tubes.length, fineK = tp === pts ? 1 : stout ? subK : 0.5;      // (ring of tp that is pts[k]: k * fineK)
    tubeParent[myT] = [pT, pK];
    tube(geo, tp, trad, sides, depth === 0 ? 0 : va, vb, (o.seed ?? 7) * 3.1 + (limbId++) * 5.7, depth === 0 ? rootLobes : null);
    // a SPUR at the knee of some stout boughs: the stub of a lost branch, a short tapering stroke leaning out
    // of the bend (no draw from R)
    if (knee && depth > 0 && !isEnd && r > 0.08 && knee.h < 0.6) {
      const kp = pts[knee.k], along = pts[knee.k + 1].clone().sub(pts[knee.k - 1]).normalize();
      const sd = knee.dir.clone().multiplyScalar(0.8).addScaledVector(along, 0.55).addScaledVector(UP, 0.35).normalize();
      const rk = radMain(knee.k, knee.s), Ls = rk * (3.2 + 4 * knee.h);
      const side = new THREE.Vector3().crossVectors(sd, along).normalize();
      const sp = [kp.clone(), kp.clone().addScaledVector(sd, Ls * 0.45).addScaledVector(side, Ls * 0.06), kp.clone().addScaledVector(sd, Ls * 0.8).addScaledVector(UP, Ls * 0.10), kp.clone().addScaledVector(sd, Ls).addScaledVector(UP, Ls * 0.14)];
      tubeParent[geo.tubes.length] = [myT, knee.k * fineK];
      tube(geo, sp, (i) => rk * [0.44, 0.30, 0.17, 0.03][i], 6, vAt(knee.k), vAt(knee.k), (o.seed ?? 7) * 2.3 + limbId * 1.9, null);
    }
    const mid = pts[Math.floor(seg / 2)];
    // a small leaf mass round the end of every stout limb that forks, centred on the fork itself, so that
    // from below the limb runs into leaves instead of ending as a stump with its thin children behind it
    if (!isEnd && depth > 0 && r1 > 0.085) {
      const a = Math.max(0.6 * S, r1 * 5.5) * (0.9 + ((p.x * 7.3 + p.z * 3.1) % 1 + 1) % 1 * 0.3), b = a * 0.8;   // (no draw from R: the tree's shape must not change)
      clumps.push({ c: new THREE.Vector3(p.x + SUN.x * BLOB_SHIFT * a, p.y + SUN.y * BLOB_SHIFT * 1.25 * b + 0.1 * b, p.z + SUN.z * BLOB_SHIFT * a), a, b });
    }
    if (isEnd) { clumpAt(p, 0.9); if (len > 2.2 * S && R() < 0.5) clumpAt(mid, 0.6); return; }
    if (leader && depth === 0) {
      // side limbs up the stem, longest low down, in a loose spiral
      clumpAt(p, 0.8);
      const from = o.trunkH ?? 0.3;
      const nSide = o.sides ?? 9;
      let phi = R() * 6.283;
      for (let i = 0; i < nSide; i++) {
        const f = from + (0.97 - from) * (i + R() * 0.6) / nSide;
        const k = Math.min(seg, Math.max(1, Math.round(f * seg)));
        phi += 2.4 + (R() - 0.5) * 0.8;
        const shape = Math.pow(1 - (f - from) / (1 - from), o.taper ?? 0.7);
        const L = H * (o.limbLen ?? 0.3) * (0.3 + 0.7 * shape) * (0.8 + R() * 0.4);
        const rk = r + (r1 - r) * (k / seg);
        const nd = childDir(d, (o.angle ?? 0.95) - 0.35 * f + (R() - 0.5) * 0.3, phi, 0.1);
        limb(pts[k], nd, L, rk * (0.4 + R() * 0.15), L > 1.6 * S ? Math.max(1, maxDepth - 2) : maxDepth - 1, rk, null, 0, myT, k * fineK, vAt(k));
      }
      return;
    }
    if (depth >= 2) { clumpAt(p, 1.0); if (R() < 0.6) clumpAt(mid, 0.8); }
    else if (depth === 1) clumpAt(p, 1.15);
    // fork at the end
    const n = depth === 0 ? (o.forks ?? 3) : 2;
    const phi0 = R() * 6.283;
    for (let i = 0; i < n; i++) {
      const phi = phi0 + (i / n) * 6.283 + (R() - 0.5) * 0.9;
      const theta = depth === 0 ? 0.42 + R() * 0.42 : (i === 0 ? 0.25 : 0.55) + R() * 0.4;
      const nd = childDir(d, theta, phi, depth === 0 ? 0.0 : 0.12);
      const k = i === 0 ? 0.80 : 0.62 + R() * 0.12;
      const L = (depth === 0 ? H * (0.30 + R() * 0.12) : len * (0.66 + R() * 0.22));
      limb(p, nd, L, r1 * k, depth + 1, r1, dEnd, depth === 0 ? 0.28 : 0.5, myT, seg * fineK);
    }
    // a side branch part-way along limbs
    if (depth >= 1) {
      const k = Math.max(1, Math.min(seg - 1, Math.round(seg * (0.35 + R() * 0.3))));
      const nd = childDir(d, 0.8 + R() * 0.5, R() * 6.283, 0.05);
      const rk = r + (r1 - r) * (k / seg);
      limb(pts[k], nd, len * (0.6 + R() * 0.3), r * 0.3, Math.min(maxDepth, depth + 2 - (R() < 0.4 ? 1 : 0)), rk, pts[k + 1].clone().sub(pts[k - 1]), 0.35, myT, k * fineK, vAt(k));
    }
  };
  const lean = new THREE.Vector3(o.lean?.[0] ?? 0.08, 1, o.lean?.[1] ?? 0.05).normalize();
  const trunkLen = leader ? H * 0.93 : H * (o.trunkH ?? 0.34);
  limb(base, lean, trunkLen, r0, 0);
  // a low bough or two, as specified
  for (const b of o.boughs ?? []) {
    const st = base.clone().addScaledVector(lean, trunkLen * b.at);
    limb(st, new THREE.Vector3(b.dir[0], b.dir[1], b.dir[2]).normalize(), b.len, r0 * (b.r ?? 0.4), b.depth ?? 1, r0);
  }

  const id = 0.3 + R() * 0.4;
  const crown0 = crownOf(clumps);
  const row = ctx.barkTab.add([0x857e66, 0x6c6853, 0x4a4e60, 0x383d50, 0x6b7350, 0x56566e].map((d, i) => new THREE.Color(o.bark?.[i] ?? d)).concat([[o.fog ?? 0, id, ground], [crown0.c.x, crown0.c.y, crown0.c.z, crown0.r]]));
  // append the skeleton to the shared trunk mesh. Per vertex: how deep it sits inside a clump's solid core (0 outside, 1 well inside)
  const T = ctx.trunk, v0 = T.pos.length / 3;
  const shrink = new Float32Array(geo.v.length);
  for (let i = 0; i < geo.v.length; i++) {
    const x = geo.pos[i * 3], y = geo.pos[i * 3 + 1], z = geo.pos[i * 3 + 2];
    let m = 9;
    for (const c of clumps) {
      const cx = c.c.x - SUN.x * BLOB_SHIFT * c.a, cy = c.c.y - SUN.y * BLOB_SHIFT * 1.25 * c.b, cz = c.c.z - SUN.z * BLOB_SHIFT * c.a;
      const dy = y - cy;
      m = Math.min(m, Math.hypot((x - cx) / c.a, dy / (c.b * (dy < 0 ? 0.55 : 1)), (z - cz) / c.a));
    }
    // (wide: a limb is in the shade of a leaf mass well before it enters its core, so the stretch of a
    // bough seen in a gap between two masses is one dark stroke, not a lit plank)
    // (a main limb is never 'inside' right where it leaves the trunk: the change from bark to the dark of the
    // leaves happens along the limb, not as a ring round the fork)
    const inside = (1 - smooth(BLOB_K * 0.85, BLOB_K * 3.0, m)) * (geo.v[i] < 0.5 ? smooth(0.04, 0.42, geo.f[i]) : 1);
    T.v.push(geo.v[i], inside, row);
    // A bough TAPERS AWAY inside its leaf mass: every ring is drawn in toward the limb's centre line by how
    // deep it sits in a clump (not the trunk, and a limb only from a little way past its origin), so what
    // shows in a gap between two masses or from beneath is a thin dark stroke that vanishes into the
    // leaves, never a bar of the full girth with a rounded end. (No draw from R: the crown is unchanged.)
    // (less at the origin of a limb than toward its end: a limb that starts inside one mass and crosses a gap
    // must not swell out of the leaves into a spindle)
    shrink[i] = 1 - 0.74 * smooth(0.20, 0.90, inside) * smooth(0.14, 0.34, geo.v[i]) * (0.4 + 0.6 * smooth(0.15, 0.6, geo.f[i]));
  }
  // the drawing-in is ONE amount per ring, eased along the limb over about a metre and a half: applied vertex
  // by vertex where the leaf mass begins, a stout bough ended in a club (full girth, then a thin stalk)
  const krAll = [];
  geo.tubes.forEach(([b0, nR, S1], ti) => {
    let kr = new Float32Array(nR);
    for (let i = 0; i < nR; i++) { let a = 0; for (let j = 0; j < S1; j++) a += shrink[b0 + i * S1 + j]; kr[i] = a / S1; }
    for (let pass = 0; pass < 10; pass++) {
      const o = kr.slice();
      for (let i = 0; i < nR; i++) kr[i] = (o[Math.max(i - 1, 0)] + 2 * o[i] + o[Math.min(i + 1, nR - 1)]) / 4;
    }
    // a limb that ends drawn in tapers down to that girth over most of its length (drawn in only over its last
    // metre, where the leaf mass at its fork begins, it ended in a rounded knob with thin stalks on it)
    { const ke = kr[nR - 1]; for (let i = 0; i < nR; i++) kr[i] = Math.min(kr[i], 1 + (ke - 1) * Math.pow(smooth(0.12, 1, i / (nR - 1)), 1.3)); }
    // ... and it carries on from its parent: a limb leaves the fork drawn in as much as its parent is there
    // and eases to its own amount over the first metre (or the parent ends in a knob with a stalk on it)
    const [pT, pK] = tubeParent[ti] ?? [-1, 0];
    if (pT > 0) {
      const kp = krAll[pT][Math.min(Math.round(pK), krAll[pT].length - 1)];
      for (let i = 0; i < nR; i++) { const w = 1 - smooth(0, 1.1, geo.l[(b0 + i * S1) * 3 + 1]); kr[i] += (kp - kr[i]) * w; }
    }
    krAll.push(kr);
    for (let i = 0; i < nR; i++) for (let j = 0; j < S1; j++) {
      const q = b0 + i * S1 + j, k = kr[i];
      if (k >= 0.999) continue;
      for (let a = 0; a < 3; a++) geo.pos[q * 3 + a] = geo.c[q * 3 + a] + (geo.pos[q * 3 + a] - geo.c[q * 3 + a]) * k;
      geo.l[q * 3 + 2] *= k;
    }
  });
  for (const k of ['pos', 'nrm', 'l', 't']) for (const x of geo[k]) T[k].push(x);
  for (const i of geo.idx) T.idx.push(v0 + i);

  const n0 = ctx.cards.P.length / 3;
  const crown = crownOf(clumps);
  ctx.cards.row = ctx.leafTab.add(leafRow({ palette: o.palette, fog: o.fog, jitter: o.jitter ?? 0.13, id: id + 0.05, bias: o.bias, crown }));
  leafClumps(ctx.cards, clumps, R, { crown, card: o.card ?? 0.74 * Math.max(0.8, Math.sqrt(S)), density: o.density, scale: S, minCards: o.minCards, bias: o.bias, blob: { palette: o.palette, fog: o.fog, id: id + 0.05, fine: o.fine } });
  // leaf sleeves: where a limb runs inside a leaf mass, a few dark sprays hang about it on all sides, so
  // from beneath it is a branch threading through leaves (overlapped, lost and found again), never a bare
  // bar between two masses, and where it enters the foliage its lit bark is overlapped by leaves.
  // (own random stream: the tree itself is unchanged)
  {
    const Q = rng((o.seed ?? 7) * 131 + 17), cs = o.card ?? 0.74 * Math.max(0.8, Math.sqrt(S)), q = new THREE.Vector3();
    const Q2 = rng((o.seed ?? 7) * 257 + 3);
    for (const lp of limbPts) {
      if (lp.r < 0.03 || lp.tip) { continue; }
      let m = 9;
      for (const c of clumps) {
        const cx = c.c.x - SUN.x * BLOB_SHIFT * c.a, cy = c.c.y - SUN.y * BLOB_SHIFT * 1.25 * c.b, cz = c.c.z - SUN.z * BLOB_SHIFT * c.a;
        const dy = lp.p.y - cy;
        m = Math.min(m, Math.hypot((lp.p.x - cx) / c.a, dy / (c.b * (dy < 0 ? 0.55 : 1)), (lp.p.z - cz) / c.a));
      }
      const inside = 1 - smooth(BLOB_K * 0.85, BLOB_K * 3.2, m);
      if (inside < 0.08) {
        // an EXPOSED run of a bough (not the main limbs where they leave the trunk): a loose spray of leaves
        // on it every metre or so, in the tone the crown's shade gives it there - the run is overlapped,
        // lost and found again instead of crossing the picture as a bare bar
        if ((lp.d >= 2 || lp.f > 0.36) && Q2() < (lp.d >= 2 ? 0.34 : 0.28)) {
          q.set(Q2() - 0.5, (Q2() - 0.5) * 0.7 + 0.1, Q2() - 0.5).normalize().multiplyScalar(lp.r + cs * (0.10 + Q2() * 0.30)).add(lp.p);
          const oth = thickness(q, SUN, clumps);
          const lvl = 0.50 - 0.34 * (1 - Math.exp(-oth / (S * 2.4))) + (Q2() - 0.5) * 0.08 + (o.bias ?? 0) * 0.3;
          ctx.cards.add(q, cs * (0.42 + Q2() * 0.40), 6 + Math.floor(Q2() * 6), lvl, Q2, undefined, lvl < 0.42 ? 0.6 : 1, 0, 0);
        }
        continue;
      }
      const n = Q() < 0.48 + inside * 0.5 ? (lp.r > 0.09 && Q() < 0.75 ? 2 : 1) : 0;
      for (let i = 0; i < n; i++) {
        q.set(Q() - 0.5, (Q() - 0.5) * 0.9 - 0.12, Q() - 0.5).normalize().multiplyScalar(lp.r + cs * (0.25 + Q() * 0.45)).add(lp.p);
        ctx.cards.add(q, cs * (0.5 + Q() * 0.45), 4 + Math.floor(Q() * 7), 0.20 + Q() * 0.16 + (o.bias ?? 0) * 0.3, Q, undefined, 0.6, 0, Q() < 0.08 ? 1 : 0);
      }
    }
  }
  return { count: ctx.cards.P.length / 3 - n0, tris: geo.idx.length / 3, clumps: clumps.length, foot };
}
function trunkMesh(T, pal) {
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(T.pos, 3));
  tg.setAttribute('normal', new THREE.Float32BufferAttribute(T.nrm, 3));
  tg.setAttribute('aV', new THREE.Float32BufferAttribute(T.v, 3));
  tg.setAttribute('aL', new THREE.Float32BufferAttribute(T.l, 3));
  tg.setAttribute('aT', new THREE.Float32BufferAttribute(T.t, 3));
  tg.setIndex(T.idx);
  const m = new THREE.Mesh(tg, mat({ vs: TRUNK_VS, fs: TRUNK_FS, uniforms: { uPal: { value: pal }, uRim: { value: new THREE.Color(0xe6e0c2) } } }));
  m.userData.shadowMat = shadowMat();
  m.userData.grp = 'trunk';
  m.frustumCulled = false;
  return m;
}

// ------------------------------------------------------------------ shrubs
// each bush: a few low domes of small-leaved foliage sitting on the ground
export function makeBushes(cards, list) {
  const R0 = rng(4242);
  for (const b of list) {
    // (b.seed: a bush with a random sequence of its own - give one to any bush added to the list, anywhere in
    // it, and the others keep their shapes; without it a bush draws from the sequence shared down the list)
    const R = b.seed !== undefined ? rng(b.seed) : R0;
    const s = b.s ?? 1;
    const clumps = [];
    const n = b.n ?? 3;
    const dir = R() * 6.283;
    for (let i = 0; i < n; i++) {
      // strung out along a line (walls) with some scatter
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (b.len ?? 1.3) * s;
      const a0 = b.dir ?? dir;
      const x = b.x + Math.cos(a0) * t + (R() - 0.5) * 0.5 * s, z = b.z + Math.sin(a0) * t + (R() - 0.5) * 0.5 * s;
      const a = s * (0.55 + R() * 0.4) * (i === Math.floor(n / 2) ? 1.2 : 0.9);
      const bb = a * (0.75 + R() * 0.35) * (b.tall ?? 1);
      clumps.push({ c: new THREE.Vector3(x, height(x, z) + bb * 0.35, z), a, b: bb, dens: 2.2 });
    }
    const probe = new THREE.Vector3(b.x, height(b.x, b.z) + 0.6 * s, b.z).addScaledVector(SUN, 1.6 * s + 0.6);
    leafClumps(cards, clumps, R, { card: (b.card ?? 0.42) * Math.sqrt(s), density: 1.25, scale: 0.4 * s, probe, minY: (x, z) => height(x, z) + 0.12, bias: -0.03, blob: { id: 0.47 } });
  }
  return { count: cards.P.length / 3 };
}

// species feel: palettes (navy, dark teal, mid, lit, pale) and bark (lit, mid, shade, deep, olive, violet)
const OAK = {};
const ELM = { palette: [0x27405f, 0x2e6968, 0x447f60, 0x72b47c, 0xc2df88], bark: [0x9a9684, 0x7c7a6c, 0x4f5464, 0x3b4054, 0x6f7850, 0x565a74] };
const LIME = { palette: [0x2a4664, 0x3b7660, 0x64974e, 0x98c866, 0xd6e678], bark: [0x89826c, 0x6f6a58, 0x4b4b5c, 0x3c394c, 0x74744f, 0x5a526e] };
const BIRCH = { palette: [0x2b4a66, 0x3a7a6c, 0x5c9a62, 0x8fcc7e, 0xd0e888], bark: [0xc9c8b6, 0xa3a59a, 0x6c7286, 0x4a4f62, 0x8a9068, 0x6d6a88] };

// ---- the planting. One entry per tree: the options of makeTree(). `turf: 'composed'` marks the four the
// meadow was first composed around (see ground() in src/layout.js); `turf: false` keeps the grass from
// taking any notice of a tree.
const SAP = { habit: 'leader', depth: 3, card: 0.46, clump: 0.56, minCards: 4, fog: 0.03, bias: -0.12 };
export const TREES = [
  // the big tree west of the chapel: its shadow falls across the west wall and the nave
  { x: -11.5, z: 3.5, height: 14, trunk: 0.62, seed: 11, lean: [0.10, -0.05], fine: true, ...OAK, turf: 'composed' },
  // dark foreground framing tree beside the path, south-east of the chapel
  { x: 17, z: 18.5, height: 7.5, trunk: 0.42, seed: 5, lean: [-0.16, -0.06], bias: -0.14, card: 0.6, spread: 1.6, fine: true, turf: 'composed' },
  // smaller ones down the slopes
  { x: 13, z: -17, height: 8.5, trunk: 0.34, seed: 23, lean: [-0.1, 0.05], forks: 3, clump: 0.8, card: 0.6, trunkH: 0.3, ...LIME, turf: 'composed' },
  { x: -24, z: -13, height: 7.5, trunk: 0.3, seed: 41, lean: [0.06, 0.1], forks: 3, clump: 0.78, card: 0.58, spread: 1.1, turf: 'composed' },
  // --- the hilltop rim: dark near shapes to frame every outward view (kept out of the SSE vista corridor)
  // tall, narrow elm to the north
  { x: -10, z: -48, height: 14.5, trunk: 0.55, seed: 61, lean: [0.05, 0.03], trunkH: 0.44, spread: 0.8, forks: 3, fog: 0.04, bias: -0.05, ...ELM },
  // broad, leaning lime on the east shoulder
  { x: 37.5, z: 6.5, height: 11, trunk: 0.5, seed: 73, lean: [0.2, 0.08], trunkH: 0.28, spread: 1.75, forks: 3, fog: 0.04, bias: -0.13, clumpY: 0.4, bark: LIME.bark },
  // low-forking, two-stemmed oak to the south-west
  { x: -34, z: 26, height: 9, trunk: 0.44, seed: 87, lean: [-0.15, 0.1], trunkH: 0.17, spread: 1.15, forks: 2, fog: 0.03, bias: -0.08, clump: 0.9, card: 0.66 },
  // saplings: one slender stem with short side limbs, many small clumps
  { ...SAP, ...BIRCH, x: -46, z: -8, height: 7.5, trunk: 0.13, seed: 101, lean: [0.07, -0.04] },
  { ...SAP, ...BIRCH, x: -44.2, z: -5.6, height: 5.2, trunk: 0.09, seed: 103, lean: [-0.08, 0.06] },
  { ...SAP, ...ELM, x: -31, z: -43, height: 7.5, trunk: 0.16, seed: 107, lean: [-0.05, 0.08], limbLen: 0.26 },
  { ...SAP, x: -13.5, z: 33.5, height: 6.5, trunk: 0.14, seed: 109, lean: [0.1, 0.02], limbLen: 0.34 },
  { ...SAP, ...LIME, x: 31, z: -33, height: 7, trunk: 0.15, seed: 113, lean: [0.06, 0.09] },
  { ...SAP, ...ELM, x: 25, z: 40, height: 8, trunk: 0.17, seed: 131, lean: [0.05, -0.06], limbLen: 0.24, bias: -0.16 },
  { ...SAP, ...BIRCH, x: 33, z: 21, height: 6, trunk: 0.12, seed: 127, lean: [-0.06, -0.08] },
];
// shrubs: see makeBushes()
export const BUSHES = [
  { x: -6.2, z: -6.5, s: 1.1, n: 3, dir: 1.57 },
  { x: -6.0, z: 5.6, s: 0.85, n: 2, dir: 1.3 },
  { x: 6.1, z: -7.6, s: 1.0, n: 3, dir: 1.57 },
  { x: -2.6, z: -10.2, s: 1.15, n: 4, dir: 0.0, len: 2.2 },
  { x: 3.8, z: -10.0, s: 0.8, n: 2, dir: 0.2 },
  { x: 9.6, z: 1.2, s: 0.9, n: 3 },
  { x: 11.4, z: 5.0, s: 0.7, n: 2 },
  { x: 7.0, z: -3.6, s: 0.75, n: 2 },
  // rim thickets
  { x: 15.6, z: 31.5, s: 1.3, n: 3, len: 1.6 },
  { x: -40, z: 9, s: 1.9, n: 4, len: 2.0, tall: 1.2 },
  { x: -17, z: 38, s: 1.7, n: 3, tall: 1.15 },
  { x: 27, z: -27, s: 1.6, n: 4, len: 2.0 },
  { x: 5, z: -40, s: 2.0, n: 4, len: 2.2, tall: 1.2 },
  { x: -37, z: -25, s: 1.5, n: 3 },
  { x: 40, z: -8, s: 1.8, n: 3, tall: 1.2 },
  { x: -30, z: 30.5, s: 1.2, n: 2 },
  { x: 8.2, z: 42, s: 1.5, n: 3 },
  { x: 17, z: 37, s: 1.7, n: 4, len: 2.0, tall: 1.15 },
];
// The foot of every trunk on the turf, declared at load: the grass keeps off it, stands a dark fringe at it
// and a wider apron of taller grass round it. (What the walker bumps into is the trunk as built - TRUNKS.)
TREES.forEach((t, i) => {
  if (t.turf === false) return;
  ground(disc(t.x, t.z, t.trunk * 1.2), { apron: true, ...(t.turf === 'composed' ? { seq: 100 + i } : {}) });
});

// Footprints of the trunks of every tree on the hilltop, for collision and lens clamping: [x, z, radius],
// centre and radius taken 1.6 m above the ground. EMPTY until the default export below has run (it is
// filled while the trees are built, and declared to the layout as it goes), so read it at use time.
export const TRUNKS = [];

export default function (scene) {
  const atlas = makeFoliageAtlas();
  const stats = [];
  TRUNKS.length = 0;
  const ctx = { cards: new Cards(), leafTab: new Table(8), barkTab: new Table(8), trunk: { pos: [], nrm: [], v: [], l: [], t: [], idx: [] } };
  for (const o of TREES) {
    const st = makeTree(ctx, o); stats.push(st);
    if (st.foot) { const f = st.foot.map((v) => +v.toFixed(3)); TRUNKS.push(f); LAYOUT.stand.push(f); }
  }
  const bushes = new Cards();
  bushes.row = ctx.leafTab.add(leafRow({ id: 0.47, bias: -0.03 }));
  stats.push(makeBushes(bushes, BUSHES));
  // four draws in all: the cores first (they hide what lies behind them), the trunks, the trees' leaves, the shrubs
  const pal = ctx.leafTab.texture();
  scene.add(blobMesh(atlas));
  scene.add(trunkMesh(ctx.trunk, ctx.barkTab.texture()));
  scene.add(ctx.cards.mesh(atlas, pal, {}));
  scene.add(bushes.mesh(atlas, pal, { probe: true, wind: 0.012 }));
  window.__foliage = stats.map((s) => s.count);
  window.__trunks = TRUNKS;
  window.__foliageStats = stats.map((s) => ({ cards: s.count, tris: s.tris, clumps: s.clumps }));
}
