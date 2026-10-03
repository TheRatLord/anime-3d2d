# Art-direction critique 2: does it pass as a Frieren background board?

Reviewed 2026-10-01, second pass. Same scale as critique 1. Hex values quoted for our renders are eyeball estimates from the PNGs (no pixel sampling was possible in this session), treat as +/- 10%.

Views rendered (all `shots/crit2-<view>.png`, 1280x720): hero, front, inside, westwall, back, high, vista, low, close, down, tree, frame, under, bush, rubble, treeW, path, pathdown, meadow, farN, farNE, farE, farSE, farS, farW, farNW, village, castle, hillN, skyUp, leaf3m, feet, cross, wallfoot, shadowT, flowers, sap, out0/90/180/270. I looked closely at 30 of these; farNE, farS, skyUp, out0 and out270 were rendered but only skimmed or not opened.
Own viewpoints (`shots/<tag>-seq.png`): `c2doorout` (at the door looking out south), `c2pathback` (down the path, low, looking back up), `c2buttress` (1.5 m from the east buttress), `c2nose` (nose to the east wall rubble), `c2feetfloor` (standing inside, looking at the floor), `c2gableup` (inside, looking up at the gable), `c2eastwall`, `c2windowout` (inside looking west through the arcade), `c2rim` and `c2rimE` (from the rim looking across the hilltop), `c2southfar` (55 m south), `c2undereast` (under the east tree, looking up).
1920x1080: `shots/crit2hd-hero.png`, `crit2hd-close.png` (also rendered, not examined: crit2hd-farSE, crit2hd-rubble).
Frame time reported by the tool: 10.5 ms at 720p, 26.8 ms at 1080p (review 1 quoted about 4.3 ms at 720p). I did not profile it; see "Performance" at the end.

---

## 1. Verdict

| | View | Review 1 | Review 2 |
|---|---|---|---|
| Best | `treeW` | 5.5 | 6.5 |
| Best (new) | `frame`, `c2pathback`, `c2rimE`, `c2doorout` | (frame about 5.5) | 7 |
| Hero compositions | `hero` / `front` / `low` | 4.5 | 6.5 / 6 / 5.5 |
| Worst | `close` | 2 | 2.5 |
| Worst | `down` | 2 | 4 |
| Worst landscape | `farN` / `meadow` / `farW` | 2.5 | 5.5 / 4.5 / 5 |
| Other former failures | `farSE`, `village`, `vista` | about 2.5 | 5 / 5 / 6 |
| New worst | `c2nose`, `c2buttress`, `c2feetfloor`, `wallfoot` | n/a | 3 / 3 / 3.5 / 4 |

Plainly:

- **Better, a lot:** the far landscape (was a fog lake, is now a designed set of planes: forest hill, pale hill, flat grey mountain, white horizon); the forests (individual crowns with lit caps, a bumpy ridge line); the chapel read at 15-40 m (small coursing, hood moulds, buttresses, darker arch reveals, grey-ochre lit stone); the foreground (a dark grass band now exists in nearly every eye-height view); flower palette (warm, drifted by colour); the trunk (bark planes, lean, flare); the floor (irregular slabs, grass breaking through).
- **Mid-distance composed views now sit in "good stylised painterly game, clearly referencing anime backgrounds" territory.** `frame`, `c2pathback` and `c2rimE` would survive a one-second glance. They do not survive three seconds, because of the stone hue, the orthogonal stair-step breaks and the pattern-like grass.
- **Not better:** anything within about 6 m of masonry. `close` is essentially the same failure as before (now with a diagonal camouflage texture instead of blob noise). A player who walks into the chapel spends most of the time in this range, so the floor of the experience has barely moved while the ceiling rose 1.5 points.
- **Regressions:**
  1. A soft airbrushed pale halo now surrounds near trunks and crowns where they overlap the forest hill (`hillN`, `farN`, `cross`, `tree`). It was not in review 1 and it is a pure post-process/3D-fog look.
  2. The valley floor traded "blank fog" for "camouflage map": hard-edged amoeba patches in 3-4 tones with blue-grey slivers (`farSE`, `village`, `meadow`, `farW`). Better than blank, but it is a new, distinctive artefact.
  3. Shadowed ground is now a large flat dark teal fill (`wallfoot`, `c2feetfloor`, `down`), heavier and more uniform than before.
  4. Frame time roughly 2.5x (if the two measurements are comparable).

---

## 2. Remaining problems, most damaging first

### A. Would lift the score

#### 1. Masonry within 6 m: flat CG faces with a screen-constant camouflage stamp and hairline joints
- Seen in: `close`, `crit2hd-close`, `c2buttress`, `c2nose`, `bush`, `wallfoot`, `inside` (near pier).
- What is wrong: up close the "small coursed stones" are not there. The faces are 0.6-1.5 m ashlars with dead-planar surfaces, filled with one diagonal dab pattern (all strokes leaning the same about 30 degrees, same size, two tones about 4% apart) that covers 100% of every face, lit or shadowed. It reads as a seamless "painted stone" texture tile. Joints are 1-2 px ruler lines; the internal corner in `close` is a single dashed vertical hairline. In `c2buttress` and `c2nose` the big blocks are pristine cuboids with knife arrises and a perfect perspective convergence, nothing a brush would draw. At 1080p the stamp is the same pixel size, so it looks finer and even more like a texture.
- Reference: ac12 at the tower base, ac15 bridge. Near stone is where the painter spends effort: each stone gets its own tone (three or four families), joints are thick dark gaps with a light upper lip, there are chips, missing mortar, a moss/dirt gradient rising from the ground, and large passages with no marks at all.
- Fix:
  - Make the painted block grid in the shader independent of the geometry and smaller: course height 0.26 m, block length 0.35-0.75 m (hash per course), running bond. Per block: one flat tint chosen from 4 (`#C9CBBE`, `#D6CDB4`, `#BBC2C0`, `#C2C9AC` lit; `#6A6D78`, `#73707A`, `#62687A`, `#6B7268` shadow), value jitter +/- 5%, hard edge at the block boundary. This replaces the dab pattern as the primary information.
  - Joints: width 6-14 mm in world space clamped to 1.5-4 px, edge displaced by noise at 4 cm wavelength, colour `#4A4853` in shadow, `#8A8576` in light; a `#ECEADF` 1-2 px lip on the top edge of about 40% of lit blocks. Keep the patch mask but raise coverage within 5 m to about 70% (the patchy look is for distance).
  - Dab pattern: cut contrast to 2%, restrict to 30% coverage by a low-frequency mask, randomise stroke direction per block (rotate the brush UV by a per-block hash, +/- 25 degrees around vertical).
  - Geometry: vertex-displace every masonry face along its normal by 1.5-3 cm low-frequency noise and round arrises (bevel 2-3 cm with noise). No free-standing block larger than 0.7 m; split the remaining monoliths (east rubble in `c2nose`, the pale stack in `low`/`front`, the plain pedestal left of the arcade in `hero`) into 3-6 stones with 2-6 degree random rotation.
  - Inner corners: replace the dashed hairline with a 3-6 px dark accent `#3A3F46` that fades in and out along its length.

#### 2. Stone shadow is still mauve-lavender and still one value over most of the building
- Seen in: `hero`, `front`, `back`, `inside`, `c2eastwall`, `c2rimE`, `westwall`, `c2windowout`.
- What is wrong: the shadow side is about `#7F7890`-`#8A8298` (violet, S about 0.15-0.2, Y about 0.48). It is greyer than review 1's periwinkle but still reads purple against green, and it is still the dominant colour of the chapel (the whole of `back` and `c2eastwall`, 70% of `hero`). Arch reveals are darker now (good), but only one step, about `#55505F`; nothing reaches `#323639`. `inside` remains unreadable: near pier, far wall, column and altar are all the same lavender.
- Reference: ac12 shadow `#64676E` (neutral cool grey, S 0.09), recess `#323639`, wall one plane back `#959BA9`, plus a clear warm/green bounce in the lower metre.
- Fix: shadow base `#6C7079`, vertical gradient stepped in 3 bands (0-1.2 m `#7A7872` warm-green bounce, 1.2-5 m `#6C7079`, above 5 m `#666C7C`); cap S at 0.12. Arch soffits, window reveals and the inside of the doorway `#3B3F47`. Interior plane separation: surfaces more than 6 m behind the nearest chapel surface along the view ray shift to `#959BA9` in shadow (step, not gradient). The violet belongs only to cast shadows on the dirt path.

#### 3. Broken edges are still orthogonal staircases; everything is axis-aligned
- Seen in: `hero`, `crit2hd-hero`, `front`, `low`, `back`, `c2gableup`, `c2eastwall`, `high`.
- What is wrong: the breaks are now made of smaller blocks, but every block is still a world-axis-aligned box, so the gable rake is a regular pixel stair (`hero`: 12-14 equal steps down the right side), the wall tops are crenellations, and loose stones stick out as perfect little boxes (the cantilevered brick at top right of the gable in `front`/`low`). Pier and buttress arrises, hood moulds and the arch voussoirs are ruler-straight for hundreds of pixels. Column drums and the inside column are perfect cylinders with a clean elliptical end.
- Reference: ac12. Break profiles are diagonal and concave, with rounded, eroded caps and leaning fragments; verticals wobble; no two steps the same size.
- Fix: define each break as a noise curve and delete blocks along it, then for the outermost two rows: random rotation 3-10 degrees about all axes, non-uniform scale 0.6-1.3, 30% of them replaced by wedge shapes (one top corner cut). Add a "cap" row of small rounded stones (0.12-0.25 m) so the profile is a lumpy line, not steps. Step heights on the gable rake must vary 1:3. Silhouette wobble on all long arrises: vertex noise 1.5-3 cm at 0.5-1.2 m wavelength (requires 4-6 subdivisions per pier). Drums: squash 5-8%, chip the rim with 2-3 notches, tilt.

#### 4. Valley floor and far meadow are a camouflage map
- Seen in: `farSE`, `village`, `meadow`, `farW`, `farNW`, `path`, `vista`, `out90`.
- What is wrong: the ground beyond the hilltop is filled with large rounded blobs with hard vector edges in four tones (pale mint `#CFE3BE`, yellow `#DDE7A0`, olive `#A9BE80`, blue-grey `#9DB7B5`), like a contour map or military camouflage. The blobs are roughly isotropic, do not foreshorten convincingly, and the olive ones are darker than anything else in the far field, so they pop forward as "ponds". In `meadow` they fill half the frame. In `village` under the long lens they are the picture.
- Reference: ac12's far field is one flat pale green with thin horizontal streaks; ac13's is a flat wash with a few long, low-contrast horizontal strokes following the land. The far ground is the quietest part of the board.
- Fix: keep at most two tones within 4% value of each other for the base (`#D3E6BC`, `#DCE9AE`); remove the olive and blue-grey blobs entirely except as (a) thin tree-line strokes and (b) field strips. Make marks strongly anisotropic in world space along contour lines: stretch noise 10:1 across the view-independent slope direction so they foreshorten to streaks 2-5 px tall. Field strips near the village: 5-8 long parallelograms with 1 px darker hedgelines, not blobs. The foot of the home hill needs one firm overlap edge against the valley (2-3% darker band), not a blob boundary.

#### 5. Airbrushed halo around near trees and mist puffs in the forest
- Seen in: `hillN` (worst), `farN`, `cross`, `tree`, `farNW`, `castle`, `flowers`.
- What is wrong: where a near trunk or crown overlaps the forested hill there is a wide (40-80 px) Gaussian-soft glow of dark or pale green following the tree silhouette. It looks like a depth-based fog/light-wrap or a soft billboard. Similarly the pale blue-white mist patches between forest masses (`farNW` centre, `castle` lower left, `flowers` top) have blurred, cloud-like edges and look like smoke.
- Reference: the boards have no soft gradients around silhouettes. Mist in ac15 is a flat pale shape with a brushed edge behind trunks, bounded by the next silhouette.
- Fix: find and remove whatever produces the halo (light wrap radius, soft haze card behind the tree, or depth-difference blur); if a haze plane behind the hero tree is wanted, make it a flat tone with a noise-thresholded edge (edge width under 6 px). Mist patches: threshold them (two flat steps `#DCEBE3`, `#C9DDD6`), lobed brush edge, and keep them only at hill feet.

#### 6. Ground in shadow is a flat saturated teal slab; shadow edges on stone are stair-stepped
- Seen in: `wallfoot`, `c2feetfloor`, `down`, `bush`, `back` (foreground), `shadowT`.
- What is wrong: in shade the grass base becomes one uniform `#3F6F62`-ish fill over half the frame (`wallfoot`), with tufts barely separated from it; the floor slabs in shade are uniform slate `#6F7488` with a dead surface. Inside the chapel this is most of what the player sees when looking down. On stone, sunlit patches have visibly blocky, sawtooth pixel edges (`bush` right block, `down` centre): shadow-map texels, not a brush edge. `shadowT` is the good case: the tree shadow on grass has holes and a lobed edge; protect that.
- Reference: ac13 foreground shadow: dark teal but broken by lighter blade strokes, warm dapples and darker accents at tuft bases; ac15: shaded ground has at least three tones and the path shows through.
- Fix: shaded grass base two-tone by low-frequency noise (`#4C7C6A` / `#3C675E`), plus sparse light blades `#7FB48A`; add dapples (sun patches 0.3-0.8 m, `#D9E88F`) at 5-10% coverage under canopies, none under solid walls. Shaded slabs: per-slab tint jitter (`#6E7280`, `#777A84`, `#686F7C`), moss green in joints, a light top-edge line on 30% of slabs. Stone shadow edge: sample the shadow map with a 4-tap rotated kernel at about 6 cm radius then threshold against low-frequency noise so the edge is a smooth lobed curve; reject islands under 10 px.

#### 7. Grass tufts are an evenly spaced icon pattern; mid-ground is empty; path-side ribbons
- Seen in: `feet`, `cross`, `out180`, `flowers`, `hero`, `frame`, `pathdown`, `c2rim`.
- What is wrong: (a) `feet`: tufts are one or two fan shapes, similar size, on a near-regular spacing over a flat ground, each a dark teal icon with a pale ghost copy. It reads as a repeating wallpaper. (b) The foreground band ends abruptly: beyond about 8 m the meadow is a featureless wash to the rim (`c2rim`, `c2southfar` lower half is 40% empty yellow-green). The reference keeps a few long horizontal strokes and value shifts there. (c) Beside the path, tall dark grass forms two continuous parallel ribbons with a light-green outline (`pathdown`, and the dark diagonal bar in the middle of `frame`/`hero`): a procedural offset curve, and in `frame` it cuts the composition in half.
- Reference: ac13: tufts clump into irregular masses of very different sizes with large bare gaps; the dark foreground band has a ragged top edge; mid-ground has a few horizontal strokes and small plants at object bases only.
- Fix: cluster tufts with a noise mask (two octaves, threshold so 45% of the ground is empty and clumps are 0.5-3 m across), size log-normal 0.5-2.2x, at least 6 silhouettes, drop the pale ghost copies. Mid-ground (8-40 m): add horizontal dry-brush strokes 1-3 m long, 2-3 px tall, value +/- 4%, 1 per 6 m2. Path ribbons: break into segments 1-4 m long with 40% gaps, vary offset 0.3-2 m, remove the outline tone, and delete the bar crossing the hero sight-line.

#### 8. Flower drifts are hard-bounded single-colour dot fields
- Seen in: `treeW`, `c2rim`, `c2rimE`, `shadowT`, `c2southfar`, `rubble`, `c2doorout`.
- What is wrong: palette is fixed (warm, on-model), but each drift is a uniform-density field of same-size round dots with a sharp outer boundary: the white drift reads as spilled popcorn or snow (`treeW`, `c2rimE`), the red one as a ribbon (`shadowT`). Dots stay round and separate out to 40 m instead of merging; there is a lilac strip at 60 m in `c2doorout` that is the only violet in the frame.
- Reference: ac12: flowers merge into horizontal streaks within 15 m; drifts interpenetrate (yellow through red through white), density peaks in the drift core and thins to nothing; green shows between.
- Fix: density = smooth falloff from the drift core (no threshold edge), 25% cross-contamination of neighbouring colours, dot size x0.5-2. Beyond 15 m replace dots with horizontal dashes (aspect 4:1 at 15 m to 12:1 at 50 m, 2-3 px tall) at 70% of the dot colour's saturation. White drift: tint `#F7F3E2` and cut coverage by half. Drop the lilac strip or move to `#D8C8E6`.

### B. Polish (worth doing, will not move the score much alone)

#### 9. Moss is vector camouflage
- `bush`, `wallfoot`, `down`, `c2feetfloor`, `vista` (drum). Flat mid-green `#6FA579` blobs with smooth outlines on stone bases and drums, plus yellow-green caps on blocks. Fix: desaturate to `#8A9E78` / `#A8B885`, build the edge from 6-10 px dabs (`uBrush.R`) so it is ragged, vertical streak bias, confine to the bottom 0.4 m and north/top faces, under 12% of stone area.

#### 10. Near-crown leaf chips and bough ends
- `frame` (top right), `under`, `leaf3m`, `c2undereast`. Within 6 m the leaf cards are 40-70 px polygons in flat colours with a very large flat teal mass `#2F6F66`; cut-paper collage. Boughs end in square-sawn stubs and plank-like rectangles (`under` top right, `leaf3m` right). Trunk bark is much improved. Fix: cap leaf card size at about 28 px on screen (shrink cards with proximity below 8 m), add a second darker teal `#285C5C` to break the big mass, taper/hide bough ends inside leaf clusters.

#### 11. Mountains and far props
- `castle`, `farNW`, `tree`, `westwall`. The mountains are now correctly flat and soft-edged (good) but are a single large neutral grey `#BDC2C4` that is darker than the forest hills in front in places, and the big one behind the castle is a blank shape with an airbrushed smudge. Fix: lighten/cool to `#CBD6DA`, add 5-8 broken dry-brush ridge strokes 5% darker, keep the smudge thresholded. Castle and village are improved but still clean-edged flat polygons under a long lens; add 1-2 px edge wobble and window dabs. Lone far trees are still uniform pale lollipops in places (`farNW`, `village`).

#### 12. Composition and performance notes
- `inside`, `c2windowout`: looking out through the arcade, the bright landscape and the lavender wall are near the same saturation; darken reveals (problem 2) to get the ac12 light-dark-light stacking.
- Performance: 10.5 ms at 720p and 26.8 ms at 1080p as reported by `tools/shot.mjs`, versus about 4.3 ms quoted in review 1. Not verified with a profiler; grass instance count (157k tufts, 112k flowers per the console) is the obvious suspect. At 1080p this is under 40 fps on the target GPU.

---

## 3. Status of review-1 problems

| # | Review-1 problem | Status |
|---|---|---|
| 1 | Voxel chapel silhouette | Partial. Smaller blocks, buttresses, hood moulds, string courses added. Still axis-aligned stairs, straight arrises, monoliths remain (now problem 3, 1). |
| 2 | Periwinkle stone shadow | Partial. Greyer, lit side now grey-ochre, reveals darker. Still violet and uniform (problem 2). |
| 3 | Decal streaks, hairline joints | Partial at distance (coursing reads well at 15-40 m). Untouched in effect within 6 m (problem 1). |
| 4 | Fog-gradient far landscape | Resolved as stated. Replaced by camouflage valley floor (problem 4) and soft mist puffs (5). |
| 5 | Amoeba forest decals | Mostly resolved. Crowns, lit caps, bumpy ridge. Lone far trees still samey. |
| 6 | Low-poly mountains | Resolved (flat, no facets). Tone polish only. |
| 7 | Grid floor | Mostly resolved. Irregular slabs, grass gaps, no green grout, no red line seen. Shaded slabs dull (6). |
| 8 | Ground stamps, no contacts | Partial. Stamp rectangles gone, contact fringes and foreground band present. Tufts pattern-like, mid-ground empty (7). |
| 9 | Flower confetti/palette | Partial. Palette and drifting fixed. Dot uniformity, hard drift edges, no streaking (8). |
| 10 | Shadow edges | Partial. Grass shadow good (`shadowT`). Stone shadow edge still blocky; shaded ground flat (6). |
| 11 | No deep accents | Partial. Reveals one step darker; no true dark, interior planes not separated (2). |
| 12 | Leaf dabs, straight branches | Partial. Trunk and layering much better; close-range chips and bough ends remain (10). |
| 13 | Box low wall, pebbles | Wall gone/replaced by grass bar (new issue in 7c). Pebbles still uniform (minor). |
| 14 | No foreground frame | Mostly resolved. Rim trees, bushes and dark band give most directions a repoussoir (`c2doorout`, `path`, `out90`). |
| 15 | Vector village/castle/cumulus | Partial. Cumulus removed; buildings softer but still clean. |

---

## 4. Protect

- The plane structure of the far landscape: forest hill / pale hill / flat mountain / white horizon (`farN`, `farW`, `tree`). Do not reintroduce continuous fog.
- Forest crown construction and the bumpy ridge silhouette.
- The chapel read at 15-40 m in `frame`, `hero`, `c2pathback`: small coursing in patches, warm-grey lit stone with per-block tint, dapples on the gable.
- The tree shadow on grass in `shadowT` (lobed edge, holes, blades crossing the edge).
- Dark foreground grass band at the frame bottom, and the path (colour, streaks, fringe).
- Trunk bark treatment (`westwall`, `under`): olive/violet planes with broken strokes.
- Sky wash, cirrus streaks, grain.
- Warm flower palette and colour drifting (only the handling needs work).
- Near/mid tree crowns at 10-35 m.

---

## 5. Ceiling and biggest remaining tell

- With the fixes in section A, I estimate composed mid-distance views can reach about 7.5-8, and the walking-around average about 6.5. Close-range masonry is unlikely to exceed about 5.5-6 with procedural shader marks alone: a painter designs each stone, and a free camera at 1 m exposes perfect perspective on planar faces. Getting past that would need authored (or offline-generated) per-face painted textures and deliberately imperfect geometry. This is a judgement from the screenshots, not something I tested.
- **Biggest single 3D tell:** the masonry's geometric perfection: dead-planar faces, ruler-straight arrises and orthogonal stair-step breaks rendered in exact perspective, in a uniform lavender, with a screen-constant texture on top. Everything organic now reads as paint; the building still reads as a model. Fix problems 1-3 before anything else.
