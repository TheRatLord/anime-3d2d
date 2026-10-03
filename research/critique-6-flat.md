# Critique 6 - flatness audit and re-score

Reviewer stance: independent, same scales and strictness as critique 5. QUALITY 8 = "would pass as
a paused Frieren background for a non-expert", 9 = "would pass next to `refs/ac12.jpg` /
`refs/ac13.jpg`". FLATNESS 10 = "I would believe it was painted on one sheet"; 5 = "a nicely
toon-shaded model"; below 5 = the 3D construction is the first thing I see.

Short answer: the chapel is clearly flatter than in critique 5. Mean flatness over the same 31
views went from 6.05 to **6.79**. From 10 m outward and from inside the nave it now reads as paint
(F 7-8). It did not get flatter where the cue is a small solid (low walls, rubble, foreground slab
stacks) or the viewpoint (from above, straight up). In three places the flattening went too far:
the column capital, the corner of the NE buttress, and the column against the wall now read as
melted or merged, not drawn. The new limit on quality is no longer "3D"; it is that the chapel is
softer, paler and less firmly drawn than `refs/ac12.jpg`, and that the new flower drifts work near
the camera but turn into flat pink carpet or spilled paint at distance and from above.

## 0. What was rendered and what was opened

- Named views: `shots/c6-<view>.png`, all 85 rendered. **62 opened and scored** (the same 62 as
  critiques 4 and 5). Rendered but NOT opened: `birds`, `driftE`, `farSW`, `hillSW`, `hillW`,
  `map`, `meadow2`, `mtE`, `out45`, `out135`, `out225`, `out315`, `plainSE`, `stepA`, `stepB`,
  `teleN`, `teleS`, `topN`, `topSE`, `treesW`, `treeW2`, `walkE`, `walkW`.
- Custom cameras: `shots/c6x-<name>.png`, 36 rendered at critique 5's coordinates, all 36 opened.
- 1080p: `shots/c6hd-{hero,front,frame,inside}.png`, all 4 opened.
- Toggles, 14 cameras each (`hero front inside westwall close back gableup cornerNE wideclose
  graze above45 thruarch haloN rake`):
  - `c6w0-*` (`wobble=0`): compared as side-by-side crops against default for `hero`, `inside`,
    `haloN`, `gableup` (crops in the scratchpad, 2x and 4x). `low` and `front` were added and
    cropped but I draw no conclusion from them. The other full frames were not opened.
  - `c6t0-*` (`tele=0`): opened `front`, `inside`, `thruarch`, `close`, `wideclose`. `hero` is
    byte-identical to default. Others not opened.
  - `c6t35-*` (`tele=0.35`): opened `front`, `hero`, `inside`, `wideclose`. `close`, `buttress`
    not opened.
  - `c6m2-*` (`mode=2`): opened `hero`, `inside`. Other 12 not opened.
  - `c6s0-*` (`shift=0`): 14 rendered; none is cited (not assessed this round).
  - `c6tmp-*`, `c6f-hero`: by-products of measurements, not opened.
- Frame time from `tools/shot.mjs` at 720p on `hero`: **7.60 ms** (critique 5: 9.97 ms). Recovered.

## Part A - flatness audit of the chapel

### A1. Per-view table (critique 5 value -> critique 6 value)

| View | F | Q | Main remaining 3D cue (or other fault) |
|---|---|---|---|
| hero | 7 -> 7.5 | 7.5 -> 8 | Breaks are now lumpy and eroded. Remaining: left slab is a prism with a mossy slanted top; small rectangular teeth along the arcade pier edges; the column beside the gable is a dark strip with a lump for a capital. |
| front | 6.5 -> 7.5 | 7.5 -> 7.5 | Gable and lobed shadow read as paint. Arcade openings are still dark inset slots (true reveal); moss-top prism left, prism blocks right; column capital is a blob with a block perched on it. |
| frame | 7.5 -> 8 | 8 -> 8 | Chapel reads as painted. Plank bough upper right. |
| inside | 5.5 -> 7 | 6.5 -> 7 | Biggest gain. Ring joints, proud plates and moulding undersides are gone. Remaining: fine regular stair on the right-hand break; arch edge against sky is pixel-stepped; rectangular tint patchwork on the left wall; milky. |
| westwall | 6 -> 7 | 6.5 -> 7 | Break on the right is a fine pixel stair. |
| back | 6 -> 7 | 6.5 -> 7 | Left diagonal break is a regular fine stair; thin exact lit slivers on the buttress strips. |
| close | 5 -> 6.5 | 5.5 -> 6 | Joints are sparse and wander; convergence is weak. Now a milky grey with little to look at; a ruled notch block on the pier edge. |
| rubble | 6.5 -> 6.5 | 7 -> 7 | Not flatter. Low wall and broken pier are stacks of small slabs with bright tops; faceted rocks. |
| high | 6.5 -> 6.5 | 7 -> 6.5 | Not flatter. Diorama: wall-top thickness, floor slabs. New pink and orange blotches read as spilled paint. |
| haloN | 7 -> 7.5 | 7.5 -> 7.5 | Mouldings are lines, shadow is lobed. Capital is a dark lump with a block on it; regular rectangular teeth on the left pier edges. |
| low | 6 -> 7 | 7 -> 7.5 | Central block is still a prism with a moss top; toothed pier edges. Foreground flower mix is good. |
| nosewall | 5 -> 6.5 | 4 -> 5.5 | Thick wandering joints read as drawn. A pale rectangular ghost patch and pale chip triangles remain. |
| graze | 6 -> 6.5 | 6.5 -> 6.5 | Clean giant blocks with ruled hairline arrises and one ruled diagonal crack. |
| upinside | 4.5 -> 5.5 | 5 -> 5.5 | Sky is clean. Capital is an unreadable dark lump with a lit block on top (over-flattened). |
| northgraze | 6.5 -> 7 | 6.5 -> 7 | Good. |
| gableup | 5 -> 7 | 6 -> 6.5 | No keystone, mouldings are line pairs. Break outline still small regular steps; chalky; rectangular tint patchwork. |
| archwest | 7 -> 7.5 | 7.5 -> 7.5 | Good. |
| doorview | 7 -> 7 | 7 -> 7 | Column stubs are soft lumps; slabs. |
| buttress | 5 -> 6.5 | 5.5 -> 5.5 | Flat, but the corner between the two faces is lost: one grey mass with rectangular tint patches and a ragged dark sawtooth band at the base (over-flattened). |
| rake | 7 -> 7.5 | 7.5 -> 7.5 | Streaks cross courses, side faces gone. Chalky, low contrast. |
| colcap | 5 -> 6 | 6 -> 6 | Capital is a structureless lump (over-flattened); shaft still a tube; a ruled dark diagonal line on the left wall. |
| topfloor | 5 -> 5.5 | 5.5 -> 5 | Plan view. Slabs less gridded; pink blotches. |
| above45 | 6 -> 6.5 | 6.5 -> 6.5 | Diorama; orange and pink spills on the meadow. |
| thruarch | 6.5 -> 7.5 | 7 -> 7.5 | Telephoto pulls the far wall and hill up; reads as layered paint. Heavy rectangular patchwork on the middle wall. |
| longlens | 8 -> 8 | 8 -> 7.5 | Still the flattest. Quality down: a flat red band with no dabs across the base. |
| cornerNE | 6.5 -> 7 | 6.5 -> 6.5 | Trunk fills the frame; chapel flat behind. |
| wideclose | 5 -> 5.5 | 6.5 -> 6.5 | Not flatter. Foreground stack of slabs with dark sides and bright tops; automatic telephoto does nothing here (see A4). |
| eastside | 7 -> 7.5 | 7 -> 7.5 | Crisp arches on flat tone: the best-drawn chapel view. Row of teeth along the wall top. |
| nosecol | 5 -> 6.5 | 5 -> 6 | Column is a flat strip with one wobbly joint; barely separates from the wall; sun patch has a ruled edge. |
| heapE | 5.5 -> 6 | 6.5 -> 6.5 | Heap tone is grouped, but rocks are pale faceted crystals with pale outlines. |
| eaststub | 5.5 -> 5.5 | 6.5 -> 6.5 | Not flatter. Slab stairs with bright tops. |

Means over the 31 views: **F 6.05 -> 6.79; Q 6.55 -> 6.76.**
By range: 25 m and beyond or long lens 7.5-8; 8-20 m eye level 7-7.5; inside the nave 7;
nose-close 6.5; low walls and rubble 5.5-6.5; from above and straight up 5.5-6.5.

### A2. Where it got flatter

- Inside and near walls: `inside` +1.5, `gableup` +2, `close` +1.5, `nosewall` +1.5, `nosecol`
  +1.5, `buttress` +1.5. The causes are visible in the pictures: mouldings and plates are now
  lines, joints wander and stop, column rings are gone, verticals stay upright when looking up.
- Break lines: `hero`, `front`, `haloN` gables are lumpy and irregular; `c6m2-hero` confirms the
  geometry itself is eroded, not stacked boxes.
- Cast shadow on the gable is now a lobed mass with a few holes (`hero`, `front`, `haloN`,
  `treeW`).
- Telephoto: `thruarch` +1, `westwall` +1, `low` +1.

### A3. Where it did not get flatter

1. **Low walls, stubs and rubble** (`rubble`, `eaststub`, `wideclose`, `heapE`, `high`). These are
   still stacks of small rectangular slabs with a bright top and a dark side each. The per-heap
   lighting reached the loose rocks but not the low walls.
2. **Regular fine stairs on diagonal breaks** (`inside` right, `back` left, `westwall` right,
   `gableup` both slopes). The big breaks are eroded; the long diagonals still step in equal
   small increments.
3. **Rectangular teeth on pier edges** (`hero`, `haloN`, `low`, `rubble`, `longlens`). Quoin
   notches of equal size at equal spacing read as modelled blocks.
4. **Foreground prisms** (`hero` and `front` left slab with moss top, `low` centre block, `cross`
   arms): three exact face tones.
5. **Arch reveals** (`front`, `hero` left wing): dark inset slots showing true wall thickness.
6. **From above and straight up** (`high`, `above45`, `topfloor`, `upinside`, `colcap`): unchanged
   in kind.
7. **Close-range leftovers**: rectangular ghost patch (`nosewall`), see-through-looking slabs and
   moss disc (`floorslab`, `floorslab2`, `drum`, `down`).

### A4. Where flattening went too far (melted, not painted)

`refs/ac12.jpg` keeps firm drawing: ruled verticals, pilasters that stand clear of the wall,
cornices with a dark line under them, dark openings. Against that standard:

1. **Column capital** (`colcap`, `upinside`, `haloN`, `front`, `hero`). It is a dark lump with a
   faceted block perched on it. `c6m2-hero` and `c6m2-inside` show a clear cylinder with a capital
   standing in front of the gable; the painted frame loses it. A painter would draw an abacus
   line, a bell shape and one shadow under it.
2. **Column against wall** (`hero`, `front`, `nosecol`). In shadow the column and the wall share
   one tone and the edge between them is lost. This is a place where the edge must be found, not
   lost: a thin dark line on the shadow side or a paler strip on the lit side.
3. **Buttress corner** (`buttress`). Two faces of a pier merge into one grey mass. One tone per
   wall is right; one tone for two walls that meet at a corner is not.
4. **Rectangular tint patchwork** (`inside`, `gableup`, `thruarch`, `buttress`, `shadeN`). With the
   joints mostly removed, the remaining per-block tint rectangles read as translucent stickers
   rather than as stone variation.
5. **Chalky value range** (`rake`, `gableup`, `close`, `inside`). Lit stone and shadow stone are
   both pale; the darkest opening in `inside` is far lighter than the openings in `ac12`. Flat and
   pale together reads as unfinished.
6. **Ragged dark sawtooth band at wall bases** (`buttress`, `wallfoot`, `noserubble`). A contact
   shadow drawn as a torn black fringe.

Arches are still crisp where it matters (`eastside`, `treeW`, `inside`); that part is right.

### A5. Feature comparisons

| Feature | Compared | Verdict |
|---|---|---|
| `wobble` | default against `wobble=0`, crops of `hero` gable, `haloN` gable, `gableup` break (2x) and `inside` arch edge (4x) | **Right strength on broken edges, wrong on clean curves.** `hero`: the default outline is rounded and lumpy where `wobble=0` shows small rectangular notches; clearly visible now, worth about 0.5 F. `gableup`: step corners are rounded. `haloN`: small difference. `inside`: the default arch edge against the sky is a coarse un-antialiased pixel stair; with `wobble=0` the same curve is smooth. The displacement is not resampled, so it adds aliasing to edges a painter would draw cleanly. Keep the amplitude, antialias the lookup, and mask it off arches and straight arrises. |
| `tele` automatic | default against `tele=0` on `front`, `inside`, `thruarch`, `close`; measured pull and fov per view | **Right where it engages, too weak or absent elsewhere.** `thruarch`: pull 4.7 m, fov 40 -> 27.8; clearly flatter (about +1 F). `close`: pull 2.1 m, fov 36 -> 26; joints no longer fan from the corner (about +1 F). `inside`: pull 0.9 m, fov 40 -> 34; modest (+0.5 F). `front` at 19 m: pull 0.17 m, the two frames are the same picture. `hero` at 25 m: identical. `wideclose`: pull 0.09 m at fov 60, no effect; a clamp (nearby solid or eye height) cancels it. `c6t35-front` is still better than default `front` (mountains rise behind the gable, F 8 against 7.5). The falloff ends too early: it should still give about 0.25-0.3 at 20 m and reach zero near 40 m, and the clamp should not zero it for wide lenses. |

## Part B - quality re-score

### B1. Named views (C5 -> C6)

| View | C5 | C6 | Note |
|---|---|---|---|
| hero | 7.5 | 8 | Eroded breaks, lobed shadow; red drift with white and yellow dabs works here. |
| front | 7.5 | 7.5 | |
| inside | 6.5 | 7 | |
| westwall | 6.5 | 7 | |
| back | 6.5 | 7 | |
| high | 7 | **6.5** | Pink and orange blotches. |
| vista | 7 | 7 | |
| low | 7 | 7.5 | Mixed foreground flowers. |
| close | 5.5 | 6 | |
| down | 6 | 6 | See-through-looking drums and slabs persist. |
| tree | 8 | 8 | |
| frame | 8 | 8 | |
| under | 6.5 | 6.5 | |
| bush | 6.5 | 7 | Box is gone; flat painted wall. |
| rubble | 7 | 7 | |
| treeW | 8 | 8 | |
| path | 7.5 | 7.5 | |
| pathdown | 6.5 | 6.5 | |
| meadow | 6.5 | 6.5 | Pale ghost patch mid-field remains. |
| farN | 7 | 7 | |
| farNE | 7 | 7 | Red contour lines at the bottom edge. |
| farE | 6.5 | 6.5 | Same red contour lines. |
| farSE | 6.5 | 6.5 | Flat pink and orange stains. |
| farS | 6.5 | 6.5 | |
| farW | 7 | 7 | |
| farNW | 7.5 | 7.5 | |
| village | 6.5 | 6.5 | |
| castle | 6.5 | 6.5 | |
| hillN | 6 | 6 | |
| skyUp | 6.5 | 6.5 | Plank boughs. |
| leaf3m | 6 | 6.5 | |
| feet | 6.5 | 6.5 | |
| cross | 7 | 7 | |
| wallfoot | 6.5 | 6.5 | Sawtooth base band. |
| shadowT | 7.5 | **7** | Hard-edged red ribbon across the middle. |
| flowers | 7 | 7.5 | |
| sap | 7.5 | 7.5 | |
| out0 | 7 | 7 | |
| out90 | 7.5 | 7.5 | |
| out180 | 7.5 | 7.5 | |
| out270 | 7 | 7 | |
| doorout | 7 | 7 | |
| rim | 7 | 7.5 | Empty lime field fixed. |
| rimE | 7.5 | 7.5 | |
| southfar | 7 | **6.5** | Two flat pink blobs in the foreground, red ribbon behind. |
| pathback | 8 | 8 | |
| lookdown | 5.5 | 5.5 | |
| lookdownS | 6.5 | 6.5 | |
| lookdown2 | 6.5 | 6.5 | |
| topTree | 6 | **5.5** | Heat-map blotches. |
| topPath | 5 | **4.5** | Pink and yellow blobs like a weather radar. Worst named view. |
| shade | 7.5 | 7.5 | |
| shadeN | 6 | 6.5 | |
| haloN | 7.5 | 7.5 | |
| treeN | 7.5 | 7.5 | |
| lowN | 7 | 7 | |
| drift | 6 | **5.5** | Pink spill without dabs. |
| teleSE | 6 | 6 | |
| teleW | 5.5 | 5.5 | |
| mtN | 5.5 | 5.5 | |
| mtW | 5.5 | 5.5 | |
| shadowG | 7 | 7 | |

1080p: `hero` 8, `front` 7.5, `frame` 8, `inside` 7. Same scores as 720p. At 1080p the pier-edge
teeth, the tint patchwork and the stepped arch edge are easier to see; nothing new appears.

### B2. Custom cameras (C5 -> C6)

| View | C5 | C6 | Note |
|---|---|---|---|
| nosewall | 4 | 5.5 | |
| buttress | 5.5 | 5.5 | Flatter but merged. |
| graze | 6.5 | 6.5 | |
| northgraze | 6.5 | 7 | |
| gableup | 6 | 6.5 | |
| upinside | 5 | 5.5 | |
| archwest | 7.5 | 7.5 | |
| doorview | 7 | 7 | |
| floordown | 6 | 6 | |
| noserubble | 5 | 5.5 | Heap is two tones; rocks still faceted. |
| nosetrunk | 6.5 | 7 | |
| upcrown | 7 | 7 | |
| grasslow | 7.5 | 7.5 | |
| zenith | 5.5 | 6 | Sky clean; sparse cards. |
| rake | 7.5 | 7.5 | |
| colcap | 6 | 6 | Proud bars gone, capital melted: no net change. |
| drum | 5.5 | 5.5 | |
| crossnear | 6.5 | 6.5 | |
| heapE | 6.5 | 6.5 | |
| eaststub | 6.5 | 6.5 | |
| topfloor | 5.5 | **5** | Pink blotches. |
| nosegable | 7 | 7 | |
| pathnose | 7.5 | 7.5 | Flat red patches in the middle distance. |
| underSE | 5 | 5.5 | One bough plank and a smeared patch remain. |
| rimdown | 6 | 6 | Striped stretched leaf card upper right is still there. |
| stub1 | 6.5 | 6.5 | |
| stub2 | 6 | 6.5 | |
| floorslab | 5 | 5 | Translucent-looking slab over moss persists. |
| nosecol | 5 | 6 | |
| floorslab2 | 4 | 4 | Flat-polygon moss disc persists. |
| above45 | 6.5 | 6.5 | |
| thruarch | 7 | 7.5 | |
| longlens | 8 | **7.5** | Flat red band. |
| cornerNE | 6.5 | 6.5 | |
| wideclose | 6.5 | 6.5 | |
| eastside | 7 | 7.5 | |

### B3. Means over the same groupings

| Grouping | C4 | C5 | C6 |
|---|---|---|---|
| 17 views critique 2 scored numerically | 6.8 | 7.0 | **7.09** |
| 62 named views | 6.6 | 6.76 | **6.80** |
| 14 custom break-it cameras (C3 set) | 5.9 | 6.11 | **6.43** |
| 16 break-it cameras added in C4 | 5.8 | 6.0 | **6.09** |
| 31 chapel views of Part A (Q) | - | 6.55 | **6.76** |

34 of 62 named views are at 7 or above, 18 at 7.5 or above, five at 8 (`hero`, `pathback`, `tree`,
`treeW`, `frame`). Nothing reaches 8.5. The named mean barely moved because chapel gains (+0.5 on
six views) were offset by flower-drift losses on six others.

### B4. Regressions, explicitly

Views that were 7.5-8 in critique 5:

| View | C5 | C6 | |
|---|---|---|---|
| pathback | 8 | 8 | held |
| tree | 8 | 8 | held |
| treeW | 8 | 8 | held |
| frame | 8 | 8 | held |
| longlens | 8 | 7.5 | **regressed**: flat red band without dabs across the base |
| rimE | 7.5 | 7.5 | held |
| treeN | 7.5 | 7.5 | held |
| shadowT | 7.5 | 7 | **regressed**: hard-edged red ribbon with leaf icons stuck on it |
| sap | 7.5 | 7.5 | held (faint diagonal stripes in the crown, right) |
| out90 | 7.5 | 7.5 | held |
| farNW | 7.5 | 7.5 | held |
| haloN | 7.5 | 7.5 | held |
| rake | 7.5 | 7.5 | held |

Other regressions: `high` 7 -> 6.5, `southfar` 7 -> 6.5, `topTree` 6 -> 5.5, `topPath` 5 -> 4.5,
`drift` 6 -> 5.5, `topfloor` 5.5 -> 5. All six have the same cause: flower drifts seen from above
or far away.

Claimed fixes that the pictures do not confirm: the leaf-card smear is reduced but not gone
(`rimdown` upper right, `underSE` centre). The low cirrus is fine; the zenith is clean.

### B5. The red and pink drifts: flower mass or red carpet?

`refs/ac12.jpg` paints the field as thousands of small dabs in pink, orange, yellow and white,
mixed, in horizontal bands that merge with distance. There is no flat underlay and no patch
outline.

| View | Reads as | Why |
|---|---|---|
| `low`, `flowers`, `out180` | flower mass | Mixed hues, individual dabs, no visible underlay. Closest to `ac12`. |
| `hero`, `frame`, `out90` | flower mass, slightly loud | Red underlay but well covered by white and yellow dabs; feathered lower edge. Single hue family. |
| `rim`, `rimE` | flower mass, borderline | Large pink field with speckle; `rim`'s patch has a dome outline like a rug, the speckle rescues it. |
| `shadowT`, `longlens`, `southfar`, `pathnose` | red carpet | Flat fill, hard edge, few or no dabs at 15-40 m. |
| `high`, `above45`, `topPath`, `topTree`, `drift`, `farSE`, `farNE`, `farE` | spilled paint | From above or beyond 40 m only the underlay colour is left; drift edges show as red contour lines. |

So: right within about 15 m at eye level, carpet at mid distance, stains from above and far away.

## Part C - top 10 remaining gaps, ranked

1. **Firm drawing of the column, capital and corners (undo the over-flattening).**
   Where: `colcap`, `upinside`, `haloN`, `front`, `hero`, `nosecol`, `buttress`.
   Painter: a column is a clean strip that stands clear of the wall, with an abacus line, a bell
   and one shadow under it; a pier corner is a firm vertical with a tone change across it.
   Technique: `src/ruin.js` + `src/build.js`: give the capital a simple readable profile (abacus
   slab, bell, necking ring) and remove the perched block. `src/stone.js`: per-wall tone must
   differ across a convex corner (offset the tone by plane id, about 0.06 in value) and the column
   gets its own tone, a step lighter than the wall behind it. `src/pipeline.js`: exempt
   column-against-wall and convex-corner edges from lost-edge blending; draw them as a thin dark
   line on the shadow side.

2. **Flower drifts as dabs at every distance, mixed hues.**
   Where: `shadowT`, `longlens`, `southfar`, `high`, `topPath`, `topTree`, `drift`, `farSE`.
   Painter: the field is dabs all the way back, smaller and paler with distance, in mixed pink,
   orange, yellow and white; never a filled shape with an outline.
   Technique: `src/terrain.js`: drop the flat underlay tint; threshold the drift mask with
   `brushStable` dabs at constant screen size so coverage thins at the edges, mix three hues by a
   second noise, and desaturate toward the meadow colour with distance and with downward view
   angle. `src/extra/grass.js`: extend flower cards as far-LOD dabs to about 60 m so the mid
   distance has marks.

3. **Low walls, stubs and slab stacks as one shape.**
   Where: `rubble`, `eaststub`, `wideclose`, `heapE`, `high`, `hero` left slab, `low` centre block.
   Painter: a broken low wall is one light shape and one shadow shape with a ragged top line.
   Technique: `src/ruin.js` + `src/build.js`: build low walls with the same eroded-polyline cap
   as the gable instead of slab stairs. `src/stone.js`: apply the per-wall lighting to them (top
   faces take the wall's lit tone on about a third of their area only). `src/extra/props.js`:
   round the rock facets and drop the pale facet outlines.

4. **Value range and weathering toward `ac12`.**
   Where: `rake`, `gableup`, `inside`, `close`, `front`.
   Painter: pale lit stone against clearly darker openings; grime streaks, a dark damp band at
   the base, ochre and green stains over whole wall regions.
   Technique: `src/stone.js`: darken reveals and openings by about 0.12 in value, add 2-5 m stain
   fields and a soft moss band at the base (replacing the torn sawtooth fringe), and replace
   per-block tint rectangles with brush-shaped patches that ignore block bounds.

5. **Irregular diagonals and pier edges.**
   Where: `inside`, `back`, `westwall`, `gableup`, `hero`, `haloN`, `low`.
   Painter: a long broken slope has two or three big bites and long plain runs; a pier edge has
   one or two chips, not a row of teeth.
   Technique: `src/ruin.js` + `src/build.js`: run the eroded polyline along diagonals with step
   length varying 1:6; remove quoin notches on about 80% of pier edges and vary the rest.

6. **Wobble without aliasing.**
   Where: `inside`, `back`, `front` arch edges.
   Painter: an arch is one clean confident curve.
   Technique: `src/pipeline.js`: sample the displaced colour bilinearly and blend across the
   edge; scale the wobble by an "irregular edge" flag so it is near zero on arches and straight
   arrises and full on breaks.

7. **Telephoto falloff and clamp.**
   Where: `front`, `hero`, `wideclose`.
   Painter: draws the building with a long lens from any standing point.
   Technique: `src/main.js`: change the automatic curve to about 0.5 inside 8 m, 0.3 at 20 m,
   zero at 40 m; scale the pull with fov so wide lenses get more; relax the solid-distance clamp
   when the obstacle is behind the viewer.

8. **Arch reveals and views from above.**
   Where: `front`, `hero`, `high`, `above45`, `topfloor`.
   Painter: an opening is a flat dark shape with one lighter edge; nobody paints a ruin in plan.
   Technique: `src/stone.js`: shade the reveal with the opening's tone except a thin lit strip.
   `src/main.js`: resist pitch below about -40 degrees. `src/ruin.js`: thin the wall tops.

9. **Close-range leftovers.**
   Where: `nosewall`, `floorslab`, `floorslab2`, `drum`, `down`, `graze`.
   Painter: opaque dabs, no see-through layers, no ruled cracks.
   Technique: `src/stone.js`: make the pale overlay opaque dabs or remove it under 3 m; bend the
   ruled crack. `src/extra/props.js`: replace the flat moss disc with brush-thresholded moss.

10. **Tree leftovers.**
    Where: `rimdown`, `underSE`, `skyUp`, `frame`, `longlens`, `sap`.
    Painter: boughs taper and disappear into foliage; no stripes in a crown.
    Technique: `src/extra/tree.js`: clamp card stretch at grazing view angles, taper and hide
    bough ends inside leaf clusters, remove the pale cross patch at the fork.

Not ranked because unchanged from critique 5 and outside this round's scope: far mountains and
hill treatment (`mtN`, `mtW`, `teleW`, `hillN`; `src/extra/far.js`) remain at 5.5-6. `src/sky.js`
needs nothing this round.

## Verdict

- **Does the chapel now read as flat / painted?** Mostly yes. From 10 m outward, from inside the
  nave and looking up at the gable it reads as painted shapes (F 7-8); the owner's note no longer
  applies to those views. It still reads as a model at the low walls and rubble, in wide close
  shots with a slab stack in front, and from above (F 5.5-6.5). And it has overshot in a few
  places: capital, column-wall edge and buttress corner are now too soft. The next step for the
  chapel is firmer drawing and stronger values, not more flattening.
- **Does the general level match TV-anime background quality?** Close in the best third, not
  overall. Five views at 8 and eighteen at 7.5 or above would pass a casual viewer. None would
  pass beside `refs/ac12.jpg` or `refs/ac13.jpg` (nothing at 8.5). The gap is firmness and value
  range on the stone, and a flower field that holds up at every distance.
- Best: `hero`, `pathback`, `tree`, `treeW`, `frame` (8). Worst: `floorslab2` (4), `topPath` (4.5).

## Appendix - cameras

All custom cameras are critique 5's (its appendix plus `tools/gshot.mjs`, critique 4's appendix
and critique 3's `upcrown`, `grasslow`, `nosetrunk`, `zenith`), rendered with
`node tools/dbg.mjs c6x name:pos:look:fov ...`; toggles with `--q="wobble=0"` etc. Measured
automatic telephoto (pull in metres, resulting fov): inside 0.90 / 34.3, close 2.13 / 26.1, front
0.17 / 31.7, westwall 1.20 / 30.1, low 2.46 / 31.3, back 0 / 32, wideclose 0.09 / 59.5, thruarch
4.68 / 27.8, buttress 3.44 / 32.0, graze 0 / 40, colcap 0.57 / 25.4.
