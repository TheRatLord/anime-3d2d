# Critique 5 - motion audit

Same method as `critique-3-motion.md`: 1280x720 on the Radeon 780M (headless Chrome, Vulkan ANGLE),
frozen-time sequences judged from contact sheets, crops and difference images - not from real-time video.
"Sub-pixel residual" = % of pixels off by more than 24/255 after a half-pixel pan (`tools/subpx.mjs`).
"Per tick" = % of pixels changing by more than 24/255 per 1/12 s with a still camera
(`tools/mdiff.mjs --dt=0.0834`). Nothing under `src/` or `tools/` was edited. Images are `shots/m5-*`;
scripts and logs are in the scratch directory `.../scratchpad/m5/`.

## Which build was measured (read this first)

The source changed under the audit twice. The server caches modules, so each run is one frozen build.

| Build | Loaded | What matters for motion |
|---|---|---|
| **F** | 20:24 | `shift` limit 0.42 rad (24 deg), `tele` default 0, wobble 4 px gated on the stone flag |
| **L** | 20:52 | `main.js` + `pipeline.js` of 20:44: `shift` limit **0.6 rad (34 deg)**, `tele` default **-1 = automatic** (0.5 within 8 m of the chapel centre, fading to 0 at 21 m), wobble **10 px** with a "nearest stone within 3 px" search |
| (later) | 21:30-21:33 | `stone.js`, `terrain.js`, `grass.js`, `tree.js`, `ruin.js`, `build.js`, `props.js`, `sky.js` changed again - **not measured** |

Every probe of critique 3 was run on both F and L. With automatic telephoto the picture from any camera
within 21 m of the chapel is a different picture (camera pulled back, lens narrowed), so for those rows only
F is the like-for-like comparison with critique 3; L is given as "what a user gets by default now".
Rendering is deterministic on both (`m5-floor-md.png`, 0 difference). Images named below are from L unless
marked F (the F set is kept in `scratchpad/m5/F/`).

---

## 1. Audit 3 -> now

| # | Metric (same camera and crop as critique 3) | Audit 3 (build B) | Now F (tele 0) | Now L (default) | Verdict |
|---|---|---|---|---|---|
| 1 | Brush marks on the 12 m -> 5 m trunk dolly | stay put | stay put | stay put (`m5-trunk-oct-final-md.png`) | still fixed |
| 2 | Tufts on approach (25 m -> 3 m) | world size, colour dissolve | same | same (`m5-tuftgrow-md.png`) | unchanged |
| 3a | Canopy sub-pixel residual (`msaa=0`) | 1.17% (1.75%) | 0.85% (1.37%) | 0.92% (1.41%) | better |
| 3b | Grass/flower sub-pixel residual (`msaa=0` / `kuwahara=0`) | 3.08% (5.77 / 8.65) | 1.71% (3.18 / 2.75) | 1.95% (3.45 / 3.11) | **much better** |
| 3c | Meadow distance | 0.002% | 0.24% | 0.24% | worse on paper, still tiny: the crop now holds painted flower masses |
| 3d | Far landscape (farSE) | 0.35% | 0.36% | 0.36% | same |
| 4 | Hero wall residual mean, lines on / `line=0` (% of px) | 1.26 / 1.09 (0.74%) | 1.07 / 1.01 (0.59%) | 1.01 / 0.99 (0.60%) | better; lines now cost 0.02-0.06 |
| 5 | Leaf cards near the camera | flat masses of 300-400 px | none: single leaf marks up to ~50 px (`m5-rise-blob-md.png` F, `m5-fly-md.png` F) | same | **fixed** |
| 6a | 12 fps twinkle, flower/tuft close view | 1.57-1.68% per tick | 0.18-0.19% | 0.30-0.35% (different framing) | **fixed** (8x lower) |
| 6b | 12 fps, hero view | 0.09-0.15% | 0.10-0.11% | 0.10-0.11% | same |
| 6c | 12 fps, nave interior | 0.10-0.20% | 0.11-0.12% | 0.10-0.12% | same |
| 6d | 12 fps, hero canopy crop | 1.5-1.9% + a blob flipping at 6 Hz | 1.51-1.61%, outlines only | same | blob gone |
| 7 | Trunk rim on a 90 degree orbit | sun side | sun side | sun side (`m5-rim-orbit-md.png`) | still fixed |
| N1 | Masonry sub-pixel at ~60 / 38 / 17 / 6 m | 1.74 / 1.48 / 1.31 / 1.41% | 1.27 / 1.17 / 1.41 / 1.09% | 1.35 / 1.28 / 1.43 / 0.84% | slightly better |
| N1 | same, `kuwahara=0` | 2.26 / 1.85 / 1.80 / 1.58% | 2.13 / 2.07 / 2.08 / 1.28% | 2.29 / 2.23 / 2.13 / 1.10% | filter still helps everywhere |
| N2 | Foreground tuft band frontier | no ring | no ring (`m5-band-approach-md.png`) | same | still fixed |
| P1 | Tufts when looking down and yawing (`downturn`, changed px per 0.5 deg) | 5.13% | 1.78% | 1.19% | **fixed** - see 2.1 |
| P3 | Leaf shadow on masonry, per tick (400 px crop) | 0.27, 0.02, 0.00, 0.51, 1.78% | 0, 0, 0, 0, 0% | 0, 0, 0, 0, 0% | **fixed** |
| N7 | Frame time | section 4 | section 4 | section 4 | 1080p hero now 14-16.5 ms |

Moves of critique 3, changed pixels per frame (median, same script): no move got worse by more than noise
except the two noted here. Full list in `scratchpad/m5/all.log` and `F/all.log`.

| Move | Audit 3 | F | L | Note |
|---|---|---|---|---|
| strafe (W meadow) | 5.8 / 9.7%, 3.8% of px changing in half the frames | 5.5 / 10.1%, 2.6% | same | flower drift still the busiest area, see P5 |
| orbit tree 7 m | 7.0 / 12.4% | 6.3 / 10.9% | 7.0 / 11.2% | first overview frame is inside stone (P6) |
| door / backarch | 2.6-6.6 / 3.8-6.4% | 2.3-5.7 / 5.4-7.3% | 2.3-6.0 / 2.0-5.0% | nothing pops at either opening |
| pan (fov 14, plain) | 0.6-1.6%; sub-pixel 0.15-0.62% | 0.9-4.1%; sub-pixel 0.23-2.1% | same | **worse**: the crop now contains near rim shrubs (`m5-sp-pan0.8-sp.png`), all residual is on their leaf edges; the far plain itself is still clean |
| turn at origin | 2.1-6.3% | 3.2-6.3% | 3.5-5.0% | sub-pixel by heading 0.04-3.2% (F), 0.00-2.0% (L) |
| rise / riseMeadow | 6.3->3.0 / 6.7->0.6% | 6.9->3.0 / 7.9->1.4% | same | tufts dissolve smoothly |
| downturn | 5.13% | 1.78% | 1.19% | tufts no longer turn |

---

## 2. The seven specific checks

### 2.1 Grass tufts and flowers oriented from camera position - PASS, with one new behaviour
- Unison spin is gone. `m5-downroll-ov.png` (84 deg down, yaw 0/30/60): tufts and ground strokes rotate
  together. Back-rotation test with `shift=0` (`m5-roll-down-L-tele=0&shift=0.png`): tiles differ by
  **0.08 / 0.08 / 0.03%** after 30/60/90 deg of yaw, i.e. the cards do not depend on view direction at all.
- Rising over a tuft 0 -> 6 m (`m5-tuftpitch2-md.png`): smooth; the fan shortens and the lying clump takes
  over, no pop, no double image.
- Walking over a tuft at eye height (`m5-walkover-md.png`, 14 frames over 10 m; `m5-walkover-fine-md.png`,
  11 cm steps from 2.6 m to 1 m): continuous, no ghosting, no frame where the tuft is missing. But:
  (a) from about 2 m the upright fan is pressed down to 30% while the clump grows, so every tuft visibly
  **bows down as you walk up to it** and stands up again behind you; (b) directly underfoot the clump is one
  flat pale-green star about 250 px across with straight-sided rays (`m5-walkover-md.png` frames 7-8) - it
  reads as a paper cut-out lying on the ground. See P4.
- Per tick the meadow is now almost still (row 6a).

### 2.2 Leaf cards and static leaf shadows - PASS
- Looking straight up and yawing, `shift=0` (`m5-roll-up-L-tele=0&shift=0.png`): 1.02 / 1.08 / 0.47%
  difference after rotating back (aliasing only). Cards are position-only. Critique 3's unconfirmed half of
  P5 is closed.
- Shadows: 0.000% change on every tick on masonry (`m5-shadowtick-md.png`) and nothing but leaf, blade and
  flower outlines on the ground (`m5-t-shadowgrass-md.png`). No shadow popping anywhere.
- Shadows not following the sway: I could not find a frame where it shows. Sprays nod about 3.5 cm; their
  shadow edge on the ground is a lobed contour metres away. Nothing looks wrong.
- Depth-order flip in the canopy (old P5): gone, only outlines change per tick (`m5-t-canopy-md.png`).

### 2.3 New masonry shader - PASS, tone drift is slow
- Element tones (`scratchpad/m5/tone.mjs`: one world point per architectural element, 24 stops along a
  walk; strip `m5-tone-aroundW.png`). Walking 46 m past the west side at 20 m: a shaded pier goes
  119 -> 97 of 255 (-11%) as its plane value goes 0.5 -> 0, spread over about 14 m (4-5 s at walking
  speed); another goes 102 -> 120. Largest rate 0.09 of plane value per 2 m = roughly 3 levels per metre.
  Smooth and monotone in every clean row; **no step**. Because neighbours change at different moments,
  the relative tone of two piers swaps over a few seconds. At running speed (9 m/s) the same change takes
  under a second and should be visible as breathing - not verified in real time.
- Joints and strokes as a wall turns (`m5-wallturn.png`, `m5-wallturnNear.png`, 6.6 deg steps from frontal
  to grazing at 8 m and 3.5 m): marks thin out gradually over the last ~25 degrees, nothing pops.
- Walking round and through (`m5-orbitChapel-*`, `m5-aroundW-*`, `m5-corner-*`, `m5-alongwall-*`,
  `m5-nave-*`, 16 frames at 5.3 cm): max/median step ratio 1.00-1.10 on every segment, i.e. no single-frame
  event. No moire seen at any distance (row N1 is flat from 60 m to 6 m).
- Marks do not swim on the dolly (`m5-nose-*`: 0.3-3.3% per frame, same as critique 3).

### 2.4 Hand wobble - FAIL at silhouettes on build L, neutral on surfaces
- On surfaces it does not crawl. Translation moves, changed px per frame, wobble 1 vs 0 (L): aroundW
  8.31/10.66/11.07 vs 8.18/10.56/10.96; corner 10.25/15.78 vs 10.14/15.69; nave 4.78/5.95/6.52 vs
  4.82/5.90/6.59; orbitChapel 7.96/10.51/6.49 vs 7.90/10.55/6.42. Difference 0-1.5% relative.
- Half-pixel pan residual, wobble 1 vs 0, mean (0..255) and % over 24:

  | Crop | F (4 px) | L (10 px) |
  |---|---|---|
  | arch against sky (inside) | 0.55 / 0.77% vs 0.44 / 0.59% | 0.53 / 0.65% vs 0.30 / 0.44% |
  | west piers | 1.85 / 2.46% vs 1.51 / 2.10% | 1.75 / 2.46% vs 1.44 / 2.16% |
  | hero gable | 1.42 / 0.98% vs 1.34 / 0.92% | 1.31 / 0.66% vs 1.35 / 0.92% |
  | inside, 960x540 | 0.90 / 0.89% vs 0.83 / 0.76% | 0.74 / 0.77% vs 0.73 / 0.78% |
  | hero, 960x540 | - | 1.40 / 1.60% vs 1.30 / 1.41% |
  | flat wall, close | 0.20 / 0.00% vs 0.22 / 0.00% | 0.04 / 0.00% vs 0.03 / 0.00% |

  So: nothing on flat wall, +20-80% in mean residual wherever a stone silhouette is in the crop.
- Why (L), seen at 3x: `m5-wobA.png`, `m5-wobB.png`, `m5-wobseqArch1.png`. With wobble the stone/sky
  outline is a **hard one-pixel staircase with no anti-aliasing**; with `wobble=0` the same edge is smooth.
  The displacement can reach about 7 px but stone is only searched for 3 px away on four diagonal taps, so
  the moved outline is clipped at the edge of the search footprint, which is pixel-quantised. The staircase
  re-forms on every centimetre of camera travel (`m5-wobseqArch1.png`, 1 cm steps).
- Isolated dark specks appear and vanish in the sky beside the gable from frame to frame
  (`m5-wobseqGable1.png`, 2 cm steps: f1, f2, f3, f5 each have one or two, in different places).
- Window openings in the gable are displaced and bent by about 10 px against `wobble=0` (`m5-wobC.png`).
  Stable in motion, but large for a "1-2 px" effect.
- No doubling of edges seen. Cost: not measurable (section 4).

### 2.5 Shift lens - no jump; stretching at the extremes
- Transition: stepping 0.5 deg per frame through the limit, changed-pixel series are smooth on both
  builds (F through 24 deg: 21.2, 20.7 ... 14.7 up; 27.4 ... 23.0, 23.0, 23.1, 23.3 down - a change of
  slope at the limit, no jump; L through 34 deg: 13.6 ... 5.9 up, 21.1-21.6 flat down). Overviews
  `m5-tiltup-ov.png`, `m5-tiltdown-ov.png`, `m5-tiltin-ov.png`: verticals stay vertical up to the limit,
  nothing pops. The limit is a hard clamp in `main.js`, so off-centre points change direction of travel
  abruptly there; I could not see it in stills.
- Straight up / straight down the picture is no longer a plain camera: the lens stays shifted by the full
  limit, so the image plane is tilted 24 deg (F) / 34 deg (L) against the view axis. Yawing in place then
  does not rotate the picture rigidly - things stretch and squash as they go round. After rotating back,
  tiles differ by 9.9 / 13.5 / 15.6% looking down and 23 / 28 / 29% looking up on F, **15 / 19 / 22% and
  26 / 29 / 29% on L**, against 0.08% and 1% with `shift=0` (`m5-roll-down-L-tele=0.png`: the big tuft
  changes shape from tile to tile; `m5-roll-up-L-tele=0.png`). By the lens geometry the vertical stretch at
  the top edge is about 1.5:1 at fov 32 and 2:1 at fov 50 on L.
- Grass and leaf cards at the extremes: they behave (position-only), all deformation comes from the lens.

### 2.6 Telephoto pull-back - FAIL, and it is now on by default
- The near plane is a vertical plane through the viewer and it is wider and taller than the viewer is
  high, so it reaches below the ground. Everything in front of that plane and below the cut is missing and
  the sky dome's lower half shows through as a flat pale blue-grey area.
  `scratchpad/m5/hole.mjs` measures the share of the frame that is hole (fov 32, eye height, walking the
  hero line toward the chapel):

  | Distance from chapel | pitch 0 | -5 | -10 | -15 | -20 | -30 | -45 | -60 |
  |---|---|---|---|---|---|---|---|---|
  | **default (auto)** 18 m and beyond | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
  | default, 15 m | 0 | 0 | 0 | 5 | 25 | 70 | 95 | 93 |
  | default, 12 m | 0 | 0 | 8 | 30 | 53 | 100 | 100 | 100 |
  | default, 9 m | 0 | 0 | 3 | 20 | 44 | 94 | 100 | 100 |
  | default, 6 m | 0 | 0 | 0 | 0 | 15 | 71 | 100 | 97 |
  | default, 3 m | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
  | `tele=0.35`, 12-26 m | 0-4 | 0-22 | 3-43 | 25-64 | 47-87 | 97-100 | 100 | 100 |
  | `tele=0.7`, 6-26 m | 0-1 | 0-20 | 0-46 | 21-73 | 50-97 | 100 | 100 | 100 |
  | `tele=0` anywhere | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

  In words: with the default settings, between 6 m and 15 m from the chapel (where one stands to look at
  it) **any look more than about 10 degrees below level opens a hole at the bottom of the frame, and
  30 degrees down the whole frame is hole**. `m5-feetwalk-ov.png`, `m5-lookdownIn-ov.png`,
  `m5-tilt-ov.png` (first three frames), `m5-autoB.png` (wallfoot), `m5-autoC.png` (lookdownS = 100% hole),
  `m5-teleB.png` (feet).
- Sliced solids: paving and floor slabs cut along a straight line with their thickness showing
  (`m5-lookdownIn-ov.png`, `m5-tiltin-ov.png`); a pier cut open into "shelves" (`m5-noseOut_t0.7-ov.png`
  last frame); the trunk as a thin hollow sliver (`m5-ringNear-ov.png` frame 10); wall cut into flying
  slabs (`m5-orbit-ov.png` frame 1, `m5-orbit_t0.7-ov.png` frames 1-2).
- How often, level camera, from the overviews: walking round the chapel at 6 m from the walls 1 frame in
  12 shows a sliced solid; orbiting the tree at 7 m 1-2 in 12; walking the nave or along the west wall
  looking level 0 in 9-12. Looking down it is nearly always (table).
- Side effects of measuring distance from the pulled-back camera (`uCamPos`): tufts next to the viewer no
  longer duck (the 0.7 m test is never met), leaf-card size caps and the near cut of leaf masses act at the
  wrong distance, tuft and flower fade distances shift by the pull, stone joints fade earlier. None of this
  pops; it is why the same spot looks different with tele on.
- The telephoto itself ramps in smoothly on the walk-up (`m5-approach-ov.png`; 16-frame segments have
  max/median 1.03-1.06). The foreground simply leaves the frame as the lens narrows.

### 2.7 Meadow regrouped - PASS
Rows 3b, 3c, 6a above: sub-pixel residual in the hero grass crop 3.08% -> 1.71% (F) / 1.95% (L); per-tick
twinkle 1.6% -> 0.2-0.35%; band crop at `walkW` 0.91% -> 1.04%. Strafing the west meadow is unchanged
(5.5 / 10.1% per frame) and the flower drift is still where the changing pixels are (`m5-strafe-b0.png`).

---

## 3. What a viewer notices at 60 fps, worst first

### P1. Holes and sliced geometry from the telephoto near plane - BREAKS THE PICTURE, default settings
- Evidence: 2.6. Owner: `src/main.js` (lens block in `frame()`).
- Fix, in order of preference:
  1. Limit the pull so the near rectangle cannot reach the ground:
     `pullMax = 0.8 * (state.pos.y - height(x, z)) / max(th - Math.tan(sh), 1e-3) - 0.3; pull = min(pull, max(0, pullMax))`
     (with `th` evaluated for that pull; two iterations are enough). This removes the tele exactly when one
     looks down, which is also when it has nothing to flatten.
  2. Additionally fade `tele` with downward pitch: `tele *= smoothstep(-0.30, -0.08, state.pitch)`.
  3. Keep the near plane at 0.3 m and instead discard only what is behind the viewer in the fragment
     shaders of things that can stand between camera and viewer (a clip plane through the viewer facing
     forward does the same as now; a clip **sphere** of radius `pull` around the real camera does not cut
     the ground in front of the viewer's feet).
  4. Give LOD and fade code the viewer position, not the camera position: add `G.uViewPos = state.pos` and
     use it for tuft duck/fade, flower fade, leaf-card caps and the stone `dist` terms.
  Until then the default should be `tele: 0`.

### P2. Stone silhouettes turn into a crawling pixel staircase, with specks, under the wobble - NOTICEABLE
- Evidence: 2.4. Owner: `src/pipeline.js` (`COMPOSITE_FS`, wobble block).
- Fix: the displacement must never exceed the distance at which stone is found. Either cap it
  (`uWobble * 2.5 * uTexel`, the stated 1-2 px) or widen the search to cover it (8 taps at 4 px and 8 px).
  Weight the displacement by a **smooth** stone coverage instead of `a > 0.5`: sample `tAux.a` with the four
  taps and use their average as the weight, so the outline keeps its anti-aliasing. Reject a neighbour
  only on a relative depth test that is itself smooth (`smoothstep(0.85, 0.95, ak.r / best)`).

### P3. Looking straight up or down and turning, the world stretches and squashes - NOTICEABLE in fly mode and under the tree
- Evidence: 2.5. Owner: `src/main.js`.
- Fix: let the shift die away beyond the limit so that 90 degrees is a plain camera, and round the corner:
  `const a = Math.abs(state.pitch); sh = Math.sign(state.pitch) * lim * Math.tanh(a / lim) * (1 - smoothstep(0.9, 1.4, a));`
  Real pitch `state.pitch - sh` stays monotonic. Consider going back to 0.42: at 0.6 the top edge is
  stretched 1.5-2:1.

### P4. Tufts bow down as you walk up to them and become a flat star underfoot - NOTICEABLE when looking at the ground
- Evidence: 2.1. Owner: `src/extra/grass.js` (`TUFT_VS`).
- Fix: narrow and raise the hand-over so it happens only under the camera, where the tuft is leaving the
  frame anyway: `wFlat = smoothstep(0.70, 0.90, el)`, `wUp = 1 - smoothstep(0.80, 0.97, el)`, and press the
  fan to 0.6 rather than 0.3. Cap the lying clump on screen (`rad = min(rad, 90.0 * uPixelK * dist)`) and
  give it the two tones of the upright tuft so it is not one flat shape.

### P5. Flower drift still shimmers on a sideways walk - MINOR (was NOTICEABLE)
- Evidence: `m5-strafe-b0.png`, 2.6% of the frame changes in at least half the frames, all inside the pink
  drift and the bush edge; half-pixel residual is now 1.7-2.0%.
- Owner: `src/extra/grass.js` (flower dashes 2-3 px tall) and `src/terrain.js` (painted masses).
- Fix: beyond ~15 m let the painted mass carry the drift alone: lower `FLOWER_FADE` to
  `[[9,15],[13,21],[19,28]]`.

### P6. Masonry element tones drift as you walk round - MINOR at walking speed, likely visible when running
- Evidence: 2.3. Owner: `src/stone.js` (`VS`, the plane value).
- Fix: none needed for walking. To make it run-proof, low-pass the camera position that feeds the plane
  value: a `uPlaneCam` uniform that follows `uCamPos` with a 1.5 s time constant (set in `src/main.js`).
  The smoothstep that gathers the planes doubles the rate inside each transition; `smoothstep(0.1, 0.9, fr)`
  halves the peak.

### P7. The camera still walks into stone - MINOR, worse with tele
- `m5-orbit-ov.png` frame 1, `m5-noseOut_t0.7-ov.png` last frame. No collision in `move()`.
- Owner: `src/main.js`. Fix as in critique 3 (keep 0.5 m outside the block boxes of `src/ruin.js`).

### P8. Pale tree group in front of the north hill - MINOR, unchanged
- `m5-backarch-ov.png` (F) frames 4-6. Owner `src/extra/far.js`, fix as in critique 3.

### P9. Long-lens pans over the plain now catch the rim shrubs - MINOR
- Sub-pixel residual 0.62% -> 2.1% at one heading (`m5-sp-pan0.8-sp.png`); all of it on leaf edges of
  near shrubs seen at fov 14. Owner `src/extra/tree.js` (rim planting). Fix: at fov < 20 cap leaf cards of
  the rim shrubs at a smaller pixel size, or keep the SE corridor a little wider.

### Closed since critique 3
P1 tufts spinning with yaw; P3 leaf-shadow popping; P4 flat leaf masses near the lens; P5 canopy depth flip
and card counter-rotation; the straight twig and the horizon hairline of P8 (neither found in
`m5-orbit-ov.png`, `m5-skyline-f0.png`).

### What is solid
Masonry (no moire, no popping joints, flat residual with distance), brush marks on trunk and ground, static
shadows, doorways, the paint filter (lowers the residual in every probe), far landscape, tuft band frontier,
ambient motion on the 12 fps clock.

---

## 4. Frame time

`tools/perf2.mjs` (times `pipe.render` with a `readPixels` sync, 5 frames x 14 rounds, minimum and median),
three runs per build and resolution.

| View | 1280x720 min, 3 runs | 1280x720 median | 1920x1080 min, 3 runs | 1920x1080 median |
|---|---|---|---|---|
| hero, F | 8.5 / 8.7 / 9.0 ms | 9.6-10.6 | 16.4 / 15.3 / 16.5 ms | 17.3-18.0 |
| hero, L | 8.4 / 8.7 / 7.3 ms | 7.7-9.2 | 14.8 / 14.4 / 14.0 ms | 14.3-16.0 |
| inside, F | 8.5 / 8.3 / 7.8 ms | 9.0-9.4 | 15.4 / 15.4 / 14.3 ms | 14.6-16.9 |
| inside, L | 7.6 / 7.6 / 6.4 ms | 6.7-8.1 | 12.5 / 12.1 / 11.9 ms | 12.1-13.7 |
| feet, F | 5.4 / 5.3 / 5.0 ms | 5.8-6.1 | 9.4 / 10.3 / 9.3 ms | 9.9-10.9 |
| feet, L | 4.9 / 4.2 / 4.1 ms | 4.4-5.4 | 8.5 / 8.2 / 8.2 ms | 8.4-8.8 |

Audit 3 minimums for comparison: 720p hero 7.9-9.0, inside 7.4-8.7, feet 4.7-6.0; 1080p hero 16.0-16.7,
inside 13.4-15.1, feet 9.4-10.6.

Paint filter: 1.0-1.9 ms at 720p, 2.6-4.2 ms at 1080p. Wobble: -0.3 to +0.8 ms, i.e. inside the noise.

How noisy: minimums repeat within about +/-10% across runs; the F set was taken while another agent was
rendering and is 0.5-2 ms slower than the L set, which I attribute to load and not to the build (the two
builds differ only in lens constants and the wobble block; "inside" and "feet" on L are also cheaper
because automatic telephoto puts less in the frame). Medians were 2-17% above the minimums in these runs;
no 4-10x spikes this time. These are GPU-finish times for the scene passes only; the shadow pass no longer
runs per frame. Reading: 720p is comfortable. 1080p hero is 14-16.5 ms - at the limit of 60 fps, no
headroom.

---

## 5. Not verified
- Anything in real time. Every "a viewer would notice" is inferred from stills, difference images and
  step statistics. In particular the masonry tone drift at running speed (P6) and the kink at the shift
  limit are predictions from numbers, not observations.
- The source as it stands after 21:30 (`stone.js`, `terrain.js`, `grass.js`, `tree.js`, `ruin.js`,
  `build.js`, `props.js`, `sky.js` all changed after build L was loaded).
- The element-tone tracker is contaminated by occlusion and shadow edges in about half its rows; the
  numbers quoted are from the rows that stay on one surface. The 22% drop on one sunlit face
  (188 -> 147) could not be attributed to the plane value and was not followed up.
- Whether leaf shadows that ignore the sway look wrong: I found no evidence, but only looked at tick
  differences, not at a long clip.
- Wobble at 1080p and at fov 14; shift lens with `tele` on at the pitch extremes; `tele` with fov other
  than 32.
- Critique 3's mist "comb" edge at fov 14 and the floating slab by the west arcade were not re-checked.
- Stability metrics at resolutions other than 720p; 1080p was only timed.
