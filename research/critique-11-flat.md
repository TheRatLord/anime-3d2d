# Critique 11 (flatness pass) — independent art-critic review

Same method as critique 10: 31 chapel views (F and Q), 62 named views (Q), 36 custom cameras (Q, coordinates from the critique-8 appendix). Rendered in the isolated copy `.work/crit11` (`node tools/shot.mjs c11 all`, `node tools/dbg.mjs c11x …`), 720p, plus 1080p of hero/front/frame/inside/rimE. Every scored image was opened as a c10-over-c11 pair (`.work/crit11/pairs/`), with crops for the rulings (`.work/crit11/crops/`). No shader errors, same single 404 as before. Nothing in `src/` was touched.

Frame time: hero 12.0 ms at 720p in c11 against 9.5 ms for the c10 copy measured in the same session on the same machine (c10 reported 6.5 ms at the time, so the machine was busier today; the ratio is what counts: about +27%). The console reports 47 273 tufts and 61 849 flowers.

Scales: Q 8 = passes as a paused Frieren background for a non-expert, 9 = passes beside ac12/ac13. F 10 = painted on one sheet, 5 = nicely toon-shaded model.

## 0. Verdict on the claimed changes

| claim | verdict | evidence |
|---|---|---|
| Capital is a flared necking + abacus in shaft tones | Landed | hero, front, inside, haloN, colcap, wideclose. The dark lump is gone. It is now a perfect lathe-turned part: two exact ellipses (colcap, upinside). |
| Blocks/drums/altar/slabs have tone patches, crack strokes, coursed altar | Landed, patches overdone on the block | drum, floorslab, floorslab2, doorview, inside. The drum-view block wears a large green patch on mauve and reads as army camouflage. |
| Pale L-bracket and white zigzag removed | Landed | rubble, eaststub, wideclose. |
| Near wall: flat brushed bounce zones, near detail fading in | Landed | nosewall (Q 5.5 to 7), nosecol, close. Gradient gone. Pale dry-brush dashes are spread at one density over the whole panel. |
| Rubble in wall palette, 60% angular | Landed | heapE, rubble, hero, high. Close up (noserubble) the blocks are low-poly cuboids with ruled edges. |
| Drips taper, plinth lines wander | Landed | back, close, graze. Two thin ruled diagonals survive on the lit wall in graze. |
| Cast-shadow edges have a warm half-tone rim and leaf dapple | Landed, overshoots | The rim has constant width, so it reads as an outline: sun patches in bush, wallfoot, thruarch, westwall are pale blobs with a tan ring; on the lit gable (inside, haloN) the shadow has a parallel second contour. Dapple dots on lit stone (treeN, stub2) look like lichen polka dots. |
| Shade side in three flat zones | Landed, too regular | hero, front, inside good. In low, eastside, back, colcap the zone boundaries sit at one constant height across every pier and follow the string course: tide lines / stripes. |
| Cool wash from ledges, moss under ledges | Partly | Cool wash fine. Moss on the thruarch centre pier is a hard-edged saturated green rectangle. |
| Reveal light edge + dark line, chipped break silhouette, grass fringe on stone feet | Landed | eastside, westwall, rake (chips are small square blocks), shadeN, wallfoot. On floor slabs the painted fringe is a ruled green comb with vertical stripes (floorslab2). |
| Mountains: long ridges, unequal summits, calm skyline behind chapel | Landed | Tent rows gone in vista, pathnose, out0, doorout, farSE, village. Overshoot: several ranges are now featureless lumps or a ruler-flat table (mtN, farNW, nosetrunk, lowN). Straight polygon facets remain in teleSE, village, out270, farNE. |
| Woods: lit top rim, dark base band, a few lit lobes | Partly | lowN, mtW, farW better. teleW: base band is a separate row of dark blobs, lit lobe is one isolated dab. hillN: the wood lost its lit dabs and is a soft blurred mush. |
| Crowns organised into big value masses | Landed, at a cost | See ruling (c). |
| Boughs with knees and irregular girth | Partly | upcrown, leaf3m better. cornerNE still a pipe U; underSE straight-segment Y; stub1 a club. |
| Softer cloud wisps | Landed | skyUp, out0. |
| Flowers recomposed into 16 arcs/bands with rests, two hue stripes | Landed, new problems | See ruling (b). |
| Fewer tufts gathered into clusters | Landed | shade, doorout, out0, lookdown. Isolated teal weed clumps on open lawn read as stickers (southfar, shadowT, rimdown). |
| Weed fringe and dark contact along walls and rocks | Landed | hero, front, wallfoot, shadeN. |
| Ground from above keeps brushed tone shapes | Landed | topPath 5.5 to 6.5, topTree, lookdown. In lookdown the pale blotches are equal-sized and evenly spread (camouflage cloth). |
| Path edge broken | Landed | topPath, path, doorout. |
| Stems/blooms anti-aliased | Landed | feet, shadowG. |

### Rulings

**(a) Camouflage on stone: yes, locally, in three places; no, globally.** The walls at normal distance (hero, front, close, archwest, inside) are not camouflage; the zones are large and brushed. It has come back in: (1) colcap's left wall, which is three horizontal stripes (sky-blue, brown, mauve) running parallel to the string course with a jagged lower edge, a striped flag; (2) buttress, where one pier carries four hues (blue mid patch, warm low, mauve, olive moss) inside two metres; (3) the drum-view block, a mauve cuboid with a big green patch. The thruarch moss strip is not camouflage, it is a paint swatch: a saturated green rectangle with ruled left/right ends and a dark line under it. All four need fixing.

**(b) Flower bands: too saturated yes, too regular yes, rings no.** From `high` and `topPath` the bands are arc segments and soft drifts with rests; no closed ring is readable and c10's ring around the chapel shadow is gone. That part worked. The problems are at eye level: (1) each band is a full-width carpet at near-uniform height and uniform dot density (out90, rimE, hero, frame, longlens, out270); (2) the crimson is now the most saturated mass in the frame and in rimE covers about 30% of the picture in front of the chapel; measured on the bottom third, HSV-type saturation high-percentile rose from 50 to 63 in rimE, 38 to 46 in out90, 43 to 47 in hero; (3) two hue stripes per band read as exactly that, a red stripe under a yellow stripe (frame, hero, vista); (4) yellow-only bands are monochrome dot fields (rim, meadow, grasslow); (5) from above the orange/yellow bands are confetti (pathdown). ac12 has many hues mixed inside a band, band height that swells and pinches, and saturation that falls quickly with distance.

**(c) Tree crowns lost their sparkle: yes.** Hero crop c10 vs c11 (`crops/hero-crown10.png`, `crops/hero-crown.png`): the pale yellow leaf lights and most navy accents are gone; the crown is flat teal with one mid-green lobe. Same in treeW, sap, out180, farN, stub1, stub2, hillN, pathback. The big-mass organisation itself is right (treeN, frame), but the top value step was removed with the noise. Scores held only because the masses read better.

**(d) Too busy now:** nosewall (dashes everywhere), the drum block, buttress, colcap left wall, sun-patch halos. **Too empty now:** flowers, cross, back and crossnear foregrounds, drift, rimdown; the rests are larger than the bands in several named views.

## 1. Per-view scores

### 1a. Chapel views (31): F and Q

| view | F c10 | F c11 | Q c10 | Q c11 | why |
|---|---|---|---|---|---|
| hero | 8.5 | 9 (+0.5) | 8.5 | 8.5 (=) | Capital fixed, warm low zone, calm ridge, grey angular rubble. Foreground is a dense crimson stripe under a yellow stripe; crown lost its yellow lights; foreground cream block still a faceted box. |
| front | 8.5 | 9 (+0.5) | 8.5 | 8.5 (=) | Capital blob gone, zones read, flowers quiet. Big cream block at right is still a box. |
| frame | 8 | 8.5 (+0.5) | 8 | 8.5 (+0.5) | Mountain facets gone, crowns in big masses. Red stripe / yellow stripe banding. |
| inside | 8 | 8.5 (+0.5) | 8 | 8.5 (+0.5) | Flared capital, three zones, tomb patched. Cast shadow on the gable has a parallel halo contour; capital rings are perfect ellipses. |
| westwall | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Stair notches gone, chipped break, calm mountains. Sun patches on the right fragment have a brown outline. |
| back | 8 | 8 (=) | 8 | 8 (=) | Zones read as horizontal stripes (blue top, brown band, mauve, brown base). Foreground now an empty lawn. Drips taper. |
| close | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Richer brushed patches, tapered drips, wandering joints; not camouflage. |
| rubble | 7 | 7.5 (+0.5) | 7 | 7.5 (+0.5) | L-bracket gone, angular grey rubble, low wall patched. Yellow flowers evenly scattered. |
| high | 7 | 7.5 (+0.5) | 7 | 7.5 (+0.5) | Ring round the shadow gone, arcs with rests, angular rubble. Still a diorama. |
| haloN | 8 | 8.5 (+0.5) | 8 | 8.5 (+0.5) | Capital fixed, cream sliver gone. Shadow edge on gable has an offset pale contour. |
| low | 8 | 8.5 (+0.5) | 8.5 | 8.5 (=) | Capital and cream chip fixed. Warm low zone ends at one height across all piers. |
| nosewall | 7.5 | 7.5 (=) | 5.5 | 7 (+1.5) | No longer empty, gradient gone: joints, drips, cool patches. Pale dashes at one density over the whole panel. |
| graze | 7 | 7.5 (+0.5) | 7 | 7.5 (+0.5) | Drips taper, plinth wanders. Two thin ruled diagonals remain. |
| upinside | 6.5 | 7 (+0.5) | 6.5 | 7 (+0.5) | Boulder gone. From below the capital is a turned pipe flange. |
| northgraze | 8 | 8 (=) | 8 | 8 (=) | Near detail on right pier, calm ridge; otherwise the same. |
| gableup | 8 | 8 (=) | 7.5 | 7.5 (=) | Faint moss tints and chips; same picture. |
| archwest | 8 | 8 (=) | 8 | 8 (=) | Brushed cool/warm zones fine. Same level. |
| doorview | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Cream chip gone, foreground block patched and stroked, calm skyline. |
| buttress | 7 | 7 (=) | 7.5 | 7.5 (=) | Four hues on one pier (camouflage); vertical facet lines still ruled; clover-leaf weeds large. |
| rake | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Moss on top; chips are small rectangular blocks. |
| colcap | 7 | 7.5 (+0.5) | 7 | 7.5 (+0.5) | Capital fixed. Left wall is blue/brown/mauve stripes; capital rings are exact ellipses. |
| topfloor | 5.5 | 6 (+0.5) | 6 | 6 (=) | Capital is a pale disc not a dark square; rubble angular. Still a floor plan. |
| above45 | 7 | 7 (=) | 7.5 | 7.5 (=) | Flower ring gone. Still a model. |
| thruarch | 8 | 8 (=) | 8 | 8 (=) | Zones fine. Green rectangular moss swatch on centre pier, haloed sun patch, rectangular inset on right pier still there. |
| longlens | 8.5 | 8.5 (=) | 8 | 8 (=) | Red flower stripe at uniform height across the wall base. |
| cornerNE | 7 | 7 (=) | 7 | 7 (=) | Boughs still a thick bent-pipe U. |
| wideclose | 6.5 | 7.5 (+1.0) | 7 | 7.5 (+0.5) | Zigzag gone, capital fine, blocks patched, grey rubble. |
| eastside | 8 | 8 (=) | 8.5 | 8.5 (=) | Chipped break good. Zone boundary at one height across piers; crown darker. |
| nosecol | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Near detail fades in: joints, dry-brush, patches. |
| heapE | 7 | 7.5 (+0.5) | 7.5 | 8 (+0.5) | Angular wall-palette blocks. Some are perfect cuboids with ruled edges. |
| eaststub | 7 | 7.5 (+0.5) | 7 | 7.5 (+0.5) | L-bracket and zigzag gone, low wall patched. |

### 1b. Remaining named views (Q only)

| view | Q c10 | Q c11 | why |
|---|---|---|---|
| vista | 7 | 7.5 (+0.5) | Dark cylinder now a patched boulder; tents gone. Red-over-yellow stripe. |
| down | 7 | 7.5 (+0.5) | Slabs have grass creeping over edges and crack strokes. |
| tree | 8 | 8 (=) | Crown in big masses, calm ridge, chapel warmer; crown lights gone, yellow carpet at left is one blob. |
| under | 7.5 | 7.5 (=) | More lit lobes; bough stump with a knob. |
| bush | 7 | 7 (=) | Flat bounce zones fine; sun patch has a uniform brown halo; foreground grass gone. |
| treeW | 8 | 8 (=) | Chapel better; crown lost its yellow sparkle. |
| path | 8 | 8 (=) | Calm mountains, broken path edge. Foreground flowers one crimson hue, evenly dotted. |
| pathdown | 7 | 6.5 (-0.5) | REGRESSION: orange/yellow confetti speckle on both sides seen from above. |
| meadow | 7.5 | 7.5 (=) | Monochrome yellow band, evenly dotted. |
| farN | 7.5 | 7.5 (=) | Calm mountains; crown flat dark teal. |
| farNE | 7 | 7.5 (+0.5) | Calm ridge; one polygon facet left. |
| farE | 6.5 | 7 (+0.5) | Calm mountain, wood has a dark base. |
| farSE | 7 | 7.5 (+0.5) | Tents gone. |
| farS | 6.5 | 7 (+0.5) | Calm skyline. |
| farW | 7 | 7.5 (+0.5) | Calm; woods have lit lobes. |
| farNW | 7.5 | 7.5 (=) | Tents gone but ridges are featureless dune lumps. |
| village | 6.5 | 7 (+0.5) | Tents gone; one mountain with straight polygon facets behind the steeple. |
| castle | 7 | 7.5 (+0.5) | Mountain one calm mass; woods with lit lobes. |
| hillN | 7 | 6.5 (-0.5) | REGRESSION: wooded hill lost its lit dabs, now a soft blurred mush over half the frame; crown uniformly dark. |
| skyUp | 7 | 7 (=) | Bigger crown masses; thick bough bottom right still a block. |
| leaf3m | 7 | 7 (=) | Knees in boughs, but limbs end in chopped stumps. |
| feet | 7.5 | 7.5 (=) | Sparser yellow-only clusters; fine, monotone. |
| cross | 8 | 7.5 (-0.5) | REGRESSION: bottom 40% is an empty wash; yellow flower mass at left is a mushy blob. |
| wallfoot | 7 | 7.5 (+0.5) | Zones, fringe, dark contact. Wall sun patch is a pale blob with a tan ring. |
| shadowT | 7.5 | 7.5 (=) | Bands with rests; orange band in corner is a speckle smear; two pale weed clumps like stickers. |
| flowers | 8 | 7 (-1.0) | REGRESSION: the flower view is now an empty lawn with one thin uniform ribbon; crown darker. |
| sap | 7.5 | 7.5 (=) | Crown more massed but without yellow lights or navy accents. |
| out0 | 7 | 7.5 (+0.5) | Tents gone, tufts clustered. Flowers a thin orange line. |
| out90 | 7.5 | 7.5 (=) | Full-width crimson carpet, hottest thing in a high-key frame. Crown masses and mountain good. |
| out180 | 8 | 8 (=) | White/pink patch plus far thin band with rest between: the right idea. Crown flat dark. |
| out270 | 7.5 | 7.5 (=) | Dense even orange/crimson confetti band; woods base band good. |
| doorout | 7 | 7.5 (+0.5) | Calm skyline, tufts gathered along path. |
| rim | 8 | 8 (=) | Chapel richer. Foreground monochrome yellow carpet, uniform dots. |
| rimE | 8 | 8 (=) | Chapel zones good. Crimson-over-orange carpet covers 30% of frame and outshouts the chapel. |
| southfar | 7.5 | 7.5 (=) | Calm mountains; five isolated teal weed clumps on the lawn. |
| pathback | 8.5 | 8.5 (=) | Chapel better, tents gone, rests in the meadow; crowns lost lights and bottom edge is an orange confetti strip. Nets even. |
| lookdown | 6 | 6.5 (+0.5) | Brushed tone shapes; pale blotches equal-sized and evenly spread. |
| lookdownS | 6.5 | 6.5 (=) | Cleaner; tufts still have a pale double outline. |
| lookdown2 | 6.5 | 6.5 (=) | Tone shapes fine, shadow edge has a rim. |
| topTree | 6 | 6.5 (+0.5) | Ground wash brushed, crown masses bigger. |
| topPath | 5.5 | 6.5 (+1.0) | Broken path edge, soft flower drifts with rests, no rings. Dark oval blobs along the path look like stamps. |
| shade | 7.5 | 7.5 (=) | Calmer, tufts gathered at trunk. |
| shadeN | 7 | 7.5 (+0.5) | Brushed warm zone on wall, weed fringe. Shade grass is a flat sea of dashes. |
| treeN | 8 | 8 (=) | Good mass organisation (one lit lobe, one dark mass); dark mass has no inner drawing; dapple on stone reads as lichen dots. |
| lowN | 7 | 7.5 (+0.5) | Wood has dark base band and lit flank; ridge behind featureless. |
| drift | 6 | 6 (=) | Flowers gone, empty wash; lit lobes on bush are pasted dabs. |
| teleSE | 6.5 | 7 (+0.5) | Tents gone; left mountain still two straight-edged polygons. |
| teleW | 5.5 | 6 (+0.5) | Base band is a separate row of dark blobs; one isolated yellow dab; near bush lost its lights. |
| mtN | 6.5 | 7 (+0.5) | Facets gone; ridge is a flat pale band with a ruler-straight top. |
| mtW | 6.5 | 7 (+0.5) | Calm single summit, lit rim on wood reads; base band heavy. |
| shadowG | 7.5 | 7.5 (=) | Wall zones and drips good; foreground yellow flowers are evenly spaced single blooms. |

### 1c. Remaining custom cameras (Q only)

| view | Q c10 | Q c11 | why |
|---|---|---|---|
| floordown | 6.5 | 7 (+0.5) | Sticker gone, moss creeping on slab. |
| noserubble | 6.5 | 7 (+0.5) | Colour right. Low-poly facets with ruled edges, speckle dapple. |
| nosetrunk | 7 | 7 (=) | Mountain a featureless lump. |
| upcrown | 7 | 7.5 (+0.5) | Boughs have knees. |
| grasslow | 8 | 8 (=) | Chapel richer; yellow-only band evenly dotted, lower half empty. |
| zenith | 6.5 | 6.5 (=) | Same. |
| drum | 5.5 | 6.5 (+1.0) | Block no longer blank, slabs stroked, grass fringe. Block is green-on-mauve camouflage; column base has stair-step notches. |
| crossnear | 8 | 8 (=) | Foreground now empty lit grass. |
| nosegable | 7.5 | 8 (+0.5) | Pale white/pink band works, calm mountain, near detail on wall. |
| pathnose | 7 | 7.5 (+0.5) | Pyramid row gone. |
| underSE | 6.5 | 6.5 (=) | Bough still a straight-segment Y. |
| rimdown | 6.5 | 6.5 (=) | Flowers gone, emptier; sapling crowns as leaf stickers. |
| stub1 | 7 | 7 (=) | Banana now a club; crown lost yellow lights. |
| stub2 | 7 | 7 (=) | Same; haloed dapple dots on lit stone. |
| floorslab | 6 | 6.5 (+0.5) | Slabs patched and stroked, grass creeping; sun-patch edge speckled. |
| floorslab2 | 5 | 5.5 (+0.5) | Slabs stroked, drum top less polygonal. Grass fringe on slab is a ruled green comb. |

## 2. Means

| set | c10 | c11 | delta |
|---|---|---|---|
| chapel F (31) | 7.48 | 7.81 | +0.33 |
| chapel Q (31) | 7.50 | 7.79 | +0.29 |
| named Q (62) | 7.26 | 7.45 | +0.19 |
| custom Q (36) | 7.04 | 7.32 | +0.28 |

The c10 columns recompute to the published c10 means, so the comparison is like for like. Gains are spread wider than last round (the landscape set moved, mostly from the mountains). Still no view at 9 on Q; hero and front reach F 9.

## 3. What still makes the scene read as 3D/CG (ranked, chapel first)

1. **Shade-zone boundaries are level tide lines and stripes.** Views: low, eastside, back, colcap (worst), hero right pier, inside left pier. The eye catches a brown band at the same height on every pier and stripes parallel to the string course. Fix: drive the zone thresholds with a low-frequency noise in wall-tangent space plus a per-pier offset of 0.3-0.8 m, let the warm zone climb at corners and under openings and drop mid-panel, cap the number of zones visible on one face at two, and never let a boundary run parallel to a moulding for more than about 1.5 m.
2. **Sun patches and cast-shadow edges have a constant-width rim, i.e. an outline.** Views: bush, wallfoot, thruarch, westwall (ring round pale blob); inside, haloN (parallel contour on gable); treeN, stub2 (dots). Fix: make the half-tone a one-sided, variable-width fringe: width = noise in 0..1 times max, present on roughly 40% of the edge length, biased to the lower/shadow side; drop it entirely for patches under about 3% of frame width, and delete dapple spots under that size on stone.
3. **Remaining primitives: foreground cream blocks, cuboid rubble, lathe capital, slab fringe comb.** Views: hero, front (cream blocks); noserubble, heapE (ruled cuboids); colcap, upinside (exact ellipses); floorslab2, floorslab (green comb). Fix: displace block silhouettes with 5-8 cm noise and knock one corner off each; give the capital an elliptical wobble and break both rings with a 50% duty mask and one chip; replace the slab fringe with the same alpha-cut blade strip used at wall feet, never a vertical-striped quad.
4. **Local camouflage and the moss swatch.** Views: buttress, drum block, colcap left wall, thruarch centre pier. Fix: limit any face under 3 m wide to base + one patch hue; desaturate moss to grey-olive (S below 0.25) and give it a ragged noise-thresholded lower edge that fades out sideways instead of ending on the ledge corners; on free blocks keep moss to the top third only.
5. **Near-wall dash texture at uniform density.** Views: nosewall, close (mildly), floorslab. Fix: multiply the dry-brush layer by a patch mask covering 30-40% of the wall (same mask family as the joint patches) so two thirds of the panel stay as plain wash.
6. **Top-down views are still a model.** Views: topfloor, above45, high, floorslab2. Unchanged in kind since c9. Fix: from elevation above about 35 degrees, cross-fade wall tops and slab tops toward the ground wash at their edges, merge the slab grid into two or three irregular stone islands, and drop the cast shadows to a single soft-edged blob.
7. **Flower carpets are uniform stripes at full saturation** (landscape; see ruling b). Views: rimE, out90, hero, frame, longlens, rim, pathdown. Fix: modulate band height by a 1:4 noise so it swells and pinches to nothing two or three times across the frame; mix three or four hues inside one band by clustered noise rather than two stacked stripes; cut crimson saturation about 20% and move a third of it to pink/white; fade density and saturation with distance twice as fast; keep any band under about 12% of frame height at eye level.
8. **Crowns have no top value step** (ruling c). Views: hero, treeW, sap, farN, out180, stub1. Fix: keep the big masses, then add back the pale yellow leaf dabs on the sun-side rim of the two or three largest lit lobes only (about 5-8% of crown area), and a few navy accents inside the largest dark mass.
9. **Mountains overshot into blobs; a few facets remain.** Views: mtN (table top), farNW, nosetrunk, lowN (lumps); teleSE, village, out270, farNE (straight facets). Fix: give every ridge one or two named summits with a single brushed shadow shape each; forbid horizontal crest runs longer than about 15% of frame width; brush the remaining facet edges with the same noise threshold.
10. **Woods at long lens.** Views: hillN, teleW, drift. Fix: restore the lit dab layer on the sun-facing third of the wood, clustered into three to five groups; make the dark base band part of the same silhouette (lower 15% darkened) rather than separate blobs in front.
11. **Boughs.** Views: cornerNE, underSE, stub1, leaf3m. Fix as in c10 item 9; still outstanding for the thick first-order limbs.

## 4. Regressions versus critique 10

- flowers 8 to 7: empty lawn with a thin ribbon.
- cross 8 to 7.5: foreground emptied, yellow mass is a mushy blob.
- pathdown 7 to 6.5: confetti speckle from above.
- hillN 7 to 6.5: wood blurred into mush, crown dark.
- Tree crowns lost their yellow lights and navy accents everywhere (no score lost, but a real loss; hero, treeW, sap, out180).
- Crimson flower carpets more saturated and more uniform than c10's mixed patches (rimE, out90, hero, frame); two-stripe banding is new.
- New artefacts: constant-width halo round sun patches and cast-shadow edges; green rectangular moss swatch (thruarch); horizontal stripe zones (colcap, back, low, eastside); camouflage block (drum); ruled green comb fringe on slabs (floorslab2); isolated weed-clump stickers on open lawn (southfar, shadowT); dark oval stamps along the path from above (topPath); featureless or table-topped mountains (mtN, farNW).
- Empty foregrounds: back, crossnear, drift, rimdown.
- Frame time about 27% higher than c10 measured back to back (12.0 vs 9.5 ms on a loaded machine).
- No chapel view lost points on F or Q.

## 5. Closest to and furthest from a real Frieren background

Closest:

1. **front (Q 8.5, F 9).** Separates it from 9.5: the two cream blocks at right are primitives with flat faces; no masonry courses of varying block size on the lit gable (ac12 draws them in patches); the capital and plinth are geometrically perfect; the shade side has zones but no fine drawn articulation (offset buttress steps, a second string course, a window reveal with a hairline); crown above is a flat teal mass; nothing in the frame has the pigment granulation that distinguishes one plane from another.
2. **hero / pathback (Q 8.5).** Separates them from 9.5: the flower band is a two-stripe carpet instead of ac12's mixed, swelling band that pales toward the horizon; crowns lack the pale leaf lights at the rim and the navy core; the right-hand pier's zone line is level; the foreground cream block is a box; mountain is correct now but has no second faint tone.
3. **eastside (Q 8.5, F 8) and inside / haloN / frame (Q 8.5).** Separates them from 9.5: zone boundaries at a constant height; the halo contour on the gable shadow; lathe capital; wall base still meets grass on a line in the lit parts; stone has four tones now but they are distributed as bands rather than as stains tied to features (weeps under sills, moss at ledges, dark at the foot).

Furthest:

1. **floorslab2 (5.5).** Disc on slabs with a ruled green comb.
2. **topfloor (Q 6, F 6), teleW (6), drift (6).** Floor plan; pasted woods; empty wash.
3. **pathdown, hillN (6.5), with lookdown*, zenith, underSE, rimdown, drum (6.5).** Confetti from above; blurred wood; ground and bough close-ups.
