# Sky critique 5 (independent, same view set and method; PAINTED mode, judged against the aired still)

Scope: `src/sky.js` + `src/extra/sky-clouds.js`, current main build (sky round 7). Nothing in `src/` was edited.
Stills rendered with `?wind=0&cshadow=0` so scores compare with critique 4; a separate batch (`shots/shd-*`) was
rendered with the defaults (wind and cloud shadows on).
Renders: `.work/skycrit/shots/`; earlier rounds in `shots-c1` .. `shots-c4`; montages and crops in `.work/skycrit/m/`.
Reference: `Gr_e_Forest_village_EP3.png` at matched scale (`m/tri_E40.png`, `tri_A40.png`, `tri_G40.png`) and at
native pixels (`m/nat_crown.png`, `nat_base.png`, `nat_puff.png`).

## 0. Result

| Group | Critique 4 | Critique 5 |
|---|---|---|
| Named views (37) | 8.2 | **8.35** |
| Ring pitch 5 deg | 8.2 | **8.3** |
| Ring pitch 25 deg | 8.0 | **8.2** |
| Ring pitch 50 deg | 7.4 | **7.4** |
| Straight up | 7.0 | **7.0** |
| fov 70 wides | 7.6 | **7.8** |
| **These 83 views** | 7.9 | **8.1** |
| fov 14 frames that contain a cloud (16) | 6.2 | **7.3** |
| Heaps at fov 40 | 6.5-7 | **7-8** |

**Heap frames now reach 8:** `farE`, `farNE`, `farSW`, `cu-E40`, `cu-heapEcrown`, `wide-w15_150`, `wide-w15_30`.
This is the largest single-round gain in the clouds themselves. Beside the still, heapE is now recognisably the
same kind of object: soft dabbed outline, bays, fraying base streaming to lee, mottled body.

Claims checked:

| Claim | Verdict |
|---|---|
| Base one alpha ramp, sheared erosion, frayed by dabs; no doubled contour, no udders | True. The S ribbon and inner contour are gone on all three heaps. |
| heapA lee end = 4 separate tufts on a rising line | True (`cu-heapAwind`, `cu-A40`). Too regular: reads as a string of beads / a tail. |
| Up to 3 bays + 2-4 satellites per heap | True. Some satellites are too firm and too shaped (see faults). |
| Softness from two cloud-fixed dab octaves, varying width, lost stretches | True and visible (`cu-heapEcrown`: firm to lost along one lobe). |
| Interior mottling + thin patches; body 0.82 | True; subtle. heapE still reads as one broad lower passage. |
| heapE and heapA cropped by level frames | True (`farSW`, `farW`, `farE`, `farNE`, `rim`, ring pitch 5 az 0/120/150). |
| puffB a fuzzy blot with wisps | True; close to the still's puff (`m/nat_puff.png`). |

## 1. What still differs from the still (the agent's doubts, ruled)

| Doubt | Verdict |
|---|---|
| Heaps smaller / more broken than the reference's single large mass with broad round lobes | Confirmed; now the main difference. The still's mass is 4-5 broad soft lobes with almost no fine edge detail; ours has many small bumps, notches and crumbs at 0.1-0.3 deg. At fov 14 the fine fuzz begins to read as a photographed cloud rather than gouache. |
| heapA seen whole reads as a creature (raised lobe + beak wisp) | Confirmed (`cu-A40`, `ring-r25_0`, `shd-wm30`): head lobe, a pointed "beak" wisp at upper right, body, and a tail of four tufts. Cropped by a level frame (farE, farNE) it does not read that way. |
| Bays are smooth round notches with firm rims | Partly. heapA's two bays (`cu-heapAlee`) are round with a firmer rim than the rest of the edge; heapE's are fine. |
| heapG has a firm diamond satellite | Confirmed (`cu-heapGcrown`, `cu-G40`); also a heart-shaped pair at its left end. |
| heapE hook at lower windward end, one broad passage | Hook confirmed (lower left of `cu-E40`: a lobe curling down to a point). One passage: confirmed, minor. |
| rowA unchanged smooth blobs | Confirmed; now the least painted object in the sky (6.5), visibly a different make from the heaps above it (`farSW`, `shd-w150`). |
| treeW2: heapE right of the crown, larger; competing? | No. Soft pale mass behind crisp foliage is exactly the still's arrangement; 8. The thin "horn" wisp at its upper right is the only thing that draws the eye. |
| fov 40 pan ~40 px over threshold | Not reproduced at my threshold: 0-4 edge pixels over 25 code values per 0.36 px step, edge residual 2.4. Not visible as shimmer. |

Additional:

- Thin curved wisps standing up from the crown (heapE upper left, heapA top) read as antennae or horns. The
  still's wisps are short, blunt and lie along the outline.
- The base fringe is one direction and one length everywhere: at fov 14 it reads slightly as rain or a combed
  edge (`cu-heapGbase`, `cu-heapAbase`).
- Our white is still brighter and more opaque than the still's (`m/tri_E40.png`): higher cloud/sky contrast.

## 2. Per-cel scores

| Cel | Critique 4 | Critique 5 | Note |
|---|---|---|---|
| heapA | 7 | 7.5 | 8 when cropped; 7 whole (creature, bead tail) |
| heapE | 7 | 8 | best cloud so far; antenna wisp and hook |
| heapG | 6.5 | 7 | diamond and heart satellites; most broken outline |
| puffB | 6.5 | 7.5 | |
| rowA | 6.5 | 6.5 | unchanged |
| flatA | 8 | 8 | |
| flatB | 7.5 | 7.5 | |

Selected views: farE 7.5 to 8; farNE 7.5 to 8; farSW 8; farW 8; farS 8; rim 8; treeW2 7.5 to 8; ring p25 az -30/0
7 to 7.5; az 120/150 7.5/8; w45 az 30 7; fov 14: heapA crown/base/lee/tail 7/7/7.5/7, heapE mid/base/crown/lee/
windward 7.5/7.5/8/6.5/7.5, heapG crown/base/mid 7/7.5/7, puffB 7.5, flatA 8, rowA 6.5, flatB 7.5.

## 3. Motion (wind and shadows off)

- Pan fov 14 (0.5 px per frame, 24 frames): rigid, edge residual 1.1, no edge pixel over 25.
- Pan fov 40 (0.36 px per frame): residual 2.4, 0-4 edge pixels over 25 per step.
- Zoom fov 50 to 14 in 24 steps at matched angular size: grain-level between steps (max 8-21, at most 5 pixels
  over 20, only in the first step); no pop.
- Sway: hero clean at t = 0, 720, 1440, 2160 s; heapE frame keeps its composition.
- Not tested: real-time video.

## 4. Sky clouds and ground shadows: one weather?

Looked at: farE, farSW and hero with defaults at t = 23 s (full size); two fov 70 views at t = 3, 23, 43 s
(thumbnails).

- In these frames the cloud shadows are barely perceptible: one soft cool patch at the left edge of the meadow
  in `shd-fSW`, nothing I could point to in hero or farE, no visible change across 40 s in the wides. At this
  strength nothing contradicts the sky; the picture reads as fair weather with a few cumulus.
- The latent mismatch is quantitative, not visible yet: seven sparse clouds, half the sky empty, against
  15-20% ground coverage moving at 6.5 m/s while the sky clouds are almost still. If shadow strength is ever
  raised, shade will cross the meadow under the empty northern sky and the two will read as separate systems.
- Recommendation if they are to be felt: coverage 8-12%, speed 3-4 m/s, and let the sky sway share the heading
  (clouds creeping ENE at about 0.01 deg/s rather than swaying back). I did not judge shadow motion in video.

## 5. Fixes, ranked

1. **Broaden the masses, calm the fine edge.** Fine dab octave amplitude 0.08 deg to 0.05 deg; scallop radii no
   smaller than 0.25 of the lobe; 4-5 lobes per heap; bays at most 2, wedge-shaped (width 0.3-0.5 of lobe radius
   at the mouth, tapering), rim softness equal to the neighbouring edge (no firmer). Target at fov 14: no
   feature under 0.4 deg with a firm edge.
2. **Remove antennae.** No wisp standing off the crown at more than 30 deg to the local outline; wisps at most
   1.5 deg long, at least 0.5 deg thick, lying along the lee flank or base. Delete heapE's upper-left wisp and
   heapA's "beak" at upper right.
3. **Satellites.** At most 2 per heap, on the lee or under side only, half-width at least 6 px at fov 40,
   round-soft (single dab); delete heapG's diamond and the heart pair at its left end.
4. **heapA whole.** Lee tufts 4 to 2, unequal (1 : 0.4), the nearer one touching the body; lower the raised
   lobe's lift 15% so the profile is a heap, not a head.
5. **Base fringe.** Vary shear 0.3-0.9 and streak length x0.5-1.5 along the base with low-frequency noise;
   reduce streak contrast by a third.
6. **heapE.** Fill the hook: add a lobe `r 0.18` under the windward end so the outline closes on a round, not a
   point. Split the lower passage into two patches of unequal size.
7. **Value.** Body opacity 0.82 to 0.78 and cloud white toward `#E7F9FA`; the still's cloud/sky contrast is
   about 15% lower than ours.
8. **rowA.** Give it the same dab edge at amplitude 0.5 and base fray, or replace it with a `flat` cel.

What takes the best heap frame (heapE at fov 40, farSW/`cu-E40`, now 8) to 9: fixes 1, 2, 6 and 7.

## 6. What was and was not opened

Opened at full size: fov 40 frames of heapA, heapE, heapG, puffB; three matched-scale triptychs; native crown,
base and puff comparisons; fov 14 heapE crown and base, heapA lee, heapG mid; named farE, farNE, treeW2, farSW,
farW, rim, treeN, farS; shadow frames farE, farSW, hero at t = 23 s.

Seen only in reduced montages: the other 12 fov 14 close-ups; all three rings; nine fov 70 wides; 24 further named
views; hero and heapE time strips; six shadow wides.

Not opened: named westwall, birds, castle, hillN, hillW (scores carried from critique 4 where cloudless);
`cu-R40`, `cu-FB40`, `cu-*26` full frames; `ring-up50/up70`, `wide-wup`; all five `sil-*`; other `shd-*` frames (21);
individual pan/zoom/time frames (numeric only); the atlas sheet (not rendered this round). No real-time video, no
web search, no cut-mode renders.
