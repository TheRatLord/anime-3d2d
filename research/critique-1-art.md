# Art-direction critique 1: does it pass as a Frieren background board?

Reviewed 2026-10-01. Hex values quoted for our renders are eyeball estimates from the PNGs, not sampled; treat them as +/- 10%.

Views rendered and examined (32): hero, front, inside, westwall, back, high, vista, low, close, down, tree, frame, under, bush, rubble, treeW, path, pathdown, meadow, farN, farSE, farNW, farE, farW, village, castle, skyUp, leaf3m (all `shots/crit-<view>.png`), plus three custom viewpoints (`shots/critA-seq.png` standing and looking straight down at grass at (-20,20); `critB-seq.png` looking east from (20,-10); `critC-seq.png` looking steeply up at the gable from inside) and `shots/critm2-hero.png` (mode=2 plain geometry).
Reference boards compared: ac12 (ruined church), ac13 (castle gate), ac15 (bridge), ac7 (cliff), sheet.

---

## 1. Verdict

| | View | Score /10 |
|---|---|---|
| Best | `treeW` (tree in front of the west wall), closely followed by `frame` and `tree` | 5.5 |
| Typical hero composition | `hero`, `front`, `low` | 4.5 |
| Worst | `down` (top-down on the paved floor) and `close` (nose to the wall) | 2 |
| Worst outdoor/landscape | `farN`, `meadow`, `farW` (looking away from the chapel) | 2.5 |

Nothing would be mistaken for a Wyeth board. The best views read as "nice stylised indie game with a painterly filter"; the palette and the big tree are doing nearly all the work. The three things that give it away within one second, in every view containing them, are: (a) the chapel is visibly built from axis-aligned boxes, (b) stone is a flat periwinkle fill with a uniform decal of streaks and hairline vector joints, and (c) everything beyond 100 m dissolves into a smooth milky fog with sticker-like forest blobs and low-poly mountains.

---

## 2. Ranked problems (most damaging first)

### 1. The chapel silhouette is stacked cuboids ("voxel ruin")
- Seen in: hero, front, low, frame, back, high, rubble, skyUp, critC; confirmed in critm2-hero.
- What is wrong: every broken edge is a staircase of right-angled blocks 0.5-1.5 m across, all axis-aligned, all with pristine planar faces and ruler-straight arrises. The gable top in `hero`/`front` is literally a pixel-art stair. The loose "fallen" blocks are perfect boxes up to 2 m x 2.5 m (the pale monolith that fills the centre of `low` and the right of `front`), bigger than any real ashlar. Column drums are 8-12 sided prisms with visible facets (`vista` foreground, `down`).
- Reference: ac12. The broken tops are ragged diagonal and curved profiles, with small stones (15-30 cm) chewing the edge, leaning fragments, a rounded eroded cap, and no two breaks at the same angle. The tower has buttresses with set-offs, string courses, hood moulds over arches, splayed window reveals: the outline has dozens of small steps of different depth, not a few large equal ones.
- Fix:
  - Subdivide break-edge blocks to 0.2-0.45 m (course height 0.25-0.3 m, length 0.3-0.7 m) and remove them along a noise-defined diagonal/curved break line rather than per whole large block. Rotate each edge block by 2-6 degrees on random axes and offset 1-4 cm.
  - Vertex-displace all masonry in the vertex shader: along the normal by `(fbm(worldPos*1.3)-0.5)*0.06 m` and chamfer/wobble silhouette edges by `sin` + noise of 1.5-3 cm amplitude at 0.4-1.2 m wavelength so no edge is straight for more than about 80 px on screen.
  - Delete or shrink the giant monoliths: no free-standing block over 0.9 m. Replace with heaps of 8-15 angular stones 0.2-0.6 m, three tones each (top light, side mid, side dark), as in ac7's rubble.
  - Add the missing architectural articulation: 2-stage buttresses with sloped set-offs, one projecting string course at the arch springing and one under the gable windows (10 cm proud), a hood mould around each arch.
  - Columns: 24+ segments, or keep low-poly and do the shading per-pixel from a smooth analytic normal.

### 2. Stone shadow is a flat, saturated periwinkle that covers most of the building
- Seen in: hero, front, inside, westwall, back, low, bush, close, vista.
- What is wrong: about 60-75% of the chapel's screen area in most views is one flat fill of roughly `#7C7FA6`-`#8587AE` (H ~235, S ~0.25, V ~0.66). It is too blue, too saturated, too uniform and too light to be a shadow plane, and it has no darks inside it. The lit side (about `#D9CFA8`) is ochre-yellow rather than the reference's grey. The building reads as "lavender plastic with yellow patches". In `back` the entire north face is a single lavender slab.
- Reference: ac12 lit stone `#CFD2C3` (slightly green-warm grey), shadow `#64676E` (near-neutral cool grey, S ~0.09), deep recess `#323639`, wall one plane back `#959BA9`. The mauve/periwinkle shadows of ac13/ac15 belong to warm sandstone and open shade under trees, not grey ruin stone. In ac12 the shadow side also grades: warmer and paler toward the ground (bounce), greener at the base, darker under ledges.
- Fix:
  - Shadow base `#6E7280`, with a vertical gradient: `mix(#7F7A80 (warm low), #666C7C (cool high), smoothstep(0, 6 m, y))`. Cap shadow saturation at 0.14 for this stone.
  - Lit base `#D2D3C4` with per-block hue jitter toward `#DDD2B4` (warm) / `#C4CCC8` (cool) / `#C6CFAE` (greenish), only +/- 4% value.
  - Add a third, darker tone used sparingly (5-8% of stone area): `#3A3F46` in arch soffits, window reveals, under ledges, the bottom 20 cm of wall contacts and inside cracks. Right now the darkest stone value is about Y 0.47; the reference goes to Y 0.2.
  - Add a fourth, pale tone `#E9E8DC` as a 2-3 px light line on sun-facing top arrises.

### 3. Stone surface treatment reads as a tiled decal: uniform streak stamps + hairline vector joints
- Seen in: close (worst), bush, low, front, inside, westwall.
- What is wrong:
  - The "brush marks" are one stamp shape (a vertical teardrop streak, 20-60 px tall) scattered at even density over every stone face, same contrast everywhere, lit and shadow alike. On the big blocks in `low`/`front`/`bush` it reads as a seamless grunge texture. At close range (`close`) the marks stay the same screen size and become soft grey blobs on a blank lavender card: there is no finer level of information, so the surface looks like an untextured 3D face with a noise overlay.
  - Joints are 1 px, constant-width, perfectly straight dark hairlines with square corners and L-shaped fragments, plus visible dotted segments (`close`, upper left and right) which look like a dashed CAD line. They read as wireframe/circuit traces, not paint.
  - Large pale cloudy blotches (`close`, `bush`) have smooth, low-frequency vector-blob outlines.
- Reference: ac12 tower. Joints appear in patches covering about 30-40% of the wall, drawn with a loaded brush: 1-3 px, wobbling, thicker at the block corners, coloured (`#5B5560`-ish, not near-black), often replaced by a light line on the upper edge of a block. Between them the wall is a wet wash with long soft vertical rain stains (0.3-2 m long, concentrated under ledges and window sills, not everywhere), a few individually tinted blocks, chips at corners. ac7 shows the dry-brush: long parallel bristle drags following the strata, with large rest areas.
- Fix:
  - Joints: draw in the shader from the block-grid distance field, width `mix(1.0, 3.0, noise)` px, displaced by `noise(worldPos*6)*1.2 cm`, colour `#5A5666` in shadow / `#8C8778` in light, alpha masked by a low-frequency patch mask (`fbm(worldPos*0.35) > 0.55`) so about 35% of the wall shows coursing. Remove the dotted pattern entirely. On lit faces replace half the joints by a `#EEEDE2` highlight on the block's top edge.
  - Streaks: remove the uniform scatter. Emit rain stains only below features (sills, string courses, wall tops, broken edges): length 0.4-2.0 m, width 3-12 cm, colour `#A9AE9E` on lit / `#5C606C` in shade, soft at the bottom, hard at the top. Target under 15% coverage, zero on at least half of each large face.
  - Add a second, finer mark scale that fades in below about 6 m distance (bristle drag, the `uBrush.B` channel, 2-4 px wide, anisotropic along world-up) so close-ups have paint handling; and fade the medium dabs out below 3 m.
  - Per-block tint: 1 block in 6 shifted in value by +/-6% with a hard edge on the block boundary.

### 4. The far landscape is a smooth fog gradient: no value planes, no plane alternation
- Seen in: vista, path, farSE, village, farW, farE, farNW, meadow, critB.
- What is wrong: everything beyond the hilltop sinks into a continuous milky white-green (`#D9EBD9`-`#E6F1E6`) that looks like a real-time exponential height fog, which is exactly what it is. In `vista`/`farSE`/`village` 60% of the frame is one near-white, featureless value with a soft continuous gradient: it reads as a lake of mist or an unfinished render. Hill bases dissolve with an airbrushed soft edge (`farN`, `farW`, `meadow`: the hill appears to float). The band structure the spec calls for (section 5: quantised planes) is absent.
- Reference: ac13. The wooded hill directly behind the tree is fully saturated and mid-value (`#93AA6C` lit, `#457846` shadow, Y 0.4-0.65), with a crisp painted edge against the paler grey mountain behind, which in turn has a crisp edge against the white horizon. Three flat, clearly separated value steps. Haze appears only as a thin pale band at the foot of the hill (a few percent of frame height), with a brushed, not airbrushed, edge. ac12: the far meadow is a hard-edged pale green strip `#AED19F`, not fog.
- Fix:
  - Cut baked `atmo` amounts roughly in half for anything under 400 m. Targets: hills at 100-250 m `#93AA6C`/`#457846` mixed no more than 15% toward `#E8F4EE`; 250-600 m about 35%; ridges 50-60%; mountains 70%.
  - Quantise the atmosphere amount per object into 4-5 steps (it is baked per object already, so just snap it) and do not let the height fog draw a smooth vertical gradient across a hill. Replace the height term with a painted mist band: a noisy threshold `smoothstep(h0 + fbm(x*0.02)*8 m, h0 + 12 m, y)` giving a firm, wobbly, slightly lobed upper edge and a band at most 4-6% of frame height.
  - Give the valley floor an actual painted design: 3-4 flat horizontal strips of alternating pale green `#C3DDA8`, yellow `#DDE7A0`, tree-line teal `#8DB39A` with firm edges, shrinking in height toward the horizon. Currently it is blank.

### 5. Mid-distance forest masses are amoeba decals on the hills
- Seen in: farN, farW, farNW, meadow, castle, farE, rubble (right), hero/frame (right background), critB.
- What is wrong: woods on the hills are flat mid-green (`#6E9E72`) blobs with smooth, rounded, lobed outlines like spilled liquid or lichen; a uniform peppering of identical light dabs inside; no shadow side, no trunks, no individual crown tops against the sky, and they follow the ground like a projected texture (in `farN` the blob has holes that look like a cut-out layer). The small free-standing trees are identical lollipops: one round crown shape with 2-3 pale oval dabs, repeated at one scale in tidy rows (`farW` bottom right, `meadow` centre), each with a little grey drop shadow ellipse. This is the most clip-art-looking element in the project.
- Reference: ac13's hill. The wood is built from distinct overlapping crown shapes of varying size, each with a yellow-green lit cap (`#A9C46E`) on the sun side and a dark teal underside (`#3F6E4C`), darker accents where crowns overlap, pale rock outcrops and bare grass patches breaking the mass, and a silhouette of bumpy crown tops along the ridge. ac15's distance: flat teal-grey tree silhouettes `#79A2A1` with visible trunk verticals.
- Fix:
  - Build each wood from 40-150 overlapping crown billboards/ellipsoids of radius 3-9 m (log-normal sizes), not a ground-projected mask. Each crown: 2 tones split by a noisy sun-facing step (lit `#A3BF6C`, shadow `#4C7A52`), plus a dark base accent `#335C4C` on the lowest 25%. Silhouette from a leaf-cluster alpha so the ridge line is bumpy at 3-6 px scale.
  - Vary lone trees: at least 5 silhouettes (tall, spreading, double-crowned, leaning), scale 0.6-1.6, no straight rows; cluster them 3-7 with overlap; remove the drop-shadow ellipse beyond 150 m and replace with a single dark teal stroke at the base.
  - Remove the even speckle of light dabs; put light marks only on the upper-left (sun side) third of each crown.

### 6. Mountains are low-poly meshes with flat-shaded triangles
- Seen in: tree, farNW, westwall, inside, farN, castle, hero (behind the left tree).
- What is wrong: the ranges show large straight-edged triangular facets in two or three greys with crisp creases: unmistakably a few-hundred-triangle mesh with a toon step. The peaks are symmetrical pyramids. The lilac-grey lower range (`#B5B4C8`) is violet rather than neutral.
- Reference: ac13's far mountain is one soft pale grey shape (`#C0CACA`, S 0.05) with a slightly darker, soft-edged shadow wash and a few broken darker dry-brush marks, a gently irregular rounded ridge line, no facets. Spec 5.2: "far mountains are a single value with a faint second tone".
- Fix: shade mountains without the geometric normal. Use one flat colour per range (`#C6CFCF`, `#B4C6CC`, `#A3BBBF` nearest) plus a single shadow tone only 5-7% darker, placed by a noise-warped large-scale light direction test on a smoothed normal (or by an fbm ridge mask in object space), with a soft brushed edge. Add 1D noise displacement to the ridge silhouette (amplitude 15-40 m, wavelengths 200 m and 60 m). Remove the violet cast.

### 7. Paved floor is a regular grid; top-down views collapse completely
- Seen in: down (worst frame in the set), high, vista, front.
- What is wrong: equal square slabs about 1.4 m on a perfect grid, each an extruded box with a dark outline, separated by continuous bright teal-green grout lines (`#4E9B78`) of constant width. It reads as a chessboard/game tile map. There is also a stray saturated red/pink L-shaped line in the grout at lower left of `down`, which looks like a debug colour or a flower-colour leak; fix it. Moss on the fallen drums and wall top is flat two-tone camouflage blobs (`#5E9A66` / `#B9D873`) with vector outlines.
- Reference: none of the boards shows a regular clean grid. ac13's ground and sheet's plaza board: paving is irregular, joints are broken lines, slabs differ in size, large parts are just a wash with dirt and grass creeping in from the edges.
- Fix: randomise slab size (0.5-1.8 m, running-bond or random ashlar pattern, not a grid), rotate the whole floor field a few degrees off the wall axis or skew individual slabs 1-3 degrees, drop 25% of slabs (grass/dirt shows through), sink and tilt others 1-4 cm. Grout: not a green line; use dark `#575B66` broken joints with grass tufts and moss only in patches (30% of joint length). Moss colour toward `#7E9A6A` / `#A9BC7C`, with a ragged dabbed edge using `uBrush.R` at 6-10 px, concentrated at bases and north faces only.

### 8. Ground plane: flat yellow-green with angular stamp patches; sparse identical tufts; nothing at ground contacts
- Seen in: critA (standing, looking down), pathdown, high, meadow, back, tree.
- What is wrong: seen from above or at one's feet, the grass is a nearly uniform `#DDEB8C` field with big overlapping, hard, straight-edged rectangular/rhomboid patches a few percent lighter/darker: the square footprint of the brush texture is visible (`critA`, `pathdown`). Tufts are tiny identical 3-blade fans, widely spaced, dark teal on bright yellow, like scattered icons. Objects (cross, blocks, tree trunk, wall bases) sit on the ground with no dark contact stroke and no grass fringe overlapping them; in `tree` the gravestone and the wall just end on a clean line.
- Reference: ac13: the grass is a pale wash, but along every boundary (path edge, wall foot, shadow edge, tree base) there is a dense fringe of short dark upright strokes and, at the bottom of the frame, a dark band of tall tufts in `#305757`/`#495647` (the repoussoir). ac15: the whole foreground third is layered dark grass and weeds with a few light blades on top.
- Fix:
  - Mask the brush stamps with a soft, noise-warped alpha so no straight stamp edge survives; elongate ground marks horizontally in screen space (aspect 4:1) rather than square.
  - Add a contact band to every static object: a 15-30 cm wide ring of dense grass cards (blade height 15-35 cm) in `#4F8A6A` / `#305757` at the base, plus a dark occlusion stroke on the object's lowest 5-10 cm (`#3A3F46` on stone).
  - Near-camera foreground band: within 6 m of the camera, raise tuft density about 4x and height to 30-50 cm, colours `#599E80` mid / `#305757` dark with 10% light blades `#DCED86`. This gives every walking-height frame the dark bottom edge the boards have.
  - Tufts: at least 6 silhouettes, 5-11 blades each, with bent and crossing blades; scale jitter 0.6-1.8.

### 9. Flowers are confetti in the wrong palette, and turn into pastel stains at distance
- Seen in: low, hero, rubble, westwall, treeW, high, farSE, meadow, farNW.
- What is wrong: near flowers are evenly sized (about 6-8 px) pink/blue/lilac plus-shaped dots, uniformly scattered at even density like sprinkles, floating above the grass with no stems/leaves and no clumping by species. The dominant hues are lilac and cornflower blue (`#A9A0E0`, `#6F8BE0`), which combine with the lavender stone to push the whole picture toward a pastel purple the boards never have. At distance they become flat pink (`#EFBFCB`) and lilac (`#C9C8E6`) patches with a camouflage outline on the pale ground (`farSE`, `meadow`, `high`), which look like spilled paint.
- Reference: ac12. Flowers are warm and saturated: yellow `#F9E487`, orange `#F0A050`, pink-red `#E8708A`, white, on a yellow-green base. Foreground flowers are distinct multi-petal blobs 8-14 px with dark green leaf strokes between them; with distance they merge into thin horizontal colour streaks/bands that get shorter and paler, ending in a crisp pale band. Clumped by colour: a red drift, a yellow drift, mixed in between.
- Fix: palette 45% yellow `#F9E487`, 20% white `#FFFDF2`, 20% pink `#E8708A`, 10% orange `#F0A050`, at most 5% lilac `#B7A5DC`; drop the blue. Cluster by colour using a low-frequency noise per species (drift size 3-10 m). Near size jitter 0.5-2.0x with 3-4 blob shapes; add dark leaf strokes `#5E9A58` under clusters. Beyond 40 m, render drifts as horizontally stretched streaks (screen-space aspect 6:1-12:1, height 2-4 px) rather than area patches; fade fully out by 150 m rather than leaving pink blotches in the haze.

### 10. Cast shadows: stippled pixel-noise edges on stone, saturated flat teal on grass
- Seen in: westwall, bush, close, down, front (stone); back, path, bush, treeW (grass).
- What is wrong: on stone, shadow boundaries break into a spray of small detached specks 2-5 px across (`westwall` upper left, `bush`, `close` lower left): thresholded noise, not a brush edge. It reads as dithering or JPEG mosquito noise. On grass the shadow is a single flat `#3E9C80`-ish teal: more saturated and much lighter than the reference, with a clean vector outline (`back` foreground, `path` beside the wall), and it has no light holes or dark accents.
- Reference: ac13: the tree's ground shadow is a mass with a firm, lobed, brush-shaped edge, and soft-cornered light patches inside (3-8% of frame width); on grass it is `#305757`-`#495647`, on the path `#7E6881`. ac15: dapples on the bridge are large rounded patches, no speckle.
- Fix: threshold the blurred shadow map against a low-frequency noise only (feature size 12-30 px, amplitude enough to move the edge +/- 8 px), and remove the high-frequency term so no island smaller than about 10 px survives (or apply a 3x3 majority/median on the shadow mask). Grass shadow colour `#4C7C6A` at the edge darkening to `#35605A` 0.5 m inside; add a 2-3 px slightly more saturated rim `#3F8474` on the edge. Put grass-blade strokes across the shadow edge so it is not a clean curve.

### 11. No deep accents and no ambient-occlusion strokes: the value range stops at mid-grey on everything but leaves
- Seen in: all chapel views; `inside` and `front` especially.
- What is wrong: the only values below Y 0.35 in the picture are the navy leaf dabs. Arch soffits, window openings, the gap between stacked blocks and wall bases are the same lavender as the open wall. Depth inside the building is unreadable (in `inside`, the arch reveals and the wall face are the same value; in `front` the interior piers merge into one lavender mass).
- Reference: ac12: arch interiors and the doorway are the darkest shapes on the board (`#323639`), and the wall seen through the arch one plane back is paler and bluer (`#959BA9`); this light/dark/light stacking is what gives the ruin depth.
- Fix: add a baked or analytic occlusion term for masonry (distance to nearest concave edge, or a vertex attribute): where `ao < 0.35` and not sunlit, use `#3A3F46`; where the wall is more than about 8 m further than the nearest chapel surface in view (interior far wall seen through an arch), lift toward `#959BA9`. Step these; do not gradient them.

### 12. Leaf dabs: one size, one shape, evenly spread; branches are straight tapered tubes
- Seen in: under, leaf3m, hero (left crown), high, skyUp.
- What is wrong: the trees are the strongest element, but up close the crown is a mosaic of same-size polygonal chips (about 25-40 px in `leaf3m`) in four flat colours with equal area each; it reads as a cut-paper collage. From above (`high`) the crowns are evenly speckled. The trunk and boughs are smooth cones with straight edges, a ruler-straight cream rim-light stripe of constant width down one side (`under`, `leaf3m`), and CG Y-junctions; the thin branches are perfectly straight sticks.
- Reference: ac13 tree: leaf marks vary 3:1 in size; the interior is a continuous dark mass with few marks; light leaves are grouped in clear clusters at the top and outer edge of each bough; the trunk leans, swells at the base and at forks, has broken bark strokes in olive/violet/grey and an irregular light edge; branches kink.
- Fix: leaf card scale log-normal (0.5-2.2x); merge the mid tone into larger coherent masses (cut mid-tone dab density by half in the crown interior so the dark base shows as one shape); restrict the lightest tone `#CFE27A` to the top 30% of each cluster on the sun side; navy `#263F64` under 8% of crown area and only on undersides. Trunk: displace radius by `1 + 0.12*fbm(y*0.8, angle*2)`, add flare at the base (x1.5 at ground over 0.6 m), add 2-3 degree kinks every 1-1.5 m on branches; break the rim light with a noise mask (40% dropout, width 2-8 px varying).

### 13. Low dry-stone wall and path-side props are box stacks placed dead centre
- Seen in: hero, frame, path, pathdown.
- What is wrong: the low wall leading in from the bottom of the hero frame is a row of flat rectangular slabs with uniform grey-green tops, like stepping stones or a stack of paving. It sits in the centre foreground, competing with the path and pointing at nothing. Path pebbles are identical two-tone wedges (`pathdown`), evenly spaced.
- Reference: ac13: the low wall is a continuous horizontal band with a pale top line, small irregular stones hinted in patches, grass against its base; it runs across the frame and separates planes rather than leading in.
- Fix: rebuild as a continuous wall 0.5-0.7 m high from irregular stones 15-40 cm (or a single displaced mesh with painted joints, per problem 3), with a sagging top line and collapsed sections; move it to run alongside the path at 2-3 m offset or across the slope. Pebbles: 5 shapes, sizes 3-15 cm, clustered at the path edges, colour `#C9B7A6` with a small violet shadow stroke `#8E7A8C`.

### 14. Composition from eye height: no foreground frame in most directions
- Seen in: back, farSE, vista, path, meadow, farW, village.
- What is wrong: looking away from the chapel, most frames have nothing dark and near: a pale foreground, a pale middle and a pale sky. Median luminance is far above even ac12's 0.83, with no value below about 0.5 in whole frames (`farSE`, `village`).
- Reference: ac13 and ac15 both carry a dark tree mass on one side plus a dark grass band at the bottom; ac12 gets its weight from the dark arch interiors and a saturated flower foreground.
- Fix: beyond problem 8's camera-relative foreground band, plant 6-10 bushes/saplings and 2-3 more large trees around the hilltop rim (radius 35-55 m) so that any 60-degree view has at least one near dark shape; add tall weed clumps (0.6-1 m, `#305757`/`#599E80`) at intervals of 8-15 m.

### 15. Distant village, castle and cumulus are flat vector icons
- Seen in: village, castle, farE, vista (cloud at right), farW (cloud behind hill).
- What is wrong: the castle and houses are clean flat polygons with perfectly straight edges and uniform fills, like a board-game illustration; the cumulus puffs are smooth circle-union shapes with a flat lilac underside (`#D5DAEA`). Under a 14-degree lens they have no paint handling at all.
- Reference: sheet (harbour-wall and coast boards): distant buildings have wobbly edges, a broken darker roofline, patchy wall tone, tiny dark window dabs; spec section 3: clouds should be thin soft wisps with one firm lit edge. The streak cirrus here is acceptable; the cumulus is not.
- Fix: perturb building silhouettes by 1-2 px noise in screen space, add a 2-tone patch mask to walls and roofs, one dark accent under each eave; remove the round cumulus or replace it with the streak type; soften cloud undersides to `#E3ECF3`.

---

## 3. What works and should be protected

- **Sky wash**: hue and gradient (cyan `#8FD3F2` to near-white horizon) match ac12/ac13 well; the streak cirrus has plausible dry-brush edges. Keep the subtle paper mottling.
- **Near tree crowns at 10-35 m** (`treeW`, `tree`, `frame`, `skyUp`): jagged leaf silhouette, sky holes, stray leaves, hue rotation from yellow-green through teal to navy. This is the closest thing to the reference in the scene (compare ac13's tree). Only refine per problem 12.
- **Dappled light on the walls** (`treeW`, `hero`): large, sparse, warm patches inside the shadow mass are the right idea and the right scale; only the speckled edge and colours need work.
- **Dirt path** (`path`, `frame`): pale pink-beige with directional streaks and a grass fringe along the edge is on-model for ac13.
- **Hard two-tone light logic and the absence of black, specular and smooth gradients on near objects.**
- **Grass fringe along the path edge** and the lit grass colour (`#DCED86` family).
- **Framing of `frame`/`hero`**: tree left, tree right, ruin centre is a legitimate board composition.
- **Frame time** (about 4.3 ms) leaves plenty of budget for the fixes above.

---

## 4. Views where the illusion breaks worst

1. `down`: tile-grid floor, green grout, camouflage moss, faceted drums, stray red line. Reads as a game level editor.
2. `close`: blank lavender card with blob noise and dotted hairlines; no paint at close range.
3. `farN`, `farW`, `meadow`: amoeba forest decals, lollipop trees, airbrushed fog at hill bases.
4. `farSE`, `village`, `vista`: 60% of the frame is featureless white-green fog; clip-art village.
5. `critA` (standing, looking at one's feet) and `pathdown`: rectangular brush-stamp patches, icon tufts.
6. `low`, `front`, `bush`: giant pristine cuboid blocks filling the frame with tiled streak texture.
7. `back`: whole face of the chapel is a single lavender slab; flat teal vector shadow in the foreground.
8. `inside`: no value separation between near piers and far wall; low-poly mountains through the arches.
9. `under`, `leaf3m`: straight conical branches with a ruler rim-light, cut-paper leaf chips.
10. `high`: floor grid, voxel staircase silhouette, lilac flower stains, speckled crowns from above.
11. `castle`, `tree`, `farNW`: faceted low-poly mountains.
