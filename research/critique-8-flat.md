# Critique 8 - flatness audit and re-score

Reviewer stance: independent, same scales and strictness as critiques 5-7. QUALITY 8 = "would
pass as a paused Frieren background for a non-expert", 9 = "would pass next to `refs/ac12.jpg` /
`refs/ac13.jpg`". FLATNESS 10 = "I would believe it was painted on one sheet"; 5 = "a nicely
toon-shaded model"; below 5 = the 3D construction is the first thing I see.

Short answer: this round again bought **quality much more than flatness**, but it is the largest
quality step since critique 4. The wider value range (dark violet-brown shadow walls and reveals
against pale lit stone) and the opaque colour fields are plain wins; the glassy-wash fault of
critique 7 is gone. Chapel Q 6.97 -> **7.15**, chapel F 6.81 -> **6.87**. Two frames reach
**8.5** for the first time (`hero`, `pathback`). The new drawing is good at 15 m and beyond and
goes wrong in three specific ways: (1) on LIT stone the four colour families become equal-value
pastel patches that read as **camouflage** (`haloN`, `gableup`, `rake` all regressed);
(2) slit windows and putlog holes are identical stamps, evenly spread, and at close range are
real little 3D slots with a lit side and a ruled pale frame; (3) the green-ochre foot band has a
constant height and a hard horizontal top on free-standing blocks and reads as a dirt decal.
The stemmed flowers are a real flower field at 6-25 m and planted pins within about 5 m.

## 0. What was rendered and what was opened

- Named views: `shots/c8-<view>.png`, all 85 rendered. **62 opened and scored** (the same 62 as
  critiques 4-7). Rendered but NOT opened: `birds`, `driftE`, `farSW`, `hillSW`, `hillW`, `map`,
  `meadow2`, `mtE`, `out45`, `out135`, `out225`, `out315`, `plainSE`, `stepA`, `stepB`, `teleN`,
  `teleS`, `topN`, `topSE`, `treesW`, `treeW2`, `walkE`, `walkW`.
- Custom cameras: `shots/c8x-<name>.png`, 36 rendered at critique 7's coordinates, all 36 opened.
- 1080p: `shots/c8hd-{hero,front,frame,inside,rimE}.png`, all 5 opened.
- Toggles: `c8m2-hero` (grey model) opened. NOT opened: `c8m2-front`, `c8m2-inside`. No `wobble`,
  `shift`, `tele`, `kuwahara` or `line` toggles were rendered this round; I make no claim about
  them.
- Comparison frames opened: `c7-hero`, `c7-haloN`, `refs/ac12.jpg`, `refs/ac13.jpg`.
- Frame time from `tools/shot.mjs`: 8.2 ms at 720p (last view `driftE`). No shader errors; the
  same single 404 in the console on every load (not investigated).
- Process note: many images had to be opened two or three times because of a tool limit; every
  score below comes from a viewing where the picture was actually displayed.

## Part A - flatness audit of the chapel

### A1. Per-view table (critique 7 -> critique 8)

| View | F | Q | Main remaining 3D cue (or other fault) |
|---|---|---|---|
| hero | 8 -> 8 | 8 -> **8.5** | Pixel-stepped vertical edges on the left arcade pier and the centre low wall; left stub is a box with a sloping lid; centre tilted slab with a constant-height foot band. |
| front | 7.5 -> 7.5 | 8 -> 8 | Left stub is topped by a large sloping slab that reads as a lean-to roof; right-hand block wears the foot band as a horizontal stripe; column is a stack of slightly offset drums. Left wing is one strong dark mass (good, close to too uniform). |
| frame | 8 -> 8 | 8 -> 8 | Chapel reads as painted. Dark plank bough upper right persists (clear at 1080p). |
| inside | 7 -> 7 | 7.5 -> 7.5 | Column is a faceted prism of offset drums; right pier is three stacked blocks; five slits and about seven putlog squares, all one size. Lit gable corner (upper right) is patch camouflage. Shadow wall still mid lilac. |
| westwall | 7 -> 7 | 7 -> 7.5 | Free-standing piers are still prisms (front tone, dark side strip); stair-stepped pixels on the broken arch at right. Reveals are properly dark now. |
| back | 7 -> 7.5 | 7 -> **8** | Best wall in the project: streaks, string course, slits, putlogs, opaque brown and violet fields, dark reveal, green foot. Remaining: thin exact ochre slivers on the buttress arrises; slits are identical rectangles. |
| close | 7 -> 6.5 | 6.5 -> 6.5 | **3D came back in the details**: the slit is a real slot with a lit side reveal and a pale ruled rectangular frame; the putlog hole is a box with a lit side. Long ruled course lines with pale twins plus many drips: no longer dull, now busy. |
| rubble | 6.5 -> 6.5 | 7 -> 7 | Low wall is one dark slanted mass, but its slope is a blocky pixel stair; six slits of one size at one height in a row on the chapel behind; pale polygon rocks. |
| high | 6.5 -> 6.5 | 7 -> 7 | Diorama view; wall thickness. |
| haloN | 7.5 -> 7.5 | 8 -> **7.5** | Flat, but the lit gable is now an equal-value patchwork of pale ochre, grey, green and lilac: camouflage, and milkier than `c7-haloN`. Torn top silhouette is good. |
| low | 7 -> 7 | 7.5 -> **8** | Centre tilted slab is a solid with a flat olive foot band. Dark streaked arcade against lit gable is strong. |
| nosewall | 6.5 -> 6.5 | 5.5 -> 5.5 | Dull dark violet panel, thick wavy joints, ruled dark verticals at both sides, a bluish polygonal patch lower left. |
| graze | 6 -> 6.5 | 6.5 -> 7 | Opaque ochre and grey fields with drips (glass is gone). Two thin ruled diagonal lines across the ochre. |
| upinside | 5 -> 5.5 | 5.5 -> 5.5 | Abacus is an octagon in two flat tones; still a plate on a tube from below. |
| northgraze | 7 -> 7 | 7 -> 7 | Parallel ruled diagonal joints on the right wall; a hairline joint crosses the dark reveal. |
| gableup | 7.5 -> 7.5 | 7 -> **6.5** | Silhouette is a believable slanted tear. The face is large yellow, grey, olive and pink patches of equal value: a camouflage paint job. |
| archwest | 7.5 -> 7.5 | 7.5 -> 7.5 | Two putlog squares at the same height, symmetric either side of the arch. |
| doorview | 7 -> 7 | 7 -> 7.5 | The house-shaped gabled block is still there (left); rubble is opaque with moss, good. |
| buttress | 6.5 -> 6.5 | 6.5 -> 7 | Ruled dark plinth line wraps the corner at one height (reads as an edge loop); opaque brown and violet fields are richer. |
| rake | 7.5 -> 7.5 | 7.5 -> **7** | Washed-out pastel patchwork, low contrast against the sky; wavy pale string line. |
| colcap | 5.5 -> 5.5 | 6.5 -> 6.5 | Octagonal abacus still shows top, side and underside planes; the bell is one tone with a pale dab (better). Camouflage on the gable behind. |
| topfloor | 5 -> 5 | 5 -> 5.5 | Plan view of slab squares, octagon and column circles; slabs are opaque now. |
| above45 | 6.5 -> 6.5 | 7 -> 7 | Diorama; left stub is a wedge-topped box. |
| thruarch | 7.5 -> 7.5 | 7.5 -> **8** | Best close chapel picture: layered opaque paint, streaks, lit scraps. Blocky stepped edge on the mid wall. |
| longlens | 8 -> 8 | 8 -> 8 | Blocky stepped vertical edges on the arcade piers; flat dark plank bough in the foreground. |
| cornerNE | 7 -> 7 | 7 -> 7 | Trunk fills the frame. |
| wideclose | 5.5 -> 6 | 6.5 -> 7 | Foreground low wall is one mass now, but a huge wedge solid with flat facet planes in perspective. |
| eastside | 7.5 -> 7.5 | 7.5 -> **8** | Strong dark streaked wall. Five same-size slits; a flat rectangular brown foot panel with a hard horizontal top on the right pier; stepped pixels left of the arch. |
| nosecol | 6 -> 6.5 | 5.5 -> 6.5 | Notch shadow and doubled joint are gone (one curved joint with a brush accent). Slit on the right wall has a pale ruled outline and a lit reveal: pasted. |
| heapE | 6.5 -> 6.5 | 7 -> 7 | Rocks are opaque two- and three-tone flat polygons: cut paper, angular silhouettes. Foot band on the wall has hard jag shapes. |
| eaststub | 6.5 -> 6.5 | 7 -> 7 | Slope of the low wall is a blocky stair; overlapping pale rectangular panels on its face; polygon rocks. |

Means over the 31 views: **F 6.81 -> 6.87; Q 6.97 -> 7.15.**
F moved on six views only: `back`, `graze`, `upinside`, `wideclose`, `nosecol` +0.5; `close` -0.5.
By range: 20 m and beyond or long lens 7.5-8; 8-20 m eye level 7-7.5; inside the nave 7; nose
range 6.5; low walls and rubble 6-6.5; from above 5-6.5; straight up at the column 5.5.

### A2. Where the new drawing and values make it a more confident painting

- **Value structure** (`hero`, `low`, `pathback`, `eastside`, `rimE`, `back`, `thruarch`,
  `westwall`). Shadow walls are a dark violet-brown mass, reveals are darker and more violet
  again, lit stone is pale and warm. This is the first round where the chapel has a top, middle
  and bottom of the value range, and it is the reason `hero` and `pathback` reach 8.5. Compare
  `c7-hero`: there the arcade was mid grey and the picture was milky.
- **Shadow-side walls** (`back`, `eastside`, `rimE`, `thruarch`): vertical streaks, a string
  course, a few dark slits and a green foot make a wall that looks drawn then painted. On dark
  stone the slits and putlogs sit inside the mass and are not obtrusive.
- **Opaque fields** (`floorslab` 4.5 -> 6.5, `noserubble` 5 -> 6, `drum`, `graze`, `nosecol`,
  `down`): nothing shows through anything any more. Slabs are violet in shade and cream in light
  with a lobed shadow edge. Critique 7's worst fault is fixed.
- **Break lines** (`hero`, `gableup`, `haloN`, `rimE`, confirmed in `c8m2-hero`): tops are slanted
  torn polylines; the voxel look is gone from the big silhouettes.
- **Sky** (`hero`, `front`, `tree`): calm behind the chapel; the building is now the densest
  thing in its own picture.
- **Column at nose range** (`nosecol`) and **capital** (`colcap`, `upinside`): notch shadow and
  doubled joint removed, abacus chamfered. Flatter, not yet flat.

### A3. Where it went wrong

1. **Camouflage on lit stone.** In shadow the four colour families differ in value and read as
   stain and repair. In light they are all pale and nearly equal in value, with angular outlines
   of similar size, so the gable becomes a patchwork: `haloN`, `gableup`, `rake`, the upper right
   of `inside` and `c8hd-inside`, the wall top in `down`, `colcap` background. `ac12` lit stone
   is ONE warm grey with thin vertical streaks and a little ochre low down; it is quiet. This is
   the only group of regressions this round.
2. **Slits and putlogs are stamps.** One slit size, one putlog size, spread evenly: six in a row
   in `rubble`, seven or eight across `rimE`, a symmetric pair in `archwest`. At close range
   (`close`, `nosecol`) each is a recessed slot with a lit side face and a pale ruled rectangle
   round it - a small piece of real 3D with a sticker frame. A painter puts two or three on a
   whole elevation, different sizes, grouped, and paints them as a flat dark stroke.
3. **Foot band as dirt decal.** On walls behind grass it works (`back`, `wallfoot`, `shadeN`).
   On free-standing blocks and piers (`front` right, `hero` centre slab, `low`, `eastside` right
   pier, `vista`) it is the same height everywhere with a hard horizontal top and a flat
   olive-brown fill: a stripe.
4. **Too busy at 3-6 m** (`close`): ruled course lines with pale twins, drips, dashes, slit,
   putlog and patches all at once. No quiet area.
5. **Still a model**: block piles and stubs (`front` left stub with its sloping lid, the tilted
   centre slab, the house-shaped gabled block in `vista`, `doorview`, `rim`, `treeW`, `bush`),
   free-standing piers (`westwall`, `shade`), the wedge of the low wall seen close (`wideclose`),
   everything from above (`topfloor`, `high`, `above45`), capital from below.
6. **Pixel-stepped small edges.** The big breaks are slanted, but pier edges, low-wall slopes and
   broken arch ends still step in hard blocky pixels (`hero`, `longlens`, `thruarch`, `rubble`,
   `eaststub`, `westwall`, `shade`, `eastside`). At 1080p (`c8hd-front`, `c8hd-rimE`) they are
   easy to see.
7. **Rocks** are opaque now but flat-shaded polygons with no brushwork inside (`noserubble`,
   `heapE`, `eaststub`); `noserubble` also shows two small white bracket-shaped artefacts on the
   olive rock. `floorslab2`: the drum top is a faceted disc with moss "continents".
8. **Too dark?** Not yet. The shadow side in `rimE` and `eastside` is at the limit: one
   violet-brown tone with no reflected warm light from the lit ground. Darker would be wrong;
   what is missing is a second, slightly lighter and warmer shadow tone low on the wall.

## Part B - quality re-score

### B1. Named views (C7 -> C8)

| View | C7 | C8 | Note |
|---|---|---|---|
| hero | 8 | **8.5** | Value range, calm sky, standing flower bands. |
| front | 8 | 8 | Lean-to slab, striped foot band hold it back. |
| inside | 7.5 | 7.5 | Stamps and camouflage offset the gains. |
| westwall | 7 | 7.5 | Dark reveals, richer colour. |
| back | 7 | 8 | |
| high | 7 | 7 | |
| vista | 7 | 7 | House-shaped block still there. |
| low | 7.5 | 8 | Daffodil field in the mid-ground works. |
| close | 6.5 | 6.5 | Busy; 3D slot. |
| down | 6 | 6.5 | Opaque slabs. |
| tree | 8 | 8 | |
| frame | 8 | 8 | Near 8.5; plank bough and trees on both sides. |
| under | 6.5 | 6.5 | |
| bush | 7 | 7 | Plinth line wraps piers at one height. |
| rubble | 7 | 7 | |
| treeW | 8 | 8 | |
| path | 7.5 | 7.5 | Foreground pins; mid clump good. |
| pathdown | 7 | 7 | |
| meadow | 7 | 7 | Sparse pins. |
| farN | 7 | 7.5 | Dome-cluster wood caps convince. |
| farNE | 7 | 7 | |
| farE | 6.5 | 6.5 | |
| farSE | 7 | 7 | |
| farS | 6.5 | 6.5 | |
| farW | 7 | 7 | |
| farNW | 7.5 | 7.5 | |
| village | 6.5 | 6.5 | |
| castle | 6.5 | 6.5 | Amoeba caps on the mountain. |
| hillN | 6.5 | 6.5 | |
| skyUp | 6.5 | 7 | Plank boughs remain lower right. |
| leaf3m | 6.5 | 7 | Dotted line gone. |
| feet | 6 | 6.5 | Standing flowers with stems; pin spacing. |
| cross | 7.5 | 7.5 | |
| wallfoot | 6.5 | 7 | Opaque, green foot. |
| shadowT | 7.5 | 7.5 | |
| flowers | 7.5 | 8 | Best flower view. |
| sap | 7.5 | 7.5 | Stripes not visible. |
| out0 | 7 | 7 | |
| out90 | 7.5 | 7.5 | |
| out180 | 7.5 | 8 | Banded field. |
| out270 | 7 | 7 | |
| doorout | 7 | 7 | |
| rim | 7.5 | 8 | Dense yellow field with stems. |
| rimE | 8 | 8 | Dark chapel; foreground pins; empty lime mid-ground. |
| southfar | 7 | 7.5 | |
| pathback | 8 | **8.5** | |
| lookdown | 6 | 6 | |
| lookdownS | 6.5 | 6.5 | |
| lookdown2 | 6.5 | 6.5 | |
| topTree | 6 | 6 | |
| topPath | 5.5 | 5.5 | Banded ground. |
| shade | 7.5 | 7.5 | |
| shadeN | 6.5 | 7 | |
| haloN | 8 | **7.5** | Camouflage on the lit gable. |
| treeN | 7.5 | 7.5 | |
| lowN | 7 | 7 | |
| drift | 6 | 6 | |
| teleSE | 6.5 | 6.5 | |
| teleW | 5.5 | 5.5 | |
| mtN | 5.5 | 5.5 | |
| mtW | 5.5 | 5.5 | |
| shadowG | 7.5 | 7.5 | |

1080p: `hero` 8.5, `front` 8, `frame` 8 (borderline 8.5), `inside` 7.5, `rimE` 8. Same as 720p.
At 1080p the pixel-stepped pier edges, the plank bough in `frame`, the identical slits in `rimE`
and the patchwork on the lit gable in `inside` are all easier to see; the value structure holds.

### B2. Custom cameras (C7 -> C8)

| View | C7 | C8 | Note |
|---|---|---|---|
| nosewall | 5.5 | 5.5 | |
| buttress | 6.5 | 7 | |
| graze | 6.5 | 7 | |
| northgraze | 7 | 7 | |
| gableup | 7 | **6.5** | Camouflage. |
| upinside | 5.5 | 5.5 | |
| archwest | 7.5 | 7.5 | |
| doorview | 7 | 7.5 | |
| floordown | 6 | 6.5 | |
| noserubble | 5 | 6 | Opaque cut-paper polygons. |
| nosetrunk | 7 | 7 | Far flower strip is chunky blocks. |
| upcrown | 7 | 7 | |
| grasslow | 7.5 | 7.5 | Front-row pins, good field behind. |
| zenith | 6 | 6 | Kinked straight-segment bough. |
| rake | 7.5 | **7** | Washed-out patchwork. |
| colcap | 6.5 | 6.5 | |
| drum | 5.5 | 6.5 | |
| crossnear | 7 | 7.5 | Flowers among blades. |
| heapE | 7 | 7 | |
| eaststub | 7 | 7 | |
| topfloor | 5 | 5.5 | |
| nosegable | 7 | 7.5 | Banded field. |
| pathnose | 7.5 | 7.5 | |
| underSE | 5.5 | 6 | Stripes gone; bough has hard elbows. |
| rimdown | 6.5 | 6.5 | |
| stub1 | 7 | 7 | |
| stub2 | 6.5 | 7 | Dotted line gone. |
| floorslab | 4.5 | 6.5 | Largest gain of the round. |
| nosecol | 5.5 | 6.5 | |
| floorslab2 | 4 | 5 | Moss "globe". |
| above45 | 7 | 7 | |
| thruarch | 7.5 | 8 | |
| longlens | 8 | 8 | |
| cornerNE | 7 | 7 | |
| wideclose | 6.5 | 7 | |
| eastside | 7.5 | 8 | |

### B3. Means over the same groupings

| Grouping | C6 | C7 | C8 |
|---|---|---|---|
| 17 views critique 2 scored numerically | 7.09 | 7.24 | **7.41** |
| 62 named views | 6.80 | 6.95 | **7.08** |
| 14 custom break-it cameras (C3 set) | 6.43 | 6.50 | **6.68** |
| 16 break-it cameras added in C4 | 6.09 | 6.22 | **6.66** |
| 31 chapel views of Part A (Q) | 6.76 | 6.97 | **7.15** |
| 31 chapel views of Part A (F) | 6.79 | 6.81 | **6.87** |

Named views: 2 at 8.5, 12 at 8 or above, 26 at 7.5 or above, 43 at 7 or above (critique 7:
0, 8, 22, 39). Custom: `thruarch`, `longlens`, `eastside` at 8. 33 of 98 scored views went up,
3 went down. Worst now: `floorslab2` (5), then `nosewall`, `upinside`, `topfloor`, `topPath`,
`teleW`, `mtN`, `mtW` (5.5).

### B4. Regressions, explicitly

| View | C7 | C8 | |
|---|---|---|---|
| hero | 8 | 8.5 | up |
| front | 8 | 8 | held |
| frame | 8 | 8 | held |
| haloN | 8 | **7.5** | **regressed** (camouflage on lit gable, milkier) |
| pathback | 8 | 8.5 | up |
| tree | 8 | 8 | held |
| treeW | 8 | 8 | held |
| rimE | 8 | 8 | held (chapel better, foreground flowers are pins) |
| treeN | 7.5 | 7.5 | held |
| sap | 7.5 | 7.5 | held |
| out90 | 7.5 | 7.5 | held |
| farNW | 7.5 | 7.5 | held |
| rake | 7.5 | **7** | **regressed** (pastel patchwork) |
| longlens | 8 | 8 | held |
| shadowT | 7.5 | 7.5 | held |

Other regression: `gableup` 7 -> 6.5 (same cause). Flatness regression: `close` 7 -> 6.5 (3D slot
and box putlog). All three quality regressions have one cause, the multi-hue patches on lit
stone.

Claims the pictures do not fully confirm: "stub pile and blocks rebuilt" (the stub is still a
box with a sloped lid, the centre slab still a tilted solid, and the house-shaped gabled block
is still present in five views); "bough fixes" (stripes and the dotted line are gone, but plank
boughs remain in `frame`, `longlens`, `skyUp` and hard-elbowed boughs in `zenith`, `underSE`);
"break lines as slanted polylines" (true for wall tops, not for pier edges and low-wall slopes,
which still pixel-step).

### B5. Standing flowers: flower field, or pins / tulips / confetti?

| Range | Views | Reads as | Why |
|---|---|---|---|
| Eye level, under about 5 m | `feet`, `path`, `grasslow`, `meadow`, `rimE` front row, `out270`, `shade` | **planted pins / toy tulips** | Each flower is a single lollipop on its own straight stem, on bare lime ground, at near-regular spacing and the same height, never overlapping a neighbour, no leaves, no cast shadow. |
| 5-8 m | `crossnear`, `cross`, `low`, `flowers` front | flower field where grass blades stand among them, pins where the ground is bare | The blades are what make it; the flowers alone do not. |
| 8-25 m | `hero`, `frame`, `pathback`, `flowers`, `out180`, `rim`, `nosegable`, `low`, `tree` | **flower field**, the best the project has had | Heads overlap into hue bands (yellow, orange, red, pink, white), stems give green between, saturation is finally near `ac12`. |
| Far (over 25 m) | `nosetrunk`, `southfar`, `longlens`, `back`, `crossnear` far strip, `doorout` | flower band, slightly **chunky** | At the horizon line the heads merge into rectangular blocks 6-10 px wide; reads as a strip of pixels rather than dabs. |
| From above | `pathdown`, `topPath`, `topTree`, `above45`, `high`, `lookdown2`, `rimdown` | dab field, acceptable | Stems are not disturbing from above. Mild confetti where the density is low (`topPath`). |

Verdict: **a flower field like `ac12` at 8-25 m; pins/tulips within 5 m; no confetti except thin
drifts seen from above.** In `rimE` both happen in one picture, with a third problem: flat petal
dabs lying on the ground in the mid drifts next to standing stemmed flowers in front, two
different representations of the same thing 10 m apart. `ac12` never shows a stem: its field is
dabs in bands, the nearest ones larger and overlapping, with a few dark green strokes between.

## Part C - against `refs/ac12.jpg` and `refs/ac13.jpg`

Best three frames: `c8hd-hero`, `c8-pathback`, `c8hd-frame` (with `back`, `thruarch`, `eastside`,
`low`, `rim` level at 8).

- **Drawing.** `ac12` is ruled: every buttress has straight verticals, set-offs carry a cornice
  line with a shadow under it, the door has steps, the interior shows receding piers. Ours now
  has string lines, slits and putlogs, which is a real step, but the lines are few and the
  features are stamps; there is still no set-off, no window surround with depth drawn as two
  lines, no steps. Small edges are pixel-stepped where the board's are ruled. `ac13` hints every
  brick with a dab near edges and leaves the middle of the wall empty; we have neither the dabs
  nor the deliberate emptiness.
- **Value structure.** Much closer. `hero` and `pathback` have the board's three steps. What is
  missing: `ac12`'s openings are dark but you see piers and a stair inside them; ours are flat
  violet. And `ac12`'s shadow side has a lighter, warmer lower zone (bounce from the ground);
  ours is one tone top to bottom.
- **Edge quality.** Boards: ruled edges on architecture, dry-brush broken edges on foliage and
  ground, soft only in haze. Ours: one filtered edge quality everywhere plus stepped pixels on
  small masonry edges. Colour patches on the stone have the same angular edge as everything
  else; none is dry-brushed.
- **Colour.** Shadow stone is now right (violet-brown, green low down). Lit stone is wrong in a
  new way: four pale hues of equal value where the boards use one warm grey modulated by streaks.
  Flowers are now saturated enough. Greens remain our strongest match to `ac13`.
- **Texture.** `ac12`: fine vertical grime everywhere, hairline courses. Ours: good streaks on
  shadow walls, almost none on the lit gable, where the patches do the work instead. Rocks and
  blocks have no interior brushwork at all.
- **Composition density.** Better: sky is calm and the chapel is the densest element. But
  `ac12` gives 55-60% of the frame to empty graded sky and one flat field; our best frames put
  trees at both edges, a path, three flower drifts and mountains in every picture. `rimE` has
  the opposite problem: an empty lime mid-ground with pins on it.

**Does any frame reach 8.5 or 9?** `hero` (720p and 1080p) and `pathback` reach **8.5**; `frame`
is at 8, a plank bough short of 8.5. Nothing reaches 9: beside `ac12` the chapel is still
recognisably simpler in drawing, and the stepped edges and stamp windows would be noticed.

### Top 10 remaining improvements, ranked (largest expected gain marked **[L]**)

1. **[L] Quiet lit stone: kill the camouflage.**
   Where: `haloN`, `gableup`, `rake`, `inside`, `down`, `colcap`, `hero` gable.
   Painter: one warm pale tone for lit stone; hue variation only as thin vertical streaks and
   one or two large ochre stains low down or under ledges; colour families separate in VALUE in
   shadow, not in hue in light.
   Technique: `src/stone.js`: scale the colour-family mix by the light term (full in shadow,
   about 25% in light), merge the lit families to two (base and a slightly darker warm stain),
   stretch the patch mask 1:4 vertically so patches become streak-shaped, and gate it with a
   low-frequency mask so 60% of each lit wall has no patch at all.

2. **[L] Slits and putlogs as painted marks, few and varied.**
   Where: `rubble`, `rimE`, `eastside`, `inside`, `archwest`, `close`, `nosecol`.
   Painter: two or three openings per elevation, different sizes, grouped off-centre; each a
   flat dark stroke with a soft lower edge, no frame, no side face.
   Technique: `src/ruin.js` + `src/build.js`: cut the count by about 60%, randomise width and
   height (1:2.5), cluster them, never mirror across an arch. `src/stone.js`: draw them as a flat
   reveal-colour shape with a brush-noised edge; remove the pale rectangular outline and the lit
   side face; fade putlogs out completely beyond about 12 m and within 3 m.

3. **[L] Near flowers that are a mass, not pins.**
   Where: `feet`, `path`, `grasslow`, `meadow`, `rimE`, `out270`.
   Painter: nearest flowers are larger overlapping dabs in clumps with leaves and dark green
   strokes at the base; no bare ground between; stems barely visible.
   Technique: `src/extra/grass.js`: within 8 m place flowers in clusters of 5-12 with jittered
   height (0.5-1.5x), lean and scale, add a basal leaf rosette or blade tuft card per cluster,
   shorten or hide stems (40% of current), and add a darker ground dab under each cluster.
   `src/terrain.js`: darken and green the ground inside drifts; make the mid-range ground petals
   and the standing cards share one palette and overlap in range so `rimE` has no seam.

4. **Foot band that belongs to the ground.**
   Where: `front`, `hero`, `low`, `eastside`, `vista`.
   Painter: the stain rises irregularly, highest in corners and behind grass, absent on sunlit
   free-standing blocks; its top is dry-brushed upward strokes.
   Technique: `src/stone.js`: vary band height 0.2-1.6 m with low-frequency noise along the wall,
   break the top with vertical `brushStable` strokes, reduce it by about 70% on lit faces and on
   blocks lower than 2 m, and take its hue from the neighbouring grass shadow colour.

5. **Blocks, stub, piers and the house-shaped block.**
   Where: `front`, `hero`, `low`, `vista`, `doorview`, `rim`, `westwall`, `wideclose`.
   Painter: a fallen mass is one light shape and one shadow shape with a ragged top.
   Technique: `src/ruin.js` + `src/build.js`: delete the gabled block or rebuild it as an eroded
   wall fragment; remove the sloping lid on the left stub; lower and break the wedge of the east
   low wall. `src/stone.js`: free-standing pier side faces take the front tone unless in cast
   shadow.

6. **Ruled, antialiased small edges.**
   Where: `hero`, `longlens`, `thruarch`, `rubble`, `eaststub`, `westwall`, `shade`, 1080p set.
   Painter: pier and jamb edges are ruled; broken edges are a few slanted strokes.
   Technique: `src/ruin.js` + `src/build.js`: apply the slanted-polyline treatment used for wall
   tops to pier sides and low-wall slopes. `src/pipeline.js`: find the pass that quantises these
   silhouettes into blocks (wobble mask or Kuwahara on man-made edges) and antialias it.

7. **Something inside the openings, and a second shadow tone.**
   Where: `hero`, `front`, `rimE`, `eastside`, `westwall`.
   Painter: deepest dark at the top of an opening, a lighter interior shape low down; warm
   bounce on the lower shadow wall.
   Technique: `src/stone.js`: in reveals, a vertical two-step (darker above, 0.06 lighter and
   warmer below a noised line); on shadow walls, a second tone below about 2 m near lit ground.

8. **Rocks and drum tops with brushwork.**
   Where: `noserubble`, `heapE`, `eaststub`, `floorslab2`.
   Painter: rounded lumps, two tones, a few dabs along the tone boundary.
   Technique: `src/extra/props.js`: smooth normals, break the light/shadow boundary with
   `brushStable`, add 2-3 interior dabs, noise the silhouette; find the two white bracket
   artefacts in `noserubble`. `src/stone.js`: moss on drum tops as small edge clumps.

9. **Close-range restraint and composition.**
   Where: `close`, `nosewall`, `buttress`; `rimE` mid-ground; `frame`.
   Painter: within 5 m a wall is two tones, three joints and one streak.
   Technique: `src/stone.js`: fade course lines, pale twin lines and drips by 50% inside 5 m and
   drop the plinth line where it wraps a corner. `src/terrain.js`: give the bare lime ground
   between drifts one or two large value shapes. `src/extra/tree.js`: remove the plank bough in
   `frame`/`longlens`, curve the hard-elbowed boughs.

10. **Far flower strips, views from above, mountains.**
    Where: `nosetrunk`, `southfar`, `back`; `topfloor`, `topPath`; `mtN`, `mtW`, `teleW`, `castle`.
    Technique: `src/extra/grass.js`: beyond 30 m shrink and jitter head cards so the strip is
    dabs, not blocks. `src/main.js`: resist pitch below about -40 degrees. `src/extra/far.js`:
    break the amoeba light caps on mountains into ridge-following shapes.

Items 1-3 are the ones I expect to move scores. Item 1 recovers the three regressions and lifts
every lit-gable view by about 0.5. Item 2 is what would let `rimE`, `eastside`, `inside` and
`back` hold up at 1080p. Item 3 lifts every near-ground view by 0.5-1 and removes the one thing a
casual viewer now notices first in `rimE`. Items 1, 2, 5 and 6 together are the path from 8.5 to
9 on `hero`.

## Verdict

- **Does the chapel read as flat / painted from any angle?** No, not from any angle, and this
  round changed that little (F 6.81 -> 6.87). From 10 m outward at eye level, through arches and
  inside the nave it reads as a painting (F 7-8), and with the new value range it is now a
  confident one. It still reads as a model at block piles and stubs, free-standing piers, the low
  wall seen close, from above, and looking up at the capital; and the new slits and putlogs add
  small real 3D at close range. The gain in "painted" came from opacity and value, not from
  hiding geometry.
- **Does the general level match TV-anime background quality?** For a casual viewer, in the best
  40% of views: yes (12 named views at 8 or above, 26 at 7.5 or above, two at 8.5). Beside `ac12`
  or `ac13`: close on `hero` and `pathback`, not equal. Nothing reaches 9. Lit stone is a
  patchwork where the boards are quiet, features are stamped where the boards are drawn, small
  edges are stepped where the boards are ruled, and near flowers are pins.
- Best: `hero`, `pathback` (8.5); `front`, `frame`, `back`, `low`, `tree`, `treeW`, `flowers`,
  `out180`, `rim`, `rimE`, `thruarch`, `longlens`, `eastside` (8).
  Worst: `floorslab2` (5); `nosewall`, `upinside`, `topfloor`, `topPath`, `teleW`, `mtN`, `mtW`
  (5.5).

## Appendix - cameras

All custom cameras are critique 7's (critique 5 appendix, `tools/gshot.mjs`, critique 4 appendix,
critique 3 section 6), rendered with `node tools/dbg.mjs c8x name:pos:look:fov ...`. Named views
with `node tools/shot.mjs c8 all`; 1080p with `node tools/shot.mjs c8hd hero front frame inside
rimE --w=1920 --h=1080`; grey model with `node tools/shot.mjs c8m2 hero front inside --q="mode=2"`.

| Name | pos | look | fov |
|---|---|---|---|
| nosewall | -3.6,1.6,-3.1 | -5,1.5,-3.1 | 40 |
| graze | -5.9,1.6,8.5 | -5.55,3,-9 | 40 |
| upinside | 0,1.6,-2 | 0.01,30,-2.6 | 55 |
| northgraze | -4.2,1.6,-11.2 | 5,4.5,-9.7 | 40 |
| doorview | 0,1.6,-6 | 0.5,1.5,30 | 40 |
| floordown | 0,1.7,-3 | 0.2,0,-3.3 | 50 |
| noserubble | 7.6,0.8,0.6 | 6.6,0.3,-1.2 | 40 |
| gableup | 0,1.6,-4 | 0,10,-9 | 45 |
| archwest | 3,1.6,-1 | -20,1.6,-0.8 | 40 |
| buttress | 7.6,1.5,-11.2 | 5.2,1.6,-9.5 | 40 |
| rake | 6,1.6,10 | -1,10.5,-9 | 14 |
| colcap | 0.5,1.6,0.5 | -2.6,5.6,-3.6 | 30 |
| drum | 2.2,1.2,0.8 | 1.2,0.3,-1.7 | 40 |
| crossnear | -2.6,1.5,17.2 | -4.2,1.2,14.5 | 40 |
| heapE | 10.5,1.4,4.5 | 7,0.3,0.5 | 40 |
| eaststub | 10,1.6,6 | 5,1,2 | 36 |
| topfloor | 0,24,0.5 | 0,0,-0.5 | 45 |
| upcrown | -11,1.7,5.2 | -11,30,3.6 | 55 |
| grasslow | -18,0.25,18 | 0,1.5,0 | 40 |
| nosetrunk | -10,1.6,4.7 | -11,1.6,3.5 | 40 |
| zenith | 20,1.7,20 | 20.01,60,19.5 | 60 |
| nosegable | 1.5,1.6,-7.6 | 1.2,1.8,-9 | 40 |
| nosecol | -1.6,1.5,-2.6 | -2.6,1.6,-3.6 | 40 |
| pathnose | 9,0.6,22 | 10,0,25 | 40 |
| underSE | 18,1.7,18 | 21,8,21 | 55 |
| rimdown | -30,1.7,24 | -40,-6,40 | 40 |
| stub1 | -12,1.7,10 | -6.5,6.5,2 | 30 |
| stub2 | -9,1.6,-2 | -6.5,6.5,4 | 40 |
| floorslab | 1.5,1.7,3.5 | 1.6,0,3.1 | 50 |
| floorslab2 | -1,1.7,1 | -0.8,0,0.6 | 50 |
| above45 | 14,22,18 | 0,3,-3 | 36 |
| thruarch | -10,1.6,-1 | 5,3,-4 | 40 |
| longlens | 30,1.7,50 | 0,5,-4 | 12 |
| cornerNE | 14,1.7,-18 | 0,4,-5 | 32 |
| wideclose | 6,1.6,6 | -2,5,-8 | 60 |
| eastside | 20,1.7,-4 | 0,4,-4 | 32 |
