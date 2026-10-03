// Smaller man-made things: columns in the nave, an altar, a wayside cross, a dry-stone wall
// along the path and a few weathered fence posts.
import { snowCaps } from '../snowcap.js';
import * as THREE from 'three';
import { Builder, wobble } from '../build.js';
import { rng, height, fbm, vnoise, PATH, SUN, alongPath } from '../world.js';
import { pathInfo } from '../terrain.js';
import { disc, run, ground } from '../layout.js';
import { stoneMaterial, stoneShadow, stonePrepass } from '../stone.js';
import { ruinWarp, FALLEN, COLUMNS, ALTAR, CROSS } from '../ruin.js';

// ---- the dry-stone wall: WALL.off metres east of the path centre line, from WALL.from metres along it. Its
// top line sags and rises; in places the wall is down to a course or nothing.
const WALL = { off: 2.6, from: 26, to: 80 };
// [height of the top, how far fallen] at d metres along the path
const wallProfile = (d) => {
  const prof = 0.5 + Math.sin(d * 0.19 + 1.3) * 0.12 + Math.sin(d * 0.47) * 0.08 + (fbm(d * 0.35, 3.3, 2) - 0.5) * 0.25;
  const fallen = fbm(d * 0.085 + 9, 1.7, 2);
  return [fallen > 0.62 ? prof * Math.max(0, 1 - (fallen - 0.62) * 9) : prof, fallen];
};
// ---- the fence: posts every FENCE.step metres from FENCE.from along the path, one of them missing
const FENCE = { from: 30, step: 2.6, n: 9, missing: 4, off: 2.3 };

// ---- declared to the layout (src/layout.js), at module load
{
  // the wall as a run of segments; grass gathers only where it stands, in broken runs of 1-4 m
  const segs = [];
  let acc = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const ax = PATH[i][0], az = PATH[i][1], bx = PATH[i + 1][0], bz = PATH[i + 1][1];
    const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
    const t0 = Math.max(0, (WALL.from - acc) / L);
    if (t0 < 1) segs.push([ax + dx * L * t0 + dz * WALL.off, az + dz * L * t0 - dx * WALL.off, bx + dz * WALL.off, bz - dx * WALL.off]);
    acc += L;
  }
  ground(run(segs, 0.27), {
    seq: 200,
    gate: (x, z) => { const s = pathInfo(x, z).s; return wallProfile(s)[0] > 0.14 && vnoise(s / 1.7 + 31.7, 5.5) > 0.44; },
    solid: (x, z) => wallProfile(pathInfo(x, z).s)[0] > 0.05,
  });
  for (let i = 0; i < FENCE.n; i++) {
    if (i === FENCE.missing) continue;
    const [px, pz, dx, dz] = alongPath(FENCE.from + i * FENCE.step);
    ground(disc(px - dz * FENCE.off, pz + dx * FENCE.off, 0.09), { seq: 201 + i });
  }
}

export default function (scene) {
  const R = rng(777);
  const b = new Builder();
  b.warp = ruinWarp;
  const M = (x, y, z, sx, sy, sz, rot) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(rot ?? new THREE.Euler()), new THREE.Vector3(sx, sy, sz));

  // ---- columns: two still standing (one full height with its capital), drums of the others fallen.
  // Nothing here is a clean primitive: drums are slightly oval and out of line, their rims are
  // bevelled and chipped, broken shafts end in a sloping fracture.
  const TAU = Math.PI * 2;
  const Rd = rng(8123);                                         // (this round's: the lying drums)
  const Rc = rng(4711);                                         // new random numbers of this round (R keeps its old sequence)
  const rimChips = (n, hh) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ a: R() * TAU, w: 0.22 + R() * 0.5, y: R() < 0.5 ? 1 : -1, reach: (0.06 + R() * 0.16) / hh, depth: 0.07 + R() * 0.16, drop: (0.01 + R() * 0.03) / hh });
    return out;
  };
  // one drum: radius r (metres), height h, bevelled rims. Two extra rings in the body let pieces
  // be bitten out of the side as well as the rims, so the outline of a drum is never two ruled
  // lines: it bellies and dents.
  const bites = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ a: R() * TAU, w: 0.35 + R() * 0.6, y: (R() - 0.5) * 0.9, reach: 0.5 + R() * 0.4, depth: 0.05 + R() * 0.09, drop: 0 });
    return out;
  };
  const drum = (m, r0, r1, hh, opts = {}) => {
    const e = (0.012 + R() * 0.02) / hh, bv = 0.006 + R() * 0.014, ya = -0.42 + R() * 0.25, yb = 0.2 + R() * 0.25;
    const rAt = (y) => r0 + (r1 - r0) * (y + 1) / 2;
    const prof = [[-1, r0 - bv], [-1 + e, r0], [ya, rAt(ya) * (0.992 + R() * 0.016)], [yb, rAt(yb) * (0.992 + R() * 0.016)], [1 - e, r1], [1, r1 - bv]];
    const o = { tone: R(), lump: 0.035, notches: [...rimChips(opts.chips ?? 1 + Math.floor(R() * 3), hh), ...bites(opts.bites ?? Math.floor(R() * 2.5)), ...(opts.extra ?? [])], ...opts };
    // (opts.plain: no bevelled rims, no ring between the ends, no stepped chips - one plain length of
    // shaft whose outline is left to the oval, the half-metre noise and the clip planes)
    if (opts.plain) { o.notches = []; b.lathe(m, [[-1, r0 * 0.93], [-0.86, r0], [0.86, r1], [1, r1 * 0.93]], o); }
    else b.lathe(m, prof, o);
  };
  // a moulded square stone (plinth, abacus): top and bottom arrises weathered to uneven bevels
  const worn = (top, bot) => {
    const c = [];
    for (const [kx, kz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (top) c.push([kx, 1, kz, kx ? top * (0.6 + R() * 0.9) : Infinity, top * (0.6 + R() * 0.9), kz ? top * (0.6 + R() * 0.9) : Infinity]);
      if (bot) c.push([kx, -1, kz, kx ? bot * (0.7 + R() * 0.6) : Infinity, bot * (0.7 + R() * 0.6), kz ? bot * (0.7 + R() * 0.6) : Infinity]);
    }
    return c;
  };
  const column = (x, z, drums, cap, stump = 0) => {
    const g = height(x, z);
    b.setElem(x, g + 0.6 + drums * 0.45, z);
    // everything carried by the shaft is toned like the shaft: by the plain direction out from
    // the column's axis (one lit strip, one shade strip), not facet by facet
    const radial = (pos) => { const ax = pos.x - x, az = pos.z - z, l = Math.hypot(ax, az) || 1; return [ax / l, 0, az / l, 2]; };
    // plinth: sunk a little to one side, top arrises worn round, one corner broken away and
    // another knocked - never a box
    const kx = R() < 0.5 ? -1 : 1, kz = R() < 0.5 ? -1 : 1;
    b.block(x, g + 0.11, z, 1.25, 0.3, 1.25, {
      tone: R(), line: 2, skew: wobble(R, 0.06), rot: new THREE.Euler((R() - 0.5) * 0.05, (R() - 0.5) * 0.08, (R() - 0.5) * 0.05),
      chips: [...worn(0.07, 0),
        [kx, 1, kz, 0.25 + R() * 0.25, 0.25 + R() * 0.3, 0.18 + R() * 0.25], [kx, 1, kz, 0.5 + R() * 0.2, 0.12, 0.12 + R() * 0.1],
        [-kx, 1, R() < 0.5 ? -1 : 1, 0.06 + R() * 0.1, Infinity, 0.06 + R() * 0.1], [kx, 1, -kz, 0.1 + R() * 0.1, 0.1 + R() * 0.15, 0.12 + R() * 0.12]],
    });
    // moulded base: two rolls and a hollow
    // (the base is ONE worn swelling under the shaft - a roll and a slope - not a stair of turned rings)
    b.lathe(M(x, g + 0.42, z, 0.5, 0.15, 0.5), [[-1, 1.08], [-0.45, 1.13], [0.1, 1.04], [0.6, 0.93], [1, 0.84]],
      { tone: R(), lump: 0.03, capBottom: false, ell: 0.035, noise: 0.012, sub: 2, sides: 28, notches: [{ a: R() * TAU, w: 0.6, y: -0.6, reach: 0.7, depth: 0.16, drop: 0 }, { a: R() * TAU, w: 0.4, y: 0.5, reach: 0.6, depth: 0.12, drop: 0 }, { a: R() * TAU, w: 0.3, y: -0.5, reach: 0.5, depth: 0.1, drop: 0 }] });
    let y = g + 0.57, r = 0.405;
    const lean = [(R() - 0.5) * 0.012, (R() - 0.5) * 0.012];      // the whole shaft is a hair out of plumb
    void lean;
    // The shaft is ONE form: a single continuous surface from base to necking (every drum is a
    // length of the same lathe: same axis, same turn, no bevel, no chip, no step between them).
    // The drums are told only by their bed joints, which the shader DRAWS as short broken lines.
    const shaftId = b.nextId(), shaftTone = R(), shaftRot = R() * 6;
    // (not a ruled cylinder: the axis wanders a centimetre or two up the shaft, the section is a little
    // oval and the surface goes in and out by under a centimetre - the same for every drum and the capital)
    const pa = x * 1.7 + z * 0.9, bend = (wy) => [0.014 * Math.sin((wy - g) * 0.9 + pa) + 0.006 * Math.sin((wy - g) * 2.3 + pa * 2), 0.012 * Math.sin((wy - g) * 0.8 + pa * 1.3) + 0.005 * Math.sin((wy - g) * 2.7 + pa)];
    const shaftO = { ell: 0.018, twist: 0, noise: 0.008, bend, seed: pa };
    for (let i = 0; i < drums; i++) {
      const last = i === drums - 1, broken = last && !cap;
      const h = broken && stump ? stump : 0.45 + Math.pow(R(), 1.3) * 0.75, r1 = r - 0.007 - R() * 0.004;
      b.lathe(M(x, y + h / 2, z, 1, h / 2, 1, new THREE.Euler(0, shaftRot, 0)), [[-1, r], [1, r1]], {
        id: shaftId, tone: shaftTone, sides: 28, capBottom: false, capTop: broken, capLN: [0, 1, 0, 3], ...shaftO, sub: Math.max(2, Math.ceil(h / 0.4)),
        // (a broken shaft ends in a sloping fracture, its top toned with its side: no lid)
        cut: broken ? { a: R() * TAU, slope: (0.4 + R() * 0.6) / 0.4, y0: stump ? 0.1 + R() * 0.2 : 0.3 + R() * 0.3, rough: 0.12 } : undefined,
      });
      y += h; r = r1;
    }
    broken0(drums, cap);
    if (cap) {
      // Capital, as a painter draws one: no sculpted mass at all. The shaft simply ends in a short
      // flared profile - a necking ring, a plain bell, a low round abacus - turned on the shaft's own
      // axis and painted as the shaft (same stone id, same tone, the same two-tone split: it can never
      // be darker than the shaft). It is DRAWN by two broken dark strokes: one under the necking, one
      // under the abacus (stone.js: cap 2 / 3). Its top is toned as its side (mode 3), like a wall top.
      for (let i = 0; i < 28; i++) R();                           // (the random numbers the old capital used: everything after keeps its place)
      // (nothing on it is turned true: each ring sits a little out of level and out of round - tilted a
      // degree or three on the shaft, its rim rising and falling, pieces gone from both rims - so from
      // below no outline of it is an exact ellipse)
      const Rk = rng(31337);
      // (the whole capital sits 2.6 degrees out of level - one tilt for bell and abacus, a hair of their own
      // each - its section is an oval (radius * (1 + 0.04 sin(2a + phi)) plus noise), and one bite is gone
      // from the abacus rim on the limb the nave sees)
      const er = (t) => new THREE.Euler(0.035 + (Rk() - 0.5) * t * 0.4, shaftRot, -0.03 + (Rk() - 0.5) * t * 0.4);
      const co = { id: shaftId, tone: shaftTone, sides: 32, lump: 0.03, ell: 0.04, twist: 0.9, noise: 0.012, bend, seed: pa, sub: 2 };
      const nk = (n, yS, dep) => { const o = []; for (let i = 0; i < n; i++) o.push({ a: Rk() * TAU, w: 0.3 + Rk() * 0.5, y: yS, reach: 0.9 + Rk() * 0.8, depth: dep * (0.5 + Rk()), drop: 0.1 + Rk() * 0.3 }); return o; };
      b.lathe(M(x, y + 0.045, z, 1, 0.045, 1, er(0.07)), [[-1.3, r * 0.99], [-0.5, r * 1.1], [0.5, r * 1.1], [1, r * 1.0]], { ...co, capBottom: false, capTop: false, cap: 2, ringWob: 0.3, notches: nk(2, 0, 0.06) });
      b.lathe(M(x, y + 0.09 + 0.15, z, 1, 0.15, 1, er(0.04)), [[-1, r * 1.0], [-0.3, r * 1.07], [0.4, r * 1.3], [1.12, r * 1.6]],
        { ...co, capBottom: false, capTop: false, cap: 3, ringWob: 0.06, notches: [{ a: Rc() * TAU, w: 0.5, y: 0.9, reach: 0.6, depth: 0.1, drop: 0 }] });
      b.lathe(M(x, y + 0.385 + 0.075, z, 1, 0.075, 1, er(0.09)), [[-1, r * 1.62], [-0.5, r * 1.68], [0.6, r * 1.68], [1, r * 1.6]],
        { ...co, lump: 0.045, ringWob: 0.22, capLN: [0, 1, 0, 3], notches: [{ a: (Rc(), 2.5 + shaftRot), w: 0.5, y: 1, reach: 2.6, depth: 0.3, drop: 0.5 }, { a: (Rc(), -0.4 + shaftRot), w: 0.35, y: 1, reach: 1.2, depth: 0.1, drop: 0.2 }, ...nk(2, -1, 0.07), ...nk(1, 1, 0.1)] });
    }
  };
  function broken0(drums, cap) { return drums > 0 && !cap && R() < 0.6; }
  for (const [cx, cz, drums, cap, stump] of COLUMNS) column(cx, cz, drums, cap, stump);
  // fallen drums: lying half sunk in the turf, each with a broken end, some snapped short, one
  // standing on end
  for (const { x, z, ry, rz, len, sink, brk, frags } of FALLEN) {
    const g = height(x, z), lying = Math.abs(rz) > 1;
    b.setElem(x, g + 0.3, z);
    const sq = 0.9 + R() * 0.07;
    // (a lying drum is painted as ONE rounded mass, like a boulder - a light top and a shade side with
    // a brushed boundary between; no ruled band along it, no bed line, no dark slot under it)
    // Its outline is chipped all round (rims bitten, body dented: extra notches), it has NO sawn
    // fracture plane (that showed as a pale zigzag where the cut met the side), and it stands in the
    // turf: true height above the ground, so the grass fringe and the damp of the foot reach it.
    const cutO = brk ? { a: R() * TAU, slope: (0.4 + R() * 0.6) / 0.4, y0: 0.35 + R() * 0.3, rough: 0 } : { a: R() * TAU, slope: (0.12 + R() * 0.2) / 0.4, y0: 0.8 + R() * 0.15, rough: 0 };
    const extra = [];
    for (let i = 0; i < 4; i++) extra.push({ a: Rc() * TAU, w: 0.3 + Rc() * 0.5, y: Rc() < 0.5 ? 1 : -1, reach: 0.25 + Rc() * 0.45, depth: 0.08 + Rc() * 0.14, drop: 0.04 + Rc() * 0.1 });
    for (let i = 0; i < 2; i++) extra.push({ a: Rc() * TAU, w: 0.4 + Rc() * 0.5, y: (Rc() - 0.5) * 0.8, reach: 0.5 + Rc() * 0.4, depth: 0.05 + Rc() * 0.07, drop: 0 });
    // A LYING drum is sunk a third or more in the turf, squashed to an irregular oval (it is lower than it
    // is wide), with no rings or steps on it; its whole surface goes in and out on a half-metre wave and a
    // hand's wave (no clip planes: they left a planar top and ruled arrises).
    const sqV = 0.74 + (sq - 0.9) * 1.4, ca = Rd() * TAU, cb = Rd() * TAU;
    drum(M(x, g + (lying ? 0.4 * sqV : len / 2) - sink, z, lying ? sqV : 1, len / 2, lying ? 1 : sq, new THREE.Euler((R() - 0.5) * 0.14, ry, rz)), 0.4, 0.385, len / 2, {
      lump: 0.045, chips: 2, bites: 1, joints: false, lnC: lying ? [x, g + 0.05, z] : undefined, sides: 32, extra,
      cut: lying ? undefined : cutO,
      // (c14: no clip planes - they made a planar top and straight arrises; two octaves of noise instead)
      ...(lying ? { plain: true, ell: 0.09, twist: 0.7, noise: 0.08, noise2: 0.02, sub: 2, sides: 32 }
        : { ell: 0.06, noise: 0.03, sub: 2 }),
    });
    // a broken piece or two beside it
    for (const [px, pz, s] of frags)
      b.rock(R, px, height(px, pz) + s * 0.15, pz, s * 1.3, s * 0.7, s, { rot: new THREE.Euler(R() - 0.5, R() * 6, R() - 0.5), n: 5, lo: 0.58, ground: g - 0.3 });
  }

  // ---- altar at the east end, in front of the great arch: a stepped footing, a body of a few big
  // stones, and what is left of the mensa. The slab broke across: the larger part still lies on
  // the body, tilted, with a moulded under-edge; the smaller has slid off and leans against the
  // end, where the body itself has lost its upper stone.
  {
    const x = ALTAR[0], z = ALTAR[1], g = height(x, z);
    b.setElem(x, g + 0.6, z);
    const P = new THREE.Matrix4().makeRotationY(0.012).setPosition(x, g, z);
    for (const [cx, w] of [[-0.78, 1.34], [0.67, 1.56]])
      b.block(cx, 0.1 - R() * 0.04, 0, w, 0.26, 1.7 - R() * 0.1, { parent: P, tone: 0.4 + R() * 0.2, skew: wobble(R, 0.05), cap: 1, rot: new THREE.Euler((R() - 0.5) * 0.03, (R() - 0.5) * 0.03, (R() - 0.5) * 0.03),
        chips: [...worn(0.05, 0), [cx < 0 ? -1 : 1, 1, 1, 0.2 + R() * 0.3, 0.2, 0.2 + R() * 0.3], [cx < 0 ? -1 : 1, 1, -1, 0.08 + R() * 0.1, Infinity, 0.08 + R() * 0.12]] });
    // The body is coursed masonry like the walls (three courses of a few stones each, no two alike),
    // so its faces carry the wall's drawing: broken joint strokes, tone patches, the stained foot.
    // The east end has lost its upper course, and the stone left there is broken off on a slope.
    for (let i = 0; i < 90; i++) R();                             // (the old body's random numbers)
    {
      const x0 = -1.05, x1 = 1.05, hs = [0.3, 0.26, 0.24];
      let yb = 0.22;
      for (let j = 0; j < 3; j++) {
        const h = hs[j], xe = j === 2 ? 0.43 : x1;
        let u = x0;
        while (u < xe - 0.05) {
          let w = 0.34 + Rc() * 0.42; if (xe - (u + w) < 0.22) w = xe - u;
          const endE = u + w >= xe - 1e-6, endW = u === x0, top = j === 2 || (j === 1 && u + w / 2 > 0.43);
          for (const sz of [1, -1]) {
            // (two stones through the thickness, their joint off-centre; the faces differ by millimetres)
            const split = (j % 2 ? 0.1 : -0.12) + (Rc() - 0.5) * 0.1, lv = (((j + (sz > 0 ? 1 : 0)) % 2) * 2 - 1) * 0.003;
            const z0 = sz > 0 ? split : -0.5, z1 = sz > 0 ? 0.5 : split;
            const sk = wobble(Rc, top ? 0.05 : 0.012);
            if (top && endE && j === 1) { sk[2].y -= 0.3; sk[6].y -= 0.5; sk[3].y -= 0.7; sk[7].y -= 0.9; }
            const chips = [];
            if (top && Rc() < 0.6) chips.push([Rc() < 0.5 ? -1 : 1, 1, sz, 0.05 + Rc() * 0.14, 0.04 + Rc() * 0.1, 0.05 + Rc() * 0.12]);
            if ((endE || endW) && Rc() < 0.7) chips.push([endE ? 1 : -1, Rc() < 0.5 ? 1 : -1, sz, 0.03 + Rc() * 0.06, h * (0.4 + Rc() * 0.6), 0.03 + Rc() * 0.06]);
            b.block(u + w / 2, yb + h / 2, (z0 + z1) / 2, w + 0.006, h + 0.006, z1 - z0 + lv * 2, { parent: P, tone: Rc(), skew: sk, cap: top ? 1 : 0, chips, fixed: true });
          }
          u += w;
        }
        yb += h;
      }
    }
    // (the slab has no dark underside: every face of it that looks down is toned as its edge face - a
    // mensa is one pale shape on the body, not a plank with a shadow slot under it)
    const mens = { parent: P, tone: 0.75, cap: 1, ln: (fn, o) => (fn[1] < -0.1 ? [0, 0, o.z >= 0 ? 1 : -1] : undefined) };
    const under = [[0, -1, 1, Infinity, 0.09, 0.1], [0, -1, -1, Infinity, 0.07, 0.08], [-1, -1, 0, 0.1, 0.09, Infinity], [0, 1, 1, Infinity, 0.035, 0.05]];
    b.block(0.03, 1.105, 0, 2.5, 0.2, 1.3, { ...mens, skew: wobble(R, 0.05), rot: new THREE.Euler(-0.012, 0.03, 0.03), cuts: [{ n: [1, 0.15, 0.35], d: 0.2 }],
      chips: [...under, [-1, 1, 1, 0.42, Infinity, 0.3], [-1, 1, -1, 0.1, 0.12, 0.16], [-1, 1, 1, 0.7, 0.1, 0.5]] });
    b.block(1.3, 0.47, 0.06, 1.0, 0.2, 1.24, { ...mens, tone: 0.66, skew: wobble(R, 0.08), rot: new THREE.Euler(0.05, 0.12, -0.8, 'YXZ'), loose: true,
      cuts: [{ n: [-1, 0.2, -0.4], d: 0.7 }], chips: [...under.slice(0, 2), [1, 1, -1, 0.2, 0.12, 0.3], [1, 1, 1, 0.08, Infinity, 0.1], [1, -1, 1, 0.25, 0.1, 0.2]] });
    b.rock(R, -1.55, 0.1, 0.95, 0.3, 0.16, 0.24, { parent: P, rot: new THREE.Euler(0.1, 0.7, 0.1), n: 5, lo: 0.6 });
    b.rock(R, 0.78, 0.9, -0.1, 0.36, 0.2, 0.3, { parent: P, rot: new THREE.Euler(0.15, 2.2, -0.1), n: 5, lo: 0.6 });
    b.rock(R, 1.75, 0.08, -0.55, 0.26, 0.15, 0.22, { parent: P, rot: new THREE.Euler(0.2, 1.3, 0.1), n: 4, lo: 0.6 });
  }

  // ---- wayside cross on the brow of the hill, beside the path: stepped base of several stones,
  // a tapered shaft with worn arrises, slightly flared arms; the whole thing leans
  {
    const x = CROSS[0], z = CROSS[1], g = height(x, z);
    const P = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.015, 0.15, -0.02)).setPosition(x, g, z);
    b.setElem(x, g + 1.2, z);
    // steps: each of two or three stones, shifted and sunk a little
    const step = (y, size, h, parts) => {
      let u = -size / 2;
      for (let i = 0; i < parts.length; i++) {
        const w = size * parts[i];
        b.block(u + w / 2, y - R() * 0.02, (R() - 0.5) * 0.03, w + 0.004, h, size - R() * 0.05, {
          parent: P, tone: 0.35 + R() * 0.35, cap: 1, skew: wobble(R, 0.06), rot: new THREE.Euler((R() - 0.5) * 0.03, (R() - 0.5) * 0.03, (R() - 0.5) * 0.03),
          chips: [[i === 0 ? -1 : 1, 1, R() < 0.5 ? -1 : 1, 0.06 + R() * 0.16, 0.04 + R() * 0.1, 0.06 + R() * 0.16], [R() < 0.5 ? -1 : 1, 1, R() < 0.5 ? -1 : 1, 0.03 + R() * 0.04, 0.03 + R() * 0.03, Infinity]],
        });
        u += w;
      }
    };
    step(0.08, 1.5, 0.3, [0.42, 0.58]);
    step(0.34, 1.06, 0.26, [0.6, 0.4]);
    // socket stone, top edges weathered off
    b.block(0, 0.6, 0, 0.66, 0.3, 0.6, { parent: P, tone: 0.55, cap: 1, skew: wobble(R, 0.05), chips: [[1, 1, 0, 0.09, 0.1, Infinity], [-1, 1, 0, 0.07, 0.08, Infinity], [0, 1, 1, Infinity, 0.09, 0.08], [0, 1, -1, Infinity, 0.07, 0.1], [1, 1, 1, 0.14, 0.2, 0.14]] });
    // the cross itself leans away from plumb
    const L = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.045, 0, 0.075)).setPosition(0, 0.7, 0);
    const PL = P.clone().multiply(L);
    const taper = (f) => { const sk = wobble(R, 0.05); for (let k = 0; k < 8; k++) if (k & 2) { sk[k].x -= (k & 1 ? 1 : -1) * f; sk[k].z -= (k & 4 ? 1 : -1) * f; } return sk; };
    const cham = (c, c2 = c) => [[1, 0, 1, c, Infinity, c2], [-1, 0, 1, c2, Infinity, c], [1, 0, -1, c2, Infinity, c2], [-1, 0, -1, c, Infinity, c]];
    // shaft
    b.block(0, 1.02, 0, 0.36, 2.1, 0.3, { parent: PL, tone: 0.55, skew: taper(0.2), chips: [...cham(0.055, 0.07), [1, 1, -1, 0.1, 0.12, 0.1], [-1, 1, 1, 0.06, 0.07, 0.08], [0, 1, 1, Infinity, 0.05, 0.07], [-1, -1, 1, 0.07, 0.3, 0.06]] });
    // arms: a little wider at the ends, long arrises chamfered, one end broken short
    for (const sgn of [-1, 1]) {
      const len = sgn < 0 ? 0.36 : 0.44;
      const sk = wobble(R, 0.05);
      for (let k = 0; k < 8; k++) if (((k & 1) ? 1 : -1) !== sgn) sk[k].y -= ((k & 2) ? 1 : -1) * 0.14;      // inner end thinner
      const c = 0.045 + R() * 0.02;
      const chips = [[0, 1, 1, Infinity, c, c], [0, -1, 1, Infinity, c * 1.2, c], [0, 1, -1, Infinity, c, c * 1.2], [0, -1, -1, Infinity, c, c]];
      if (sgn < 0) chips.push([-1, 1, 1, 0.16, 0.2, 0.3], [-1, -1, -1, 0.08, 0.1, 0.1]);
      else chips.push([1, 1, -1, 0.06, 0.07, 0.07], [1, -1, 0, 0.05, 0.06, Infinity]);
      b.block(sgn * (0.12 + len / 2), 1.5 + sgn * 0.006, 0, len + 0.1, 0.33, 0.25, { parent: PL, tone: 0.6 + R() * 0.1, skew: sk, chips, rot: new THREE.Euler(0, 0, sgn * 0.012), fixed: true });
    }
    b.rock(R, 0.62, 0.5, 0.2, 0.2, 0.12, 0.16, { parent: P, rot: new THREE.Euler(0.2, 1, 0.1), n: 4, lo: 0.6 });
  }
  b.clearElem();

  const dw = new Builder();
  // ---- dry-stone wall following the east side of the path down the hill, with gaps
  const wallAlong = (pts, side, off, from, to) => {
    let acc = 0, curRun = -1;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
      const L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
      let s = 0;
      while (s < L) {
        const step = 0.18 + R() * 0.16;
        const d = acc + s;
        s += step;
        if (d < from || d > to) continue;
        // the top line sags and rises; in places the wall is down to a course or nothing
        const [hTop, fallen] = wallProfile(d);
        const px = ax + dx * (s - step / 2) - dz * side * off, pz = az + dz * (s - step / 2) + dx * side * off;
        const g = height(px, pz);
        // one element per 6 m run of wall (centre = the middle of the run)
        const run = Math.floor(d / 6);
        if (run !== curRun) { curRun = run; const k = Math.min(L - s, 3); const ex = px + dx * k, ez = pz + dz * k; dw.setElem(ex, height(ex, ez) + 0.25, ez); }
        let y = g - 0.06;
        while (y - g < hTop - 0.05) {
          const h = 0.09 + R() * 0.08;
          const top = y - g + h > hTop - 0.1;
          dw.block(px + (R() - 0.5) * 0.06, y + h / 2, pz + (R() - 0.5) * 0.06, step * (0.95 + R() * 0.3), h, 0.34 + R() * 0.1, {
            tone: R(), cap: top ? 1 : 0, skew: wobble(R, 0.22), loose: true,
            // one tone per side of the wall and one for its top, whatever way each stone lies
            lnW: (pos, nn) => { if (nn.y > 0.5) return [-dz, 0, dx, 3]; const sg = nn.x * -dz + nn.z * dx >= 0 ? 1 : -1; return [-dz * sg, 0, dx * sg, 1]; },
            rot: new THREE.Euler((R() - 0.5) * 0.06, Math.atan2(-dz, dx) + (R() - 0.5) * 0.35, (R() - 0.5) * (top ? 0.12 : 0.05)),
          });
          y += h * 0.95;
        }
        // tumbled stones beside the collapsed stretches
        if (fallen > 0.6 && R() < 0.5) {
          const ox = px + (R() - 0.5) * 1.6, oz = pz + (R() - 0.5) * 1.6, sz = 0.14 + R() * 0.2;
          dw.block(ox, height(ox, oz) + sz * 0.25, oz, sz * 1.3, sz * 0.6, sz, { tone: R(), cap: 1, skew: wobble(R, 0.3), rot: new THREE.Euler(R() - 0.5, R() * 6, R() - 0.5) });
        }
      }
      acc += L;
    }
  };
  wallAlong(PATH, -1, WALL.off, WALL.from, WALL.to);
  const prunedDry = dw.prune();
  const dry = new THREE.Mesh(dw.geometry(), stoneMaterial({ lit: 0xdcdac9, mossAmt: 0.45, joint: 0.5, foot: 0.25 }));
  dry.userData.pruned = prunedDry;
  dry.userData.shadowMat = stoneShadow();
  dry.frustumCulled = false;
  scene.add(dry);
  stonePrepass(scene, dry);
  scene.add(snowCaps(dry));

  const prunedStone = b.prune();
  const stone = new THREE.Mesh(b.geometry(), stoneMaterial({ foot: 0.45 }));
  stone.userData.pruned = prunedStone;
  stone.userData.shadowMat = stoneShadow();
  stone.frustumCulled = false;
  scene.add(stone);
  stonePrepass(scene, stone);
  scene.add(snowCaps(stone));

  // ---- old fence posts with a sagging rail, west of the path lower down
  const w = new Builder();
  const posts = [];
  for (let i = 0; i < FENCE.n; i++) {
    const [px, pz, dx, dz] = alongPath(FENCE.from + i * FENCE.step);
    const x = px + dz * FENCE.off, z = pz - dx * FENCE.off, g = height(x, z);
    if (i === FENCE.missing) { posts.push(null); continue; }           // one post missing
    const h = 1.0 + R() * 0.25;
    w.setElem(x, g + 0.5, z);
    w.block(x, g + h / 2 - 0.1, z, 0.13, h, 0.13, { tone: R(), skew: wobble(R, 0.25), rot: new THREE.Euler((R() - 0.5) * 0.16, R() * 3, (R() - 0.5) * 0.16), line: 1 });
    posts.push([x, g + h * 0.72, z]);
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], c = posts[i + 1];
    if (!a || !c) continue;
    const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 0.03, (a[2] + c[2]) / 2];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const rot = new THREE.Euler(0, Math.atan2(-(c[2] - a[2]), c[0] - a[0]), Math.asin((c[1] - a[1]) / L), 'YXZ');
    w.setElem(mid[0], mid[1] - 0.3, mid[2]);
    w.block(mid[0], mid[1], mid[2], L + 0.2, 0.07, 0.05, { tone: R(), rot, skew: wobble(R, 0.2), line: 1 });
  }
  const wood = new THREE.Mesh(w.geometry(), stoneMaterial({ lit: 0xb7a184, shadeLo: 0x6b5d68, shadeMid: 0x62596a, shadeHi: 0x5d566a, deep: 0x443c4e, moss: 0xb0c078, mossShade: 0x52706a, jointLit: 0x8a7462, jointShade: 0x4a4254, warm: 0.4, mossAmt: 0.2, joint: 0, foot: 0.3 }));
  wood.userData.shadowMat = stoneShadow();
  wood.frustumCulled = false;
  scene.add(wood);
}
