# Critique 1 - temporal problems and 3D tells under camera motion

Method: frozen-time frame sequences at 1280x720 on the Radeon 780M (headless Chrome, Vulkan ANGLE), camera
interpolated A -> B. No source files in `src/` were edited. Three audit tools were added under `tools/`:

- `tools/mdiff.mjs` - like `seq.mjs`, plus consecutive-frame difference images and stats, `--track=x,y,z`
  (crop follows a projected world point), `--eye=1.7` (camera y = terrain height + eye, i.e. real walking),
  `--dt=` (advance the frozen time per frame, camera still), `--nodiff=1`. Output `shots/<tag>-md.png`.
- `tools/subpx.mjs` - sub-pixel stability probe: renders yaw 0 and yaw + 0.5 px, compares frame B with frame A
  bilinearly resampled by the same half pixel. The residual is what flickers when the camera creeps. Runs
  several URL-param variants to attribute the residual to a pass. Output `shots/<tag>-sp.png`.
- `tools/findtuft.mjs` - dumps tuft instance positions near a point (used to aim the tuft tests).

Limits of this audit: everything is judged from stills of sequences and difference images, not from watching
real-time video. Rendering is fully deterministic (same camera + same time => 0 difference,
`shots/t8-floor-md.png`), so the differences below are real, not capture noise. Severity is my judgement of
how it would read in motion.

Side observation: `tools/shot.mjs` reported 11.3 ms/frame on the `westwall` view, not the ~4 ms the brief quotes.

---

## Issues, most serious first

### 1. Brush marks "breathe" during dolly: stroke density pulses once per octave of distance - CRITICAL
- Reproduce: `node tools/mdiff.mjs d1-trunk-oct-mode=1 -19.2,1.7,13.4 -11.3,2.2,4.0 -14.6,1.7,7.9 -11.3,2.2,4.0 --n=12 --cols=6 --crop=0,0,300,300 --track=-11.3,2.2,4.0 --nodiff=1 --q="mode=1"`
  (dolly toward the big trunk from 12 m to 5 m). Images: `shots/d1-trunk-oct-mode=1-md.png` (raw paint),
  `shots/d1-trunk-oct-final-md.png` (full pipeline), `shots/d1-dolly-west-md.png` (wider).
- Observed: the dark bark strokes are dense at 8.2-6.3 m (frames 7-10), nearly absent at ~10.4 m (frames 3-4)
  and again at ~5 m (frame 12). The big mid-tone patches reshape wholesale over the same range. Present with
  `mode=1`, so it is the material, not the Kuwahara or line pass.
- Cause: `brushStable` in `src/glsl.js` linearly mixes two uncorrelated octaves and the callers threshold the
  result afterwards (`step(0.83, bs.b)`, `step(0.9, bs.r)`, `step(0.56, bs.g)`...). At f = 0.5 the mix has about
  0.7x the standard deviation of either octave, so far fewer pixels cross a tail threshold; at f = 0 or 1 a
  single octave gives full contrast. Predicted mid-points for the trunk (tilePx 170, fov 32) are 5.2 m and
  10.4 m, which matches what was rendered.
- Same mechanism on the ground wash: flying up over the meadow the large darker-green patches
  (`step(0.84, bs.r)`, `step(bs.g, 0.16)`, tilePx 300) sit in different places in every frame
  (`shots/g3-fly-md.png`, frames 4-6), and the yellow dabs reshape during a walk-up (`shots/g3-tuftnear-md.png`).
  Stone walls show it least because their dabs are sparse and low-contrast.
- Fix: do not threshold a blended value.
  (a) Threshold each octave separately and blend the masks: return both samples (or add
  `brushStableMask(p, n, dist, tilePx, threshold)`) and use `mix(step(th, a), step(th, b), w)`, so marks of the
  outgoing octave fade out while the incoming ones fade in, at constant coverage.
  (b) Cheaper: restore variance after the mix, `v = 0.5 + (mix(a, b, w) - 0.5) / sqrt(w*w + (1.0-w)*(1.0-w))`.
  (c) For the high-contrast marks (bark strokes, moss edge, shadow-edge roughening) consider a per-object fixed
  world scale (`brushWorld`) instead: a trunk only spans about 2 octaves over the walkable area, and a mark
  that simply gets bigger as you approach is what a painted object does under a camera move.

### 2. Grass tufts sprout on approach, then shrink away when you get close - NOTICEABLE
- Reproduce: `node tools/mdiff.mjs g3-tuftgrow 5,0,30 -17.2,-0.2,18.3 -13.7,0,20.1 -17.2,-0.2,18.3 --eye=1.7 --n=8 --cols=4 --crop=0,0,300,220 --track=-17.2,-0.2,18.3 --nodiff=1`
  and `node tools/mdiff.mjs g3-tuftnear -9.2,0,22.2 -17.2,-0.2,18.3 -15.4,0,19.2 -17.2,-0.2,18.3 --eye=1.7 --n=6 --cols=6 --crop=0,0,300,260 --track=-17.2,-0.2,18.3 --nodiff=1`.
  Images: `shots/g3-tuftgrow-md.png`, `shots/g3-tuftnear-md.png`, `shots/g3-approach-md.png`.
- Observed: (a) at 25 m the patch is bare wash; meadow tufts scale up from nothing between roughly 22 m and
  10 m. No pop, but grass visibly grows out of the ground as you walk. (b) From about 9 m down to 4 m the
  tracked tuft stays ~75 px tall while the ground under it enlarges ~2.5x, so it shrinks in world terms.
  (c) At 3 m, looking down, it gets smaller still and rolls to a new angle.
- Cause: `TUFT_VS` in `src/extra/grass.js`: `kNear = 1 - smoothstep(8, 26, dd)` scales size; the clamp
  `s = min(s, dist * uPixelK * 80.0)` holds screen size constant inside ~9 m; `steep`/`roll` squash and rotate
  the card with view elevation.
- Fix: dissolve by colour, not by size. Keep the world size, and lerp `vLight/vMid/vDark` toward
  `grassWash(iPos)` with the same `k`, so a distant tuft is still there but painted in the wash colour; cull only
  when below ~2 px. Replace the 80 px clamp with a much later one (240 px or more) or a near fade by dithered
  discard inside ~1.5 m. Drive `steep` from the camera's height above the tuft rather than the per-tuft view
  angle so it does not animate as you walk up to one, and drop the `roll` change.

### 3. Hard alpha-tested edges are not anti-aliased: flowers, tufts and leaves crawl - NOTICEABLE
- Reproduce: `node tools/subpx.mjs sp-heroGrass 11,1.7,23 -1.5,4.2,-4 --crop=480,500,320,200 "--variants=|kuwahara=0|line=0|kuwahara=0&line=0|kuwahara=0&line=0&halo=0&bloom=0|msaa=0"`
  (also `sp-heroTree` with `--crop=160,60,320,200`). Images: `shots/sp-heroGrass-sp.png`, `shots/sp-heroTree-sp.png`.
- Measured half-pixel residual (% of pixels off by more than 24/255): flower/grass crop 4.1% full, 7.4% with
  `kuwahara=0`, 4.4% with `msaa=0`; canopy crop 5.2% full, 6.2% with `kuwahara=0`, 5.4% with `msaa=0`. For
  comparison: meadow distance 0.45%, far landscape 0.10%.
- Reading: turning MSAA off barely changes it, because `discard` is per fragment and 4x MSAA only smooths
  polygon edges. The Kuwahara pass helps (it roughly halves the flower residual). The flower drift is the worst
  area: small, saturated, hard-edged dabs on a pale ground.
- Fix: use alpha-to-coverage on the card materials (`alphaToCoverage: true`) with a sharpened coverage,
  `a = clamp((t.a - 0.5) / fwidth(t.a) + 0.5, 0., 1.)`, and the same fwidth ramp in place of `step(r, rad)` for
  the procedural flower shapes. Catch: A2C reads `oColor.a`, which is currently the paint-filter weight, so that
  weight has to move to another channel first (a shared-file change in `src/glsl.js` / `src/pipeline.js`).
  Independently of that: raise the flower minimum from 1.5 px to about 2.5 px half-size, and fade far flowers
  by colour toward the wash band instead of leaving 3 px dots.

### 4. Ink lines are 1 px, un-antialiased and flicker under sub-pixel motion - NOTICEABLE
- Reproduce: `node tools/subpx.mjs sp-hero 11,1.7,23 -1.5,4.2,-4 "--variants=|kuwahara=0|line=0|..."`.
  Image: `shots/sp-hero-sp.png`. Also `shots/l5-fine-md.png` vs `shots/l5-fine-noline-md.png`.
- Measured on the chapel wall crop: residual mean 1.59 with lines, 1.00 with `line=0` (0.95% vs 0.67% of
  pixels). In the residual image the block joints and arch creases light up as dashed segments; with
  `msaa=0` it gets worse (1.9%).
- Cause: `COMPOSITE_FS` in `src/pipeline.js`. `idEdge` is a `step()` on nearest-filtered ids from one-sided
  neighbours, so a joint is exactly one pixel wide and snaps a whole pixel at a time. The world-anchored `gap`
  break-up is stable; it is the line position that jumps.
- Fix: make the line about 1.5-2 px with a soft profile: evaluate the edge tests on a 2-texel ring as well and
  blend (`max(edge1, 0.5 * edge2)`), or render the edge mask to its own target and blur it by one small tent
  before compositing. Running the lines before the Kuwahara pass (so the filter rounds them into strokes)
  would also stabilise them and make them look more painted.

### 5. Leaf cards have no near limit: flying into or brushing past the canopy gives huge flat polygons - NOTICEABLE
- Reproduce: `node tools/mdiff.mjs f2-fly -2,1.7,20 -11.5,7,3.5 -2,22,20 -11.5,7,3.5 --n=6 --cols=3 --crop=0,0,560,400 --track=-11.5,7,3.5 --nodiff=1`.
  Image: `shots/f2-fly-md.png` (frames 3-6).
- Observed: single leaf shapes of 60-150 px with dead-straight polygon edges fill the frame; the picture reads
  as cut paper sprites, not as painted foliage. Only reachable in fly mode or under the low boughs.
- Fix: in `CARD_VS` (`src/extra/tree.js`) clamp the card's on-screen size the way flowers are clamped
  (`size = min(size, dist * uPixelK * N)`) and fade cards inside ~2 m by dithered discard; or switch to a
  second, finer atlas row when a card exceeds ~200 px.

### 6. Flowers and tufts twinkle on the 12 fps clock - MINOR to NOTICEABLE
- Reproduce (camera still, time stepping by 1/12 s):
  `node tools/mdiff.mjs t8-shadowgrass -8,1.7,10 -7.5,0,0 --n=6 --cols=3 --dt=0.0834 --crop=320,240,640,360 --q="grain=0"`.
  Image: `shots/t8-shadowgrass-md.png`. 1.3-1.5% of pixels change by more than 24/255 on every tick.
- Observed: (a) every flower's outline shifts on every tick. The sway is 1.5 cm (`sin(...) * 0.015`), which is
  below one pixel beyond a few metres, so it shows as edge crawl instead of readable held motion.
  (b) A few whole flowers/tufts per tick flip between lit and shadow colour along the tree-shadow edge (filled
  blobs in the difference rows), because `vLit` / `lit` is one `step()` on a shadow-map probe per instance and
  the leaf shadow moves with the wind.
- Fix: (a) quantise the sway to whole pixels (`round(offset / px) * px`) or switch it off where the amplitude is
  under 1 px. (b) Add hysteresis-free stability by sampling the shadow for instances from a wind-less shadow
  (e.g. probe with a wider radius, 6-8 texels, and bias by `rnd` more strongly), or render the leaf cards into
  the shadow map without `uWind`.
- For contrast, the same test on the hero view changes only 0.17-0.19% of pixels per tick and the nave interior
  0.03% (`shots/t8-hero-md.png`, `shots/t8-inside-md.png`): the shadow edges themselves are steady.

### 7. Trunk rim light follows the camera - MINOR
- Seen in `shots/f2-under-md.png`, `shots/f2-pitch-md.png`, `shots/m0-westwall.png`: the pale rim is a
  view-dependent fresnel term (`1 - abs(dot(n, v))` in `TRUNK_FS`), so it always hugs the silhouette and slides
  round the trunk as you walk around it. Together with the smooth cylinder silhouette this is the clearest
  "3D model" read on the tree. I did not render a dedicated orbit sequence for it; the claim rests on the
  shader plus those frames.
- Fix: anchor the rim to the surface: use `dot(n, sunSideTangent)` (a fixed world direction perpendicular to the
  trunk axis on the sun side) instead of the view vector, with the same brush-roughened threshold.

### 8. Still-image tells that become obvious in motion - MINOR (not temporal)
- The pale mountains are visibly faceted; their straight facet edges show in `shots/m0-hero.png` and as a
  straight diagonal in `shots/l5-fine-md.png`.
- Looking straight down, the ground dabs form an even diagonal streak texture over the whole frame
  (`shots/g3-pitch-md.png` frames 5-6, `shots/g3-fly-md.png`).
- Seen from directly below, the big tree's canopy has large empty areas of sky (`shots/f2-under-md.png` frames 5-6).

---

## What is solid

- Turning and pitching: brush marks, line break-up and foliage are stable. Under a 10 degree yaw and a 5 degree
  pitch the canopy differences are outlines only, with a handful of leaf-sized filled blobs from depth-order
  swaps (`shots/f2-turnpop-md.png`, `shots/f2-pitchpop-md.png`, `shots/f2-turn-md.png`, `shots/d1-turn-md.png`).
  No card flipping or visible re-orientation.
- Walking past the tree and bushes: no sliding or sprite rotation seen (`shots/f2-walk-md.png`,
  `shots/f2-walkfine-md.png`, `shots/f2-bush-md.png`).
- Kuwahara filter: no boiling found. It lowers the sub-pixel residual in every crop tested (e.g. 7.4% -> 4.1% on
  flowers) and I saw no block artefacts.
- Depth halo: steady while a pillar slides across the background (`shots/h6-strafe-md.png`,
  `shots/h6-strafe-nohalo-md.png`).
- Lines versus distance: they fade in smoothly between 60 m and 22 m, no popping (`shots/l5-dolly-md.png`).
- Far layers: village, castle, wooded hills and tree masses hold together over 40 m of translation and a 40 m
  climb; parallax looks natural and no card reveals itself (`shots/far7-village-md.png`,
  `shots/far7-castle-md.png`, `shots/far7-SE-md.png`, `shots/far7-W-md.png`, `shots/far7-up-md.png`).
  Far-landscape sub-pixel residual is 0.10%.
- Sky: a function of direction only; nothing to report.
- Shadow map: edges on stone and ground are steady across 12 fps ticks (see issue 6 for the numbers).
- Paper grain is fixed to the screen as intended.

## Not covered
- Real-time video judgement, resolutions other than 720p, and fov changes.
- A dedicated orbit of the trunk (issue 7) and a numeric mark-density-versus-distance curve (issue 1 is shown
  by the rendered sequence and explained by the shader, not measured).
