# Sky critique 4 (independent): PAINTED vs CUT, judged against the aired stills

Scope: `src/sky.js` + `src/extra/sky-clouds.js`, current main build, both cloud modes (default PAINTED, and
`?cloudcut=1`, passed with `--q=cloudcut=1`). Nothing in `src/` was edited.
Renders: `.work/skycrit/shots/` (`cu-*`, `ring-*`, `n-*`, `sil-*` = painted; `cuX-*`, `ringX-*`, `nX-*`, `silX-*` = cut).
Earlier rounds: `shots-c1/`, `shots-c2/`, `shots-c3/`. Montages and crops: `.work/skycrit/m/`.
Reference: `scratchpad/skyres/st/Gr_e_Forest_village_EP3.png` (opened at full size) and the other 46 cached stills
(all seen, as 800x450 thumbnails on eight contact sheets).

## 0. Mode ruling

**PAINTED is closer to a real Frieren sky. CUT should not ship. I was wrong to ask for the cut language in
critiques 2 and 3.**

Those critiques judged the clouds against the landscape of this scene, on the premise that one painting has one
edge language. The aired still refutes the premise: its trees and gate are crisply cut, and the cumulus behind
them has no hard edge anywhere. Two edge languages in one frame is the show's actual practice. The only other
cached still with a daytime cumulus (Appetit Region EP12) agrees: soft dabbed outline, soft lavender shade,
detached soft scraps.

Tally of the 47 stills, for calibration: fair-weather cumulus in 2 (Größe Forest village, Appetit Region);
overcast or storm ceilings in about 5; faint low haze-cloud in 2-3; the rest have a plain wash. Restraint remains
correct.

Per element (reference vs each mode, matched scale: `m/tri_E40.png`, `tri_A40.png`, `tri_G40.png` at 1280-wide
scale; `m/nat_crown.png`, `nat_base.png`, `nat_puff.png` at the still's native pixels):

| Element | Aired still | PAINTED | CUT | Closer |
|---|---|---|---|---|
| Crown | Soft everywhere; edge resolves over 8-20 px at 1920 wide; outline lumpy with dab-sized bumps and deep sky bays; small wisps fingering out | Soft, right width order, but one closed contour with shallow scallops; edge softness nearly uniform | 1 px cut with chewed steps: reads as cut paper / cel cloud | PAINTED |
| Base | The softest edge; ragged tufts streaming down and to lee, fading to nothing; no line | Soft, but a smooth wave with hanging "udders", and an inner contour parallel to the edge that reads as a folded ribbon | Level tear with value bands and streaks: reads as a reflection in water or a boat wake | PAINTED, but it is the worst part of that mode |
| Interior | Low-contrast patchy mottling from overlapping dabs; sky tone showing through in irregular patches; no shape boundary | One broad smooth thin passage: right contrast, but airbrushed and a single band | Flat front-heap shapes with drawn boundaries: a different idiom (cel / Ghibli-lite), absent in the still | PAINTED |
| Tail / scraps | Small soft detached tufts, uneven, some barely there | Soft dabs, about right; heapA's tail has an S-shaped ribbon | Flat pointed slivers: paper cut-outs | PAINTED |
| Small puff | Fuzzy blot with wisps trailing to one side | Smooth soft bean with one bead | Flat-bottomed sticker | PAINTED |

The sky agent's side-by-sides (`m-r6ref.png`, `m-r6refA.png`, `m-r6cut.png`) show the same thing and its
conclusion stands. Where CUT still looks better is only against this scene's foliage at fov 14 (`m/silX.png`), which
is the wrong yardstick.

**The ideal is a hybrid in one specific sense: PAINTED softness, built from dab marks instead of blur.** The still's
cloud is soft because many round brush dabs overlap, not because a contour was feathered. That gives it three
things PAINTED lacks: a lumpy edge at dab scale, deep bays, and interior mottling. No firm accents are needed; the
still has none.

### What in PAINTED still differs from the still (the agent's list, confirmed or adjusted)

| Agent's flag | Verdict |
|---|---|
| More closed/compact, fewer deep sky notches | Confirmed; the main difference. The reference outline has bays 20-40% of a lobe deep and satellite tufts; ours is a single convex-ish contour. |
| Less interior dab mottling | Confirmed. Ours has one smooth band; the reference is patchy at dab scale across the whole body. |
| Floats whole instead of being cropped large by the frame | Confirmed. heapE (az 146, el 26) is above every level frame at fov 32-40, so it is seen whole and centred when tilted to (`ring-r25_150`, `cu-E40`), and not at all otherwise. |
| heapE too tidy a hill | Confirmed: a smooth "Africa" outline with evenly sized scallops. |
| heapA's tail has an odd S wisp | Confirmed and worse than "odd": at fov 14 it is a clear S-shaped folded ribbon with a contour line (`cu-heapAbase`, `cu-heapAwind`). It reads as a 3-D sheet. The same doubled contour appears under heapE's left end (`cu-E40`, bottom left) and under heapG. |
| heapG passage boundary straight | Confirmed (a level band across the lower third in `cu-G40`). Also: heapG's silhouette reads as an animal (snout at left, body, feet = the hanging base lobes). |

Additional differences:

- Base lobes hang as rounded "udders" with small drips (`cu-G40`, `cu-heapGbase`, `cu-heapEbase`); the reference
  base streams diagonally and frays.
- Edge softness is almost constant round the crown. In the reference it varies from about 6 px to a lost edge
  within one lobe.
- Our cloud white is slightly brighter and more opaque against the wash than the still's (`#E7F9FA` body on
  `#7ECAF2`); the still's cloud lets more sky through over about half its area.

---

## 1. Scores, default (PAINTED) mode

| Group | Critique 3 | Critique 4 |
|---|---|---|
| Named views (37) | 8.1 | **8.2** |
| Ring pitch 5 deg | 8.0 | **8.2** |
| Ring pitch 25 deg | 7.6 | **8.0** |
| Ring pitch 50 deg | 7.4 | **7.4** |
| Straight up | 7.0 | **7.0** |
| fov 70 wides | 7.7 | **7.6** |
| **These 83 views** | 7.8 | **7.9** |
| fov 14 frames that contain a cloud (16) | 6.1 | **6.2** |
| Heaps at fov 40 | 6.5-7 | **6.5-7** (painted); 5-6 (cut) |

The yardstick changed this round (aired still, not landscape), so cloud scores are not strictly comparable with
critique 3. Against the still, critique 3's cut clouds would score about 5.5-6 at fov 40.

Selected views (painted):

| View | C3 | C4 | Note |
|---|---|---|---|
| hero, front, southfar, w15 az -90 and the other cloudless views | 8.5-9 | 8.5-9 | unchanged |
| farE, farNE | 7 | 7.5 | heapA cropped by the top edge with puffB: closest to the reference's arrangement |
| treeW2 | 7 | 7.5 | soft heap behind crisp leaves, as in the still; its straight right flank still shows |
| farSW, farW, treeN, castle | 7-7.5 | 8-8.5 | now plain or one faint row |
| rim, westwall, birds, farS | 7-7.5 | 7.5 | |
| ring p25 az -30 / 0 | 6.5 / 6.5 | 7 / 7 | heapA |
| ring p25 az 120 / 150 | 7 / 7 | 6.5 / 7 | base sliver at top; heapE whole and centred |
| ring p50 az 90, 120, 150 | 7-7.5 | 7 | heap crowns at the bottom edge |
| w15 az 30 / 90 / 150 | 8 / 7 / 7.5 | 7.5 / 7.5 / 7.5 | |
| fov 14 heapA crown / base / lee / tail | 6.5 / 5.5 / 6.5 / 5 | 6.5 / 4.5 / 6.5 / 5.5 | base: S ribbon |
| fov 14 heapE mid / base / crown / tail / windward | 6 / 5 / 6.5 / 5 / 6.5 | 6 / 4.5 / 7 / 6 / 6.5 | base: smooth ramp with a pale blob |
| fov 14 heapG crown / base / mid | 6 / 4.5 / 6 | 7 / 4.5 / 6 | base: mountain-range wave |
| fov 14 puffB / flatA / rowA / flatB | 6 / 8 / 6.5 / 7.5 | 6.5 / 8 / 6.5 / 7.5 | |

## 2. Per-cel scores, both modes (against the aired still)

| Cel | PAINTED | CUT | Note |
|---|---|---|---|
| heapA | 7 | 6 | painted: good knob and shoulders; S-ribbon tail. cut: banded base reads as water |
| heapE | 7 | 6 | painted: tidy hill, one band. cut: best of the cut heaps, still a cel cloud |
| heapG | 6.5 | 5 | painted: animal outline, udder base. cut: flat lid on top, grey slab |
| puffB | 6.5 | 5.5 | painted: smooth bean. cut: sticker |
| rowA | 6.5 | 6.5 | identical in both modes (soft below 9 deg) |
| flatA | 8 | 8 | identical; on-model |
| flatB | 7.5 | 7.5 | identical; on-model |

## 3. Motion, default mode

- Pan fov 14, 24 frames at 0.5 px per frame: rigid; edge residual 1.1 code values, no edge pixel over 25.
- Pan fov 40, 24 frames at 0.36 px per frame: residual 3.4, 0-2 edge pixels over 25 per step (critique 3's cut edge:
  71-99). The soft edge removes the sub-pixel crawl. This is a second, practical argument for PAINTED.
- Zoom fov 50 to 14 in 24 steps, rescaled to one angular size: consecutive steps differ by grain only (mean 1.34-1.39,
  max 8-15, no pixel over 20). End to end (fov 50 vs 14) 611 pixels differ by more than 20: the pixel-bounded
  softness re-lays gradually across the range, with no pop at any step.
- Time 3 s vs 3.5 s: max difference 4 code values. No boiling.
- Sway: hero clean at t = 0, 720, 1440, 2160 s; the heapE frame holds its composition with the cloud shifting a few
  degrees, shape unchanged. My fov 14 time pair was aimed at a mostly empty patch, so I have no sub-degree
  measurement of the sway this round.
- Not tested: real-time video.

---

## 4. Fixes, ranked (all for PAINTED; delete or park CUT)

### 1. Remove the doubled contour at the base and tail (S ribbon)

Views: `cu-heapAbase`, `cu-heapAwind`, `cu-E40` bottom left, `cu-heapEbase`, `cu-heapGbase`.

- An inner line runs parallel to the lower edge. It comes from a second threshold (the passage or the wet ramp)
  following the same distance field as the cover. Below the base line, drive nothing but `cover` from `k.r`: fade
  the passage term out with `1 - smoothstep(0.0, 0.25, baseDepth)` so no second iso-line of the same field exists.
- heapA's tail: drop the curved shelf circles; use 3-4 separate soft tufts, sizes 1 : 0.6 : 0.35 : 0.2, gaps
  growing, each a single dab, on a line rising 3-5 deg.

### 2. Base: streaming tufts, not hanging lobes

- Bake a nearly level base, then erode it with noise sampled in sheared coordinates
  (`x' = x + 0.6 * y`) so tufts lean to lee; noise feature size 0.5-0.8 deg, amplitude 0.6-0.9 deg (now a smooth
  3-5 deg wave).
- Alpha ramp over the lowest 1.0-1.8 deg of the cloud, monotone, multiplied by the dab field so it frays; target
  feather 25-50 px at 1280 wide (the still: 2-4% of frame width).
- No rounded lobe below the base line; remove the "drips".

### 3. Open the outline: bays and satellites

- Per heap, subtract 3-5 sky bays at lobe junctions: soft-edged ellipses, depth 0.25-0.4 of the neighbouring lobe
  radius, width 0.15-0.3 of it, axes tilted 20-40 deg off vertical. At least one bay on the lee flank and one
  near the base.
- Add 2-4 satellite tufts 0.3-0.8 deg outside the outline (radius 0.05-0.1 of the main lobe), half of them
  joined to the body by a thin wisp.
- heapE: break the tidy hill by making scallop radii skewed (one 0.35, two 0.2, rest 0.1-0.14 of the lobe) and
  dropping the right shoulder 15%.
- heapG: remove the left "snout" lobe or merge it upward (`[-0.45, 0.28, 0.55]` to `[-0.35, 0.3, 0.75]`).

### 4. Softness from dabs, with varying width

- Edge displacement by two dab octaves fixed to the cloud: features 0.5 deg (amplitude 0.25 deg) and 0.15 deg
  (amplitude 0.08 deg). Edge half-width `w = clamp(0.10 deg, 2 px, 9 px)` on the crown, modulated along the
  outline by low-frequency noise from 0.6x to 2.5x so stretches go from fairly firm to lost.
- Keep the present pixel clamps so the long lens does not turn the crown to fog.

### 5. Interior mottling instead of one band

- `body *= 1.0 + (dab05 - 0.5) * 0.10 + (dab15 - 0.5) * 0.05` using the same two dab octaves.
- Replace the single passage with 3-5 irregular thin patches from a thresholded fbm
  (`smoothstep(0.52, 0.70, fbm(p * 1.3))`, alpha 0.86 down to 0.66), denser in the lower and lee 60%, none within
  1 deg of the crown. No patch boundary straight or level (fixes heapG's band).
- Lower overall body opacity from about 0.86 to 0.82 so the cloud takes more of the sky's hue, as in the still.

### 6. Crop the masses with the frame

- The still's mass spans about 40% of frame width and is cut by the top and right edges. At fov 32 a level frame
  tops out near 18-20 deg of elevation.
- heapE: `{ az: 146, el: 19, w: 46 }` so level south-west frames cut through its upper half.
- heapA: `{ az: -12, el: 18, w: 36 }` (already cropped in farE and farNE; keep that).
- heapG: leave high (el 36), but after fixes 1-2; it is the cloud most often seen from its base.

### 7. Puff

- puffB as in the still: one fuzzy blot (two overlapping dabs, 1 : 0.7) with 2-3 small wisps trailing to one
  side, edge half-width 5-8 px, no flat underside.

## 5. Best and worst

Best: `wide-w15_-90`, `southfar` 9; hero family 8.5; best cloudy frames `farNE` / `farE` 7.5, `cu-flatA` 8,
`treeW2` 7.5.

Worst: `cu-heapAbase`, `cu-heapEbase`, `cu-heapGbase` 4.5; `cu-heapAwind` 5.5; `ring-r25_120` 6.5.

What takes the best heap frame (farNE / farE with heapA and puffB, now 7.5) to 9: fixes 1-5 on heapA
(no ribbon, streaming base, two or three bays, dab-built edge, mottled body) and the fuzzy puff of fix 7. The
composition there already matches the reference.

## 6. What was and was not opened

Opened at full size: the reference still; six crops of it; Appetit Region crop; the agent's three side-by-sides;
matched-scale triptychs for heapA, heapE, heapG; native-scale crown, base and puff triptychs; fov 40 frames of
all seven placed clouds in both modes (14 frames; flatB's frame did not contain the cloud in either mode);
all 16 painted fov 14 close-ups; named farNE and treeW2 in both modes; named farE, farSW, farW, farS, treeN, rim,
castle, westwall, birds (painted).

Seen only in reduced montages: the other 46 stills (800x450 each); the 16 cut fov 14 close-ups; cut named views
(11) and cut `w15_150`; rings at pitch 5 and 25 in both modes and pitch 50 (painted); 24 further painted named
views; nine fov 70 wides; lens/silhouette series in both modes (9 frames each); tilt series D; zoom quad; sway and
hero time strips.

Not opened: `Stark_s_village` crop, `cu-*26` / `cuX-*26` full frames (used only inside the native triptychs),
tilt series C, `ring-up50/up70`, `wide-wup`, `wideX-w15_-30/90`, `cels.png`, individual pan/zoom/time frames
(numeric only), named stepB, haloN, walkW, walkE, doorout, drift, driftE, meadow, hillN, hillW. Ring and wide
scores for cloudless directions were carried from the montages. No real-time video, no web search.
