# Critique 3 - motion audit

Same method as `critique-1-motion.md` / `critique-2-motion.md`: 1280x720 on the Radeon 780M (headless Chrome,
Vulkan ANGLE), frozen-time sequences, judged from contact sheets, crops and difference images - not from
real-time video. "Sub-pixel residual" = % of pixels off by more than 24/255 after a half-pixel pan
(`tools/subpx.mjs`). "Per tick" = % of pixels changing by more than 24/255 per 1/12 s with the camera still
(`tools/mdiff.mjs --dt=0.0834`). Nothing under `src/` or `tools/` was edited. All images are `shots/m3-*`.

## Which build was measured (read this first)

The source changed under the audit three times (other agents were editing):

| Build | Taken | Differs from the previous one in |
|---|---|---|
| A | 17:02 | (start of audit) |
| **B** | 17:51 | `stone.js` (17:37), `terrain.js`, `extra/grass.js`, `extra/grass-atlas.js` (17:47-17:48) |
| C | 18:20 | `build.js`, `ruin.js`, `sky.js`, `stone.js`, `world.js`, `extra/far.js`, `far-tex.js`, `props.js`, `tree.js` |

Every number and image in this file is from **build B**, rendered from a frozen private copy of the source
(so it cannot drift mid-run), unless marked A or C. Build C was only spot-checked (the items marked "C");
it had not changed again by 18:28. Rendering is deterministic on B (`m3-floor-md.png`, 0 difference).

Crops for three of the old probes were not written down in critique 2. I recovered them by template-matching
the old images against current full frames (hero tick `280,120,640,360`; inside tick `320,240,640,360`;
masonry `520,240,240,160`). The match is approximate because the scene has changed, so treat those three
rows as comparable to about +/- 20%.

---

## 1. Before -> now

| # | Metric (same camera as critique 2) | Critique 2 | Now (B) | Verdict |
|---|---|---|---|---|
| 1 | Brush marks on the 12 m -> 5 m trunk dolly | marks stay put | marks stay put (`m3-trunk-oct-final-md.png`, 12 frames) | still fixed |
| 2 | Tufts on approach (25 m -> 3 m) | world size kept, colour dissolve | same (`m3-tuftgrow-md.png`, `m3-tuftnear-md.png`) | unchanged |
| 3a | Canopy sub-pixel residual | 1.52% (2.1% `msaa=0`) | 1.17% (1.75% `msaa=0`); C: 1.15% | slightly better |
| 3b | Grass/flower sub-pixel residual | 4.87% (8.6% `msaa=0`) | 3.08% (5.77% `msaa=0`, 8.65% `kuwahara=0`); A: 2.94%; C: 3.36% | better, still the worst area |
| 3c | Meadow distance | 0.06% | 0.002% | better |
| 3d | Far landscape (farSE) | 0.26% | 0.35% | same |
| 4 | Hero wall residual mean, lines on / `line=0` | 1.43 / 1.26 (0.90% of px) | 1.26 / 1.09 (0.74%); C: 1.38 / 1.22 (0.79%) | same; line share unchanged at ~0.16 |
| 5 | Leaf cards near the camera | leaves up to ~50 px, no polygons | single leaves fine, but whole flat leaf MASSES of 300-400 px appear (see P4) | partly regressed |
| 6a | 12 fps twinkle, flower/tuft close view | 1.31-1.51% per tick | 1.57-1.68% (A: 1.43-1.53%, C: 1.57-1.64%) | unchanged / slightly worse |
| 6b | 12 fps, hero view (crop recovered) | 0.14-0.18% | 0.09-0.15% | same |
| 6c | 12 fps, nave interior (crop recovered) | 0.17-0.23% | 0.10-0.20% | same |
| 7 | Trunk rim on a 90 degree orbit | stays on the sun side | stays on the sun side (`m3-rim-orbit-md.png`) | still fixed |
| N1 | Masonry sub-pixel at ~60 / 38 / 17 / 6 m | 1.65 / 1.50 / 1.24 / 1.37% | 1.74 / 1.48 / 1.31 / 1.41% | unchanged, flat with distance |
| N1 | same, `kuwahara=0` | 2.51 / 2.09 / 1.93 / 2.47% | 2.26 / 1.85 / 1.80 / 1.58% | filter still helps everywhere |
| N2 | Foreground tuft band frontier | fixed radius, "tide" | fade distance now carries world noise (shader); no ring visible in `m3-band-approach-md.png` | improved (one sequence only) |
| N3 | Dense foreground grass crop | 7.5% | **not reproducible** - the old camera position was never recorded. Substitute crop at view `walkW`: 0.91% | unknown |
| N7 | Frame time | see section 4 | see section 4 | 1080p still at or above 16.7 ms |

Critique 2's open list, re-ranked: flower/tuft twinkle and edge crawl is still open (rows 3b, 6a); 1080p frame
time is still open; the band frontier looks resolved; the nave tick regression did not reproduce.

---

## 2. New camera moves

Driven by a small script (kept outside the project, it only calls `window.__app.setView`): an overview sheet
`m3-<move>-ov.png`, and per fine segment 16 frames at 60 fps walking speed (5.3 cm per frame) or 1.5 px per
frame for pans, giving `m3-<move>-f<k>.png` (crops + difference) and `m3-<move>-b<k>.png` (map of pixels that
change in at least half of the steps). Speeds differ between moves, so the percentages below describe each move
and must not be compared across moves.

| Move | Path | Changed px per frame (median) | What the sheets show |
|---|---|---|---|
| `nose` / `noseOut` | dolly at 1/3 walking speed to 0.4 m from the west arcade, inside and outside | 1.5-3.0% (5.1% in the last metre) | marks only enlarge; no pop, no moire. At < 1 m the face is a flat grey with a few bristle dabs |
| `strafe` / `strafeE` | sideways along the west and east meadow, eye height | 5.8-9.7% / 1.0% | flower drift and bush edges change on every frame (P2); far hills slide cleanly |
| `orbit` / `orbitFar` | 200 degrees round the big tree at 7 m; 120 degrees at 22 m | 7.0-12.4% / 5.5% | lit side of the trunk and bark marks stay put; leaf masses hold; one straight twig line (P8) |
| `door` / `backarch` | walk in through the south door to the nave; out through the north arch | 2.6-6.6% / 3.8-6.4% | no pop at either opening; shadow shapes steady; pale tree group against the north hill (P7) |
| `pan` / `panW` | fov 14, 1.5 px per frame over the village plain and the western hills | 0.6-1.6% / 2.0-4.1% | cleanest move of all: sub-pixel residual 0.15-0.62% (plain), 0.02-0.95% (hills); `kuwahara=0` changes nothing |
| `tilt` | -55 -> +80 degrees under the crown, 0.4 degrees per frame | 14-22% | nothing pops; see P1 for the tufts at the bottom of the tilt |
| `rise` / `riseMeadow` | straight up 0.5 -> 20 m at the hero spot and over the west meadow | 6.3 -> 3.0% / 6.7 -> 0.6% | tufts dissolve smoothly with height; flat leaf mass at 3-5 m (P4); meadow from 20 m is a calm wash |
| `turn` / `turnOut` | 360 degrees at the origin and at (-20, 20), 1.5 px per frame | 2.1-6.3% / 3.2-6.2% | sub-pixel residual by heading: 0.1-0.5% facing masonry, 1.5-3.0% where canopy or grass fills the crop |
| `pathwalk`, `edge` (extra) | down the path to 46 m; west to the edge of the walkable area | 6.2 -> 0.3% / 4.9 -> 0.4% | far cards hold together 55 m from the origin; no card reveals itself |
| `downturn` / `downroll`, `upturn` / `uproll` (extra) | yaw in place looking 62 / 84 degrees down, and up | 5.1% / 12.6% per 0.5 degrees | P1 |

---

## 3. What a viewer notices, worst first

### P1. Grass tufts and flowers turn with the camera when you look down - NOTICEABLE, the clearest "sprite" tell
- `m3-downroll-ov.png` (84 degrees down, yaw 0 / 30 / 60 degrees), `m3-downturn-ov.png` (62 degrees down),
  `m3-tuftpitch-md.png` (camera rising 0.5 -> 6.5 m over one tuft). Confirmed on build C
  (`m3-downroll-t0-live.png`, `-t1-live.png`).
- The ground strokes and the dark patches under the tufts rotate with the yaw, as they should. Every tuft stays
  pointing at the top of the screen in all frames. At 60 fps each tuft spins about its root against the ground,
  all in unison. Rising or pitching down, the tufts stay full-height fans laid flat on the ground toward
  screen-up instead of foreshortening.
- Critique 2 found "no change with yaw" - true only with a level camera.
- Owner: `src/extra/grass.js`. `TUFT_VS` builds the card from `uCamRight` / `uCamUp`, which depend on camera
  orientation; flowers and ground strokes do the same.
- Fix: make the axes a function of position only. `U = vec3(0,1,0)` (or the terrain normal),
  `R = normalize(cross(U, toCam))`. That is unchanged by turning in place and foreshortens correctly from above.
  From steep elevations (`toCam.y / dist > 0.6`) the fan gets thin: blend to a second card lying in the ground
  plane with a fixed per-tuft world yaw (`rnd * 6.28`), cross-faded by elevation. Flowers already go to a 1.6:1
  dab from above; give that dab world-fixed axes too.

### P2. Foreground flowers and blades still crawl and twinkle - NOTICEABLE (open since critique 1)
- Camera still: 1.57-1.68% of pixels change on every 1/12 s tick in the close flower view
  (`m3-t-shadowgrass-md.png`); every flower and blade outline lights up in the difference rows.
- Camera creeping: 3.1% residual in the hero grass crop, 8.7% without the paint filter, 5.8% without MSAA
  (`m3-sp-heroGrass-sp.png`). Strafing the west meadow, 3.8% of the whole frame changes in at least half of
  the frames, all of it in the flower drift and the bush edge (`m3-strafe-b0.png`).
- Owner: `src/extra/grass.js`; the paint filter in `src/pipeline.js` is what currently halves it.
- Fix: (a) the sway gate `smoothstep(1.0, 2.2, amplitude_px)` lets 1-2 px sways through, which is exactly
  the range that reads as crawl - raise it to 3-4 px, or quantise the offset to whole pixels;
  (b) far flower dashes are 2-3 px tall: merge them into the ground wash earlier (lower `FLOWER_FADE`) and
  let a world-anchored drift colour in `src/terrain.js` carry the band beyond ~20 m;
  (c) keep the thinner tapered blades of build B away from 1 px: clamp blade width to >= 1.5 px in the atlas
  lookup (bias the mip) at band distance.

### P3. Leaf shadow on the masonry jumps in lumps on some ticks - NOTICEABLE where it happens
- `m3-shadowtick-md.png`: camera still, 9 m from the west arcade. Per tick, % of a 400 px crop that changes:
  B 0.27, 0.02, 0.00, 0.51, 1.78; C 1.75, 0.00, 0.00, 0.05, 2.73. Whole lobes of the lit patch appear and
  vanish on one tick, then nothing moves for two or three ticks. It reads as popping, not as held sway.
- Within this audit the staircase edge of that shadow was fixed: A showed texel-sized rectangles
  (seen at 17:05), B and C show rounded lobes (`m3-shadowdolly-md.png`). The popping is what is left.
- Owner: `src/extra/tree.js` (leaf cards are drawn into the shadow map with `uWind`) together with
  `src/stone.js` (`shadowSpline` thresholds a coarse lattice, so a 3 cm sway flips whole lattice cells).
- Fix: render the shadow pass with `uWind = 0` (a painted background has still cast shadows; the leaves can
  keep nodding). `main.js` then only needs to re-render the shadow map once, which also saves the 12 Hz
  shadow pass.

### P4. Flat leaf masses hundreds of pixels wide near the lens - NOTICEABLE, fly mode and low boughs
- `m3-rise-blob-md.png` (hero spot, 3.2 -> 5.6 m up; C: `m3-live-rise-blob-md.png`), `m3-rise-ov.png` frame 2,
  `m3-fly-md.png` frames 5-6. A single flat dark-green shape with straight polygon edges covers up to 45% of a
  640 px crop for about a metre of travel, then vanishes.
- Owner: `src/extra/tree.js`, `CARD_VS`: base-mass cards (`variant < 3.5`) are allowed `2.1 * uMaxPx` and are
  not faded.
- Fix: fade base masses by dithered discard between 4 m and 2 m from the camera (individual leaf cards already
  close the gap), or cap them at `uMaxPx` like the rest.

### P5. Canopy: one leaf-sized patch flips every tick; leaf cards are screen-aligned - MINOR
- `m3-t-canopy-md.png`: 1.5-1.9% per tick in a hero canopy crop (outlines of nodding sprays, expected), plus one
  filled leaf-sized blob at the same place on ticks 1 and 3 - a depth-order swap between two cards that
  repeats at 6 Hz.
- Looking up and turning: `m3-uproll-ov.png`, `m3-upturn-f0.png`. Cards use `uCamRight` / `uCamUp` like the
  tufts, so by the shader they counter-rotate against the branches. I could not see it in the sheets (leaf
  masses are too irregular to read an orientation), so this half is unconfirmed.
- Owner: `src/extra/tree.js`. Fix: separate the wind offset of neighbouring cards along the view axis less
  than their depth gap (or sort by a fixed per-card depth bias), and build card axes from the direction to the
  camera position rather than the camera orientation.

### P6. The camera walks into stone - MINOR, but it destroys the picture when it happens
- `m3-noseOut-ov.png` frame 6, `m3-orbit-ov.png` frame 1: there is no collision, and with a 0.3 m near plane the
  view from inside a pier is large untextured flat faces.
- Owner: `src/main.js` (`move()`), not in the list given. Fix: keep the camera 0.5 m outside the block boxes
  that `src/ruin.js` already knows.

### P7. Pale tree group in front of the north hill - MINOR
- `m3-backarch-ov.png` frames 2-6; still there on C (`m3-backarch-t0.6-live.png`, right of centre). A group of
  crowns paler than the hill it overlaps slides across that hill with parallax and reads as a translucent
  overlay.
- Owner: `src/extra/far.js` (baked haze step per card). Fix: give a card the haze step of the ground it stands
  on and never a paler one than the plane directly behind it.

### P8. Things seen once, not followed up - MINOR / UNVERIFIED
- A dead-straight dark twig about 300 px long from the crown toward the ruin (`m3-orbit-ov.png` frames 4-9);
  reads as a wire. Owner `src/extra/tree.js`.
- A faint straight horizontal hairline in the sky just above the far ranges with the long lens
  (`m3-skyline-f0.png`, also `m3-turn-b2.png`). It stays on the horizon. Owner unknown (`src/sky.js` or
  `src/extra/far.js`).
- Mist patches at the hill feet have a comb-like serrated edge at fov 14 (`m3-panW-t1.png`). Owner
  `src/extra/far.js`.
- Build C only: a stone slab hangs in the air beside the west arcade (`m3-orbit-t0.5-live.png`, top right).
  Owner `src/ruin.js` or `src/extra/props.js` (both changed after B). Not a motion problem; reported because
  nothing else would catch it.

### What is solid
- Masonry: flat 1.3-1.7% residual from 60 m to 6 m, no moire, no z-fighting, joints simply enlarge down to
  0.4 m.
- Long-lens pans: lowest residuals measured (0.02-0.95%). Far cards, village and ranges hold under 55 m of
  translation and a 20 m climb.
- Paint filter: no flicker found. It lowers the residual in 19 of 21 probes and is neutral in the other two
  (flat plain at fov 14).
- Doorways: nothing pops walking through either opening.
- Ink lines: `line=0` changes the residual by 0.17 or less everywhere.
- Brush marks on trunk and ground: stable on dolly, orbit and climb.

---

## 4. Frame time

`tools/perf2.mjs` (times `pipe.render` directly with a `readPixels` sync, 5 frames x 14 rounds, reports the
minimum and the median). Setups: full pipeline, and `kuwahara = 0`. Six runs between 18:14 and 18:20, three on
build C and three on build B; the two builds do not differ beyond the noise.

| View | 1280x720 min (range over 6 runs) | 1280x720 median | 1920x1080 min | 1920x1080 median |
|---|---|---|---|---|
| hero | 7.9-9.0 ms (one run 12.4) | 8.9-9.8 (two runs 34-43) | 16.0-16.7 ms (one run 18.4) | 16.4-19.9 (one run 80) |
| inside | 7.4-8.7 ms (one run 11.1) | 8.1-9.5 (one run 51) | 13.4-15.1 ms | 14.7-16.1 |
| feet | 4.7-6.0 ms | 5.2-6.6 | 9.4-10.6 ms | 10.3-11.6 (one run 37) |

Paint filter cost: 1.2-2.2 ms at 720p, 2.8-4.2 ms at 1080p.

How noisy: in quiet runs the minimum repeats within about +/- 8%. When the other agent was rendering, medians
rose 4-10x (up to 87 ms) and one earlier run gave minimums of 51 and 83 ms for hero and inside at 720p; I
discarded that run. The minimums above are the trustworthy figure (best case with the GPU to itself); the
medians are not. These are GPU-finish times for the scene passes only: they exclude the 12 Hz shadow pass and
browser compositing, so real frame time is somewhat higher. `tools/shot.mjs` (rAF-based) gave 8.3 ms for hero
at 720p on C against 10.0 ms in critique 2 - different tool from the table above, single sample.

Reading: 720p is comfortably inside 16.7 ms. At 1080p hero sits at 16-17 ms before the shadow pass, i.e.
it will miss 60 fps; inside is marginal; feet is fine.

---

## 5. Not verified
- Anything in real time. Every judgement of "what a viewer would notice" is inferred from stills and
  difference images.
- Build C beyond the spot checks named above (P1, P3, P4, P7, rows 3a/3b/4/6a). The full set of moves was not
  re-run after 18:14.
- Critique 2's N3 number (old camera position unknown) and its N6 haze-ring check (not repeated).
- Leaf-card counter-rotation when looking up (P5): shader says yes, images inconclusive.
- Whether the paint filter flickers during a zoom: the zoom test (`m3-zoom-f0.png`) changes 19% of pixels per
  step from the magnification itself, so filter flicker cannot be separated.
- Resolutions other than 720p for the stability metrics; 1080p was only timed.
