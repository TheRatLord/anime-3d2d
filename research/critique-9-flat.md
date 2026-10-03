# Critique 9 — flatness after the "restraint round"

Independent critic pass, same method as critique 8. Nothing in `src/` was touched.

## What was rendered and opened

Isolated copy `.work/crit9`. 127 images in `.work/crit9/shots/`:

- `c9-<view>.png` — all 85 named views, 1280x720
- `c9x-<name>.png` — the 36 custom cameras from the critique-8 appendix (same coordinates)
- `c9hd-{hero,front,frame,inside,rimE}.png` — 1920x1080
- `c9m2-hero.png` — grey model
- side-by-side crops against `shots/c8*-*.png` for the arcade piers (eaststub, hd hero), nosewall, thruarch

Frame time 6.86 ms at 720p (driftE). No shader errors. Same single 404 as before.

Every scored image was opened and looked at. Not opened: `c9m2-hero`, `c9hd-hero` full frame (crop only), `c9hd-frame`, `c9hd-rimE`; these are not scored.

Scales unchanged. Q 8 = passes as a paused Frieren background for a non-expert, 9 = passes beside ac12/ac13. F 10 = painted on one sheet, 5 = nicely toon-shaded model.

## 1. Per-view table — the 31 chapel views

| view | F c8 | F c9 | Q c8 | Q c9 | why |
|---|---|---|---|---|---|
| hero | 8 | 8 | 8.5 | 8.5 | Lit gable now one warm grey with streaks. Left stub still a slab with sloped top and dark side face. Arcade pier tone edges still blocky at HD. |
| front | 7.5 | 8 | 8 | 8.5 | Best change. Quiet lit stone, lean-to slab gone. Left stump has a flat lid; two pale boulders right read as cut blocks. |
| frame | 8 | 8 | 8 | 8 | Unchanged in effect. Tree frame carries it. |
| inside | 7 | 7 | 7.5 | 7.5 | Lit gable good. Column is a stack of cylinders with a plate on top. Shadow wall lower half is olive/ochre/blue blobs. |
| westwall | 7 | 7 | 7.5 | 7.5 | Wall top thickness and plinth line still read as extrusion. |
| back | 7.5 | 7.5 | 8 | 8 | Stepped rectangular tone edges on shadow piers still there. |
| close | 6.5 | 7 | 6.5 | 7 | Slits are now flat brushed marks, no pale frames. Shadow-side blotches are the new distraction. |
| rubble | 6.5 | 6.5 | 7 | 7 | Rocks softer, still flat polygon faces. Flower clusters good. |
| high | 6.5 | 6.5 | 7 | 7 | Diorama: wall thickness and plan shape visible. |
| haloN | 7.5 | 8 | 7.5 | 8 | Quiet lit stone works. One stray cream sliver on the left wall top. |
| low | 7 | 7.5 | 8 | 8 | Foot band reads as a painted torn band at this distance. |
| nosewall | 6.5 | 6.5 | 5.5 | 5 | Foot band at nose range is one huge hard-edged olive shape with a spiky top, like a stencil. Muddy. Worse than c8. |
| graze | 6.5 | 6.5 | 7 | 7 | Thin ruled rectangular joint outlines and diagonals reveal the plane in perspective. |
| upinside | 5.5 | 6 | 5.5 | 6 | Abacus is one shade plane now; octagon silhouette and plate-on-tube remain. |
| northgraze | 7 | 7.5 | 7 | 7.5 | Reveals have a darker upper and lighter lower shape. Modest gain. |
| gableup | 7.5 | 8 | 6.5 | 7.5 | Lit stone no longer camouflage. Clear gain. |
| archwest | 7.5 | 7.5 | 7.5 | 7.5 | Symmetric putlog pair gone. Left stump has a dark slot on its top that reads as a real recess. |
| doorview | 7 | 7 | 7.5 | 7.5 | Right stump is eroded, but stands next to a dark box with a flat grey lid. |
| buttress | 6.5 | 6.5 | 7 | 7 | Four ruled vertical facets; plinth line at one height wraps the corner. Shadow blotches. |
| rake | 7.5 | 7.5 | 7 | 7.5 | Quieter lit stone. |
| colcap | 5.5 | 6 | 6.5 | 6.5 | Bright cream triangular wedge on the abacus top; octagon silhouette. |
| topfloor | 5 | 5 | 5.5 | 5.5 | Plan view. Wall thickness, slab side faces, cylinder drums. |
| above45 | 6.5 | 6.5 | 7 | 7 | Diorama. |
| thruarch | 7.5 | 7.5 | 8 | 7.5 | Shadow wall now muddy olive/pink blotches where c8 had lit scraps. Stepped edges on mid wall. |
| longlens | 8 | 8 | 8 | 8 | Foreground bough is a flat plank. Pier tone edges stepped. |
| cornerNE | 7 | 7 | 7 | 7 | No visible change in effect. |
| wideclose | 6 | 6 | 7 | 7 | East wall fall reads as a foreground wedge plane. |
| eastside | 7.5 | 7.5 | 8 | 8 | Slits reduced to about three. The east wall fall is an obvious stair-stepped diagonal. |
| nosecol | 6.5 | 6.5 | 6.5 | 6.5 | Exact vertical lit/shade line on the shaft. Shadow blotches on pier feet. |
| heapE | 6.5 | 6.5 | 7 | 7 | Rocks brushed; pebbles are flat dark hexagon stickers on the grass. |
| eaststub | 6.5 | 6.5 | 7 | 7 | East wall remnant reads as a ramp. Arcade pier edges identical to c8 in crop. |

## 2. Means

| set | c8 | c9 | change |
|---|---|---|---|
| Chapel F (31 views) | 6.87 | 7.00 | +0.13 |
| Chapel Q (31 views) | 7.15 | 7.24 | +0.09 |
| Named-view Q (62 views) | 7.08 | 7.15 | +0.07 |
| Custom cameras Q (36) | 6.81 | 6.88 | +0.07 |

The gain is small and comes almost entirely from the lit-stone fix (front, haloN, gableup, rake, close) and the flower clusters. Two views dropped.

Named views that changed score (others equal to c8): front 8 to 8.5, close 6.5 to 7, under 6.5 to 7, path 7.5 to 8, meadow 7 to 7.5, feet 6.5 to 7.5, cross 7.5 to 8, out270 7 to 7.5, haloN 7.5 to 8, rimE 8 to 7.5, shadeN 7 to 6.5.

Custom cameras that changed: northgraze 7 to 7.5, gableup 6.5 to 7.5, upinside 5.5 to 6, noserubble 6 to 6.5, grasslow 7.5 to 8, rake 7 to 7.5, crossnear 7.5 to 8, nosewall 5.5 to 5, drum 6.5 to 6, thruarch 8 to 7.5.

## Verdict on each claimed fix

| claim | verdict | evidence |
|---|---|---|
| Lit stone quieted to one warm grey with streaks | Landed | hero, front, haloN, gableup, rake, inside gable. Camouflage on lit stone is gone. |
| Slits and putlogs as brush marks | Landed | close, nosecol: flat dark marks, no pale frame, no lit reveal. Counts down, sizes varied. |
| Foot band a wandering torn band | Partly | Fine at distance (hero, low, eastside). At nose range a stencil shape (nosewall). Buttress still has a ruled plinth line at one height. |
| Door piers as eroded stumps | Partly | doorview right stump eroded. hero/frame/front left stub still a slab with a lid. archwest stump has a slot hole on top. |
| East wall a long fall to knee-high footing | Geometry changed, read not improved | Reads as a ramp/wedge (eaststub, heapE, wideclose) and as a stair-stepped diagonal (eastside). |
| Abacus one shade plane | Mostly | colcap still has a bright cream triangular wedge on top. Plate-on-tube octagon remains. |
| Stepped small edges fixed | Not landed | Crops of eaststub and hd hero arcade piers show the same blocky rectangular tone boundaries as c8. Also back, thruarch, longlens, wideclose, rimE, shade. |
| Reveals have interior shapes | Landed, weakly | northgraze, hero, close: darker upper, lighter band lower. |
| Rocks brushed | Partly | Boundaries softer, white bracket artefacts gone. Still flat polygon faces; pebbles are hexagon stickers; drum is a lumpy box with a ruled band. |
| Near flowers are stemmed clusters over dark dabs | Landed | feet, path, meadow, cross, crossnear, grasslow, shadowG, out180. In lookdown2 the dark dabs read as rectangular blobs. |
| Tree boughs curved | Partly | under, skyUp, stub2 curved. underSE still a flat plank with a hard elbow; zenith a straight kinked twig; longlens foreground bough flat; hillN has a dead-straight horizontal branch; treeN fork is two straight sticks. |

## 3. What still makes the chapel read as 3D, ranked

1. **Blocky stair-stepped tone boundaries on shadow stone.** Pixel artefact.
   Views: eaststub, hero (HD), back, thruarch, longlens, wideclose, rimE, shade, shadowG, rubble.
   The eye catches: axis-aligned rectangular steps along the edges of tone patches on arcade piers and shadow walls. They look like a low-resolution lookup, and they stick to the surface so they foreshorten with it.
   Fix: the patch mask is being quantised on a block/cell grid. Sample the mask from continuous noise, then threshold with a brush-warped coordinate (add the brushStable dab offset to the lookup before the step), and widen the step with `fwidth` for a one-pixel soft edge. If the steps come from a block-ID hash in `src/stone.js`, blend across block boundaries with a jittered edge instead of a hard `floor`.

2. **Camouflage has moved to the shadow side.** Geometric regularity / surface-stuck texture.
   Views: close, buttress, thruarch, nosecol, inside (lower wall), wallfoot, bush, archwest, shadeN, shade.
   The eye catches: large olive, ochre, pink and blue blobs of similar size spread evenly over shadow walls and pier feet. They map the surface, so every wall turns as the camera moves.
   Fix: apply the same restraint to shadow stone as to lit stone. One violet-grey base (`#64676E` family), hue variation limited to a few degrees, at most one or two large warm scraps per wall placed by a low-frequency mask, and vertical streaks only. Cut the olive moss term in shadow to the foot band.

3. **Column and capital are stacked primitives.** Facet shading and silhouette.
   Views: inside, nosecol, colcap, upinside, topfloor, front.
   The eye catches: an exact straight vertical lit/shade line down the shaft, offset drums that read as cylinders, an octagonal plate on a tube, and a cream wedge on the abacus top.
   Fix: wobble the shaft terminator in screen space with a low-frequency noise so it is a drawn line, not `dot(N,L)=0`. Force the abacus top and sides into one tone (override the normal with the wall normal for the whole capital). Break the abacus silhouette with two or three chipped corners in geometry, and merge the drums into one shaft with drawn joint lines.

4. **East wall fall and door stubs read as planes and boxes.** Parallax-implying overlaps and silhouette.
   Views: eaststub, heapE, wideclose, eastside, doorview, hero, frame, archwest, shadeN.
   The eye catches: a straight sloping top edge (ramp), a regular stair-step diagonal, flat lids on stumps, a dark box with a plank lid by the door, a slot on a stump top.
   Fix: in `src/ruin.js` make the fall irregular, two or three unequal drops with one upright fragment, not a monotonic slope. Give stump tops a ragged multi-height profile and shade top faces the same tone as the lit side so no lid appears. Remove the box-and-plank prop by the door or replace it with a tilted broken slab. Remove the slot.

5. **Foot band and plinth at close range.** Geometric regularity.
   Views: nosewall, buttress, westwall, graze.
   The eye catches: a hard-edged olive stencil with spiky teeth at nose range; a plinth line at one constant height that wraps the buttress corner; thin ruled joint rectangles in grazing light.
   Fix: fade the foot band's contrast and edge hardness with camera distance below about 3 m, so it becomes two close-valued brushed tones. Break the plinth line into segments with gaps and a height jitter per wall, and stop it at corners. Draw joints as short broken strokes, never as closed rectangles, and suppress them at grazing angles (`abs(dot(N,V))` small).

6. **High and plan views remain a model.** Perspective convergence and visible thickness.
   Views: topfloor, above45, high, floorslab2, down, lookdown, topPath.
   The eye catches: wall thickness as a pale band, slabs with thick extruded side faces, drums as faceted discs, the plan outline of the building.
   Fix: shade all up-facing wall tops in the adjacent wall's tone with a ragged dark crack line down the middle rather than a separate pale plane. Thin the slabs or sink them so side faces are under 5 cm. Paint floor rubble as flat tone shapes with a single shadow stroke. If free camera allows it, consider limiting pitch above about 40 degrees.

Lesser tells: rocks are flat polygon faces and pebbles are hexagon stickers (heapE, rubble, floorslab2); straight plank boughs (underSE, longlens, zenith, hillN, treeN); buttress is four ruled vertical facets; stray cream sliver on the west wall top (haloN); far mountains carry rectangular pale patches (mtN, mtW, teleW unchanged at 5.5).

## 4. Regressions against critique 8

- **nosewall Q 5.5 to 5.** The c8 wall was a dull violet panel with wavy joints. Now the foot band at nose range is one large hard-edged olive shape with a spiky top. It is muddier and reads as a stencil.
- **thruarch Q 8 to 7.5.** The shadow wall seen through the arch lost its lit scraps and gained olive/pink blotches.
- **Shadow-side camouflage.** New location for the patchwork fault that critique 8 reported on lit stone. Costs rimE (8 to 7.5) and shadeN (7 to 6.5).
- **drum Q 6.5 to 6.** Now a lumpy box with a ruled band.
- **Door area.** A dark box with a flat plank lid now sits by the door stump (doorview, shadeN).
- No frame-time regression, no new shader errors.

## 5. Closest to and furthest from a real Frieren background

Closest:

1. **pathback (8.5).** Tree frames both sides, lit gable is one quiet grey, path leads in, shadow arcade is small enough that its blotches merge. Reads as a single painted sheet.
2. **front (8.5; HD checked).** Lit gable with streaks against a clean sky, violet shadow arcade, grass overlapping the wall foot. Only the lidded left stump and the two pale cut boulders give it away.
3. **hero (8.5).** Same strengths as front; the left slab stub and stepped pier edges are the limit.

Furthest:

1. **nosewall (5).** A muddy panel with a stencil-shaped olive band. Nothing in it looks brushed by a hand.
2. **floorslab2 / topfloor (5 / 5.5).** Plan views of extruded slabs and faceted drums. A model seen from above.
3. **mtN, mtW, teleW, topPath (5.5).** Long-lens mountains with rectangular pale patches and a bush mass of uniform blob size; topPath is a diorama. Unchanged since c8.
