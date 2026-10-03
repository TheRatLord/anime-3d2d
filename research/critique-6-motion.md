# Critique 6 - motion re-check of the audit-5 fixes

Same method as `critique-5-motion.md`: 1280x720, headless Chrome on the Radeon 780M, frozen-time sequences
judged from contact sheets, crops and difference images - not real-time video. Nothing under `src/` or
`tools/` was edited; `src/` hashes were identical at start and end of the run (one build, loaded 21:44).
Images are `shots/m6-*`; scripts and logs are in `.../scratchpad/m6/`.

New script this round: `m6/slice.mjs`. Per frame it reports the pull, the hole share (as `hole.mjs`) and a
"cut" share = pixels whose depth is within 12% of the near plane, i.e. geometry touching the near plane.
"Cut" over-counts (a trunk or wall that is merely close also scores), so every count of sliced solids below
is from looking at the sheet, not from that number. It is blind when the pull is under 0.9 m.

## 1. Before -> now

| # | Check (audit-5 cameras) | Audit 5 (build L) | Now | Verdict |
|---|---|---|---|---|
| 1 | Hole share, hero line, default, 6-15 m, pitch -10 / -20 / -30 / -45 deg | up to 8 / 53 / 100 / 100% | **0% in all 80 cells** (26-3 m, +10 to -80 deg) | fixed |
| 1 | same, `tele=0.35` | 3-43 / 47-87 / 97-100 / 100% | **0% in all cells** | fixed |
| 1 | same, `tele=0.7` | 0-46 / 50-97 / 100 / 100% | 0% except 26 m: 3% at 0 deg, 4% at -5 deg; 22 m: 1% at -5 deg | fixed but for a strip at the bottom edge |
| 1 | feetwalk, feetwalk60, lookdownIn, tilt: frames in 12 with hole or sliced solid (default / 0.35 / 0.7) | nearly all | **0 / 0 / 0** | fixed |
| 1 | Ring walk 6 m from the walls: sliced solid | 1 in 12 (default) | 1 in 12 at all three settings - the oak trunk as a thin sliver (frame 9) | not fixed for trees |
| 1 | Tree orbit 7 m | 1-2 in 12 | 1 in 12: frame 0, camera inside the door pier - identical with `tele=0`, so collision not lens | lens part fixed |
| 1 | Nave walk, west wall walk, level | 0 in 9-12 | 0 in 12 sliced (alongwall: thin sliver at the frame edge in 2 frames) | same |
| 2 | Half-pixel residual wobble on vs off, arch against sky (mean / % over 24) | 0.53 / 0.65% vs 0.30 / 0.44% | 0.40 / 0.46% vs 0.25 / 0.34% | better, still +60% |
| 2 | west piers | 1.75 / 2.46% vs 1.44 / 2.16% | 1.62 / 2.21% vs 1.34 / 1.76% | same (+21%) |
| 2 | hero gable | 1.31 / 0.66% vs 1.35 / 0.92% | 1.04 / 0.25% vs 1.10 / 0.56% | wobble now neutral or better |
| 2 | inside 960x540 | 0.74 / 0.77% vs 0.73 / 0.78% | 0.77 / 0.77% vs 0.77 / 0.82% | neutral |
| 2 | hero 960x540 | 1.40 / 1.60% vs 1.30 / 1.41% | 1.39 / 1.46% vs 1.30 / 1.34% | same (+7%) |
| 2 | flat wall close | 0.04 / 0% vs 0.03 / 0% | 0.14 / 0% vs 0.14 / 0% | neutral |
| 2 | Arch outline against sky | hard 1-px staircase | **still a hard 1-px staircase** | not fixed |
| 2 | Specks in the sky beside the gable | 1-2 in 4 of 6 frames | none in 12 frames | fixed |
| 3 | Back-rotation, straight down, 30/60/90 deg yaw | 15 / 19 / 22% (`shift=0`: 0.08%) | **0.04 / 0.04 / 0.02%**, identical to `shift=0` | fixed |
| 3 | Back-rotation, straight up | 26 / 29 / 29% (`shift=0`: 1.0%) | **1.02 / 1.08 / 0.47%**, identical to `shift=0` | fixed |
| 3 | Slow tilt, 0.5 deg steps | slope change at the limit | no jump at any of 10 segments, 5-80 deg down; within 1 point of `shift=0` | fixed |
| 4 | Tuft bows down on approach | from ~2 m, fan pressed to 30% | upright to ~1.2 m, splays only in the last two 11 cm steps | fixed |
| 4 | Underfoot | one flat pale star ~250 px | overlapping lying blades in two greens, still ~250 px and flat | better, MINOR |
| 5 | Sideways walk, west meadow: changed px/frame, segment 1 / 2 | 5.5 / 10.1% | 4.6 / 10.0% | better |
| 5 | px changing in at least half the frames | 2.6% | **1.4%**; the pink drift is no longer in the boil map | fixed |
| 5 | Half-pixel residual hero grass / band / meadow | 1.95 / 1.04 / 0.24% | 2.11 / 0.98 / 0.26% | same |

Crops for row 2 were rebuilt from `m5/spec2.mjs` because audit 5 did not log its `subpx` crops; the
wobble-off numbers land close to audit 5's, so they are comparable but not pixel-identical.

## 2. Detail per item

### 2.1 Telephoto near plane - holes gone; trees, nave columns and the altar are still sliced
- Holes: `m6/hole.log`. Looking down the pull is 0 (`m6-sl-feetwalk.png`, `m6-sl-lookdownIn-tele=0.7.png`:
  whole frames, no cut paving).
- `tele=0.7` leftover: a pale strip along the bottom edge at 20-26 m looking level to 5 deg down
  (`m6-sl-hole26-tele=0.7.png`, 1.4-2.5% of the frame). The ground clamp uses the height under the viewer
  only; on a slope the lower corners of the near rectangle still dip under the turf. Forced setting only.
- Random level poses (pitch -6 to +20 deg, eye height, `m6/survey.log`), default settings:
  - 300 poses within 24 m of the chapel: 0 holes. Of the 12 worst (`m6-sv-all.png`) 3 show the oak trunk as
    a thin sliver, 2 show a grass strip cut at the bottom; the 4 with stone "shelves" look the same with
    `tele=0` (`m6-slcmp.png`) - that is the camera inside a buttress, see P4.
  - 150 poses inside the nave: 5-6 show a standing column or the altar cut into a thin slab with a floating
    horizontal plate (`m6-sv-nave.png`; side by side with `tele=0` in `m6-navecmp.png`). The four standing
    columns (`props.js`: +-2.6, -3.6 and +-2.6, 1.6) and the altar (0, -6.6) are not in `solidDist`.
  - 120 poses within 3 m of the oak: no hole; most show the trunk whole. It turns into a sliver when it
    stands in the viewer's own plane within about 1.8 m to the side: `m6-sl-treepass.png` frame 5,
    `m6-sl-treeturn.png` frame 4, `m6-sl-ringNear.png` frame 9.
- `tele=0.35` and `0.7` forced: same trunk and column cases, more often for trees further out
  (`m6-sv-all-tele=0.35.png`, `m6-sv-all-tele=0.7.png`, not individually reviewed beyond the sheets named
  above).

### 2.2 New side effect of the solid-distance clamp: the lens pumps while you walk
`m6/pull.mjs` samples the pull at 60 fps walking steps (`m6/pull.log`), default settings:

| Walk | Pull along the move (m, every 1/12) | Largest lens change | Largest change of rate in one frame |
|---|---|---|---|
| hero spot into the nave | 0 0 0 0 0.1 1.0 2.5 3.8 3.2 1.5 2.8 1.3 0 | 97%/s | 1.2% |
| through the door, 16 m -> -2 m | 1.9 3.0 3.9 4.5 4.8 4.6 4.0 2.4 0.2 0.6 0.4 1.1 0.2 | 147%/s | 3.1% |
| down the nave | 3.2 1.4 0 0 1.3 0.6 1.0 0 0.7 1.5 1.9 2.5 1.8 | 152%/s | 2.3% |
| across the nave | 0 0.9 1.7 1.3 0.2 0 0 1.0 1.5 1.5 1.3 0.9 0 | 154%/s | 2.3% |
| tilting -40 -> +10 deg in the nave | 0 ... 0 0.1 0.8 1.1 | 146%/s | 1.7% |
| along the west wall / ring at 6 m | 2.0-4.3 / 2.4-4.7 | 34 / 24%/s | 0.3% |

Inside the chapel the pull goes up and down by 1-3 m every few metres as walls and drums pass, and the
rate changes abruptly where one `min()` hands over to another. In the frame statistics this shows as steps
that `tele=0` does not have: door walk 7.57 -> 3.74% changed px in one frame (max/median 1.77 vs 1.19),
nave 12.09 -> 10.8 -> 9.5 (1.22 vs 1.03), dolly to the wall 6.08 -> 3.52 over three frames with one-frame
flashes 2.1-2.9% vs 0.2%. I expect this to read as the picture breathing and lurching; not seen in real time.

### 2.3 Wobble
- Arch: `m6-wobA.png` (bottom row), `m6-panArch1.png` vs `m6-panArch0.png` (1.5 px pan steps, 3x). With
  wobble the stone/sky edge is a regular one-pixel staircase in every frame; without it the edge is
  anti-aliased. The steps re-form each frame.
- Gable: `m6-panGable1.png`, `m6-wobseqGable1.png` - no specks, window edges soft; fine.
- West wall top: `m6-panWest1.png` vs `m6-panWest0.png` - no visible difference.
- Cause as read from `pipeline.js`: stone is still decided by a hard `ak.a > 0.5` on 8 point taps, so sky
  pixels switch between "displaced" and "not displaced" on a pixel-quantised boundary.

### 2.4 Shift lens
`m6/roll.log`, `m6/tilt.log`. Straight up and down the camera is now a plain camera. Between 0.8 and 1.3 rad
some shift remains by design; not measured with the back-rotation test (it is only valid at 90 deg).

### 2.5 Tufts and flowers
`m6-walkover-md.png`, `m6-walkover-fine-md.png` (tuft cluster at -15.65, 17.5; the audit-5 tuft no longer
exists after the grass change, so this is a neighbouring clump). `m6-strafe-b0.png`: what still changes is
the near bush and the bottom foreground strip, not the flower drift.

### 2.6 Chapel after the geometry/shader change
- Dolly (`nose`, `noseOut`, `tele=0`): 0.9-3.1% changed px/frame, max/median 1.03-1.11 (1.64 on the last
  segment), marks stay on the wall (`m6-nose-f2.png`). No popping.
- Orbit at 24 m (`orbitChapel`): 10.2 / 11.2 / 5.8% per frame, max/median 1.01-1.03, flashes 0.7-1.2% -
  no single-frame event, no z-fighting visible (`m6-orbitChapel-f0.png`). Audit 5: 8.0 / 10.5 / 6.5%.
- Walk-through (`door`, `nave`, `tele=0`): max/median 1.01-1.17, nothing pops (`m6-nave-ov.png`).
- Shadow on stone: still camera, 6 ticks: 0.000%. Half-pixel residual at a shadow edge 0.26 / 0.11%.
  Same sun patch from 5.65, 3.65, 3.28 and 2.65 m with the lens matched (`m6-shadowscale.png`): the dappled
  outline is the same shape at 3.65-2.65 m and slightly simpler at 5.65 m. No shimmer.
- Element tones (`m6-tone-aroundW.png`, `m6/tone.log`): clean rows drift slowly (117 -> 99 over the walk,
  109 -> 98, 111 -> 107 -> 117), no step found. More rows than in audit 5 are contaminated by occlusion,
  and the tracker's analytic plane value predates the per-plane lighting change, so only luminance was used.

## 3. Frame time
`tools/perf2.mjs`, minimum of 5 runs each (range of the 5 minimums; median range in brackets).

| View | 1280x720 | 1920x1080 | Audit 5 L, 1080p |
|---|---|---|---|
| hero | 8.2-8.9 ms (8.7-9.5) | 14.1-16.3 ms (14.4-17.2) | 14.0-14.8 |
| inside | 7.0-8.2 ms (7.2-8.8) | 13.4-15.7 ms (13.9-16.2) | 11.9-12.5 |
| feet | 4.3-5.4 ms (4.5-6.1) | 8.9-10.4 ms (9.2-10.7) | 8.2-8.5 |

The machine had a load average of 10-12 and 19 other Chrome processes during the timing, so these are
pessimistic; the one quiet run gave 14.1 / 13.4 / 8.9 ms at 1080p. Even that run has "inside" 1 ms slower
than audit 5. Paint filter 1.1-2.1 ms at 720p, 2.4-3.9 ms at 1080p; wobble inside the noise.

## 4. What a viewer would still notice, worst first

### P1. Lens pumps and lurches while walking in and around the chapel - NOTICEABLE, default settings, new
- Evidence 2.2. Owner `src/main.js` (lens block in `frame()`).
- Fix: do not feed the clamps straight into the camera. Compute the target pull as now, then follow it with
  a rate limit that is fast going down and slow going up:
  `pullS += (target - pullS) * (1 - Math.exp(-dt / (target < pullS ? 0.12 : 0.8)))` and use
  `Math.min(pullS, target)` so the near plane never enters stone. Replace the hard `min()` against
  `solidDist` by a smooth one and measure `solidDist` only inside the near rectangle's half-width instead
  of in all directions, so a drum behind or far to the side does not cancel the telephoto.

### P2. Tree trunks, nave columns and the altar are cut into slivers - NOTICEABLE where it happens
- Evidence 2.1. Owner `src/main.js` (`solidDist`), data from `src/extra/tree.js` and `src/extra/props.js`.
- Fix: add the trunks (x, z, radius + 0.3) and the four standing columns and the altar footprint to the
  list `solidDist` reads - export them the way `ROCKS` is exported from `ruin.js`. Lower the `r[2] > 0.3`
  filter to 0.15 for standing pieces.

### P3. Arch and other curved stone outlines are a crawling one-pixel staircase - NOTICEABLE against sky
- Evidence 2.3. Owner `src/pipeline.js` (`COMPOSITE_FS`, wobble block).
- Fix as proposed in audit 5 and not yet done: weight the displacement by a smooth stone coverage (average
  of `tAux.a` over the taps, not `a > 0.5`) and make the depth rejection a `smoothstep`; or apply the
  wobble only where the centre pixel itself is stone and leave the silhouette to the geometry.

### P4. Camera walks into buttresses and piers - MINOR, unchanged
- `m6-slcmp.png` (noseOut end, -5.1/-10.7, orbit frame 0), same with `tele=0`. Owner `src/main.js`
  (`move()`): keep `solidDist > 0.5`, with buttress footprints added to `WALLS`.

### P5. Bottom-edge strip at `tele=0.7` on sloping ground - MINOR, forced setting only
- Owner `src/main.js`: take the minimum of `height()` at the two lower corners of the near rectangle
  instead of the height under the viewer.

### P6. Lying tuft underfoot is still a flat 250 px mass - MINOR
- Owner `src/extra/grass.js` (`TUFT_VS`): cap the clump's screen size (`rad = min(rad, 90.0 * uPixelK * dist)`).

### P7. 1080p has no headroom - MINOR
- 14-16 ms hero and inside. Owner `src/pipeline.js`: the paint filter is the 2.4-3.9 ms lever.

## 5. Not verified
- Anything in real time. P1 in particular is predicted from pull curves and frame statistics.
- How many of the forced-tele survey poses show sliced solids: only the default sheets and the four
  `tele=0.7` move sheets were reviewed frame by frame.
- Column slicing on a planned walk: `colpass` and `colturn` (pull 0.4-2.8 m) showed none; it was found only
  in random poses.
- Shift lens between 0.8 and 1.3 rad pitch while yawing; wobble at 1080p and fov 14.
- Element-tone stepping with a tracker that matches the new per-plane lighting.
- Frame times on a quiet machine.
- Audit-5 items outside the brief (P6 tone drift at running speed, P8 pale tree group, P9 rim shrubs).
