# Critique 5 - flatness audit and re-score

Reviewer stance: independent, same strictness as critique 4. QUALITY 8 = "would pass as a paused
Frieren background for a non-expert", 9 = "would pass next to `refs/ac12.jpg` / `refs/ac13.jpg`".
FLATNESS 10 = "I would believe it was painted on one sheet"; 5 = "a nicely toon-shaded model";
below 5 = the 3D construction is the first thing I see.

Short answer: the chapel is clearly flatter than a toon render and at 25 m or more, or under a long
lens, it now reads as paint (F 7-8). Within about 12 m, from above, from below and at grazing angles
it is still recognisably a model (F 4.5-6). What gives it away is no longer the paint on the faces.
It is (a) the shapes: stacked rectangular boxes, lathe columns, extruded bars; (b) the camera:
converging courses and wide-angle foreshortening; (c) lighting that is exactly right on every small
form. Mean flatness over 31 chapel views: **6.05**.

## 0. What was rendered and what was opened

- Named views: `shots/c5-<view>.png`, all 85. **62 opened and scored** (the same 62 as critique 4).
  Rendered but NOT opened: `birds`, `driftE`, `farSW`, `hillSW`, `hillW`, `map`, `meadow2`, `mtE`,
  `out45`, `out135`, `out225`, `out315`, `plainSE`, `stepA`, `stepB`, `teleN`, `teleS`, `topN`,
  `topSE`, `treesW`, `treeW2`, `walkE`, `walkW`.
- Custom cameras: `shots/c5x-<name>.png`, 36 rendered, all 36 opened (critique 4's 30 at the same
  coordinates plus `above45`, `thruarch`, `longlens`, `cornerNE`, `wideclose`, `eastside`;
  coordinates in the appendix).
- Feature toggles over 12 chapel cameras each (`hero front inside westwall close back gableup
  cornerNE wideclose graze above45 thruarch`):
  - `c5m2-*` (`mode=2`): opened `hero`, `inside`. Other 10 not opened.
  - `c5s0-*` (`shift=0`): opened `front`, `inside`, `gableup`, `above45` (the last gave me no
    usable conclusion and is not cited). Other 8 not opened.
  - `c5w0-*` (`wobble=0`): opened `hero`, `inside`, then compared 480x320 crops
    `c5wc1-{hero,inside}` against `c5wc0-{hero,inside}`. Other 10 not opened.
  - `c5t35-*` (`tele=0.35`): opened `hero`, `front`, `inside`, `wideclose`. Other 8 not opened.
  - `c5t70-*` (`tele=0.7`): opened `hero`. Other 11 not opened.
- No 1080p set this round.
- Frame time reported by `tools/shot.mjs` at 720p on `hero`: **9.97 ms** (critique 4: 8.2 ms,
  critique 3: 6.1 ms). It keeps rising.

## Part A - flatness audit of the chapel

### A1. Per-view table (F = flatness, Q = quality)

| View | F | Q | What still says "3D model" in a still |
|---|---|---|---|
| hero | 7 | 7.5 | Planes are single tones and that works. Mesh-like silhouette: gable top and both stub breaks are rectangular stair-steps (stacked boxes, confirmed in `c5m2-hero`). Column is a lathe with evenly spaced ring joints. Foreground blocks are cuboids with three faithfully different face tones. Tree shadow on the gable is an exact leaf projection. All edges equally crisp. |
| front | 6.5 | 7.5 | Left stub is a staircase of slabs; arcade arches show their true wall thickness (parallax-implying reveal); column drums regular; pedestal boxes on both sides. |
| frame | 7.5 | 8 | Chapel is small and framed, reads as paint. Only the stepped breaks remain. |
| inside | 5.5 | 6.5 | Perspective: courses on the right wall converge hard to a vanishing point. Too-regular geometry: lathe column with ring joints and perfect base mouldings. Thin proud rectangular plates on wall faces, each outlined dark (see A3.4). Break on the right is a pixel staircase. Cast shadow is an exact projection. |
| westwall | 6 | 6.5 | Buttress cap is a clean wedge prism; pier arrises ruler-straight; break is stacked steps. Dapples and trunk are good. |
| back | 6 | 6.5 | Quiet wall with streaks is right. Buttress strips are ruler-straight with thin exact lit slivers (light follows form too faithfully); top blocks are rectangular protrusions; dark rectangles at ground contact. |
| close | 5 | 5.5 | Inside corner: every joint runs exactly to the vanishing points (perspective plus texture gradient), joints uniformly dark and hard, repeated vertical tick marks, pale translucent cloud shapes at the base read as an overlay. Milky, low contrast. |
| rubble | 6.5 | 7 | Shaded chapel is quiet and good. Low walls are cuboids with bright tops (top/side tone rule obeyed too literally); stair-step breaks. |
| high | 6.5 | 7 | From above it reads as a diorama: wall-top thickness, rectangular floor slabs. Chapel tones fine. |
| haloN | 7 | 7.5 | Best wall painting (streaks, warm/cool wash). Thin proud plates/ledges with dark underlines; right break a regular rectangular staircase; perfect octagonal capital with a cube perched on it; window tracery is a clean extrusion. |
| low | 6 | 7 | Large pedestal cuboid with exact top and front faces; right pier is a "stack of books" of equal slabs; regular column drums. |
| nosewall | 5 | 4 | Flat, but wrong: translucent ghost shapes not aligned to blocks, joints are blobby dark silhouettes. Reads as stacked decals rather than 3D or paint. |
| graze | 6 | 6.5 | Strokes and blocks stretch anisotropically along the grazing wall (texture gradient); joints converge. |
| upinside | 4.5 | 5 | Column is a foreshortened tube with a faceted capital; the cirrus streak still reads as a light shaft. |
| northgraze | 6.5 | 6.5 | Stripes from critique 4 are gone; planes are flat; wobble is visible on arrises here (good). Right wall joints converge; piers are extruded rectangles. |
| gableup | 5 | 6 | Hood moulds, sills and string course show thick dark undersides of exact extrusion depth; keystone convergence (pitch exceeds the shift limit); stair-step silhouette. |
| archwest | 7 | 7.5 | Good. A tilted block perched on the left stub; regular drum rings. |
| doorview | 7 | 7 | Stubs and drums are regular lathes; floor slab perspective. |
| buttress | 5 | 5.5 | Course joints wrap every corner at identical heights with perfect convergence; four box faces each get their own tone, so it reads as shaded boxes; uniform hard joint line. |
| rake | 7 | 7.5 | Rain streaks now cross courses: this is the right direction. Every protruding stone, hood and sill shows a uniform violet side face of exact depth; breaks are rectangles. |
| colcap | 5 | 6 | Capital is a faceted polygon with chamfer highlights; lathe shaft with ring joints; proud bars on walls; upward convergence; light-shaft streak in the sky. |
| topfloor | 5 | 5.5 | Plan view; floor slabs are a grid of rectangles. |
| above45 | 6 | 6.5 | Diorama: wall-top thickness, regular slabs, columns as pegs, accurate projected tree shadow on the ground. |
| thruarch | 6.5 | 7 | Pier is painted well (dapples, streaks). Courses wrap the corner at the same heights. |
| longlens (fov 12 from 55 m) | 8 | 8 | Flattest chapel view. Reads as layered painted shapes; only the stepped silhouette remains. |
| cornerNE | 6.5 | 6.5 | Trunk fills the frame; chapel behind is fine; buttress wedges clean. |
| wideclose (fov 60) | 5 | 6.5 | Wide-angle foreshortening; foreground stair of cuboids with exact top/side tones; right pier a stack of slabs; horizontals converge strongly. Upright verticals help a lot. |
| eastside | 7 | 7 | Shaded chapel as a flat cut-out, reads painted. Stepped breaks; rectangular block-top crenellations. |
| nosecol | 5 | 5 | No longer blank. Drum joint is an exact chamfer ellipse; translucent bluish ghost patches on the face. |
| heapE | 5.5 | 6.5 | Rubble is low-poly faceted solids, one tone per facet; moss tops are noise. |
| eaststub | 5.5 | 6.5 | Stepped cuboids with top/side tones. |

Mean F over these 31 views: 6.05. By range: 25 m and beyond or long lens 7-8; 8-20 m eye level
6-7; inside, nose-close, from above, looking up 4.5-6.

### A2. What works (keep)

- One tone per architectural plane and per-wall lighting. Walls no longer show facet shading; in
  `hero`, `haloN`, `rake`, `eastside` the faces are convincing paint.
- Quiet wall faces with long vertical streaks that cross courses (`rake`, `haloN`, `back`).
- Lobed dapple patches on stone (`thruarch`, `westwall`, `shade`).
- Critique 4's striped courses and floating slab at the west stub are gone (`northgraze`,
  `buttress`, `stub1`).

### A3. Remaining 3D cues, ranked by how much they cost

1. **Mesh-like silhouettes.** Every break is a staircase of axis-aligned rectangles (`hero`,
   `front`, `haloN`, `rimE`, `eastside`, `inside` right edge). The erosion did not reach the
   outline: `c5m2-hero` shows stacked boxes. `refs/ac12.jpg` has rounded, crumbled, diagonal
   breaks with no repeated step module. This is the first thing the eye catches at every distance.
2. **Too-regular geometry.** Lathe columns with evenly spaced ring joints and perfect mouldings
   (`inside`, `colcap`, `nosecol`, `upinside`), cuboid pedestals and low walls (`low`, `wideclose`,
   `eaststub`), wedge buttress caps (`westwall`, `back`), piers built from equal slabs (`low`).
3. **Perspective and texture gradient.** Inside and at close range, course joints run dead
   straight to vanishing points and shrink evenly (`inside`, `close`, `buttress`, `graze`,
   `wideclose`). A painter draws three or four joints by hand and fades the rest; the convergence
   is suggested, never ruled. The current lens (fov 32-40 near the building) is wider than a
   layout artist would draw.
4. **Extruded detail shown faithfully.** Hood moulds, sills, string courses and the thin proud
   plates on wall faces all have a true side face with its own tone and a dark underline
   (`inside`, `colcap`, `gableup`, `rake`, `haloN`). In the boards a moulding is two strokes: a
   light line and a dark line.
5. **Lighting that follows form too faithfully.** Every small box has correct top/side/dark tones
   (`low`, `wideclose`, `heapE`, `buttress`); the cast leaf shadow on the gable is a true
   projection (`hero`, `inside`, `haloN`, `above45`). The painted tone layout is still the Lambert
   layout (`c5m2-hero` versus `c5-hero`).
6. **Uniformly crisp edges.** No lost edges anywhere on the building; a board has hard, soft and
   lost edges within one object.
7. **Parallax-implying overlaps.** Arch reveals show true wall thickness (`front`, `inside`); the
   wall tops show thickness from above (`high`, `above45`).
8. **Overlay artefacts at close range.** Translucent pale shapes on shaded stone (`close`,
   `nosewall`, `nosecol`, `floorslab`, `floorslab2`) are not a 3D cue, but they look like
   decals, which is just as un-painted.

### A4. Feature comparisons

| Feature | Compared | Verdict |
|---|---|---|
| `shift` (upright verticals) | `c5-front` / `c5s0-front`, `c5-inside` / `c5s0-inside`, `c5x-gableup` / `c5s0-gableup` | **Helps, keep, make stronger.** With `shift=0` verticals lean in at once and the frame reads as a camera tilt (worth about 0.5-1 F on `front` and `inside`). The 0.42 rad limit is too low for steep looks: `gableup` still keystones with shift on. Raise the limit toward 0.7 and, past that, flatten the remaining convergence in screen space. Horizontals are untouched and are now the bigger problem. |
| `wobble` (edge hand-wobble) | `c5wc1-hero` / `c5wc0-hero`, `c5wc1-inside` / `c5wc0-inside` (480x320 crops) | **Neither helps nor hurts: I cannot see it.** The gable outline, the arch curve and the arrises look the same with it on or off at 720p. The only place I noticed any wobble was `northgraze`. Needs roughly 3-4 times the amplitude at a lower frequency (a wobble of 2-4 px over 60-150 px), and it should act on silhouettes against sky first. |
| `tele=0.35` | `c5-hero` / `c5t35-hero`, `c5-front` / `c5t35-front`, `c5-inside` / `c5t35-inside`, `c5x-wideclose` / `c5t35-wideclose` | **The most effective existing lever. Should be on by default near the chapel.** `front` F 6.5 to 7.5 (mountains rise behind the gable, planes stack like a board); `inside` F 5.5 to 6.5 (course convergence much weaker, arches read as flat shapes); `wideclose` F 5 to 6.5; `hero` F 7 to 8. Side effect on `hero`: the SE tree crown now covers the gable top and right pier, and the foreground ground is lost, so Q stays 7.5. No clipping artefacts seen. |
| `tele=0.7` | `c5t70-hero` | F about 8.5, even more board-like, but the crown covers half the chapel. Too strong as a default at 25 m; fine inside 12 m. |

`longlens` (fov 12 from 55 m, no tele) at F 8 confirms the same point from the other side: lens
and distance flatten more than any shader change made so far.

## Part B - quality re-score

### B1. Named views (C4 beside C5)

| View | C4 | C5 | Note |
|---|---|---|---|
| hero | 7 | 7.5 | Floating slab gone, planes flat. Stepped breaks, cuboid foreground blocks. |
| front | 7 | 7.5 | |
| inside | 6.5 | 6.5 | Quieter walls, but proud plates and convergence. |
| westwall | 5.5 | 6.5 | Floating slab and stripes gone. |
| back | 6.5 | 6.5 | |
| high | 7 | 7 | Poppy patch is pixel-dithered. |
| vista | 7 | 7 | |
| low | 6.5 | 7 | Grass band good. |
| close | 5.5 | 5.5 | Repeated marks reduced; now milky with ghost patches. |
| down | 6 | 6 | Translucent-looking slabs. |
| tree | 7.5 | 8 | |
| frame | 7.5 | 8 | |
| under | 6.5 | 6.5 | |
| bush | 6 | 6.5 | Box in two-point perspective with ruled joints. |
| rubble | 7 | 7 | |
| treeW | 7.5 | 8 | |
| path | 7 | 7.5 | |
| pathdown | 6.5 | 6.5 | |
| meadow | 6.5 | 6.5 | Pen lines gone; a ghost patch mid-frame. |
| farN | 7 | 7 | |
| farNE | 7 | 7 | |
| farE | 6.5 | 6.5 | |
| farSE | 6.5 | 6.5 | |
| farS | 6.5 | 6.5 | |
| farW | 7 | 7 | |
| farNW | 7.5 | 7.5 | |
| village | 6.5 | 6.5 | |
| castle | 6 | 6.5 | |
| hillN | 6 | 6 | |
| skyUp | 6.5 | 6.5 | Plank boughs. |
| leaf3m | 5.5 | 6 | |
| feet | 6 | 6.5 | |
| cross | 6.5 | 7 | |
| wallfoot | 6 | 6.5 | |
| shadowT | 7.5 | 7.5 | Dither at the shadow edge over the flower mass. |
| flowers | 6.5 | 7 | |
| sap | 7.5 | 7.5 | |
| out0 | 6.5 | 7 | |
| out90 | 7.5 | 7.5 | |
| out180 | 7 | 7.5 | |
| out270 | 7 | 7 | |
| doorout | 6.5 | 7 | |
| rim | 7.5 | **7** | Regression: lower half is an empty lime field with evenly scattered dots. |
| rimE | 7.5 | 7.5 | Stepped tower silhouette. |
| southfar | 7 | 7 | Foreground poppy patch is pixel-noisy. |
| pathback | 8 | 8 | Still the best composition; pixel-stepped gable, icon tufts. |
| lookdown | 4.5 | 5.5 | |
| lookdownS | 6 | 6.5 | Shadow edge now lobed. |
| lookdown2 | 5.5 | 6.5 | Shadow edge now lobed. |
| topTree | 6 | 6 | |
| topPath | 5 | 5 | Still a map; pink patch is dithered. |
| shade | 7 | 7.5 | |
| shadeN | 5.5 | 6 | Stripes gone. |
| haloN | 7.5 | 7.5 | |
| treeN | 7.5 | 7.5 | Bough stub. |
| lowN | 7 | 7 | |
| drift | 5.5 | 6 | |
| teleSE | 6 | 6 | |
| teleW | 5.5 | 5.5 | |
| mtN | 5.5 | 5.5 | |
| mtW | 5.5 | 5.5 | |
| shadowG | 6.5 | 7 | |

### B2. Custom cameras

| View | C4 | C5 | Note |
|---|---|---|---|
| nosewall | 4.5 | **4** | Ghost overlays still there, joints now blobby silhouettes. |
| buttress | 5.5 | 5.5 | |
| graze | 6 | 6.5 | |
| northgraze | 5.5 | 6.5 | |
| gableup | 6.5 | **6** | Thick dark undersides of mouldings dominate. |
| upinside | 4.5 | 5 | |
| archwest | 7 | 7.5 | |
| doorview | 7 | 7 | |
| floordown | 5 | 6 | Lobed sun patch. |
| noserubble | 5 | 5 | Moss is noise; clean box facets. |
| nosetrunk | 6.5 | 6.5 | |
| upcrown | 7 | 7 | |
| grasslow | 7 | 7.5 | |
| zenith | 5 | 5.5 | Polygons gone; sparse smeared clumps. |
| rake | 7.5 | 7.5 | |
| colcap | 6.5 | **6** | Faceted capital, proud bars, light-shaft streak. |
| drum | 5.5 | 5.5 | |
| crossnear | 6.5 | 6.5 | Cross arm is an extrusion with a side face. |
| heapE | 6.5 | 6.5 | |
| eaststub | 6.5 | 6.5 | |
| topfloor | 5.5 | 5.5 | |
| nosegable | 6.5 | 7 | |
| pathnose | 7 | 7.5 | |
| underSE | 5.5 | **5** | Vertically smeared leaf cards, plank bough, arc streaks. |
| rimdown | 6 | 6 | Stretched leaf cards as diagonal stripes, upper right. |
| stub1 | 6 | 6.5 | Floating slab gone; one hovering slab with a dark underside at the frame edge. |
| stub2 | 5.5 | 6 | |
| floorslab | 4 | 5 | Slabs are clean extruded plates with translucent blotches. |
| nosecol | 3.5 | 5 | |
| floorslab2 | 3.5 | 4 | Flat-polygon moss disc; see-through look persists. |

New this round (no C4 equivalent): above45 6.5, thruarch 7, longlens 8, cornerNE 6.5,
wideclose 6.5, eastside 7.

### B3. Means over the same groupings

| Grouping | C3 | C4 | C5 |
|---|---|---|---|
| 17 views critique 2 scored numerically (hero, front, vista, low, close, down, frame, treeW, meadow, farN, farSE, farW, village, wallfoot, doorout, rimE, pathback) | 6.1 | 6.8 | **7.0** |
| 60 named views opened in C3 | 5.9 | 6.6 | **6.76** |
| 14 custom break-it cameras | 4.6 | 5.9 | **6.11** |
| 16 break-it cameras added in C4 | - | 5.8 | **6.0** |

32 of 62 named views are at 7 or above (C4: about a third), 16 at 7.5 or above, four at 8
(`pathback`, `tree`, `treeW`, `frame`). Nothing reaches 8.5. The gain is smaller than between C3
and C4, and it is concentrated in mid-range chapel views and ground shadows.

### B4. Regressions, explicitly

Checked views that were 7.5 or above in C4:

| View | C4 | C5 | |
|---|---|---|---|
| pathback | 8 | 8 | held |
| rim | 7.5 | 7 | **regressed**: foreground meadow is now an empty lime field with uniform dots |
| rimE | 7.5 | 7.5 | held |
| treeW | 7.5 | 8 | up |
| tree | 7.5 | 8 | up |
| treeN | 7.5 | 7.5 | held |
| shadowT | 7.5 | 7.5 | held (new dither at shadow edge) |
| sap | 7.5 | 7.5 | held |
| out90 | 7.5 | 7.5 | held |
| farNW | 7.5 | 7.5 | held |
| haloN | 7.5 | 7.5 | held |
| rake | 7.5 | 7.5 | held |

Other regressions: `nosewall` 4.5 to 4, `gableup` 6.5 to 6, `colcap` 6.5 to 6, `underSE` 5.5 to 5.

New problems since critique 4:

1. Thin proud rectangular plates on wall faces with dark outlines (`inside`, `haloN`, `colcap`).
   Owner: `src/ruin.js` + `src/build.js`.
2. Pale translucent ghost shapes on shaded stone at close range (`close`, `nosewall`, `nosecol`).
   Owner: `src/stone.js`.
3. Stretched / smeared leaf cards (`underSE`, `rimdown`). Owner: `src/extra/tree.js`.
4. Pixel-dithered poppy patches in the regrouped meadow (`southfar`, `high`, `topPath`,
   `shadowT`). Owner: `src/terrain.js` / `src/extra/grass.js`.
5. Empty foreground in `rim` after the meadow regrouping. Owner: `src/extra/grass.js`.
6. The cirrus streak that reads as a light shaft is still there (`upinside`, `colcap`, `gableup`,
   `zenith`, `underSE`). Owner: `src/sky.js`.
7. Frame time 9.97 ms (C4 8.2 ms).

## Part C - top 10 for flatness / painted-ness, ranked

I believe **1, 2 and 3 matter most**, in that order of return for effort: 1 is nearly free and
moves every near-chapel view by about one flatness point; 2 removes the cue that is visible at
every distance; 3 removes the "shaded boxes" look at close range.

1. **Make the layout lens the default near the chapel (bold: camera).**
   Where: `inside`, `close`, `buttress`, `wideclose`, `front`, `gableup`, `colcap`.
   Painter: draws buildings with a long lens: nearly parallel horizontals, upright verticals,
   distant planes pulled up large behind the subject (`refs/ac12.jpg` has almost no convergence).
   Technique, `src/main.js`: drive `tele` automatically from distance to the chapel, about 0.7
   inside 8 m, 0.35 at 20 m, 0 past 45 m, eased; cap the user fov at about 36 near the building.
   Raise the shift limit from 0.42 to about 0.7 rad. Then go further than a real lens can: add a
   horizontal counterpart of the shift, or blend the projection toward orthographic for geometry
   flagged man-made (an oblique projection: scale view-space x,y by `mix(1, zRef/z, k)` with
   k about 0.5 in the stone vertex shaders, `src/stone.js`), so receding walls foreshorten less
   and courses stay near parallel. Keep the tree-crown occlusion in check by fading the pull when
   a crown would cover the subject.

2. **Erode the silhouette in screen space, and stop building breaks from rectangles (bold: post
   with the G-buffer, plus geometry).**
   Where: `hero`, `front`, `haloN`, `rimE`, `eastside`, `pathback`, `longlens`.
   Painter: a broken wall top is one irregular line with rounded lumps, a few diagonal slips and
   one or two sharp notches; no repeated step.
   Technique, `src/pipeline.js`: in the composite pass, for pixels with the man-made flag within
   a few pixels of a shape-id / sky boundary, displace the lookup by a world-anchored low
   frequency noise (2-5 px, one octave at about 0.5 m and one at 2 m) so the outline is redrawn
   by hand; this is what `wobble` should be, about four times stronger and applied to silhouettes
   first. `src/ruin.js` + `src/build.js`: replace the top two courses of every break with a
   single jittered polyline cap (triangulated slope with random dips) and vary the step height
   and run 1:4, with some steps sheared diagonally.

3. **Tone by plane group, not by box face; suppress small-form lighting.**
   Where: `low`, `wideclose`, `heapE`, `eaststub`, `buttress`, `rubble`.
   Painter: a pile of blocks is one light shape and one shadow shape with two or three accents;
   he does not light each block.
   Technique, `src/stone.js` + `src/build.js`: bake a "parent plane" normal per block (the
   wall's or the heap's dominant direction) and step the light on that instead of the face
   normal for anything smaller than about 1.5 m; let only top caps keep a lighter tone, and only
   on about half of them (noise mask). For rubble in `src/extra/props.js`, light the whole heap
   from one blurred normal (heap centre to fragment) so it resolves to two tones.

4. **Flatten mouldings and plates into drawn lines.**
   Where: `inside`, `colcap`, `gableup`, `rake`, `haloN`.
   Painter: a hood mould or string course is a light stroke over a dark stroke; no visible depth.
   Technique, `src/ruin.js` + `src/build.js`: remove the thin proud plates on wall faces
   entirely; reduce projection of hood moulds, sills and string courses to under 3 cm and give
   their side/under faces the wall's tone (flag them so `src/stone.js` ignores their normal),
   then let `src/pipeline.js` draw the dark under-line and a pale top line from the crease
   buffer. From below this removes the thick dark undersides.

5. **Lost and found edges (bold: post).**
   Where: every chapel view; most visible in `hero`, `front`, `inside`.
   Painter: hard edge on the lit side against sky, soft or lost edge where a shadowed wall meets
   a similar-valued wall or the grass.
   Technique, `src/pipeline.js`: compute local value contrast across each plane/shape-id edge;
   where contrast is under about 0.08, drop the line and blend the two tones across 3-5 px with a
   brush-noise mask (smear along the edge direction); where contrast is high on the sun side,
   swap the dark line for a pale highlight line. Add a faint sky-colour wrap of 2-3 px on
   silhouettes against the sky.

6. **Hand-drawn joints that do not obey perspective.**
   Where: `close`, `inside`, `buttress`, `graze`, `bush`.
   Painter: indicates courses in patches (30-40% of the wall), with lines that wander and stop,
   and never continues a joint around a corner at the same height.
   Technique, `src/stone.js`: offset course heights per wall face (so joints do not meet at
   corners), bend each joint with a low-frequency wobble of a few centimetres, and mask joints by
   a large-scale noise so that more than half the wall has none; fade joint density by grazing
   angle (`abs(dot(N, V))` below about 0.35 gives wash only) to kill the texture gradient. Remove
   the pale translucent overlay layer at under 3 m or quantise it to opaque dabs.

7. **Columns and pedestals as painted shapes.**
   Where: `inside`, `colcap`, `nosecol`, `upinside`, `low`, `drum`.
   Painter: a column is a slightly irregular strip with one soft core shadow, two or three
   uneven joints, a chipped capital.
   Technique, `src/ruin.js` + `src/build.js`: vary drum heights 1:2.5, offset and tilt drums by
   1-2 degrees, perturb the lathe profile per drum, replace ring chamfers with a drawn line,
   chip the abacus and pedestal corners with large cuts (10-20 cm). `src/stone.js`: shade the
   shaft from a view-facing strip (light side, core shadow at a fixed screen fraction) instead
   of the true normal so the tube does not turn.

8. **Painted cast shadows instead of projections.**
   Where: `hero`, `inside`, `haloN`, `above45`.
   Painter: tree shadow on a wall is one blobby mass with a few holes, edge drawn along the
   wall's own direction, not a true projection of leaves.
   Technique, `src/stone.js` (and the shadow pass in `src/pipeline.js`): sample the shadow map
   with a much larger blur on man-made surfaces, then threshold with wall-space brush noise at a
   0.3-0.6 m scale; snap the threshold along course direction so edges run with the masonry.
   Drop holes smaller than about 0.3 m.

9. **Large-scale weathering and a dense flower mass (the gap to `refs/ac12.jpg`).**
   Where: `hero`, `front`, `rim`, `pathback`, `out0`.
   Painter: stains, moss and streaks cover whole wall regions and ignore blocks; the flower
   field is a dense band of saturated drifts that carries the lower third.
   Technique, `src/stone.js`: add wall-space ochre and green stain fields at 2-5 m scale, dark
   moss band at the base, streaks under every ledge (already started in `rake`). `src/extra/
   grass.js` + `src/terrain.js`: restore density in the 5-25 m band for `rim`, paint flower
   drifts as horizontal bands that merge with distance, and replace the pixel-dithered poppy
   patch with brush-dab thresholding.

10. **A stylised projection for extreme angles (bold: camera/layout).**
    Where: `high`, `above45`, `topfloor`, `upinside`, `gableup`.
    Painter: never paints a ruin from straight above or below; a layout artist would cheat the
    angle.
    Technique, `src/main.js`: soft-limit pitch (resist beyond about +35 / -40 degrees and take
    the rest as lens shift), and for looks down use an oblique "cabinet" projection so wall
    tops do not show their thickness. `src/ruin.js`: break up floor slabs into irregular
    overgrown fragments so a plan view has no grid. `src/sky.js`: remove the streak that reads
    as a light shaft above about 55 degrees elevation.

Also: recover frame time (`src/pipeline.js`, `src/stone.js`); it has gone from 6.1 to 10 ms over
two rounds.

## Verdict

- **Does the chapel now read as flat / painted?** Partly. At 25 m and beyond, or under a long
  lens, yes: F 7-8, and I would believe `longlens`, `frame` and `eastside` were painted, apart
  from the stepped outline. Within 12 m, inside, from above or below: no, F 4.5-6. The owner's
  note still applies there. The face paint is no longer the problem; shape, lens and
  over-faithful small-form lighting are.
- **Does the general level match TV-anime background quality?** Close in the best third, not
  overall. Four views at 8 and sixteen at 7.5 or above would pass a casual viewer for a few
  seconds. None would pass beside `refs/ac12.jpg` or `refs/ac13.jpg` (nothing at 8.5-9). The
  remaining gap to the boards is the eroded silhouette, large-scale weathering, lost edges, and
  the dense flower foreground.
- Best view: `pathback`, `tree`, `treeW`, `frame`, `longlens` (8). Worst: `nosewall`,
  `floorslab2` (4). Worst named view: `topPath` (5).

## Appendix - cameras added this round (pos -> look, fov)

| Name | pos | look | fov |
|---|---|---|---|
| above45 | 14,22,18 | 0,3,-3 | 36 |
| thruarch | -10,1.6,-1 | 5,3,-4 | 40 |
| longlens | 30,1.7,50 | 0,5,-4 | 12 |
| cornerNE | 14,1.7,-18 | 0,4,-5 | 32 |
| wideclose | 6,1.6,6 | -2,5,-8 | 60 |
| eastside | 20,1.7,-4 | 0,4,-4 | 32 |

All custom cameras were rendered with `node tools/dbg.mjs c5x name:pos:look:fov ...`; toggles with
`--q="shift=0"` etc. Critique 4's cameras were re-rendered at the coordinates in its appendix and in
`tools/gshot.mjs`; `upcrown`, `grasslow`, `nosetrunk`, `zenith` at critique 3's coordinates.
