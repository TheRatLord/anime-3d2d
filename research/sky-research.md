# Sky research: how Frieren paints daytime skies, and how to do it in real time

Scope: the next round of work on `src/sky.js` (and `makeCloudPano` in `src/extra/far-tex.js`).
Nothing in `src/` was changed and nothing was rendered for this note.

Evidence tags used below:

- **[M]** measured here with ffmpeg from an image (hex values are area averages of a small patch).
- **[S]** stated by a cited source.
- **[I]** my inference / extrapolation. Treat as a proposal, not a fact.
- **[U]** could not be verified (page blocked, no primary source found). Listed so nobody relies on it.

Images used:

- 19 official concept-art / art-board images already in `refs/ac*.jpg` (the "決定稿" boards are Studio Wyeth's).
- 47 aired-episode stills downloaded from the Frieren fan wiki's episode galleries
  (https://frieren.fandom.com/wiki/Category:Episode_1_images and the same category for episodes 2, 3, 4, 5, 7,
  10, 12, 14, 16, 17, 27, 28). They are not stored in the project; file names are quoted so they can be
  fetched again. Sample bias: these are mostly establishing shots of locations.
- The current renders `shots/sk0-skyUp.png`, `sk0-farW.png`, `sk0-farSE.png`.

---

## 0. Summary of what matters

1. **The on-model fair-weather sky is mostly empty.** All three clear-day boards (`ac7`, `ac12`, `ac13`) and
   roughly nine out of ten clear-day stills have no cloud at all. "Bland" is partly on-model; the fix is a better
   wash plus a *few* well-shaped clouds, not a busy sky.
2. **The current wash is too pale between about 8 and 30 degrees of elevation.** A level frame in the show reaches
   its full top colour (`#76C8F0`-`#85D1E7`, HSV saturation 0.42-0.51) at the top edge; ours reads `#B7E9FA`
   (saturation 0.27) there. This is the single biggest reason the sky looks weak.
3. **When Frieren does paint a day cloud it is a soft cumulus puff, not a wisp and not a tower**: feathered on every
   side, slightly firmer and scalloped on top, ragged underneath, and its "shadow" is simply thinner white letting
   the sky through. No grey, no violet, no hard base line, no rim light.
4. The current thin wisps with a firm white upper edge (the hairline streak in `sk0-farSE.png`) have no
   counterpart in the daytime material I could find. They come from the sunrise board (`ac10`), which is a
   different weather and time.
5. Recommended build: **direction-space cloud cards** (instanced tangent-plane quads at infinity, sampling a small
   start-up-baked atlas of distance-field "cels") over a 2-fetch wash. No pole, no parallax, crisp under the
   14-degree lens, art-directable by a short placement list, about a third of the current texture work.

---

## 1. How Frieren paints daytime skies and clouds

### 1.1 Who and how

- Art director Sawako Takagi, backgrounds by Studio Wyeth; concept art and colour script by Seiko Yoshioka. [S]
  https://frieren-anime.jp/staffcast/ , https://blog.sakugabooru.com/2023/10/05/crafting-a-tangible-aging-world-frieren-beyond-journeys-end-production-notes-01-04/
- Yoshioka on Takagi's work: "美術監督の高木さんが紙に絵の具で描かれる、水彩画のようなにじみや揺らぎがある背景美術"
  - backgrounds painted with paint on paper, with watercolour-like bleeding and unevenness. [S]
  https://www.mdn.co.jp/design/features/7155
- So the sky is a physical wet wash on paper (poster colour / gouache used thin), scanned, then composited. That is
  where the two visible textures come from: broad uneven brush passes in the wash, and fine paper/scan grain.
- I found **no interview in which Takagi or Wyeth discuss skies or clouds specifically** (searched in Japanese and
  English). Everything below about cloud construction is read off the images. [U for stated intent]
- Official boards: https://frieren-anime.jp/news/929/ (site is behind a bot challenge; the same images are in
  `refs/`, URLs in `refs/ac.txt`), mirrored at https://animecorner.me/frieren-beyond-journeys-end-concept-art-stuns-in-new-images/

### 1.2 The wash: hue and value from top of frame to horizon [M]

Each row is a vertical column of samples through clear sky. "% down" is the position between the top of the visible
sky and the horizon.

Official boards (Studio Wyeth, 昼/晴れ):

| Image | top | ~25% | ~50% | ~75% | just above horizon |
|---|---|---|---|---|---|
| `ac12` ruined chapel / flower field | `#91E5FB` | `#93E6FE` | `#A5EEFD` | `#BAF3FE` | `#F1FFFE` then `#FEFFFE` |
| `ac13` castle gate | `#9BDDF7` | `#A2E3F9` | `#A9E5FB` | `#B9EDFD` | `#F2FFFE`, `#FFFFFD` |
| `ac7` cliff | `#74C6EE` | `#7ECDF2` | `#8FD8F6` | `#B6EAF7` | `#E7F3F2` |
| `ac16` plaza (sky seen high between roofs) | `#78C5E1`-`#7DC7E0` | | | | |

Aired stills:

| Still | top | upper third | middle | lower third | just above horizon |
|---|---|---|---|---|---|
| Royal Capital EP1 (castle) | `#76C8F0` | `#81CEF0` | `#92D4F4` | `#B7E3F7`, `#D2F0FA` | `#ECF9FC` |
| Holy City of Strahl EP2 | `#6FC2E9` | `#73C6EC` | `#7CCBEF` | `#A2D9F4` | `#E0F5FA` |
| Fern on the cliff EP1 (camera tilted up) | `#85D1E7` | `#84D2E7` | `#9BDCED` | `#BAE9F4`, `#DCF2F2` | `#F0F4F1` |
| Eng Road hills EP7 (only the low sky in frame) | `#AFE2F4` | `#B1E2F4` | `#BAE5F4` | `#CEEAF4` | `#DEF1F6`, `#E3F1F3` |
| Klar Region EP16 | `#83BCE7` | `#8BC3E9` | `#9FD2EC` | `#C5E8F2` | `#EBF5F4` |
| Größe Forest village EP3 (has cumulus) | `#7ECAF2` | `#88D0F3` | `#9CDCF7` | `#A2DFF7` | (hidden) |

What this says:

- **Hue.** Boards sit at 190-195 degrees (cyan: `#91E5FB`). Aired frames sit at 198-206 degrees (`#76C8F0`,
  `#83BCE7`), a little bluer and darker after colour grading. Never ultramarine. The current uniforms
  (`uZenith #79C9F0`, `uDeep #5FB4E6`) are the right hue family for the aired look.
- **Value range.** Top of frame is HSV value 0.91-0.98 with saturation 0.42-0.52; the horizon is essentially
  white with a breath of cyan or green (`#F1FFFE`, `#ECF9FC`, `#F0F4F1`). The whole sky lives in the top
  quarter of the value scale; depth comes from saturation, not darkness.
- **Shape of the gradient.** It is not linear. The top half of the visible sky barely changes (`#91E5FB` to
  `#A5EEFD` on the board), the change accelerates in the third quarter, and the bottom 10-15% is a white band.
  In wash terms: a full-strength pass at the top, thinned with water on the way down, bare paper at the bottom.
- **The gradient is composed per picture, not per elevation.** The tilted-up cliff shot still runs from full
  colour at the top to white at the bottom of the frame. A painter gives every frame the whole range. A sky that
  is a pure function of elevation cannot do this for a free camera; see 3.6 for the compromise. [I]
- **Estimated elevation mapping for a level, normal-lens frame** (assuming roughly 35 degrees of vertical field
  and the horizon about 70% down, as in the Royal Capital still; the lens of a painting is a guess) [I]:

  | elevation | colour |
  |---|---|
  | 0-2 deg | `#F1FBFC` (white band) |
  | 5 deg | `#D2F0FA` |
  | 9 deg | `#B7E3F7` |
  | 14 deg | `#92D4F4` |
  | 24 deg | `#78C8F0` |
  | 50 deg (extrapolated, no reference looks this high) | `#66BBEA` |
  | zenith (extrapolated) | `#5AB0E5` |

- **Compared with the current shader** (same elevations, computed from the code): 9 deg gives about `#CEF1FB`
  against `#B7E3F7`; 14 deg about `#A6E4F9` against `#92D4F4`; 24 deg about `#99DCF6` against `#78C8F0`.
  Measured in `sk0-farW.png`: top of frame `#B7E9FA`, middle `#D5F2F9`. The existing stops are stretched over
  too much elevation (`smoothstep(0.20, 0.80, h)` reaches the zenith colour at 53 degrees).
- **Azimuth / the sun's side.** On the boards the left and right ends of the sky are the same colour to within
  one code value (`ac12`: `#8EE3FA` left, `#8FE3FB` right). No sun disc, glow or flare appears in any daytime
  frame. Keep the existing warm bleach toward the sun, but it should stay below what is noticeable in a single
  frame (it is currently up to 50% toward `#FFFEF5` at the horizon, which is more than the references show). [M/I]
- **Texture in the wash.**
  - Fine grain: after removing the vertical gradient, luminance standard deviation in a 200x120 patch is
    1.0-1.8 code values in the stills and 1.0 on the board scan. The current render measures 1.85 in open sky:
    already right, do not add more. [M]
  - Broad unevenness: a contrast-stretched crop of the Strahl still and of `ac7` shows soft mottling and faint
    long diagonal brush passes, a few percent in value, tens of degrees long. This is the "にじみや揺らぎ". It is
    present but below the level at which it reads as cloud. [M]
  - No banding and no hard step anywhere in a clear-day wash. The "one quiet step overhead" in the current shader
    has no counterpart in the references. [M]

### 1.3 Cloud types that actually occur

Tally over the material examined [M]:

- Clear-day boards: 3 of 3 cloudless (`ac7`, `ac12`, `ac13`). `ac7` has only a pale veil low on the right.
- Clear-day stills (about 20): cloudless in all but one or two. Examples with nothing in the sky: Royal Capital,
  Royal Capital landscape, Strahl landscape, Holy City of Strahl, Klar Region, Turk Region village and farmlands,
  Eng Road, Offen Mountain Range, Wille Region.
- **Fair-weather cumulus**: Größe Forest village EP3 - one large mass cropped by the top-right corner, one small
  detached puff, one faint flat cloud low on the left. This is the model for our scene.
- **Overcast** (`ac8`, `ac11`; stills: Schwer Mountains, Stark's village, the EP10 grave field): a full grey-white
  ceiling of soft billows, `#CACFD7` to `#EDEDEF`, value range under 15%, neutral with a slight violet cast. Not our
  weather.
- **Sunrise streaks** (`ac10`): long diagonal dry-brushed altocumulus/cirrus streaks, violet body (`#A997D9`,
  `#9B9FC1`) with warm lit undersides (`#F0B172`, `#FFDC9D`). This is where "thin wisp with one lit edge" comes
  from. Not midday.
- **Concept art** (`ac2`, Yoshioka, digital): broad soft cumulus masses in two tones, `#FFFFFF` / `#F5FAFD` on
  `#B0D6F8`, more cloud than the final boards. A looser, earlier statement of the same idea.
- Not found in any daytime frame: towering cumulonimbus, flat stratocumulus bands with ruled bases, hard-edged
  cirrus streaks, sun rays, lens flare.

From memory of the series there are a few shots with bigger cumulus than this (journey montages, the opening);
I could not retrieve frames to measure, so they are not used here. [U]

### 1.4 How a Frieren cumulus is built (Größe Forest village EP3) [M]

Sky behind it runs `#7ECAF2` (top) to `#A2DFF7` (lower).

| Part | Colour | Equivalent |
|---|---|---|
| Densest body, upper middle | `#E7F9FA` | white at about 85-90% over the sky |
| Body, typical | `#DDF5F9`, `#DCF4F8` | white at about 75-80% |
| Thin lower and lee parts ("shadow") | `#C3ECF8`, `#CEEFF9`, `#D0F1F9` | white at about 50-60% |
| Small detached puff | `#DCF4F8` centre, `#CAEBF8` edge | |
| Faint low cloud near the trees | `#DDF4F9` on `#A2DFF7` | lower contrast, flatter |

Construction:

- **Number of values: two, and both are white.** There is no separately mixed shadow colour. The darker tone is
  the same white laid thinner, so it takes the sky's hue. Lit-to-shade difference is only 5-8% in value. Clean
  `#FFFFFF` does not occur; the brightest cloud is slightly cyan.
- **Silhouette.** A heap of 4-6 unequal lobes. The top is scalloped but shallowly (lobes overlap by more than
  half), and lumps are of clearly different sizes: one dominant mass, two or three secondary, a few scraps.
  One long diagonal lean to the whole mass, as if drawn out by wind.
- **Base.** Not flat and not ruled. It trails off into ragged, thinner tatters and short detached scraps; the
  under-edge is the softest edge of the cloud.
- **Edge quality.** Nowhere hard. The crown edge resolves over roughly 0.3-0.6% of frame width (about 6-12 px at
  1080p) with a slightly broken, dabbed outline (a round brush pressed on, not a cut mask). Lee side and base
  feather over 2-4% of frame width, with dry-brush break-up. Small notches of sky bite into the outline.
- **Interior.** Almost featureless: two or three broad, very soft darker passages suggesting the divisions
  between lobes, plus paper grain. No drawn interior contours, no cauliflower detail.
- **Size and placement.** The large mass spans about 40% of frame width and is cropped by the frame on two
  sides; the small puff is about 9% of frame width and sits alone in open sky, about 12% of frame width away from
  the mass; the third cloud is low, faint and wide. The characters and the gate stand against clean sky.

### 1.5 Composition conventions [M for the one frame, I as rules]

- **Rests dominate.** Even in the cloudy frame over half the sky is empty. Across the series the default is none.
- **One mass, one echo, one whisper.** A large cropped mass, a small detached puff, a faint low cloud. Never an
  even scatter and never a row.
- **Clouds live at the frame's edges and corners**, diagonally opposite the subject. The subject's silhouette is
  always against plain wash. This is exactly the existing "calm sector" rule.
- **Perspective.** Lower clouds are smaller, flatter (wider than tall) and paler, and merge into the white band;
  nothing with a firm edge sits in the bottom 5 degrees. General anime-background practice agrees: near clouds
  large and high, far clouds small, flat and low; shadows mixed from the sky colour rather than grey; soft edges
  for distance, firm edges only for the nearest cloud. [S] https://www.clipstudio.net/oekaki/archives/152583
- **Horizon haze.** The white band is the haze. Far hills dissolve into it (`#C0CACA`, `#B4CBD3` ranges on `ac13`),
  so the meeting of land and sky is the lowest-contrast place in the picture.
- **Sun side.** Not differentiated in the references (see 1.2). For clouds, the only consistent cue is that the
  denser, whiter part is up and slightly toward the light, and the thin part is down and away. [I]

### 1.6 Neighbouring styles, so we aim at the right one

- **Ghibli / Kazuo Oga.** Same medium (Nicker poster colour on wetted paper). Oga pre-mixes four colours before
  starting a sky: a lighter and a darker blue for the gradation, and a white and a grey for the lit and shadow
  parts of the cloud; soft cloud edges come from working into the wet paper with a large flat brush, with a
  pointed brush for the finish. [S] https://gurneyjourney.blogspot.com/2018/05/painting-in-ghibli-style.html ,
  http://gurneyjourney.blogspot.com/2017/03/demo-by-kazuo-oga.html
  Differences from Frieren [I, from general knowledge of the films]: Oga's summer cumulus are sculpted volumes -
  firm cauliflower crowns, a clearly separate blue-grey to violet-grey shadow tone, flattish bases, often the
  star of the frame; the blue is deeper and more cobalt. Frieren uses the same technique at lower contrast,
  cyan rather than cobalt, with far fewer and softer clouds and no separate shadow mix.
- **Makoto Shinkai** (digital). Deep ultramarine to cobalt zenith, towering cumulonimbus with many values,
  crisp photographic detail, back-lit rim light, sun rays and lens flare; the sky is the subject of the shot.
  [S for rim light and layered structure] http://www.mclelun.com/2016/05/anime-cloud-tutorial.html
  Everything that makes a Shinkai sky is absent from Frieren's. If a cloud needs more than two tones, a rim
  light, or a dark base, it has left the target.
- **Target in one line:** Oga's method with the contrast turned down and most of the clouds removed.

### 1.7 What this means for the present sky

| Current | Reference | Action |
|---|---|---|
| Wash pale between 8 and 30 degrees | full colour by about 24 degrees | compress the stops (table in 1.2) |
| "One quiet step" deepening overhead | no steps | make the overhead deepening a continuous, slow ramp |
| Thin wisps with a firm white upper edge | absent at midday | remove |
| Level streaks over the horizon | absent; the horizon is plain white haze | remove or reduce to one or two faint flat puffs |
| High cirrus feathers at 30-55 degrees | absent | remove; the broad wash mottling covers "something up there" |
| Cloud shade `#D5E2EE` (blue-grey) | thinner white over sky | make shade an opacity, not a colour |
| Calm sector behind the chapel | matches the composition rule | keep |
| Grain sd 1.85 | 1.0-1.8 | keep, do not increase |

---

## 2. Real-time techniques for painted clouds under a free camera

Costs are estimates for an integrated GPU at 1280x720 (0.92 Mpx, sky about 45% of pixels). I could not measure
anything here; the ranking between methods is more trustworthy than the absolute numbers.

### 2.1 Where the cloud lives: direction space or world space

- **Direction space (function of view direction only; "skybox").** Clouds are at infinity: camera translation
  produces no parallax, which is exactly how a painted backdrop behaves and what `sky.js` already does.
  Rotation behaves correctly. Failure modes depend on the parameterisation:
  - Equirectangular / cylindrical strips (the current `makeCloudPano`): pinch at the zenith, horizontal stretch by
    1/cos(elevation) (1.22x at 35 degrees, 2x at 60). A level line in the strip is a small circle on the sphere,
    which draws as a *curve* when the camera tilts up - this is the "hard white arc" noted in the present shader.
    Resolution: 4096 px around is 11.4 px per degree; the 14-degree lens at 720p shows about 51 px per degree, so
    the strip is magnified 4.5x and any edge stored in it turns to mush.
  - Zenith-plane projection (`d.xz / d.y`): fine overhead, stretches without bound toward the horizon; straight
    streaks become beams converging on a vanishing point.
  - Cube map or octahedral map: no pole. Cube-map texel density varies 1 : 0.19 centre to corner in solid angle;
    octahedral has creases along the fold lines (visible only in filtered derivatives). A 6x1024 cube is 11 px
    per degree and 24 MB as RGBA8, 6 MB as R8. [S for the general trade-off]
    https://www.stevestreeting.com/2021/04/06/skyboxes-in-ue4/
- **World-space billboards / shells with parallax** (BotW's material clouds, most open-world games). Needed when
  the player flies among clouds or clouds must cast shadows that match. For a painting it is wrong: as the camera
  walks, clouds slide against the far hills and the picture reads as a 3-D set. Billboards also rotate or shear
  as the camera passes under them. Not recommended here except as cards pinned to the camera, which is direction
  space by another name.
- **Camera-centred cards (direction-space cards).** Quads placed tangent to the sky sphere around the camera, each
  with its own flat (gnomonic) parameterisation. No pole anywhere, no stretch beyond the tangent-plane error
  (1.03x at the edge of a 30-degree-wide card), great circles stay straight so a cloud base is a straight line
  on screen at any camera attitude, and resolution is spent only where clouds are. This is the "sky card"
  practice of fighting-game and anime-styled stages. [I for the comparison; see 2.6 for the games]

### 2.2 Shape authoring

- **Threshold of FBM noise on a projected plane** - the usual "cartoon sky shader":
  `uv = dir.xz / (dir.y + 0.3)`, three octaves, `smoothstep(0.4, 0.4 + sharpness, n)`, fade toward the horizon.
  [S] https://godotshaders.com/shader/cartoon-sky-shader/
  Cheap (3-6 fetches or hashes), endless and unrepeating, but the shapes are noise islands: no heaped silhouette,
  no top/bottom difference, no composition control, and animated thresholds make edges boil. Wrong tool for a
  composed painting. Shadertoy's 2-D cloud experiments are of this family
  (https://www.shadertoy.com/view/tlB3zK , https://www.shadertoy.com/view/3sVXRR).
- **SDF / metaball cumulus with noise-scalloped edges.** A cloud is a smooth union of 6-12 circles on a base
  line; small noise displaces the distance to scallop and roughen the outline. Gives a designed silhouette,
  a top/bottom asymmetry by construction, and an analytic height field (hemisphere caps) for lighting. Can be
  evaluated per pixel (resolution-independent, cost grows with circle count) or baked.
- **Baked distance-field cels, thresholded in the shader.** Store the signed distance (not the final alpha) at low
  resolution; reconstruct the edge with `smoothstep` around 0.5. Edges stay sharp under magnification because a
  distance field interpolates linearly - the idea behind SDF font rendering. Adding a brush-noise term to the
  distance before thresholding gives a dabbed or dry-brushed edge at any zoom, and moving the threshold grows or
  dissolves the cloud. This is the reported Genshin Impact cloud-card layout: R = light/shade, G = rim light,
  B = distance field used for dissolve, A = opacity. [S, secondary: search-result summary of
  https://zhuanlan.zhihu.com/p/637947850 ; the page itself returned 403, so details are unverified]
  Genshin's console talk also describes baking the sky to a small texture for fog and reflection colour.
  [S] https://nugglet.github.io/posts/2022/12/console_graphics_rendering_pipeline_genshin_impact
- **Hand-painted cards** (Photoshop cloud on a quad). Not available: the project has no image assets. The baked
  cel is the procedural stand-in.

### 2.3 Lighting a painted cloud

- **Toon band from an analytic height field.** With hemisphere caps `h = sqrt(r^2 - |p - c|^2)` the normal is known;
  `N . L` thresholded once gives a lit/shade split whose boundary follows the lobes. One band is the most
  Frieren allows, and its edge must be very soft (about a fifth of a lobe radius).
- **Shade as opacity.** Because Frieren's shade is thinner white (1.4), the band should drive *alpha*
  (about 0.9 lit, 0.55 shade), not a second colour. The cloud then picks up the sky's hue wherever it sits and
  needs no knowledge of the wash colour.
- **Rim light / subsurface channel** (Genshin G channel; BotW's separate edge layer with back-lighting
  [S] https://www.resetera.com/threads/zelda-breath-of-the-wild-the-technical-analysis.8197/): right for back-lit
  and sunset skies, wrong for this one.

### 2.4 Brush-edge thresholding

`alpha = smoothstep(0.5 - w, 0.5 + w, sdf + (brush - 0.5) * amp)`.

- `w` is the softness: small on the crown, large underneath and on the lee side (store a softness mask in a
  channel, or derive it from height in the cel).
- `amp` and the brush texture's scale set the character: fine isotropic noise gives a dabbed gouache edge;
  stretched noise (the stroke layer already in `makeCloudTexture`, channel B) gives dry-brush drag.
- The noise must be sampled in the cloud's own coordinates and must not animate, or the edge boils. In view or
  world coordinates it swims when the camera turns.
- Antialias with `max(w, fwidth(sdf))` so the edge never gets thinner than a pixel at the wide lens.

### 2.5 Layers, parallax, baking

- **Layered cels with slight parallax.** In camera-stand terms these are "book" layers sliding at different
  speeds. A different *drift rate* per layer (horizon layer at half speed) is authentic and free. Parallax driven
  by camera *translation* is not: it reveals depth. Parallax driven by camera rotation does not exist for
  anything at infinity. So: differential drift yes, translational parallax no.
- **Pre-baked panorama (canvas or off-screen shader at start-up) vs per-pixel evaluation.**
  - Bake: one fetch per layer at run time, arbitrary complexity in the bake, a start-up cost, fixed resolution
    (fatal for hard edges under the long lens unless the bake stores a distance field).
  - Per pixel: unlimited resolution, costs every frame, shapes limited by what fits in the budget.
  - Baked SDF plus per-pixel threshold and brush noise takes the good half of each.
- **Start-up bake cost.** `makeCloudPano` draws about a thousand radial gradients into a 4096x512 canvas and
  blurs it (timed into `window.__skyMs`). A distance-field atlas of 16 cells of 512x256 is 2 Mpx with 10-20
  circle evaluations each: of the order of 100-200 ms in plain JavaScript, or a few milliseconds as one
  full-screen pass into a render target. [I]

### 2.6 What shipped games do

| Game | Approach | Relevance |
|---|---|---|
| Genshin Impact | Sky-dome gradient plus hand-authored cloud cards; multi-channel texture with a distance-field channel for dissolve; sky baked to a small texture for fog/reflections. [S, partly secondary - see 2.2] | Closest precedent for "anime cloud that keeps a crisp painted edge and can grow or fade". |
| Zelda: Breath of the Wild | No conventional skybox: scattering-based sky, procedurally generated 2-D (non-volumetric) cloud material with separate edge layer and back-lighting, a faster grain layer rippling the edges, soft cloud shadows. [S] https://www.resetera.com/threads/zelda-breath-of-the-wild-the-technical-analysis.8197/ (a fan analysis, not Nintendo) | Shows 2-D clouds can pass in a large free-camera world; its rippling edges are the opposite of a held painting. |
| Zelda: Tears of the Kingdom | Volumetric particles near, static fallback texture far. [S, search summary of https://gamingbolt.com/the-legend-of-zelda-tears-of-the-kingdom-graphics-analysis-how-big-of-a-leap-is-it] | Not applicable (fly-through clouds). |
| Sable | Flat shading; readability from layered fog toward the horizon colour. [S] https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability . A three.js reimplementation documents a procedural gradient sky with flat thresholded clouds, a cap projection overhead, and one shared threshold for clouds and their ground shadows. [S] https://github.com/rnaud/moebius | Fog toward the sky's horizon colour is the important lesson; the clouds are noise islands. |
| Guilty Gear Xrd / DBFZ | Talk covers characters and the general "2-D look in 3-D" method; I found no primary statement about sky cards. [U] https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf | The lesson that transfers is holding animation on limited frame steps. |
| Ni no Kuni | No technical source found. [U] | - |
| Sky: Children of the Light | GDC talks exist on art and character rendering; none found on clouds. [U] https://gdcvault.com/play/1026903/Art-of-Sky-Children-of | Its clouds are fly-through volumes; not our case. |

### 2.7 Cost and failure modes side by side

| Technique | Cost at 720p (est.) | Failure modes |
|---|---|---|
| Current: equirect strip + several noise fetches | 7-8 fetches on every sky pixel | zenith pinch (avoided by fading out), curved level lines when looking up, 4.5x magnification at 14 degrees, wisp character |
| FBM threshold on zenith plane | 3-6 fetches per sky pixel | horizon stretch, noise-island shapes, no composition, boiling if animated |
| Baked SDF strip (cylindrical) + threshold | 3-4 fetches per sky pixel | still curved bases when tilted, usable only below about 35 degrees, lobes under 1 degree lost |
| Cube-map SDF bake | 2-3 fetches per sky pixel | no pole; 6-24 MB; same 11 px/degree limit; six-face bake code |
| **Direction-space SDF cards** | 2 fetches per sky pixel + 2 per card pixel (cards cover perhaps a fifth of the sky) | blending into a 3-target MRT needs care (3.3); card edge clipping if a cel touches its border; sorting if cards overlap |
| Analytic metaballs per pixel | loop of 8-12 bound tests per sky pixel, 10-20 circle evaluations + 2 fetches inside clouds | branchy cost that varies with view; interior detail limited |
| World-space billboards / shells | similar to cards | parallax against the far hills, billboard shear overhead |
| Volumetric ray-march | 20-60 samples per pixel | far over budget and wrong look |

---

## 3. Recommended design

Ranking:

1. **Option A - direction-space cloud cards with a baked distance-field cel atlas.** Recommended.
2. **Option B - baked distance-field strip for the low band**, replacing the wisp bake in place. Smallest change;
   weaker under the long lens and when tilted up.
3. **Option C - analytic per-pixel cumulus.** No bake and unlimited sharpness; highest per-frame cost and the
   plainest clouds.

Parts 3.1 (wash), 3.5 (animation) and 3.7 (feeding the scene) apply to all three.

### 3.1 The wash (all options)

Two fetches, no steps, no pole.

- Sky coordinates for every wash texture: the stereographic map `s = d.xz / (1.0 + d.y)`. It is conformal (brush
  texture is not sheared anywhere), regular at the zenith, singular only at the nadir, and its scale varies by
  only 2x between horizon and zenith. This replaces both `d.xz / (|d.y| + k)` variants and every azimuth-based
  lookup, which pinch.
- Stops from the table in 1.2, written on `d.y = sin(elevation)`:
  0.035 (2 deg), 0.087 (5), 0.156 (9), 0.242 (14), 0.407 (24), 0.766 (50), 1.0.
- Broad unevenness: one low-frequency fetch displaces the lookup height by about +-0.03 and multiplies value by
  +-1.5%. A second, higher-frequency fetch supplies pigment grain at about +-1% (the post pipeline adds its own
  grain; total should stay near 1.5 code values).
- Sun-side bleach: keep, but cap near 0.2 and confine below 8 degrees.

```glsl
// sky wash: a pure function of direction, 2 fetches
const vec3 W0 = vec3(0.945, 0.984, 0.988);   // #F1FBFC  0-2 deg
const vec3 W1 = vec3(0.824, 0.941, 0.980);   // #D2F0FA  5 deg
const vec3 W2 = vec3(0.718, 0.890, 0.969);   // #B7E3F7  9 deg
const vec3 W3 = vec3(0.573, 0.831, 0.957);   // #92D4F4  14 deg
const vec3 W4 = vec3(0.471, 0.784, 0.941);   // #78C8F0  24 deg
const vec3 W5 = vec3(0.400, 0.733, 0.918);   // #66BBEA  50 deg  (extrapolated)
const vec3 W6 = vec3(0.353, 0.690, 0.898);   // #5AB0E5  zenith  (extrapolated)

vec3 washRamp(float h){
  vec3 c = mix(W0, W1, smoothstep(0.035, 0.087, h));
  c = mix(c, W2, smoothstep(0.087, 0.156, h));
  c = mix(c, W3, smoothstep(0.156, 0.242, h));
  c = mix(c, W4, smoothstep(0.242, 0.407, h));
  c = mix(c, W5, smoothstep(0.407, 0.766, h));
  return mix(c, W6, smoothstep(0.766, 1.0, h));
}

vec3 skyWash(vec3 d){
  vec2 s = d.xz / (1.0 + max(d.y, -0.5));          // stereographic: no pole in the upper hemisphere
  vec4 broad = texture(uCloud, s * 0.11 + 0.21);   // the uneven hand
  vec4 fine  = texture(uCloud, s * 1.70 + 0.37);   // pigment / paper
  float h = d.y + uPitchBias + (broad.r - 0.5) * 0.06 + (fine.g - 0.5) * 0.012;
  vec3 c = washRamp(clamp(h, -0.2, 1.0));
  c *= 1.0 + (broad.a - 0.5) * 0.030 + (fine.a - 0.5) * 0.020 * smoothstep(0.05, 0.3, h);
  float sunAz = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz)), 0.0);
  c = mix(c, vec3(1.0, 0.995, 0.965), pow(sunAz, 3.0) * (1.0 - smoothstep(0.0, 0.14, d.y)) * 0.2);
  return mix(c, uHazeCol, smoothstep(0.0, -0.08, d.y));
}
```

(`uPitchBias` is 0 unless the optional frame-relative gradient in 3.6 is used. The smoothstep chain is piecewise;
if a faint Mach band shows at a stop, replace the chain with a 64x1 ramp texture baked from the same stops.)

### 3.2 Option A: data layout

**Cel atlas**, baked once at start-up: 2048x1024 RGBA8, mipmapped, 16 cells of 512x256 with a 12-px empty
gutter inside each cell (2 Mpx: 8 MB as RGBA8, about 11 MB with mips).

| Channel | Content |
|---|---|
| R | signed distance to the silhouette, 0.5 = edge, +-0.5 = +-40 px; inside is above 0.5 |
| G | light term 0..1: `N . L` of the height field, L pointing up and 35 degrees toward the cloud's sunny side |
| B | softness mask 0..1: 0 on the crown, 1 underneath and on the lee side |
| A | thickness 0..1 (normalised height), for the dense core |

Suggested cells: 6 large cumulus heaps, 4 small puffs, 3 flat low clouds, 3 ragged scraps.

**Per-instance attributes** (one `InstancedBufferGeometry`, a 4x2-segment quad, one draw call):

| Attribute | Meaning |
|---|---|
| `aCenter` vec3 | unit direction of the cloud's centre at drift = 0 |
| `aHalf` vec2 | tan of the half-width and half-height angles |
| `aCell` vec4 | atlas rectangle (u0, v0, du, dv); negative du mirrors the cel |
| `aLook` vec4 | roll (radians), opacity, drift-rate multiplier, brush seed |

A typical sky uses 9-14 instances.

### 3.3 Option A: shaders

Vertex: build a tangent frame at the (drifted) centre and place the quad on the sky sphere around the camera.

```glsl
in vec3 position;                 // quad corner in [-1,1]^2 (z unused)
in vec3 aCenter; in vec2 aHalf; in vec4 aCell; in vec4 aLook;
out vec2 vUv; out vec2 vLocal; out vec4 vLook; out float vCalm; out float vElev;

void main(){
  float a = uTime * uDrift * aLook.z;                      // uTime is already held on twos
  float ca = cos(a), sa = sin(a);
  vec3 c = vec3(ca * aCenter.x - sa * aCenter.z, aCenter.y, sa * aCenter.x + ca * aCenter.z);
  // tangent frame; the reference axis switches near the zenith, so there is no pole
  vec3 ref = abs(c.y) > 0.94 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 r = normalize(cross(ref, c));
  vec3 u = cross(c, r);
  float cr = cos(aLook.x), sr = sin(aLook.x);
  vec2 q = vec2(cr * position.x - sr * position.y, sr * position.x + cr * position.y) * aHalf;
  vec3 dir = normalize(c + r * q.x + u * q.y);             // gnomonic patch
  vUv = aCell.xy + (position.xy * 0.5 + 0.5) * aCell.zw;
  vLocal = position.xy * aHalf * 40.0 + aLook.w * 17.0;    // brush coordinates fixed to the cloud
  vLook = aLook;
  vElev = c.y;
  // calm sector: fade by the cloud centre's present azimuth and elevation
  float az = atan(c.z, c.x) / 6.2831853;
  float dAz = abs(fract(az + 0.29 + 0.5) - 0.5);
  vCalm = (1.0 - smoothstep(0.10, 0.22, dAz)) * (1.0 - smoothstep(0.60, 0.80, c.y));
  vec4 p = projectionMatrix * viewMatrix * vec4(dir * 3000.0 + uCamPos, 1.0);
  gl_Position = p.xyww;
}
```

Fragment: threshold the distance with brush noise; shade is opacity.

```glsl
in vec2 vUv; in vec2 vLocal; in vec4 vLook; in float vCalm; in float vElev;
uniform sampler2D uCels, uCloud;

void main(){
  vec4 k = texture(uCels, vUv);
  vec4 br = texture(uCloud, vLocal);                       // .a fine fbm, .b drawn strokes
  float soft = k.b;
  // a cloud entering the calm sector evaporates: the threshold rises, so it thins from its edges
  float d = k.r - 0.5 - vCalm * 0.30
          + (br.a - 0.5) * mix(0.06, 0.22, soft)           // dabbed crown, ragged base
          + (br.b - 0.5) * 0.10 * soft;                    // dry-brush drag underneath
  float w = max(mix(0.02, 0.16, soft), fwidth(k.r) * 1.5);
  float cover = smoothstep(-w, w, d);
  if (cover < 0.004) discard;
  // one very soft band: lit white laid thick, shade the same white laid thin
  float lit = smoothstep(0.38, 0.62, k.g + (br.a - 0.5) * 0.18);
  float body = mix(0.55, 0.90, max(lit, smoothstep(0.55, 0.9, k.a)));
  // lower clouds are paler and sink into the white band
  float low = smoothstep(0.03, 0.20, vElev);
  float alpha = cover * body * vLook.y * mix(0.45, 1.0, low);
  vec3 col = mix(vec3(0.925, 0.972, 0.985), vec3(0.965, 0.990, 0.992), lit);   // #ECF8FB .. #F6FCFD
  col = mix(vec3(1.0, 0.995, 0.975), col, low);            // a breath of warmth near the horizon
  oColor  = vec4(col * alpha, alpha);                      // premultiplied
  oNormal = vec4(0.0);
  oAux    = vec4(0.0);
}
```

Integration notes:

- **Blending with three render targets.** WebGL2 applies one blend state to all draw buffers. Use
  `blending: THREE.CustomBlending`, `blendSrc: OneFactor`, `blendDst: OneMinusSrcAlphaFactor`,
  `blendSrcAlpha: ZeroFactor`, `blendDstAlpha: OneFactor`. With `oNormal` and `oAux` written as zero they then pass
  the sky's values through unchanged (source alpha 0), and `oColor.a` keeps the sky's paint-filter weight of 0, so
  the pipeline still treats these pixels as sky (`aux.r > 5000`, no Kuwahara filtering).
  Verify this against `pipeline.js` before relying on it; I have read the output layout but not run it.
  If it does not hold, `OES_draw_buffers_indexed` gives per-buffer blending, or use the fallback below.
- `depthTest: true`, `depthWrite: false`, `renderOrder` 11 (after the sky at 10), `frustumCulled = false`.
- With 4x MSAA the blended edges are resolved normally; no alpha-to-coverage needed.
- Cards do not overlap in the suggested layouts, so no sorting. If two must overlap, order instances far-to-near
  by intent.
- **Fallback without blending:** evaluate the cards inside the sky fragment shader with a loop over a uniform
  array (`vec4 uCard[12]` etc.), projecting `d` into each tangent frame and skipping when outside. Same atlas, same
  look, one extra dot product and bound test per card per sky pixel. Costs more than instancing but stays inside
  one material.

### 3.4 Authoring the cels procedurally

Per cel, from a seeded generator (reuse `rng` in `far-tex.js`):

1. **Skeleton.** A base line at 30% of the cell height, tilted up to +-4 degrees. Place 5-8 primary circles along it
   with radii from a skewed hump envelope (peak at 35-45% of the length, so the mass leans), radius ratio largest
   to smallest about 3:1, neighbours overlapping by 55-70% of the smaller radius. Add 4-7 secondary circles on the
   upper arc of the primaries at 0.35-0.5 of the parent radius (the scallops), and 2-4 small ones strung out past
   the lee end (the tail). Add 1-3 detached scraps 0.1-0.2 of the cell away.
2. **Distance field.** Smooth union of the circle distances (`smin` with k of about 0.15 of the mean radius), then
   domain-warp the sample position by two octaves of low-frequency noise (amplitude 6-10% of the big radius) so
   no lobe is a true arc. Below the base line subtract a ramp so the underside erodes instead of ending on a rule;
   add noise there at twice the amplitude.
3. **Height and light.** Height `h = max_i sqrt(max(r_i^2 - |p - c_i|^2, 0))`, blurred slightly; normal from its
   gradient; `G = saturate(0.5 + 0.5 * dot(n, L))` with `L = normalize(vec3(0.45, 0.80, 0.40))` in cel space
   (x toward the sunny side, y up, z toward the viewer). Mirror the cel (negative `aCell.z`) so the sunny side
   faces the scene's sun azimuth.
4. **Softness.** `B = saturate(1 - (y - base) / (0.6 * height))` raised toward the lee end, so the crown is firm
   and the base and tail are feathered.
5. **Variants.** Flat low clouds: 4-6 circles with the vertical scale squashed to 0.35, softness 0.7 everywhere.
   Puffs: 3-4 circles. Scraps: 2-3 small circles, softness 1.

**Placement list** (the art-directable part): plain data in `sky.js`, angles in degrees. Azimuth convention as in
the shader, `az = atan2(z, x)`; the calm sector is centred on about -104 degrees (north, slightly west) and fades
out by +-80 degrees.

```js
// az, el (deg), width (deg), cel, mirror, opacity, drift
const CLOUDS = [
  // anchor group, east of the chapel: one mass, one echo, one whisper
  { az:  -18, el: 27, w: 34, cel: 'heapA', op: 1.00, drift: 1.0 },
  { az:    9, el: 21, w:  8, cel: 'puffB', op: 0.90, drift: 1.0 },
  { az:  -34, el:  9, w: 16, cel: 'flatA', op: 0.60, drift: 0.5 },
  // south-west group, behind the viewer on the approach
  { az:  118, el: 33, w: 28, cel: 'heapC', op: 1.00, drift: 1.0 },
  { az:  141, el: 24, w:  7, cel: 'puffA', op: 0.85, drift: 1.0 },
  { az:   96, el: 11, w: 13, cel: 'flatB', op: 0.55, drift: 0.5 },
  // west, over the far ranges: low and pale only
  { az:  172, el:  7, w: 18, cel: 'flatC', op: 0.50, drift: 0.5 },
  { az: -168, el: 14, w:  9, cel: 'puffC', op: 0.70, drift: 1.0 },
  // high, off the hero axis: one soft mass for the look-up views
  { az:   60, el: 62, w: 30, cel: 'heapE', op: 0.80, drift: 1.0 },
];
```

These numbers are a starting layout, not a measured one; check them in the hero, `farW`, `farSE` and `skyUp`
views. Rules to hold while tuning:

- Three groups at most, each "mass + echo + whisper"; at least 60% of the azimuth circle empty below 40 degrees.
- Nothing above opacity 0.6 below 8 degrees of elevation; nothing at all below 4 degrees.
- Size and flatness by elevation: width scale about `mix(0.3, 1.0, saturate(sin(el) / sin(35 deg)))`; height to
  width about 0.5 for heaps high up, 0.2 for the low flat clouds.
- No two cards the same cel within one field of view; mirror and roll (+-6 degrees) to vary.
- In the hero frame (camera at 11, 1.7, 23 looking toward -115 degrees azimuth, 5 degrees up; about 54 degrees
  wide at fov 32), any cloud must be cropped by the frame edge by at least 40% and must not touch the gable
  silhouette. The calm fade enforces the second automatically.

### 3.5 Animation

- Whole-cloud drift only: rotation of card centres about the vertical axis. Rate 0.03-0.06 degrees per second
  (the present value is 0.065). At fov 14 and 720p, 0.05 degrees per second is about 2.5 px per second.
- Time is the existing stepped `uTime` (12 fps), so clouds move in held steps of about 0.2 px at the long lens,
  like a sliding cel layer. If that sub-pixel stepping shimmers on the firm crown edge, quantise the drift angle
  to steps of 1/60 degree (about one pixel at fov 14).
- Brush and edge noise are sampled in `vLocal`, fixed to the card: edges never boil or swim.
- The low layer drifts at half speed (`drift: 0.5`). That is the only "parallax".
- Entering the calm sector, a cloud dissolves through the distance threshold (thins from the edges inward over
  about 40 degrees of travel) rather than fading as a ghost. Clouds leaving the sector re-form the same way.
  One revolution takes 100-200 minutes, so the layout is effectively static within a session.
- No shape morphing. A painted cloud does not billow.

### 3.6 Zenith, and the frame-relative gradient

- No pole: wash textures use the stereographic map; cards carry their own tangent frame, with the reference axis
  switched above 70 degrees. A card may sit exactly overhead.
- Keep the zenith quiet: at most one large, soft, low-opacity (0.8) heap above 50 degrees, well off the hero axis.
- **Optional - frame-relative gradient.** Painters give every frame the full range from colour to white (1.2).
  A cheap approximation: `uPitchBias = -0.35 * sin(cameraPitch)` (smoothed over about a second), added to the
  wash height. Looking up 40 degrees then shifts the ramp so the bottom of the frame is still visibly paler than
  the top.
  - Helps: tilted-up views keep a gradient instead of a flat mid-blue.
  - Hurts: the sky's colour is no longer a pure function of direction; it shifts slowly while tilting, like
    auto-exposure. It must be slow and small, and the haze colour fed to the scene (3.7) must not follow it.
  - Recommendation: build it behind a URL flag and judge it in motion.

### 3.7 Feeding the scene

- **Haze.** `uHazeCol` is `#E4F0EE` and `uHazeFarCol` `#EDF5F6`; the sky's white band is `#F1FBFC`. Set the far haze
  to the wash colour at about 1 degree (`#F1FBFC`) and the near haze to the wash at about 4 degrees toned slightly
  toward the ground (`#E3F3F4`), so the far ranges close onto the sky without a seam. Export the stops from one JS
  table and derive both the shader constants and these uniforms from it, so they cannot drift apart.
- **Ambient / shade tint.** The cosine-weighted mean of the new wash over the upper hemisphere is about `#84CCF0`.
  [I, computed by eye from the stops, not integrated] Use it only as a small bias on up-facing shade
  (the stone shader's "sky" zone); the show's shadows are violet-grey, not blue, so keep the bias under 10%.
- **Top-of-frame sky is darker after this change.** Foliage "sky holes" and light wrap that assume the present pale
  sky will read differently; re-check the tree crowns against `#78C8F0`.
- **Cloud shadows on the ground.** The Eng Road hills still has one far mountain in cloud shade. Optional: one
  very large, very soft, static darkening on a far range. Do not drift shadows across the meadow; that is a 3-D
  cue and the references never show it.

### 3.8 Budget

| | Fetches | Notes |
|---|---|---|
| Current sky | 7-8 on every sky pixel | plus `atan`, about 20 smoothsteps |
| Wash (3.1) | 2 on every sky pixel | one `normalize`, 7 smoothsteps |
| Cards (3.3) | 2 on card pixels | cards cover roughly 15-25% of the sky in a cloudy view, 0% in the calm sector |

At 720p with 45% sky: about 3.3 M fetches now, about 1.0-1.2 M after. That should be comfortably inside 0.3 ms
on an integrated GPU, but it is an estimate; measure with the existing frame timer. One extra draw call, 9-14
instances, 72-112 triangles. Texture memory about 11 MB against the current 4096x512 strip (about 11 MB with mips,
if RGBA) - no increase. Start-up bake: budget 150 ms in JS, or move it to a shader pass.

### 3.9 Option B: distance-field strip in the existing shader

Keep the structure of `sky.js`; replace what the strip stores and how it is read.

- `makeCloudPano` bakes the same circle-heap clouds (3.4) into the 4096x512 cylindrical strip as two channels,
  distance (R) and light/softness packed (G), covering elevations 0-40 degrees.
- Shader: one strip fetch, one brush fetch, threshold exactly as in 3.3; wash as in 3.1. Total 4 fetches.
- Calm sector: do not paint clouds there in the bake, and keep the existing `calm` term as a threshold offset.
- Zenith: fade the strip out between 30 and 38 degrees; nothing above.
- Trade-offs:
  - Smallest code change, no blending question, no new geometry.
  - Bases curve when the camera tilts up (small circles), most visibly for clouds above 20 degrees.
  - 11 px per degree: the distance field keeps the main outline crisp at fov 14, but scallops under about one
    degree are lost and the brush noise has to supply all fine edge character.
  - Horizontal stretch 1.3x at 40 degrees; pre-squash clouds by cos(elevation) in the bake.
  - Clouds are fixed in the bake: moving one means re-baking; per-cloud drift rates are impossible.
- A cube-map version (six 1024 faces, R8 or RG8) removes the pole and the curvature at the cost of six bake
  passes and 6-12 MB.

### 3.10 Option C: analytic cumulus per pixel

No bake. Each cloud is a small set of circles in its tangent plane, evaluated in the sky fragment shader.

```glsl
// K clouds, each: centre direction, half-size, seed; circles generated from the seed by hashing
for (int i = 0; i < K; i++) {
  vec3 c = uCloudDir[i];
  float cd = dot(d, c);
  if (cd < uCloudCos[i]) continue;                 // outside the bounding cone
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), c)), u = cross(c, r);
  vec2 p = vec2(dot(d, r), dot(d, u)) / cd / uCloudHalf[i];   // gnomonic, -1..1
  float sd = 1e3, h = 0.0;
  for (int j = 0; j < 8; j++) {
    vec3 cj = circle(i, j);                         // xy centre, z radius, from a hash
    float l = length(p - cj.xy);
    sd = smin(sd, l - cj.z, 0.12);
    h = max(h, sqrt(max(cj.z * cj.z - l * l, 0.0)));
  }
  // base erosion, brush threshold and opacity band as in 3.3, using sd and h
}
```

- Unlimited sharpness; cloud shapes can be changed by a seed at run time.
- Cost: K bound tests on every sky pixel (K of 10-12), and inside a cone 8 circle evaluations plus 2 fetches.
  Light needs the height gradient: either finite differences (3x the circle work) or accept a simpler
  "height above base" term. Roughly 2-4x the cost of option A in cloudy views, and the cost varies with the view.
- Needs the near-zenith frame switch from 3.3 as well.
- Interiors are plainer than a baked cel (no warp, no blur) unless more work is spent per pixel.

### 3.11 Should there be parallax layers at all?

- Camera-translation parallax between cloud layers, or between clouds and the far hills: **no**. It is the
  strongest possible signal that the sky is a 3-D object, and the scene's free camera would expose it constantly.
- Differential drift between a low and a high layer: **yes, slight**. It is what a camera-stand shot with a
  sliding sky layer does, and at these rates it is nearly invisible.
- The stronger depth cue, and the one the references actually use, is pictorial: lower clouds smaller, flatter,
  paler, and sunk into the white band.

---

## 4. Open questions and things not verified

- No statement from Takagi or Studio Wyeth about how skies are painted was found; section 1 rests on image
  measurement and on one remark by Yoshioka about the medium.
- The still sample is 47 frames from 13 episodes, biased toward establishing shots. Episodes with larger cumulus
  may exist and were not measured.
- Colours of stills are after the show's compositing and whatever compression the wiki applied; board scans are
  JPEGs. Treat hex values as +-3 per channel.
- The elevation mapping in 1.2 assumes a field of view for a painting. The two extrapolated stops (50 degrees and
  zenith) have no reference at all.
- Genshin's card channel layout comes from a search summary of a page that could not be opened. BotW details
  come from a fan analysis. No primary source was found for Guilty Gear sky cards, Ni no Kuni, or Sky.
- No timing was measured. The MRT blend behaviour in 3.3 is reasoned from the output layout in `src/glsl.js`, not
  tested.

## 5. Sources

Frieren and background painting

- Staff list: https://frieren-anime.jp/staffcast/
- Concept art and art boards (official): https://frieren-anime.jp/news/929/ ; mirror https://animecorner.me/frieren-beyond-journeys-end-concept-art-stuns-in-new-images/ ; https://animageplus.jp/articles/detail/55395
- Seiko Yoshioka interview (part 2): https://www.mdn.co.jp/design/features/7155
- Sakuga Blog production notes 01-04: https://blog.sakugabooru.com/2023/10/05/crafting-a-tangible-aging-world-frieren-beyond-journeys-end-production-notes-01-04/
- Producer interview naming Wyeth's backgrounds as the main influence on the look: https://comicbook.com/anime/news/frieren-producer-versus-fantasy-anime-interview/
- Episode stills: https://frieren.fandom.com/wiki/Category:Episode_1_images (and episodes 2-28)
- Kazuo Oga's method: http://gurneyjourney.blogspot.com/2017/03/demo-by-kazuo-oga.html ; https://gurneyjourney.blogspot.com/2018/05/painting-in-ghibli-style.html ; https://animationobsessive.substack.com/p/what-kazuo-oga-thinks-about-when
- Sky and cloud painting rules: https://www.clipstudio.net/oekaki/archives/152583
- Anime cloud tutorial (front-lit vs back-lit): http://www.mclelun.com/2016/05/anime-cloud-tutorial.html

Real-time techniques

- Cartoon sky shader (FBM threshold on a projected plane): https://godotshaders.com/shader/cartoon-sky-shader/
- Shadertoy 2-D clouds: https://www.shadertoy.com/view/tlB3zK ; https://www.shadertoy.com/view/3sVXRR
- Genshin Impact console pipeline notes: https://nugglet.github.io/posts/2022/12/console_graphics_rendering_pipeline_genshin_impact
- Card clouds with a distance-field dissolve channel (not opened, 403): https://zhuanlan.zhihu.com/p/637947850
- Breath of the Wild technical analysis (fan): https://www.resetera.com/threads/zelda-breath-of-the-wild-the-technical-analysis.8197/
- Tears of the Kingdom graphics analysis: https://gamingbolt.com/the-legend-of-zelda-tears-of-the-kingdom-graphics-analysis-how-big-of-a-leap-is-it
- Sable readability and fog: https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability
- Sable-style three.js proof of concept: https://github.com/rnaud/moebius
- Guilty Gear Xrd GDC 2015 handout: https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf
- Sky: Children of the Light art talk: https://gdcvault.com/play/1026903/Art-of-Sky-Children-of
- Skybox formats: https://www.stevestreeting.com/2021/04/06/skyboxes-in-ue4/
