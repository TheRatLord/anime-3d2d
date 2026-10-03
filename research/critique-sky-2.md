# Sky critique 2 (independent, same view set and method as critique 1)

Scope: `src/sky.js` + `src/extra/sky-clouds.js` as of the current main build. Nothing in `src/` was edited.
Renders: `.work/skycrit/shots/` (round 1 kept in `.work/skycrit/shots-c1/`), montages and crops in `.work/skycrit/m/`.
Scale: 0-10 against the sky of a real Frieren painted background.

## 0. Result

| Group | Round 1 | Round 2 |
|---|---|---|
| Named views (37) | 7.3 | **7.8** |
| Ring pitch 5 deg | 6.3 | **7.5** |
| Ring pitch 25 deg | 6.5 | **7.0** |
| Ring pitch 50 deg | 4.7 | **7.5** |
| Straight up | 2.9 | **7.0** |
| fov 70 wides | 5.8 | **7.1** |
| fov 14, same 19 directions | 5.8 | **7.4** |
| **All 102** | **6.3** | **7.5** |
| fov 14, frames that contain a cloud (17 then, 15 now) | 5.5 | **5.7** |

Read the last row with the rest. The mean rose 1.2 points almost entirely by **removal**: tops, veils, debris
and half the cards are gone, and the plain wash that replaced them scores 7-8.5. The clouds that remain are
not better paintings than before. Every frame with a heap in it still sits at 5-6.5.

Claims checked:

| Claim | Verdict |
|---|---|
| Tops and veils removed | True. No card above 30 deg; atlas has no `top`/`veil` kinds. |
| Upper wash an even field | True. Pitch 50 row sd 0.9-1.0, range 5-6 code values; straight up 166-176. |
| Calm fade instead of shatter, all elevations | True in code (`alpha *= 1 - smoothstep(0, 0.45, calm)`, cull at 0.45, no elevation term). No specks in any frame. Hero clean at t = 0, 600, 1800, 3600 s. |
| 26 cards to 9, north half empty | True. az -150 to -60 has no cloud at pitch 5, 25 or 50. |
| Edge width bounded in pixels | True in code and visible: the crown edge is about 2-3 px at fov 14 and at fov 70. |
| Heaps rebuilt with proud unequal scallops, turrets | **Not visible.** Crowns are smooth 2-3 lobe curves; see ruling (a). |
| Noise-eaten bases with flattened wisps | Partly. Bases are eaten, but into smooth V notches; wisps are one small ellipse per heap. |
| Interior relief per lobe | Present, but reads as airbrush gradient, not paint. |
| Puffs as lopsided smears with a tail | True, and that is the problem: they read as fish / tadpoles. |
| Wash mottling halved and lengthened | True below 30 deg (row range 7-11 code values, was 9-19). |
| 0-2 deg stops lifted | True in `STOPS`; band reads slightly cleaner. |

---

## 1. What was and was not opened

Opened at full size (1280x720 unless noted):

- Named (35): hero, front, inside, low, tree, under, frame, stepA, pathback, southfar, farN, farNE, farE, farSE,
  farS, farSW, farW, farNW, back, treeW2, treeN, birds, mtW, mtN, mtE, rim, rimE, vista, village, castle,
  westwall, lowN, skyUp, plainSE, hillSW, hillW, hillN.
- Ring pitch 5: all 12. Ring pitch 25: all 12. Ring pitch 50: az 90 and -90. Straight up fov 70 and fov 50.
- fov 14: heapA crown, heapA base, heapE, heapE base, hzN; new close-ups of the current cards: heapC crown,
  base and lee, heapE crown and lee, puffB, puffD, flatA, rowA, flatB, rowB.
- fov 70: w15 at az -150, -90, -30, 30, 90, 150; w45 at az 30, 150; `wup`.
- Lens series from the ground: east wall against heapA at fov 14, 32, 54, 70; tree against heapE at fov 14, 32, 54;
  treeUp, gableUp, treeS.
- Atlas: `cels.png` (shown at 0.93x), `celsbig`, `celsbig2`, `celsbig3` (2560x1440 shown at 0.78x).
- 1080p: native crop of heapE (`hd-sw22`); contrast-stretched calm10 and calm40.

Seen only in reduced montages: ring pitch 50 (the other 10), three tilt series (A and C opened, 18 frames at
640 px each), named stepB, haloN, walkW, walkE, doorout, drift, driftE, meadow, treesW; the old close-up
directions that are now empty sky (heapB, heapC old aim, heapF, puffA/B/C, rowA/B/C, veilA/C, topA/B, hzS) and
`hd-z75`; zoom crops fov 50-14 (8 steps, rescaled to one angular size); fov 14/15/16/17 crops; hero at four
times; long-time frames (t = 1800, 3600); drift pair t = 3 / 63.

Not opened: tilt series B montage, `ring-upB`, `wide-w45_-150/-90/-30/90`, `hd-e20`, `hd-s50`, `hd-calm10/40`
native, `sil-stoneE`, `sil-stoneSE`, `sil-treeSW` (fov 40), `sil-e`/`sw70` (sw70 only), old-name close-ups
heapBcrown, puffD, rowC2, rowA2, rowC3, rowB2, veilB, veilA2, veilB2, hzNW/E/W/SE/NE, `yaw-v*`, `yaw-y2`,
`time-tr-*`, most `time-*` frames (numeric only), zoom steps 46, 38, 30, 24 and `zb*` full frames, named out0-out315,
leaf3m, close, high. No video was captured: motion is judged from frame pairs and registered differences. No web
search.

---

## 2. Rulings

### (a) Do the heaps read as painted cumulus? No. Storybook / airbrush, 5-6 out of 10.

- **Crown.** A single clean curve of two or three big arcs with a 2-3 px edge and a faint 1 px fuzz
  (`cu-heapAcrown`, `cu-NheapEcrown`, `cu-NheapCcrown`). No scallops, no turret, no notch of sky biting in. The
  pixel bound made the edge firm but also removed all break-up: edge noise is 3 px in amplitude against lobes
  300-600 px across at fov 14, so the outline reads as a vector path with a soft pen. At fov 40 heapA is a
  mitten / "3" shape (`ring-r25_0`), heapE a smooth hill (`ring-r25_150`), heapC a bubbly outline of equal
  bumps (`ring-r25_90`). The reference crown is "scalloped but shallow, lobes of clearly different sizes, dabbed
  outline over 6-12 px at 1080p".
- **Base.** Inverted mountain range: smooth V and A notches 5-10 deg wide with a firm 3-6 px edge
  (`cu-heapAbase`, `cu-heapEbase`, `cu-NheapCbase`). The agent's own flag is right and it is on all three heaps,
  not only heapC. The reference base "trails off into ragged thinner tatters, the softest edge of the cloud,
  feathering over 2-4% of frame width" (25-50 px at 720p). One detached ellipse under each heap
  (`ring-r25_120`, `ring-r25_150`, `cu-NheapElee`) is a stamp.
- **Interior.** Large Gaussian pools of thinner white with no edge anywhere (`cu-heapE`, `cu-NheapClee`,
  `hd-sw22`). Value range is right (two whites); the handling is wrong. Poster colour leaves each passage with
  one found edge and one lost edge; these have two lost edges, which is what "airbrushed" means. The lower third
  of each heap fades to near-sky, so the cloud looks back-lit and translucent rather than thinly painted.
- **Tails.** heapC and heapF end in a string of beads (`ring-r25_60`: a beak and two dots; atlas heapF: three
  sausages). heapA's tail is the best part of any cloud: soft, broken, believable.
- **Puffs and rows.** puffD / puffC / puffA are fish or tadpoles (`cu-NpuffD`, `ring-r5_-180`, `farW`). rowB is
  two lozenges with a crisp ruled top and no bottom (`cu-NrowB`, `farSE`, `ring-r5_30`). Low translucent clouds
  in front of mountains look like stickers on glass (`castle`, `cu-NpuffB`, `ring-r5_-30`, `birds`).
- **Good:** flatA and flatB (7.5) are the only on-model clouds: pale, wide, lost edges, sunk in the band.

### (b) Too empty, or correctly restrained? Correctly restrained.

- Half the compass (az -150 to -60, and az 30-60 above 10 deg) is plain wash and those are the best frames
  (8.5-9). The references are 3 of 3 boards and about 9 of 10 stills cloudless.
- Where clouds are, there are still slightly too many small ones: `farSW` has four objects, `ring-r5_150` four,
  `w15_150` five, `w15_90` five. Drop one echo per group rather than add anything.
- heapC at el 30 is wrong for level frames: only its ragged underside enters the top edge (`farS` top right,
  `farSW` top, `ring-r5_150` top, `rim` top right). The worst part of the cloud is the only part shown.
- Over time the layout turns 144 deg per hour and clouds entering the calm sector are culled: at t = 3600 s the
  south-west frame is empty and one heap is left in the whole sky. Acceptable, but it means the composition is
  only designed for the first minutes.

### (c) One edge language with the landscape? No at fov 14, partly at 32, nearly at 54-70.

| Lens | Verdict | Evidence |
|---|---|---|
| 14 | Fail (5) | `sil-treeSW14`, `sil-stoneE14`: flat hard-cut trunk and stone against fog with gradients. Two media. |
| 32 | Partial (6) | `sil-e32`, `sil-sw32`, `treeW2`: cloud is a soft white mass behind crisp shapes; reads as defocused. |
| 54 | Near (6.5) | `sil-e54`, `sil-sw54`: edge reads firm; outline still too smooth beside leaf dabs. |
| 70 | Pass (7) | `sil-e70`, `w15_-30`: cloud small enough that only silhouette counts; silhouette is still a mitten. |

The landscape is flat shapes with hard, slightly chewed edges and two or three values per mass. The clouds have
no flat area and no chewed edge. The far mountains (flat pale shape, one flat shade shape, hard edge) show
what a cloud two-value design should look like in this picture.

### (d) Straight up and pitch 50: is plain wash enough? Yes. 7-7.5, not a void.

- It is even, the right colour (`#60B5E7`-`#6ABDEB`), grain 0.96, no banding, no pole, no blotches at normal
  contrast. In practice leaves or the gable are in these frames (`skyUp`, `under`, `treeUp`, `gableUp` all 8.5).
- What it lacks: any trace of the hand. Stretched 4x it shows 10 deg cloudy mottling, no long passes. A bare
  frame at pitch 50-90 is a flat fill with grain. That costs a point, and no cloud currently in the atlas would
  earn it back. Do not add high clouds until a heap scores 7.5 at fov 40.

### (e) Motion: no fault found in frame pairs.

- Yaw 0.3 and 0.9 deg at fov 14: pure shift, residual 1.65-1.73 code values (grain). Pitch 0.3 deg: residual 1.9.
- Zoom fov 50 to 14 in 8 steps, rescaled to one angular size: outline identical at every step; only the soft
  lee wisps change texture slightly. fov 14 vs 15: mean diff 1.67, max 9 (grain plus resampling). The re-laid
  dab octave is invisible because the dabs themselves are nearly invisible (3 px amplitude). When edge dabs are
  made stronger (fix 1) this must be re-tested: crossfading octaves of a 6-8 px dab will show.
- Drift: 30 px in 10 s at fov 14 (pure shift, residual 1.68). t = 3 to 63 s: same shape, residual 4.5 with a
  2 px vertical component (the card turns about the vertical axis; expected).
- Not tested: real-time video, so sub-pixel stepping of a 1.2 px crown edge at 12 fps (0.25 px per step) is
  unverified. If it shimmers, quantise drift to 1/50 deg.

---

## 3. Per-view scores (old -> new)

### Named

| View | Old | New | Note |
|---|---|---|---|
| hero, front, inside, low, pathback, stepA, farN | 8.5 | 8.5 | clean wash |
| southfar | 8.5 | 9 | best named sky |
| frame, tree, under, skyUp | 8 | 8.5 | |
| mtN, mtE, hillW, hillN | 8 | 8 | |
| lowN | 7 | 8.5 | stripes gone |
| vista, plainSE | 7.5 | 8.5 | |
| village, rimE, farNW | 7 / 7.5 / 6.5 | 8.5 | now cloudless |
| mtW | 6 | 8 | |
| hillSW | 7.5 | 7.5 | |
| westwall, back, farS | 6.5 / 6.5 / 6 | 7.5 | faint ellipses at an edge |
| rim, treeN, farSE, farW | 7.5 / 6.5 / 6 / 5.5 | 7 | heap undersides at top edge; lozenges; fish puff |
| castle, birds, farSW | 7 / 6 / 5 | 6.5 | translucent puff over the mountain; four objects |
| farE, farNE, treeW2 | 7 / 6.5 / 6.5 | 6 | heapA / heapE as large airbrushed blobs |

### Ring, fov 40

| az | p5 old | p5 new | p25 old | p25 new | p50 old | p50 new |
|---|---|---|---|---|---|---|
| -180 | 5.5 | 7 | 6 | 8 | 4.5 | 7.5 |
| -150 | 6.5 | 8.5 | 6.5 | 8 | 4.5 | 7.5 |
| -120 | 7.5 | 8.5 | 8 | 8.5 | 6.5 | 7.5 |
| -90 | 7.5 | 8.5 | 7.5 | 8.5 | 6.5 | 7.5 |
| -60 | 6.5 | 8.5 | 6.5 | 8.5 | 6.5 | 7.5 |
| -30 | 7 | 6 | 6.5 | 6 | 5 | 7.5 |
| 0 | 6.5 | 6.5 | 6.5 | 5.5 | 3 | 7.5 |
| 30 | 7 | 7 | 6 | 8 | 3 | 7.5 |
| 60 | 6 | 7.5 | 6 | 5.5 | 3.5 | 7.5 |
| 90 | 5.5 | 8 | 6 | 5 | 4.5 | 7.5 |
| 120 | 5.5 | 7 | 6.5 | 6 | 4.5 | 7.5 |
| 150 | 5 | 6.5 | 6 | 6 | 4.5 | 7.5 |

### Up, wide, long lens

| View | Old | New |
|---|---|---|
| up fov 70 / up fov 50 / `wup` / 1080p pitch 75 | 3 / 3 / 2.5 / 3 | 7 / 7 / 7 / 7 |
| w15 az -90 | 8.5 | 9 |
| w15 az 30 / 90 / 150 | 6.5 / 5.5 / 5.5 | 7 / 6 / 6.5 |
| w45 az 30 / 150 | 3.5 / 5 | 7 / 7 |
| fov 14 heapA crown / base | 7 / 6.5 | 5 / 5.5 |
| fov 14 heapE / heapE base | 6.5 / 6.5 | 6 / 5.5 |
| fov 14 heapC crown / base / lee (new aim) | - | 5 / 5.5 / 5.5 |
| fov 14 heapE crown / lee (new aim) | - | 5 / 6 |
| fov 14 puffB / puffD | - | 5.5 / 5 |
| fov 14 flatA / flatB | - | 7.5 / 7.5 |
| fov 14 rowA / rowB | - | 6 / 5 |
| fov 14 horizon N / S | 8.5 / 8 | 8.5 / 8 |
| other old fov 14 directions | 2-7.5 | 7.5-8 (now plain wash) |

Crown close-ups went down: in round 1 the noisy edge hid the outline; now the outline is exposed and it is bland.

## 4. Per-cel scores

| Cel | Old | New | Note |
|---|---|---|---|
| heapA | 6.5 | 6 | mitten: two arcs and a step; good tail |
| heapB | 5.5 | 6 | not placed; duck profile |
| heapC | 5.5 | 5 | equal bumps, bead tail, V-notched base |
| heapD | 6 | 5.5 | not placed; caterpillar with a hanging lobe |
| heapE | 7 | 6.5 | best mass; smooth hill outline, detached ellipse |
| heapF | 4.5 | 4.5 | not placed; three sausages |
| heapG | - | 6 | not placed; compact, most cumulus-like silhouette |
| puffA | 7 | 4 | three separate pieces; dome with a hard V underside |
| puffB | 6 | 5.5 | long sausage with a pinch |
| puffC | 5.5 | 4.5 | tadpole |
| puffD | 6.5 | 5 | fish / submarine |
| rowA | 6.5 | 6 | one dome and a dot |
| rowB / rowC | 6 / 6 | 5 / 5.5 | lozenges with ruled tops |
| flatA / flatB | 6.5 / 6.5 | 7.5 / 7.5 | on-model |
| scrapA | 5.5 | 5.5 | not placed |

---

## 5. Ranked faults and fixes

### 1. Crown is a smooth path: no scallops, no dabs

Views: every heap frame; clearest in `cu-heapAcrown`, `cu-NheapEcrown`, `ring-r25_0`, `ring-r25_150`, `farE`.

- Bake: the scallops melt into the parent. Place 6-9 per primary lobe with centres at 0.92-1.05 of the parent
  radius (now 0.68-0.88) and radii 0.12-0.32 of the parent, drawn from a skewed distribution (one 0.3, two
  0.2, rest 0.12-0.15); `smin` k 0.08 to 0.03 for scallops only; domain warp `wa` 0.30 to 0.18 (it rounds
  everything into one curve). Add two or three bites: subtract small circles (r 0.04-0.07) at the junctions
  between scallops so sky notches in.
- Shader: crown dab amplitude from `mix(3.0, 20.0, soft) * fw` to `mix(7.0, 20.0, soft) * fw`, brush term
  `mix(1.5, 6.0, ...)` to `mix(4.0, 6.0, ...)`; crown width stays 1.2-3.5 px. Target: an outline that wanders
  4-8 px at 720p with a firm edge, like the chewed edges of the far tree masses.
- Then re-test the zoom sequence (ruling e).

### 2. Base is an inverted mountain range with a firm edge

Views: `cu-heapAbase`, `cu-heapEbase`, `cu-NheapCbase`, `ring-r25_120`, `hd-sw22`.

- The notches come from the broad outline noise at full softness (`(n1.r - 0.5) * 3.2 * S * amp`) cutting a
  smooth field. Reduce to `mix(0.8, 1.4, soft)`.
- Base width: `clamp(1.25 * wa, 3.0 * fw, 22.0 * fw)` to `clamp(2.2 * wa, 12.0 * fw, 45.0 * fw)`; the base should
  have no locatable edge at fov 32-70.
- Put the break-up in the dry-brush term instead: strength 0.16 to 0.5, streaks horizontal (brush scale
  `vec2(0.35, 2.4)`), acting over the lowest 20% of the cloud height rather than a band at the edge.
- Bake: flatten the underside. Clamp lobe centres so no primary lobe hangs below `v = 0.05`; erosion
  `max(0, 0.14 - v) * 0.8` to `max(0, 0.22 - v) * 1.6` so the base line is nearly level and thin.
- Remove the single detached ellipse under each heap, or make it 2-3 unequal streaks 4:1 wide at the lee end.

### 3. Interior is airbrush

Views: `cu-heapE`, `cu-NheapClee`, `cu-heapAbase`, `hd-sw22`.

- Give each passage one found edge: `lit = smoothstep(0.28, 0.74, ...)` to `smoothstep(0.44, 0.56, g)` where
  `g = k.g + (n1.a - 0.5) * 0.22 + n2 * 0.06`, i.e. a brush-shaped boundary 6-12 px wide, then let the shade
  side fade out with distance (multiply the shade amount by a blurred copy of the light channel so the far side
  is lost). Bake blur of `lig` back to radius 2.
- Values: `body = mix(0.52, 0.86, lit)` to `mix(0.68, 0.88, lit)`. Lit-to-shade should be 5-8% in value; the
  lower third must not approach sky colour except in the last 20% above the base.
- Limit passages to two or three per heap, each under a scallop group on the lee side; none across the dome.

### 4. Puffs and rows read as objects; low clouds read as stickers

Views: `ring-r5_-180`, `farW`, `cu-NpuffD`, `castle`, `cu-NpuffB`, `cu-NrowB`, `farSE`, `ring-r5_30`, `birds`.

- Puff construction: 3 overlapping circles of radius ratio 1 : 0.7 : 0.45 on a level line, overlap over 60%,
  squash 0.6, no head-and-tail (drop the tail circles and the separate satellite pieces of puffA).
- Rows: softness floor 0.6 on the whole cel so the top edge is as lost as the bottom; current tops are 2 px firm
  while the bottoms have vanished, which makes lozenges.
- Rule in the shader: below 9 deg elevation force `soft >= 0.6`, and multiply opacity by
  `smoothstep(0.03, 0.14, e)` so nothing firm stands in front of the ranges.
- Placement: puffB from az -27 el 10.5 (lands on the castle mountain's summit in `castle`, `ring-r5_-30`,
  `farNE`) to az -33 el 14, w 9.

### 5. heapC shows only its underside in level frames

Views: `farS`, `farSW`, `ring-r5_150`, `rim`.

- Move to `{ az: 80, el: 36, w: 30 }` (out of level frames at fov 32-40; found when tilting up 20 deg), or to
  `el: 21, w: 28` (crown in frame). Not in between.

### 6. One object too many per cloudy frame

Views: `farSW`, `ring-r5_150`, `w15_150`, `w15_90`.

- Drop puffD (az 163) and rowB (az 40). Leaves heapA + puffB + flatA east, heapE + rowA + flatB south-west,
  heapC high. Seven cards.

### 7. Heap scale against the picture

Views: `farE`, `farNE`, `ring-r5_0`, `treeW2`.

- heapA (w 30) fills a third of a fov 40 frame as one object with two arcs: its largest shapes are bigger than
  any shape in the landscape. After fix 1 this may resolve; if not, `w: 24`.

### 8. Upper wash has no hand (minor)

Views: `ring-r50_*`, `up70`, `wup`.

- Above 45 deg add one set of long straight passes at low contrast: raise `hi.g` 0.030 to 0.040 and stretch
  `vec2(0.11, 0.30)` to `vec2(0.05, 0.45)`. Keep peak-to-peak under 8 code values.

### 9. Unused cels

heapB, heapD, heapF, heapG, puffA, puffC, rowC, scrapA are baked and not placed (8 of 17). heapG is a better
silhouette than heapC; consider swapping.

---

## 6. Best and worst

Best:

1. `wide-w15_-90` 9 and `southfar` 9: full gradient, white band, ranges dissolving. Episode-ready.
2. hero / front / vista / lowN / ring pitch 5 az -150 to -60: 8.5.
3. Best frame with a cloud: `cu-NflatA` / `cu-NflatB` 7.5; best with a heap: `w15_30` and `rim` 7 (heap cropped
   by the frame edge), `ring-r25_150` 6 uncropped.

Worst:

1. `ring-r25_90` 5 (heapC whole: bubbly outline, bead tail).
2. `cu-heapAcrown`, `cu-NheapCcrown`, `cu-NheapEcrown`, `cu-NrowB`, `cu-NpuffD` 5.
3. `ring-r25_0`, `ring-r25_60` 5.5; `farE`, `farNE`, `treeW2` 6.

What takes the best cloudy view (heapE at fov 40, `ring-r25_150`, now 6) to 9:

- Crown: 6-9 unequal proud scallops with sky bites and a 4-8 px dabbed wander (fix 1).
- Base: level, thin, no locatable edge, dry horizontal streaks, no detached ellipse (fix 2).
- Interior: two or three passages with one found edge each, 5-8% value step, no gradient pools (fix 3).
- Crop it: in the reference the mass is cut by the frame on two sides. A heap floating whole in the middle of
  the frame will read as a storybook cloud however it is painted; place masses so level frames cut them at a
  side or top (but not showing only the base, fix 5).
- Keep its echo to one small soft puff and one flat whisper (flatB is already right).
