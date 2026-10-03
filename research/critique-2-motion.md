# Critique 2 - motion audit after the rebuild

Same method and tools as `critique-1-motion.md` (`tools/mdiff.mjs`, `tools/subpx.mjs`), 1280x720 on the
Radeon 780M, frozen-time sequences judged from stills and difference images, not real-time video.
No files under `src/` were edited. (`tools/subpx.mjs` gained an `--eye=` option.)

**Caveat: the source changed during the audit.** `src/pipeline.js`, `stone.js`, `ruin.js`, `main.js`,
`build.js` and `extra/props.js` were modified at 15:44:32, part-way through. Everything in "Re-test of issues
1-8" except issue 7 and the two issue-8 stills was rendered before that; the masonry, line and frame-time
numbers were re-measured afterwards and both sets are given where they differ. Rendering is still
deterministic (`shots/c2-floor-md.png`, 0 difference).

"Sub-pixel residual" = % of pixels differing by more than 24/255 after a half-pixel pan, compared with the
resampled previous frame.

---

## Re-test of issues 1-8

| # | Issue | Status | Before | Now |
|---|---|---|---|---|
| 1 | Brush marks breathe on dolly | **Fixed** | strokes vanish at ~10.4 m and ~5 m | constant density, marks stay put |
| 2 | Tufts sprout / shrink | **Improved** | scale from nothing; fixed 75 px inside 9 m | world size kept; colour dissolve (see N2) |
| 3 | Alpha-tested edges crawl | **Fixed on leaves, unchanged on grass** | canopy 5.2%, grass/flowers 4.1% | canopy 1.5%, grass/flowers 4.9% |
| 4 | Ink lines flicker | **Improved** | wall residual mean 1.59 vs 1.00 with `line=0` | 1.43 vs 1.26 |
| 5 | Leaf cards huge near camera | **Improved** | 60-150 px straight-edged polygons | leaves up to ~50 px, no polygon edges seen |
| 6 | 12 fps twinkle on flowers/tufts | **Unchanged** | 1.3-1.5% of pixels per tick | 1.3-1.5% |
| 7 | Trunk rim follows camera | **Fixed** | view-dependent rim | lit side stays on the sun side through a 90 degree orbit |
| 8 | Still-image tells | **Mostly fixed** | diagonal streaks looking down; holey canopy | streaks gone; canopy from below denser |

Details:

1. `shots/c2-trunk-oct-mode=1-md.png`, `shots/c2-trunk-oct-final-md.png` (same 12 m -> 5 m dolly): the dark bark
   strokes and olive patches keep the same number and position in all 12 frames and simply enlarge.
   `shots/c2-fly-ground-md.png` (fly up over the meadow): the wash no longer has patches that relocate.
2. `shots/c2-tuftgrow-md.png`, `shots/c2-tuftnear-md.png`: tufts are present as pale strokes at 25 m and keep
   their world size all the way in; no squash or roll at 3 m. What remains is the darkening of the foreground
   band, see N2.
3. Same commands as before. Canopy crop 5.22% -> 1.52% (`shots/c2-sp-heroTree-sp.png`); meadow distance
   0.45% -> 0.06%. Alpha-to-coverage is doing real work now: with `msaa=0` the grass crop goes 4.9% -> 8.6% and
   the canopy 1.5% -> 2.1% (before, MSAA made no difference). The grass/flower crop itself is 4.07% -> 4.87%,
   but its content changed: it is now filled with the dense dark foreground band
   (`shots/c2-sp-heroGrass-sp.png`). Far landscape 0.10% -> 0.26%.
4. Hero wall crop, residual mean with lines / with `line=0`: before 1.59 / 1.00; now 1.66 / 1.48 (pre-15:44
   build) and 1.43 / 1.26 (current build). The share attributable to lines fell from about 0.6 to about 0.17.
   Percent of pixels: 0.95% -> 0.90% (current). The remaining residual is geometry silhouettes and shadow edges.
5. `shots/c2-fly-md.png`: flying up through the crown shows individual leaf shapes up to roughly 50 px, with
   leaf outlines, not card edges. `shots/n-leafnear-md.png` (flying up into the low boughs): cards fade out
   before they fill the frame.
6. `shots/c2-t-shadowgrass-md.png`: 1.31-1.51% of pixels change per 1/12 s tick (was 1.31-1.56%), mean
   0.95-1.07 (was 0.77-0.89). Difference rows still show every flower and tuft outline in this close view, plus
   a few filled blobs per tick at the shadow edge (lit/shadow flips). The "no sway below 1 px" rule does not
   help here because these flowers are near and large. Hero view 0.14-0.18% (was 0.17-0.19%). Nave interior
   0.17-0.23% (was 0.03%): worse, not investigated further.
7. `shots/c2-rim-orbit-md.png` (90 degree orbit at 7 m): no pale edge tracking the silhouette.
8. `shots/c2-down-md.png`: clean wash with separate tufts, no streak texture. `shots/c2-underup-md.png`: sky
   still shows through, but as gaps between leaf masses. Mountain facets were not re-examined closely.

---

## New problems looked for

### N1. Masonry shimmer / moire / z-fighting - none found
- Sub-pixel residual on the chapel, dollying from the south at 3 m height (`5,3,67` -> `0.5,3,13`, looking at
  `0,4.5,-2`), full pipeline / `kuwahara=0`:

  | Distance to front wall | full | kuwahara=0 |
  |---|---|---|
  | ~60 m | 1.65% | 2.51% |
  | ~38 m | 1.50% | 2.09% |
  | ~17 m | 1.24% | 1.93% |
  | ~6 m | 1.37% | 2.47% |

  (current build; the pre-15:44 build gave 1.68 / 1.38 / 1.26 / 1.64%.) It is flat with distance: no range
  where joints start to alias. Images `shots/n-mas2b-*-sp.png`, overview `shots/n-mas-dolly2-md.png`.
- At 50-60 m the paint filter merges the courses into flat washes; joints are not resolved at all, so there
  is nothing to moire (`shots/n-mas2-0-sp.png`).
- Fine dolly at ~50 m, six frames 5 cm apart (`shots/n-mas-dollyfine-b-md.png`): 0.23-0.29% of pixels change
  per step, all along silhouettes and the leaf-shadow edge. No flashing faces or patches, which is what
  z-fighting would look like. Close strafe at 6 m, 2 cm steps (`shots/n-mas-close-md.png`): outlines only.
- Not covered: every wall from every side; I tested the south front and the hero angle only.

### N2. Foreground tuft band - soft, but it is a visible ring that travels with you - MINOR
- `shots/n-band-approach-md.png` (walk toward a ground point from 16 m to 5 m, 1 m steps),
  `shots/n-band-walk2-md.png` (walk 6 m across open meadow), `shots/n-band-turn-md.png` (turn in place).
- Walking: band tufts go from the pale wash colour to dark teal between about 13 m and 7 m. Nothing pops, but
  the dark-tuft zone is always the same radius around the camera, so its outer edge advances over the meadow
  as you walk. On the open slope it reads as a tide of darker grass.
- Turning in place: tufts are identical between frames. No change with yaw.
- Suggestion: break the radius with a world-anchored low-frequency term (meadow noise adding +/- 3 m to the
  fade distance) so the frontier is ragged and tied to the ground, or keep a sparse subset dark out to ~25 m.

### N3. The dense foreground grass is now the main source of edge crawl - NOTICEABLE
- A crop filled with near band tufts gave 7.5% residual (13.6% with `kuwahara=0`, 11.6% with `msaa=0`):
  `shots/n-mas-60-sp.png` (camera on the south-east slope; this probe missed the chapel and landed on grass).
  That is the highest value measured in either audit.
- At 3x zoom the blade edges are stair-stepped after the paint filter (`shots/n-stip-grass-k-md.png`): the
  Kuwahara pass re-hardens the coverage ramp that alpha-to-coverage produced.
- Suggestion: lower the paint-filter weight on tuft pixels, or thicken blades in the atlas so fewer are 1-2 px
  wide at band distance.

### N4. Alpha-to-coverage stipple - none visible
- `shots/n-stip-leaf-k-md.png`, `shots/n-stip-leaf-nk-md.png`, `shots/n-stip-grass-k-md.png`,
  `shots/n-stip-grass-nk-md.png` (3x nearest-neighbour zoom, with and without the paint filter): no dither or
  screen-door pattern on leaves or grass; edges are 1 px soft with the filter off.

### N5. Paint filter versus the new fine detail - fine
- The filter lowers the residual in every masonry and foliage probe (table above) and no block artefacts
  were seen. Its one cost is N3.

### N6. Stepped haze rings on the terrain - world-fixed
- `shots/n-haze-strafe-md.png` (30 m strafe across the hilltop) and `shots/n-haze-up-md.png` (climb to 40 m):
  the ring and field-strip edges stay on the same terrain features; they show parallax like the ground, not
  crawl. `shots/far7-W-md.png`-style card checks were not repeated beyond these two sequences.
- Unverified oddity: in `n-haze-strafe` frames 1-2 some soft olive blobs sit in the valley mid-ground and are
  absent from frame 3 on. They may simply pass behind the hill brow; I did not isolate them.

### N7. Performance at 1920x1080 - above 16.7 ms in most views
Frame time from `tools/shot.mjs --w=1920 --h=1080`, two runs (before / after the 15:44 source change):

| View | Run 1 | Run 2 |
|---|---|---|
| hero | 17.7 ms | 19.7 ms |
| front | 16.8 ms | 17.6 ms |
| high | 18.1 ms | 28.2 ms |
| under | 10.3 ms | 17.6 ms |
| feet | 9.6 ms | 10.5 ms |

The two runs disagree by up to 70% (`under`, `high`), and other processes were using the GPU, so treat these
as rough. At 1280x720: hero 10.0 ms, feet 6.0 ms, westwall 8.6 ms (run 1 only).

---

## Still open, in priority order
1. Flower/tuft twinkle on the 12 fps clock and lit/shadow flips at shadow edges (issue 6, unchanged).
2. Foreground grass edge crawl (N3).
3. 1080p frame time (N7).
4. Travelling foreground-band frontier (N2).
5. Nave interior per-tick change rose from 0.03% to about 0.2% (not investigated).
