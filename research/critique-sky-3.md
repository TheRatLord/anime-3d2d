# Sky critique 3 (independent, same view set and method as critiques 1 and 2)

Scope: `src/sky.js` + `src/extra/sky-clouds.js`, current main build. Nothing in `src/` was edited.
Renders: `.work/skycrit/shots/` (round 1 in `shots-c1/`, round 2 in `shots-c2/`), montages and crops in `.work/skycrit/m/`.
Scale: 0-10 against the sky of a real Frieren painted background.

## 0. Result

| Group | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| Named views (37) | 7.3 | 7.8 | **8.1** |
| Ring pitch 5 deg | 6.3 | 7.5 | **8.0** |
| Ring pitch 25 deg | 6.5 | 7.0 | **7.6** |
| Ring pitch 50 deg | 4.7 | 7.5 | **7.4** |
| Straight up | 2.9 | 7.0 | **7.0** |
| fov 70 wides | 5.8 | 7.1 | **7.7** |
| **These 83 views** | 6.4 | 7.5 | **7.8** |
| fov 14 frames that contain a cloud | 5.5 | 5.7 | **6.1** (16 frames) |
| Heaps at fov 40 | 5-6.5 | 5-6.5 | **6.5-7** |

Not comparable this round: the "same 19 fov 14 directions" group of critique 2 (7.4). Fifteen of those directions
are now empty wash and were not re-rendered; the close-ups were re-aimed at the seven placed cards instead.

This is the first round in which the clouds themselves improved. The heaps moved from airbrush to a flat
two-tone cut-paper construction that sits in the same picture as the trees and mountains at fov 32-70. What
holds them at 6.5-7 is now three specific things: the base, the tail, and the scale of the dab at the long lens.

Claims checked:

| Claim | Verdict |
|---|---|
| Two flat tones of one white, 1 px cut edge chewed by the dab field | True on the crown and on front-heap crowns. The second tone is not flat: it is a gradient (see ruling a). |
| 6-9 proud unequal scallops per lobe with sky bites | Partly. 5-8 bumps per heap, visibly unequal on heapE and heapG; heapA still reads as one knob plus shoulders. Bites exist. |
| Interior = front heaps with scalloped crown as found edge, thin white behind fading as lost edge | True, and it works. |
| Base eaten toward a level line, wide wet ramp, horizontal dry streaks | Level: roughly. It is a smooth sine-like wave with a uniform 6-10 px blur. Dry streaks barely visible. |
| No detached ellipse, no bead tail (one tapering shelf) | True. But the shelf is a block of ruled parallel lines. |
| Puffs = three overlapping heaps on a level line | True in the bake; the result reads as one slab with a notch. |
| Rows softness >= 0.6; below 9 deg everything soft and faded | True. |
| 7 cards as listed | True. |
| Sway +-5 deg, 48 min period, layout holds | True. Hero clean at t = 0, 720, 1440, 2160 s; heapE frame holds its composition. |
| Upper wash given a trace of hand | Not visible at normal contrast (row sd 1.0-1.1, range 5-7 code values, as before). |

---

## 1. What was and was not opened

Opened at full size (1280x720 unless noted):

- Named (16): hero, farE, farNE, farSE, farS, farSW, farW, farNW, back, treeW2, treeN, birds, rim, rimE, castle,
  westwall.
- fov 40 portraits of each placed heap: heapA, heapE, heapG, heapA+puffB.
- fov 14: heapA crown, base, lee, windward tail; heapE mid, base, crown, lee tail, windward; heapG crown, base, mid;
  puffB; flatA; rowA; flatB.
- Ring pitch 25: az 0, -30, 90, 120, 150. Ring pitch 5: az -30, 0, 120, 150.
- fov 70: w15 at az -90, -30, 30, 90, 150; w45 at az 30, 90, 150; `wup`.
- Lens series from the ground: wall + heapA at fov 14, 32, 54, 70; tree + heapE at fov 14, 32, 54, 70; treeUp;
  far-wood, sky and mountain crops at fov 14 (`wood14`, `woodSW14`, `mtn14`).
- Atlas: `cels.png` (9 cels, full size), `celsbig`, `celsbig2` (2560x1440 shown at 0.78x).
- Edge comparison sheet `m/edges.png` (16 crops at 4x, nearest-neighbour), pan pair crop, zoom quad, sway quads.

Seen only in reduced montages: all three ring montages (the other 27 ring frames), tilt series C and D,
20 named views (front, inside, low, tree, under, frame, stepA, pathback, southfar, farN, mtN, mtE, mtW, vista,
village, lowN, skyUp, plainSE, hillSW, hillW) plus stepB, haloN, walkW, walkE, doorout, drift, driftE, meadow,
hillN; hero and heapE frame at four times.

Not opened: tilt series A and B, `ring-up50/up70/upB` at full size, `wide-w15_-150`, `wide-w45_-150/-90/-30`,
all five `hd-*`, `sil-gableUp`, `sil-treeS`, `cu-hz*`, individual pan and zoom frames (48 + 24; judged
numerically, with one pan pair and four zoom frames viewed as crops), `time-*` other than the two montages,
named out0-out315, leaf3m, close, high. One of my pan crops (`m/panb01.png`) missed the cloud and shows only sky;
the fov 40 pan is therefore judged from numbers alone. No real-time video. No web search.

---

## 2. Rulings

### (a) Heaps: painted cumulus in this picture's hand? At fov 32-70 nearly (6.5-7). At fov 14 not yet (5-6.5).

What is now right:

- **Crown.** A cut edge with irregular steps, notches and overhangs (`cu-E40`, `ring-r25_150`, `sil-treeSW14`).
  It no longer reads as a vector path. heapE has a dominant dome, two secondary lobes and a shoulder, sizes
  clearly unequal.
- **Interior.** The front-heap crown as a found edge with thinner white behind it is the single best change:
  it gives overlap and depth with two values, and the value step is small (`cu-heapAlee`, `cu-heapEwind`).

What is still wrong (the agent's flags, each confirmed or adjusted):

| Flag | Verdict |
|---|---|
| Base is a smooth wavy blurred boundary | Confirmed, and it is the worst part. A sine wave of 3-4 humps with one uniform Gaussian blur (`cu-heapAbase`, `cu-heapEbase`, `cu-heapGbase` 4.5). Smooth outline + soft edge on a body whose top is cut = two languages in one cloud. In level frames heapG shows only this (`ring-r25_90`, `w15_90`, `farSW`, `farW`, `rim`). |
| Tail dry-brush lines read as speed lines | Confirmed. A rectangular block of 15-25 ruled parallel lines with a square end (`cu-heapAwind`, `cu-heapElee`, `farNE`, `w45_30`). Reads as motion blur or a comb, on all three heaps, same side, same angle. |
| Dab hooks / slivers on the crown at fov 14 | Confirmed: fish-hook overhangs, sky slivers 2-3 px wide, a few detached crumbs and enclosed sky holes (`cu-heapGcrown`, `cu-heapEcrown`, `cu-heapAcrown` top right). The dab is fixed at a quarter degree, i.e. about 23 px at fov 14 against 5 px at fov 54. |
| Thin white reaching the dome top | Confirmed. The shade tone runs up to the cut crown on heapA and heapG, so the highest, most sunlit lobe is the dimmer one (`cu-A40`, `cu-G40`). |
| Similar front-heap builds | Confirmed. Each heap is "back mass + one three-bump front heap right of centre + tail to windward". Seen two at a time it is a formula. |
| rowA weakest | Disagree. rowA is two soft domes, bland but harmless (6-6.5). The weakest placed element is the heap base, then the tail, then puffB. |

Additional:

- The shade tone is a gradient, not a flat tone (`cu-heapEcrown`, `cu-heapE`): broad soft diagonal bands inside
  it. The claim is "two flat tones"; the second is still airbrushed, only bounded by a cut edge on one side.
- heapA's right end is a near-vertical straight cut 80 px tall at fov 40 (`ring-r25_0`, `treeW2`, `cu-A40`).
- puffB: flat slab with one step, reads as a tank / anvil (`cu-puffB`, `farE`, `w15_-30`).
- Whole heaps floating mid-frame at fov 40-70 still read "storybook" (`w15_150`, `ring-r25_150`), though now a
  well-drawn one.

### (b) Edge language shared with the landscape?

Crops side by side in `m/edges.png`.

| Lens | Round 2 | Round 3 | Evidence |
|---|---|---|---|
| 14 | Fail (5) | Partial (6) | Cloud crown is cut like the leaf masses, but its notches are 20-40 px while leaf dabs beside it are 10-20 px, and the mountain edge (`mtn14`) is cut with small 2-4 px chew. The cloud is coarser than everything at its own distance. Base blur has no counterpart anywhere in the landscape. |
| 32 | Partial (6) | Pass (7.5) | `sil-e32`, `sil-sw32`, `treeW2`: crown reads as a flat shape behind the stone/leaves. |
| 54 | Near (6.5) | Pass (7.5) | `sil-e54`, `sil-sw54`. |
| 70 | Pass (7) | Pass (7.5) | `sil-e70`, `w15_150`: crown chew matches far-wood chew in size. |

Shared now: flat fill, cut edge, two values, no gradients on the crown side. Not shared: base (blur), tail
(ruled lines), shade tone (gradient). The far mountains remain the model: flat light shape, flat shade shape,
every edge cut, including the bottom where haze takes over by value, not by blur.

### (c) Composition, cropping, sectors

- North half (az -150 to -60) plain: all hero-family views 8.5-9. Nothing competes with the chapel in hero,
  front, frame, stepA, pathback, southfar, back, low, inside at any of four sway times.
- East: heapA + puffB over the castle is a pleasant grouping at fov 40 (`cu-B40`, `farNE`, `w15_-30` 7-8). In
  `farE` the heap is cropped by the top edge: good.
- South-west: heapE whole and centred in `w15_150`, `ring-r25_150`. Fine at fov 70, storybook at fov 40.
- heapG (el 36): above level frames as intended, but its base still enters the top of `farSW`, `farW`, `rim`,
  `w15_90`, `ring-r25_90`. Either the base must become good (fix 1) or the card must go to el 40.
- treeW2: heapA's vertical right edge sits just right of the crown at mid-height; competes mildly with the tree.
- No frame with more than three sky objects. Restraint is right; do not add.

### (d) Motion

- **Pan, fov 14, 24 frames, 0.5 px per frame at the crown:** every pair two frames apart registers at exactly
  1 px with edge residual 1.3 code values and 0 edge pixels over 25. The dab hooks are rigid: no shimmer.
- **Pan, fov 40, 24 frames, 0.36 px per frame:** edge residual 3.1, 71-99 edge pixels over 25 per step,
  alternating with the sub-pixel phase. That is the ordinary crawl of a 1-px anti-aliased high-contrast edge
  (white on `#6FC0EC`), not dab re-laying. It will be faintly visible as a sparkle along the crown during slow
  pans; the landscape's cut edges do the same. Acceptable; a 1.3 px edge would halve it.
- **Zoom fov 50 to 14, 24 steps, rescaled to one angular size:** consecutive-step difference mean 1.42-1.45
  (grain), at most 22 pixels over 20 after the first step. The outline is identical at every lens: the dab field
  is now fixed in sky angle, so nothing re-lays. (Cost: the dab is too big at fov 14; see fix 3.)
- **Sway:** 40 px in 60 s at fov 14 (0.007 deg/s), pure shift, residual 1.5. Imperceptible in real time.
- Not tested: real-time video.

---

## 3. Per-view scores (round 2 -> round 3)

| View | R2 | R3 | Note |
|---|---|---|---|
| hero, front, inside, low, pathback, stepA, farN, frame, tree, under, skyUp, lowN, vista, plainSE, village | 8.5 | 8.5 | clean |
| southfar | 9 | 9 | |
| mtN, mtE, mtW, hillW, hillN | 8 | 8 | |
| farSE, back, castle, treeN, rimE, farNW | 7-8.5 | 8.5 | now cloudless |
| westwall, farS, rim, farW, hillSW | 7-7.5 | 7.5 | soft puff / base sliver at top edge |
| farE, farNE, treeW2, birds, farSW | 6-6.5 | 7 | heap now belongs; tail and puff hold it back |
| ring p5 az -150..-60, 60, 90 | 8-8.5 | 8.5 | |
| ring p5 az -30, 0 / 120, 150, -180 / 30 | 6-7 | 7 / 7.5 / 8 | |
| ring p25 az -150..-60, 30 | 8-8.5 | 8.5 | |
| ring p25 az -30, 0 | 6 / 5.5 | 6.5 / 6.5 | heapA whole, vertical right edge |
| ring p25 az 90 | 5 | 6 | heapG underside only |
| ring p25 az 120, 150 | 6 / 6 | 7 / 7 | heapE |
| ring p50, up | 7.5 / 7 | 7.4 / 7 | plain; heapG crown at the bottom of two frames |
| w15 az -90 / 30 / 90 / 150 | 9 / 7 / 6 / 6.5 | 9 / 8 / 7 / 7.5 | |
| w45 az 30 / 150 | 7 / 7 | 7.5 / 7 | |
| fov 14 heapA crown / base / lee / tail | 5 / 5.5 / - / - | 6.5 / 5.5 / 6.5 / 5 | |
| fov 14 heapE mid / base / crown / tail / windward | 6 / 5.5 / 5 / 6 / - | 6 / 5 / 6.5 / 5 / 6.5 | |
| fov 14 heapG crown / base / mid | - | 6 / 4.5 / 6 | |
| fov 14 puffB / flatA / rowA / flatB | 5.5 / 7.5 / 6 / 7.5 | 6 / 8 / 6.5 / 7.5 | |
| fov 40 heapA / heapE / heapG | 5.5-6 | 7 / 7 / 6.5 | |

## 4. Per-cel scores

| Cel | R2 | R3 | Note |
|---|---|---|---|
| heapA (placed) | 6 | 7 | knob + shoulders; vertical right end; shade reaches the top |
| heapE (placed) | 6.5 | 7 | best silhouette and best interior |
| heapG (placed) | 6 | 6.5 | good crown; seen mostly from its base |
| puffB (placed) | 5.5 | 6 | slab with a step |
| rowA (placed) | 6 | 6.5 | two soft domes |
| flatA (placed) | 7.5 | 8 | on-model |
| flatB (placed) | 7.5 | 7.5 | on-model |
| heapC (not placed) | 5 | 5.5 | long thin neck |
| puffA (not placed) | 4 | 6 | same slab |

---

## 5. Ranked faults and fixes

### 1. Base: smooth wave + uniform blur

- Outline: the wave is the broad noise `(n1.r - 0.5) * 0.5 * S * amp` acting on a nearly straight eroded line.
  Drop it to 0.15 where `soft > 0.5` and let the bake decide the base: a nearly level line with 2-3 shallow
  scoops of unequal width (subtract ellipses 4:1 wide, depth 0.03-0.06 of cloud height).
- Edge: do not blur it. Cut it like the crown (`w = 0.8 * fw`) and chew it with a horizontally stretched dab
  (`uBrush` at `vec2(0.6, 4.0)`), amplitude twice the crown's, so the underside is a ragged level tear.
- Softness by value instead: the lowest 15% of the height drops to the thin tone (`body` 0.76, then 0.6 for the
  last 5%), with a cut boundary. That is how the far mountains meet the haze in this picture.
- The dry streaks: keep 3-5, unequal length, only inside the thin band, strength 0.24 to 0.45.

### 2. Tail: ruled speed lines

- Replace the stroke block with 2-3 separate flat scraps of the thin tone, each 3:1 to 5:1 wide, sizes
  1 : 0.5 : 0.25, gaps growing, lying on the base line, cut edges, ends pointed not square.
- If strokes are kept: at most 5, lengths varied by 3x, slightly fanned (+-4 deg), ends tapered by the
  distance field rather than a common cut-off, and no stroke thinner than 3 px at fov 40.
- Vary per heap: heapE none (ends on a lobe), heapA scraps, heapG one short shelf.

### 3. Dab scale at the long lens

- A fixed 0.25 deg dab is 23 px at fov 14. Add a second, finer chew octave that only appears when magnified:
  `chew2 = (texture(uBrush, vLocal.zw * 13.0 + sd).r - 0.5) * 0.07 * S * amp * smoothstep(6.0, 16.0, 0.25 / fwDeg)`
  where `fwDeg` is one pixel in degrees, and scale the first octave's amplitude down by the same factor to 0.6.
  Fixed to the cloud, so pans stay rigid; it fades in over fov 30 to 14, so zoom shows no pop.
- Remove enclosed holes and crumbs: after thresholding they come from the dab exceeding the local thickness.
  Clamp `chew` to `min(chew, k.r * 0.8)` on the positive side and `max(chew, -(k.r) * 0.8 - 0.02)` inside.
- Edge width 0.8 px to 1.3 px to halve sub-pixel crawl in slow pans.

### 4. Shade tone is a gradient and reaches the crown

- Make it flat: `shade = (1 - found) * step(0.25, k.a + (n1.a - 0.5) * 0.25)` with a cut, chewed far boundary
  (lost edge by shape, not by fade), or keep the fade but limit it to 15% of the lobe height.
- Keep the top 20% of every back lobe in the thick tone: multiply `shade` by `1 - smoothstep(0.15, 0.3, depthBelowCrown)`
  (bake the distance below the crown into a channel, or use `k.r` near the upper silhouette).

### 5. One formula for every heap

- heapA: two front heaps of different size, left and right of centre; heapE: one large front heap low left;
  heapG: none, only a shade wedge on the lee side. Tails on different ends or absent (fix 2).
- heapA: round off the vertical right end with a lower lobe (`[1.0, 0.14, 0.4]`) so it steps down.

### 6. heapG shows only its base in level frames

- After fix 1 this is tolerable. Otherwise `el: 40, w: 32` so fov 40 level frames clear it.

### 7. puffB slab

- Three lobes of radius 1 : 0.65 : 0.4 with centres at different heights (0, +0.25 r, -0.1 r), overlap 60%;
  crown cut, base as fix 1; `w: 8`.

### 8. Upper wash has no visible hand (minor, unchanged)

- `hi.g` 0.030 to 0.045, scale `vec2(0.05, 0.45)`; verify peak-to-peak 7-9 code values at pitch 50.

---

## 6. Best and worst

Best: `wide-w15_-90` and `southfar` 9; hero family 8.5; best cloudy frames `wide-w15_30` 8 (heapA cropped at the
left edge), `cu-flatA` 8, `cu-B40` / `farNE` / `sil-sw54` 7-7.5.

Worst: `cu-heapGbase` 4.5; `cu-heapEbase`, `cu-heapAwind`, `cu-heapElee` 5; `ring-r25_90` 6.

What takes the best heap frame (heapE at fov 40, `cu-E40` / `ring-r25_150`, now 7) to 9:

1. Base cut and ragged along a level line with a thin-tone band, no blur (fix 1).
2. Tail replaced by two or three flat scraps (fix 2).
3. Shade tone flat with a shaped far edge, kept off the top of the dome (fix 4).
4. Crown notches at two scales so it holds at fov 14 (fix 3).
5. Frame it: move to az 146 el 26 so fov 32-40 level frames looking south-west cut it at the top or the right,
   as the reference's cropped mass is.
