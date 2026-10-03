# NPR techniques for a free-camera "walkable anime background" (three.js / WebGL2 / integrated GPU)

Survey date: 2026-10-01. Target look: hand-painted TV-anime background art (Frieren-style poster-colour/gouache), environment only, fully procedural, free camera, ~1080p at 60 fps (30 acceptable) on an integrated GPU.

**How to read the evidence level.** Each section separates what a source says from what I infer.

- **[S]** = stated by a source I opened or searched this session (link given).
- **[K]** = well-known content of the cited source, recalled from memory, not re-read this session (several PDFs/pages were blocked: the Bénard PDF, the Xrd handout PDF, the Spider-Verse ACM page, the Codrops Susurrus article). Verify before relying on exact numbers or channel assignments.
- **[I]** = my own inference / design suggestion. Nothing marked [I] has been tested.
- All performance figures are **estimates by tap-count arithmetic, not measurements**. Nothing in this document was benchmarked.

---

## 0. The core observation that shapes everything

A TV-anime background is not a "filtered 3D render". Its defining properties are:

1. **Designed flat shapes** with a small number of values (typically 2-4 per material: light, half-tone, shadow, accent), with hue-shifted (not darkened) shadows.
2. **Brush texture that lives at the scale of the canvas**, not the object: marks are roughly the same size on a near rock and a far mountain.
3. **Edges are where the paint is**: soft/dry-brush broken edges between value masses, almost no drawn line (lines belong to cels/characters; backgrounds use them sparingly and coloured).
4. **Depth is expressed as stacked flat layers** (near, mid, far, sky), each with its own value range, not a continuous exponential fog.
5. **No view-dependent shading**: no specular, no Fresnel, no SSAO-style contact gradients.

Property 2 is fundamentally in conflict with a free camera (a mark fixed to the canvas slides over the world; a mark fixed to the world changes size and foreshortens). Every technique in section 2 is a different compromise for this one conflict, and it is the main technical risk of the project.

---

## 1. Arc System Works (Guilty Gear Xrd / DBFZ / Strive)

Sources: Motomura GDC 2015 talk [video, GDC Vault](https://www.gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The), [Internet Archive copy](https://archive.org/details/GDC2015Motomura), [handout PDF](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf) (PDF could not be text-extracted this session; a copy was saved by the fetch tool), [ArcSys announcement](https://www.arcsystemworks.com/guilty-gear-xrds-art-style-the-x-factor-between-2d-and-3d-talk-from-gdc-2015-is-now-available-online/).

### What they do [K unless marked]

| Technique | Detail | Transfers to static environment + free camera? |
|---|---|---|
| Hard two-tone shading | `lit = step(threshold, NdotL * 0.5 + 0.5 + bias)`; no ramp gradient. Shadow colour = base colour x a hand-painted "SSS/tint" texture, so shadows are hue-shifted per material, not darkened. | **Yes, central.** Use a per-material shadow-tint colour instead of a texture. |
| Vertex-colour threshold control | Vertex colour R biases the shadow threshold (acts as painted AO: areas that should "always be in shadow" or "shadow easily"). A texture channel (the "ILM" map) gives further per-texel bias. Other vertex channels drive outline width, outline depth offset, and distance scaling of the outline. | **Yes.** For procedural geometry, bake a per-vertex "shadow-proneness" (crevice/underside/AO term) at generation time and add it to the threshold. This gives designed shadow shapes that never change with the camera. |
| Edited vertex normals | Normals are hand-edited / transferred from simple proxy shapes so the terminator is a clean designed curve rather than following mesh noise. | **Yes, the most valuable transfer.** For procedural assets, compute shading normals from a smoothed/low-frequency proxy (sphere for canopy, coarse hull for a rock, planar per wall face). Same idea as the "Ghibli tree" (section 5). |
| Inverted-hull outlines, per-vertex width | Second pass, front-face culled, vertices pushed along normal by width from vertex colour; width compensated for camera distance. | **Partly.** Doubles vertex cost, breaks on hard-edged geometry (needs smoothed normals stored separately), gives silhouette lines only. For environments a screen-space edge pass (section 4) is cheaper and more controllable. Keep inverted hull only for a few hero props if needed. |
| Inner lines via texel-aligned UVs ("Motomura lines") | Lines painted in a texture channel on UV islands straightened so lines are axis-aligned and stay crisp at any zoom. | **No** for procedural assets (needs hand UV work). Replace with ID/normal edge detection or SDF lines computed in the shader. |
| Per-character light vector | Each character has its own light direction, animated per shot for best-looking shadows, independent of scene lighting. | **Yes, as a principle.** Light direction is an art parameter. Per-object-class light directions (trees vs. cliffs) are acceptable; Blue Protocol similarly has only the primary light affect toon shadows [S, [4Gamer CEDEC 2021](https://www.4gamer.net/games/467/G046741/20210826001/)]. |
| No-perspective tricks | Low FOV, plus per-shot bone scaling to fake 2D foreshortening. | **Partly.** Long lens transfers (section 6). Per-shot geometry cheats do not survive a free camera. |
| Limited animation | Stepped keys, no interpolation (on 2s/3s). | **Not applicable to static geometry**, but applies to wind/cloud/water motion: update foliage sway and cloud shapes at 8-12 fps while the camera runs at 60 [I]. This is a strong "drawn" cue and costs nothing. |
| No texture filtering blur / high texel density on lines | Crisp edges at all zoom levels. | **Yes**: use analytic `smoothstep(±fwidth)` thresholds rather than textures for hard edges. |

### Key lesson
Xrd's look comes from **controlling where the terminator falls** (normals + threshold bias), not from a post filter. The same applies to backgrounds: decide the 2-4 value shapes in the material shader; use post only for texture and "photography".

---

## 2. Temporal coherence of brush texture (the "shower door" problem)

Reference survey: Bénard, Bousseau, Thollot, "State-of-the-Art Report on Temporal Coherence for Stylized Animations", CGF 2011 ([Wiley](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-8659.2011.02075.x), [ResearchGate](https://www.researchgate.net/publication/220507275_State-of-the-Art_Report_on_Temporal_Coherence_for_Stylized_Animations)). Its framing [K]: three goals that cannot all be satisfied at once — **flatness** (marks look 2D, constant screen size), **motion coherence** (marks move with the surface), **temporal continuity** (no popping/flicker). Every method trades one away.

### 2.1 Options

**A. Canvas-fixed (screen-space) texture.** Perfect flatness, zero motion coherence: the "shower door". Acceptable only for very low-contrast, high-frequency grain (paper tooth), where the eye reads it as the medium rather than as marks on objects.

**B. Object/world-space texture (UV or triplanar).** Perfect coherence, no flatness: marks shrink with distance and foreshorten at grazing angles, which reads as "textured 3D model". This is what most "hand-painted" games do (and Arcane's assets: hand-painted textures plus 2D matte paintings projected onto simple geometry [S, [RedShark](https://www.redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline)]).

**C. World-space texture with screen-size-stable scale ("fractalization" / infinite zoom).** Bénard, Bousseau, Thollot, "Dynamic Solid Textures for Real-Time Coherent Stylization", I3D 2009 ([project page](https://maverick.inria.fr/Publications/2009/BBT09/), [PDF](https://maverick.inria.fr/Publications/2009/BBT09/BBT09.pdf)). A solid (3D) texture is sampled at several octaves; the octave pair is chosen from log2 of view distance and cross-faded, so element size stays quasi-constant on screen at any distance [S]. Stated as "almost no loss in performance" in a game engine [S]. A practical shader of exactly this idea is Ben Golus's gist [S, [gist](https://gist.github.com/bgolus/c417fbbca71cdecd7dc3f747a6ff66d9)]:

```glsl
// world-anchored, constant-screen-size brush texture (2 taps per projection)
float d   = length(viewPos) * tanHalfFov;      // divide-by-projection term keeps size stable under FOV change
float x   = log2(d);
float l0  = floor(x);                          // octave below
float f   = x - l0;                            // 0..1 position between octaves
float s0  = exp2(l0), s1 = s0 * 2.0;
float a   = tex(worldUV / s0);                 // marks sized for distance s0
float b   = tex(worldUV / s1);                 // marks sized for distance s1
float n   = mix(a, b, f);
// contrast-preserving blend [I, standard variance-preserving trick]
n = (n - 0.5) / sqrt(f*f + (1.0-f)*(1.0-f)) + 0.5;
```
(The gist uses an even/odd octave pair with a triangle-wave blend so each layer is at full weight when the other swaps scale, which avoids a visible pop: `blend = abs(fract(x*0.5)*2.0-1.0)` [S].)

Artefacts [K from the paper + I]:
- Moving forward/back causes a continuous subtle "zooming/boiling" as octaves cross-fade.
- Mid-blend contrast loss and ghosting of two superimposed scales (worst for structured stroke textures, mild for noise-like textures). Bénard's follow-up "Quality assessment of fractalized NPR textures" ([ACM](https://dl.acm.org/doi/10.1145/1620993.1621016)) studies which media survive fractalization best [S existence; K conclusion: unstructured/noisy media survive, strongly directional strokes do not].
- Foreshortening remains: marks are still squashed on grazing surfaces (ground plane), because only scale is corrected, not anisotropy.
- With a per-pixel distance, the octave boundary is a visible ring on large surfaces unless blended; per-object distance avoids rings on small objects but pops between objects.

**D. Art maps / tonal art maps (hardware-mip version of C).** Klein et al., "Non-Photorealistic Virtual Environments" (SIGGRAPH 2000) [K] and Praun et al., "Real-Time Hatching" (SIGGRAPH 2001) ([Hoppe page](https://hhoppe.com/proj/hatching/), [PDF](https://hhoppe.com/hatching.pdf)). Author a mip chain by hand where **every mip level contains strokes of the same pixel size**, with strokes in coarse levels being a subset of those in finer levels (nesting) so trilinear blending fades strokes in rather than cross-dissolving unrelated patterns [S for TAM description]. The GPU's own LOD selection (from screen-space derivatives) then does the work of C for free, and it automatically accounts for FOV and resolution. In WebGL2 you can upload each mip level explicitly (`texImage2D` per level), so a procedural brush texture can be generated per level at init [I]. Klein et al. also proposed rip-maps to counter foreshortening [K]; approximated today by anisotropic filtering *off* plus LOD bias, or by doing the projection in a less foreshortened space (below).

**E. Object-anchored screen-space texture.** Screen-space UVs offset by the object pivot's screen position and scaled by pivot distance (see Unity forum threads on this exact trick: [1](https://discussions.unity.com/t/getting-textures-with-screen-space-uv-to-scale-with-camera-distance-in-shader-graph/945014), [2](https://discussions.unity.com/t/screenspace-uv/864327)). Perfectly flat marks, coherent under translation of the object across the screen, quantise the scale to log2 steps as in C. Fails under rotation around the object (marks slide over the surface) and is meaningless for terrain/large objects. Good for foliage clumps, small rocks, clouds [I].

**F. Advected / reprojected screen-space noise.** Kass & Pesare, "Coherent Noise for Non-Photorealistic Rendering", SIGGRAPH 2011 ([Pixar library](https://graphics.pixar.com/library/indexAuthorPesare.html), [Semantic Scholar](https://www.semanticscholar.org/paper/Coherent-noise-for-non-photorealistic-rendering-Kass-Pesare/bd4defa8bb0f8e7b6e0ae5af9be3d22c48c62066)). White noise is filtered along motion using depth and velocity fields so it has stationary 2D statistics per frame yet moves with surfaces; "fast and suitable for interactive applications like games" [S]. Causal (real-time) form [K]:

```
n_t(p) = alpha * n_{t-1}(reproject(p)) + sqrt(1 - alpha^2) * w_t(p)     // w_t = fresh white noise
if disoccluded(p) (depth mismatch): n_t(p) = w_t(p)
```
For a **static scene the velocity field is free**: reproject with previous view-projection matrix and current depth; no velocity buffer needed [I]. Cost: one fullscreen pass plus a history target. Problems [K/I]: only suits noise-like (isotropic, unstructured) textures, not shaped brush strokes; repeated bilinear resampling blurs the noise (use nearest sampling or keep alpha < 1 so fresh noise is re-injected — which re-introduces mild sparkle); disocclusion regions flicker. Good for grain/granulation and for perturbing thresholds, not for visible strokes.

**G. Stroke particles (Meier).** Barbara Meier, "Painterly Rendering for Animation", SIGGRAPH 1996 ([PDF](https://www.eecs.umich.edu/courses/eecs498-2/papers/meier96.pdf), [Disney page](https://disneyanimation.com/publications/painterly-rendering-for-animation/)). Surfaces are covered by 3D particles; each is drawn as a 2D screen-space brush stroke sorted back to front, taking colour/orientation/size from reference renders, so strokes stick to surfaces yet are 2D [S]. A WebGL attempt exists: Hanson & Todd, "Object-Space Painterly Rendering for WebGL" ([PDF](https://www.cs.rpi.edu/~cutler/classes/advancedgraphics/S14/final_projects/scott_andy.pdf)). Real-time issues [K/I]: constant screen-size strokes need density LOD (strokes must be added/removed with distance → popping unless faded; Meier's scheme had fixed density), alpha-blended strokes need sorting, and overdraw is the worst possible workload for an integrated GPU. Viable only where geometry is naturally "blobs of strokes": **foliage, grass tufts, clouds** (which is exactly the Ghibli-tree technique, section 5).

**H. What films do (none face a free camera).**
- *Spider-Verse*: linework generated/animated by artists with tooling (Kismet in Houdini for Across the Spider-Verse) so lines can "redraw" yet adhere to the animation [S, [ACM talk abstract](https://dl.acm.org/doi/10.1145/3587421.3595456), [befores & afters](https://beforesandafters.com/2024/01/10/giving-spider-man-across-the-spider-verse-that-crucial-hand-made-quality/)]. Per-shot, artist-in-the-loop.
- *Puss in Boots: The Last Wish*: edge breakup, graphic rims, textured FX; tools that replace clean CG edges with looser brush-like points [S, [SIGGRAPH 2023 session](https://s2023.siggraph.org/presentation/?id=cafet_437&sess=sess281), [befores & afters](https://beforesandafters.com/2023/01/11/heres-how-dreamworks-lent-a-whole-new-brand-of-stylized-look-and-feel-to-puss-in-boots-the-last-wish/)]. Takeaway: **break up silhouettes and shadow edges with brush shapes** rather than texturing interiors.
- *Arcane*: painted textures + projected matte paintings [S, above]. Projection only holds near the painted viewpoint.
- *Klaus*: 2D animation; lighting (KLaS) and texture (MOE, Les Films du Poisson Rouge) are tracked to drawn lines by analysing the image sequence [S, [befores & afters](https://beforesandafters.com/2019/11/14/heres-what-made-the-2d-animation-in-klaus-look-3d/), [Animation Guild](https://animatorsguild.com/2020/01/02/klausinnovation/)]. Offline.
- Common thread: films also often hold textures for 2-3 frames ("on twos") so the residual incoherence reads as deliberate boil [K].

### 2.2 Answer: which gives stable brush marks at constant screen scale with a free camera in real time?

No method gives all three properties. Ranked for this project [I]:

1. **Mip-authored art map / log2-fractalized world-space (triplanar) texture (C/D)** as the main brush texture, used **to perturb decisions (shadow threshold, layer edges, patch colour choice, silhouette alpha) rather than as a visible overlay**. Because the result is thresholded, the cross-fade ghosting of fractalization mostly disappears: what the viewer sees is a hard painted edge whose wobble has constant screen size. Cost: 2 taps per projection, 6 with full triplanar; reduce to 2-4 by picking the dominant axis with a dithered/blended seam.
2. **Object-anchored screen-space (E)** for discrete soft objects (canopies, bushes, clouds).
3. **Direction-anchored grain for paper/canvas** (section 7): sample the paper texture by world-space view direction, which is exactly stable under camera rotation and only slips under translation.
4. **Reprojected coherent noise (F)** as an optional upgrade for the fine grain layer if the direction-anchored version slips too visibly when walking.
5. Canvas-fixed (A) only for film grain at very low amplitude.

To reduce residual foreshortening on the ground plane, counter-scale the triplanar UV along the view direction using the LOD the GPU would pick on each axis (`dFdx/dFdy` of world position) — i.e. choose octave per UV axis, a poor man's rip-map [I, untested; may shimmer].

---

## 3. Image-space painterly filters

### 3.1 Kuwahara family
- **Classic Kuwahara**: 4 overlapping square sectors around the pixel; output the mean of the sector with the lowest variance. Blocky artefacts.
- **Generalized (Papari)**: 8 circular sectors, Gaussian weights, soft selection `sum(m_i * s_i^-q) / sum(s_i^-q)` with q about 8 [K].
- **Anisotropic (Kyprianidis, Kang, Döllner 2009; GPU Pro 2010)**: structure tensor (Sobel → `(Gx.Gx, Gy.Gy, Gx.Gy)`), Gaussian-blur the tensor, eigen-decompose for orientation `phi` and anisotropy `A = (l1-l2)/(l1+l2)`, then stretch/rotate the circular kernel: scale `(alpha+A)/alpha` along the edge and its inverse across [K]. Sources: [polynomial-weights paper page](https://www.kyprianidis.com/p/npar2010/), [code](https://github.com/jkyprian/polyakf), [multi-scale version](https://www.kyprianidis.com/p/tpcg2010/).
- **Polynomial weighting** (Kyprianidis, Semmo, Kang, Döllner 2010): replaces the sector weight texture/convolution with a polynomial evaluated inline, `w = max(0, (x + zeta) - eta*y^2)^2` per rotated sector; "similar quality" without convolution [S, [EG digital library](https://diglib.eg.org/handle/10.2312/LocalChapterEvents.TPCG.TPCG10.025-030)].
- **three.js reference**: Maxime Heckel, "On Crafting Painterly Shaders" ([article](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders/)): three passes — structure tensor, anisotropic Kuwahara with polynomial weights, final pass with tone mapping, saturation, colour quantisation and paper texture; reports "close to 60 fps" (hardware not an integrated GPU as far as stated); notes large kernels destroy scene legibility [S].

**Cost estimate at 1080p (2.07 M pixels) [I, arithmetic only]:**

| Variant | Taps/pixel | Taps/frame full-res | Verdict on iGPU |
|---|---|---|---|
| Anisotropic, radius 6-8, 8 sectors | ~150-200 + tensor blur | 300-400 M | Not viable at full res; marginal at half res (~80-100 M) at 30 fps |
| Box Kuwahara radius 4 | 81 | 168 M | Too heavy full-res; OK half-res |
| 4-sector, 4 bilinear taps/sector (each tap averages 4 texels) | 16 | 33 M | Fine |
| **Mip/pre-blur Kuwahara**: build `mean` and `mean of squares` at a blurred level (one separable blur or a mip of colour and colour^2), then 4-8 taps of each, `var = E[x^2]-E[x]^2` | 8-16 + blur | ~20-40 M | Fine, and radius-independent (same idea as the summed-area-table Kuwahara reported as O(1) in kernel size [S, [ResearchGate](https://www.researchgate.net/publication/261268731_An_optimized_implementation_architecture_for_the_Kuwahara_filter)]) |

Half-res filtering then bilateral/edge-aware upsample using the full-res ID/depth buffer keeps silhouettes sharp [I].

**Caveats for this project [I]:**
- Kuwahara produces rounded "oil blobs". Anime backgrounds are crisp gouache shapes. If the material shader already outputs flat designed shapes, Kuwahara's main job (removing detail) is already done; its remaining use is rounding corners/softening geometric straightness. Use small radius, low mix, or skip.
- It is a per-frame image filter: with moving camera, sector selection flips between frames → **boiling/flicker along edges**. Less visible on already-flat input, worse on gradients/noise.
- Run it **before** lines and grain, never after.

### 3.2 Other filters
- **Symmetric Nearest Neighbour**: for each of the symmetric pixel pairs in the window, pick the one closer in colour to the centre; average the picks. Half the window fetched with selection; similar cost to a box blur of that radius, sharper edges than Kuwahara, more "speckled" [K].
- **Bilateral / xy-separable bilateral** (Winnemöller, Olsen, Gooch, "Real-time video abstraction", 2006) + luminance quantisation with soft steps: `q = qNearest + (dq/2) * tanh(phi * (L - qNearest))` [K]. Separable approximation makes it cheap (2 x 9-13 taps). Good general "flattening" pass, more stable temporally than Kuwahara.
- **XDoG** (Winnemöller, Kyprianidis, Olsen 2012, [paper](https://users.cs.northwestern.edu/~sco590/winnemoeller-cag2012.pdf), [demo code](https://github.com/jkyprian/xdog-demo)): `D = G_sigma - tau * G_(k sigma)` (k = 1.6), `T = D >= eps ? 1 : 1 + tanh(phi * (D - eps))`. Gives ink-like lines and, with large tau, tonal blocking. Cheap if the Gaussians are separable/mip-based. Useful to draw soft **coloured** interior lines from the lit image (e.g. along value boundaries).
- **Edge-tangent-flow smoothing** (Kang, Lee, Chui, "Flow-based image abstraction", [ResearchGate](https://www.researchgate.net/publication/23472929_Flow-Based_Image_Abstraction); "Coherent Line Drawing", [PDF](https://cg.postech.ac.kr/papers/kang_npar07_hi.pdf)): iterative vector-field smoothing then line-integral filtering. Multiple iterations; too expensive and too flickery for the gain here.
- **"Oil paint" filter** (histogram-mode in a window): heavy and blocky; dominated by Kuwahara.

---

## 4. Outlines / line art for environments

### 4.1 Screen-space edge detection
Tutorial references: Alexander Ameye, "Edge detection outlines" ([link](https://ameye.dev/notes/edge-detection-outlines/)) and "5 ways to draw an outline" ([link](https://ameye.dev/notes/rendering-outlines/)).

- Buffers: depth, view-space normal, luminance; Roberts cross on a 2x2 diagonal neighbourhood (4 taps), `edge = sqrt(dot(d1,d1)+dot(d2,d2))`, separate thresholds, `max` of the three [S, Ameye; thresholds there are depth 1/200, normals 1/4].
- **Object/"section" ID buffer** is the most robust source for environment lines: any ID difference = line. No thresholds, no grazing-angle false positives. Sable is described as rendering parts in distinct colours and detecting colour changes, plus depth/normal [S, community analysis: [Steam thread](https://steamcommunity.com/app/757310/discussions/0/1696049513785363261/); official art discussion: [Game Developer](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability)].
- Depth edges need a grazing-angle correction or flat ground far away turns solid black. Standard fix [K]: `depthThreshold *= 1 + k * (1 - saturate(dot(N, V)))` and scale by linear depth; or use second differences of depth (Laplacian) which are zero on planes.
- Linear depth, not NDC depth.

**Line styling [I unless marked]:**
- **Width**: sample neighbours at `uv ± w * texel`, `w` in pixels. Constant pixel width is the "drawn" choice. Modulate by depth layer (thinner/absent far away). Sable fades line opacity with distance, which also hides pop-in [S, Game Developer].
- **Wobble**: displace the *sampling UV* of the edge pass by a low-frequency noise (1-2 px amplitude). The noise must be world-anchored (use the fractalized noise of section 2 written to the G-buffer) or it will shower-door.
- **Line breaking**: multiply edge strength by a thresholded noise; drop lines on lit side (`edge *= 1 - lit*k`) so lines exist mainly in shadow, as painters do.
- **Coloured lines**: `lineColor = darken/saturate(the darker of the two neighbouring albedos)`, never black. For anime backgrounds this is essential.
- **SDF lines**: for procedural assets, lines can be analytic in the material (`smoothstep` on a distance to a plank seam / brick joint / rock crack in object space, width scaled by `fwidth` to stay constant in pixels). Perfectly stable, no post cost, and gives the "inner line" role of Xrd's texture lines.
- Anti-aliasing: do the edge pass at full res and resolve with FXAA/SMAA after; TAA smears thin lines (Blue Protocol used Responsive AA instead of TAA to preserve outlines [S, 4Gamer]).

### 4.2 What shipped games do

| Game | Environment approach | Source |
|---|---|---|
| **Sable** | Flat colour, thin lines from post edge detection, lines fade with distance; fog "really, really key" for mid/long-range readability; shadows required to read where things sit | [S] [Game Developer](https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability), [Cook & Becker](https://www.cookandbecker.com/en/article/170/sable-exploration-through-line-art.html) |
| **Hi-Fi Rush** | Custom *deferred toon renderer* in UE4 for characters and environment, "toon shading a 3D world in a 2D way"; comic shader, toon lights, static shadow maps, stylised GI, at 60 fps | [S] [GDC 2024 talk](https://gdcvault.com/play/1034330/3D-Toon-Rendering-in-Hi), [YouTube](https://www.youtube.com/watch?v=gdBACyIOCtc), [80.lv](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style). Detail beyond this not extracted; watch the talk. |
| **Blue Protocol** | UE4 deferred, heavily modified: depth-based Sobel outlines with width via filter offset and mask to suppress lines; binary light/shadow mask with shadow colour; only primary light casts toon shadows; sky/indirect light mostly ignores normals; diffusion post on bright areas; nearly all G-buffer channels used | [S] [4Gamer CEDEC 2021](https://www.4gamer.net/games/467/G046741/20210826001/), [CEDEC session](https://cedec.cesa.or.jp/2021/session/detail/s605da5b7ddab8.html), [GameBusiness](https://www.gamebusiness.jp/article/2021/09/13/19051.html) |
| **Tales of Arise** ("Atmospheric Shader") | Layered custom shaders in UE4: watercolour-like treatment that is stronger with distance (foreground stays detailed/realistic, background is painted with fewer details/colours), colour adjustment and airy fog | [S] [Bandai Namco Studios interview](https://www.bandainamcostudios.com/en/behind-the-game/673) (no implementation detail), search summaries of the CEDEC 2021 talk. I could not find the slides; implementation details are **unverified**. |
| **Genshin Impact** | "PBR-based stylised" rather than flat: 8-cascade shadows with Poisson soft edges, HBAO + AO volumes, volumetric fog, stylised dynamic clouds | [S] [write-up of Unite Seoul 2020 talk](https://nugglet.github.io/posts/2022/12/console_graphics_rendering_pipeline_genshin_impact), [slides (JP)](https://www.docswell.com/s/UnityJapan/KWRPQ5-210617-unity-dojo20211mihoyozhenzhongyi). Note this is *not* the look you want: soft shadows + AO are 3D cues. |
| **BOTW / TOTK** | Toon-ramped lighting on characters, softer semi-PBR environment, strong aerial perspective, grass coloured from terrain | [K]; CEDEC 2017 summaries: [Scribd](https://www.scribd.com/document/361160173/Zelda-BotW-CEDEC-2017-English-Summary) |
| **Borderlands, Ni no Kuni, DQ XI, Rollerdrome, ZZZ** | Borderlands: hand-inked textures + Sobel post outline; Ni no Kuni / DQ XI: painted textures, toon ramps, conventional 3D; Rollerdrome: flat colour + edge lines (Sable-like); ZZZ: no public environment talk found | [K], no sources retrieved this session |

Takeaway: every shipped example is either "flat + lines" (Sable, Rollerdrome) or "toon 3D with painted textures". **None attempts constant-screen-size brush texture in a free camera**; Tales of Arise is the closest (distance-keyed painterly treatment), and it leaves the foreground conventional.

---

## 5. Stylised foliage, grass, clouds

### 5.1 "Ghibli tree"
Sources: [Blender Artists thread](https://blenderartists.org/t/ghibli-style-tree-shader-for-eevee/1454355), [Trung Duy Nguyen's anime foliage pipeline](https://trungduyng.substack.com/p/tutorial-blender-anime-foliage-pipeline), [Lightning Boy Studio tree tools](https://lightningboystudio.gumroad.com/l/RZcQI), three.js: [douges.dev "fluffy trees"](https://douges.dev/blog/threejs-trees-1), [craftzdog/ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader), [three.js forum fluffy tree](https://discourse.threejs.org/t/fluffy-tree-anime-style/86626).

Recipe [S for the pieces, I for the synthesis]:
1. Canopy = a few blobby hulls (procedural: union of 3-7 displaced spheres).
2. Scatter N quads on the hull surface (instanced). Each quad has UV 0..1 and stores its hull-surface position and the canopy centre.
3. **Billboard in view space** (douges.dev): `mv = modelViewMatrix * vec4(anchor,1); mv.xy += (uv - 0.5) * size; gl_Position = projectionMatrix * mv;`
4. **Normal transfer**: shading normal = `normalize(anchor - canopyCenter)` (optionally blended toward up), identical for all 4 corners of a quad → each card is one flat tone, and the canopy shades as 2-3 masses.
5. Alpha-cutout with a **brush-dab shaped mask** (procedural: SDF blob with ragged dry-brush edge). Use alpha-test or alpha-to-coverage, not blending (no sorting, no overdraw blend cost).
6. Toon-step the lighting with 2-3 tones; hue shift shadow.

Free-camera artefacts and fixes [I]:
- Full billboards spin when the camera rolls/pitches and "crawl" when orbiting. Mitigate: keep the card's up axis locked to world-up when pitch is moderate; give each card a random in-plane rotation that stays fixed; make dabs roundish so rotation is invisible.
- Card overlap ordering changes with view → popping in the interior; invisible if all cards within a mass have the same tone (which the normal transfer ensures).
- Card size: scale with distance (`size ∝ clamp(dist)`) so dabs keep a roughly constant screen size, and reduce card count with distance (LOD by instance count) — this is Meier's particle idea with density LOD.
- Shadow casting: cast from the hull proxy, not the cards.

### 5.2 Grass as painted patches
- BOTW-style: blades take **colour from the terrain beneath** (sample the terrain colour map at the blade root) and use an **up-facing normal** so the field shades as one surface; blades only provide silhouette and motion. three.js write-up: [James Smyth](https://smythdesign.com/blog/stylized-grass-webgl/); Unity reference: [Daniel Ilett's repo](https://github.com/daniel-ilett/shaders-botw-grass) [S existence; K detail].
- Ghost of Tsushima: GPU-generated blades with procedural shape; [GDC talk](https://gdcvault.com/play/1027033/Advanced-Graphics-Summit-Procedural-Grass), [YouTube](https://youtube.com/watch?v=Ibe1JBF5i5Y) [S]. Far LOD and colour details not extracted this session.
- For the anime-background look [I]: mostly **don't draw blades**. Paint the ground as 2-3 flat greens split by fractalized noise thresholds (patches of light/dark grass), then add sparse **tuft cards** (brush-dab cutouts, same technique as leaves, coloured exactly as the ground patch beneath plus a lighter tip tone) only along silhouettes and in the near field. Anime BG painters indicate grass with a few strokes at patch boundaries, not uniformly.

### 5.3 Clouds
Sources: [Kristof Dedene's Ghibli cloud shader](https://kdedene.gumroad.com/l/HppXdl), [Blender Artists Ghibli cloud tutorial](https://blenderartists.org/t/shader-tutorial-ghibli-anime-style-clouds-for-blender/1254644), [nokdef stylised puffy clouds](https://nokdef.com/2024/10/27/stylized-puffy-clouds-shader/), [Joe Rannells anime cloud shader](https://ranman.artstation.com/projects/aYXLBR).

Common recipe [K/S]: simple blob meshes or cards, normals from spheres, noise-displaced silhouette, lighting stepped into 2-3 tones (white, light blue-grey, shadow blue), noise added to `NdotL` before the step so the terminator is cauliflower-shaped, soft only at wispy edges.

For this project [I]: paint clouds **in the sky dome shader** as 2D shapes: `d = fbm(dirUV * s) - coverage; lit = step(0, fbm(dirUV*s + sunDir2D*eps) - fbm(dirUV*s) ...)` i.e. a 2D "relief" light using the density gradient toward the sun, thresholded into 3 tones; hard `smoothstep(±fwidth)` edges with fbm-perturbed threshold. Because the sky is at infinity, it is **exactly stable under any camera motion that matters** (only rotation changes it). This is the one element that can look 100% like a painting. Animate cloud evolution in steps (every 0.25-0.5 s) for a drawn feel. Add 3-6 billboard cumulus cards at the horizon for parallax if needed.

---

## 6. Flattening depth cues

All [I] unless a source is given; these are standard practice assembled for this target.

**Projection.** Use a long lens: vertical FOV 20-35 degrees. Reduces perspective convergence and foreshortening so more surfaces face the canvas and brush textures foreshorten less. Costs: narrow view feels claustrophobic when navigating; parallax is still there. Consider FOV widening only while moving fast. Do not use orthographic for a walkable scene. Xrd uses low FOV for the same reason [K].

**Layered atmosphere instead of exponential fog.**
```glsl
// world-space distance bands, with painted (noise-perturbed) boundaries
float d  = linearDepth + (brushNoise - 0.5) * bandJitter * linearDepth;
float t  = bandIndex(d);            // piecewise: e.g. edges at 15, 40, 120, 400 m
float k  = floor(t) + smoothstep(0.5 - e, 0.5 + e, fract(t));   // narrow soft step
vec3 fogCol = layerColor[int(k)];   // per-layer flat colour from palette
float amt   = layerAmount[int(k)];  // e.g. 0, .15, .4, .7, .9
col = mix(col, fogCol, amt);
col = mix(vec3(luma(col)), col, layerSaturation) ;  // also compress contrast/saturation per layer
```
Problems: band boundaries are view-relative, so they **sweep across geometry as you walk** (a visible value step crawling over a hillside). Mitigations: (a) assign the layer **per object** on the CPU from object-centre distance with temporal smoothing/hysteresis, so each tree/rock is one flat value like a cut-out layer (this is the most "painted" option and Sable/Arise-like distance treatments suggest it works); (b) per-pixel only for terrain, with wide soft steps; (c) height-based haze (valley mist) in world space, which is camera-independent.

Also reduce **detail** per layer: far layers use fewer tones (2 → 1), no lines, no interior texture (Tales of Arise's stated behaviour: distant objects "with less details and colors" [S]).

**Lighting.** Remove specular, Fresnel, environment reflections, SSAO, soft GI. Lighting = `step` on (edited-normal NdotL + vertex bias + brush noise). 2-3 tones via palette lookup:
```glsl
float l   = dot(nEdit, L) * 0.5 + 0.5 + vBias + (brush - 0.5) * edgeBreak;
float sh  = shadowTerm;                           // see below, 0..1 hard
float tone = min(smoothstep(t1 - w, t1 + w, l), sh);   // w = fwidth(l) for AA only
vec3 col  = mix(shadowCol, lightCol, tone);       // both from per-material palette, shadow hue-shifted toward sky colour
// optional third tone: + step(t2, l) * accent
```
Hue-shifted shadows: shadow colour = albedo rotated toward the ambient (cool blue-violet under a warm sun) with saturation kept or raised, value dropped modestly; store explicit light/shadow pairs in a palette texture (N materials x M times-of-day) rather than computing.

**Designed shadows from shadow maps.**
1. Render one modest shadow map (1024-2048, single cascade fitted to the visible near/mid range; far layers need no cast shadows).
2. Sample with 4-tap PCF (hardware `sampler2DShadow` gives a bilinear-filtered 0..1) → slightly blurred visibility `v`.
3. Re-threshold: `sh = smoothstep(0.5 - a, 0.5 + a, v + (brush - 0.5) * breakup)`. Blur-then-step rounds off sharp corners and noise, producing blobby "designed" shadow shapes; brush noise makes the edge dry-brush. Wider blur = rounder shapes.
4. Stabilise: texel-snap the shadow frustum to avoid edge crawl under camera motion; static scene → render the shadow map only when the sun moves (near-zero per-frame cost; Hi-Fi Rush also leans on static shadow maps [S]).
5. Simplify casters: canopy hulls and coarse proxies, so shadows are simple masses.
SDF shadows are an alternative for a fully procedural analytic scene but not needed.

**Depth quantisation / parallax.** Parallax itself is the strongest 3D cue and cannot be removed with a free camera. What can be removed: intra-object shading gradients, perspective texture gradients (via constant-screen-size marks), contact shadows/AO, and smooth distance falloff (via bands).

---

## 7. "Photography" (satsuei) post / compositing

- **Diffusion filter** (the standard anime glow) [K]: blur the frame (downsample chain, e.g. 1/4 res dual-Kawase, 3-4 levels), optionally apply levels to the blurred copy, then blend `screen` or `lighten` at 15-30 %: `out = 1 - (1 - c) * (1 - k * blur)`. Unlike threshold bloom, it lifts everything and softens edges globally. Blue Protocol applies diffusion to bright areas [S]. Cost: tiny (downsample chain).
- **Bloom** with a soft knee for sky/sun-lit whites only; keep subtle.
- **Light wrap**: bleed the blurred sky/bright background colour over the edges of darker foreground silhouettes: `col += blurBright * edgeMaskFromDepthDiscontinuity * k`. Reuses the diffusion blur.
- **Gradient overlays ("para")**: large soft colour gradients screen/multiply over the frame corners (cool top, warm sun side). One line of shader; a strong anime-compositing signature [K].
- **Colour grade**: 3D LUT (WebGL2 `sampler3D`, 32^3) or simple lift/gamma/gain; cap blacks (anime BGs rarely go below ~10-15 % value) and compress highlights. Heckel's final pass does tone map + saturation + quantisation + paper [S].
- **Watercolour/gouache edge darkening (pigment pooling)**: Montesdeoca et al., "Art-directed watercolor stylization of 3D animations in real-time" ([project](https://artineering.io/publications/art-directed-watercolor-stylization-of-3d-animations-in-real-time), [MNPR](https://artineering.io/software/maya-npr), [ACM](https://dl.acm.org/doi/10.1145/3229147.3229162)) covers hand tremor, pigment turbulence, colour bleeding, edge darkening, paper distortion and granulation in real time [S]. Edge darkening [K]: `e = saturate(k * |blur(col) - col|)` (a DoG on the colour image), then density-style darkening (Bousseau et al. 2006): `col' = col - (col - col*col) * (d - 1)`, `d = 1 + e * strength`. Because it is derived from scene edges it is inherently coherent. Reuses the diffusion blur → nearly free. Use lightly; poster colour has less pooling than watercolour.
- **Paper/canvas grain that does not swim.** Options:
  - Canvas-fixed: classic, swims under any motion. OK at <= 2-3 % amplitude.
  - World-fixed: no swim, but grain changes scale with distance → use fractalized version (section 2 C/D); costs taps in every material.
  - **Direction-fixed** [I]: in the post pass, reconstruct the world-space view direction per pixel and sample a tiling paper texture on a cube/octahedral mapping of that direction. Pure camera rotation (the commonest motion, and the one where shower-door is most obvious) becomes perfectly stable; translation leaves grain "at infinity" which is correct for far layers and slips only on near objects. One tap, post-only. Scale is constant in angle, hence near-constant on screen at long focal lengths.
  - Reprojected coherent noise (Kass-Pesare) for full stickiness at the price of a history buffer and some blur/sparkle.
  - Apply grain as **granulation modulated by pigment** (multiply darker in valleys more in dark/saturated areas: `col *= 1 - g * paperHeight * (1 - luma)`) rather than a uniform overlay.
- **Canvas-fixed vs world-fixed summary**: canvas-fixed = flat but slides; world-fixed = sticks but reveals 3D (scale, foreshortening). Rule of thumb: the larger and higher-contrast the mark, the more it must be world-anchored; the finer and fainter, the more it can be canvas/direction-anchored.
- **Held frames**: updating stochastic elements (wobble, grain seed, wind) at 8-12 Hz reads as hand-made boil and hides small coherence errors [I, from film practice].

---

## 8. Existing attempts

| Project | What it does | What it tells us |
|---|---|---|
| Maxime Heckel, "On Crafting Painterly Shaders" ([article](https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders/)) | three.js/R3F post: structure tensor → anisotropic Kuwahara (polynomial weights) → tone map/saturation/quantise/paper | Works as a still-image "oil" look at near 60 fps on his hardware; purely image-space, paper is canvas-fixed, legibility drops at large kernels [S]. Look is oil-paint, not anime BG. |
| "Susurrus: Crafting a Cozy Watercolor World with Three.js and Shaders" ([Codrops, Apr 2026](https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/)) | A watercolour three.js world | **Could not be fetched (403)**; highly relevant, read manually. |
| [xymeow/three-anime-style](https://github.com/xymeow/three-anime-style) | three.js library: 3-band character shading, "broad, fixed brush marks" shaping light on walls/rocks/ground, post `InkPass` outlines, offset shadows, film grain and "acrylic" frost | Closest existing three.js analogue: brush marks in the *lighting*, lines in post, grain in post [S]. Worth reading its scenery shader to see how marks are anchored. |
| [nicksonthc/ghibli-threejs](https://github.com/nicksonthc/ghibli-threejs) | Large single-file three.js Ghibli-style world: banded toon light without banded shadows, puff normals on foliage, painterly sky dome with instanced painted cumulus, GTAO → bloom → grade → SMAA; documents pitfalls | "Toon 3D" rather than flat painting (uses GTAO) [S]. Its pitfalls notes are worth mining. |
| [craftzdog/ghibli-style-shader](https://github.com/craftzdog/ghibli-style-shader) | Minimal toon-ramp tree in three.js | Shows that 4-tone stepped shading alone gets a long way on foliage [K]. |
| [douges.dev fluffy trees](https://douges.dev/blog/threejs-trees-1) | View-space billboarded leaf quads with alpha map in three.js | The vertex-shader billboard trick [S]. |
| Blender Studio [Brushstroke Tools](https://extensions.blender.org/add-ons/brushstroke-tools/), [Geometry-nodes brush strokes threads](https://blenderartists.org/t/geometry-nodes-brush-strokes/1388508) | Surfaces covered with 3D stroke cards (Meier-like, surface-anchored geometry) | Strokes are world-fixed geometry: coherent, but scale with distance; heavy geometry/overdraw; designed for shot cameras [S existence, I assessment]. |
| Blender anime-BG workflows ([Coloso course](https://coloso.global/en/products/blender-parksangwoo2-us), [Shinkai-style painting tutorial](http://www.mclelun.com/2015/10/makoto-shinkai-style-painting-tutorial.html)) | Simple geometry + projection-mapped paintings + compositing | How studios actually do "3D BG": camera-projection, limited camera moves. Not free-camera [S]. |
| Lightning Boy Studio ([tree tools](https://lightningboystudio.gumroad.com/l/RZcQI)), Kristof Dedene ([cloud shader](https://kdedene.gumroad.com/l/HppXdl)) | Eevee shader setups: sphere-normal foliage, stepped cloud shading | Source of the foliage/cloud recipes in section 5 [S existence]. |
| MNPR ([site](https://artineering.io/software/maya-npr)) | Real-time watercolour framework in Maya viewport with painted, object-space-controlled effects | Proof that a G-buffer + few post passes gives coherent watercolour effects when control parameters live in object space [S]. |
| Daniel Ilett ([BOTW grass repo](https://github.com/daniel-ilett/shaders-botw-grass)), Bruno Simon | Stylised shaders/tutorials (Unity), stylised three.js worlds | No "anime background" attempt found from either in this session. |

Recurrent failure modes across these [I]: (1) relying on a post filter over a conventionally lit scene → looks like a filtered render, flickers; (2) canvas-fixed paper/brush overlay → shower door as soon as the camera moves; (3) keeping AO/soft shadows/GI → reads as toon 3D; (4) black uniform outlines → reads as "cel-shaded game", not painted background.

---

## 9. Recommended pipeline (ranked)

### 9.1 Design principle
**Make the painting in the material shader, in world space; use post only for line, edge quality, and photography.** Brush texture is applied as a perturbation of *decisions* (which tone, which layer, where the silhouette is) using a world-anchored, screen-size-stable noise. Visible overlay texture is restricted to fine, low-contrast grain anchored to view direction.

### 9.2 Passes

**Pass 0 — Shadow map** (only when sun changes; static scene). 2048^2 depth, single ortho frustum, texel-snapped, simplified casters.

**Pass 1 — Main scene, forward, MRT (2-3 targets, full res)**

| Target | Format | Contents |
|---|---|---|
| RT0 | RGBA8 (sRGB-ish) | **Final flat-painted colour** (already toned, hue-shifted, layer-fogged per object), A = line suppression / tone index |
| RT1 | RGBA8 | RG = octahedral shading normal (edited), B = **object/part ID** (hashed 8 bit), A = brush noise value at this pixel (reused by post for line wobble and edge breakup) |
| Depth | DEPTH24 texture | for edges, reprojection, layers |

Material shader does, per fragment:
1. `brush` = art-map / log2-fractalized triplanar noise (2-4 taps; dominant-axis selection).
2. Tone = step on edited-normal `NdotL` + baked vertex bias + `brush` breakup, min with re-thresholded shadow map (section 6).
3. Colour = palette lookup (material x tone), plus large-scale patch variation (a second, lower-frequency world noise thresholded into 2-3 hue variants — "colour patches").
4. Analytic SDF detail lines / cracks where the procedural asset defines them.
5. Layer treatment: per-object layer uniform (flat value/saturation shift toward layer colour), per-pixel soft bands only on terrain.
6. No specular, no ambient gradient beyond a flat ambient colour (optionally a single up/down tint step).

Foliage/tuft cards: instanced, alpha-test with dab masks, sphere-transferred normals, same shader path. Sky: fullscreen dome shader with painted stepped clouds (writes ID = sky).

Forward + MRT rather than classic deferred: there is one light and no lighting pass to defer; MRT just exposes ID/normal/brush to post. 2 colour targets keeps bandwidth low on an iGPU.

**Pass 2 — Edge + composite (full res, single fullscreen pass)**
- Roberts cross (4 taps each) on ID, normal, linear depth (grazing-corrected). Sampling UV wobbled by RT1.A.
- Line colour = darkened/saturated darker neighbour; opacity by layer (off for far layers), broken by brush noise, reduced on lit side.
- Optional "paint gap/overlap" at ID edges: instead of a line, lighten or leave a thin unpainted rim on some edges (anime BG edge highlight) [I].

**Pass 3 — Optional softening filter (half res)**: mip-based 4-sector Kuwahara or separable bilateral, edge-aware upsample by ID. Off by default; enable only if the image looks too vector-clean.

**Pass 4 — Blur chain** (1/2 → 1/4 → 1/8, 3-4 small passes): shared by diffusion, light wrap, and edge-darkening DoG.

**Pass 5 — Final "photography" (full res, one pass)**: diffusion screen blend, light wrap, edge darkening (pigment pooling), para gradients, LUT grade, direction-anchored paper granulation, tiny canvas-fixed grain, FXAA (or SMAA as a 6th pass).

**Estimated cost at 1080p [I, unmeasured]:** main pass ~6-10 texture taps per fragment with low overdraw (alpha-test foliage is the risk); post ~35-50 taps per full-res pixel equivalent in total. This is in the range integrated GPUs handle at 60 fps if overdraw from foliage is controlled; fall-backs in order: render scale 0.8, drop Pass 3, FXAA instead of SMAA, halve foliage card count, 30 fps.

### 9.3 Priority ranking of techniques (impact per cost)
1. Flat stepped tones from edited/proxy normals + palette with hue-shifted shadows (section 1, 6).
2. Painted sky/clouds in the dome shader (perfectly stable, large screen share).
3. Layered per-object atmosphere + long lens.
4. Blur-then-threshold shadow shapes with brush-broken edges.
5. Screen-size-stable world noise perturbing tone/silhouette edges (section 2 C/D).
6. Ghibli-style foliage cards with sphere normals and dab cutouts.
7. Coloured, broken, distance-faded ID/normal edge lines + analytic SDF lines.
8. Diffusion + para + grade + direction-anchored paper.
9. Edge darkening.
10. Kuwahara/bilateral (last; possibly never).

### 9.4 Top risks
1. **Brush-mark coherence vs. flatness is unsolved in general.** Fractalized noise still breathes when moving along the view axis and foreshortens on ground. Mitigation: only use it through thresholds; keep amplitude small; hold updates on 2s/3s; prototype this first, on a ground plane + one cliff, before building anything else.
2. **Parallax and geometric silhouettes betray 3D** regardless of shading. Straight procedural edges look CG; needs silhouette breakup (alpha-dab cards along silhouettes, vertex wobble baked in world space) — screen-space wobble of silhouettes shower-doors.
3. **View-relative layer bands crawling over geometry.** Mitigate with per-object layers and world-space height haze.
4. **Foliage overdraw on integrated GPUs** (alpha-tested cards, MRT). Mitigate with front-to-back sorting of instances by canopy, aggressive card LOD, depth pre-pass for hulls.
5. **Billboard rotation artefacts** under orbit/roll.
6. **Edge-detection instability**: lines flickering on thin/distant geometry and at ID hash collisions; depth-edge false positives at grazing angles. Mitigate: ID-first, fade by distance, FXAA after.
7. **Image-filter boiling** if Kuwahara is used on anything not already flat.
8. **Procedural art direction**: the look depends on designed shapes and palettes more than on any shader; fully procedural assets tend toward noise-driven sameness. Budget time for palette/shape rules (2-4 values per material, big-medium-small shape hierarchy).
9. **Unverified sources**: Hi-Fi Rush and Tales of Arise implementation details, the Xrd channel assignments, the Bénard formulas and the Susurrus article should be read first-hand before copying specifics (see evidence tags).

---

## Source index

Arc System Works
- https://www.gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The
- https://archive.org/details/GDC2015Motomura
- https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf

Temporal coherence
- https://maverick.inria.fr/Publications/2009/BBT09/ (Dynamic Solid Textures)
- https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-8659.2011.02075.x (STAR on temporal coherence)
- https://dl.acm.org/doi/10.1145/1620993.1621016 (fractalized texture quality)
- https://gist.github.com/bgolus/c417fbbca71cdecd7dc3f747a6ff66d9 (constant screen-size texture shader)
- https://graphics.pixar.com/library/indexAuthorPesare.html (Coherent Noise for NPR)
- https://hhoppe.com/proj/hatching/ (Real-Time Hatching / tonal art maps)
- https://www.eecs.umich.edu/courses/eecs498-2/papers/meier96.pdf (Meier)
- https://www.cs.rpi.edu/~cutler/classes/advancedgraphics/S14/final_projects/scott_andy.pdf (object-space painterly WebGL)
- https://dl.acm.org/doi/10.1145/3587421.3595456 (Spider-Verse linework)
- https://beforesandafters.com/2023/01/11/heres-how-dreamworks-lent-a-whole-new-brand-of-stylized-look-and-feel-to-puss-in-boots-the-last-wish/
- https://www.redsharknews.com/why-netflixs-arcane-looks-so-good-how-fortiche-ramped-up-the-animation-pipeline
- https://beforesandafters.com/2019/11/14/heres-what-made-the-2d-animation-in-klaus-look-3d/

Image filters
- https://www.kyprianidis.com/p/npar2010/ , https://github.com/jkyprian/polyakf , https://www.kyprianidis.com/p/tpcg2010/
- https://users.cs.northwestern.edu/~sco590/winnemoeller-cag2012.pdf , https://github.com/jkyprian/xdog-demo
- https://cg.postech.ac.kr/papers/kang_npar07_hi.pdf
- https://blog.maximeheckel.com/posts/on-crafting-painterly-shaders/

Lines and games
- https://ameye.dev/notes/edge-detection-outlines/ , https://ameye.dev/notes/rendering-outlines/
- https://www.gamedeveloper.com/marketing/how-shedworks-refined-the-art-of-sable-in-pursuit-of-readability
- https://gdcvault.com/play/1034330/3D-Toon-Rendering-in-Hi , https://www.youtube.com/watch?v=gdBACyIOCtc
- https://www.4gamer.net/games/467/G046741/20210826001/ , https://cedec.cesa.or.jp/2021/session/detail/s605da5b7ddab8.html
- https://www.bandainamcostudios.com/en/behind-the-game/673
- https://nugglet.github.io/posts/2022/12/console_graphics_rendering_pipeline_genshin_impact

Foliage, grass, clouds
- https://douges.dev/blog/threejs-trees-1 , https://github.com/craftzdog/ghibli-style-shader
- https://trungduyng.substack.com/p/tutorial-blender-anime-foliage-pipeline , https://blenderartists.org/t/ghibli-style-tree-shader-for-eevee/1454355
- https://smythdesign.com/blog/stylized-grass-webgl/ , https://github.com/daniel-ilett/shaders-botw-grass
- https://gdcvault.com/play/1027033/Advanced-Graphics-Summit-Procedural-Grass
- https://kdedene.gumroad.com/l/HppXdl , https://blenderartists.org/t/shader-tutorial-ghibli-anime-style-clouds-for-blender/1254644 , https://nokdef.com/2024/10/27/stylized-puffy-clouds-shader/

Watercolour / compositing
- https://artineering.io/publications/art-directed-watercolor-stylization-of-3d-animations-in-real-time , https://artineering.io/software/maya-npr

Existing attempts
- https://tympanus.net/codrops/2026/04/24/susurrus-crafting-a-cozy-watercolor-world-with-three-js-and-shaders/ (not fetched)
- https://github.com/xymeow/three-anime-style , https://github.com/nicksonthc/ghibli-threejs
- https://extensions.blender.org/add-ons/brushstroke-tools/
