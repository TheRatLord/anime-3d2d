# Critique 10 (flatness pass) — independent art-critic review

Same method as critique 9: 31 chapel views (F and Q), 62 named views (Q), 36 custom cameras (Q, coordinates from the critique-8 appendix). Rendered in the isolated copy `.work/crit10` (`node tools/shot.mjs c10 …`, `node tools/dbg.mjs c10x …`), 720p, plus 1080p of hero/front/frame/inside/rimE. Every scored image was opened, most as a c9-over-c10 pair. No shader errors, same single 404 as before. Frame time 6.51 ms at 720p (c9: 6.86 ms). Nothing in `src/` was touched.

Scales: Q 8 = passes as a paused Frieren background for a non-expert, 9 = passes beside ac12/ac13. F 10 = painted on one sheet, 5 = nicely toon-shaded model.

## 0. Verdict on the claimed changes

| claim | verdict | evidence |
|---|---|---|
| Shadow stone one violet-grey per depth plane, camouflage gone | Landed | hero, inside, close, archwest, thruarch, shadeN. Side effect: shadow side is greyer and duller than c9's warm mauve. |
| Tone-plane boundaries brushed contours, blocky steps gone | Mostly landed | HD hero crop: pier edges are soft brushed. Residual rectangular notches on westwall (far arch remnant, left pier top); drip marks in back end square. |
| Column one shaft, drawn joints, wavering terminator, capital one rounded mass | Shaft landed, capital not | inside, nosecol good. Capital is one mass but reads as a clay lump / dark mushroom (front, haloN, upinside, colcap); from above a dark square (topfloor). |
| East wall three unequal drops with upright fragment | Landed at distance, fails close | eastside, thruarch, rimE good. rubble/eaststub: low dark-brown box with a pale L-shaped bracket on it. |
| Tops toned as sides, no lids, no pale thickness band | Mostly landed | hero stub, front stump, crossnear. Cream chips remain: haloN west wall top, low and doorview pier tops. |
| Foot band softens within 4 m | Landed, overshot | nosewall is now an empty panel. |
| Plinth/joints as broken strokes | Partly | buttress plinth line still one constant height; graze still shows thin ruled L-lines. |
| Rocks rounded two-tone blobs | Landed, wrong result | Rounded and two-tone, but tan/ochre potatoes or bread loaves (heapE, noserubble, rubble), not masonry and not the ruin's colour. |
| Slabs thin | Landed | down, topfloor. |
| Mountains pointed crests, facet wedges, flat haze bands | Crests and haze landed, wedges backfire | mtN/mtW much better (pale rectangles gone). In vista, path, pathnose, farSE, out0, village, teleSE the wedges are near-identical triangles: a row of tents. |
| Hills/woods repainted procedurally | Barely visible | hillN, village, farN look like c9. |
| Tree limbs curved, tapered, two-tone | Landed | tree, treeN, under, longlens. cornerNE boughs read as bent pipe, stub1 as a banana, upcrown has one thin curled vine. |

Too empty? Yes in two places: nosewall (plain mauve panel with a smooth diagonal airbrush gradient) and the drum/low dark blocks (drum, wideclose, floorslab). Shadow walls at mid distance (close, shade, archwest) are not too empty.

## 1. Per-view scores

### 1a. Chapel views (31): F and Q

| view | F c9 | F c10 | Q c9 | Q c10 | why |
|---|---|---|---|---|---|
| hero | 8 | 8.5 (+0.5) | 8.5 | 8.5 (=) | Shadow arcade is one violet-grey plane, pier tone edges brushed (HD crop), left stub has no lid. Shadow side greyer and duller than c9's warm mauve; foreground block still a box. |
| front | 8 | 8.5 (+0.5) | 8.5 | 8.5 (=) | Stump lid gone, boulders rounded. Capital is now a dark lumpy blob against the lit gable. |
| frame | 8 | 8 (=) | 8 | 8 (=) | Chapel unified. Mountain behind the gable shows large low-poly facets. |
| inside | 7 | 8 (+1.0) | 7.5 | 8 (+0.5) | Column is one shaft with a wavering terminator, camouflage gone. Terminator slightly melted-candle; tomb is still a box. |
| westwall | 7 | 7.5 (+0.5) | 7.5 | 7.5 (=) | Limb curved. Rectangular stair-step notches survive on the far arch remnant and left pier top. |
| back | 7.5 | 8 (+0.5) | 8 | 8 (=) | Unified shadow planes. Drip marks end in squared-off tips. |
| close | 7 | 7.5 (+0.5) | 7 | 7.5 (+0.5) | Camouflage gone, two soft tone patches plus streaks; not too empty at this distance. |
| rubble | 6.5 | 7 (+0.5) | 7 | 7 (=) | East low wall is a dark-brown box with a pale L-shaped bracket; rocks are small tan potatoes. |
| high | 6.5 | 7 (+0.5) | 7 | 7 (=) | Wall tops toned as sides, still reads as a diorama from above. |
| haloN | 8 | 8 (=) | 8 | 8 (=) | Capital a dark blob; cream sliver still on the left wall top. |
| low | 7.5 | 8 (+0.5) | 8 | 8.5 (+0.5) | Clearly better, unified shadow. Cream chip on right pier top. |
| nosewall | 6.5 | 7.5 (+1.0) | 5 | 5.5 (+0.5) | Stencil gone, flat. But TOO EMPTY: plain mauve panel, about four tiny strokes, visible smooth diagonal airbrush gradient. |
| graze | 6.5 | 7 (+0.5) | 7 | 7 (=) | Joint rectangles reduced; thin ruled straight L-lines remain, drips blurry. |
| upinside | 6 | 6.5 (+0.5) | 6 | 6.5 (+0.5) | Capital is a lumpy boulder on a tube. |
| northgraze | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Unified wall, soft contours. |
| gableup | 8 | 8 (=) | 7.5 | 7.5 (=) | Unchanged. |
| archwest | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Slot and camouflage gone. |
| doorview | 7 | 7.5 (+0.5) | 7.5 | 7.5 (=) | Box-with-lid gone. Cream chip on pier top, flat dark-brown box bottom-left, tent-row mountains. |
| buttress | 6.5 | 7 (+0.5) | 7 | 7.5 (+0.5) | Camouflage much reduced. Four ruled facets and a plinth line at one constant height remain. |
| rake | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Same as c9. |
| colcap | 6 | 7 (+1.0) | 6.5 | 7 (+0.5) | Wedge gone; capital is a clay lump / mushroom. |
| topfloor | 5 | 5.5 (+0.5) | 5.5 | 6 (+0.5) | Slabs flat and thin; capital from above is a dark square; still a floor plan. |
| above45 | 6.5 | 7 (+0.5) | 7 | 7.5 (+0.5) | Tops toned; less model-like, still a model. |
| thruarch | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Camouflage gone, east wall drops read. Pier has a ruled dark rectangular inset panel; cream sun patch reads as a sticker. |
| longlens | 8 | 8.5 (+0.5) | 8 | 8 (=) | Bough curved, pier edges soft. Walls a bit mushy and low-contrast. |
| cornerNE | 7 | 7 (=) | 7 | 7 (=) | Thick boughs form a bent-pipe U. |
| wideclose | 6 | 6.5 (+0.5) | 7 | 7 (=) | Foreground dark slab with white zigzag crack line; brown box with a groove notch. |
| eastside | 7.5 | 8 (+0.5) | 8 | 8.5 (+0.5) | East wall fall is an irregular broken wall; shadow unified. |
| nosecol | 6.5 | 7.5 (+1.0) | 6.5 | 7.5 (+1.0) | One shaft, drawn joints, no stacked drums. |
| heapE | 6.5 | 7 (+0.5) | 7 | 7.5 (+0.5) | Rocks rounded two-tone, but ochre loaves whose colour does not belong to the grey ruin. |
| eaststub | 6.5 | 7 (+0.5) | 7 | 7 (=) | Pier edges soft. Pale L-bracket on low wall, drum with white zigzag. |

### 1b. Remaining named views (Q only)

| view | Q c9 | Q c10 | why |
|---|---|---|---|
| vista | 7 | 7 (=) | Dark cylinder drum in foreground; mountains a row of tents. |
| down | 6.5 | 7 (+0.5) | Slabs thinner, less tiled. |
| tree | 8 | 8 (=) | Limbs curved and tapered. |
| under | 7 | 7.5 (+0.5) | Limbs two-tone and curved. |
| bush | 7 | 7 (=) | Plain brown panel with cream sun-patch stickers. |
| treeW | 8 | 8 (=) | Same. |
| path | 8 | 8 (=) | Same; mountain wedges repeat. |
| pathdown | 7 | 7 (=) | Same. |
| meadow | 7.5 | 7.5 (=) | Same. |
| farN | 7.5 | 7.5 (=) | Same. |
| farNE | 7 | 7 (=) | Same. |
| farE | 6.5 | 6.5 (=) | Same. |
| farSE | 7 | 7 (=) | Pointed crests, repeated wedges. |
| farS | 6.5 | 6.5 (=) | Same. |
| farW | 7 | 7 (=) | Same. |
| farNW | 7.5 | 7.5 (=) | Same. |
| village | 6.5 | 6.5 (=) | Repeated mountain wedges behind; little change in woods. |
| castle | 6.5 | 7 (+0.5) | Crest pointed, haze band flat. |
| hillN | 6.5 | 7 (+0.5) | Limbs better, hill paint barely changed. |
| skyUp | 7 | 7 (=) | Same. |
| leaf3m | 7 | 7 (=) | Same. |
| feet | 7.5 | 7.5 (=) | Same. |
| cross | 8 | 8 (=) | Same. |
| wallfoot | 7 | 7 (=) | Plain pier plus cream sun stickers. |
| shadowT | 7.5 | 7.5 (=) | Same. |
| flowers | 8 | 8 (=) | Same. |
| sap | 7.5 | 7.5 (=) | Same. |
| out0 | 7 | 7 (=) | Tent-row wedges. |
| out90 | 7.5 | 7.5 (=) | Same. |
| out180 | 8 | 8 (=) | Same. |
| out270 | 7.5 | 7.5 (=) | Same. |
| doorout | 7 | 7 (=) | Same. |
| rim | 8 | 8 (=) | Chapel unified but greyer; mountains pointed with facets. |
| rimE | 7.5 | 8 (+0.5) | Unified chapel, irregular east wall. |
| southfar | 7.5 | 7.5 (=) | Same; flat haze band works. |
| pathback | 8.5 | 8.5 (=) | Still the best frame; mountain crest pointed. |
| lookdown | 6 | 6 (=) | Unchanged ground. |
| lookdownS | 6.5 | 6.5 (=) | Unchanged. |
| lookdown2 | 6.5 | 6.5 (=) | Unchanged. |
| topTree | 6 | 6 (=) | Unchanged; limb seen from above is a boomerang. |
| topPath | 5.5 | 5.5 (=) | Unchanged. |
| shade | 7.5 | 7.5 (=) | Same. |
| shadeN | 6.5 | 7 (+0.5) | Box gone, less camouflage. |
| treeN | 7.5 | 8 (+0.5) | Fork is now curved. |
| lowN | 7 | 7 (=) | Same. |
| drift | 6 | 6 (=) | Same. |
| teleSE | 6.5 | 6.5 (=) | Tent wedges at long lens. |
| teleW | 5.5 | 5.5 (=) | Same. |
| mtN | 5.5 | 6.5 (+1.0) | Rectangular pale patches gone, pointed crests. |
| mtW | 5.5 | 6.5 (+1.0) | Same improvement; facets still polygonal. |
| shadowG | 7.5 | 7.5 (=) | Same. |

### 1c. Remaining custom cameras (Q only)

| view | Q c9 | Q c10 | why |
|---|---|---|---|
| floordown | 6.5 | 6.5 (=) | Cream splat sticker on slab. |
| noserubble | 6.5 | 6.5 (=) | Bread-loaf rocks. |
| nosetrunk | 7 | 7 (=) | Same. |
| upcrown | 7 | 7 (=) | Limbs curved like horns; one thin curled vine-like limb. |
| grasslow | 8 | 8 (=) | Same. |
| zenith | 6 | 6.5 (+0.5) | Limbs taper. |
| drum | 6 | 5.5 (-0.5) | REGRESSION: flat blank dark-brown box, no drawing on it. |
| crossnear | 8 | 8 (=) | Stump behind has no lid now. |
| nosegable | 7.5 | 7.5 (=) | Same. |
| pathnose | 7.5 | 7 (-0.5) | REGRESSION: horizon is now a row of small identical pyramids. |
| underSE | 6 | 6.5 (+0.5) | Limb tapers to a twig. |
| rimdown | 6.5 | 6.5 (=) | Same. |
| stub1 | 7 | 7 (=) | Bough is a smooth banana. |
| stub2 | 7 | 7 (=) | Same. |
| floorslab | 6.5 | 6 (-0.5) | Dark slabs blank, one is a lumpy rounded rectangle; less drawn than c9. |
| floorslab2 | 5 | 5 (=) | Drum top still a faceted polygon disc on blank slabs. |

## 2. Means

| set | c9 | c10 | delta |
|---|---|---|---|
| chapel F (31) | 7.00 | 7.48 | +0.48 |
| chapel Q (31) | 7.24 | 7.50 | +0.26 |
| named Q (62) | 7.15 | 7.26 | +0.11 |
| custom Q (36) | 6.88 | 7.04 | +0.17 |

All four c9 means recompute to the published values from the per-view tables, so the comparison is like for like. The gain is real but concentrated in the chapel flatness score; the landscape sets hardly moved. No view reaches 9.

## 3. What still makes the scene read as 3D/CG (ranked, chapel first)

1. **Capital and column head are a sculpted lump.** Views: front, haloN, upinside, colcap, topfloor, inside. The eye catches a dark mushroom/boulder on a tube, silhouetted against the lit gable. Fix: do not model a blob. Make the capital a short flared profile (2 rings: necking and abacus) with the same tone as the shaft, and draw it with two broken dark strokes under the abacus. Force its shadow tone to the shaft's shadow tone so it never goes darker than the shaft; from above give it the wall-top tone, not a dark square.
2. **Blank dark boxes: drum, tomb, east low wall, foreground blocks.** Views: drum, wideclose, rubble, eaststub, doorview, hero, inside, floorslab. Flat single-colour box with ruled edges, plus a pale L-shaped bracket on the east low wall and a white zigzag crack on the dark drum/slab. Fix: remove the L-bracket and zigzag (they look like UV/decals, not paint); give these blocks the same treatment as the walls: two soft tone patches in object space, 3-5 short broken joint strokes, chipped (noise-displaced) silhouette edges, and a grass-overlap fringe at the foot. Never let one face be a single untextured value closer than 6 m.
3. **Empty near wall with airbrush gradient.** View: nosewall (also wallfoot, bush). A smooth diagonal gradient across a plain panel is a shader, not a brush. Fix: quantise the bounce gradient into 2-3 flat steps with brushed (noise-thresholded) boundaries; within 4 m fade in a near-detail layer instead of fading everything out: 6-10 irregular block outlines drawn as broken strokes at varying sizes, a few dry-brush streaks, one moss patch. Target is the density of ac12's wall, not zero.
4. **Rubble rocks are the wrong object and the wrong colour.** Views: heapE, noserubble, rubble, floordown. Tan potatoes on a grey-violet ruin. Fix: take the rock palette from the wall palette (lit cream-grey, shadow violet-grey), mix 60% angular broken blocks (bevelled boxes with one chipped corner) with 40% rounded ones, vary size 1:4, half-bury them, and overlap grass tufts on the base.
5. **Ruled straight lines and constant-height bands on the stone.** Views: graze, buttress, thruarch (rectangular inset tone panel), westwall (stair-step notches), back (square drip ends). Fix: perturb every joint/plinth line with low-frequency noise in both position and thickness, break it with a 40-60% duty mask, let the plinth height wander by 10-15 cm along the wall; taper drips to a point with a width falloff; replace the rectangular inset on the pier with the same brushed-threshold patch used on the arcade.
6. **Cream sun patches and cream chips read as stickers.** Views: thruarch, bush, wallfoot, floordown, haloN, low, doorview. Hard-edged cream on violet at full contrast with no intermediate tone. Fix: add a thin warm half-tone rim (one step between shadow and lit) around sun patches, break their edge with leaf-shaped dapple, and clamp wall-top fragments under 0.1 m² of screen-visible area to the side tone.
7. **Mountain facet wedges repeat.** Views: vista, path, pathnose, farSE, out0, village, teleSE, frame, doorview. Fix: vary peak spacing, height and wedge width by a low-frequency noise, limit to 3-5 dominant peaks per range with long saddles between, give each wedge one lit and one shadow side only, and soften wedge edges with the same brushed threshold; no facet larger than about 1/6 of a peak.
8. **Top-down and high views are still a model.** Views: topfloor, high, above45, topPath, topTree, lookdown*, floorslab2. Unchanged since c9 apart from slab thickness. Fix: from above, blend grass over slab edges, break the slab grid by removing/rotating a third of slabs, add painted cast-shadow shapes, and round the drum top (more segments or alpha-cut disc).
9. **Boughs as pipes.** Views: cornerNE, stub1, upcrown, topTree. Uniform-radius curve. Fix: irregular radius along the limb (knots), a kink per limb rather than one constant arc, shorter segments before a fork.
10. **Shadow stone lost warmth.** Views: hero, rim, low. Grey-violet against warm cream reads slightly dead beside ac12. Fix: shift shadow hue 5-8 degrees toward mauve and lift saturation slightly near the ground bounce.

## 4. Regressions versus critique 9

- drum 6 to 5.5: flat blank dark-brown box.
- pathnose 7.5 to 7: horizon became a row of small identical pyramids.
- floorslab 6.5 to 6: dark slabs blank, one lumpy rounded slab.
- nosewall: flatter (F 6.5 to 7.5) but empty, with a smooth airbrush gradient; Q only 5.5.
- New artefacts: pale L-shaped bracket on the east low wall (rubble, eaststub); white zigzag crack line on dark drum/slab (wideclose, eaststub); cream sun-patch stickers more exposed now the camouflage is gone (bush, wallfoot, thruarch, floordown).
- Capital reads as a dark blob against the lit gable (front, haloN); it was a wedge before, now it is a lump. Not better, just different.
- Tent-row mountain wedges in mid-distance views (vista, path, farSE, out0, village, teleSE); scores held only because the crests improved.
- Shadow stone is greyer and less warm than c9 (hero, rim).
- Rock colour is now tan/ochre and mismatched to the ruin.
- gableup Q unchanged at 7.5; no chapel view lost points on F.

## 5. Closest to and furthest from a real Frieren background

Closest:

1. **pathback (Q 8.5).** Separates it from 9.5: ground is still even in density (ac13 masses flowers into bands with empty rests); tree crowns lack one large shadow mass with a clean light rim; mountain facets are polygonal; no paper/gouache grain variation between planes.
2. **eastside (Q 8.5, F 8).** Separates it from 9.5: stone has two tones where ac12 has four or five (warm stain, cool stain, moss green at ledges, dark weep under sills); no drawn masonry courses with varying block size; wall base meets grass on a straight line with no rubble/grass overlap; silhouette of the break is smooth, not chipped.
3. **low / hero / front (Q 8.5).** Separates them from 9.5: no architectural articulation (ac12 has string courses, offset buttress steps, window reveals drawn with a fine dark line and a light edge); shadow side is one dull grey-violet without reflected sky-blue above and warm bounce below as distinct brushed zones; the foreground block and capital are primitives; flower field lacks ac12's dense saturated foreground band fading to pale horizon.

Furthest:

1. **floorslab2 (5).** Faceted disc on blank slabs.
2. **nosewall / drum / topPath / teleW (5.5).** Empty panel; blank box; plan view; long-lens flat woods.
3. **topfloor (Q 6, F 5.5).** Floor plan with a dark square capital.
