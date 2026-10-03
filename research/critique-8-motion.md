# Critique 8 - motion re-check of the audit-7 fixes

1280x720, headless Chrome on the Radeon 780M, frozen scene time, judged from contact sheets, crops and
difference images - not real-time video. I edited nothing under `src/` or `tools/`. Images are
`shots/m8-*` (snapshot A) and `shots/m8b-*` (snapshot B); scripts and logs are in `.../scratchpad/m8/`
(B re-runs in `m8/b/`).

## 0. Which code was measured

**`src/` changed under me during the run.** Hashes at 01:44 (`m8/md5-start.txt`) and at 03:36
(`m8/md5-0336.txt`) differ in eight files: `far.js`, `grass.js`, `terrain.js`, `tree.js` (written 03:20:53)
and `build.js`, `props.js`, `ruin.js`, `stone.js` (written 03:26:42). `main.js` and `pipeline.js` did not
change. Unchanged again from 03:36 to 03:49.

- **Snapshot A** (01:44, served from the dev server's module cache until 03:35): the state the brief
  describes - `SOLIDS` has 61 circles. All numbers below are A unless marked B.
- **Snapshot B** (03:36): `SOLIDS` has 56 circles (five dropped along the low east wall, tops lowered
  there), meadow residual lower. I re-ran a subset on B: collision surveys, the 48 passes, meadow bands,
  strafe, wall/pier orbits, tree orbits. Lens, sliding and wobble code is the same in A and B.

Harness note: audit 7's *path* walks set `state.pos` before each frame, so `move()` now sees speed 0 and
the lens never returns. They are no longer valid. All lens walks here are keyboard walks (`kdoor`, `knave`,
and `kcross` = D held in fly mode along the audit-7 cross-nave line). Audit-7 path and keyboard figures
agreed to within 1%/s, so the comparison holds.

## 1. Audit 7 -> now

| # | Check | Audit 7 | Now | Verdict |
|---|---|---|---|---|
| 1 | Hole while tilting down 6 m in front of the door, 0.1 / 0.2 / 0.5 s | 59 / 38 / 15% of frame | 0 / 0 / 0% | fixed |
| 1 | same at 6 other places (12 m out, west 9 m, east 8 m, back 7 m, oak, nave) | 0-5.6% | 0% in all 18 | fixed |
| 1 | Picture scaling after the walker stops, nave, 1st / 2nd second | +8.7 / +3.3% | 0.0 / 0.0% | fixed |
| 1 | same, inside the door / beside the oak | -11.3 / 0%; +7.2 / +2.8% | 0.0 / 0.0% both | fixed |
| 1 | Changed px per frame right after stopping | 1.0-2.7% | 0.01-0.02% | fixed |
| 1 | Frames with pull above the clamp, per walk | 99-191 | 0 | fixed |
| 1 | Stone at near plane brushing piers / buttresses (48 passes) | 1-6 frames, up to 11% | 0 frames | fixed |
| 1 | Oak walked past / run past, frames with trunk at near plane | 8 of 206 / 6 of 90 | 0 / 0 | fixed |
| 1 | Largest one-frame change of zoom rate: nave / door / across | 0.22 / 0.17 / 0.24% | **1.72 / 1.13 / 1.75%** | regressed (audit 6: 2.3 / 3.1 / 2.3) |
| 1 | Largest lens change: nave / door / across | 75 / 70 / 38%/s | 130 / 79 / 152%/s | regressed |
| 1 | Frame step max/median in the windows holding the kinks | 1.07-1.20 | **1.48 door, 1.59 and 4.07 nave, 1.38 across** | regressed |
| 1 | Lens after looking down and back up, standing | returned in 1-2 s | **stays at pull 0** until the viewer walks (picture 28-34% wider) | new |
| 2 | 135 walks at solids: ended inside a collision circle | 0 | 0 of 117 solid + trunk walks | same |
| 2 | same: stone at the near plane | 24 of 86 stone walks (jambs, buttress corners) | 0 of 90 (worst 0.003%) | fixed |
| 2 | 48 keyboard passes through arches and door | 45 through, 3 frozen at start | 47 through, 1 stopped by the altar; none trapped | fixed |
| 2 | Walker starting inside the 0.4 m margin | cannot move | pushed out by itself in 1-4 frames, walks away | fixed |
| 2 | Past the oak on x = -10.5 | stops dead | slides round (8 of 8 lines, incl. dead centre) | fixed |
| 2 | Sliding along a wall | (axis slide) | **6 cm zig-zag every 0.7 m (4.3 Hz), heading snaps 24-39 deg** | new |
| 2 | Free width of arches | 0.87 / 1.42 / 1.57 m | 1.56-1.57 m west and east, 2.02 m back | fixed |
| 2 | 300 / 150 / 120 standing poses: sliced solid, reachable poses | 0 / 0 / 0 | 0 of 251 / 0 of 111 / 0 of 114 (B: 0 of 253) | same |
| 3 | Detached marks in sky by the gable, per pan frame | 2-3 in each of 6 | 0-2 in each of 12 (10 of 12 frames have one), 1-2 px each | reduced, not gone |
| 3 | same, wobble off | 0 | 0 | - |
| 3 | Arch outline | anti-aliased | anti-aliased, 0 marks in 12 frames | same |
| 3 | Half-pixel residual on vs off: arch | 0.350 / 0.354% | 0.435 / 0.446% | neutral |
| 3 | west piers | 2.21 / 2.16% | 1.94 / 1.87% | neutral (+4%) |
| 3 | hero gable | 0.81 / 0.79% | 0.96 / 0.86% (B: 0.81 / 0.78) | neutral |
| 3 | inside 960x540 / hero 960x540 | +0 / +3% | -0.5 / +8% | neutral |
| 4 | Fly-over of the low east wall: changed px across the wall plane | 9.1 -> 15.2 -> 10.4% in 6 cm | smooth, 10.3 -> 12.1% over 1 m; max/median 1.08 (was 1.80) | fixed |
| 4 | East door pier top, orbit: luminance | 148 -> 80, 97 -> 190, 192 -> 149 | 183-193 at every unoccluded angle | fixed |
| 4 | Thin drawn lines, slow pan at 15-30 m | - | stable in all sheets; paint filter lowers the change share | ok |
| 5 | Half-pixel residual, hero grass crop | 1.91% (mean 2.00) | **3.30% (mean 2.45)**; B: 2.23% (mean 2.24) | regressed, B half-way back |
| 5 | 12 fps tick, still camera, hero grass crop | - | 0.000-0.003% per tick | still |
| 5 | Sideways walk, changed px/frame seg 1 / 2 | 4.5 / 10.1% | 5.06 / 10.1% (B: 4.72 / 9.94) | same |
| 5 | px changing in at least half the frames, seg 1 / 2 | 1.07 / 1.57% | **2.30** / 1.66% (B: 1.93 / 1.74) | seg 1 doubled |
| 6 | Tree orbits and tilt: frame step max/median | - | 1.01-1.12 (B: 1.00-1.10); no line, no pop | ok |
| 7 | 1080p hero / inside / feet, best run | 14.3 / 13.1 / 9.0 ms | 14.7 / 13.4 / 8.9 ms | same |

## 2. Detail per item

### 2.1 Lens
`m8/walk.log`, `walkK.log`, `drift.log`, `lookup.log` (printed by `lookup.mjs`), `dyn.log`.

- **Give-way.** The pull is never above the clamp in any walk. Holes while tilting down: 0% in all 21
  place x speed cells. Transient cuts: 0 frames in nave, weave, door, three tree passes, tree circle,
  column pass, west arch, and the three running walks.
- **After stopping.** Pull is constant from the first standing frame (nave 0.49, door 0.12, oak 0.64 m for
  5 s). `m8-stopNave.png`.
- **Lurch.** Pull every 1/12 of the walk, smoothed vs target:

| Walk | Smoothed | Target |
|---|---|---|
| nave | 3.73 2.29 0.71 0.00 0.01 0.24 0.37 0.45 0.08 0.00 0.15 0.47 0.39 | 3.73 2.29 0.71 0 0.19 1.27 0.57 1.02 0.08 0 1.26 1.55 0.39 |
| door | 5.19 5.13 5.14 5.16 5.04 4.67 4.07 2.65 0.40 0.01 0.31 0.27 0.13 | 5.19 5.14 5.19 5.19 5.04 4.67 4.07 2.65 0.40 0.22 0.61 0.75 0.13 |
| across | 0 0 0 0 0.01 0 0 0.11 0.22 0 0 0 0 | 0 0 0 0 0.09 0 0.01 1.10 0.28 0 0 0.04 0 |

  The slow return creeps up (zoom rate -0.2%/frame), then the clamp drops below it and the zoom rate jumps
  to +1.4 ... +2.5%/frame within one or two frames:
  - nave f136-137: zoom rate -0.00 -> +1.71 -> +2.01%/frame; changed px 2.96 -> 6.06 -> 7.08%.
  - nave f212-214 (nearing the altar): +0.18 -> +1.36 -> +2.17%/frame; changed px 3.55 -> 12.55 -> 16.69%.
    `m8b-kink-knave.png`: the tree in the back arch visibly grows faster from f213 on.
  - across f105-109: -0.03 -> +0.75 -> +2.50 -> +2.53 -> +1.39 -> 0; pull 0.22 -> 0 in four frames.
    `m8b-kink-kcross.png`: a 5.5% scale change in 50 ms, then nothing.
  - door f226: the long zoom-out (1.2%/frame for 1.5 s) stops in one frame when pull reaches 0; changed px
    4.07 -> 5.96%.

  My reading: yes, these read as a lurch - a twitch of 5-9% in scale over 3-5 frames, two to four times
  per nave walk. It is smaller than audit 6 (kinks 1.1-1.75% against 2.3-3.1%; total zoom travel 94 / 80%
  against 222 / 175% for an instant lens today) and larger than audit 7. Judged from 8-frame sheets.
- **Ratchet (new).** Because the return only runs while walking, anything that makes the lens give way
  while standing leaves it there. Stand 6 m in front of the door (pull 5.20), look at the ground and back
  up: pull 0.00, picture 33.6% wider, and it stays so through a 90-degree turn and back
  (`m8-lookup-door.png`: same spot, two visibly different perspectives). West side 27.9%, nave 30.4%.
  The first step then starts a zoom-in at up to 35%/s (door), 42%/s (west), 104%/s (nave), with a
  0.44-0.58% first-frame rate step because walking speed goes 0 -> 3.2 m/s in one frame.

### 2.2 Collision
`m8/into.log`, `arches.log`, `slide.log`, `slide2.log` (printed by `slide2.mjs`), `s2.log`; B in `m8/b/`.

- **Into solids**: 90 stone walks, 27 trunk walks, 28 lying-stone walks, each followed by a full turn on the
  spot. None ended inside a collision circle of a solid or trunk; minimum `standDist` over all sliding
  tests 0.394 m. Stone at the near plane: worst 0.003% (audit 7: up to 35%). 10 of 27 trunk walks still
  show foliage of the small trees within 0.36 m of the eye (up to 18% of the upper frame) - same as audit 7,
  these are bushy saplings with trunk radius 0.08-0.14 m. One walk ended inside a lying stone; lying stones
  have no collision (unchanged).
- **48 passes**: 47 through. The one that did not is the back arch walked from inside, whose start point
  is 0.2 m from the altar: the walker is pushed clear and then walks into the altar. Not a trap. B: same 47.
- **Escape**: from 0.1-0.3 m outside stone the walker is pushed to 0.40 m in 1-4 frames without a key
  (largest shove 8-25 cm in one frame), then walks off in every free direction.
  Fly-mode leftovers: dropped exactly on the axis of a wall, column or pier the gradient is zero and nothing
  pushes; W then escapes sideways, but walking *along* the wall axis from inside stays inside
  (`inside the east wall`, north: 0.2 m, standDist -0.40). Leaving fly mode inside the oak moves the camera
  0.84 m in four frames.
- **Round the oak**: all 8 lines from x = -10.5 to -12.2 get past; speed dips to 0.4-0.75 m/s on the
  near-centre lines, largest heading change 80 deg in one frame at first contact.
- **Dead centre**: a walker aimed exactly at the centre of a column, pier, cross or trunk stops (29 of 54
  centre-line walks); 0.15 m off centre it slides round everything except the altar and the buttresses,
  which are wall-like.
- **Jitter while sliding along a wall (new)**. Walls are chains of circles 0.7 m apart, so the 0.4 m
  boundary is scalloped. East wall inside at 20 deg, frames 110-141: x runs 4.035 -> 4.096 -> 4.035 with a
  14-frame period; speed 2.5-3.2 m/s; the direction of travel snaps at each cusp. Changed px per frame
  swing 2.7 -> 7.5 -> 4.7 -> 9.9% (max/median 1.92) where a free walk on the same heading gives 4.1-6.0%
  falling smoothly (1.36). At 70 deg into the wall the walker creeps at 0.05-0.4 m/s between cusps instead
  of 1.1 m/s. In the concave corner of wall and buttress (west wall outside, z = 2.9) it crawls at
  0.2-0.4 m/s. Head-on it settles into the nearest cusp and stands still (0.0 cm wander).
- **Surveys**: no sliced solid in any reachable standing pose (table). Inside-margin poses (fly only):
  20 of 49 and 1 of 39.
- **B**: with the five east-wall circles gone the walker crosses the wall line at z = 2.3-3.0 and beyond
  z = 5.1, eye height unchanged (1.63-1.66 m), 0% stone at the near plane. `m8b-lowwall2.png`: at z = 2.3
  the camera passes through a row of knee-high pale blocks. At z = 0.9-1.6 the crossing is one-way (from
  outside it slides into the gap, from inside it stops).

### 2.3 Wobble
`m8/wsp.log`, `speck2`/`speck3` output; `m8-panGable1.png`, `m8-panGable0.png`, `m8-panWest1.png`,
`m8-panArch1.png`, `m8-speck-gable.png`, `m8-speck-west.png`.

- Counted as connected groups of at most 12 non-sky pixels inside sky, 12 pan frames at 1.5 px:
  gable 1 2 1 1 2 2 2 0 0 2 1 1 with wobble on, all 0 off. Each is 1-2 px, about 2 px off the right slope
  of the gable (`m8-speck-gable.png`, two boxes). At 3x they are hard to find; audit 7's were 1-3 px and up
  to 3 px away, in every frame.
- West pier crop: 0-8 per frame on, 0-4 off. The extra ones sit on the pier's right edge and in the
  window of the arch; the rest are leaves and are there with wobble off.
- Arch: 0 marks, outline the same smooth edge in all 6 frames.

### 2.4 Stone
`m8/topcross.log`, `toporbit*.log`, `path4.log`, `path12.log`, `linepan.log`; B in `m8/b/`.

- **Wall top**: `m8-wallcross-ov.png` - the top goes from mauve to tan-and-green over frames 4-8, a blend,
  no speckle front. Changed px rise evenly through the crossing. `m8-wallorbit-ov.png` likewise.
  B: max/median 1.01-1.08 on the fly-over, 1.00-1.09 on the orbit.
- **Pier top**: `m8-pierorbit-ov.png` - the same tan top in all 12 angles. Tracked luminance 183-193
  except where the broken rim hides the patch (163-200 deg). B: orbit max/median 1.02-1.05.
- **Columns**: `m8-colorbit-ov.png`, `m8-col2orbit-ov.png`, `m8-colSun-ov.png`, `m8-colTop-ov.png`
  (four orbits, three columns). Contour on the silhouette at every angle, marks fixed on the stone,
  max/median 1.01-1.08 (1.24 once, on the capital orbit where the camera passes through a wall).
  The sun patch on the capital of the tall column stays on its south-west side. **No shaft is in sunlight**
  at this sun angle - all four stand in the shadow of the west wall or the oak - so the sunlit two-tone
  split could not be exercised.
- **Thin lines**: slow pan (0.5 and 1.5 px/frame, 16 frames) over wall faces at 15, 22, 30 m west, 18 m
  north, 18 m east, 20 m south. Crop px changing >24 per frame 0.67-1.80% with the paint filter, 0.73-2.51%
  without: the filter does not add flicker, it removes some. `m8-lp-w22-full.png`, `m8-lp-s20-full.png`
  (3x, six consecutive half-pixel frames): string courses, joints and putlog holes hold their place and
  weight; I see no broken or crawling line. Dolly 37 -> 8 m at the west wall and 40 -> 12 m at the back:
  max/median 1.01-1.12, no pop where lines fade in (`m8-wdolly-f3.png`). Walk-throughs (door, nave):
  no step outside the lens kinks.

### 2.5 Meadow
`m8/meadow.log`, `meadow-noflowers.log`, `meadow-bare.log`, `meadow2.log`, `strafe.log`; B: `m8/b/meadow.log`.

`meadow.mjs` reads colour and G-buffer depth in the page and bins ground pixels by depth from the camera
(the distance the shaders fade on). Half-pixel pan, share of each band off by more than 24 after resampling:

| View | Layer state | 3-6.5 m | 6.5-9 | 9-17 | 17-32 | 32-62 | all |
|---|---|---|---|---|---|---|---|
| hero | all (A) | - | 3.1 | 2.8 | 2.6 | 3.1 | 2.94 |
| hero | flowers hidden (A) | - | 0.5 | 0.9 | 2.3 | 3.0 | 1.86 |
| hero | all (B) | - | 2.3 | 1.8 | 2.3 | 3.4 | 2.30 |
| hero | flowers hidden (B) | - | 0.6 | 0.8 | 2.2 | 3.3 | 1.71 |
| drift (14,14 looking west) | all (A) | 1.3 | 4.0 | 3.8 | 2.5 | - | 2.62 |
| drift | flowers hidden (A) | 0.3 | 0.6 | 1.5 | 2.2 | - | 0.77 |
| drift | all (B) | 0.9 | 2.5 | 2.4 | 2.4 | - | 1.74 |
| close flowers | all (A) / hidden (A) / all (B) | 2.7 / 1.6 / 1.7 | 3.1 / 0.3 / 1.9 | 3.2 / 1.0 / 2.0 | - | - | 2.85 / 1.19 / 1.84 |

- **The band is 6.5-17 m.** There the standing flowers multiply the residual by 3-6 (A) or 2-4 (B).
  Beyond 17 m they add 0.1-0.3 points; beyond 32 m nothing. Inside 6.5 m they add about 1 point.
  That is the band where the blooms are 3-5 px and stand on stems 0.6-1 px wide.
- Hero crop 480,500,320,200: 3.30% in A (the owner's 3.9% not reproduced, but the same direction),
  4.67% with the paint filter off. B: 2.23%.
- Still camera: hero crop 0.000-0.003% per 12 fps tick. Close view crop 0.07-0.11% per tick, all inside
  6.5 m (sway). No twinkle with the camera still.
- Walking: one-frame flashes in the 6.5-9 m band are 2.8% forward / 6.8% sideways with flowers and
  3.6% / 3.8% without (hero, A). Forward walking adds nothing; sideways the stems add flashes.
- Sideways-walk boil: seg 1 median 5.06% (4.5), hot share 2.30% (1.07). `m8-strafe-b0.png`: the drift in
  mid-frame, dark in audit 7, now glows faintly; the near strip is still the hot part.
- `m8-sp-herograss-sp.png` (2x, residual x4): every bloom and stem in the field has a coloured rim in the
  residual; without the filter more so. What I expect a viewer to see at walking speed is a fine crawl of
  the bloom edges and stems across the 6.5-17 m belt on slow sideways moves and slow pans - not blooms
  switching on and off. Not seen in real time.

### 2.6 Trees
`m8/tree.log`; `m8-orbit-ov.png`, `m8-orbit30-ov.png`, `m8-orbit30-f3.png`, `m8-undercrown-ov.png`,
`m8-underUp-ov.png`.

- Orbit at 7 m, orbit at 9 m looking 30 deg up, orbit at 22 m, walk under looking level and 30 deg up,
  tilt under the crown: max/median 1.01-1.12 on the orbits and the tilt (B: 1.00-1.10 on two orbits),
  1.06-1.27 on the two walks under the crown, where the snapped lens target moves. No dotted or straight
  line on any bough in the 12 frames looking up at 30 deg. Leaf masses and their dark masks move with the
  crown in the crops; no mask slides against the leaves.
- The one outlier (walk looking up, first window, 2.85) is the snapped lens target changing, not the tree: the bark marks
  are identical in the crop, only displaced.
- `m8-orbit30-f3.png`: a bough seen through a leaf mass is drawn as a paler shape under the leaves; steady
  over the 6 frames.

### 2.7 Frame time
`m8/perf.log`. `tools/perf2.mjs`, minimums. Three clean runs (load 2-8); runs 4 and 5 were hit by another
job on the GPU (20-45 ms) and are discarded. B could not be timed: load average 33-40.

| View | 1280x720 | 1920x1080 | paint filter 720p / 1080p |
|---|---|---|---|
| hero | 7.8-8.0 ms | 14.7-15.1 ms | 1.1-1.2 / 2.4-2.7 ms |
| inside | 7.1-8.3 ms | 13.4-14.4 ms | 1.2-1.3 / 2.8-3.3 ms |
| feet | 4.6-4.8 ms | 8.9-9.7 ms | 1.2-1.5 / 2.9-3.5 ms |
| rimE | 7.1-7.7 ms | 13.3-14.1 ms | 1.0-1.2 / 2.4-2.6 ms |

Paint filter share: 14-32% of the frame at 720p, 16-39% at 1080p (largest on `feet`). Wobble: within
+-0.2 ms. Clean runs repeat within 0.3 ms at 720p (inside: 1.2 ms) and within 1.0 ms at 1080p.

## 3. What a viewer would still notice, worst first

### P1. The lens twitches when a column, jamb or the altar comes close - NOTICEABLE in the nave
- Evidence 2.1. Owner `src/main.js` (lens block in `frame()`).
- Fix: keep `pull = min(smoothed, clamp)` as the safety, but start giving way before the clamp bites.
  Evaluate the position clamp also at `pos + v * 0.15 s` and `pos + v * 0.3 s` (v = walking velocity) and
  take the smallest as the target; move `pullS` to that target with a 0.12 s time constant when falling,
  0.9 /s when rising; then `pull = min(pullS, clampNow)`. The fall starts 0.3 s early and eases in.

### P2. A glance at the ground changes the picture until you walk - NOTICEABLE near the chapel, new
- Evidence 2.1 (ratchet). Owner `src/main.js`.
- Fix: smooth only the position part. Keep `pullS` on the target before the pitch factor
  (`tele0 * min(D, 40)` clamped by `solidDist`), and apply `sm(-0.30, -0.08, pitch)` and the ground clamp
  after smoothing, every frame, both ways. Looking back up then restores the lens with the head, and a
  standing, level camera still never zooms.

### P3. Sliding along a wall shakes sideways at 4 Hz - NOTICEABLE whenever one hugs a wall, new
- Evidence 2.2. Owner `src/ruin.js` (`SOLIDS`) and `src/main.js` (`standDist`).
- Fix: export each standing wall stretch as one capsule `[ax, az, bx, bz, r, top]` and take the distance
  to the segment in `standDist` (the circles stay for columns, piers, buttresses). The boundary is then
  straight. Cheaper stopgap: 0.35 m spacing (scallop 1.6 cm instead of 6.6 cm).

### P4. Flower belt at 6.5-17 m crawls on slow pans and sideways walks - MINOR to NOTICEABLE (A), MINOR (B)
- Evidence 2.5. Owner `src/extra/grass.js` (flower vertex and fragment shader).
- Fix: do not let a stem be thinner than 1.2 px - widen it to 1.2 px and scale its alpha by
  true width / 1.2; end `STEM_FADE` at 12 m instead of 17 m; give blooms under 5 px a rim feather of at
  least 1 px so a half-pixel shift changes coverage, not which pixels are on.

### P5. One or two single-pixel marks in the sky beside the gable - MINOR
- Evidence 2.3. Owner `src/pipeline.js` (`COMPOSITE_FS`, wobble block).
- Fix: after computing the displaced `uv`, keep `uv = vUv` for a sky pixel unless the displaced sample is
  stone *and* at least one of its four neighbours is stone; or raise the tap threshold from 2 to 3.

### P6. Knee-high rubble of the east wall is walked through - MINOR, snapshot B only
- Evidence 2.2 (B). Owner `src/ruin.js` (`if (W.top(s) < 0.5) continue`).
- Fix: keep circles down to a top of 0.25 m, or raise the eye by the wall top under the walker
  (owner `src/main.js`, `move()`), so one steps over it.

### P7. Leaving fly mode inside stone: a 0.25 m per frame shove, and no exit along a wall axis - MINOR, fly only
- Evidence 2.2. Owner `src/main.js` (`move()`).
- Fix: cap the push at `max(sp, 0.03)` per frame while `d1 > 0`; when the gradient is below 1e-3 push
  toward the last position that had `standDist >= 0.4`.

### P8. 1080p has no headroom - MINOR, unchanged
- 13.3-15.1 ms on hero, inside and rimE. Owner `src/pipeline.js`: the paint filter is 2.4-3.5 ms of it.

## 4. Not verified
- Anything in real time. The "lurch" and "crawl" readings are from pull curves, 8-frame sheets and
  residual images.
- The two-tone split on a sunlit column shaft: no shaft is sunlit.
- Snapshot B: lens walks, wall sliding, wobble specks, thin-line pans, frame time and most tree moves were
  not re-run on B (lens, slide and wobble code is unchanged; geometry and shaders are not).
- What changed between A and B in `stone.js`, `tree.js`, `far.js`, `terrain.js`, `props.js`, `build.js`:
  no copy of A's files exists, only its `SOLIDS` dump and my measurements.
- The wall-top blend from eye height on foot (only flown at 2.6 m and orbited at 5 m).
- West-pier top orbit: the tracked patch is under the oak's leaves (luminance 85-226), unreadable.
- `m8-undercrown-ov.png` frame 4 shows a bough cut open by the near plane on that fly path; I did not
  check whether a walker can reach that pose or whether it is new.
- The owner's 3.9% for the hero crop: I get 3.30% on A and 2.23% on B.
- Forced `tele=0.35` / `0.7`, the shift lens, element-tone stepping.
