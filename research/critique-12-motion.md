# Critique 12 - motion audit after three art rounds (stone pre-pass, view-dependent stone, flowers, trees)

1280x720 unless stated (1080p where stated), headless Chrome on the Radeon 780M (ANGLE/Vulkan), frozen scene
time, app loop driven one frame at a time at 1/60 s. Judged from numbers, contact sheets and crops - not
real-time video. Walks are keyboard walks (W/A/S/D/E events through `move()`) unless a line says "pose".

- Measured from a frozen copy, `.work/mot12` (taken 12:13). `src/main.js` and `src/pipeline.js` in the main dir
  were byte-identical to audit 9's hand-back (`.work/mot9`) at that time and still identical to the copy's
  originals at 13:40.
- "As received" = that copy unchanged. "mot12" = the copy with my edits to `.work/mot12/src/main.js`
  (section 4). `pipeline.js` is handed back unchanged (a trial fix was measured and withdrawn, 3.6).
- `SOLIDS` is **not** unchanged: 62 circles (audit 9: 56). `ruin.js` now gives the low east wall its own
  circles at z 1.23 ... 6.80 (tops 0.73-1.5 m), at the places where `main.js` used to add them, so the footprint
  for walking is the same and `main.js` adds none. Lying stones with r > 0.3: 14 (audit 9: 16).
- Scripts and logs: `.../scratchpad/m12/` (new: `zf.mjs`, `plib.mjs`, `vd.mjs`, `orb.mjs`, `pop.mjs`,
  `stuck.mjs`, `rockcut.mjs`, `speck4.mjs`, `trace.mjs`; the rest are audit 8/9's). Images `shots/m12-*`.
- The dev server (`tools/srv.mjs`) does not watch files: it must be restarted after every edit of `src/`.

New measures used here:
- **Pre-pass on/off**: every frame rendered twice at the same camera, pre-pass twins visible and hidden;
  any differing pixel is a lost depth test.
- **View-dependent repaint** (`vd.mjs`): the present frame against the same frame (same geometry, lens,
  projection) painted with `uCamPos` of the frame before. What differs is what the paint did because the
  eye moved 5.3 cm, with all parallax removed. Reported as % of stone px (or ground+plant px) off by > 24 / 255.
- **Reprojection residual** (`orb.mjs`): frame B against frame A reprojected through B's depth buffer; pixels
  at depth edges or hidden in A are left out. On an orbit about a target the target stays still on screen,
  so the residual is paint that moved on the surface, not resampling.

## 1. Audit 9 -> now

| # | Check | Audit 9 | As received | mot12 | Verdict |
|---|---|---|---|---|---|
| 1 | Stone pre-pass: px differing with pre-pass on / off, 673 frames (4 walks, 11 pans incl. fov 14 and 1 m from a wall, fly-up), 720p | - | 18 256 px, none > 24; the same frame rendered twice differs in 17 889 | same | no z-fighting |
| 1 | same, 1080p | - | 19 332 px, none > 24; rendered twice: 19 761 | same | no z-fighting |
| 2 | Walk at a wall 10 m -> 1 m: stone repainted by view-dependent terms per frame, median / p95 / max (5 walks) | - | 0.01-0.05 / 0.05-0.28 / 0.07-0.93% | same | fades are calm, **sun patches pop** |
| 2 | same: frames with > 0.15% of stone repainted in one frame: west wall inside the nave / through west arch / SW corner / east wall / north wall | - | **16 of 214 / 10 of 199 / 24 of 189** / 0 / 0 | same | new fault (stone.js) |
| 2 | Fly up over the nave, eye level -> 60 deg (E held, 480 frames): stone repainted per frame, median / max | - | 0.018 / 0.054% (from SE: 0.002 / 0.030%) | same | cross-fades calmly |
| 3 | Stone, reprojection residual: half-pixel pan / orbit 5.3 cm / 53 cm / 2 m, 12 views | - | 0.02-0.55 / 0.01-0.43 / 0.03-0.81 / 0.22-1.52% | same | world-anchored |
| 4 | Half-pixel pan by band, hero: 6.5-9 / 9-17 m | 2.3 / 1.8% | **0.2 / 0.9%** (without flowers 0.2 / 0.8) | same | better |
| 4 | same, drift view | 2.5 / 2.4% | 1.1 / 1.7% (without flowers 0.4 / 1.6) | same | better |
| 4 | Sideways walk, one-frame flashes 6.5-9 / 9-17 m, hero | 4.8 / 3.5% | 1.4 / 3.2% (without flowers 1.3 / 3.0) | same | better near, same further out |
| 4 | same, drift view | 5.8 / 4.7% | 3.5 / 4.5% (without flowers 4.2 / 4.6) | same | better near |
| 4 | Hero grass crop 480,500,320,200, half-pixel residual | 2.20% | 0.91% (paint filter off 1.78%) | same | better |
| 4 | Hero gable crop 620,80,200,150, wobble on / off | 0.85 / 0.78% | 0.91 / 0.81% | same | same |
| 4 | Sideways walk (`strafe`), changed px/frame seg 1 / 2 | 4.72 / 9.94% | 3.14 / 9.05% | same | better |
| 4 | px changing in at least half the frames, seg 1 / 2 | 1.93 / 1.74% | 0.51 / 1.47% | same | better |
| 4 | Walk forward / sideways through flower bands, rise to top view (6 moves, 300-420 frames each): ground+plants repainted per frame by view-dependent terms, max | - | 0.06-0.13%, largest one-frame spike 0.02 points | same | no popping |
| 5 | Oak orbit at 9 m (`orbit30`, pose): changed px/frame, 4 windows | (audit 8) 12.2 / 7.8 / 8.1 / 14.8%, max/med <= 1.05 | 10.4 / 7.8 / 7.7 / 13.5%, max/med <= 1.06 | same | stable |
| 5 | same, one-frame flashes | (audit 8) 1.52 / 0.54 / 0.52 / 2.62% | 1.28 / 0.62 / 0.61 / 2.33% | same | same |
| 5 | Walking under the oak looking up (280 frames): plants repainted per frame, median / max | - | 0.11 / 0.32%, no spikes | same | stable |
| 5 | Long lens (fov 14-24), half-pixel / 3.3 px pan residual: 3 mountain views, 3 hill views, village, castle, far woods | - | 0.04-0.55% / 0.02-0.29% | same | stable |
| 6 | Zoom-rate step mid-walk: nave / door / across | 0.24 / 0.08 / 0.00% | 0.24 / 0.08 / 0.00% | 0.18 / 0.04 / 0.00% | ok |
| 6 | same: weave / diagonal / out of the door / along west wall | 0.23 / 0.20 / 0.31 / 0.07% | 0.23 / 0.20 / 0.31 / 0.03% | 0.18 / 0.12 / 0.03 / 0.03% | ok |
| 6 | First step: nave / weave / at the west wall / along west wall | 0.21 / 0.21 / 0.49 / 0.25% | 0.21 / 0.21 / 0.49 / 0.38% | 0.04 / 0.04 / 0.05 / 0.01% | fixed |
| 6 | First step from a V-key view at stone (`lookup.mjs`): west 9 m / nave | 0.83 / 0.80% | 0.83 / 0.80% | 0.07 / 0.05% | fixed |
| 6 | Running in the nave from standing: first step / largest later step | 1.84 / 3.10% | 1.84 / 3.10% | 0.10 / 0.61% | fixed (was NOTICEABLE) |
| 6 | Running to the door: mid-walk / in the frame the runner stops | 0.20 / 0.00% | 0.20 / 0.00% | 0.54 / **2.11%** | new, see 3.5 |
| 6 | Largest lens change: nave / door / across | 127 / 56 / 0 %/s | same | 99 / 34 / 0 %/s | - |
| 6 | Total zoom travel: nave / weave / door | 41 / 50 / 57% | same | 57 / 66 / 44% | - |
| 6 | Pull while walking down the nave (x 0.5), every 1/12 | 3.75 1.08 0.04 0 0 0 0 0 0 0 0 0 0 | same | 3.45 1.99 1.39 1.29 1.26 1.22 1.14 1.09 1.06 1.04 1.01 0.14 0.00 | nave pull 1.0-1.4 m (was 0) |
| 6 | Pull swells while walking: nave / weave | none / one of 0.09 m | same | none / one of 0.26 m (0.58 -> 0.84 over 1.6 s) | weave: larger |
| 6 | Frames with pull above the present-position clamp, 10 walks | 0 of 3095 | 0 | 0 of 3095 | same |
| 6 | Near-plane cut in 13 walks (`collide.mjs dyn`) | 0 frames | - | 0 frames | same |
| 6 | Hole while tilting down, 7 places x 0.1 / 0.2 / 0.5 s | 0% in 21 | - | 0% in 21 | same |
| 6 | Picture scaling after stopping, nave / door / oak | 0.0% | - | 0.0% | same |
| 6 | Look down and back up, standing | 0.0% | 0.0% | 0.0% | same |
| 6 | Walks at solids ending inside a circle / stone at near plane (`into`) | 0 of 107 / 0.0004% | - | 0 of 119 / 0.0013%; 20 walks at lying stones: 0 | same |
| 6 | Low lying stones (5 in the nave) walked past at 0.1-0.45 m, 4 tilts, fov 32: stone at near plane | (clamp was 0 there) | - | 0 of 5100 frames | no cut |
| 6 | Wall slide, east wall inside 20 deg: zig-zag / speed | 1.2 cm / 2.95-3.2 m/s | - | 0.7 cm / 3.0 m/s | same |
| 6 | Low east wall: stop line inside / outside, crossed | 4.01 / 5.98-5.99, 0 of 14 | - | 4.00-4.01 / 5.99-6.00, 0 of 14 | same |
| 6 | Four aisles (32 walks) / 48 passes through arches and door | 32 / 47 through | - | 32 / 47 through (the same one walks into the altar) | same |
| 6 | Fly mode left on a wall axis / centre of altar, column, oak, pier (11 places): pushed out without a key | no | no | yes, free after 0.7-1.5 s at 3 cm per frame | fixed |
| 6 | same, W along the wall axis from inside the wall, 1 s | 0.0 m | 0.0 m | 1.1-3.8 m, ends free | fixed |
| 6 | Detached marks in sky only present with wobble, 12 pan frames: gable / west | 3-4 / - | 4 / 10 | 4 / 10 (trial fix: 4 / 1, withdrawn) | not fixed |
| 7 | Frame time 720p hero / inside / feet / rimE, best of 3 | 8.1 / 7.4 / 4.5 / 7.4 ms | - | 7.3 / 6.4 / 4.2 / 6.5 ms | better |
| 7 | Frame time 1080p | 15.0 / 13.9 / 8.8 / 13.7 ms | - | 13.6 / 12.2 / 8.3 / 12.3 ms | better, still under 60 fps margin |
| 7 | same with the pre-pass hidden, 720p / 1080p | - | - | 8.5 / 7.8 / 4.1 / 7.2; 15.5 / 14.9 / 8.1 / 13.9 ms | pre-pass saves 0.7-1.4 / 1.6-2.9 ms |

## 2. Detail, paint

### 2.1 Stone pre-pass
`zf.mjs`, `m12/zf1080.log`. Three pre-pass meshes. 16 sequences: walk hero -> door, nave, at the west wall,
strafe along the west wall, pans at hero / inside / close / westwall / high / down, pans with fov 14 at hero,
southfar, rimE, fov 20 at haloN, a pan 1 m from a wall, fly-up to 60 deg (pose).
With and without the pre-pass the frames differ in 0-193 px each, none by more than 24, and the same frame
rendered twice differs by the same amount (17 889 px over the 673 frames at 720p). So the pre-pass adds
nothing measurable. Where that render-to-render difference comes from was not found.

### 2.2 Stone view-dependent terms
`vd.mjs`, `m12/vd-stone.log`, `vd-p0.log`, sheets `shots/m12-vd-<walk>.png`, worst frames `...-worst.png`.

- Walks: east wall outside from 16.5 m (`wallE`), north wall outside from 21 m (`wallNW`), down the east side
  of the nave to the north wall (`wallInN`), through the west arch (`wallW`), at the south-west corner
  (`wallSW`). Stone repainted per frame at > 12 / 255 (slow fades of low contrast): p95 0.4-1.2%, max 0.9-4.1%.
  Near-detail joints, dry-brush, foot band, far fringe: no one-frame event found in them.
- **Sun patches and shadow-edge lobes pop.** `shots/m12-pop-wallW-140.png` (4x crops, frames 140-143): the
  edge of a cast shadow on the west wall jumps about 20 px between two frames 5 cm apart; `m12-vd-wallInN-worst.png`,
  `m12-vd-wallSW-worst.png`: whole islands of light 20-60 px across appear in one frame. Largest single frame:
  0.93% of the stone in view.
  Cause, tested by patching the shader in the page: `stone.js`, `float eN = mix(edgeN, ...bs.a..., bs.r..., lost * 0.75)`.
  `bs` is the screen-stable dab field (`brushStable`), which changes with distance; it offsets the light
  threshold, and where the blurred shadow field is nearly flat a small offset moves the contour a long way.
  With `float eN = edgeN;` (world-fixed only): frames above 0.15% go 16 -> 1, 10 -> 1, 24 -> 8; worst frame
  0.93 -> 0.24%, 0.44 -> 0.21%, 0.46 -> 0.35%. Also removing the distance / from-above fades of `dapK` and
  `rimW` changed nothing further. This line is not in audit 9's `stone.js`.
- Fly-up (E held from 1.65 m to 27 m, aimed at the nave, 480 frames): stone 0.054% max per frame, ground 0.15%.
  Slab turf threshold and wall-top green: no spike (largest 0.03 points). Sheet `shots/m12-vd-rise.png`.

### 2.3 World anchoring on orbits
`orb.mjs stone`, crops `shots/m12-orb-stone-<view>.png` (target held in the centre, 8 steps of 0.25 m).
Residual on stone, % off by > 24: pan 0.5 px / orbit 5.3 cm / 53 cm / 2 m / rise 53 cm:
hero 0.38 / 0.36 / 0.81 / 1.22 / 0.83; westwall 0.27 / 0.39 / 0.73 / 1.23 / 0.51; inside 0.07 / 0.19 / 0.27 /
0.78 / 0.23; close 0.02 / 0.01 / 0.03 / 0.51 / 0.04; north (shade) 0.04 / 0.04 / 0.08 / 0.22 / 0.06;
low east wall 0.09 / 0.27 / 0.70 / 1.52 / 1.80; high 0.55 / 0.28 / 0.39 / 0.84 / 0.55; 45 deg 0.19 / 0.14 /
0.26 / 0.66 / 0.37; 60 deg 0.15 / 0.22 / 0.41 / 1.25 / 0.39; fov 14 0.14 / 0.16 / 0.28 / 0.48 / 0.21.
A 5 cm orbit step leaves no more than a half-pixel pan does. In the crops the stains, the moss patch on the
slab, the course lines and the slit keep their places against each other.

### 2.4 Flowers and meadow
`meadow.mjs`, `vd.mjs ... --ground=1` (`m12/meadow.log`, `vd-ground.log`), sheets `shots/m12-vd-flowersF.png`,
`m12-vd-flowersRise.png`, `m12-vd-meadowRise.png`.
- Bands: table. The west view still has 13.2% half-pixel residual and 5.7% per 12 fps tick in its 32-62 m band
  (0.7% of the frame; audit 9: 12.4 / 5.8%) - unchanged.
- Walk forward and sideways through the bloom bands (`flowers` and `meadow` views, 300 frames each), rise
  1.65 m -> 24 m over them (420 frames): ground+plants repainted by view-dependent terms 0.004-0.05% median,
  0.06-0.13% max per frame, no spike above 0.02 points. The hand-over from blooms to ground dabs and the change
  of the dabs with elevation are cross-fades at that rate.
- A fade front exists by construction (blooms stand within 8-24 m of the viewer). Its travel per metre walked
  was not measured separately.
- Reprojection residual, ground+plants, pan 0.5 px / orbit 53 cm / 2 m: meadow 0.16 / 0.73 / 1.70; flowers
  0.14 / 0.56 / 1.51; drift 0.12 / 0.31 / 0.71; path 0.29 / 1.00 / 2.83; from above 0.09-0.15 / 0.30-1.28 / 0.92-4.11%.

### 2.5 Trees and far landscape
`orb.mjs tree`, `orb.mjs far`, `path.mjs moves13.mjs`, `limb.mjs`; `shots/m12-orb-tree-*.png`, `m12-limbs.png`.
- Crown lights and navy accents keep their places in the tracked crops over a 1.75 m orbit (`m12-orb-tree-tree.png`).
  Reprojection residual, plants: pan 0.5 px 0.08-0.60%; orbit 53 cm 0.7-3.0%; 2 m 2.4-6.7% (leaf cards turn to
  the viewer; depth-edge pixels are left out, so this covers the inside of masses only).
- Limbs: no pop in 280 frames under the crown. From below at 3-6 m (`m12-limbs.png`) the limbs show straight
  facets at bends and forks, and the trunk's bark pattern ends on a straight line under the fork.
- Mountains, hills, village, castle, far woods with fov 14-24: half-pixel pan residual 0.04-0.55% (mtN 0.55,
  hillN 0.40, the rest <= 0.13).

## 3. Detail, lens and collision

### 3.1 What held the nave lens at 0
Not the columns: the five fallen drums on the nave floor (tops 0.51-0.72 m, r 0.42-0.47) are in `ROCKS`, and
`solidDist()` treated them as full-height solids, so the clamp went to 0 within 0.35 m of each. Along the
nave axis the clamp from walls and columns alone is never below 2.5 m.

### 3.2 mot12 lens
`m12/walk2-final.log`, `lookup.log`, `drift.log`, `dyn.log`, `rockcut.log`.
- Low lying stones (top <= 0.8 m above the turf) limit the pull only above `lowCap`: the pull at which the
  bottom of the near-plane window still clears 0.8 m + 0.15 m at the worst tilt. 1.5 m at fov 32 and eye 1.65.
- Nave walk: 1.39 m a third of a second in, falling evenly to 1.04 m (no-pump rule: it only falls), then to 0
  in the last 0.5 s at the altar (99 %/s, largest rate step 0.18%). Door walk ends at 1.04 m in the nave.
  Standing in the nave after a V key: 1.97-3.45 m (audit 9: 2.32-3.76; the smooth minimum costs up to 0.3 m).
- Weave: 0.58-0.84 m between the columns, 0 for the last 40% (beside the low east wall and the altar).
- A separate pull floor was tried (return allowed up to 1.0 m whenever 0.9 s ahead is clear). It changed the
  nave walk by nothing and the weave by +0.07 m, and is not in the hand-back.
- Zoom rate round the largest remaining kinks, %/frame: nave w10 `0.27 0.45 0.65 0.86 1.07`; running nave
  w13-w19 `1.49 1.27 0.95 0.60 0.28 0.06 -0.09`.

### 3.3 Walking start
Speed now rises over 0.18 s (smoothstep); first walking frames of the nave walk change 1.08 1.64 2.11 2.61
3.08 3.38 3.56% of px (audit 9: 5.18% in the first frame). Distance lost against an instant start: 0.29 m at
a walk. Stop is instant, as before.

### 3.4 Low stones and the near plane
`rockcut.mjs`: 5 stones x 3 lines x 4 tilts (0.06, -0.12, -0.20, -0.29 rad) x fov 32 and 70, 85 frames each.
fov 32: 0 of 5100 frames. fov 70: one run of frames with 0.03% stone at the near plane (pull 1.79, 2.9 m from the
nearest listed stone; the picture shows no slice, `shots/m12-rockcut.png`), and 20 frames from my own start
point inside the east wall's margin (pull 0, not reachable on foot).

### 3.5 New: running stop inside the nave
The lens freezes in the frame the walker stops. With a pull of 0.5-1.4 m in the nave and a run at 9 m/s toward
the altar, it is falling at 2.1-2.9 %/frame when Shift+W is released: a 2.11% rate step in the frame the picture
itself stops. At a walk the same step is 0.02-0.19%. As received it was 0 because the pull was already 0.

### 3.6 Sky specks (trial, withdrawn)
`speck4.mjs`, `shots/m12-speck.png`, `m12-speck-fix2.png`, `m12-gable-fix.png`. The marks are single pixels of
stone or contour colour 2-4 px outside the outline. Tried in `pipeline.js`: a displaced read that crosses
the stone's edge is kept only if the half-way sample is already across it, and non-stone pixels are not
re-read unless they land on stone. Wobble-only marks in 12 pan frames: gable 4 -> 4, west 10 -> 1. But the
half-pixel residual rose: gable crop 0.905 -> 0.986%, west pier crop 2.10 -> 2.36%. More edge pixels flicker
than specks are removed, so `pipeline.js` is handed back as received.

### 3.7 Frame time
`m12/perf.log`, `tools/perf2.mjs`, three runs, load average 1.0-1.8. Minimums in the table; medians of the
best run within 0.5 ms at 1080p. Paint filter 1.0-1.4 ms at 720p, 2.3-3.1 ms at 1080p. Measured while the trial
`pipeline.js` of 3.6 was loaded (two more texture reads on pixels beside stone); wobble on/off within 0.1 ms.

## 4. Changes in `.work/mot12/src/main.js` (only file changed)

1. `solidDist()` / new `lowDist()`, `sortRocks()`, `LOW`: lying stones whose top is <= 0.8 m above the turf
   are taken out of the full-height distance and handled by `lowDist()`.
2. `move()`: speed eases in over `GAIT.t` = 0.18 s (also in fly mode); Shift changes pace over 0.12 s; stop is
   instant. New state `gait`, `pace`.
3. `move()`: `freeX`, `freeZ` remember the last place with `standDist >= 0.4` (also while flying). On foot,
   inside a solid (`d1 < 0`) or where the distance field has no slope, the walker is moved toward that place
   at 3 cm per frame (more with a key held); otherwise the gradient push as before.
4. Lens in `frame()`:
   - `D = hypot(x, z + 1, 3)` instead of `max(3, hypot(x, z + 1))` (the corner at 3 m was a zoom-rate step of
     0.4-1.2% as soon as the pull is held above 0 there);
   - `lowCap` computed per frame from fov, eye height and the tilt range;
   - `clampAt()` = smooth minimum of the tall clamp and the low-stone limit (distance or `lowCap`, corner
     rounded from below); `want` joins through the same smooth minimum (`LENS.k` = 0.4 m). All of these are
     never above the old hard minimum except for the low stones.
5. `window.__app.lens` also reports `lowCap` (measuring only).

## 5. What a viewer would still notice, worst first

1. **Sun patches and shadow-edge lobes on stone jump while walking toward or along a wall** (2.2). NOTICEABLE:
   a 20-60 px shape appears or an edge hops 20 px in one frame, 10-24 times in a 3 s approach on the sunlit west
   side. Owner `src/stone.js`; taking `bs` out of `eN` removes most of it.
2. **Stopping a run inside the nave**: 2.1% zoom-rate step with the stop (3.5). MINOR, Shift only. Would need the
   stop itself eased, or the lens allowed to settle for a few frames after it.
3. **The lens closes over the last 0.5 s before the altar** (1.04 m -> 0, 99 %/s) and opens in the first 0.6 s
   of a nave walk from a V-key view (3.45 -> 1.4 m). Smooth, but a visible zoom. MINOR.
4. **Meadow at 9-32 m on sideways walks**: one-frame flashes 3.2 / 3.2% (hero), 4.5 / 4.4% (drift). MINOR,
   unchanged beyond 9 m.
5. **Oak limbs from below at 3-6 m**: straight facets at bends, ruled end of the bark pattern. MINOR, a still fault.
6. **One-pixel marks in the sky beside stone outlines**: gable 4, west pier 10 in 12 pan frames. MINOR.
7. **Weaving between the nave columns**: one pull swell of 0.26 m. MINOR.
8. Aisles 0.12-0.18 m, head-on creep at the low east wall, stop when aimed at the centre of a column,
   crawl in the concave corner of west wall and buttress: as audit 9, not re-measured beyond the table rows.
9. **1080p**: 12.2-13.6 ms on hero, inside, rimE.

## 6. Not verified
- Anything in real time, and any frame-time jitter: every walk ran at a fixed 1/60 s step.
- 1080p: only the pre-pass test and frame time. No walks, pans or meadow bands at 1080p.
- The pre-pass against `far`-distance stone beyond the views listed; `props.js` stone (dry wall, loose
  stones) only as far as it appears in those views.
- How the patched `eN` looks (edge quality of the sun patches); only its motion numbers were taken.
- The source of the 0-193 px render-to-render difference at a fixed camera.
- Flower fade front per metre walked; flowers and meadow under the 12 fps wind tick beyond `meadow.mjs`'s rows.
- Tree crowns at depth edges (silhouette leaves) on orbits: left out of the reprojection measure; judged from
  crops and the audit-8 window metric only.
- Mountains' second tone: pans only (the camera cannot move far enough to orbit them).
- Thin-line pans, tone-tracked wall-top orbits (`toporbit.mjs`), `linepan.mjs`: not re-run.
- Frame time of the as-received build separately (the `main.js` edits do not touch rendering).
- Fov other than 32 and 70 for the low-stone rule; eye heights other than 1.65 m on foot.
