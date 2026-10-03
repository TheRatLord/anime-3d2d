# Critique 13 (flatness pass) — independent art-critic review

Same method as critique 12: 31 chapel views (F and Q), 62 named views (Q), 36 custom cameras (Q, critique-8 appendix coordinates). Fresh copy `.work/crit13`. Stills rendered deterministic with `?wind=0&cshadow=0` (`node tools/shot.mjs c13 all --q="wind=0&cshadow=0"`; `dbg.mjs` with the same `--q`; no tool edit needed, both scripts pass `--q` through). Every scored image was opened as a c12-over-c13 pair (`.work/crit13/pairs/`), with crops in `.work/crit13/crops/`. Separately, hero, front, frame, low, tree, out90, pathback and rimE were rendered with defaults (`c13d-*`), and high, rim and out270 at t=3 and t=9 with defaults (`crops/wind2-*.jpg`). All 98 scored pairs were seen. No shader errors; same single 404. Nothing in `src/` touched.

Frame time, hero 720p: 6.63 ms with wind/cloud shadows off; 5.5–6.0 ms on other views with defaults (c12 measured 7.27 ms on hero). Console: 70 938 flowers in 13 838 clusters (c12: 63 819), 49 506 tufts, 79 weed clumps (c12: 98).

Scales unchanged: Q 8 = passes as a paused Frieren background for a non-expert, 9 = passes beside ac12/ac13. F 10 = painted on one sheet, 5 = nicely toon-shaded model.

Summary: a round of trading defects. The flowers came back and the hand-over rugs dissolved, which is the gain. The chapel did not move: the lifted shade made walls calmer but chalkier, the new coursing reads as a mosaic of flat tint rectangles, and the loose stones gained facets rather than losing them. The woods swapped leopard skin for airbrushed gradients. No view reaches Q 9.

## 0. Verdict on the claimed changes

| claim | verdict | evidence |
|---|---|---|
| Sky: cyan wash, painted cumulus cards, none behind the chapel | Landed (not re-scored in detail) | farNE, farE, treeW, northgraze, underSE: the cards read painted. The wash is now a deeper, flatter cyan from top to near-horizon in most frames; the white horizon band is narrower than ac12/ac13. |
| Drifts restored round chapel and path | Landed | hero, low, pathback, path, feet, frame, shade, nosegable. Not in front (thin fringe only). |
| Standing-bloom fringe on distant drifts, no alpha fade | Landed | rim, out270, doorout, out180 (ghost blobs gone). southfar and farSE still show flat speckle ovals at long range. |
| Flowers in shadow tinted violet-grey | Partly | lookdown2: khaki gone. shadowT: drift crossing the shadow is still ochre/mustard dots (dead leaves). |
| Pads need ≥3 blooms | Landed | path, hero, cross: empty and single-bloom pads gone. |
| Wind and drifting cloud shadows | See ruling (f) | |
| Per-block tints and readable coursing; arris highlights; rust under ledges | Landed as tint tiles | gableup, haloN, front, inside: the lit gable is a patchwork of flat axis-aligned rectangles with no joint lines; arris highlights are faint; rust barely visible. |
| Lifted shade values | Landed | Shade side is now pale grey-lavender in every chapel view; see ruling (b). |
| Capital/shaft wobbled, tilted, bitten | Partly | inside, colcap, upinside: shaft outline irregular, but upinside shows a straight polygon facet down the shaft silhouette and the capital is still a symmetric flare. |
| Loose stones displaced, corner-clipped, chipped; drums squashed and sunk | Failed for the near stones | noserubble, wideclose, hero, low, front: corner clipping produced more planar faces and straight arrises; they read as low-poly boulders. drum: squashed and sunk but still a rounded cuboid. |
| Zone masks in wall coordinates, spill past pilasters | Partly | archwest: the patch crosses the pilaster. buttress: a warm band exactly fills one face between two arrises. close and nosewall keep ruled edges. |
| Weeps as one curtain per ledge | Landed | westwall, graze, treeN: bar-code dabs gone. |
| Paving as turf-discarding mesh, slab merge from ~25° | Partly | floordown, floorslab, floorslab2: ghost quads gone. high, above45, down: the nave paving is still a grid of violet tiles. |
| Woods as one mass, interior shapes, soft foot, lit clusters only on top | Half | Lit clusters on the top contour landed (mtN, lowN, farN, mtW). The interior shapes and the soft foot are airbrushed gradients (lowN, mtW, farW, farNW, teleW). |
| Crowns: side sky holes, sunward lights, more leaf values | Partly | sap, tree, pathback good. From below (zenith, upcrown, underSE) the pale lights disappeared. |
| Trunk light/shade flanks, warmer bark | Overshot | westwall, shade, nosetrunk, shadowG: the lit flank is saturated golden ochre with a straight vertical terminator, the warmest mass in several frames. ac13's trunk is grey-olive. |
| Far bushes as clumps | Landed | farS, castle, out0. |

### Rulings

**(a) Coursing/tints bring back camouflage or ruled lines? Yes, in a new form.** gableup crop (`crops/gableup.png`): the lit gable is a patchwork of 20–40 flat rectangles in cream, buff, grey and pale olive, all axis-aligned, edges dead straight, no joint lines and no pale top edge. It reads as a tiled texture or as camouflage made of rectangles, not drawn masonry. Same in haloN, front, inside (top right), rake, stub2 and the hero gable at closer range. ac12 draws courses as dark broken joint lines over a nearly uniform base, with hue variation from stains rather than per-block fills. At hero distance the tiles blend and read acceptably; at gableup, haloN and front they are the most CG thing on the chapel. Also ruled: buttress (warm band between two arrises), close (vertical zone edge), nosewall (diagonal strip).

**(b) Lifted shade: flatter, and duller.** The shade/lit relation is now right by the numbers and closer to ac12. But the shade side has lost its warm/cool zones (the warm bounce patch is faint or gone in inside, eastside, back, nosewall, nosecol), so whole walls are one chalky grey-lavender: inside, back and eastside read as a single flat paint swatch. ac12's shade faces keep coursing, rust stains and a cooler top / warmer foot. Flatter in the F sense, less painted in the Q sense; the scores cancel.

**(c) Flowers vs ac12: hero, low, pathback yes on density; front no; all no on mark quality.** hero, low and pathback now have mixed drifts at the chapel foot and along the path at roughly ac12's coverage near the camera. front still has only a fringe of a few blooms along the bottom edge. Everywhere the marks are an even sprinkle of near-identical round dots at uniform spacing. ac12 has big blooms in front shrinking to streaks, dense masses alternating with rests, and grass strokes between them. cross and crossnear now have flowers spread evenly over the whole lawn; rimE lost its swelling mass to a thinner speckle.

**(d) Woods (teleW, mtW, lowN, mtN): leopard gone, cut-out partly; new airbrush.** mtN (7 to 7.5) and lowN now carry lit dabs only on the top contour, which is correct. But the bodies are one flat mass with big soft airbrushed interior shapes and a fog-gradient foot (lowN, mtW, teleW, farW, farNW, castle mid wood). That smooth gradient is a CG tell of its own. Paint would use two or three hard-edged flat interior shapes. teleW is still a flat green field over 40% of the frame (6).

**(e) Cream foreground block and close rubble: still primitives, and noserubble got worse.** The hero/low/front cream blocks are faceted lumps with broad planar faces. In noserubble (7.5 to 7) and wideclose the corner clipping produced more straight arrises and planar facets: low-poly boulders, not chipped stone. The drum-view block is a squashed rounded cuboid with a green band.

**(f) Wind and cloud shadows: neutral in stills, one tell.** Between t=3 and t=9 with defaults, 3–6% of pixels change (high, rim, out270): grass and blooms lean slightly, nothing pops or swims in the frames I compared. Motion itself was not watched at 12 fps here, so no ruling on swim. The cloud shadows are very faint in every view (high: a cool veil top left; rim: a slight darkening across the distant trees) and have soft airbrushed edges. A painted cloud shadow in the boards has a firm, irregular edge like the tree shadows do; a soft gradient veil reads as a lighting effect. At current strength it is nearly invisible, so it neither helps nor hurts much. Give it a firm brushed edge or leave it off.

## 1. Per-view scores

### 1a. Chapel views (31): F and Q

| view | F c12 | F c13 | Q c12 | Q c13 | why |
|---|---|---|---|---|---|
| hero | 9 | 9 (=) | 8.5 | 8.5 (=) | Drifts restored round the chapel and path, mixed hues; shade lifted to ac12-like value; gable coursing legible. Blooms are an even sprinkle of identical round dots; cream block still a faceted lump. |
| front | 9 | 9 (=) | 8.5 | 8.5 (=) | Shade side lifted, gable coursing visible as small tint rectangles. Flowers only a thin fringe on the bottom edge, still far from ac12; right blocks still planar lumps. |
| frame | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | Drifts back at the chapel foot and right foreground; crown lights good. Even sprinkle. |
| inside | 9 | 9 (=) | 8.5 | 8.5 (=) | Shade lifted to grey-lavender, shaft wobbled. Walls now greyer and duller; gable tints read as rectangles at top right. |
| westwall | 8 | 8 (=) | 8 | 8 (=) | Bar-code weeps reduced, shade lifted. Trunk lit flank now saturated golden ochre, the warmest thing in frame. |
| back | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | One pale lavender body with weep curtains; flatter but chalky and monotone. |
| close | 8 | 8 (=) | 8 | 8 (=) | Calmer, moss swatch gone; now bland, ruled vertical boundary at the pier edge remains. |
| rubble | 8 | 8 (=) | 8 | 8 (=) | More mixed blooms; wall blotches gone. Wood behind is a flat dark mass. |
| high | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Drifts read again as soft stains; slab grid in the nave still a violet tile grid; diorama. |
| haloN | 9 | 8.5 (-0.5) | 8.5 | 8.5 (=) | Gable is now a patchwork of flat axis-aligned tint tiles without joints (mosaic, not drawn masonry). |
| low | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | Mixed standing-bloom fringe along the whole foreground (density fixed); cream block still a big faceted lump. |
| nosewall | 8 | 8 (=) | 7 | 7 (=) | Near-uniform flat lavender wash; warm patch reduced to a ruled diagonal strip; calm but empty. |
| graze | 7.5 | 8 (+0.5) | 7.5 | 7.5 (=) | Weep stack and ruled diagonals gone; large calm planes. Wood still flat. |
| upinside | 7 | 7 (=) | 7 | 7 (=) | Capital/shaft irregular now, but a hard straight polygon facet runs down the shaft silhouette. |
| northgraze | 8 | 8 (=) | 8 | 8 (=) | Painted cloud card behind the sapling fine; reveal keeps a level tone step. |
| gableup | 8 | 7.5 (-0.5) | 7.5 | 7.5 (=) | Lit gable is a patchwork of flat rectangular tint tiles, axis-aligned, no joints: tiled-texture look (ruling a). |
| archwest | 8 | 8 (=) | 8 | 8 (=) | Warm patch spills across the pilaster (landed); pale lens blob on the left stub persists. |
| doorview | 8.5 | 8.5 (=) | 8 | 8 (=) | Lying blocks squatter and corner-clipped, still smooth lumps with flat faces; mid-distance flowers back. |
| buttress | 8 | 7.5 (-0.5) | 8 | 7.5 (-0.5) | Warm patch now a vertical band exactly filling one face between two arrises, ruled both sides. |
| rake | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Weeps gone, faint tint rectangles; calm but bland. |
| colcap | 8 | 8 (=) | 8 | 8 (=) | Coursing and lifted shade on the left wall; capital tilted and bitten but still a lathe flare. |
| topfloor | 6.5 | 6.5 (=) | 6.5 | 6.5 (=) | Coral sponge-blob flower stains around; slabs same; still a plan. |
| above45 | 7 | 7 (=) | 7.5 | 7.5 (=) | Slab grid still a clear grid of violet tiles; unchanged in kind. |
| thruarch | 8 | 8 (=) | 8 | 8 (=) | Moss rectangle gone; far-wall band softened; shade lavender and flat. |
| longlens | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | Near identical; crown slightly more values; cream block boxy. |
| cornerNE | 7 | 7 (=) | 7 | 7 (=) | Bough pipe hoop unchanged; bark warmer. |
| wideclose | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Shade lighter; lying lumps still smooth giant pebbles; corner-clipped cream rubble now a cluster of cuboids. |
| eastside | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | Whole wall one mid-lavender; warm zones faint. Flatter but blander. |
| nosecol | 8 | 8 (=) | 8 | 8 (=) | Orange panel gone; hard olive rectangle bottom left remains. |
| heapE | 8 | 8 (=) | 8 | 8 (=) | Shade lifted; lumps same, one box bottom left; blooms added. |
| eaststub | 7.5 | 7.5 (=) | 7.5 | 8 (+0.5) | Leopard blotches on the low wall gone; flat lavender with faint courses; mixed blooms. |

### 1b. Remaining named views (Q only)

| view | Q c12 | Q c13 | why |
|---|---|---|---|
| vista | 7.5 | 7.5 (=) | Mixed drift by the path restored; boulder smoother. |
| down | 7.5 | 7.5 (=) | Near identical; paving still a grid of violet tiles in shade. |
| tree | 8 | 8 (=) | Fewer pale clusters but still on the sunward rim; mixed drifts at the foot. |
| under | 7.5 | 7.5 (=) | Identical; lights mostly gone. |
| bush | 8 | 8 (=) | Chapel identical; drifts still mixed and good. |
| treeW | 8 | 8 (=) | Soft painted cloud card behind the crown; sparse flowers. |
| path | 7 | 8 (+1) | Drift restored: mixed standing blooms in front, orange drift mid; empty pads gone. |
| pathdown | 6.5 | 7 (+0.5) | Sponge blobs replaced by dappled pink/white/orange flower beds; still confetti-dense but right colour. |
| meadow | 7 | 7.5 (+0.5) | More mixed blooms; near wood strip carries pale-olive dabs mid-body again (leopard). |
| farN | 7.5 | 7.5 (=) | Leopard gone: one dark mass, soft foot, a few lit dabs on top. Large flat mass. |
| farNE | 8 | 8 (=) | Painted cumulus card soft and painterly; woods one mass. |
| farE | 7.5 | 8 (+0.5) | Cumulus card, crown values; mid wood flat but soft. |
| farSE | 7.5 | 7.5 (=) | Drift on the slope is a mixed flat patch (lozenge at this scale). |
| farS | 7 | 7 (=) | Same. |
| farW | 7.5 | 7.5 (=) | Central wood's lower half is an airbrushed fog gradient; lit dabs only on top. |
| farNW | 8 | 7.5 (-0.5) | REGRESSION: woods became soft blurry blobs with airbrushed feet, interior gone. |
| village | 7.5 | 7.5 (=) | Same. |
| castle | 7.5 | 7.5 (=) | Near wood regained top dabs; mid wood an airbrushed haze shape. |
| hillN | 7 | 7 (=) | Leopard gone; wood is one flat body with a few lit dabs top right, half the frame empty green. |
| skyUp | 7.5 | 7.5 (=) | Lights kept on sunward rim; sky flatter and deeper. |
| leaf3m | 7 | 7 (=) | Same; stumps chopped. |
| feet | 7 | 8 (+1) | Several mixed clusters on dark pads; empties filled; reads like ac15's foreground. |
| cross | 8 | 8 (=) | Flowers everywhere in even small groups; no rests, no masses: uniform. |
| wallfoot | 8 | 8 (=) | Identical. |
| shadowT | 7.5 | 7.5 (=) | Drift in shadow now ochre/mustard dots (not violet-grey as claimed): still dead leaves. Weed stickers gone. |
| flowers | 7.5 | 7.5 (=) | Flat ribbon replaced by sparse standing blooms + a mixed cluster; still mostly lawn. |
| sap | 7.5 | 7.5 (=) | More values and side sky holes; fine. |
| out0 | 8 | 7.5 (-0.5) | REGRESSION: pink/white foreground drift reduced to scattered small groups; weaker near plane. |
| out90 | 8 | 8 (=) | Ribbon now distinct small blooms; wood behind still a cut-out with soft foot. |
| out180 | 7.5 | 8 (+0.5) | Ghost blobs gone; mixed band + foreground singles; wood a big soft dark mass. |
| out270 | 7.5 | 8 (+0.5) | Orange rugs replaced by a broken mixed band with a standing fringe in front. |
| doorout | 7.5 | 8 (+0.5) | Mixed standing blooms in front, yellow drift right. |
| rim | 8 | 8.5 (+0.5) | Rugs dissolved into broken mixed drifts; near band dotted, no longer a printed rug. |
| rimE | 8.5 | 8 (-0.5) | REGRESSION: the swelling drift became a thinner, evenly spread speckle; chapel greyer. |
| southfar | 7.5 | 7.5 (=) | Drifts are tiny mixed speckle ovals: lozenges at the hand-over. |
| pathback | 8.5 | 8.5 (=) | Flowers back in mid-distance and both sides of the path; even speckle without a swelling mass. |
| lookdown | 6.5 | 6.5 (=) | Identical. |
| lookdownS | 6.5 | 6.5 (=) | Identical. |
| lookdown2 | 6 | 6.5 (+0.5) | Khaki blobs gone; a few shadow-tinted specks; emptier. |
| topTree | 7 | 7 (=) | More warm stains; same. |
| topPath | 7 | 7 (=) | Stains denser near the path; same. |
| shade | 7.5 | 8 (+0.5) | Mixed standing drifts added; trunk lit/shade split (terminator a bit ruled). |
| shadeN | 7.5 | 7.5 (=) | Identical; shade grass a sea of dashes. |
| treeN | 8 | 8 (=) | Arch shade lifted, weep bar-code gone; flowers at the foot gone. |
| lowN | 7 | 7 (=) | Leopard gone, lit dabs on top contour; body is a flat mass with airbrushed soft inner gradients. |
| drift | 6 | 6.5 (+0.5) | Ribbon now a mixed drift of distinct marks with broken edges; still an empty wash. |
| teleSE | 7.5 | 7.5 (=) | Identical. |
| teleW | 5.5 | 6 (+0.5) | Ruled band gone; faint airbrushed interior shapes, lit clump top left; still mostly a flat green field. |
| mtN | 7 | 7.5 (+0.5) | Lit dabs only along the top contour; body flat with faint dark sprinkles. Closer to paint. |
| mtW | 6.5 | 6.5 (=) | Lit dabs on top contour, but the interior shapes are soft airbrushed blobs. |
| shadowG | 7.5 | 7.5 (=) | Drift at rubble is standing blooms over speckle; fine. |

### 1c. Remaining custom cameras (Q only)

| view | Q c12 | Q c13 | why |
|---|---|---|---|
| floordown | 7 | 7.5 (+0.5) | Ghost quad edge gone; clean turf. |
| noserubble | 7.5 | 7 (-0.5) | REGRESSION: front blocks are bigger cleaner cuboids with large planar faces and straight arrises; clipped corners add facets. |
| nosetrunk | 7.5 | 7.5 (=) | Trunk lit flank golden tan, too warm against ac13's grey-olive. |
| upcrown | 7.5 | 7.5 (=) | Fewer lights from below; same. |
| grasslow | 8.5 | 8 (-0.5) | REGRESSION: foreground satellite drift reduced to two tiny clumps; lower 40% empty. |
| zenith | 7 | 6.5 (-0.5) | REGRESSION: pale-yellow lights removed from below; only mid/dark greens and navy; duller. |
| drum | 7 | 7 (=) | Block squashed and half sunk but still a rounded cuboid with a green band; base ring steps gone; ruled shadow edge. |
| crossnear | 8.5 | 8.5 (=) | More flowers, evenly spread; loses rests. |
| nosegable | 7.5 | 8 (+0.5) | Pink/white standing drifts back. |
| pathnose | 7.5 | 7.5 (=) | Mixed hues; far woods one mass with soft foot. |
| underSE | 6.5 | 6.5 (=) | Y bough unchanged; lights replaced by mid-green. |
| rimdown | 6.5 | 7 (+0.5) | Larger mixed drifts with soft edges; sapling stickers remain. |
| stub1 | 7 | 7 (=) | Lights only on upper-left rim (correct) but few; crown mostly flat; ochre trunk. |
| stub2 | 7 | 7 (=) | Same; almost no lights. |
| floorslab | 6.5 | 7 (+0.5) | Ruled slab ghost and cream line gone. |
| floorslab2 | 6.5 | 7 (+0.5) | Ghost quad edges gone; drum disc has irregular rim; ruled shadow diagonal. |

## 2. Means

| set | c12 | c13 | delta |
|---|---|---|---|
| chapel F (31) | 8.00 | 7.97 | -0.03 |
| chapel Q (31) | 7.89 | 7.89 | +0.00 |
| named Q (62) | 7.53 | 7.64 | +0.10 |
| custom Q (36) | 7.47 | 7.50 | +0.03 |
The c12 columns recompute to the published c12 means (8.00, 7.89, 7.53, 7.47), so the comparison is like for like. Still no view at Q 9. Three views at F 9 (hero, front, inside); haloN dropped to 8.5. Chapel flat on Q and slightly down on F (three drops, one gain); the named gain is almost all flowers.

## 3. What still makes the scene read as 3D/CG (ranked, chapel first)

1. **Per-block tints as flat rectangles.** Views: gableup, haloN, front, inside, rake, stub2. Axis-aligned fills with straight edges and no joints. Fix: drop per-block fills to ±3% value and hue; draw courses as dark broken joint strokes (1–2 px, 50% dropout, wandering ±1 px) over 30–40% of the lit wall in patches; add a pale stroke on the top edge of only one block in five; take hue variation from 2–3 large stain shapes (rust under ledges, green-grey at the foot) rather than per block.
2. **Near loose stones are low-poly boulders.** Views: noserubble, wideclose, hero, low, front, drum, doorview. Corner clips added facets. Fix: remove the plane clips; displace along the normal with 2–3 octaves of noise (6–10 cm, then 2 cm), shade with a 3-step toneStep on a smoothed normal (light top, mid side, dark side) and draw one or two crack strokes; for the drum-view block, sink it 40% and replace the green band with a ragged turf skirt.
3. **Shade side is one chalky swatch.** Views: inside, back, eastside, nosewall, nosecol. Fix: keep the lifted value, but restore two zones inside it: cooler violet in the upper 60%, warmer bounce (ochre-pink, +5% value) near the foot, with a brushed, wandering boundary; let the coursing strokes continue into shade at lower contrast.
4. **Woods with airbrushed interiors and fog feet.** Views: lowN, mtW, teleW, farW, farNW, castle. Fix: quantise the interior to two or three flat value shapes with hard brushed edges (threshold a low-frequency noise, do not lerp it); make the foot a flat darker band with a ragged top edge that merges into the body at one or two points, not a vertical gradient.
5. **Flower marks are an even sprinkle.** Views: hero, cross, crossnear, rimE, pathback, out90. Fix: cluster bloom positions with a second, coarser noise so 60% of blooms fall in 30% of the drift area; vary bloom size 1:3 within a cluster and scale the near blooms up by 1.5–2x; let some drifts be single-hue masses with a few accents; leave one or two large rests per frame.
6. **Top-down paving grid and model views.** Views: high, above45, down, topfloor. Fix: apply the turf-discarding paving to the whole nave (not only near the camera position used to test), and break the remaining slabs' straight edges with the same ragged mask.
7. **Trunk lit flank too saturated and ruled.** Views: westwall, shade, nosetrunk, shadowG, cornerNE. Fix: cap the lit flank at S 0.30 in grey-olive (ac13 `#6C6851`), wander the terminator with noise, and add bark strokes across it.
8. **Crowns lost their lights from below.** Views: zenith, upcrown, underSE. Fix: allow sunward rim lights on the lowest lobes' sunlit edge as well, not only the top outline.
9. **Front has no flowers.** View: front. Fix: one drift entering from the lower left and a scatter at the right block.
10. **Boughs.** cornerNE, underSE, stub1: still pipe/segment/club silhouettes.
11. **Cloud shadows soft-edged.** high, rim. Fix: brushed hard edge like the tree shadows, or keep them off.

## 4. Regressions versus critique 12

- noserubble 7.5 to 7: corner clipping made cleaner cuboids with planar faces.
- grasslow 8.5 to 8: foreground satellite drift reduced to two tiny clumps.
- zenith 7 to 6.5: pale lights gone from below.
- out0 8 to 7.5: foreground drift reduced to scattered groups.
- rimE 8.5 to 8: swelling drift became an even speckle.
- farNW 8 to 7.5: woods became airbrushed blobs.
- haloN F 9 to 8.5, gableup F 8 to 7.5: flat tint tiles on the gable.
- buttress F 8 to 7.5, Q 8 to 7.5: warm band fills one face between two arrises.
- New artefacts: flat rectangular tint tiles on lit stone; chalky single-tone shade walls; airbrushed wood interiors and feet; saturated ochre trunk flanks with ruled terminators; even flower speckle over whole lawns (cross, crossnear); soft-edged cloud-shadow veils.

## 5. Closest to and furthest from a real Frieren background

Closest:

1. **hero (Q 8.5, F 9), beside ac12.** What separates it from 9.5: (1) flowers are the right amount but the wrong marks: identical round dots evenly spaced, no big petals in the foreground, no dense masses with rests, no grass strokes between blooms; ac12's field is built from dense, varied marks that merge into horizontal bands. (2) Gable masonry is flat tint rectangles; ac12 draws dark broken joints with a pale top edge, plus rust and green stains at string courses and the foot. (3) Shade faces are one chalky lavender; ac12's shade keeps coursing and a warm foot. (4) The cream block in front is a faceted lump. (5) The sky is a flat deep cyan to near the horizon; ac12 goes to white over the bottom quarter of the sky. (6) The trunk at left has an ochre flank.
2. **longlens (Q 8.5, F 8.5), beside ac13** (`crops/ac13-longlens.jpg`). Unchanged since c12: the crown is a few big flat masses with pale clusters, no interior sky holes or branch lines; ac13 builds it from hundreds of leaf marks. The trunk is one shape with a pipe bough; ac13 has bark strokes and a cool/warm split. The gatehouse in ac13 shows coursing in shade; ours does not. The cream block is boxy. The lawn is a plain wash where ac13 has dappled violet shadow, pebbles and grass fringes.
3. **pathback / rim / low (Q 8.5).** Flower coverage now right, crowns at right are the most ac13-like thing in the project. Separating them from 9.5: even speckle with no swelling mass; flat chalky shade walls; tint tiles on the gable; flat deep sky; low's cream block.

Furthest:

1. **teleW (6), drift (6.5).** Flat green field; empty wash.
2. **topfloor (6.5), lookdown/lookdownS/lookdown2 (6.5), mtW (6.5), underSE (6.5), zenith (6.5).** Plan view; plain ground close-ups; airbrushed wood; segment bough; crown without lights.
