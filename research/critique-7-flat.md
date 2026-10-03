# Critique 7 - flatness audit and re-score

Reviewer stance: independent, same scales and strictness as critiques 5 and 6. QUALITY 8 = "would
pass as a paused Frieren background for a non-expert", 9 = "would pass next to `refs/ac12.jpg` /
`refs/ac13.jpg`". FLATNESS 10 = "I would believe it was painted on one sheet"; 5 = "a nicely
toon-shaded model"; below 5 = the 3D construction is the first thing I see.

Short answer: this round bought **quality, not flatness**. The chapel is better drawn (column,
capital, corners, stains, darker openings) and the flower drifts no longer turn into carpet or
spilled paint. Chapel Q went 6.76 -> **6.97**; chapel F is unchanged at 6.79 -> **6.81**. At
10-30 m the chapel is now a confident painting (F 7.5-8, Q 8). The firming-up brought 3D back in
two places (capital seen from below, column at nose range), the low walls improved, and a new
fault is now the most visible one at close range: stone washes that look like stacked sheets of
tinted glass. Against `ac12` the remaining gap is drawing density and value range on the stone, and
flowers that read as fallen petals rather than standing flowers.

## 0. What was rendered and what was opened

- Named views: `shots/c7-<view>.png`, all 85 rendered. **62 opened and scored** (the same 62 as
  critiques 4-6). Rendered but NOT opened: `birds`, `driftE`, `farSW`, `hillSW`, `hillW`, `map`,
  `meadow2`, `mtE`, `out45`, `out135`, `out225`, `out315`, `plainSE`, `stepA`, `stepB`, `teleN`,
  `teleS`, `topN`, `topSE`, `treesW`, `treeW2`, `walkE`, `walkW`.
- Custom cameras: `shots/c7x-<name>.png`, 36 rendered at critique 6's coordinates, all 36 opened.
- 1080p: `shots/c7hd-{hero,front,frame,inside}.png`, all 4 opened.
- Toggles: `c7m2-hero` opened; `c7t0-front` opened and compared with default. NOT opened:
  `c7m2-{front,inside,rubble}`, `c7w0-{hero,inside,haloN}`, `c7t0-{hero,inside}`. I therefore make
  no measured claim about `wobble` this round, only what the default frames show.
- Comparison frames from the last round opened: `c6-hero`.
- Frame time from `tools/shot.mjs`: 6.4-8.4 ms at 720p depending on the last view, 15.7 ms at
  1080p (`inside`). No shader errors; one 404 in the console on every load (not investigated).

## Part A - flatness audit of the chapel

### A1. Per-view table (critique 6 -> critique 7)

| View | F | Q | Main remaining 3D cue (or other fault) |
|---|---|---|---|
| hero | 7.5 -> 8 | 8 -> 8 | Column and capital now read as drawn. Break lines on the left arcade and piers are small right-angled steps with hard un-antialiased corners (blocky, like low-resolution erosion); left stub is still a stepped slab pile. |
| front | 7.5 -> 7.5 | 7.5 -> 8 | Firm painting. Left stub is a staircase of slabs with bright tops; reveals on the left wing are deep dark slots; right-hand low wall is three upright blocks. |
| frame | 8 -> 8 | 8 -> 8 | Chapel reads as painted. Plank bough upper right persists. |
| inside | 7 -> 7 | 7 -> 7.5 | Arch edges are clean, tint patchwork replaced by stains. Column drums are now firm cylinders with joint shadows (slightly more 3D than before); right-hand break still a fine regular stair; milky. |
| westwall | 7 -> 7 | 7 -> 7 | Free-standing piers are prisms: pale front face, dark side strip, pale top-lit cap. |
| back | 7 -> 7 | 7 -> 7 | Left diagonal break still steps regularly; thin exact lit slivers on the buttress edges. |
| close | 6.5 -> 7 | 6 -> 6.5 | Flat. Now a dull blue-grey with drips and hairline joints; nothing to look at, no warm/cool play. |
| rubble | 6.5 -> 6.5 | 7 -> 7 | Low wall is now one dark mass (better). A house-shaped block with a gabled top and the stepped pile behind it read as solids. |
| high | 6.5 -> 6.5 | 6.5 -> 7 | Diorama view; wall thickness and floor slabs. Flowers are now dab fields, not spills. |
| haloN | 7.5 -> 7.5 | 7.5 -> 8 | Capital has a readable abacus and bell. Pale horizontal dashes on the left arcade top read as highlights on slab edges. |
| low | 7 -> 7 | 7.5 -> 7.5 | Centre ochre block pile is stepped prisms in front of the gable. |
| nosewall | 6.5 -> 6.5 | 5.5 -> 5.5 | Dull dark grey panel with thick dark joints and ruled vertical hairlines; ghost patch is gone. |
| graze | 6.5 -> 6 | 6.5 -> 6.5 | Giant ochre blocks with ruled arrises and exact three-tone faces; glassy grey patches lie over them. |
| upinside | 5.5 -> 5 | 5.5 -> 5.5 | **3D came back**: square abacus plate on a cylinder with flat lit facets, an unmistakable primitive from below. |
| northgraze | 7 -> 7 | 7 -> 7 | Parallel ruled diagonal joints on the right wall. |
| gableup | 7 -> 7.5 | 6.5 -> 7 | Stains and streaks carry it. Right slope still steps in small increments; pale. |
| archwest | 7.5 -> 7.5 | 7.5 -> 7.5 | Good. Foreground slab has a pixel-stepped edge. |
| doorview | 7 -> 7 | 7 -> 7 | Foreground slabs are three-tone prisms. |
| buttress | 6.5 -> 6.5 | 5.5 -> 6.5 | Corner is readable again (tone change across it), torn sawtooth base replaced by a soft moss band. Drab, glassy patches. |
| rake | 7.5 -> 7.5 | 7.5 -> 7.5 | Pale; small dark triangular facets on the top edge. |
| colcap | 6 -> 5.5 | 6 -> 6.5 | **3D came back**: no longer melted, but the bell is a smooth turned solid with faceted tone bands and the abacus shows top, side and underside. Better drawn, less flat. |
| topfloor | 5.5 -> 5 | 5 -> 5 | Plan view of slab squares and column circles. |
| above45 | 6.5 -> 6.5 | 6.5 -> 7 | Diorama; flowers fixed. |
| thruarch | 7.5 -> 7.5 | 7.5 -> 7.5 | Layered paint. |
| longlens | 8 -> 8 | 7.5 -> 8 | Flattest view. Red band replaced by dabs. |
| cornerNE | 7 -> 7 | 6.5 -> 7 | Trunk fills the frame. |
| wideclose | 5.5 -> 5.5 | 6.5 -> 6.5 | Not flatter. Foreground slab stack with bright facets; at fov 60 the capital reads as a block on a post. |
| eastside | 7.5 -> 7.5 | 7.5 -> 7.5 | Crisp arches on flat tone; low wall is one mass. Left break steps finely. |
| nosecol | 6.5 -> 6 | 6 -> 5.5 | Column separates from the wall now, but with a ruled rectangular notch-shaped shadow, a doubled dark joint line, and overlapping glassy washes. |
| heapE | 6 -> 6.5 | 6.5 -> 7 | Low wall is one mass. Rocks still faceted with pale triangles; washes on the wall look see-through. |
| eaststub | 5.5 -> 6.5 | 6.5 -> 7 | Low wall is one mass with a ragged top. Stepped slab stack on the right and the house-shaped block remain. |

Means over the 31 views: **F 6.79 -> 6.81; Q 6.76 -> 6.97.**
By range: 20 m and beyond or long lens 7.5-8; 8-20 m eye level 7-7.5; inside the nave 7; nose
range 6-7; low walls and rubble 6.5; from above 5-6.5; straight up at the column 5-5.5.

### A2. Where it is now a confident painting

- `hero`, `front`, `haloN`, `frame`, `longlens`, `pathback`, `treeW`, `rimE`, `eastside`,
  `thruarch`. Column and capital stand clear of the gable with one shadow side; openings are
  clearly darker than lit stone; the cast shadow on the gable is a lobed shape; the gable carries
  large ochre and grey stain fields and streaks instead of rectangular stickers.
- Arch edges are clean at 720p and 1080p (`inside`, `c7hd-inside`); the pixel-stepped arch against
  the sky from critique 6 is gone.
- Automatic telephoto now engages at 19 m: in default `front` the far mountains sit higher behind
  the gable and the side walls converge less than in `c7t0-front`. Worth about +0.5 F on that view
  (already counted).
- Low walls (`eaststub`, `heapE`, `eastside`, `rubble`) are lit as one mass. This was item 3 of the
  last list and it worked: +1 and +0.5 F.

### A3. Where it still reads as a model

1. **Blocky stepped break lines.** With wobble masked off, the eroded silhouettes show as small
   right-angled steps with hard corners (`hero`, `c7hd-hero` left arcade top and pier edges,
   `back` left, `inside` right, `gableup` right, `eastside` left). Irregular now, but every bite
   is axis-aligned, so it reads as voxel erosion, not a broken wall.
2. **Slab and block piles** (`front` left stub, `low` centre, `wideclose`, `rubble`, `eaststub`
   right, `vista`, `doorview`): stepped prisms with bright tops; the house-shaped block with a
   gabled top is a recognisable solid from three views.
3. **Free-standing piers** (`westwall`, `graze`): front, side and cap in three exact tones.
4. **From above and straight up** (`topfloor`, `high`, `above45`, `upinside`): unchanged in kind.
5. **Loose rocks** (`heapE`, `noserubble`): low-poly facets with pale triangles.

### A4. Where firming-up brought 3D back

- **Capital from below** (`upinside`, `colcap`, `wideclose`): F down 0.5 on the first two. The
  capital is now a turned solid with an abacus plate whose underside is visible. From eye level at
  10 m or more this is a clear gain (`hero`, `front`, `haloN` Q +0.5); looking up it is a primitive.
- **Column at nose range** (`nosecol`, `inside`): drum joints with a doubled line and a ruled
  notch shadow.

### A5. Still or newly melted / structureless

- **Glassy overlapping washes (new, the worst close-range fault).** The brushed tint patches and
  per-mass lighting read as translucent sheets: in `noserubble` the rocks look like tinted glass
  with facet edges showing through a moss layer; the same in `drum`, `floorslab`, `heapE` (wall),
  `wallfoot` (pier), `nosecol`, `graze`. A poster-colour dab is opaque and has one edge; these
  have soft interior edges that follow geometry underneath. `noserubble` 5.5 -> 5, `floorslab`
  5 -> 4.5.
- **Dull close walls** (`close`, `nosewall`, `buttress`): flat, but low-contrast blue-grey with no
  warm notes; reads unfinished rather than painted.
- `floorslab2` moss disc: unchanged polygon.

## Part B - quality re-score

### B1. Named views (C6 -> C7)

| View | C6 | C7 | Note |
|---|---|---|---|
| hero | 8 | 8 | Better chapel; flowers are scattered flat petals. |
| front | 7.5 | 8 | Column, capital, dark reveals. |
| inside | 7 | 7.5 | Clean arches, stains. |
| westwall | 7 | 7 | |
| back | 7 | 7 | |
| high | 6.5 | 7 | Spills gone. |
| vista | 7 | 7 | |
| low | 7.5 | 7.5 | |
| close | 6 | 6.5 | |
| down | 6 | 6 | See-through slabs persist. |
| tree | 8 | 8 | |
| frame | 8 | 8 | |
| under | 6.5 | 6.5 | |
| bush | 7 | 7 | |
| rubble | 7 | 7 | |
| treeW | 8 | 8 | |
| path | 7.5 | 7.5 | Foreground petals are large flat ovals. |
| pathdown | 6.5 | 7 | Dab drifts work from above here. |
| meadow | 6.5 | 7 | Ghost patch gone. |
| farN | 7 | 7 | |
| farNE | 7 | 7 | Red contour lines gone. |
| farE | 6.5 | 6.5 | |
| farSE | 6.5 | 7 | Stains replaced by dabs. |
| farS | 6.5 | 6.5 | |
| farW | 7 | 7 | |
| farNW | 7.5 | 7.5 | |
| village | 6.5 | 6.5 | |
| castle | 6.5 | 6.5 | |
| hillN | 6 | 6.5 | Sun caps smaller. |
| skyUp | 6.5 | 6.5 | Plank boughs, faceted fork. |
| leaf3m | 6.5 | 6.5 | New: a 1-pixel dotted horizontal line at y ~ 397 across the crown. |
| feet | 6.5 | **6** | Petals are large flat pastel ovals with no stems or centres. |
| cross | 7 | 7.5 | |
| wallfoot | 6.5 | 6.5 | Sawtooth gone; pier looks glassy. |
| shadowT | 7 | 7.5 | Red ribbon gone. |
| flowers | 7.5 | 7.5 | |
| sap | 7.5 | 7.5 | Faint diagonal stripes in the crown remain. |
| out0 | 7 | 7 | |
| out90 | 7.5 | 7.5 | |
| out180 | 7.5 | 7.5 | |
| out270 | 7 | 7 | |
| doorout | 7 | 7 | |
| rim | 7.5 | 7.5 | |
| rimE | 7.5 | 8 | Best flower field. |
| southfar | 6.5 | 7 | |
| pathback | 8 | 8 | |
| lookdown | 5.5 | 6 | |
| lookdownS | 6.5 | 6.5 | |
| lookdown2 | 6.5 | 6.5 | |
| topTree | 5.5 | 6 | |
| topPath | 4.5 | 5.5 | Dabs now; ground is banded blotches. |
| shade | 7.5 | 7.5 | |
| shadeN | 6.5 | 6.5 | |
| haloN | 7.5 | 8 | |
| treeN | 7.5 | 7.5 | |
| lowN | 7 | 7 | |
| drift | 5.5 | 6 | Dabs, but the patch outline is still a blob. |
| teleSE | 6 | 6.5 | |
| teleW | 5.5 | 5.5 | |
| mtN | 5.5 | 5.5 | |
| mtW | 5.5 | 5.5 | |
| shadowG | 7 | 7.5 | |

1080p: `hero` 8, `front` 8, `frame` 8, `inside` 7.5. Same as 720p. At 1080p the stepped break
lines and the plank bough in `frame` are easier to see; the capital holds up.

### B2. Custom cameras (C6 -> C7)

| View | C6 | C7 | Note |
|---|---|---|---|
| nosewall | 5.5 | 5.5 | |
| buttress | 5.5 | 6.5 | Corner found. |
| graze | 6.5 | 6.5 | |
| northgraze | 7 | 7 | |
| gableup | 6.5 | 7 | |
| upinside | 5.5 | 5.5 | |
| archwest | 7.5 | 7.5 | |
| doorview | 7 | 7 | |
| floordown | 6 | 6 | |
| noserubble | 5.5 | **5** | Glassy rocks. |
| nosetrunk | 7 | 7 | |
| upcrown | 7 | 7 | |
| grasslow | 7.5 | 7.5 | |
| zenith | 6 | 6 | Faceted green bough planks. |
| rake | 7.5 | 7.5 | |
| colcap | 6 | 6.5 | |
| drum | 5.5 | 5.5 | See-through bands on the block. |
| crossnear | 6.5 | 7 | |
| heapE | 6.5 | 7 | |
| eaststub | 6.5 | 7 | |
| topfloor | 5 | 5 | |
| nosegable | 7 | 7 | |
| pathnose | 7.5 | 7.5 | |
| underSE | 5.5 | 5.5 | Faceted, striped green bough. |
| rimdown | 6 | 6.5 | Striped card gone. |
| stub1 | 6.5 | 7 | |
| stub2 | 6.5 | 6.5 | 1-pixel dotted line at y ~ 555 in the crown. |
| floorslab | 5 | **4.5** | Slabs look like tinted glass over moss. |
| nosecol | 6 | **5.5** | Ruled notch shadow, doubled joint. |
| floorslab2 | 4 | 4 | |
| above45 | 6.5 | 7 | |
| thruarch | 7.5 | 7.5 | |
| longlens | 7.5 | 8 | |
| cornerNE | 6.5 | 7 | |
| wideclose | 6.5 | 6.5 | |
| eastside | 7.5 | 7.5 | |

### B3. Means over the same groupings

| Grouping | C5 | C6 | C7 |
|---|---|---|---|
| 17 views critique 2 scored numerically | 7.0 | 7.09 | **7.24** |
| 62 named views | 6.76 | 6.80 | **6.95** |
| 14 custom break-it cameras (C3 set) | 6.11 | 6.43 | **6.50** |
| 16 break-it cameras added in C4 | 6.0 | 6.09 | **6.22** |
| 31 chapel views of Part A (Q) | 6.55 | 6.76 | **6.97** |
| 31 chapel views of Part A (F) | 6.05 | 6.79 | **6.81** |

Eight named views at 8 (`hero`, `front`, `tree`, `frame`, `treeW`, `rimE`, `pathback`, `haloN`)
plus custom `longlens`; 22 named at 7.5 or above, 39 at 7 or above (critique 6: 5, 18, 34).
Nothing reaches 8.5.

### B4. Regressions, explicitly

Views at 7.5-8 in critique 6:

| View | C6 | C7 | |
|---|---|---|---|
| hero | 8 | 8 | held (chapel better, flowers thinner) |
| pathback | 8 | 8 | held |
| tree | 8 | 8 | held |
| treeW | 8 | 8 | held |
| frame | 8 | 8 | held |
| rimE | 7.5 | 8 | up |
| treeN | 7.5 | 7.5 | held |
| sap | 7.5 | 7.5 | held (stripes remain) |
| out90 | 7.5 | 7.5 | held |
| farNW | 7.5 | 7.5 | held |
| haloN | 7.5 | 8 | up |
| rake | 7.5 | 7.5 | held |
| longlens | 7.5 | 8 | recovered |
| shadowT | 7 | 7.5 | recovered |

No view in that group regressed. Regressions elsewhere: `feet` 6.5 -> 6, `noserubble` 5.5 -> 5,
`floorslab` 5 -> 4.5, `nosecol` 6 -> 5.5. Flatness regressions: `upinside`, `colcap`, `graze`,
`nosecol`, `topfloor` (each -0.5 F). New artefact: 1-pixel dotted horizontal lines in tree crowns
(`leaf3m`, `stub2`).

Claimed changes the pictures do not fully confirm: bough tweaks (plank or faceted boughs remain in
`frame`, `skyUp`, `underSE`, `zenith`); break lines rebuilt (irregular now, but still
right-angled steps).

### B5. Rebuilt flower drifts: flower mass, carpet or confetti?

| Range | Views | Reads as | Why |
|---|---|---|---|
| Eye level, under 15 m | `low`, `grasslow`, `flowers`, `cross`, `out180` | flower mass where stems and blades stand among the dabs (`low`, `grasslow`); **fallen petals** where they do not (`feet`, `path`, `out180` foreground) | Dabs are flat pastel ovals lying on the ground plane, up to 30 px wide, with no stem, centre or shadow. |
| 15-40 m | `hero`, `frame`, `rim`, `rimE`, `shadowT`, `longlens`, `pathback` | flower mass, on the pale side | Mixed hues, soft edges, no underlay, no outline. `rimE` and `rim` are the closest the project has come to `ac12`. `hero` is thin and pale beside it. |
| Beyond 40 m | `farSE`, `farNE`, `southfar`, `pathnose`, `rimdown`, `meadow` | flower mass | Small pale dab groups; contour lines and stains are gone. |
| From above | `high`, `above45`, `pathdown`, `topPath`, `topTree` | acceptable dab fields | No longer spilled paint. `topPath` and `topTree` are limited by the banded ground, not the flowers. `drift` still shows a blob-shaped patch. |

Verdict: **no carpet, no spilled paint anywhere I looked; mild confetti within about 8 m** where
the petals are large and nothing stands up. Against `ac12` the drifts are too pastel (pink and
cream where the board has saturated magenta, orange and yellow), too sparse at 15-30 m, and they
lack the green of stems between the dabs and the horizontal colour banding.

## Part C - against `refs/ac12.jpg` and `refs/ac13.jpg`

Best three frames: `c7hd-hero`, `c7-front`, `c7-rimE` (with `pathback` and `treeW` level).

- **Drawing.** `ac12` is drawn before it is painted: ruled verticals on every buttress, set-offs
  with a cornice line and a shadow under it, string courses, window surrounds, small slit windows,
  a stair at the door. Ours has one column, two lancets and a moulding pair; walls are plain
  slabs with a broken top. Our breaks are right-angled steps; the board's are a few big torn
  shapes with rubble profiles. Architectural detail per wall is perhaps a fifth of the board's.
- **Value structure.** `ac12` runs from near-white lit stone to deep violet-black openings in
  which you can still see interior piers. `ac13` grades the tower from warm lit to violet shadow.
  Ours: lit gable about right, shadow walls a single mid grey-violet, openings only a step darker
  and empty. The whole chapel sits in the middle third of the range; it reads milky.
- **Edge quality.** Boards: crisp ruled edges on architecture, broken dry-brush edges on foliage
  and ground. Ours: uniform soft-filtered edge everywhere, plus hard stair-step pixels on breaks.
  There is no contrast between a ruled edge and a painted one.
- **Colour.** `ac12` stone has ochre, pink, green-grey and violet in one wall and a dark stained
  base; `ac13` has orange light against violet shadow. Ours is cream and lilac, two notes. The
  boards' flowers are saturated; ours are pastel. Our greens are fine and close to `ac13`.
- **Texture.** Boards: every stone is hinted by a small dab, hairline courses run across walls,
  vertical grime streaks everywhere. Ours: large washes, some drips, almost no course lines at
  distance; close up the washes look like glass. Tree foliage is the one place we match `ac13`.
- **Composition density.** `ac12` puts all detail in the left third and leaves 60% as empty sky
  and field; inside the building it is dense. Ours spreads medium detail evenly: busy sky
  streaks, trees on both sides, mid-detail chapel. The chapel is the least detailed thing in its
  own picture, which is the reverse of the board.

### Top 10 remaining improvements, ranked (largest expected gain marked **[L]**)

1. **[L] Architectural drawing on the walls.**
   Where: `hero`, `front`, `westwall`, `back`, `close`, `nosewall`, `eastside`.
   Painter: rules string courses, buttress set-offs, plinth line, window surrounds, slit windows,
   then hints coursing with thin broken lines.
   Technique: `src/ruin.js` + `src/build.js`: add per-wall feature lines as data (heights of
   plinth, string course, set-offs; a few slit windows) with no geometry. `src/stone.js`: draw them
   as thin dark line plus pale line above (a painted cornice), and add faint broken course lines
   every 0.35 m that fade in lit areas and at distance by screen-space width.

2. **[L] Value range: darker openings with something inside, darker base, lighter lit planes.**
   Where: every chapel view; worst `close`, `inside`, `westwall`.
   Painter: openings are the darkest shapes, with one or two interior shapes visible; the base of
   each wall is darker and greener; lit stone is near the top of the range.
   Technique: `src/stone.js`: lower reveal and deep-shadow value by a further 0.10-0.15 and shift
   it violet; add a 1-1.5 m base band (darker, green-ochre) with a brush-noised top; raise lit
   stone slightly and add a warm bounce tint on shadow walls near lit ground. `src/pipeline.js`:
   check the final grade is not compressing the darks (the darkest stone I see is about 0.35).

3. **[L] Opaque dabs instead of glassy washes at close range.**
   Where: `noserubble`, `floorslab`, `drum`, `heapE`, `wallfoot`, `nosecol`, `graze`, `down`.
   Painter: each patch is opaque with one edge; nothing shows through.
   Technique: `src/stone.js` and `src/extra/props.js`: threshold the tint/moss/stain masks with
   `brushStable` to a hard step (as light already is) instead of alpha-mixing, limit to two
   layers, and stop masks from following facet or block boundaries. If the look comes from
   lost-edge blending in `src/pipeline.js`, exclude same-object interior edges within 4 m.

4. **Break lines as torn shapes, not steps.**
   Where: `hero`, `back`, `inside`, `gableup`, `eastside`, `rubble`.
   Painter: two or three big bites, slanted and curved runs, a few stones proud.
   Technique: `src/ruin.js` + `src/build.js`: build the cap from a noised polyline with slanted
   segments (not axis-aligned steps), 1:6 variation in run length. `src/pipeline.js`: antialias
   silhouette edges that are exempt from wobble (they are now hard pixel stairs).

5. **Flowers that stand up, with saturated bands.**
   Where: `feet`, `path`, `out180`, `hero`, `frame`.
   Painter: small saturated dabs in horizontal hue bands, green stems between, blades in front.
   Technique: `src/terrain.js`: cap ground-dab size at about 10 px, raise saturation toward
   `ac12` hues, organise hue by a low-frequency band noise stretched along the view-horizontal,
   keep 30-40% green between dabs. `src/extra/grass.js`: more upright flower cards with stems
   inside drifts to 25 m so the near field is flowers, not petals.

6. **Capital and column that survive looking up and nose range.**
   Where: `upinside`, `colcap`, `wideclose`, `nosecol`.
   Painter: two tones and a line; no underside plane, no turned shading.
   Technique: `src/stone.js`: on the capital use a single light/shadow split by a fixed painted
   direction rather than the normal, and give the abacus underside the shadow tone of the bell.
   `src/ruin.js`: chamfer the abacus to an octagon and break one corner. Remove the doubled joint
   line and notch shadow on drums.

7. **Block piles, piers and rocks.**
   Where: `front` left stub, `low`, `wideclose`, `westwall`, `rubble`, `heapE`.
   Painter: a pile is one light shape and one shadow shape; a rock is a rounded lump.
   Technique: `src/ruin.js` + `src/build.js`: replace the stepped stub and the house-shaped block
   with eroded-polyline masses like the low walls. `src/stone.js`: pier caps take the front tone.
   `src/extra/props.js`: smooth rock normals and drop pale facet triangles.

8. **Composition density and quiet areas.**
   Where: `hero`, `frame`, `front`.
   Painter: detail concentrated on the building, sky nearly empty.
   Technique: `src/sky.js`: halve cirrus count and contrast near the chapel's azimuth.
   `src/stone.js`: this is where items 1 and 2 put the detail back.

9. **Tree leftovers.**
   Where: `frame`, `skyUp`, `underSE`, `zenith`, `sap`, `leaf3m`, `stub2`.
   Painter: boughs taper and vanish into leaf masses; no stripes.
   Technique: `src/extra/tree.js`: round or hide faceted bough ends, remove the striped card, and
   find the source of the 1-pixel dotted horizontal lines (likely a card edge or texture row at
   alpha threshold; clamp UVs half a texel in).

10. **Views from above and far mountains.**
    Where: `topfloor`, `topPath`, `topTree`, `mtN`, `mtW`, `teleW`.
    Painter: does not paint plan views; mountains are two or three flat planes with small shapes.
    Technique: `src/main.js`: resist pitch below about -40 degrees. `src/terrain.js`: soften the
    banded ground blotches seen from above. `src/extra/far.js`: break the large amoeba snow/light
    caps into smaller ridge-following shapes.

Items 1, 2 and 3 are the ones I expect to move scores: 1 and 2 are what separates the best frames
from `ac12` (possible 8 -> 8.5 on `hero`, `front`, `haloN`), and 3 lifts the worst close cameras
by about a point.

## Verdict

- **Does the chapel read as flat / painted from any angle?** No, not from any angle. From 10 m
  outward at eye level, through arches and inside the nave it does (F 7-8), and at 20-30 m it is
  a confident painting. It still reads as a model at block piles and free-standing piers, from
  above, and looking up at the column, where this round's firmer capital is plainly a solid. At
  nose range it is flat but looks like stacked tinted glass, which is not paint either.
- **Does the general level match TV-anime background quality?** For a casual viewer, in the best
  third: yes (eight named views at 8, 22 at 7.5 or above). Beside `ac12` or `ac13`: no. Nothing
  reaches 8.5. The stone has too little drawing and too narrow a value range, and the flowers are
  pastel petals rather than a saturated standing field.
- Best: `hero`, `front`, `haloN`, `frame`, `tree`, `treeW`, `rimE`, `pathback`, `longlens` (8).
  Worst: `floorslab2` (4), `floorslab` (4.5), `noserubble`, `topfloor` (5).

## Appendix - cameras

All custom cameras are critique 6's (critique 5 appendix, `tools/gshot.mjs`, critique 4 appendix,
critique 3 section 6), rendered with `node tools/dbg.mjs c7x name:pos:look:fov ...`. Named views
with `node tools/shot.mjs c7 all`; 1080p with `--w=1920 --h=1080`; toggles with
`--q="mode=2"`, `--q="wobble=0"`, `--q="tele=0"`.
