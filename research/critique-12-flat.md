# Critique 12 (flatness pass) — independent art-critic review

Same method as critique 11: 31 chapel views (F and Q), 62 named views (Q), 36 custom cameras (Q, coordinates from the critique-8 appendix). Rendered in the isolated copy `.work/crit12` (`node tools/shot.mjs c12 all`, `node tools/dbg.mjs c12x …`), 720p. Every scored image was opened as a c11-over-c12 pair (`.work/crit12/pairs/`), with crops for the rulings and side-by-sides against `refs/ac12.jpg` and `refs/ac13.jpg` (`.work/crit12/crops/`). All 98 scored pairs were seen; none is scored from memory. No shader errors; same single 404. Nothing in `src/` was touched. No 1080p set was rendered this round.

Frame time, hero at 720p, measured back to back on the same machine: c11 8.46 ms, c12 7.27 ms (about 14% faster). Console: 47 811 tufts, 63 819 flowers in 10 248 clusters, 98 weed clumps.

Scales: Q 8 = passes as a paused Frieren background for a non-expert, 9 = passes beside ac12/ac13. F 10 = painted on one sheet, 5 = nicely toon-shaded model.

Summary: the stone work landed and the chapel is flatter. The meadow was over-corrected: the stripes are gone, and in most chapel views so are the flowers. The woods were flattened into cut-outs or given leopard patches. Net gain is about a third of last round's.

## 0. Verdict on the claimed changes

| claim | verdict | evidence |
|---|---|---|
| Shade zones no longer level tide lines; one zone per element; weeps separate | Landed, with two side effects | back, colcap, eastside, shadeN, bush, buttress: stripes gone. New: zones are clipped at element boundaries, giving ruled vertical edges (inside left pier, close, nosewall, archwest right pier, nosecol). Weeps are square-ended dabs at even density (westwall, graze, treeN, gableup). A near-level band survives on the left pier in low, on the far wall in thruarch, and as level dark bands from below in upinside. |
| Sun-patch / cast-shadow rim one-sided, mostly absent | Landed | bush, wallfoot, thruarch, westwall, inside, haloN. Dapple dots on stone gone (treeN, stub2). |
| Rubble noise-displaced chipped chunks | Landed | heapE, rubble, noserubble. One box left in heapE; the front block in noserubble keeps a clean planar face. |
| Door piers: wandering arrises and a notch | Partly | doorview: notch and off-vertical edges visible on the pier blocks. The lying drum and the two blocks beside it are still smooth lumps. |
| Capital rings tilted/wobbled with broken strokes | Landed on the strokes only | colcap crop: rings are broken strokes. The silhouette is still an exact ellipse on a ruler-straight shaft with a straight light/dark split. |
| Slab fringe comb gone, slabs merged into turf islands, wall tops brushed green | Landed | floorslab2, drum, down, topTree, doorview. Side effect: straight-edged lighter ghost quads where slabs were buried (floordown, floorslab, down); square green patches on the wall top in down. At 45 degrees the grid is still a grid (above45). |
| Buttress reduced to base + one patch | Landed | buttress F 7 to 8. Arris lines still ruled. |
| Moss grey-olive and ragged | Partly | rake, noserubble, back fine. thruarch centre pier is still a rectangle with a dark line under it; close has a hard-edged green trapezoid; the drum-view block still has two olive patches. |
| Dry-brush gated to patches | Landed | nosewall, nosecol, close. nosewall's left half is now empty. |
| Faint patchy courses on the lit gable; per-plane granulation | Landed, too faint | Visible in hero, haloN, gableup, front. Against ac12 it is far too timid (see section 5). |
| Crown lights on sun-side rim + navy accents | Partly | Good in longlens, pathback, frame, skyUp, out90, farNE. Barely present in treeW, sap, stub2. Misplaced mid-crown or as equal-sized pasted clusters in tree, stub1, underSE, zenith, hero. |
| Boughs as flat dark strokes | Landed as tone, not as shape | cornerNE, underSE, stub1: flatter, but the silhouettes are the same pipe hoop, straight-segment Y and club. |
| Mountains: shader-evaluated curved second tone, no facets, no tables | Landed | teleSE, village, farNE, farNW, mtN, out270, castle. The clearest win outside the chapel. |
| Woods: one body tone, scalloped lit top, attached base band | Failed as described | The body tone landed. The lit part is not a scalloped top: it is either absent (teleW, mtW, out90, pathnose, drift) or large hard-edged patches scattered over the face (lowN, mtN, hillN, out180, graze, rubble). The base band is a separate strip with a hard wavy edge (teleW, meadow, lowN). |
| Meadow: bands half as deep, drifts, mixed hues, softer crimson | Landed | rimE, out90, cross, rubble, crossnear, grasslow. Crimson no longer leads. |
| Satellite drifts in formerly empty foregrounds | Landed | back, bush, cross, crossnear, out0, grasslow. |
| Beyond about 24 m bands are ground paint only | Landed, reads as rugs in several views | See ruling (b). |
| From above blooms merge into soft patches | Mixed | topTree, topPath: soft stains, better. pathdown: heavy ochre sponge blobs. high: so faint the meadow looks flowerless. |
| Fewer weed-clump stickers | Not visible | southfar still shows five, shadowT three, shadeN one. Console reports 98 clumps. |

### Rulings

**(a) Too sparse in flowers: yes, in most of the listed views.** hero: one thin drift at lower right; the lawn beside the path holds three pink dots and two dark pads with nothing on them. front: no flowers at all (c11 had an orange band left and a yellow patch right). low: sparse blooms at right, left half bare. pathback: the band at the chapel foot is gone and the mid-distance lawn is bare; flowers survive only as a strip on the bottom edge. drift: one thin ribbon. rimdown: one tiny drift. Also emptied: path (-1), meadow, feet, out180, nosegable, eastside, treeW, high. The scene is a "ruined chapel in a flower meadow"; in hero, front and pathback it is now a chapel on a lawn. c11's problem was stripes and saturation, not quantity. Wanted: roughly double the drift count near the chapel and path, same mixed palette and swelling shape, about 15-20% of the lower frame in hero and pathback. rimE, cross, crossnear, grasslow and rubble show the right density now.

**(b) Hand-over at 12-24 m reads as flat lozenges: yes, in open views.** rim: three hard-edged patches (orange, pink, orange) lie in a row mid-distance like rugs, and the near carpet on the bottom edge is dot paint with no stems at 5-8 m. out270: three flat orange ribbons stacked up the lawn with fairly straight lower edges. Also shadowG (rug at the rubble), nosetrunk, flowers (left end), rimE right side, drift, rimdown. It works where standing blooms overlap the paint (cross, doorout, grasslow). Two further defects: a drift that crosses a cast shadow turns to khaki/mustard blobs (lookdown2, shadowT), and blooms fading out leave grey half-transparent ghosts (out180).

**(c) Stone camouflage/stripes/halos: stripes and halos are gone; camouflage survives in three small places and one new pattern appeared.** Gone: colcap flag stripes, back stripes, buttress four-hue pier, all sun-patch rings, gable shadow contour. Remaining: the drum-view block (two olive patches on mauve), thruarch moss rectangle, close moss trapezoid. New: blue-grey round blotches on the brown low wall in eaststub and rubble; rectangular weep clusters (thruarch right pier, westwall, treeN); ruled vertical zone edges (inside, close, nosewall, archwest).

**(d) Lying drum, door-pier blocks, capital: still primitives.** The drum-view block is a rounded cuboid with equal-radius corners; the lying drum in doorview is a half-barrel with stair-stepped rings; the blocks beside it are smooth lumps with broad flat faces; the capital is an exact surface of revolution with painted-on broken strokes. Paint changed, silhouettes did not. The door-pier blocks are the only ones that improved (notch, leaning edge).

**(e) Top-down views: still a model, less so.** topTree and topPath now read as a watercolour plan (6.5 to 7) and topfloor gains half a point. above45 and high are unchanged: straight wall-top bands, a readable slab grid at 45 degrees, round capitals, a hard projected shadow.

## 1. Per-view scores

### 1a. Chapel views (31): F and Q

| view | F c11 | F c12 | Q c11 | Q c12 | why |
|---|---|---|---|---|---|
| hero | 9 | 9 (=) | 8.5 | 8.5 (=) | Stripes gone, zones calm, faint courses, crown lights back. But the flower field is now one thin drift at right and a bare lawn with two empty dark pads; wood at right flattened; cream block still a faceted lump. |
| front | 9 | 9 (=) | 8.5 | 8.5 (=) | Calm shade side with weeps, faint courses, softer chipped block. Flowers deleted entirely (c11 had an orange band and yellow patch); crown light is one pasted cluster. |
| frame | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | Crimson carpet gone, right crown lights excellent, mountain second tone. Thin drift only; about 40% of frame is plain lawn. |
| inside | 8.5 | 9 (+0.5) | 8.5 | 8.5 (=) | Parallel halo contour on the gable shadow gone, level band gone. Orange patch on left pier ends on a ruled vertical; capital and shaft still a symmetric turned part. |
| westwall | 8 | 8 (=) | 8 | 8 (=) | Tan outline and level band gone. Piers now peppered with square-ended weep dabs at even density. |
| back | 8 | 8.5 (+0.5) | 8 | 8.5 (+0.5) | Blue/brown/mauve stripes gone: one mauve body, patchy warm, weeps under ledges; satellite drifts fill the foreground. |
| close | 8 | 8 (=) | 8 | 8 (=) | Calmer, fewer dashes. Orange zone ends on a ruled vertical line; moss at top is a hard-edged green trapezoid. |
| rubble | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Chipped chunks, mixed-hue standing blooms in loose groups. Low wall and background wood carry leopard blotches. |
| high | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Flowers faded to faint dirty stains, slab grid still partly readable. Still a diorama. |
| haloN | 8.5 | 9 (+0.5) | 8.5 | 8.5 (=) | Offset contour gone, ring grooves gone, courses and granulation on the gable. Capital still a symmetric flare. |
| low | 8.5 | 8.5 (=) | 8.5 | 8.5 (=) | Warm band no longer at one height on all piers, but the left pier keeps a near-level band; left half of the lawn bare. |
| nosewall | 7.5 | 8 (+0.5) | 7 | 7 (=) | Dry-brush gated to the right 40%. New ruled vertical blue-grey strip at the left edge and a straight orange wedge; left half now empty. |
| graze | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | One ruled diagonal left; mauve pier is a stack of square weep dabs; wood behind has leopard patches. |
| upinside | 7 | 7 (=) | 7 | 7 (=) | Ring grooves gone, still a flared pipe elbow; left pier shows level dark bands from below. |
| northgraze | 8 | 8 (=) | 8 | 8 (=) | Same picture; dark reveal keeps a level tone step; lit arch gains grey blotches. |
| gableup | 8 | 8 (=) | 7.5 | 7.5 (=) | Faint courses visible; more weep patches, several with square lower edges. |
| archwest | 8 | 8 (=) | 8 | 8 (=) | Left pier boundary no longer level; right pier's orange patch has a ruled vertical edge; pale lens blob on the left stub; flower band through the arch nearly gone. |
| doorview | 8 | 8.5 (+0.5) | 8 | 8 (=) | Slab grid dissolved into turf, pier blocks notched. Lying drum and blocks are still smooth lumps with broad flat faces. |
| buttress | 7 | 8 (+1) | 7.5 | 8 (+0.5) | Camouflage gone: mauve base plus one orange patch. Three vertical arris lines still ruled. |
| rake | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Moss greyer; break chips still rectangular. |
| colcap | 7.5 | 8 (+0.5) | 7.5 | 8 (+0.5) | Flag stripes gone; rings are broken tilted strokes. Silhouette still an exact ellipse on a straight shaft with a ruled light/dark split. |
| topfloor | 6 | 6.5 (+0.5) | 6 | 6.5 (+0.5) | Slab grid half-dissolved, wall tops brushed green, flowers soft stains. Still a plan: straight wall bands, round capitals, hard shadow. |
| above45 | 7 | 7 (=) | 7.5 | 7.5 (=) | Slab grid still a grid at 45 degrees; flowers faded to smears. Unchanged in kind. |
| thruarch | 8 | 8 (=) | 8 | 8 (=) | Sun-patch ring gone. Centre-pier moss still a rectangle with a dark line under it; new rectangular weep cluster on the right pier; far-wall band level. |
| longlens | 8.5 | 8.5 (=) | 8 | 8.5 (+0.5) | Crimson stripe gone, pale-yellow lights on three crown lobes read like ac13, mountain second tone. Cream block still boxy. |
| cornerNE | 7 | 7 (=) | 7 | 7 (=) | Bough now flat dark but still a smooth pipe hoop. |
| wideclose | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Walls calmer; foreground blocks still large smooth lumps; round orange blob on right pier. |
| eastside | 8 | 8.5 (+0.5) | 8.5 | 8.5 (=) | Warm zone now diagonal and patchy, crown lights. Foreground flowers gone, shade lawn empty. |
| nosecol | 8 | 8 (=) | 8 | 8 (=) | Dry-brush gated, blue zones gone; hard rectangular orange panel on the left wall. |
| heapE | 7.5 | 8 (+0.5) | 8 | 8 (=) | Cuboids replaced by chipped lumps with light top and dark side; one box remains bottom left. |
| eaststub | 7.5 | 7.5 (=) | 7.5 | 7.5 (=) | Rubble better; low wall now has blue-grey round blotches on brown (new leopard pattern). |

### 1b. Remaining named views (Q only)

| view | Q c11 | Q c12 | why |
|---|---|---|---|
| vista | 7.5 | 7.5 (=) | Stripe gone but replaced by a faint scatter; flowers nearly absent. Mountains softer two-tone. |
| down | 7.5 | 7.5 (=) | Slab grid dissolved into turf islands; straight-edged ghost quads remain; wall top has square green patches. |
| tree | 8 | 8 (=) | Crown lights back but the biggest cluster sits mid-crown, not at the rim; carpet replaced by small pale drifts. |
| under | 7.5 | 7.5 (=) | Near identical; a few more rim lights. |
| bush | 7 | 8 (+1) | Brown halo and stripes gone, one calm mauve body; white/blue and pink satellite drifts in front. Best single gain. |
| treeW | 8 | 8 (=) | Crown still essentially flat teal (two tiny lights); flower mass at right gone. |
| path | 8 | 7 (-1) | REGRESSION: foreground drift deleted; bare lawn with two dark pads each holding one bloom. |
| pathdown | 6.5 | 6.5 (=) | Confetti replaced by heavy ochre/cream sponge blobs over 30% of frame; reads as lichen. Different defect, same level. |
| meadow | 7.5 | 7 (-0.5) | REGRESSION: thin sparse scatter in tall grass, bottom quarter bare; far woods flat cut-outs. |
| farN | 7.5 | 7.5 (=) | Wood has lit patches again but spread over its face; crown dark. |
| farNE | 7.5 | 8 (+0.5) | Curved second tone on mountains, no facets; near crown has lights. |
| farE | 7 | 7.5 (+0.5) | Crown lights, mountain second tone, wood one body with base band. |
| farSE | 7.5 | 7.5 (=) | Mountain tone better, woods flatter; even. |
| farS | 7 | 7 (=) | Mid wood flattened to one tone; crown gains a few lights. |
| farW | 7.5 | 7.5 (=) | Mountain summit drawn; woods lost lit lobes. Cancels. |
| farNW | 7.5 | 8 (+0.5) | Dune lumps now have a brushed second tone and a summit. |
| village | 7 | 7.5 (+0.5) | Polygon facets behind the steeple gone. |
| castle | 7.5 | 7.5 (=) | Mountain second tone curved; near wood collapsed to one flat dark mass. |
| hillN | 6.5 | 7 (+0.5) | Wood no longer mush, but lit patches are big hard-edged blobs on the lower flank, not the top rim. |
| skyUp | 7 | 7.5 (+0.5) | Pale lights on the sun-side rim of three lobes read like ac13; block bough remains. |
| leaf3m | 7 | 7 (=) | Near identical; stumps still chopped. |
| feet | 7.5 | 7 (-0.5) | REGRESSION: four small clusters at the frame edges, 80% plain lawn. |
| cross | 7.5 | 8 (+0.5) | Three mixed drifts fill the foreground; hand-over visible but covered by standing blooms. |
| wallfoot | 7.5 | 8 (+0.5) | Tan ring gone, walls one calm body; orange patch keeps two level lower edges. |
| shadowT | 7.5 | 7.5 (=) | Crimson gone; the drift crossing the tree shadow turns to khaki pebbles; weed-clump stickers remain. |
| flowers | 7 | 7.5 (+0.5) | Ribbon broken into unequal mixed drifts plus a satellite; still 75% lawn; left end is flat orange streaks. |
| sap | 7.5 | 7.5 (=) | A few lights and navy accents; crown still one dark mass. |
| out0 | 7.5 | 8 (+0.5) | Pink/white standing drift gives a near plane; mountain second tone. |
| out90 | 7.5 | 8 (+0.5) | Crimson carpet gone, crown lights strong. Ribbon dots soft-focus; wood behind is a paper cut-out. |
| out180 | 8 | 7.5 (-0.5) | REGRESSION: white/pink patch gone; faint smears and grey ghost blobs; wood has camouflage patches. |
| out270 | 7.5 | 7.5 (=) | Three flat orange ribbons stacked up the lawn like rugs; wood flat. |
| doorout | 7.5 | 7.5 (=) | Pink/white drift works; muddy brown-pink flat patch by the path. |
| rim | 8 | 8 (=) | Yellow monochrome gone; near carpet is flat dot paint without stems; three hard-edged lozenges in a row mid-distance. |
| rimE | 8 | 8.5 (+0.5) | Crimson carpet replaced by a mixed soft drift that swells and rests; chapel leads again. |
| southfar | 7.5 | 7.5 (=) | Flowers are faint orange stains; five weed-clump stickers remain; crown lights back. |
| pathback | 8.5 | 8.5 (=) | Right crown lights ac13-like, chapel calmer; crimson band at the chapel foot gone, mid lawn bare. |
| lookdown | 6.5 | 6.5 (=) | Unchanged. |
| lookdownS | 6.5 | 6.5 (=) | Unchanged; double-outline tufts. |
| lookdown2 | 6.5 | 6 (-0.5) | REGRESSION: drift lying in cast shadow renders as khaki/mustard blobs (leaf litter); lilac haze smear top left. |
| topTree | 6.5 | 7 (+0.5) | Blooms merge into faint stains, nave grid dissolved, crown lights. Reads as a watercolour plan. |
| topPath | 6.5 | 7 (+0.5) | Confetti and stamps faded to soft stains; flatter and calmer. |
| shade | 7.5 | 7.5 (=) | Walls calmer; otherwise identical. |
| shadeN | 7.5 | 7.5 (=) | Wall stripe gone; weed-clump sticker on the lit lawn; shade grass still a sea of dashes. |
| treeN | 8 | 8 (=) | Dapple dots gone, rim lights and navy accents; arch shade side busy with weep dabs; flower band gone. |
| lowN | 7.5 | 7 (-0.5) | REGRESSION: wood is a flat body with leopard patches mid-face and a separate wavy base band. |
| drift | 6 | 6 (=) | Thin flat ribbon of dots on the slope; far woods are cut-outs. Still an empty wash. |
| teleSE | 7 | 7.5 (+0.5) | Straight facets gone; curved overlapping tones. |
| teleW | 6 | 5.5 (-0.5) | REGRESSION: wood is one flat silhouette over 40% of frame, no interior, no lit top; ruled band through the right bush. |
| mtN | 7 | 7 (=) | Ridge no longer a table; near wood now has camouflage patches. Cancels. |
| mtW | 7 | 6.5 (-0.5) | REGRESSION: mountain better, but both woods are empty flat shapes filling half the frame. |
| shadowG | 7.5 | 7.5 (=) | Foreground blooms varied; mid drift is a flat rug. |

### 1c. Remaining custom cameras (Q only)

| view | Q c11 | Q c12 | why |
|---|---|---|---|
| floordown | 7 | 7 (=) | Slab is nearly all turf; a straight-edged lighter ghost quad remains in the grass. |
| noserubble | 7 | 7.5 (+0.5) | Moss reduced to specks, chipped tops; front block still shows a clean planar face. |
| nosetrunk | 7 | 7.5 (+0.5) | Mountain has a summit and second tone; drift is two flat orange ribbons. |
| upcrown | 7.5 | 7.5 (=) | Boughs flatter; right bough ends in a stump. |
| grasslow | 8 | 8.5 (+0.5) | Pink/white standing drift in front, mixed thinner band, mountain tone. Best meadow frame. |
| zenith | 6.5 | 7 (+0.5) | Lights and navy accents back; several lights isolated. |
| drum | 6.5 | 7 (+0.5) | Slabs are ragged turf islands. Block is still a rounded cuboid with two olive patches on mauve; base rings stair-stepped. |
| crossnear | 8 | 8.5 (+0.5) | Three small mixed satellite drifts fill the foreground. |
| nosegable | 8 | 7.5 (-0.5) | REGRESSION: the white/pink band that worked is gone; small orange drift, emptier. |
| pathnose | 7.5 | 7.5 (=) | Orange-only blooms; far wood a cut-out; mountain tone. |
| underSE | 6.5 | 6.5 (=) | Y bough still straight segments; lights a pasted cluster mid-crown. |
| rimdown | 6.5 | 6.5 (=) | One tiny flat drift on the slope; sapling stickers unchanged; empty. |
| stub1 | 7 | 7 (=) | Lights back as six equal clusters, pasted; club bough unchanged. |
| stub2 | 7 | 7 (=) | Dapple dots on stone gone; crown flat; pipe boughs. |
| floorslab | 6.5 | 6.5 (=) | Comb gone; ruled ghost edges of the buried slab and a ruled cream line instead. |
| floorslab2 | 5.5 | 6.5 (+1) | Comb gone, ragged islands. Drum still an exact ellipse; ghost quad edges; hard sun blob. |

## 2. Means

| set | c11 | c12 | delta |
|---|---|---|---|
| chapel F (31) | 7.81 | 8.00 | +0.19 |
| chapel Q (31) | 7.79 | 7.89 | +0.10 |
| named Q (62) | 7.45 | 7.53 | +0.08 |
| custom Q (36) | 7.32 | 7.47 | +0.15 |
The c11 columns recompute to the published c11 means (7.81, 7.79, 7.45, 7.32), so the comparison is like for like. Still no view at 9 on Q. Four views reach F 9 (hero, front, inside, haloN). Nine views lost points, all landscape or meadow; no chapel view lost points on F or Q.

## 3. What still makes the scene read as 3D/CG (ranked, chapel first)

1. **Free-standing stone pieces are primitives.** Views: drum, doorview, hero, front, low, wideclose, noserubble, floorslab2. The eye catches a rounded cuboid, a half-barrel with stepped rings, an exact disc, and big planar faces. Fix: stop repainting them and change the outline. Displace vertices along the normal with 6-10 cm noise at about 0.5 m wavelength plus one large knocked-off corner per block (clip with a tilted plane); break the top edge into two or three straight chipped runs instead of a uniform fillet; for the drum, squash to an irregular ellipse, remove the ring steps and sink a third of it into turf with an alpha-cut grass strip. Limit each block to light top, mid side, dark side and one crack stroke; no moss patches on faces under 1.5 m.
2. **Capital and shaft are a surface of revolution.** Views: colcap, upinside, inside, haloN. An exact ellipse rim and a ruled light/dark terminator down a perfectly straight shaft. Fix: add an elliptical wobble (radius times 1 + 0.04 sin(2θ + φ) + noise) and a 2-3 degree tilt to the capital mesh itself, chip one bite out of the abacus rim, wander the shaft terminator with the same tangent-space noise used for the wall zones, and bend the shaft silhouette by 1-2 cm noise.
3. **Zone patches end on ruled verticals; weeps are bar-code dabs.** Views: inside, close, nosewall, archwest, nosecol (ruled edges); westwall, graze, treeN, gableup, thruarch (dabs). Fix: evaluate the zone mask in wall-plane coordinates shared across adjacent elements and add a per-element offset to the threshold rather than a hard per-element switch, so a patch may spill 10-30 cm past a pilaster edge. For weeps: gate them to under ledges and sills only, cut the count by about 60%, vary length 3:1, taper the lower end to a point and merge neighbours into one stain.
4. **Top-down and 45-degree views are a model.** Views: above45, high, topfloor. Fix: apply the slab-merge at elevation above 30 degrees as well (it only engages near vertical); fade the ruled ghost quads by giving buried slabs the turf colour exactly, not a lighter tone; break wall-top bands with 30-40% turf cover and a wandering width; replace the projected chapel shadow from above with one soft-edged blob.
5. **Masonry on the lit gable is nearly blank.** Views: front, hero, haloN, frame, gableup. Compared with ac12 the lit wall is one cream wash with a few weeps. Fix: see section 5; draw courses in patches over about 35% of the lit wall with per-block hue jitter, a pale top edge and a dark joint on two sides only.
6. **Flower hand-over is flat rugs; drifts in shadow go khaki.** Views: rim, out270, shadowG, nosetrunk, lookdown2, shadowT, out180. Fix: keep a sparse fringe of standing blooms (10-15% density, shorter stems) along the near edge of every ground-paint drift out to 35-40 m so the paint is always overlapped; break the paint drift's near edge with the same noise as its far edge and dissolve it into the grass colour rather than ending on a contour; in shadow, shift bloom colour toward cooler and darker of the same hue (multiply by the shadow tint) instead of desaturating toward olive; never alpha-fade blooms, drop them by threshold.
7. **Flowers too sparse around the chapel** (ruling a). Views: hero, front, low, pathback, path, meadow, feet. Fix: add drifts within 8-25 m of the chapel on the south and east sides and along the path, restore one foreground standing drift per quadrant, remove dark pads that carry fewer than three blooms.
8. **Woods are cut-outs or leopard skin.** Views: teleW, mtW, out90, pathnose (cut-out); lowN, mtN, hillN, out180, graze (patches). Fix: lit dabs only where the wood's upward-facing, sun-facing normal exceeds a threshold, in three to five clusters along the top third, each dab 1-2% of frame width, scalloped upper contour; a second, slightly darker body tone as two or three big interior shapes; base band as a darkening of the lowest 15% of the same silhouette with a soft upper edge, never a separate strip.
9. **Crown lights misplaced or pasted.** Views: tree, stub1, underSE, zenith, hero; missing in treeW, sap, stub2. Fix: restrict lights to lobes whose centre is on the sun-side half of the crown's screen silhouette and within 20% of the rim; vary cluster size 1:3; cap at three clusters per crown.
10. **Boughs.** Views: cornerNE, underSE, stub1, leaf3m. Tone is flat now; shape is not. Fix: outstanding since c10: taper, one knee per limb, forked ends instead of stumps.
11. **Weed-clump stickers and bloom pads.** Views: southfar, shadowT, shadeN, hero, path, cross. Fix: delete isolated clumps more than 2 m from any other tuft; a dark pad needs at least three blooms.

## 4. Regressions versus critique 11

- path 8 to 7: foreground drift deleted; two dark pads with one bloom each.
- meadow 7.5 to 7: thin scatter, bottom quarter bare, woods as cut-outs.
- feet 7.5 to 7: four small clusters at the edges, 80% lawn.
- out180 8 to 7.5: the white/pink patch praised in c11 is gone; grey ghost blobs; camouflage patches on the wood.
- lookdown2 6.5 to 6: khaki blobs in the cast shadow.
- lowN 7.5 to 7: leopard-patched wood with a separate base band.
- teleW 6 to 5.5: wood is one flat silhouette over 40% of the frame.
- mtW 7 to 6.5: both woods empty flat shapes.
- nosegable 8 to 7.5: the working white/pink band is gone.
- Flowers removed from hero, front, low (left half), pathback (chapel foot), eastside, treeW, treeN; no score lost because the chapel gained, but the subject "flower meadow" is weaker in the hero frames.
- New artefacts: ruled vertical zone edges; square weep dabs at even density; straight-edged slab ghost quads in turf; blue-grey blotches on the low wall (eaststub, rubble); khaki flowers in shadow; grey fading blooms; ochre sponge blobs from above (pathdown); soft-focus dots in distant ribbons (out90, rimE); empty dark pads.
- No chapel view lost points. Frame time improved.

## 5. Closest to and furthest from a real Frieren background

Closest:

1. **longlens (Q 8.5, F 8.5), beside ac13** (`crops/ac13-longlens.jpg`). What separates it from 9.5: ac13's crown is built from hundreds of small leaf marks in four values with sky holes all through it and thin branches visible inside; ours is three or four large flat teal masses with pale clusters added on top, no sky holes in the interior, no branch lines. ac13's trunk has a warm lit side, a cool side and bark strokes; ours is one grey-olive shape with a bent-pipe bough. ac13's gatehouse has every course indicated with per-block hue variation and a mauve shadow side that still shows the courses; our walls are mauve washes with weeps and no courses in shade. ac13's ground has dappled violet shadow on dirt, pebbles and grass fringes at every edge; our lawn is a plain wash. The cream block in front is boxy.
2. **front (Q 8.5, F 9), beside ac12** (`crops/ac12-front.jpg`). What separates it from 9.5: ac12's tower is drawn block by block over most of its lit face, in grey-green with ochre and rust staining at the base and under each string course, crisp pale highlight lines on every arris and buttress offset, dark hairline joints, and stepped buttresses with pale weathered caps; our gable is a single cream wash with faint courses that vanish at this distance, no arris highlights, no offsets, no base staining. ac12's shade faces sit only a little below the lit faces in value and keep their coursing; ours are a much darker flat mauve, a stronger and simpler contrast than the board. ac12's foreground is a continuous flower field filling the lower 25% of the frame, densest and largest in front, mixed yellow/orange/pink/crimson/white, thinning to bands at the horizon; front has none. ac12 has no tree; our crown corner is a flat teal shape with one pasted pale cluster. The blocks at right are smooth lumps; ac12's rubble is a heap of small dark angular stones.
3. **rimE (Q 8.5) and hero / pathback (Q 8.5), beside ac12.** rimE now has the right meadow idea. What separates them from 9.5: bloom marks are uniform round dots, slightly soft, where ac12 has distinct petal shapes in front shrinking to streaks; the drift sits on bare lawn, where ac12's flowers rise out of yellow-green grass strokes with no lawn visible between them; coverage is about a third of ac12's; the chapel is mauve-brown throughout the shade side with no coursing; the wood behind is a flat cut-out. hero additionally has the bare lawn with empty pads and the faceted cream block; pathback has no flowers in the middle distance.

Furthest:

1. **teleW (5.5).** One flat green silhouette with a ruled band; vector layers.
2. **lookdown2 (6), drift (6).** Khaki blobs in shadow; empty wash with a dot ribbon.
3. **topfloor (Q 6.5, F 6.5), mtW, pathdown, floorslab, floorslab2, rimdown, underSE, lookdown, lookdownS (6.5).** Floor plan; empty woods; sponge blobs; ghost slab edges; disc; stickers; segment bough.
