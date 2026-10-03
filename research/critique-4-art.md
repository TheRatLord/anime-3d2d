# Critique 4 - art direction review

Reviewer stance: same strictness as critique 3. A score of 8 means "would pass as a paused Frieren
background for a non-expert"; 9 means "would pass next to `refs/ac12.jpg` / `refs/ac13.jpg`".
Nothing reaches 9. Scores went up where the picture actually changed; I held or lowered them
where it did not.

## 0. What was rendered and what was opened

- Named views: `shots/c4-<view>.png`, all 85 views in `src/views.js`, 1280x720. **62 opened and
  scored.** Rendered but NOT opened, so not scored: `birds`, `driftE`, `farSW`, `hillSW`, `hillW`,
  `map`, `meadow2`, `mtE`, `out45`, `out135`, `out225`, `out315`, `plainSE`, `stepA`, `stepB`,
  `teleN`, `teleS`, `topN`, `topSE`, `treesW`, `treeW2`, `walkE`, `walkW`.
- Custom cameras: `shots/c4x-<name>.png`, 30 rendered, all 30 opened. The 14 from critique 3 at the
  same coordinates, plus 16 new ones (coordinates in the appendix).
- 1080p: `shots/c4hd-{hero,frame,inside,close,feet}.png`, all five opened.
- Frame time reported by `tools/shot.mjs` at 720p: 8.2 ms (critique 3 quoted 6.1 ms).

## 1. Scores

### 1a. Named views (C3 beside C4)

| View | C3 | C4 | What changed / what still gives it away |
|---|---|---|---|
| hero | 6.5 | 7 | Rake is now irregular with cut stones, gable has per-stone tint and streaks, column is turned. Tells: a detached slab floats beside the broken west arch stub; box pedestal; sparse tufts on flat lime. |
| front | 6.5 | 7 | Same gains. Reveals still flat dark. |
| inside | 5.5 | 6.5 | Column has drums and capital; coursed strokes; lobed shadows. Altar is a clean box; every block carries the same vertical drip mark (obvious at 1080p). |
| westwall | 5 | 5.5 | Floating detached slab; arch soffit/reveal has horizontal alternating-tone stripes. |
| back | 5.5 | 6.5 | Wall is now coursed with strokes. Small dark triangular notches read as artefacts, not chipped stone. |
| high | 6.5 | 7 | Floor grid mostly overgrown; pedestal box remains. |
| vista | 6.5 | 7 | Valley has bands and contact shadows. Drum still a clean cylinder. |
| low | 5.5 | 6.5 | Blades better grouped; stacked blocks still cuboids. |
| close | 3.5 | 5.5 | Wide varied joints, block tints, strokes. Still regular rectangles with a repeated tapered drip motif on every block. Same at 1080p. |
| down | 5 | 6 | Floor mostly grass now; column tops still primitives. |
| tree | 7 | 7.5 | Holds. |
| frame | 7 | 7.5 | Composition works; pixel-stepped gable top and floating slab left of arcade visible at 720p and 1080p. |
| under | 6 | 6.5 | Sky holes help; plank bough stubs remain. |
| bush | 4.5 | 6 | Sun patches are lobed, no pixel stairs. Big ashlars still knife-edged. |
| rubble | 6 | 7 | Flowers no longer discs. |
| treeW | 7 | 7.5 | Holds. |
| path | 6.5 | 7 | Valley no longer blank. |
| pathdown | 5.5 | 6.5 | Ground has strokes; tufts still read as icons. |
| meadow | 5.5 | 6.5 | Valley bands and tree contact shadows; hairline dark contour strokes look drawn with a pen, not a brush. |
| farN | 6.5 | 7 | |
| farNE | 6 | 7 | Stretched tree gone. |
| farE | 6 | 6.5 | Near crown still a large flat mass. |
| farSE | 5.5 | 6.5 | Seam to hilltop softened; still 50% quiet wash. |
| farS | 5.5 | 6.5 | |
| farW | 6.5 | 7 | |
| farNW | 6.5 | 7.5 | Best landscape. |
| village | 6 | 6.5 | Still milky; roofs clean polygons. |
| castle | 5.5 | 6 | Mountain has dry-brush patches; castle still vector-clean. |
| hillN | 6 | 6 | Amoeba caps unchanged. |
| skyUp | 6.5 | 6.5 | Sky has streaks; some near zenith read as light shafts/arcs rather than cirrus. No net gain. |
| leaf3m | 5 | 5.5 | Bough stubs still planks. |
| feet | 4.5 | 6 | Flowers are flat petal dabs; ground has strokes. At 1080p each tuft has a stair-stepped duplicate blade underlay. |
| cross | 5.5 | 6.5 | Cross is chipped and leaning. |
| wallfoot | 5 | 6 | |
| shadowT | 7 | 7.5 | |
| flowers | 5.5 | 6.5 | |
| sap | 7 | 7.5 | |
| out0 | 6 | 6.5 | Lower third is flat lemon with icon tufts; flower rim behind hedge is a dotted line. |
| out90 | 7 | 7.5 | Castle + mountain + tree stack reads as a board. |
| out180 | 6.5 | 7 | Mountains now have light/shadow patches. |
| out270 | 6.5 | 7 | |
| doorout | 6 | 6.5 | Path shoulder good; a lone leafy weed mid-frame reads as a sprite. |
| rim | 6.5 | 7.5 | |
| rimE | 7 | 7.5 | |
| southfar | 6.5 | 7 | |
| pathback | 7.5 | 8 | Best frame. |
| lookdown | 3 | 4.5 | No longer blank, but strokes are thin and even. |
| lookdownS | 5.5 | 6 | Blocky stair-stepped shadow edge on grass. |
| lookdown2 | (not opened in C3) | 5.5 | Ground patches are good; the cast shadow edge is visibly made of square texels. |
| topTree | 5.5 | 6 | |
| topPath | 5 | 5 | Still a map. |
| shade | 6.5 | 7 | Sun patches on wall now lobed dabs. |
| shadeN | 4.5 | 5.5 | Shaded grass has directional strokes, flowers read. Buttress in the middle is banded in alternating flat tones; bush is still a dark lump. |
| haloN | 6.5 | 7.5 | |
| treeN | 7 | 7.5 | |
| lowN | 6.5 | 7 | |
| drift | 4.5 | 5.5 | |
| teleSE | 5.5 | 6 | |
| teleW | 5.5 | 5.5 | |
| mtN | 5 | 5.5 | Mountain painted; caps still amoebas. |
| mtW | 5 | 5.5 | |
| shadowG | new | 6.5 | |

1080p: `c4hd-hero` 7, `c4hd-frame` 7.5, `c4hd-inside` 6.5, `c4hd-close` 5.5 (C3: 3.5),
`c4hd-feet` 6. At 1080p the repeated drip mark and the floating slab are more obvious; nothing
else falls apart.

### 1b. Custom break-it cameras (same coordinates as C3)

| View | C3 | C4 | Notes |
|---|---|---|---|
| nosewall | 2.5 | 4.5 | Painted joints and strokes, but translucent hard-edged ghost rectangles that do not align with the blocks. |
| buttress | 3.5 | 5.5 | Striped courses. |
| graze | 4.5 | 6 | |
| northgraze | 4.5 | 5.5 | Alternating-tone course stripes on the shaded face. |
| gableup | 5.5 | 6.5 | |
| upinside | 3.5 | 4.5 | Column and octagonal abacus still a primitive from below; sky is now mottled. |
| archwest | 6.5 | 7 | |
| doorview | 6.5 | 7 | |
| floordown | 3 | 5 | Shaded grass now; sun patch is still staircase texels. |
| noserubble | 3.5 | 5 | Angular chunks, no ghost grass; moss tops are noise. |
| nosetrunk | 5.5 | 6.5 | Rectangle artefact gone. |
| upcrown | 6 | 7 | |
| grasslow | 6.5 | 7 | |
| zenith | 3 | 5 | A few flat teal polygons remain. |

New break-it cameras: rake 7.5, colcap 6.5, drum 5.5, crossnear 6.5, heapE 6.5, eaststub 6.5,
topfloor 5.5, nosegable 6.5, pathnose 7, underSE 5.5, rimdown 6, stub1 6, stub2 5.5,
floorslab 4, nosecol 3.5, floorslab2 3.5.

### 1c. Means over C3's groupings

| Grouping | C3 | C4 |
|---|---|---|
| 17 views critique 2 scored numerically | 6.1 | 6.8 |
| 60 named views opened in C3 | 5.9 | 6.6 |
| 14 custom break-it cameras | 4.6 | 5.9 |
| 16 new break-it cameras (no C3 equivalent) | - | 5.8 |

The gain is real but mostly comes from lifting the floor (close masonry, floor, flowers, valley),
not from raising the ceiling: the best frame moved 7.5 to 8, the worst from 2.5 to 3.5.

## 2. Status of critique 3's top-10

| # | C3 problem | Status | Evidence |
|---|---|---|---|
| 1 | Near masonry is a dead plane with vector blobs and hairline joints | Mostly fixed | `close`, `c4hd-close`, `nosewall`, `buttress`, `nosegable`. Joints are wide and varied, blocks tinted, strokes present. Residual: regular rectangles, one repeated drip mark, ghost rectangles at under 1.5 m. |
| 2 | Faces with no paint at all (reveals, soffits, pier sides) | Partly fixed | No blank faces at mid range. Replaced by flat alternating-tone stripes on reveals, soffits and buttress faces (`westwall`, `northgraze`, `shadeN`); `nosecol` still shows a blank column face. |
| 3 | Geometric perfection (stair rake, primitives, straight arrises) | Partly fixed | Rake, cross and columns improved (`hero`, `rake`, `crossnear`, `colcap`). Pedestal, altar and drums are still clean primitives (`inside`, `drum`); column from below still CG (`upinside`). New: detached floating slabs (see 3.1). |
| 4 | Shadow-map texels on sun patches; tile-grid floor | Partly fixed | Stone patches are lobed (`bush`, `shade`, `wallfoot`). Floor is overgrown (`down`, `high`). Still stepped on grass: `floordown`, `lookdownS`, `lookdown2`. |
| 5 | Empty mint valley and seam to hilltop | Mostly fixed | `meadow`, `farSE`, `path`, `lowN`, `vista`: bands, contact shadows. `drift`, `out0` still thin. |
| 6 | Near meadow: icon tufts on blob underlays, disc flowers | Partly fixed | Flowers fixed (`feet`, `flowers`, `rubble`). Tufts still icons on a flat fill (`hero`, `out0`, `pathdown`); underlays stair-stepped at 1080p (`c4hd-feet`). |
| 7 | Crowns from below / inside (hull facets, plank stubs) | Partly fixed | `zenith` 3 to 5, `upcrown` 7. Plank stubs remain (`leaf3m`, `under`, `underSE`). |
| 8 | Long-lens views: blank mountains, amoeba caps, clean castle/village | Partly fixed | Mountains painted (`out180`, `mtN`, `castle`). Amoeba caps (`hillN`, `mtN`, `mtW`, `teleW`) and clean castle/village roofs unchanged. |
| 9 | North shade is a murky teal mass | Partly fixed | `shadeN` 4.5 to 5.5: grass strokes and flowers read; bush still a lump, buttress banded. |
| 10 | Small artefacts (nosetrunk rectangle, ghost grass on rubble, flat zenith sky) | Fixed | `nosetrunk`, `noserubble`, `upinside`. Replaced by a different set of artefacts (section 3). |

## 3. New problems since critique 3

1. **Floating detached slabs** at the broken west arch stub (`hero`, `c4hd-hero`, `frame`,
   `westwall`, `stub1`, `stub2`). A block hangs in the air beside the springer with no support.
   Owner: `src/ruin.js` + `src/build.js`.
2. **Striped courses**: reveals, soffits and buttress faces show flat alternating light/dark
   horizontal bands (`westwall`, `northgraze`, `shadeN`, `buttress`). Owner: `src/stone.js`.
3. **Ghost overlays at nose distance**: translucent hard-edged rectangles on walls (`nosewall`),
   see-through looking rock with flat polygon moss (`floorslab2`), hard blob overlays on slabs
   (`floorslab`), blank column face with a white squiggle (`nosecol`). Owner: `src/stone.js`,
   `src/extra/props.js`, possibly `src/pipeline.js`.
4. **Dark triangular notches** on wall faces read as rendering holes (`back`). Owner:
   `src/ruin.js` / `src/stone.js`.
5. **One drip mark repeated on every block** (`close`, `c4hd-inside`, `c4hd-close`). Owner:
   `src/stone.js`.
6. **Hairline contour strokes in the valley** look pen-drawn (`meadow`). Owner:
   `src/extra/far.js` / `src/terrain.js`.
7. **Cirrus streaks near the zenith** read as light shafts or arcs (`skyUp`, `upinside`). Owner:
   `src/sky.js`.
8. **Frame time** 8.2 ms against 6.1 ms in critique 3 (tool-reported, 720p).

## 4. Top-10 remaining problems, ranked

1. **Nose-distance stone falls apart (ghost overlays, blank column).** Views: `nosecol`,
   `floorslab2`, `floorslab`, `nosewall`. A painter paints one opaque surface: a base tone, two or
   three overlapping opaque strokes, a dark crack. Suggestion, `src/stone.js`: find the layer that
   blends at partial strength with a rectangular mask (it is not aligned with the block grid, so
   it is probably a second-scale cell layer) and either snap it to the block ids or quantise its
   mix to 0/1 with a brush-noise threshold. Give lathe/column materials the same stroke layer as
   walls. Check `src/extra/props.js` rocks for alpha or depth problems near the camera, and
   `src/pipeline.js` for any near-distance fade.
2. **Floating slabs at the west arch stub.** Views: `hero`, `frame`, `westwall`, `stub1`, `stub2`.
   A painter would draw a ragged corbelled break with each stone resting on the one below.
   Suggestion, `src/ruin.js` + `src/build.js`: require every emitted block to overlap a block below
   it (support test) or drop it to the ground as rubble; shape the arch break as stepped voussoirs.
3. **Striped reveals, soffits and buttress faces.** Views: `westwall`, `northgraze`, `shadeN`,
   `buttress`. A painter keeps a shaded reveal as one quiet tone with a few joint ticks and a
   bounce-light wash at the base. Suggestion, `src/stone.js`: scale per-course tint variation by
   lit amount and by face width (near zero in shadow and on narrow faces); break course tint per
   block rather than per course.
4. **Remaining clean primitives.** Views: `inside` (altar), `hero` (pedestal), `drum`,
   `upinside`, `topfloor`. A painter chips corners, tilts tops, adds a missing chunk. Suggestion,
   `src/ruin.js` + `src/build.js` and `src/extra/props.js`: bevel and jitter box vertices, cut one
   corner per box, give the abacus an uneven underside and the drums a broken end face.
5. **Stepped shadow edge on grass.** Views: `lookdown2`, `lookdownS`, `floordown`. On stone the
   edge is already lobed; on ground it is square texels. Suggestion, `src/terrain.js` and
   `src/extra/grass.js`: use the same blurred `shadowLit` radius plus brush-noise threshold the
   stone shader now uses; make blades take the ground's thresholded value rather than their own
   sample.
6. **Icon tufts on a flat lemon fill; stair-stepped underlays.** Views: `hero`, `out0`,
   `pathdown`, `c4hd-feet`, `lookdown`. `refs/ac13.jpg` builds the meadow from overlapping tone
   patches with blades only at patch edges. Suggestion, `src/extra/grass.js`: cluster tufts into
   drifts with large gaps, drop the per-tuft underlay (or draw it as a brush dab in
   `src/terrain.js`), and add a mid-value patch layer in `src/terrain.js` for the 5-30 m band.
7. **Repeated drip mark and regular block rectangles.** Views: `close`, `c4hd-close`,
   `c4hd-inside`, `back` (notches). `refs/ac12.jpg` has long continuous rain streaks that cross
   many courses, concentrated under ledges and windows, and large areas with none. Suggestion,
   `src/stone.js`: move streaks from per-block to wall space (world x, masked by a low-frequency
   noise and by "below a ledge"), vary block length 1:3, and replace triangular notches with
   rounded chipped corners.
8. **Long-lens forest caps, castle, village.** Views: `hillN`, `mtN`, `mtW`, `teleW`, `castle`,
   `village`, `teleSE`. A painter breaks the lit cap with dab clusters and loses edges into haze.
   Suggestion, `src/extra/far.js`: threshold the lit cap with a higher-frequency brush channel
   when projected size is large; roughen castle/roof silhouettes and lower their contrast.
9. **Bough stubs and flat crown interior.** Views: `leaf3m`, `under`, `underSE`, `zenith`.
   Suggestion, `src/extra/tree.js`: taper bough ends into the leaf mass (hide tips with a leaf
   card), add a second darker tone with sky holes to the inner hull, remove the remaining flat
   polygons.
10. **Sky streaks at high elevation; pen-line contours in valley.** Views: `skyUp`, `upinside`,
    `meadow`. Suggestion, `src/sky.js`: fade streak clouds out above about 55 degrees elevation and
    keep only the soft wash. `src/extra/far.js` / `src/terrain.js`: widen contour strokes to brush
    width and lower their contrast, or remove them.

Also: recover the 2 ms lost since critique 3 (`src/pipeline.js`, `src/stone.js`).

## 5. Verdict

- **Best view:** `pathback` (8). Runner-ups: `farNW`, `rim`, `rimE`, `haloN`, `tree`, `treeW`,
  `shadowT`, `sap`, `out90`, `rake` (7.5).
- **Hero:** 7 (720p and 1080p). The floating slab and the box pedestal are the two things that
  stop it at 7.
- **Worst view:** `floorslab2` and `nosecol` (3.5). Worst named view: `lookdown` (4.5).
- **Does it match TV-anime quality?** Not yet. At 15-40 m from the chapel, with a tree in frame,
  it holds for a few seconds and would pass a casual viewer (about ten views at 7.5-8). It does
  not hold from every angle: within about 2 m of stone, straight down, and under long lenses it
  is still recognisably a stylised 3D render. Roughly a third of opened named views are at 7 or
  above, and none at 9.
- **What separates the best frames from `refs/ac12.jpg`:**
  1. The board's stone has large-scale weathering that ignores block boundaries: long dark rain
     streaks under ledges, ochre and green stains over whole wall areas, and nearly invisible
     joints. Ours is still block-by-block: every stone gets its own tint and its own mark.
  2. The board's silhouette is eroded and rounded, with mouldings, string courses and offsets;
     ours is still assembled from boxes, with breaks made of rectangular steps.
  3. The board's flower field is a dense mass of saturated colour drifts that carries the lower
     third of the picture. Our foreground is a pale lemon fill with separate tufts and a thin
     flower rim.
  4. The board's sky is a single clean gradient to a white horizon; ours is busier.
  5. Edge quality: the board has soft, lost and hard edges in one object. Ours are uniformly crisp.

## Appendix - new custom cameras (pos -> look, fov)

| Name | pos | look | fov |
|---|---|---|---|
| nosegable | 1.5,1.6,-7.6 | 1.2,1.8,-9 | 40 |
| nosecol | -1.6,1.5,-2.6 | -2.6,1.6,-3.6 | 40 |
| pathnose | 9,0.6,22 | 10,0,25 | 40 |
| underSE | 18,1.7,18 | 21,8,21 | 55 |
| rimdown | -30,1.7,24 | -40,-6,40 | 40 |
| stub1 | -12,1.7,10 | -6.5,6.5,2 | 30 |
| stub2 | -9,1.6,-2 | -6.5,6.5,4 | 40 |
| floorslab | 1.5,1.7,3.5 | 1.6,0,3.1 | 50 |
| floorslab2 | -1,1.7,1 | -0.8,0,0.6 | 50 |

`rake`, `colcap`, `drum`, `crossnear`, `heapE`, `eaststub`, `topfloor` are the cameras defined in
`tools/gshot.mjs`. C3's 14 custom cameras were re-rendered at the coordinates in critique 3's
appendix.
