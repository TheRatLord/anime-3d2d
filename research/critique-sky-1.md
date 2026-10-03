# Sky critique 1 (independent)

Scope: `src/sky.js` (wash) + `src/extra/sky-clouds.js` (26 cloud cards). Nothing in `src/` was edited.
Renders were made in `.work/skycrit/` (shots in `.work/skycrit/shots/`, montages and crops in `.work/skycrit/m/`).
Score scale: 0-10 against the sky of a real Frieren painted background (10 = would pass paused in an episode).

**Mean over 103 scored views: 6.3.** By group: named views 7.3, ring pitch 5 deg 6.3, ring pitch 25 deg 6.5,
ring pitch 50 deg 4.7, straight up 2.9, fov 70 wides 5.8, fov 14 close-ups 5.8.

One-line verdict: the wash is close to on-model (8-8.5) and the clear sector behind the chapel is the best sky in
the scene. Every point lost is lost to the clouds: there are too many of them, the high families (tops, veils)
fail outright, and the calm-sector erosion leaves debris.

---

## 0. What was and was not opened

Opened at full size with the Read tool (1280x720 unless noted):

- Refs: `ac12`, `ac13`, `ac7`, `ac10`, `sheet.jpg`.
- Named views (30): hero, front, inside, westwall, low, tree, under, treeW2, treeN, frame, back, high (no sky),
  vista, farN, farNE, farE, farSE, farS, farSW, farW, farNW, mtN, mtW, mtE, birds, village, castle, hillSW,
  plainSE, stepA, pathback, southfar, rim, rimE, lowN, hillW, hillN, skyUp.
- Ring pitch 5 deg, fov 40: all 12 azimuths.
- Ring pitch 25 deg: az 30, 0, 120, 150, -180, -90.
- fov 14 close-ups: heapA crown, heapA base, heapB interior, heapC, heapE, heapE base, heapF, puffA, puffB, puffC,
  rowA, rowB, rowC, veilA, veilC, topA, topB, horizon N, horizon S.
- fov 70: w15 at az 90, 150, 30, -90; w45 at az 30, 150; `wup` (pitch 80); straight up fov 70.
- Silhouettes: all 8 (`sil-*`).
- Atlas: `cels.png` (1920x2520, shown downscaled 0.79x), `celsbig.png`, `celsbig2.png` (2560x1440, downscaled 0.78x).
- 1080p: native crops of calm10 and e20; contrast-stretched calm10 and calm40; z75 and s50 downscaled to 1600 px.

Seen only in reduced montages (not full size): ring pitch 25 deg az -150, -120, -60, -30, 60, 90; all 12 of ring
pitch 50 deg; the three tilt series (18 frames); named stepB, haloN, walkW, walkE, doorout, drift, driftE, meadow,
treesW, out0-out315, leaf3m; close-ups heapB crown, puffD, rowC2, rowA2, rowC3, rowB2, veilB, veilA2, veilB2,
horizon NW/E/W/SE/NE, up50; the yaw and time pairs (also compared numerically).

Not opened at all: `ring-upB`, `wide-w15_-150`, `wide-w15_-30`, `wide-w45_-150/-90/-30/90`, `hd-s50` at native
size, `time-tr-*`, `time-tw-*`, `time-tm-t3.5/t4/t13` (numeric diff only), `yaw-y2`, `yaw-v*` at full size, refs other
than the five above. No web search was done: calibration rests on the boards and on `sky-research.md`.

Measurements (node + ffmpeg, `.work/skycrit/m/stat.mjs`, `shift.mjs`):

- Wash column, calm sector, level 1080p frame: top `#74C4ED`, then `#7DCAF0`, `#8DD1F2`, `#9FD9F5`, `#BAE4F7`,
  `#C7DFE3` at the ridge. Looking 40 deg up: `#67B9E7` to `#78C7EF`. Pitch 75: `#5EB3E5`-`#66B8E8`. These match
  the research stops to within a few code values.
- Fine grain (5x5 high-pass sd): 0.97-1.10. On target.
- Broad unevenness along a row of constant elevation: sd 1.0-2.9, peak-to-peak 9-19 code values (4-8%) between
  8 and 15 deg of elevation. Research asks for "a few percent, below the level at which it reads as cloud".
- Stability: yaw 0.3 and 0.9 deg at fov 14 registers as a pure shift (residual 1.6-1.9 code values = grain).
  Time 3 s to 63 s registers as a pure 123 px shift at fov 14 (residual 3.0). No boiling, no swimming, no
  shape change. Drift is 2 px/s at the long lens.

---

## 1. Per-view scores

### Named views

| View | Score | Note |
|---|---|---|
| hero | 8.5 | clean wash, chapel against plain sky; on-model |
| front | 8.5 | same |
| inside | 8.5 | sky through arches is flat saturated blue, correct |
| low | 8.5 | |
| frame | 8 | |
| pathback | 8.5 | |
| southfar | 8.5 | best gradient in a named view |
| stepA | 8.5 | |
| tree | 8 | one soft lighter ledge at about 10 deg left of the tree (y 270-290) |
| farN | 8.5 | |
| mtN | 8 | at fov 14 the wash is a smooth gradient with grain; no brush shape left |
| mtE | 8 | |
| hillW / hillN | 8 / 8 | little sky |
| under / skyUp | 8 / 8 | zenith wash through leaves is good; no card in frame |
| lowN | 7 | two level darker streaks across the full width (y 60-130, y 190) read as stripes |
| vista | 7.5 | faint rows, quiet |
| plainSE / hillSW | 7.5 / 7.5 | hazy rows behind the ranges work |
| rim / rimE | 7.5 / 7.5 | heap cropped by the top corner: the right idea |
| castle | 7 | ghost smudge above the mountain at (460, 90) |
| village | 7 | rows are airbrushed ghosts at fov 14 |
| farE | 7 | heapA carries it; three white specks top left |
| farNE | 6.5 | heapA good; white speck trio at (525, 158) |
| farNW | 6.5 | torn remnant at (100, 130) |
| westwall | 6.5 | two white dots right of the trunk (890, 165), (960, 178) |
| treeW2 | 6.5 | isolated blob at left edge, smudge at (930, 380) |
| treeN | 6.5 | wispy pair at right, puff peeking round the trunk |
| back | 6.5 | a puff sits framed inside the arch opening and competes with it |
| farSE | 6 | two emoji puffs in open sky, even spacing |
| farS | 6 | centre puff + triplet row + two vertical smudges |
| birds | 6 | puff with sponge edge, smear at (440, 120) |
| mtW | 6 | fov 14: clouds are Gaussian blobs |
| farW | 5.5 | peanut (heapF), smudges at (190, 130), (380, 160) |
| farSW | 5 | about ten objects in the sky: two heaps, puff, two rows, three smudges, birds |

### Ring, fov 40

| az | pitch 5 | pitch 25 | pitch 50 |
|---|---|---|---|
| -180 | 5.5 peanut + 3 smudges + rows | 6 | 4.5 veil worms |
| -150 | 6.5 remnant at (300, 205) | 6.5 | 4.5 |
| -120 | 7.5 blotchy streaks in wash | 8 | 6.5 |
| -90 | 7.5 same | 7.5 | 6.5 |
| -60 | 6.5 speck trio | 6.5 | 6.5 |
| -30 | 7 heapA good; specks; ghosts | 6.5 | 5 |
| 0 | 6.5 | 6.5 | 3 topA cut-out |
| 30 | 7 | 6 heapB "slipper", scraps | 3 topA |
| 60 | 6 even scatter of 5 | 6 | 3.5 |
| 90 | 5.5 heapC "glove", 6 small clouds | 6 | 4.5 |
| 120 | 5.5 crowded | 6.5 heapE best cloud | 4.5 |
| 150 | 5 two heaps side by side + 3 smudges | 6 | 4.5 |

### Up, wide, long lens

| View | Score | Note |
|---|---|---|
| straight up fov 70 / fov 50 | 3 / 3 | island maps and finger smears |
| `wup` (pitch 80, fov 70) | 2.5 | topA and topB both in frame, heart-shaped scrap twice |
| 1080p pitch 75 | 3 | a "question mark" island |
| w15 az -90 | 8.5 | the best sky frame: reads like `ac12` |
| w15 az 30 | 6.5 | |
| w15 az 90 / 150 | 5.5 / 5.5 | 8-9 clouds evenly scattered |
| w45 az 30 | 3.5 | topA + heart |
| w45 az 150 | 5 | veil smears over a row of four heaps |
| fov 14: heapA crown / base | 7 / 6.5 | |
| fov 14: heapB / heapC / heapE / heapE base / heapF | 6 / 6 / 6.5 / 6.5 / 5.5 | |
| fov 14: puffA / puffB / puffC | 7 / 2 / 4 | B and C are calm-sector debris |
| fov 14: rowA / rowB / rowC | 7 / 7 / 7.5 | |
| fov 14: veilA / veilC | 5 / 5 | invisible mottling at this lens |
| fov 14: topA / topB | 2 / 2.5 | |
| fov 14: horizon N / S | 8.5 / 8 | band, haze and ranges belong together |

---

## 2. Per-cel scores (atlas)

| Cel | Score | What is wrong |
|---|---|---|
| heapA | 6.5 | good dome; lee tail droops into a hanging hook |
| heapB | 5.5 | twin domes with a V notch = rabbit ears; "water ripple" lozenges on the left third |
| heapC | 5.5 | knob + long tail = fist / glove; interior shade is a heart-shaped wedge |
| heapD | 6 | plain low loaf; **not placed anywhere** |
| heapE | 7 | best silhouette; interior passage is a clean arc ("eyebrow") |
| heapF | 4.5 | two blobs and a bridge = peanut; arc passage again |
| puffA | 7 | believable |
| puffB | 6 (2 as placed) | brick-like body; eroded to dots by the calm sector |
| puffC | 5.5 (4 as placed) | same |
| puffD | 6.5 | |
| rowA / rowB / rowC | 6.5 / 6 / 6 | dots on a line; always three of similar size at similar gaps |
| flatA / flatB | 6.5 / 6.5 | usable dry streaks; **not placed anywhere** |
| veilA / veilB / veilC | 3.5 / 3.5 / 4 | curdled blotches, not strokes; curved |
| topA | 2 | dumbbell with hard edge, heart scrap, lower-right scrap **cut by the cell border** |
| topB | 2.5 | animal-with-legs outline; hard-edged pale slab inside; scrap with a hole |
| scrapA | 5.5 | not placed |

Shared by every heap: dome at the windward end, tail falling away to lee, a scrap hanging below the lee end and
one below the windward end. Six heaps, one template. Seen two at a time (az 120-170) it reads as a stamp.

---

## 3. Ranked faults

### 1. Tops seen from below are cut-out islands (worst)

- Views: straight up, `wup`, ring pitch 50 az 0/30/60/-180, w45 az 30, 1080p pitch 75, tilt series at 60-75 deg.
- The eye catches: a crisp white map of islands; a literal heart (topA's left satellite); a pig/sheep outline with
  legs; a pale-blue slab with a ruled edge inside topB; one scrap of topA ending on a straight horizontal line.
- Cause: `softAll = 0.3` gives a firm edge all round; satellites `add(x +- r*1.6, y +- r*0.85, r*0.45)` and the
  two `front` circles make lobes that read as limbs; `L = 0.72 - ul*0.42 - vt*0.12` with a `front` ring crosses the
  `lit` threshold as one sharp contour; scraps at `y = +-(0.5..0.62)` are outside `top/bot`, so `sc` does not
  account for them and they hit the cell edge.
- Fix:
  1. Remove both placements (`topA` az 40 el 63, `topB` az -165 el 76) now. Nothing in the references looks up
     at cumulus, and the zenith wash alone scores 8.
  2. If a high cloud is wanted, place `heapD` or `heapE` at el 55-60, `w: 30`, `op: 0.55`, `soft: 0.8`, `wide: 2.5`,
     off the hero axis (az 60). A soft pale mass, cropped by the frame in most views.
  3. If the `top` kind is kept: `softAll = 0.85`; no `front` circles; no satellites; `L` constant 0.55 (one value);
     include scraps in the bounds (`top = max(top, c[1]+c[2])`, `bot = min(bot, c[1]-c[2])`) and in `half`.
  4. Add a guard for every cel: after baking, assert `f < 0` on the outer 3 texels of each cell.

### 2. Veils read as finger smears and worms

- Views: every pitch 50 frame outside the calm sector, w45 az 150, `wup`, up70, tilt B at 45-60 deg (veilC sits
  over the chapel at el 63: the calm sector does not apply above `c.y` 0.6-0.8), 1080p az 100 pitch 50 (a "Y").
- The eye catches: pale curved streaks with blobby heads, each on its own heading, like a wiped window. At fov 14
  they vanish into mottling, so they add nothing at the long lens and hurt at the normal one.
- Cause: `lift * t^3` curves each stroke; per-stroke heading `th` +-14 deg; gaps; `wide: 4` blurs them into tubes.
- Fix: delete all five veil cards. The research (1.7) already said high cirrus is absent at midday. Let the wash's
  `hi` passes carry "something up there": raise `(hi.g - 0.5) * 0.034` to `0.045` above 45 deg only. If one veil
  must stay: one card, az 150 el 48, `w: 60`, `op: 0.16`, all strokes parallel (`th = 0.12` fixed), `lift = 0`,
  no gaps, `r0` 0.03-0.05, length 1.6-2.2.

### 3. Calm-sector erosion leaves white debris

- Views: farNE, farE, westwall, ring pitch 5/25 az -60 and -30 (puffB at az -39), farNW, ring az -150/-180
  (puffC at az -168), castle and ring az -30 (ghost above the mountain), treeW2.
- The eye catches: two or three hard white dots in clean sky, like specks on the cel. At fov 14 puffB is a
  bowling pin and three crumbs.
- Cause: `d = k.r + nz*S*amp - calm*0.75` raises the threshold, but `nz` is larger than what is left of the
  distance field, so the cloud breaks into noise islands with firm edges. `CALM.outer = 80` reaches az -24 and
  -184, which catches both echo puffs. With drift (0.04 deg/s) every card passes through this state.
- Fix:
  1. Do not erode through the threshold. Compute `cover` without `calm`; then
     `alpha *= 1.0 - smoothstep(0.0, 0.45, calm)` and widen the edge with it (`w *= 1.0 + 3.0 * calm`), so the cloud
     thins and softens as a whole. Cull at `calm > 0.45` instead of 0.62.
  2. `CALM = { az: -104, inner: 34, outer: 62 }`.
  3. Move puffB to az -20 el 11, puffC to az 176 el 13 (both clear of the sector at start-up).

### 4. Too many clouds, scattered evenly

- Views: farSW (10 objects), farS, farSE, ring pitch 5 az 60-180, w15 az 90 and 150, treeN.
- The eye catches: a cloud every 10-15 deg of azimuth at three tiers (heaps at 17-28, puffs at 11-13, rows at
  4-9), similar gaps, similar sizes within a tier. Reads as wallpaper. The references: 3 of 3 clear boards empty;
  the one cloudy still is "one mass, one echo, one whisper" with over half the sky empty.
- Fix: cut from 19 low/mid cards to 9, in two groups, and leave az 60-125 empty as a second rest:

```js
// east group
{ az: -12, el: 17,  w: 30, cel: 'heapA' },
{ az: -24, el: 10.5, w: 7, cel: 'puffB', op: 0.8 },
{ az: 14,  el: 6.2, w: 20, cel: 'flatA', op: 0.7, drift: 0.5 },
{ az: 36,  el: 27,  w: 27, cel: 'heapB', roll: 3 },        // only if heapB is redrawn (fault 7), else drop
// south-west group
{ az: 140, el: 22,  w: 32, cel: 'heapE', roll: 2 },
{ az: 163, el: 12,  w: 7,  cel: 'puffA', op: 0.8 },
{ az: 128, el: 6.5, w: 18, cel: 'rowA', op: 0.8, drift: 0.5, mirror: true },
{ az: 176, el: 5,   w: 16, cel: 'flatB', op: 0.65, drift: 0.5 },
// one whisper over the plain
{ az: 84,  el: 6,   w: 20, cel: 'rowB', op: 0.75, drift: 0.5 },
```

  Removed: heapC (az 92), heapF (az 171), puffD, both puffC cards, rowC x3, rowA at az 22, rowB at az 178.
  Rule to hold: no more than one heap in any 54 deg frame, no two heaps at the same elevation within 60 deg.

### 5. Scraps: vertical smudges under every heap, and the drooping-tail stamp

- Views: farW (190, 130), farS (365, 100), (745, 85), farSW (435, 90), (925, 110), (1110, 110), ring pitch 5 az 0,
  150, -180, ring pitch 25 az 30 (570, 425), (830, 410), birds (440, 120).
- The eye catches: small upright dirty-white smears, two or three per heap, at the same offsets under each one;
  and on the atlas sheet every heap ends in the same downward hook.
- Cause: `scraps` at `y = -0.1 .. -0.28` with `so = 1` (maximum softness) and radius 0.04-0.09; the lee one is
  always at `lee + 0.05 .. 0.35`, the "below the big lobe" one always present on large heaps.
- Fix: large heaps get 0 or 1 scrap (`R() < 0.5`), never the one under the big lobe; place it level with the
  shelf (`y = 0.02 .. 0.12`), stretched 2.5:1 horizontally (two overlapping circles), not below the base. Shelf
  circles rise instead of fall: `y = 0.10 + k*0.03`. Mirror the template for half the cels (tail to windward on
  heapB and heapD) so the family is not one shape.

### 6. Interior passages betray circles; hard slab in topB

- Views: heapE (fov 14 and ring pitch 25 az 120/150: a clean arc across the middle), heapF (arc), heapC (heart
  wedge), heapB (grey disc with a sharp right edge), topB (ruled pale slab).
- The eye catches: a drawn crescent, the same radius as a lobe. Research 1.4: interiors are "two or three broad,
  very soft darker passages", no contours.
- Fix: in the `front` loop use amplitude 0.28 instead of 0.5 and multiply by a broken mask
  (`sst(0.35, 0.65, fbm(u*3 + seed, v*3, 2))`) so only a third of each ring survives; blur `lig` with radius 5
  (two passes) instead of 2; in the shader widen `lit` to `smoothstep(0.25, 0.80, ...)` and narrow `body` to
  `mix(0.58, 0.84, lit)` (research: lit-to-shade difference 5-8% in value; ours is nearer 15%).

### 7. Silhouettes that read as objects

- heapF = peanut (farW, ring az -180 and 150). heapB = rabbit ears / slipper (ring pitch 25 az 30, yaw sweep).
  heapC = fist with a thumb (ring pitch 5 az 90). puffs at fov 40+ = emoji clouds (farSE, farS): three bumps on a
  flat-ish base, high contrast against the saturated wash at 11-13 deg.
- Fix: heapF: drop the bridge, make it one mass: `p: [[-0.8,0.2,0.5],[-0.45,0.38,0.62],[0.0,0.3,0.55],[0.4,0.22,0.5],[0.75,0.15,0.45]]`.
  heapB: fill the saddle (`[0.2, 0.3, 0.5]` to `[0.12, 0.38, 0.55]`) and lower the second dome to 0.3. heapC: lift
  0.95 to 0.7 and overlap the next lobe (`[-0.05, 0.3, 0.6]` to `[-0.15, 0.36, 0.62]`). Rule from research 1.4:
  lobes overlap by more than half, one dominant mass, shallow scallops. Puffs: `op` 0.7, `soft: 0.45`, and never
  alone in the middle of a frame; an echo sits within 12-15 deg of its mass.

### 8. Edge width is fixed in sky angle, so the look changes with the lens

- Views: mtW, village, cu-rowA (fov 14: 20-30 px Gaussian feather, "CG soft blob"); w15 az 90, farSE (fov 40-70:
  crisp sticker). At fov 14 heap crowns are acceptable only because the noise breaks them.
- Fix: bound the threshold width in pixels. With `fw = fwidth(k.r)`:
  `float wc = clamp(w, 1.5 * fw, 6.0 * fw);` on the crown (soft < 0.3), `clamp(w, 3.0 * fw, 28.0 * fw)` on the
  base, blended by `soft`. Scale the fine noise term the same way (`min(amp, 10.0 * fw / S)`). The dabbed crown
  then stays 2-6 px at any lens, which is the measured 0.3-0.6% of frame width.

### 9. Dry-brush term makes water ripples

- Views: heapB left third (fov 14, yaw sweep), heapC tail, heapA left wing, topA right edge.
- The eye catches: horizontal lozenges of sky inside the cloud, like sun on water, at one scale.
- Fix: sample the stroke channel stretched along the cloud's lean (`vLocal.zw * vec2(0.35, 2.2)` rotated 12 deg),
  confine `dryb` to the outer 0.6 deg (`2.2 * S * amp` to `0.9 * S * amp`), strength 0.5 to 0.3; none on crowns
  (`* smoothstep(0.3, 0.7, soft)`).

### 10. Wash: slightly dirty between 8 and 20 deg; level stripes

- Views: ring pitch 5 az -120/-90, lowN, tree, farNW top, 1080p calm10 stretched.
- The eye catches: darker blotches 5-10 deg across and two level streaks. No banding or quantisation anywhere
  (checked at 1080p, native and contrast-stretched), no seam, no pole. But `ac12` and `ac13` are cleaner: one
  even pass with faint long diagonals.
- Fix: `pass.g` 0.024 to 0.012 and `pass.r` 0.03 to 0.018 (the azimuth/elevation layer is what makes level
  stripes); `broad.g` upper 0.040 to 0.026; stretch `broad` (`vec2(0.075, 0.26)` to `vec2(0.05, 0.30)`) so marks
  are longer and fewer. Target peak-to-peak along a row under 8 code values.

### 11. Rows are always three dots

- Views: farS, farSW, ring pitch 5 az 30-180, cu-puffA (bottom).
- Fix: in `row`, sizes `1, 0.55, 0.3` with gaps `0.1, 0.35`; join the first two with a low bridge so the group is
  one long shape plus one scrap. Use the unused `flatA`/`flatB` for half the horizon cards (done in fault 4).

### 12. Tilted-up frames are flat

- Views: tilt series at 30-45 deg in the calm sector, hd calm40 (`#67B9E7` to `#78C7EF` over the whole frame).
- It is quiet and inoffensive (6.5), but a painter gives each frame the full range. Optional: the
  `uPitchBias = -0.35 * sin(pitch)` idea from research 3.6, behind a flag.

### 13. Clouds touching silhouettes

- Views: back (puff centred in the arch), sil-stoneE (heapA's crown just clears the wall notch at (600, 185)),
  sil-stoneSE (puff tangent to the wall top), treeN.
- Unavoidable with a free camera, but fewer and larger clouds (fault 4) cut the odds; small bright puffs are
  the ones that read as objects placed on the masonry.

### 14. Does the sky belong to the landscape?

- Palette: yes. Horizon band, haze and far ranges are the strongest part (8-8.5); wash hue and value match.
- Edge language: partly. Trees, stone and far hills are hard-edged flat shapes with no grain; clouds are
  soft, noisy and airbrushed. Soft is on-model for Frieren cumulus, but there is no firm dabbed stroke
  anywhere on a crown to tie it to the foliage. Fault 8's pixel-bounded crown edge is the fix.
- Level of detail: clouds at fov 14 show more internal texture (facets, ripples) than the hills beside them.

### 15. Card artefacts

- Found: one cell-border cut (topA lower-right scrap, visible in `celsbig2`). Nothing else: no quad edges, no
  rotation with tilt, no curved bases, no pole, no popping across yaw or time.

---

## 4. Best and worst

Best:

1. `wide-w15_-90` (fov 70, calm sector) 8.5: full gradient, white band into pale ranges, nothing else.
2. hero / front / southfar 8.5.
3. Best cloudy frame: `ring-r25_120` (heapE) 6.5 and `cu-puffA` 7; best horizon: `cu-hzN` 8.5.

Worst:

1. `wide-wup` / straight up 2.5-3 (islands, heart, smears).
2. `wide-w45_30` and ring pitch 50 az 0/30 3-3.5 (topA cut-out over veils).
3. `cu-puffB` 2 (calm debris), then farSW 5 (clutter).

What takes the best (hero / w15_-90) to 9.5:

- Wash mottling halved and lengthened (fault 10) so the sky reads as one pass of a wide brush.
- A hint more colour at the very bottom: the boards end on `#F1FFFE` (cyan-green white); ours passes through
  `#C7DFE3` at the ridge, slightly grey. Lift the 0-2 deg stop's green by 2-3 code values after bloom.
- One whisper only, cropped by a top corner on the side away from the chapel (heapA already does this in rim
  and rimE; keep it out of hero).
- The gable must never meet a cloud: after the calm fix (fault 3) check hero at t = 0, 600, 1800, 3600 s.
