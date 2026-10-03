# Critique 9 - motion re-check of the audit-8 fixes

1280x720, headless Chrome on the Radeon 780M (ANGLE/Vulkan), frozen scene time, app loop driven one frame
at a time at 1/60 s. Judged from numbers, 16-frame windows, contact sheets and crops - not real-time video.
All walks are keyboard walks (W/A/S/D events through `move()`), none set `state.pos` per frame.

- Measured from a frozen copy, `.work/mot9` (taken 03:56; `src/main.js` and `src/pipeline.js` in the main
  dir were still byte-identical to it at 04:45). `SOLIDS` = 56 circles, 14 trunks = audit 8's snapshot B.
- "As received" = that copy unchanged (served from `.work/mot9o`, since deleted).
  "mot9" = the copy with my edits to `.work/mot9/src/main.js` (section 3). `pipeline.js` is unchanged.
- Scripts and logs: `.../scratchpad/m9/` (`walk2.mjs`, `aisle.mjs`, `width.mjs` are new; the rest are
  audit 8's). As-received logs in `m9/orig/` and `m9/walk2-0.log`. Images `shots/m9-*`.
- New in the metric: `walk2.mjs` records 10 standing frames before the key goes down and 60 after it is
  released. Audit 7/8 started counting at the second walking frame, so a zoom-rate step on the first step
  was never counted. It is listed separately below ("first step").

## 1. Audit 8 -> now

| # | Check | Audit 8 | As received | mot9 | Verdict (mot9) |
|---|---|---|---|---|---|
| 1a | Largest one-frame change of zoom rate, mid-walk: nave / door / across | 1.72 / 1.13 / 1.75% | 0.35 / 0.17 / 0.00% | 0.24 / 0.08 / 0.00% | fixed (audit 7: 0.22 / 0.17 / 0.24) |
| 1a | same, weave / diagonal / out of the door / along west wall | - | 0.51 / 0.20 / 0.18 / 0.09% | 0.23 / 0.20 / 0.31 / 0.07% | ok |
| 1a | same, on the first step (new metric): nave / weave / at the west wall / along west wall | (0.5-0.8%, not counted) | **2.94 / 2.90 / 2.32 / 1.05%** | 0.21 / 0.21 / 0.49 / 0.25% | as received: regressed; mot9: fixed where the lens has slack |
| 1a | first step when the lens stands exactly on its clamp (after a V-key view), walking at the stone: west 9 m / nave | 0.44-0.58% | 2.80 / 3.16% | 0.83 / 0.80% | reduced to the clamp's own slope; not gone |
| 1a | Running (Shift) in the nave from standing: first step / when the pull reaches 0 | - | 4.13 / 3.10% | 1.84 / 3.10% | not fixed (clamp-bound all the way, 3.7 m of pull lost in 0.27 s) |
| 1a | Running to the door, mid-walk | - | 1.02% | 0.20% | fixed |
| 1a | Largest lens change: nave / door / across | 130 / 79 / 152 %/s | 176 / 58 / 0 %/s | 127 / 56 / 0 %/s | - |
| 1a | Frame step max/median, audit 8's kink windows (door f218, f312; nave f128, f199; across f98) | 1.48, 1.22; 1.59, 4.07; 1.38 | not run | 1.01, 1.02; 1.05, 1.15; 1.11 | fixed |
| 1a | Frame step max/median, windows round the largest remaining kinks | - | 1.26-1.50 (nave start 1.48) | 1.02-1.34 (nave start 1.25) | ok |
| 1b | Hole while tilting down, 7 places x 0.1 / 0.2 / 0.5 s | 0% in 21 | 0% in 21 | 0% in 21 | same |
| 1b | Stone at near plane, 48 passes | 0 frames | not run | 0 frames in 48 | same |
| 1b | Near plane cut in 13 walks (nave, weave, door, 3 oak passes, oak circle, columns, west arch, 3 runs incl. oak) | 0 frames | 0 frames | 0 frames | same |
| 1b | Frames with pull above the present-position clamp | 0 | 0 (by construction) | 0 of 3095 in 10 walks | same |
| 1c | Picture scaling after stopping, nave / door / oak, 1st / 2nd s / s 3-5 | 0.0% | 0.0% | 0.0% | same |
| 1c | Changed px per frame right after stopping | 0.01-0.02% | 0.01-0.02% | 0.01-0.02% | same |
| 1d | Look down and back up, standing: picture vs before (door / west / nave) | 33.6 / 27.9 / 30.4% wider | 0.0 / 0.0 / 0.0% | 0.0 / 0.0 / 0.0% | fixed |
| 1e | Total zoom travel: nave / weave / door | 94 / - / 80% | 68 / 86 / 59% | 41 / 50 / 57% | - |
| 1e | Pull swells between the nave columns | 0.24-0.47 m, twice | 0.13-0.23 m, twice (weave: three, to 0.75 m) | none (pull 0.00 after the first fall; weave one of 0.09 m) | fixed |
| 2 | Wall slide, east wall inside 20 deg: sideways zig-zag / heading change per frame / jerk | 6 cm at 4.3 Hz / 24-39 deg / 3.0 cm | 0.8 cm / 7 deg / 0.6 cm | 1.2 cm / 3 deg / 0.3 cm | fixed |
| 2 | same, speed | 2.5-3.2 m/s | 2.4-3.2 | 2.95-3.2 | fixed |
| 2 | Ripple of the 0.4 m line along the east wall (z -3..0.5) | 6.4 cm | 2.0 cm | 2.0 cm | fixed |
| 2 | Low east wall: stop line from inside / outside (14 walks) | (walked through) | x 3.96-4.09 / 5.80-6.04 | 4.01 / 5.98-5.99 | mot9: even |
| 2 | Low east wall crossed | 8 of 14 | 0 of 14 | 0 of 14 | fixed |
| 2 | Head-on at the low east wall | stands still | creeps 0.13-0.24 m/s, 7.3 cm in last 0.5 s | creeps 0.05-0.15 m/s, 2.7 cm in last 0.5 s | new, minor |
| 2 | Free width: west arches 1-3, east arch / back arch / door | 1.56-1.57 / 2.02 / - | 1.56 / 2.02 / 7.33 m | same | same, passable |
| 2 | Free width of the four aisles between nave columns and side walls | 0.26 (0.42 by the low wall) | 0.12-0.18 (0.32) m | 0.12-0.18 m | narrower; 32 of 32 walks through |
| 2 | 48 passes through arches and door | 47 through | run killed after 30 (29 through, the altar one not) | 47 through (the same one walks into the altar) | same |
| 2 | Walks at solids ending inside a circle / stone at near plane | 0 of 117 / 0.003% | not run (run killed) | 0 of 107 solid + trunk walks / 0.0004% (lens without the no-pump rule) | same |
| 2 | Start inside the margin: leaves by itself, largest shove per frame | 8-25 cm | 8 cm | 8 cm | fixed |
| 2 | Leaving fly mode inside the oak / a door pier | 0.84 m in 4 frames | 0.84 m / 1.33 m at 8 cm per frame | same | fixed |
| 2 | Dropped on the axis of the east wall / centre of altar / column: pushed out without a key | no | no | no | not fixed |
| 2 | same, W along the wall axis from inside the east wall | stays inside | 0.0 m in 1 s (other three directions leave) | same | not fixed (fly only) |
| 2 | Aimed exactly at the centre of a column, pier, trunk | stops (29 of 54) | stops (23 of 54) | same | same |
| 2 | Concave corner of west wall and buttress | crawls 0.2-0.4 m/s | 0.3-0.6 m/s | same | same |
| 3 | Detached marks in sky by the gable per pan frame, wobble on / off | 0-2 (10 of 12 frames) / 0 | 1 1 1 2 1 1 1 2 1 1 1 3 / 1 in every frame | same file | reduced: the wobble adds one in 2 frames, two in 1, none in 9 |
| 3 | West pier crop, on / off | 0-8 / 0-4 | 0-2 / 0-2 | same | reduced |
| 3 | Arch | 0 | 1 / 1 (same mark on and off) | same | same |
| 3 | Gable outline with wobble | wanders, anti-aliased | wanders 1-3 px against wobble off, anti-aliased, no steps (`m9/gable-on.png`, `gable-off.png`, 3x) | same | ok |
| B | Hero half-pixel residual, gable crop 620,80,200,150, wobble on / off | 0.96 / 0.86 (B 0.81 / 0.78) | 0.85 / 0.78% | same | same as B |
| B | Hero grass crop 480,500,320,200 | 3.30% (B 2.23) | 2.20% (mean 2.24); paint filter off 4.00% | same | same as B |
| B | Half-pixel pan by band, hero: 6.5-9 / 9-17 m, with / without flowers | B 2.3 / 1.8; 0.6 / 0.8 | 2.3 / 1.8; 0.6 / 0.8 | same | same |
| B | same, drift view | B 2.5 / 2.4 | 2.5 / 2.4; without flowers 0.4 / 1.5 | same | same |
| B | Sideways walk, one-frame flashes 6.5-9 / 9-17 m, hero, with / without flowers | A 6.8 / -; 3.8 / - | 4.8 / 3.5; 3.9 / 3.0% | same | flowers add 0.9 / 0.5 points |
| B | same, drift view | - | 5.8 / 4.7; 4.8 / 5.0% | same | - |
| B | Sideways walk (`strafe`), changed px/frame seg 1 / 2 | 5.06 / 10.1 (B 4.72 / 9.94) | 4.72 / 9.94% | same | same as B |
| B | px changing in at least half the frames, seg 1 / 2 | 2.30 / 1.66 (B 1.93 / 1.74) | 1.93 / 1.74% | same | same as B |
| B | Frame time 720p hero / inside / feet / rimE, best of 3 | 7.8 / 7.1 / 4.6 / 7.1 ms | - | 8.1 / 7.4 / 4.5 / 7.4 ms | same |
| B | Frame time 1080p | 14.7 / 13.4 / 8.9 / 13.3 ms | - | 15.0 / 13.9 / 8.8 / 13.7 ms | same, no headroom |

## 2. Detail

### 2.1 Lens, as received
`m9/walk0.log`, `walk2-0.log`, `orig/*.log`.

- Mid-walk the twitch is gone: nave 0.35% (w189), door 0.17%, across 0.00% (the pull stays 0 on that line).
  Weave 0.51%.
- **New: the first step.** The look-ahead uses the raw walking velocity, which goes 0 -> 3.2 m/s in one
  frame. If anything is within 0.5 s (1.6 m at a walk, 4.5 m at a run) of the line ahead, the target drops
  at once and the pull follows with a 0.12 s constant, i.e. 14% of the gap in the first frame.
  Nave start: pull 3.76 -> 3.41 -> 3.09 -> 2.81, zoom rate 0 -> 2.94%/frame in one frame (176%/s);
  changed px 7.64% on the first walking frame falling to 5.15% eight frames later (max/median 1.48).
  West wall from 3.5 m: 2.32%. Audit 8's code gave 0.5-0.8% here.
- Holes, near-plane cuts, post-stop zoom, glance down and up: all clean (table).
- Pumping: the return runs whenever the 0.5 s ahead is clear, so the pull swells 0.13-0.23 m between the
  nave columns and falls again (2-4% of scale each, twice per nave walk).

### 2.2 Lens, mot9
`m9/walk2-final.log`, `walkK.log`, `drift.log`, `lookup.log`, `dyn.log`, `arches.log`.

- Zoom rate round the largest kinks, %/frame:
  nave start `-0.03 0.18 0.42 0.66 0.89 1.10 1.29`; weave w115 (before the last edit) `-0.15 -0.12 0.05 0.28 0.43 0.50`;
  out of the door w11 `0.00 0.06 0.30 0.62 0.83 0.93 0.96` (0.31%, the largest mid-walk value in 10 walks;
  D + pull is 3.4 m there, so 1 cm of pull is 0.3% of scale).
- Where the lens stands exactly on its clamp and the walker heads at the stone, the pull can only follow the
  clamp: 1.7 x 3.2 m/s. That is a rate step of 0.5% (west wall, 11 m lens distance) to 0.8% (nave) in the
  frame the walk itself starts. The walk's own start is a step of the same size (3.2 m/s / 60 / distance =
  1.3%/frame for something 4 m away). After ordinary walking the lens has slack (it never rises to the
  clamp while a pier is within 0.6 s ahead); after a V-key view it does not.
- Running in the nave from standing: clamp-bound for the whole 16 frames; 1.84% on the first step and
  3.10% when the pull reaches 0 (rate 4.13 -> 1.03 -> 0). Changed px 10.3 -> 12.6% in that frame.
- Pull every 1/12 of the walk: nave `3.75 1.08 0.04 0 0 0 0 0 0 0 0 0 0`; door `5.20 5.14 5.14 5.16 5.09
  4.72 2.61 0.35 0 0 0.06 0.10 0.10`; out of the door `0.37 0 0.10 1.12 2.39 3.41 4.13 4.56 4.80 5.03 ...`
  (the lens comes back in the open); along the west wall outside `4.67 2.95 2.92 2.69 1.87 1.86 1.87 ...`.
- Consequence of the no-pump rule: inside the nave a walking viewer has pull 0 (as received: 0-0.23 m).
- At the stop the pull freezes in the frame the walker stops; if it was falling, that is a rate step of up
  to 0.21% (out of the door) in the same frame the picture stops.

### 2.3 Collision
`m9/slide.log`, `slide2.log`, `lowwall.log`, `aisle.log`, `into.log`, `arches.log`; `node width.mjs`.

- East wall inside, 20 deg, frames 110-141: x 4.002 -> 4.008 -> 3.996, speed 3.0 m/s constant, changed px
  rising evenly 1.37 -> 7.21%.
- As received the added low-wall circles (r 0.40 every 0.35 m) sit among three r 0.56 circles from
  `ruin.js`: the stop line steps 13 cm (x 3.96-4.09) and a walker pushing head-on slides sideways at
  0.13-0.24 m/s. With one size and one spacing (mot9) the line is 4.01 everywhere; the head-on creep is
  0.05-0.15 m/s (0.6 m in 2 s at z 2.3, towards the hollow between two circles).
- Smooth-min narrows every throat between two different solids by about 8 cm a side: aisles between nave
  columns and side walls 0.26 -> 0.12-0.18 m. All 32 aisle walks (4 columns x 2 directions x 4 approaches)
  get through; slowest 0.11 m/s for a moment hugging the wall at 45 deg, heading changes up to 76 deg in one
  frame at first contact with a column.
- East wall inside at 70 deg and the oak head-on: first-contact jerk 4.8 cm / 62 deg and 3.2 cm / 74 deg
  (audit 8: 4.1 cm / 73 deg) - unchanged.
- 10 of 27 trunk walks still put sapling foliage within the near plane (up to 18% of the upper frame) - unchanged.

### 2.4 Wobble
`m9/speck2.log`, `shots/m9-speck-gable.png`.

- The mark present with wobble off in every gable frame is a leaf of the oak (11 px), not stone.
- With wobble on: one extra 1-px mark in pan frames 4 and 8, two in frame 12 (pale stone colour beside the
  left bump of the gable, grey-blue beside the right slope).
- Tried in `pipeline.js`: let a non-stone pixel take a displaced stone sample only if 3 of that sample's 4
  neighbours are stone. Count went to 1 1 1 3 2 1 1 2 1 1 1 3 - no better. Reverted; not in the hand-back.

### 2.5 Frame time
`m9/perf.log`, `tools/perf2.mjs`, minimums, with the mot9 `main.js`. Load average 2.3 at the start; another
job arrived during runs 1-2 (load 13.7, then 22.1; 1080p hero 17.9-19.7 ms in those). Run 3 was clean
(1080p medians within 0.5 ms of the minimums) and gives the 1080p figures; 720p is best of three.
Paint filter: 1.1-1.4 ms at 720p, 2.5-2.9 ms at 1080p. Wobble: within 0.1 ms.

## 3. Changes in `.work/mot9/src/main.js` (only file changed)

1. `standDist()`: the low east wall gets circles of radius 0.56 every 0.695 m from z 1.22 to 6.78, skipping
   places where `ruin.js` already has one within 0.35 m (was: radius 0.40 every 0.35 m from 1.6 to 7.6).
2. Lens block in `frame()`, new state `pullT`, `laX`, `laZ`, constants in `LENS`:
   - the look-ahead velocity eases in with a 0.2 s constant and is zero when standing (was: raw velocity);
   - look-ahead samples at 0.15 / 0.3 / 0.45 / 0.6 s (was 0.15 / 0.3 / 0.5);
   - two stages: `pullT` takes the target (down with 0.08 s, up at 0.9/s scaled by speed), `pullS` follows
     `pullT` with 0.08 s; both are hard-clamped to the present-position clamp every frame;
   - the return runs only if the clamp at 0.9 / 1.2 / 1.5 s ahead is also above `pullT`;
   - nothing moves while the walking speed is below 0.05 m/s;
   - pitch factor and ground clamp after smoothing, as before.
3. `window.__app.lens` reports `pullS`, `c0`, `want`, `tgt` (measuring only).

`move()` is untouched.

## 4. What a viewer would still notice, worst first

1. **Running in the nave from a standstill**: the lens loses 3.7 m in 0.27 s and stops dead (3.1% rate
   step). NOTICEABLE, only with Shift, only when starting within 2.5 m of a column. Not fixable in the lens
   while the pull must stay under the clamp; a softer knee on the clamp near 0 would halve it at the cost
   of pull near stone everywhere.
2. **First step from a V-key view straight at nearby stone**: 0.5-0.8% rate step with the first frame of
   motion. MINOR. Would need the walking speed itself to ease in over about 0.15 s (`move()`), which
   changes how the controls feel - not done.
3. **Flower belt at 6.5-17 m** on slow pans and sideways walks: unchanged from audit 8 B (2.3 / 1.8% against
   0.6 / 0.8% without flowers). MINOR. Owner `src/extra/grass.js`.
4. **Aisles beside the nave columns are 0.12-0.18 m wide for the walker**: one is steered through, with a
   heading snap of up to 76 deg at the column. MINOR. Lower K (0.08) or smaller wall circles there.
5. **Pushing head-on at the low east wall slides sideways at 5-15 cm/s.** MINOR.
6. **One-pixel marks in the sky by the gable** in 3 of 12 pan frames. MINOR.
7. **Fly mode left inside a wall, on its axis**: no push, and W along the axis does not move. MINOR, fly only.
8. **1080p**: 13.7-15.0 ms on hero, inside, rimE. Unchanged.
9. Inside the nave the walking lens is now fully wide (pull 0). Not a motion fault; a look decision.

## 5. Not verified
- Anything in real time, and any frame-time jitter: every walk ran at a fixed 1/60 s step.
- Walks at solids (`into`) ran on mot9 with the east-wall edit but before the no-pump rule was added to the lens
  (that rule only lowers the pull); not run on the as-received build. The 48 passes ran on the final mot9.
- Frame-step windows for audit 8's kink frames on the as-received build (only windows at its own kinks).
- Frame time of the as-received build (perf was run on mot9 only).
- Thin-line pans, tree orbits, wall-top and pier-top orbits on B: not re-run.
- Where the remaining sky marks come from (colour pass or line pass).
