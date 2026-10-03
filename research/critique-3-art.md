# Art-direction critique 3: does it pass as a Frieren background board?

Reviewed 2026-10-01, third pass, same 0-10 scale as critiques 1 and 2 (10 = indistinguishable from a production board). All judgements are by eye from 1280x720 PNGs; hex values are eyeball estimates, +/- 10%. No pixel statistics were taken.

Renders:
- Named views: `shots/c3-<view>.png` (67 rendered). 60 were opened and scored. Rendered but NOT opened, so not scored: `lookdown2`, `teleN`, `teleS`, `driftE`, `mtE`, `walkE`, `out135`.
- Custom cameras (shot.mjs takes only view names, so I used `tools/seq.mjs` with n=1; files are `shots/c3x-<name>-seq.png`): `nosewall`, `graze`, `upinside`, `upcrown`, `northgraze`, `doorview`, `grasslow`, `floordown`, `nosetrunk`, `noserubble`, `gableup`, `archwest`, `buttress`, `zenith`. Camera coordinates are listed in section 6.
- 1080p: `shots/c3hd-close.png` (opened), `c3hd-hero.png` (rendered, not opened).
- Frame time reported by shot.mjs: 6.1 ms at 720p (critique 2 quoted 10.5 ms). Not profiled.
- Critique 2's custom viewpoints `c2nose`, `c2buttress`, `c2feetfloor` had no recorded coordinates; `nosewall`, `buttress`, `floordown` are my nearest equivalents, so those comparisons are approximate.

---

## 1. Scores

"C2" is the score critique 2 gave; "-" means critique 2 rendered it but gave no number, "new" means not in critique 2.

### 1a. Views critique 2 rendered

| View | C2 | C3 | What gives it away |
|---|---|---|---|
| hero | 6.5 | 6.5 | Gable rake is a regular stair of thin slabs; pedestal block left is a clean box; foreground is a flat lime fill with a dozen isolated tuft icons. Stone hue is now right. |
| front | 6 | 6.5 | Same stair rake; dark flat arch reveals with no paint; box pedestal right; dense grass band is good. |
| inside | - | 5.5 | Column is a stack of perfect cylinders; hood moulds are ruler arcs; shadow wall is one tone with a regular dab stamp; reads better than before (planes separate). |
| westwall | - | 5 | Broken arch stub ends in knife-edged slabs; arch soffits are blank dark grey; long straight arrises; trunk is fine. |
| back | - | 5.5 | 70% of frame is one big shadowed planar wall; base bounce is a smooth vertical gradient (a 3D-fog look); straight arrises. |
| high | - | 6.5 | Charming; tell is the tile-grid floor and the box pedestal; orange/pink ground patches look like decals. |
| vista | 6 | 6.5 | Drum is a perfect cylinder with a clean ellipse end; slab floor in exact perspective; lower valley half empty. |
| low | 5.5 | 5.5 | Blades at this height are wide flat ribbons (cut paper); stacked blocks are cuboids with drip decals. |
| close | 2.5 | 3.5 | Per-block tints and dab-broken joints now exist, but faces are dead planes with vector-edged camouflage blobs; the pier on the left is a completely blank dark grey face. |
| down | 4 | 5 | Shadow edge on slabs now lobed (better); floor is still a tile grid; column tops and drums are primitives; moss is flat. |
| tree | - | 7 | Tomb cross is a rigid box with a ruler-straight shadow; otherwise holds. |
| frame | 7 | 7 | Stair rake, box pedestal; mid-ground still thin. Holds for two seconds. |
| under | - | 6 | Bough ends are tapered plank stubs; canopy underside is one flat teal. |
| bush | - | 4.5 | Sun patches on the pier have sawtooth pixel edges; 1 m ashlars with knife arrises; hairline joints. |
| rubble | - | 6 | Near flowers are flat pink discs (clip-art); stepped wall top is orthogonal. |
| treeW | 6.5 | 7 | Holds. Arch stub right of trunk is a clean curved extrusion. |
| path | - | 6.5 | Valley is a blank mint wash; lone dark tree mid-slope reads as a cut-out; ribbon blades right. |
| pathdown | - | 5.5 | Tufts are isolated icons on a flat fill, each with a blob underlay; path itself is good. |
| meadow | 4.5 | 5.5 | Camouflage gone; now 50% of frame is empty mint; trees stand on stilt trunks with no ground contact; yellow hilltop meets mint valley on a soft blob seam. |
| farN | 5.5 | 6.5 | Halo gone; valley floor empty; forest hill reads. |
| farNE | - | 6 | A column-shaped (vertically stretched) tree mid-valley; castle is clean vector; valley empty. |
| farE | - | 6 | Near crown is a large flat teal mass; valley empty. |
| farSE | 5 | 5.5 | 60% of frame is empty mint wash; visible seam where the lemon hilltop ends. |
| farS | - | 5.5 | Two stretched/columnar tree clumps mid-valley; emptiness. |
| farW | 5 | 6.5 | Good plane stack; mist patch has a scalloped blurry edge. |
| farNW | - | 6.5 | One of the better landscapes; left foreground tree crowns are smooth blobs. |
| village | 5 | 6 | Storybook-pleasant but milky; road is a flat pink ribbon; lower half empty; roofs are clean polygons. |
| castle | - | 5.5 | Mountain is a huge blank grey shape; castle clean-edged; whole frame low-contrast. |
| hillN | - | 6 | Halo fixed; lit forest caps are large smooth amoebas under the long lens; near crowns read as pom-poms. |
| skyUp | - | 6.5 | Leaning trunk right reads as a rigid log; otherwise fine. |
| leaf3m | - | 5 | Plank-like purple bough stubs float in the leaf mass; split bough end; big flat teal. |
| feet | - | 4.5 | Flowers seen from above are thick discs/buns with a shaded side (3D coins); every tuft sits on a rounded green blob; ribbon blades. |
| cross | - | 5.5 | Cross is a pristine box; hard straight cast shadow; pier behind is a clean cuboid. |
| wallfoot | 4 | 5 | Shaded grass now has tone patches; sun patch on wall top-right is pixel-staired; dark reveals are blank. |
| shadowT | - | 7 | Still the best ground: lobed shadow, flowers merging into dashes along the rim. |
| flowers | - | 5.5 | Near flowers are discs and star icons at even size; valley behind empty; tree on rim is good. |
| sap | - | 7 | Holds. |
| out0 | - | 6 | Stretched conical tree clump mid-valley; emptiness; tuft icons. |
| out90 | - | 7 | Holds; castle still vector-clean. |
| out180 | - | 6.5 | Near flowers as blobs; otherwise good. |
| out270 | - | 6.5 | Good plane stack; mist patch scalloped. |
| doorout | 7 (c2doorout) | 6 | Foreground path shoulder plus isolated tuft icons; valley empty; columnar tree. Critique 2's camera may have differed. |
| rim | - (c2rim) | 6.5 | Foreground thin; stone good at this distance. |
| rimE | 7 (c2rimE) | 7 | Flower drifts now interpenetrate and streak; stepped breaks still orthogonal. |
| southfar | - | 6.5 | Lower 40% is a flat lemon field; dark shadow blob lower-left has a hard cut-out edge. |
| pathback | 7 (c2pathback) | 7.5 | Best frame. Remaining tells: stair rake, cross, box pedestal. |
| nosewall (cf. c2nose) | 3 | 2.5 | See 1b. |
| buttress (cf. c2buttress) | 3 | 3.5 | See 1b. |
| floordown (cf. c2feetfloor) | 3.5 | 3 | See 1b. |
| close @1080p | - | 3.5 | Same as `close`; blank pier face is even more obvious. |

### 1b. Further views chosen to break it

| View | C3 | What gives it away |
|---|---|---|
| nosewall (1 m from interior west wall) | 2.5 | A flat plane with vector camouflage blobs in two tones, hairline 1 px joints as perfect rectangles, and thin flat-grey extruded strips at the edges. Nothing reads as a brush. Worst frame. |
| buttress (2.5 m, NE buttress) | 3.5 | Big cuboid blocks in exact two-point perspective, hairline joints, same blob stamp on every face. |
| graze (along west wall exterior) | 4.5 | Near stone is blob camouflage; the reveal and side faces are solid untextured dark grey. |
| northgraze (behind chapel, looking along north face) | 4.5 | A 300 px wide buttress face in shadow is one blank dark grey rectangle; shadow terminator on it is a ragged pixel edge. |
| gableup (inside, looking up at gable) | 5.5 | Lit gable per-stone tint is good; hood moulds are dark flat extruded boxes; rake stairs; sky is a flat blue with no wash. |
| upinside (inside, straight up) | 3.5 | A cylinder shaft with a square abacus seen from below: an untouched CG primitive against flat blue. |
| archwest (inside looking out through west arcade) | 6.5 | Light-dark-light stacking now works; drums are cylinders; slab floor grid. |
| doorview (inside looking south out of the door) | 6.5 | Good composition; drums and fallen drum are primitives; shaded slabs are a flat purple grid. |
| floordown (inside, straight down) | 3 | Rectangular slabs with saturated green joint lines, the wall blob stamp reused on the floor, and a sunlit patch with staircase shadow-map texels. |
| lookdown (meadow, straight down) | 3 | An almost blank lime fill with faint dashes. Nothing painted. |
| lookdownS (straight down by trunk) | 5.5 | Ribbon blades; white flowers are thick discs. |
| feet | 4.5 | See 1a. |
| grasslow (0.25 m high in grass) | 6.5 | Surprisingly good; near flower discs look like buttons; giant blade bottom-right is a flat ribbon. |
| noserubble (0.8 m, east rubble) | 3.5 | Knife-edged cubes; moss is a noise texture, not dabs; grass blades appear ghosted/semi-transparent over the stone faces. |
| nosetrunk (1.3 m from trunk) | 5.5 | Bark strokes survive close range, but there is a rectangular translucent teal patch on the shadow side (hard vertical and horizontal edges). |
| upcrown (straight up through hero crown) | 6 | Works; canopy underside is a little too uniform; bough tip is a dark spike. |
| zenith (straight up under the SE tree) | 3 | The crown's inner hull shows as large flat teal polygons with visible facet edges; branch stubs are floating planks. |
| topTree (top-down, 34 m) | 5.5 | Crown from above is fine; chapel floor is a purple tile grid. |
| topPath (top-down, 30 m) | 5 | Map-like; flat lemon; tufts are green smears; a straight grey bar (the cross) with a line. |
| shade | 6.5 | Good; sun patches on wall are pixel-staired. |
| shadeN (north of chapel in shade) | 4.5 | Murky teal mass in rounded blob shapes; bush is a formless dark lump; stone blank. |
| haloN (long lens on gable) | 6.5 | Best masonry frame: small coursing, tint variation, moulded windows. Rake blocks stick out as boxes with flat dark undersides. |
| treeN | 7 | Holds. |
| lowN | 6.5 | Forest clump is an island on blank mint with no contact shadow or base mist. |
| drift | 4.5 | Lemon hilltop against mint valley with pink streak marks that read as scratches; mostly empty. |
| teleSE (long lens to village) | 5.5 | Milky; lower half blank; flat pink road; clean roofs. |
| teleW (long lens, forest foot) | 5.5 | Forest edge ends on a ruler-flat valley; smooth amoeba caps. |
| mtN (14 deg lens, forest and mountain) | 5 | Lit caps are smooth-edged vector amoebas; mountain is blank. |
| mtW (14 deg lens) | 5 | Same amoebas; mist patch is blurred with a scalloped edge. |

Averages (my arithmetic over the tables above, rounded): views critique 2 scored numerically, excluding the three approximate custom matches: C2 mean 5.5 -> C3 mean 6.1 (17 views). All 60 named views opened: about 5.9. The 14 custom break-it cameras: about 4.6.

---

## 2. Status of critique-2 issues

| # | Critique-2 issue | Status | Evidence |
|---|---|---|---|
| 1 | Masonry within 6 m: flat faces, screen-constant stamp, hairline joints | Partly fixed | Per-block tint and dab-broken joints exist (`close`, `buttress`). Diagonal dab stamp replaced by rounded camouflage blobs; faces still dead planes; hairlines remain (`nosewall`); many faces have no paint at all (see new problem 2). |
| 2 | Stone shadow mauve and single-valued | Mostly fixed | Shadow is now neutral blue-grey with an ochre lower band (`hero`, `back`, `rimE`); reveals are darker; interior planes separate (`inside`, `archwest`). Residual: the lower bounce is a smooth gradient rather than stepped (`back`). |
| 3 | Orthogonal stair-step breaks, axis-aligned everything | Partly fixed | Steps are smaller and thinner, some tilted slabs on wall tops. Gable rake is still a regular stair (`hero`, `haloN`, `gableup`); arrises ruler-straight; drums, column, cross, pedestals still primitives. |
| 4 | Valley floor camouflage map | Fixed, over-corrected | Blobs gone everywhere. Valley is now an empty mint wash with a few hairline strokes, and a visible seam to the lemon hilltop (`farSE`, `meadow`, `drift`). |
| 5 | Airbrushed halo around near trees; mist puffs | Halo fixed; mist partly | `hillN`, `farN`, `tree`, `cross` are clean. Mist patches still blurred with scalloped edges (`mtW`, `farW`, `out270`). |
| 6 | Shaded ground a flat teal slab; stair-stepped shadow edge on stone | Partly fixed | Shaded grass has tone patches (`wallfoot`); slab shadow edge in `down` is lobed. Stone sun patches are still pixel-staired (`bush`, `wallfoot`, `shade`, `floordown`); shaded ground is still murky (`shadeN`). |
| 7 | Tuft icon pattern; empty mid-ground; path ribbons | Partly fixed | Path ribbons gone (`pathdown`). Tufts clump better near objects. Open meadow tufts are still isolated icons on blob underlays (`feet`, `pathdown`); mid-ground still empty (`southfar`, `hero`). |
| 8 | Flower drifts hard-bounded dot fields | Mostly fixed at distance, new problem near | Drifts interpenetrate and streak beyond about 15 m (`rimE`, `shadowT`, `out90`). Within 5 m flowers are thick discs with a shaded rim (`feet`, `flowers`, `lookdownS`, `grasslow`). |
| 9 | Moss vector camouflage | Still present | Flat green caps (`down`, `high`); close up it is a noise texture (`noserubble`). |
| 10 | Near-crown leaf chips and bough ends | Still present | `leaf3m`, `under`, `zenith` (worse: hull facets visible from below). |
| 11 | Mountains blank; castle/village clean | Still present | `castle`, `mtN`, `village`, `teleSE`. |
| 12 | Composition through arcade; performance | Fixed / improved | `archwest` stacks light-dark-light. 6.1 ms vs 10.5 ms at 720p as reported by the tool. |

Nothing I looked at regressed outright, except: the far valley went from "busy and wrong" to "empty", and near flowers gained visible thickness.

---

## 3. Top 10 remaining problems, ranked by damage

### 1. Masonry within about 4 m is a flat plane with a camouflage stamp
- Where: `nosewall`, `close`, `c3hd-close`, `buttress`, `graze`, `bush`, `wallfoot`.
- What is wrong: each face is a dead plane in exact perspective, filled with rounded, hard-edged two-tone blobs (30-120 px, value step about 5%) that are isotropic and identical on walls, piers and floor. Joints are 1 px ruler lines with occasional dark dabs. In `nosewall` the picture is literally a rectangle outline on a blotchy field.
- What a painter does (ac12 tower base, ac15 bridge): near stone has thick dark joints of varying width with a light upper lip, each stone a distinct flat tone, vertical rain streaks, chipped corners, a moss/dirt band rising from the ground, and large passages left as plain wash. Marks are directional (vertical drag, horizontal bedding), never round blobs.
- Suggestion (`src/stone.js`): replace the blob layer with anisotropic strokes: sample `uBrush.B` with UV stretched about 1:5 vertically for streaks and 4:1 horizontally for bedding, thresholded to under 25% coverage, masked by a low-frequency patch mask so 50% of each wall is bare wash. Joint width in world space (8-15 mm) clamped to 2-5 px, edge displaced by 4 cm noise, with a 1-2 px `#E8E6DA` lip above about 40% of lit joints. Fade the per-block tint contrast up as distance drops below 4 m (value jitter +/- 7%) so the block, not the stamp, is the unit of information. Add a ground-up dirt/moss band (0-0.4 m) as ragged dabs.

### 2. Faces with no paint at all: reveals, soffits, pier sides, hood moulds
- Where: `northgraze` (buttress face), `close` and `c3hd-close` (left pier), `graze`, `westwall` (arch soffits), `wallfoot`, `shadeN`, `gableup` (hood moulds and sills), `front`.
- What is wrong: these faces render as one uniform dark grey (about `#4B4E57`) with a faint line or two. At mid distance this reads as a deliberate deep accent, which is good; at under 8 m it reads as unshaded geometry. In `northgraze` a third of the frame is a blank grey rectangle.
- What a painter does: deep reveals are the darkest value but never flat: warm bounce at the bottom, a cooler upper part, two or three joint strokes, a lighter edge where the reveal meets the lit face.
- Suggestion (`src/stone.js`): whatever branch flattens "recess" faces should keep the block tint at half contrast and add a stepped vertical bounce (lower third `#5E5A58`, upper `#474B55`) plus sparse joints. Scale the flattening with distance: full flat beyond 15 m, painted inside 8 m. Hood moulds and sills (`src/ruin.js`) need a lit top face and a 1-2 px pale upper edge, not a single dark box.

### 3. Geometric perfection of the chapel: stair rakes, cylinders, cuboids
- Where: `hero`, `front`, `frame`, `haloN`, `gableup` (rake), `upinside`, `inside`, `vista`, `doorview`, `archwest` (columns and drums), `cross`, `tree` (tomb cross), `noserubble`, `low` (rubble and stacked blocks), `westwall`, `treeW` (arch stub).
- What is wrong: the gable rake is still a regular flight of thin slabs each projecting the same amount; rubble stones are knife-edged boxes; column shaft, abacus and fallen drums are untouched primitives; the cross is two boxes. Every long arris is straight for hundreds of pixels.
- What a painter does: break lines are irregular diagonal bites with rounded caps and leaning stones; drums are lumpy, chipped, slightly oval; a gravestone leans and has worn shoulders; verticals wobble.
- Suggestion (`src/ruin.js`): rake: vary step run 1:3 with a hash, delete 30% of projecting slabs, rotate the outer row 3-10 degrees, add wedge-cut stones. All blocks: subdivide long edges and displace vertices 1.5-3 cm with low-frequency noise; bevel arrises. Drums/shaft: 5-8% squash, per-ring radius jitter, 2-3 rim notches, tilt; abacus chamfered and chipped. Cross: taper, lean 3-5 degrees, round the arm ends. Rubble: replace boxes with 5-7 sided convex chunks.

### 4. Shadow-map texels and the interior floor
- Where: `floordown`, `bush`, `wallfoot`, `shade`, `northgraze`, `down`, `doorview`, `topTree`.
- What is wrong: sun patches on stone have staircase pixel edges (worst in `floordown`: a patch built from visible squares). The floor is a grid of rectangular slabs in one purple-slate tone with saturated green lines in the joints and the wall's blob stamp on top.
- What a painter does: a shadow edge on stone is one firm lobed brush edge; a ruined floor is a few slabs picked out by light top edges with the rest dissolved into dirt and grass.
- Suggestion: `src/glsl.js` `shadowLit` users in `src/stone.js`: sample with a wider rotated kernel (about 8-10 cm) and threshold against low-frequency brush noise only, so the edge is a smooth lobed curve; suppress islands. Floor (`src/stone.js` + `SLABS` in `src/ruin.js`): per-slab tint from three slate tones, joints dull olive `#6F7F66` not green, pale top-edge line on 30% of slabs, and drop about a third more slabs so the grid never runs more than three in a row.

### 5. Valley floor is now empty, and the hilltop meets it on a seam
- Where: `farSE`, `meadow`, `drift`, `teleSE`, `village`, `out0`, `doorout`, `path`, `farS`, `lowN`, `teleW`.
- What is wrong: beyond the hilltop the ground is a single milky mint (about `#D6E8C4`) with a few hairlines, filling 40-60% of many frames. The lemon hilltop (`#E6EE86`) ends against it on a soft irregular seam, so the hill looks like a yellow rug on a green table. Forests and lone trees sit on this plane with no contact shadow, base mist or ground-colour change, so they float (`lowN`, `meadow`). Some far clumps are vertically stretched columns (`farS`, `out0`, `farNE`, `doorout`).
- What a painter does (ac13, ac12): the far ground is quiet but structured: two or three long horizontal value bands, a hedge line, field edges, a darker strip under tree masses, and the home slope overlapping the valley with one firm edge.
- Suggestion (`src/extra/far.js`, `src/terrain.js`): add 3-5 world-anchored horizontal bands across the valley (value +/- 4%, hue drifting yellow to cool with distance), a few hedge lines and field parallelograms near the village, and a darker teal contact strip (about 6% darker, ragged top) under every forest edge and tree clump. Make the hilltop rim a firm overlap: a slightly darker green band 2-3 m wide just below the rim, with grass tufts breaking the edge. Fix the stretched clumps (non-uniform scale on a billboard or instancing matrix).

### 6. Near-camera meadow: thick-disc flowers, ribbon blades, blob underlays, blank ground
- Where: `feet`, `lookdown`, `lookdownS`, `flowers`, `grasslow`, `pathdown`, `low`, `rubble`, `topPath`.
- What is wrong: (a) within 5 m, flowers are discs with a visible darker rim/side, like coins or buns, plus perfect star icons; (b) blades are wide flat ribbons with rounded tips in three flat greens; (c) each tuft sits on a rounded mid-green blob with a smooth vector edge; (d) between tufts the ground is one flat fill; `lookdown` is a blank rectangle.
- What a painter does (ac13 foreground, ac15): flowers are irregular 2-5 petal dabs with no thickness; blades are thin tapered strokes in overlapping groups with a few light ones on top; ground between has dry-brush strokes, small darker patches and bare earth.
- Suggestion (`src/extra/grass.js`): flower sprite: drop the rim shading, use 3-4 irregular petal-dab shapes, random rotation and squash. Blades: halve width in the near band, sharpen tips, add 20% thin light strokes. Underlay: break its edge with `uBrush.R` threshold and reduce its contrast. Ground (`src/terrain.js`): within 12 m add world-anchored short strokes and 0.3-1 m darker/lighter patches (+/- 5% value) so a straight-down view has structure.

### 7. Tree crowns from below and inside 6 m
- Where: `zenith`, `leaf3m`, `under`, `upinside` (crown edge), `farE`.
- What is wrong: looking up from under a crown shows the inner hull as large flat teal polygons with straight facet edges and a second darker facet (`zenith`); branch stubs are flat purple planks that start and stop in mid-air (`leaf3m`, `zenith`); the underside is one tone.
- What a painter does (ac13, ac15): from below, a canopy is dark navy/teal broken by many sky holes, with thin branch lines threading through and backlit yellow-green leaves at the edges.
- Suggestion (`src/extra/tree.js`): alpha-test the hull with a leaf-noise mask when the view direction is within about 50 degrees of vertical or the camera is inside the crown radius, so it breaks into sky holes; add a navy `#2A4A62` second tone by noise. Branch stubs: taper to a point and extend them into the nearest leaf cluster, or hide those shorter than 1 m.

### 8. Long-lens distance: amoeba forest caps, blank mountains, clean buildings, blurred mist
- Where: `mtN`, `mtW`, `hillN`, `teleW`, `castle`, `village`, `teleSE`.
- What is wrong: under a 14-18 degree lens the lit forest caps are big smooth-edged pale blobs (vector look, no leaf-scale break-up); mountains are one blank grey with a faint smudge; castle and village are clean polygons with dot windows; mist patches are blurred with a scalloped edge.
- What a painter does: far forest is a wash with a few crisp crown edges along the ridge; mountains carry 5-8 dry-brush ridge strokes; buildings have wobbling edges and a couple of darker accents.
- Suggestion (`src/extra/far.js`, `src/sky.js`): roughen cap edges with a second noise octave scaled to screen size (so tele views get detail); add dry-brush ridge strokes to mountains (5% darker, anisotropic along slope); 1-2 px edge wobble and eave shadow strokes on buildings; threshold mist to two flat steps with a brushed edge.

### 9. Shade on the north side is a murky teal mass
- Where: `shadeN`, `wallfoot`, `back` (foreground), `noserubble`.
- What is wrong: the patch treatment helps, but the patches are rounded blobs in three close dark teals covering the whole area, flowers go muddy brown, and the bush is a formless dark lump. Overall value is lower than anything else in the scene and reads as a different, darker game.
- What a painter does (ac15, ac13 under the tree): shaded ground keeps a readable light pattern: a few warm dapples, lighter blade strokes on top, darker accents only at bases.
- Suggestion (`src/terrain.js`, `src/extra/grass.js`): lift the shaded base about 8% and cut it to two tones; make patch shapes elongated along the ground rather than round; keep flower saturation in shade (shift hue to cool, do not multiply to brown); give shaded bushes a lit-rim leaf tone.

### 10. Small artefacts that break trust
- `nosetrunk`: a rectangular semi-transparent teal patch on the trunk's shadow side with hard straight edges (probably a grass/leaf card or shadow quad intersecting the trunk; `src/extra/tree.js` or `src/extra/grass.js`).
- `noserubble`: grass blades appear ghosted over stone faces, as if dithered or drawn through the rock (`src/extra/grass.js` fade vs depth).
- `drift`, `topPath`: pink/red streak marks on the lemon hill read as scratches (`src/terrain.js` or flower far-LOD).
- `back`: smooth vertical gradient in the bounce band on shadowed stone; should be stepped (`src/stone.js`).
- `gableup`, `upinside`, `zenith`: looking up, the zenith sky is a flat saturated blue with no wash variation or cirrus (`src/sky.js`); add a faint large-scale mottling up there.
- Overall grade: the far field is milky (everything beyond the hilltop sits in a narrow pale band), while the reference boards keep at least one mid-dark plane in the distance (ac13's forested hill). Consider about 10% more value separation for the nearest forest hill (`src/extra/far.js`), not a post change.

---

## 4. Protect

- Stone palette at 10-40 m: neutral blue-grey shadow, ochre base, warm-grey lit gable with per-stone tints (`pathback`, `haloN`, `rimE`).
- Halo-free tree/forest overlaps; the forest hill with lit caps at normal lenses (`farN`, `farNW`, `lowN`).
- Tree shadow on grass and distant flower streaking (`shadowT`, `rimE`).
- Hero-tree crowns at 10-35 m and bark (`treeW`, `treeN`, `tree`, `sap`).
- Dense grass band around the chapel base (`front`, `rubble`, `shade`).
- Sky wash and cirrus at eye level; path colour and streaks.
- The frame-time gain.

---

## 5. Verdict

- **Best view:** `pathback` (7.5). Next: `treeW`, `treeN`, `tree`, `frame`, `rimE`, `shadowT`, `sap`, `out90` (all 7).
- **Hero view:** `hero` 6.5 (unchanged in score: the stone is better, the foreground is emptier); `frame` 7 is the stronger version of the same composition.
- **Worst view:** `nosewall` (2.5). Then `floordown`, `lookdown`, `zenith` (3), `close`, `buttress`, `noserubble`, `upinside` (3.5).
- **Does the general level match TV-anime background quality?** No. Composed eye-level views at 10-40 m are now consistently 6.5-7.5: a good painterly stylised game that clearly quotes the Frieren boards, and a handful would survive a short cut in an episode. None would survive being held next to ac12 or ac13: the boards have designed, varied, directional marks and deliberate dark accents, and this has procedural fills. The floor of the experience is still low: about a quarter of the views I chose (anything within 4 m of masonry, straight down, straight up under a crown or column) score 2.5-4 and read immediately as untextured or stamp-textured 3D geometry. Since critique 2 the average of comparable views rose about half a point (5.5 to 6.1), mostly from the stone hue, the removed halo and the removed valley camouflage; the worst cases moved by a point at most.
- **Biggest single tell is unchanged:** the building. Dead-planar faces, straight arrises and primitives in exact perspective, with either a blob stamp or no paint at all on them. Problems 1-4 are all the chapel; fixing them is worth more than everything else on the list combined.

---

## 6. Custom camera coordinates (for re-rendering)

`node tools/seq.mjs c3x-<name> <pos> <look> <pos> <look> --n=1 --cols=1 --fov=<fov>`

| Name | pos | look | fov |
|---|---|---|---|
| nosewall | -3.6,1.6,-3.1 | -5,1.5,-3.1 | 40 |
| graze | -5.9,1.6,8.5 | -5.55,3,-9 | 40 |
| upinside | 0,1.6,-2 | 0.01,30,-2.6 | 55 |
| upcrown | -11,1.7,5.2 | -11,30,3.6 | 55 |
| northgraze | -4.2,1.6,-11.2 | 5,4.5,-9.7 | 40 |
| doorview | 0,1.6,-6 | 0.5,1.5,30 | 40 |
| grasslow | -18,0.25,18 | 0,1.5,0 | 40 |
| floordown | 0,1.7,-3 | 0.2,0,-3.3 | 50 |
| nosetrunk | -10,1.6,4.7 | -11,1.6,3.5 | 40 |
| noserubble | 7.6,0.8,0.6 | 6.6,0.3,-1.2 | 40 |
| gableup | 0,1.6,-4 | 0,10,-9 | 45 |
| archwest | 3,1.6,-1 | -20,1.6,-0.8 | 40 |
| buttress | 7.6,1.5,-11.2 | 5.2,1.6,-9.5 | 40 |
| zenith | 20,1.7,20 | 20.01,60,19.5 | 60 |
