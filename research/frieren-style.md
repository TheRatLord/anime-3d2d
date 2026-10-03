# Frieren (Madhouse, 2023) background-art style: a spec for shader work

Compiled 2026-10-01. Audience: a graphics programmer building a procedural, free-camera WebGL scene.

## 0. How to read this document

Every claim carries one of three tags.

- **[S] Sourced** - stated in an interview, production article or official release (URL given).
- **[M] Measured** - I downloaded 19 officially released concept-art pieces and art boards (bijutsu boards) and sampled them. Values are medians of 9-11 px patches from ~1024 px JPEGs of scanned boards, so treat hex values as +/- 5% and as *pre-compositing* paint colours, not broadcast-frame colours.
- **[I] Inference** - my own reading of those boards, or general anime-background practice that I could not tie to a Frieren-specific source.

Gaps you should know about:

- I found **no interview with art director Sawako Takagi** and **no interview with photography director Akane Fushihara**. Sections 3-7 are therefore mostly [M]/[I], not [S].
- I sampled art boards and concept art, **not broadcast frames**. The satsuei section (7) is the weakest in this document.
- The two Sakuga Blog articles and the two MdN interviews were read through an automated page summariser; wording of quotes is approximate, and the MdN quotes are translations.
- The official news page (frieren-anime.jp/news/929) blocked fetching; I used press mirrors of the same release.

---

## 1. Who made the backgrounds, tools, intent

| Role | Person / studio | Tag |
|---|---|---|
| Art director (bijutsu kantoku) | Sawako Takagi | [S] |
| Background studio | Studio Wyeth (スタジオワイエス) - the boards are labelled "描いたひと スタジオワイエス" | [S]/[M] |
| Concept art, setting layouts, colour script, "worldview illustration" | Seiko Yoshioka | [S] |
| Colour design | Harue Ono | [S] |
| Director of photography (satsuei) | Akane Fushihara | [S] |
| Director | Keiichiro Saito | [S] |

Process:

- [S] Yoshioka draws the "setting layout" master shot of each location; Takagi then paints the art board from it. Concept art is "a step before the art board phase".
- [S] Yoshioka paints the base image **on paper with paint**, valuing "the paint's natural bleeding and brushstrokes", then finishes digitally as needed. Towns were blocked in 3D for elevation relationships and converted to line drawings in Photoshop. Maps and documents were made with ink on textured paper "to match the painted background aesthetic".
- [S] Studio Wyeth's own site describes the studio as making background paintings **by hand** (search-result snippet of studio-wyeth.jp; I did not open the page).
- [M] The released boards look like scanned physical paintings: visible paper edge, uneven board margins, pigment granulation, opaque light paint over darker washes. That is consistent with poster colour (the traditional Nicker-type opaque watercolour) but **no source I found names the medium**. Treat "poster colour on paper" as a well-supported inference.

Stated intent:

- [S] Yoshioka: the manga has a "quiet atmosphere" with "beautiful nature and clear blue skies"; its covers use "fresh, watercolour-like pale colouring". Her aim was "abundant colours expressed through soft, gentle light" (色数を豊かに、柔らかくて優しい光).
- [S] Yoshioka describes Takagi's backgrounds as "watercolour-like, with bleeds and subtle shifts".
- [S] Director Saito asked that viewers "feel as though they have travelled to various places".
- [S] Sakuga Blog: "soft but very diverse colors and painterly art direction", a world "beyond its big crisis", with a theme of tangible ageing - roads and objects that look decades or centuries old.
- [S] The official release describes the boards as ruins "in bright colours" and townscapes "rich in light/shadow contrast".
- [S] Setting reference is pre-15th-century medieval Europe; Yoshioka kept a list of seasonal roadside plants and wildflowers per region.

Sources: MdN interview part 1 https://www.mdn.co.jp/design/features/7151 and part 2 https://www.mdn.co.jp/design/features/7155; Sakuga Blog https://blog.sakugabooru.com/2023/10/05/crafting-a-tangible-aging-world-frieren-beyond-journeys-end-production-notes-01-04/ and https://blog.sakugabooru.com/2023/11/16/resourcefulness-reigns-supreme-frieren-beyond-journeys-end-production-notes-05-10/; official release mirrors https://www.pashplus.jp/anime/310077/ and https://animecorner.me/frieren-beyond-journeys-end-concept-art-stuns-in-new-images/; staff list https://frieren-anime.jp/staffcast/; https://www.studio-wyeth.jp/works.html.

---

## 2. Colour

### 2.1 Global statistics [M]

Luminance Y (Rec.709, 0-1, on sRGB-encoded values) and HSV saturation percentiles over the painted area of each board:

| Board | Y p2 | Y p25 | Y p50 | Y p75 | Y p98 | S p50 | S p90 | S p99 |
|---|---|---|---|---|---|---|---|---|
| Castle gate, day/clear | 0.25 | 0.47 | 0.72 | 0.87 | 1.00 | 0.27 | 0.43 | 0.53 |
| Ruined church + flower field, day/clear | 0.27 | 0.63 | 0.83 | 0.87 | 0.99 | 0.31 | 0.52 | 0.66 |
| Cliff, day/clear | 0.36 | 0.60 | 0.72 | 0.79 | 0.92 | 0.40 | 0.50 | 0.57 |
| Town plaza, day/clear | 0.12 | 0.35 | 0.51 | 0.73 | 0.91 | 0.21 | 0.42 | 0.59 |
| Bridge under trees, spring morning | 0.19 | 0.31 | 0.46 | 0.64 | 0.97 | 0.37 | 0.61 | 0.69 |
| Hilltop cafe, evening | 0.10 | 0.35 | 0.46 | 0.59 | 0.84 | 0.36 | 0.50 | 0.59 |
| Harbour sunrise, winter | 0.22 | 0.44 | 0.67 | 0.77 | 0.98 | 0.24 | 0.38 | 0.47 |

What this means for a shader:

- **High key.** Open daytime scenes have a median luminance of 0.72-0.83. The darkest 2% sits at 0.25-0.36: there is essentially **no black** outdoors by day. Only doorways and deep interiors reach ~0.16-0.21.
- **Moderate saturation.** Median S is 0.2-0.4 and the 99th percentile rarely passes 0.7. Nothing is neon. The single most saturated things are small accents (flowers, autumn leaves at S ~0.65) and the darkest foliage shadows.
- **Saturation peaks in the shadows of foliage, not the lights.** Lit grass is S 0.32-0.43; deep canopy shadow is S 0.60-0.65. Lit areas are pushed toward pale yellow, not toward vivid green.
- Shaded forest and evening scenes drop the median to ~0.46 but keep a near-white highlight (p98 0.84-0.97).

### 2.2 Measured palette [M]

Sky, clear day:

| Element | Hex | Note |
|---|---|---|
| Zenith | `#79C9F0` - `#9CDEF8` | cyan-leaning blue, hue 193-200, S 0.37-0.50 |
| Mid sky | `#A1EDFD` - `#B6E9F8` | |
| Horizon | `#F1FFFE` - `#FFFFFF` | goes fully to paper white |
| Plaza sky (slightly deeper) | `#7DC7E0` | |

The sky is a smooth vertical wash: saturated cyan at top, white at the horizon, with the white band occupying roughly the bottom quarter to third of the visible sky. The hue is distinctly **cyan/turquoise (190-200 degrees)**, not the ultramarine (215-225) of Shinkai-style skies.

Vegetation, clear day:

| Element | Hex | HSV |
|---|---|---|
| Grass, sunlit | `#DCED86`, `#D4E59B`, `#EBED71` | H 61-74, S 0.32-0.52, V 0.90-0.93 |
| Grass, foreground mid | `#599E80` | H 154, S 0.44, V 0.62 |
| Grass, foreground dark / shadow | `#305757`, `#495647` | H 112-180, V 0.34 |
| Foliage lit (near tree) | `#7FC077`, `#557A48` | H 104-113 |
| Foliage mid | `#518654`, `#86AC75` | H 101-123 |
| Foliage dark | `#43644E`, `#307975` | H 140-177 |
| Foliage deepest (shaded canopy) | `#233F65`, `#263F64` | H 215, S 0.63, V 0.40 - **navy, not green** |
| Mid-distance hill, lit | `#93AA6C` | H 82, S 0.36, V 0.67 |
| Mid-distance tree mass, shadow | `#457846` | H 121 |
| Far meadow at horizon | `#AED19F` | H 102, S 0.24, V 0.82 |

The key rule: **hue rotates with value**. Lit vegetation is yellow-green (H 60-75), mid-tones are true green (H 100-125), shadows go teal (H 140-180) and the deepest accents go blue (H 215). That is a rotation of about 150 degrees from light to dark.

Stone and earth:

| Element | Hex | Note |
|---|---|---|
| Warm sandstone, lit | `#F4D9B1`, `#EBD09F` | castle gate |
| Warm sandstone, shadow side | `#8D6980` | H 322 - **mauve** |
| Grey ruin stone, lit | `#CFD2C3` | slightly green-warm grey |
| Grey ruin stone, shadow | `#64676E` | cool blue-grey |
| Grey ruin stone, deep recess | `#323639` | |
| Ruin wall one plane back | `#959BA9` | lighter and bluer than near shadow |
| Bridge stone in open shade | `#7D88A3`, `#798CB0` | H 220, periwinkle |
| Ochre cliff, lit | `#DAC279`, `#D0B97F` | |
| Ochre cliff, crack / shadow | `#927154` | |
| Cliff, next plane back | `#A09286` | |
| Cliff, farthest plane | `#E0DAC5` | |
| Dirt path, lit | `#E9D0BC` | pale pink-beige |
| Cast shadow on path | `#7E6881` | H 293 - **violet** |
| Plaza paving, lit | `#EDD8BD` | |
| Plaster wall, lit | `#F4F0E7` | |
| Plaster wall, shadow | `#705B67` | H 326, mauve |
| Tree trunk | `#62605D`, `#6C6851`, `#424654` | grey to olive to blue-grey; never saturated brown |
| Dark doorway | `#30272B` | darkest daytime value found |
| Far mountain | `#C0CACA` | S 0.05, nearly neutral pale grey |

Autumn (herbalist's house board): leaves `#C05D40`, `#B2713C`, `#B17844`; ground `#D9AC68`; sky `#D2FBFD`.

Evening (hilltop cafe, "夕方/晴れ"): sky `#A9AFE3`; lit cliff `#D88F5E`; cliff in shade `#D69D95` to `#E29783` (same value as the lit side, shifted to pink); lit wall `#FDDFAB`; wall shadow `#A7845B`; roof `#8C6142`; timber `#886159`; tree lit `#868A4F`, tree dark `#43443E`.

Sunrise (harbour, "冬/日の出"): sky top `#919CD2`; mid `#FFE5C4`; horizon `#FCD4AF`; sun glow `#FDF4BB`; violet cloud `#B2A4CE`; pink cloud `#E6ACAC`; far land `#A69197`; silhouetted trees `#3A3C3F` to `#554F40`; ground `#937A5A`.

### 2.3 Values I could not measure - suggested starting points [I]

The released boards contain almost no cumulus cloud and no layered mountain range, so these are extrapolations from the measured palette:

| Element | Hex |
|---|---|
| Cloud, lit | `#FFFFFF` to `#FBFDFF` |
| Cloud, shadow side | `#C9DCEB` to `#B7CBE0` (pale blue-grey, lighter than the zenith sky is dark) |
| Cloud, warm underside near horizon | `#F3EBDD` |
| Mountains, depth 1 (near, 0.5-1 km) | `#7FA07A` |
| Mountains, depth 2 | `#9DB8AE` |
| Mountains, depth 3 | `#B4CBD3` |
| Mountains, depth 4 (measured) | `#C0CACA` to `#D4E3EA` |
| Wood, sunlit | `#B08A66` |
| Wood, shadow | `#5E4A4E` |
| Roof tile, slate, lit / shadow | `#8A8794` / `#4E4A5C` |

### 2.4 Shadow rule in one line

Shadow colour is **not** a darkened local colour. On warm or neutral surfaces, shadows move to violet/mauve (H 290-330) at about half the luminance (lit Y ~0.85 to shadow Y ~0.43-0.45, ratio ~0.52). On vegetation, shadows rotate toward teal and blue. Shadow saturation is equal to or higher than the lit side. [M]

---

## 3. Shape language and brushwork [M]/[I]

General:

- **Opaque dabs over soft washes.** Each surface is a soft wet-in-wet gradient underpainting, then 2-3 layers of hard-edged opaque marks on top. The concept art (digital/hybrid) uses large flat chisel strokes; the boards use smaller, more careful marks.
- **3-4 value steps per material**, not continuous shading: base wash, shadow shape, light dabs, and a sparse darkest accent. Edges between steps are hard on man-made things and leaf clusters, soft on ground and distant forms.
- **Mark size.** On a 1024 px-wide board, near-tree leaf dabs are roughly 8-20 px (about 1-2% of frame width), mid-distance foliage marks 3-6 px, far foliage is a wash with no marks. So mark size should shrink in screen space with distance, then switch off entirely.
- **Granulation.** Flat areas (sky, plaster, far hills) show faint pigment/paper mottling, not clean gradients.

Foliage:

- A tree crown is a dark teal/navy mass with a jagged, leaf-shaped silhouette, over which lighter leaf clusters are dabbed. Light clusters gather on the upper, sun-facing side.
- **Sky holes**: many small gaps in the crown show sky or bright haze. Isolated single leaves float just outside the silhouette.
- Individual leaves are legible as angular 3-5 sided dabs only at the silhouette edge and in the lightest clusters. The interior is mass.
- Branches are thin dark lines visible through gaps, drawn in the trunk colour.

Grass and ground:

- Distant and mid grass is a **flat pale yellow-green wash** with no blades at all.
- Blades appear only as (a) a fringe along the edge where grass meets path, shadow or object, and (b) dark upright tufts in the nearest foreground. Blades are short tapered strokes in groups.
- Wildflowers are tiny opaque dots (white, yellow, lilac, pink), clustered, densest in the foreground. In the flower-field board they merge into horizontal colour bands with distance.
- Dirt paths are pale pink-beige with horizontal streaks and a few pebbles; wheel-rut or edge lines carry the perspective.

Rocks, cliffs, stone:

- Cliffs are big planar facets: broad lit faces with a subtle warm gradient, dark crack lines that widen into shadow wedges, horizontal strata hinted with dry-brush streaks.
- Masonry: block joints are **not drawn everywhere**. Courses are indicated in patches (maybe 30-40% of the wall), fading to plain wash elsewhere. Individual blocks are varied slightly in hue (warm, cool, greenish). Corners and tops get a lighter edge; bases get moss-green and dark staining. Vertical rain streaks and worn edges carry the "ageing" theme.
- Rubble is angular with one light top plane, one mid side, one dark side.

Roofs and timber:

- Roofs sag and curve; ridges are never ruler-straight. Tiles are suggested by rows of short strokes with a few individually picked-out lighter tiles.
- Half-timber framing is drawn as dark painted bars with slightly wobbly edges.

Clouds [I]:

- Largely absent in the day boards - the default sky is a clean gradient. Where present (sunrise board, concept art) they are thin, horizontal, soft-edged wisps with one firmer lit edge. Favour cirrus/stratus streaks over Shinkai-style towering cumulus.

Where detail goes:

- Concentrated at the focal structure, at silhouette edges against the sky, and at ground contact lines.
- Omitted in large lit planes, far hills, and the sky.

---

## 4. Linework [M]

- **No uniform outlines.** Backgrounds are edge-by-value: forms separate by colour and value contrast.
- Where lines exist they are **painted, coloured, and broken**: masonry joints, cracks, timber edges, window frames, branch lines, roof ridges.
- Colour: a darker, more saturated version of the local colour or a dark violet-brown (around `#4A3448` to `#5B4650`). Never black.
- Weight: about 1-2 px at 1024 px width (0.1-0.2% of frame width), varying along its length, with gaps.
- Light-side edges often get a thin **pale highlight line** in place of a dark one (top of walls, battlements, lit rim of trunks).
- Organic forms (foliage, grass, clouds, hills) have no line at all.

For a renderer: do not run a Sobel outline over everything. Draw dark lines only at creases and occlusion contacts on man-made geometry, modulated by a noise mask so about half of each line drops out; draw a light line on sun-facing convex edges.

---

## 5. Depth in 2D terms [M]/[I]

Measured progression from near to far:

| Plane | Example | Value | Saturation | Hue |
|---|---|---|---|---|
| Foreground frame (tree, bush, grass tufts) | `#495647`, `#233F65` | darkest, Y 0.2-0.35 | medium-high | teal to navy |
| Subject / midground | lit stone `#F4D9B1`, lit grass `#DCED86` | lightest and highest contrast | medium | warm |
| Mid-distance hill | `#93AA6C` / `#457846` | compressed, Y 0.4-0.65 | 0.36-0.43 | green |
| Far meadow | `#AED19F` | Y 0.78 | 0.24 | green drifting cool |
| Far mountain | `#C0CACA` | Y 0.78 | 0.05 | near neutral |
| Horizon sky | `#FFFFFF` | 1.0 | 0 | - |

Rules:

1. **Distance fades to pale, nearly white, slightly cool - not to saturated blue.** The far target colour is the horizon sky (white to very pale cyan). Saturation falls from ~0.4 to ~0.05 by the farthest ridge.
2. **Contrast compresses with distance.** Near objects span Y 0.2-0.9; mid-distance hills span roughly 0.4-0.65; far mountains are a single value with a faint second tone.
3. **Dark foreground repoussoir.** Most exterior boards have a dark tree, branch canopy or bush cutting in from one side or the top, plus a dark grass band along the bottom edge. In the bridge board this covers roughly half the frame.
4. **Planes alternate light and dark.** Dark foreground, bright sunlit middle, mid-value hill, pale mountain, white horizon. Silhouettes overlap cleanly; each plane is internally low-contrast so the overlap edge reads.
5. **Haze behind the subject.** Forest scenes place a glowing pale yellow-green haze (`#DAF4B0`) directly behind the focal object; trees beyond it are flat teal-grey silhouettes (`#79A2A1`), then paler still. Three silhouette layers is typical.
6. **Ground-hugging mist.** Cliff and hill bases fade into a lighter band where they meet the ground at distance (far cliff base in the cliff board dissolves into pale green-white).
7. **Detail and mark size fall with depth** (section 3), and line work disappears entirely beyond the midground.
8. **Light shafts** appear in forest boards as soft-edged diagonal pale bands crossing dark areas, in front of the mid layer and behind the foreground frame.
9. **No depth of field in the painting itself.** Any blur is added in compositing; the boards are sharp throughout. [I] Broadcast shots sometimes blur a foreground or background layer optically, but a free-camera scene should default to everything sharp, with softness coming from paint handling, not lens blur.

Implementation hint: use exponential distance fog toward the horizon-sky colour, plus a separate saturation falloff that is faster than the value falloff, plus a height-based haze term near the ground. Quantise depth into 4-5 bands for foliage and terrain so each band gets its own flat-ish palette; continuous fog alone will look photographic.

---

## 6. Lighting conventions [M]/[I]

- **Sun is high and to one side**, giving clear lit and shadow planes on buildings. Shadow planes sit near 50% of lit luminance and are violet/mauve.
- **Cast shadows** on ground are violet (`#7E6881`) on dirt and deep teal on grass, with a **firm but irregular edge** - a painted edge, not a penumbra. Tree shadows are a single blobby mass with a few holes, not a projection of every leaf.
- **Dappled light**: under trees, the ground and walls carry irregular soft-cornered patches of warm light (pale yellow `#F1EEB6`) inside the shadow mass. Patch size is large - roughly 3-8% of frame width - and they are sparse, clustered, and elongated along the surface. The concept art for the forest cottage shows the same on a wall as pink-peach patches.
- **Bounce light**: shadow sides of stone warm up toward the ground (ochre/pink lower, violet upper); undersides of arches pick up warm ground bounce. Foliage undersides stay cool.
- **Ambient occlusion as accents**: small dark strokes at ground contacts, under eaves, inside window and arch recesses, in cracks. These are the darkest values in the picture and are used sparingly.
- **Sky gradient**: smooth, top cyan to white horizon; no visible banding, slight paper mottling.
- **Sun glow**: at sunrise the sun is a white-yellow disc (`#FDF4BB`) with a broad soft halo that bleaches the horizon and a broken column of reflection on the water. In day scenes the sun itself is rarely in frame; its presence shows as the white horizon and bleached haze.
- **Rim light**: thin pale edge on the sun side of trunks and wall tops, and a bright fringe on backlit foliage (lighter, yellower leaves at the silhouette).
- **Evening**: lit and shadow sides have nearly the *same value* and separate by hue (orange vs pink-violet). Night: deep blue-violet ambient with small warm lantern pools, each with a soft glow.

---

## 7. Compositing ("satsuei") [mostly I]

What is sourced:

- [S] Akane Fushihara is photography director; she is also credited on Spy x Family and ACCA.
- [S, weak] A search-result summary of an English review/blog (I could not pin the exact page) describes "subtly textured filters" that "recall the warmth of film grain", tuned per scene, and "clean composite work". Sakuga Blog also calls the compositing clean.
- [S, weak] A Japanese viewer blog (note.com/ogady) says the show lightly applies chromatic aberration to characters for texture.

What I recommend, as inference from the boards plus standard practice:

- **Restraint.** This is not a heavy-filter show. Do not use strong bloom, lens flares, or teal-orange grading.
- **Diffusion**: a wide, low-strength glow on highlights only (threshold around Y 0.85, radius 1-2% of frame width, mix 10-20%), so the white horizon and sunlit patches soften slightly.
- **Paper/grain texture**: a static or slowly changing paper-grain overlay at 2-4% amplitude, multiplied. In a free-camera scene, anchor paint texture in world or object space and keep only the fine grain in screen space, otherwise it will read as a dirty lens.
- **Para (gradient overlays)**: a soft linear darkening of 5-10% from one corner or the bottom edge, and a warm lightening gradient from the sun side. Use in place of a radial vignette.
- **Light wrap**: slight bleed of bright sky colour over the edges of dark silhouettes (a few pixels).
- **Chromatic softness**: at most 0.5-1 px of fringe at frame edges. Optional.
- **Grade**: leave blacks lifted (minimum output around 0.08-0.12 by day), highlights reaching full white only at the horizon and sun.

---

## 8. Rules of thumb from the wider craft

Kazuo Oga / Ghibli school:

- [S] Oga used about 21 Nicker poster colours, flat brushes and one pointed brush, on wetted paper. The base coat must be finished in 30-60 minutes before the paper dries: large soft passages first, details last.
- [S] He paints leaves roughly with the flat brush and adds only "a few detailed leaves" on top, because a background is on screen for 3-4 seconds.
- [S] "The goal is to get the essential point across effectively" - small telling details, not full rendering.
- [S] Thinly used, well-graded poster colour "can look like transparent watercolour".
- Sources: https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when ; http://gurneyjourney.blogspot.com/2017/03/demo-by-kazuo-oga.html

General landscape/atmospheric-perspective tutorials:

- [S] With distance: lower saturation, raise brightness, reduce contrast, shift toward the sky colour. (https://tasogareya-illustration.com/2019/05/28/understand-aerial-perspective/)
- [S] Foliage: pick three value families (light, halftone, shadow) and let only two or three clusters carry crisp edges and accents. (https://sunstrikestudios.com/en/blog/realistic_foliage_painting/)

How Frieren sits relative to the two famous schools [I, based on the boards]:

| | Ghibli / Oga | Shinkai | Frieren (Takagi / Wyeth) |
|---|---|---|---|
| Medium feel | opaque poster colour | digital, photo-based | hand-painted, more watercolour-pale |
| Key | mid | high contrast, deep darks | high key, lifted darks |
| Sky | blue with solid cumulus | deep ultramarine, dramatic clouds, flares | pale cyan to white, few clouds |
| Greens | rich, deep, many | saturated | yellow-pale in light, teal/navy in shade |
| Shadows | blue-green | saturated blue-violet | soft violet/mauve |
| Detail | high in vegetation | very high everywhere | selective; large quiet areas |
| Post | minimal | heavy bloom, flares, DOF | light diffusion and grain |

Decision rules an algorithm can apply:

1. Big shapes first: resolve every object into a silhouette and 3-4 flat tones before any texture.
2. Spend detail where the eye lands: silhouette edges, ground contacts, the focal structure. Leave lit planes quiet.
3. Never indicate a repeating pattern (bricks, tiles, blades, leaves) over a whole surface - do patches and let the rest be wash.
4. Lights go warm and pale; shadows go cool, violet or teal, and keep their saturation.
5. Do not use black; do not use fully saturated primaries except in tiny accents.
6. Each depth plane gets its own narrow value band; adjacent planes alternate lighter and darker.
7. Far things become paler and greyer, ending in white at the horizon.
8. Frame with something dark and near on one side.
9. Vary everything slightly: wobble straight edges, vary block hue, break lines.
10. Show age: moss at bases, stains under ledges, chipped corners, sagging ridges.

---

## 9. Three scene ideas

### A. Ruined chapel in a flower field (after board #02c286, "回想/廃教会/花畑")

- Elements: roofless Gothic stone tower and arcade with pointed arches, collapsed wall and rubble, one bare pale tree, a flat meadow of flowers to a low horizon, clean sky, optional single large tree off to one side as the dark frame.
- Palette: sky `#90E4FC` to `#F1FFFE`; stone `#CFD2C3` / `#64676E` / `#323639`; rear wall `#959BA9`; meadow `#EBED71` with far band `#AED19F`; flower dots in yellow `#F9E487`, pink `#E8708A`, orange `#F0A050`, white.
- Shows: high-key value structure, patchy masonry, violet-grey shadows, sky through arches, flower bands compressing with distance.

### B. Stone bridge under trees, spring morning (after board bo001_04, "王都周辺/橋の袂")

- Elements: small humpback rubble-stone bridge over a stream, two large framing trees with overhanging canopy, dirt path, foreground bushes and wildflowers, a glowing haze beyond the bridge with two or three layers of flat tree silhouettes, light shafts.
- Palette: canopy `#233F65` / `#307975` / `#7FC077`; haze `#DAF4B0`; far trees `#79A2A1`; bridge `#7D88A3` with light patch `#F1EEB6`; grass `#D4E59B` / `#599E80` / `#305757`; path `#D8ECA0` in light, `#58756A` in shade; trunks `#383839` to `#424654`.
- Shows: dark framing, dappled light, haze layering, hue rotation in foliage, light shafts.

### C. Hilltop stone gate with a lone tree and distant ranges (composite of board bo001_07 "王都/城門前" and the key visual)

- Elements: grassy slope, a weathered sandstone gatehouse or archway with a low wall, one large broadleaf tree in the near corner, a rutted dirt road, a wooded mid-distance hill, 2-3 pale mountain ridges, optional small castle on a far hill. For a dusk variant, swap in the evening palette.
- Day palette: sky `#9CDEF8` to `#FFFFFF`; stone `#F4D9B1` / `#8D6980`; doorway `#30272B`; grass `#DCED86`; road `#E9D0BC` with shadow `#7E6881`; tree `#7FC077` / `#518654` / `#43644E`; hill `#93AA6C` / `#457846`; mountains `#9DB8AE`, `#B4CBD3`, `#C0CACA`.
- Dusk palette: sky `#919CD2` to `#FFE5C4` to `#FCD4AF`; clouds `#B2A4CE` and `#E6ACAC`; stone lit `#D88F5E`, shade `#D69D95`; wall `#FDDFAB` / `#A7845B`; foliage `#868A4F` / `#43443E`; far land `#A69197`.
- Shows: atmospheric layering, mauve shadow planes, time-of-day switch.

---

## 10. Source list

- MdN Design, interview with Seiko Yoshioka, part 1: https://www.mdn.co.jp/design/features/7151
- MdN Design, interview with Seiko Yoshioka, part 2: https://www.mdn.co.jp/design/features/7155
- Sakuga Blog, production notes 01-04: https://blog.sakugabooru.com/2023/10/05/crafting-a-tangible-aging-world-frieren-beyond-journeys-end-production-notes-01-04/
- Sakuga Blog, production notes 05-10: https://blog.sakugabooru.com/2023/11/16/resourcefulness-reigns-supreme-frieren-beyond-journeys-end-production-notes-05-10/
- Official concept art / art board release (blocked to my fetcher): https://frieren-anime.jp/news/929/
- Mirrors with the images I sampled: https://animecorner.me/frieren-beyond-journeys-end-concept-art-stuns-in-new-images/ , https://www.pashplus.jp/anime/310077/ , https://animageplus.jp/articles/detail/55395 , https://dengekionline.com/articles/208898/
- Staff list: https://frieren-anime.jp/staffcast/ ; https://en.wikipedia.org/wiki/Frieren_(TV_series)
- Studio Wyeth: https://www.studio-wyeth.jp/works.html
- Kazuo Oga: https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when ; http://gurneyjourney.blogspot.com/2017/03/demo-by-kazuo-oga.html
- Aerial perspective tutorial (JP, by a background artist): https://tasogareya-illustration.com/2019/05/28/understand-aerial-perspective/
- Foliage value grouping: https://sunstrikestudios.com/en/blog/realistic_foliage_painting/
- Viewer note on chromatic aberration: https://note.com/ogady/n/n0cd133b7ce9d
- Medium production overview (Takagi's "delicate and evanescent painting"): https://medium.com/@emiliahoarfrost/fall-2023-anime-lineup-a-production-spotlight-on-promising-shows-frieren-overtake-94697f3ee014

Boards sampled (official labels): bo001_04 bridge (spring/morning/clear), bo001_07 castle gate (day/clear), bo003_03 herbalist's house (autumn/day/clear), bo004_01 Warm shop front (day/clear), bo004_03 hilltop cafe (evening/clear), bo006_04 harbour (winter/sunrise), bo010_03 cliff (day/clear), #02c286 ruined church and flower field (day/clear), #01c038 night market, plus six Yoshioka concept pieces.
