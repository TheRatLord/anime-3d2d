# Critique 7 - motion re-check of the audit-6 fixes

1280x720, headless Chrome on the Radeon 780M, frozen scene time, judged from contact sheets, crops and
difference images - not real-time video. Nothing under `src/` or `tools/` was edited; `src/` hashes were
identical at start and end. Images are `shots/m7-*`; scripts and logs are in `.../scratchpad/m7/`.

## 0. How the camera was driven this round

`setView()` snaps the lens, so every tool that teleports with `setView` (seq, mdiff, subpx, shot, and the
audit-6 scripts) shows the clamp target, never the smoothed lens. Two drives were used:

- **Stills, surveys, shader checks**: teleport with the lens snapped (the m6 scripts were patched so the
  yaw/pitch branch also goes through `setView`). This is the steady state a standing viewer reaches.
- **Walks (items 1, 2, 4)**: `m7/vlib.mjs` replaces `requestAnimationFrame` with a manual clock before the
  app loads. The app's own `frame()` then runs one frame per call with dt = 1/60 s, so `move()`, the
  collision and the lens smoothing execute unmodified and every frame can be captured.
  - *path walks* (`walk.mjs`: approach, outdoor, nave, crossnave, nose, ...): `state.pos/yaw/pitch` set per
    frame along the audit-6 paths, 5.33 cm per frame, no `setView`.
  - *keyboard walks* (`kdoor`, `knave`, `kweave`, `collide.mjs`, `drift.mjs`): real `keydown` events for
    W / Shift, walk mode, collision active.
  - The "instant" lens (audit-6 behaviour on today's build) is the same recorded poses replayed with the
    lens snapped.

New detector `m7/cut2.mjs`: reads view depth and the built-stone flag from the G-buffer and counts stone
pixels within 6% + 4 cm of the near plane. Unlike audit 6's "cut" it works at any pull. It also fires when a
wall simply fills the frame at nose distance, so sheets were looked at.

## 1. Before -> now

| # | Check | Audit 6 | Now | Verdict |
|---|---|---|---|---|
| 1 | Largest lens change, walking down the nave | 152%/s | 75%/s (path and keyboard) | halved |
| 1 | same, through the door | 147%/s | 69-70%/s | halved |
| 1 | same, across the nave / hero spot into nave | 154 / 97%/s | 38 / 71%/s | better |
| 1 | Largest change of zoom rate in one frame: nave / door / across | 2.3 / 3.1 / 2.3% | 0.22 / 0.17 / 0.24% | kinks gone |
| 1 | Total zoom travel over the walk: nave / door | 228 / 177% (instant lens today) | 96 / 79% | less than half |
| 1 | Frame step max/median, door walk worst segment | 1.77 (tele=0: 1.19) | 1.07-1.15 (tele=0: 1.15) | lurch gone |
| 1 | same, nave worst segment | 1.22 (tele=0: 1.03) | 1.20 (tele=0: 1.06) | small residue |
| 1 | Picture keeps scaling after the walker stops | no | **7-11% in the first second**, 3% in the second | new |
| 2 | 300 poses round the chapel: sliced solid | 3 trunk slivers, 4 inside a buttress | 0 in 251 reachable poses; 17 of the 49 poses inside the collision margin (fly only) | fixed on foot |
| 2 | 150 poses in the nave: sliced column/altar | 5-6 | 0 in 111 reachable; 1 of 39 inside the margin | fixed on foot |
| 2 | 120 poses within 3 m of the oak | sliver within ~1.8 m to the side | 0 in 114 reachable | fixed |
| 2 | treepass / treeturn / tree orbit / ring walk, 12 stills each | 1 / 1 / 1 / 1 | 0 / 0 / 0 / 0 | fixed |
| 2 | Same passes walked for real (lens lagging) | - | trunk at the near plane in 8 of 206 frames (walk), 6 of 90 (run) | new, brief |
| 3 | Half-pixel residual, wobble on vs off: arch against sky | 0.40 / 0.46% vs 0.25 / 0.34% | 0.275 / 0.350% vs 0.275 / 0.354% | fixed |
| 3 | west piers | 1.62 / 2.21% vs 1.34 / 1.76% | 1.47 / 2.21% vs 1.42 / 2.16% | fixed (+4%) |
| 3 | hero gable | 1.04 / 0.25% vs 1.10 / 0.56% | 1.36 / 0.81% vs 1.34 / 0.79% | neutral |
| 3 | inside 960x540 / hero 960x540 | +0% / +7% | +0% / +3% | neutral |
| 3 | flat wall / west wall top | neutral | 0.07 vs 0.07 / 0.74 vs 0.70 | neutral |
| 3 | Arch outline against sky | hard 1-px staircase | anti-aliased, same as wobble off | fixed |
| 3 | Specks in the sky beside the broken gable, slow pan | none in 12 frames | **2-3 in each of 6 frames**; none with wobble off | regressed |
| 4 | Hole share, hero line, 26-3 m x +10 to -80 deg, standing | 0% in 80 cells | 0% in 80 cells | same |
| 4 | Holes in 570 random poses | 0 | 0 | same |
| 4 | Hole while looking down quickly, 6 m in front of the door | 0 (instant lens) | **59 / 38 / 15% of the frame** for a 0.1 / 0.2 / 0.5 s tilt | regressed |
| 5 | Orbit at 24 m, changed px/frame | 10.2 / 11.2 / 5.8% | 10.8 / 12.2 / 5.9% (max/median 1.01-1.04) | same |
| 6 | Sideways walk, changed px/frame seg 1 / 2 | 4.6 / 10.0% | 4.5 / 10.1% | same |
| 6 | px changing in at least half the frames | 1.4% | 1.07% seg 1, 1.57% seg 2 | same |
| 6 | Half-pixel residual, hero grass crop 480,500,320,200 | 2.11% | 1.91% (mean 2.00) | same |
| 7 | 1080p hero / inside / feet, best of 5 | 14.1 / 13.4 / 8.9 ms | 14.3 / 13.1 / 9.0 ms | same |

Wobble crops were rebuilt from `m6/spec2.mjs` views (arch = inside 820,90,200,150; piers = westwall
640,240,200,150; gable = hero 620,80,200,150); on and off were measured in the same run. Absolute values
moved with the chapel geometry, so compare the on/off gap, not the level.

## 2. Detail per item

### 2.1 Lens pumping
`m7/walk.log`, `walk-t0.log`. Pull (m) every 1/12 of the walk, smoothed vs clamp target:

| Walk | Smoothed | Target |
|---|---|---|
| nave (audit-6 path) | 3.15 2.08 0.45 0.06 0.27 0.41 0.52 0.18 0.10 0.41 0.65 0.11 0.01 | 3.15 1.38 0 0 1.32 0.56 0.96 0 0.65 1.50 0.74 0 0 |
| door, 16 m -> -2 m | 5.20 5.14 5.15 5.16 5.08 4.77 4.22 3.07 0.83 0.12 0.37 0.37 0.22 | 5.20 5.13 5.18 5.19 5.02 4.63 4.00 2.41 0.15 0.56 0.35 1.12 0.21 |
| keyboard, down the nave | 3.76 2.95 1.48 0.28 0.06 0.28 0.40 0.48 0.38 0.06 0.20 0.51 0.61 | 3.73 2.29 0.71 0 0.19 1.27 0.57 1.02 0.08 0 1.26 1.55 0.39 |
| across the nave | 0 0.02 0.01 0 0.01 0 0 0.09 0.22 0.07 0.02 0 0.02 | 0 0 0 0 0.18 0 0 0.99 0.39 0 0 0 0 |

- The up-and-down pumping is gone. Inside the nave the walking lens stays at 0-0.6 m and never climbs back
  to the 1-1.5 m targets between columns, so in practice the telephoto is off while you walk there.
- What remains is one-sided: a fast zoom-out when something solid comes close (up to 70-75%/s for
  0.5-1 s) and a slow zoom-in afterwards. No single-frame steps: max/median of changed pixels is 1.01-1.20
  in every segment (`m7-w-kdoor-ov.png`, `m7-w-knave-ov.png`).
- Through the door the pull falls 5.2 -> 0.1 m in about 1.5 s (frames 150-240 of `m7-w-kdoor-ov.png`): the
  back arch holds its size while the walls rush past. It is the clamp target, not the smoothing.
- The slow return is visible mainly when you stop (`m7/drift.log`, `m7-stopNave.png`, `m7-stopTree.png`):

| Stop | Pull at 0 / 1 / 2 / 5 s | Picture scale change, standing still |
|---|---|---|
| in the nave | 0.52 / 0.84 / 0.97 / 1.05 | +8.7% in the 1st s, +3.3% in the 2nd, +2.0% over s 3-5 |
| beside the oak | 0.76 / 1.60 / 1.94 / 2.16 | +7.2%, +2.8%, +1.7% |
| just inside the door | 0.74 / 0.13 / 0.12 / 0.12 | -11.3% in the 1st s, then still |

  With the camera still, 1.0-2.7% of pixels change per frame for the first quarter second. In the sheets
  the tree in the window grows and the frame creeps. My judgement: while walking it hides in the walk; at a
  stop it reads as the picture settling for a second, closer to a wrong zoom than to a deliberate drift,
  because nothing else in the scene moves. Not seen in real time.
- In 99-191 frames per walk the smoothed pull is above the clamp target, by up to 0.75 m (0.89 m on the
  ring walk). That is the cause of 2.2's transient cuts and 2.4's holes.

### 2.2 Slivers and collision
- Standing poses: `m7/survey.log`, `m7/s2.log`. `m7-sv-all.png` (12 worst by the audit-6 metric): all 12
  are a grass strip at the bottom edge, no trunk or stone. `m7-s2-nave-maxpull.png`,
  `m7-sl-treeturn.png`: columns, altar and trunk whole.
- The 17 + 1 remaining cases are poses inside the 0.4 m margin, reachable only in fly mode
  (`m7-s2-nave-unreach.png`, first cell: camera inside a column drum).
- Walking past things with the lens lagging (`m7/dyn.log`, `m7/arches.log`, `m7-col-one.png`,
  `m7-col-dyn.png`): nave, weave, door, column pass, tree circle - 0 frames. Brushing a pier or buttress
  at 0.40-0.45 m on a 45 deg line: stone at the near plane for 1-6 frames, up to 11% of the frame (pull
  0.5 m against a target of 0.1-0.17 m). In `m7-col-one.png` the buttress at the left edge goes from a
  textured slab to a dark band to nothing in 6 frames; the oak trunk loses half its width in one frame
  when run past. `tele=0` shows neither.
- Can the walker get inside stone or a trunk? Not found. 135 walks straight at every solid, trunk and large
  lying stone (`m7/into.log`): none ended inside a collision circle. In 24 of 86 stone walks the near plane
  touched stone at the end or while turning on the spot (`m7-col-into.png`): mostly a wall filling the
  frame at 0.4 m, which is not a slice. Two places show a flat cut face with pull 0: the jambs of west
  arch 1 (-4.4, -6.7) and the east arch (4.2, -6.8). The back buttress corners (5.6, -11.0), (-5.7, -10.9),
  (6.9, -9.6) are similar. The wall-end masonry sticks out past the last collision circle there.
- Doorways: 48 keyboard passes through the three west arches, the east arch, the back arch and the door
  (centre, 0.4 m off, 25 and +-45 deg oblique, reverse): 45 through, none trapped in an opening. The three
  "blocked" ones were my own start points 0.2 m from the altar, which exposed a real trap: **a walker who
  starts inside the 0.4 m margin cannot move at all** (all three branches of the slide test fail). This
  happens after F from fly mode or a named view placed close to stone.
- The slide is axis-aligned only: walking straight -z at x = -10.5 past the oak stops dead at z = 4.04
  instead of sliding round the trunk.
- West arch 3 leaves 0.87 m of free width between the collision circles, the back arch 1.42 m, west
  arches 1-2 and the east arch 1.57 m.
- Nave columns collide at 1.18 m from the axis (circle 0.78 + 0.4), about 0.75 m from the drum surface.

### 2.3 Wobble
- `m7/wsp.log`. Arch: on and off are now the same picture (`m7-wobA.png` bottom row, `m7-panArch1.png`):
  smooth anti-aliased edge in all 6 pan frames, no crawl.
- Broken gable, 1.5 px pan steps, 3x (`m7-panGable1.png` vs `m7-panGable0.png`): with wobble on, 2-3
  detached 1-3 px marks sit in the sky up to 3 px right of the ragged edge in every frame, at different
  places each frame. With wobble off there are none. The same on the west pier's right edge
  (`m7-panWest1.png`, frames 2 and 5).
- No staircase on the gable itself beyond the paint filter's blocks, which are there with wobble off too.

### 2.4 Telephoto falloff, holes
- `m7/hole.log`: 0% in all 80 cells. Looking-down moves feetwalk, feetwalk60, lookdownIn, tilt: 0 of 12
  each. Surveys: 0 holes in 570 poses.
- All of that is with the lens snapped. Tilting down for real (`m7/drift.log`, pitch 0.06 -> -0.9 rad):

| Place | 0.1 s tilt | 0.2 s | 0.5 s |
|---|---|---|---|
| 12 m out (5, 10), pull 2.5 | 0% | 0% | 0% |
| west side 9 m (-9, 2), pull 3.1 | 5.6% | 0% | 0% |
| in front of the door (0.3, 12), pull 5.2 | 59% | 38% | 15% |

  `m7-lookdown-door-30.png`: a pale band across the bottom of the frame. The pull gives way with a 0.17 s
  time constant, slower than a look-down where the pull is large.

### 2.5 Chapel geometry and shader
- **Wall tops flip.** Flying over the low east wall at 2.6 m (`m7/topcross.mjs`, `m7-topflip-md.png`): the
  top slab in the foreground goes from shade to fully lit between x = 4.96 and 4.88, as a speckle that
  fills in over 8 cm of travel (changed pixels 9.1 -> 15.2 -> 10.4% in three 2 cm steps). Orbiting the wall
  at 5 m, a point on the top changes by 78 luminance levels in one degree where the camera crosses the
  wall plane. The +-1 m blend moves a threshold; the tone itself is still a hard step.
  On foot the wall cannot be crossed, and from beyond its end the door pier hides it, so this is mainly a
  fly-mode fault. Not confirmed from eye height.
- **Pier tops follow the viewer.** East door pier, orbit at 3.5 m (`m7-pierorbit-ov.png`,
  `m7/toporbit.mjs`): top luminance 148 -> 80 between 15 and 28 deg, 97 -> 190 between 246 and 266 deg,
  192 -> 149 between 310 and 345 deg. At most 12 levels per degree, so a fade over about 0.8 m of walking,
  not a pop - but the top visibly darkens and lightens as you walk round.
- Columns (`m7-colorbit-ov.png`, `m7-col2orbit-f1.png`): the contour stays on the silhouette at all 12
  angles, the sun patch and marks stay on the stone, max/median 1.01-1.08 at 0.5 deg per frame. No sliding
  strip found; the tall column is almost entirely in shade so the lit/shade strip was barely exercised.
- Popping / z-fighting: none found. Orbit 24 m, pier, wall and column orbits all max/median <= 1.17 except
  the wall-plane crossing (1.80). Dolly to the wall with `tele=0`: 1.03-1.11.

### 2.6 Flower drifts
- Sideways walk (`m7-strafe-b0.png`): the boil map is hot only in the near foreground strip at the bottom
  right; the pink drift in mid-frame is dark.
- Rise 1.7 -> 15 m over the west meadow (`m7-frise-ov.png`): the pale and pink drifts keep their shape in
  all 6 frames; max/median 1.01-1.04, one-frame flashes 0.06-0.70%.
- Slow dolly (1 m/s) toward the drift (`m7-fdolly-ov.png`): 0.24-1.93% changed px per frame, flashes
  0.005-0.09%, max/median 1.04-1.08. No popping, boiling or swimming found.
- Rise from the hero spot: max/median 1.04-1.14, steps fall smoothly 13.3 -> 10.0%.

## 3. Frame time
`tools/perf2.mjs`, 5 runs, range of the 5 minimums.

| View | 1280x720 | 1920x1080 |
|---|---|---|
| hero | 7.9-9.5 ms | 14.3-18.2 ms |
| inside | 7.6-8.7 ms | 13.1-18.2 ms |
| feet | 5.0-5.1 ms | 9.0-12.3 ms |

Load average 3-4 with another agent rendering on the same GPU. 720p repeats within 1.5 ms; 1080p swings by
4-5 ms between runs (medians up to 25 ms), so only the best run (14.3 / 13.1 / 9.0) is comparable with
audit 6. Paint filter 0.9-3.1 ms at 720p, 2.6-5.4 ms at 1080p; wobble inside the noise.

## 4. What a viewer would still notice, worst first

### P1. Looking down near the chapel opens a hole at the bottom - NOTICEABLE, default settings, new
- Evidence 2.4. Owner `src/main.js` (lens block in `frame()`).
- Fix: the smoothing must never hold the pull above the clamp. After the rate limit use
  `pull = Math.min(pullS, target)` and set `pullS = pull`. Giving way is then instant, as in audit 6, and
  only the return is slow. This also removes the transient cuts in P4.

### P2. The picture keeps zooming for 1-2 s after you stop - NOTICEABLE in and beside the chapel
- Evidence 2.1. Owner `src/main.js`.
- Fix: let the return run only while the viewer moves or turns: scale the return rate by
  `min(1, speed / 1.5)` (state.pos delta / dt), so a standing camera is still. Alternatively make the
  return far slower (time constant 3-4 s), below the threshold of a visible zoom.

### P3. Low wall tops flip tone when the camera crosses the wall plane; pier tops follow the viewer - NOTICEABLE in fly mode, MINOR on foot
- Evidence 2.5. Owner `src/stone.js` (`vTopNdl` in the vertex shader and its threshold in the fragment
  shader).
- Fix: blend colours, not the threshold input. Evaluate the lit/shade decision for both wall faces
  (`+h` and `-h`) and `mix()` the two resulting colours by `smoothstep(-1.0, 1.0, dot(tc, h))`. For pier
  tops stop using the direction to the camera: give the top the tone of the pier's sun-side face.

### P4. Stone and trunks pop through the near plane for a few frames when brushed past - MINOR
- Evidence 2.2. Owner `src/main.js`; fixed by P1's `min()`.
- For the pull-0 cases at arch jambs and buttress corners, owner `src/ruin.js` (`SOLIDS`): add a circle at
  each jamb end (`s = o.c +- o.w / 2`) and at each buttress outer corner, or raise the wall circle radius
  from `thick / 2 + 0.14` to `thick / 2 + 0.3`.

### P5. Specks in the sky beside ragged stone edges - MINOR, regressed
- Evidence 2.3. Owner `src/pipeline.js` (`COMPOSITE_FS`, wobble block).
- Fix: a sky pixel should only be displaced if the displaced sample is stone or if a neighbour in the
  direction of the displacement is. Simplest: after computing `uv`, if the centre pixel is not stone and
  `texture(tAux, uv).a < 0.5` is false while fewer than 2 of the 8 taps were stone, keep `uv = vUv`. Or
  scale the displacement by the stone share of the 8 taps instead of taking it from one tap.

### P6. A walker inside the collision margin is frozen; round obstacles stop you dead - MINOR
- Evidence 2.2. Owner `src/main.js` (`move()`).
- Fix: allow any step that does not reduce `standDist` (`if (dNew < 0.4 && dNew < dOld)`), and slide along
  the obstacle's tangent: push the position out along the gradient of `standDist` to 0.4 m instead of
  cancelling an axis.

### P7. 1080p has no headroom - MINOR, unchanged
- 13-18 ms hero and inside. Owner `src/pipeline.js`: the paint filter is the 2.6-5.4 ms lever.

## 5. Not verified
- Anything in real time. P2's "wrong zoom" reading is from pull curves and five stills per stop.
- Wall-top flip from eye height on foot; only shown flying at 2.6 m and in a 5 m orbit.
- Lit/shade strip on a sunlit column: the columns tested were in shade.
- Whether any named view in `src/views.js` lands inside the collision margin (the check script failed).
- West arch 3's 0.87 m free width against keyboard steering errors: only straight lines were walked.
- Forced `tele=0.35` / `0.7`, the shift lens, and element-tone stepping (`tone.mjs`) were not re-run.
- Frame times on a quiet machine.
- Small trees: at 0.5 m the trunk fills the frame; no cut face seen, only 9 worst frames were looked at.
