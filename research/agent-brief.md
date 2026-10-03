# Shared brief for agents working on "Painted World"

## What this project is
A real-time, free-camera 3D browser scene (three.js r186, WebGL2, raw GLSL ES 3.0 shaders, fully
procedural, no characters) in which **every frame from every angle must look like a hand-painted
background from the TV anime Frieren** (poster-colour paintings by Studio Wyeth). It must not look
like a toon-shaded 3D render. Depth has to read the way a painter depicts it (value/saturation
planes, overlap, haze, mark size), not through smooth 3D shading. The scene is a ruined Gothic
chapel on a grassy hilltop with a big tree, a dirt path, a flower meadow, wooded hills and pale
mountains. It runs on an AMD Radeon 780M integrated GPU.

## Read these first
- `research/frieren-style.md` - measured palette and painting rules. This is the style authority.
- `research/npr-techniques.md` - survey of rendering techniques (skim the parts relevant to you).
- `refs/*.jpg` - official Frieren art boards. Look at them with the Read tool. Key ones:
  `refs/ac13.jpg` (castle gate: tree, grass, path, hills, mountain), `refs/ac15.jpg` (bridge under
  trees: foliage, foreground grass, haze), `refs/ac12.jpg` (ruined church and flower field, sky),
  `refs/sheet.jpg` (contact sheet of all boards).
- `src/glsl.js` (shared uniforms + GLSL helpers: `brushStable`, `brushWorld`, `shadowLit`,
  `toneStep`, `atmo`, `writeAux`), `src/pipeline.js` (passes), `src/main.js` (loop), `src/brush.js`
  (procedural brush/leaf/grass textures), `src/world.js` (height(), SUN, PATH, noise).

## How rendering works (conventions you must keep)
- Materials are `RawShaderMaterial` built with `mat({vs, fs, uniforms})` from `src/glsl.js`. Every
  fragment shader writes three targets: `oColor` (final painted colour in display space - colours
  are authored as sRGB display values, colour management is off), and `writeAux(normal, lineWeight,
  viewDepth, shapeId, plane, manMadeFlag)`.
- Light is a single hard step (`toneStep`) between a lit colour and a hue-shifted shadow colour;
  thresholds are roughened with brush noise. No smooth N.L gradients, no specular, no black.
- `brushStable(worldPos, normal, dist, tilePx)` gives brush dabs anchored to the surface but at
  constant size on screen. `uBrush` channels: R medium dabs, G large dabs, B fine bristle strokes,
  A soft fbm.
- `shadowLit(worldPos, radius)` samples the sun shadow map (blurred); threshold it yourself.
  A mesh casts shadows only if it has `mesh.userData.shadowMat`.
- `uTime` is stepped at 12 fps on purpose (ambient motion is "held" like drawn animation).
- Things far from the hilltop get their atmospheric amount baked per object (`atmo(c, amount)`),
  because the camera never leaves the hilltop (walkable radius about 60 m around the origin).
- Modules in `src/extra/*.js` are auto-loaded; each default-exports `(scene, tex, params) => {}`.

## Adding things to the scene (no per-object retuning)
- **Declare where it stands, once, at module load.** `src/layout.js` is the one registry of what stands
  where. A module that builds something calls `standing(x, z, r, top)` (trunk, post, column),
  `wallRun(ax, az, bx, bz, thick, top)`, `lyingStone(x, z, r, topY)` or `ground(shape, opts)` at its top
  level, from its own data table. The walker's collision, the lens clearance and the grass (ground kept
  clear, a dark fringe at the foot, an apron round a trunk) all follow from that; no other file is
  edited. Do not keep a private list of obstacles anywhere.
- **Nothing else moves.** A newly declared footprint is handled after the composed meadow is drawn: what
  stands on it is cleared away and its fringe comes from a random sequence of its own, seeded by its
  position. Only the footprints the meadow was first composed around carry a `seq` (their place in the
  shared sequence); never give `seq` to something new.
- **Content is a table.** Trees are entries of `TREES` and shrubs of `BUSHES` in `src/extra/tree.js`
  (give a new bush a `seed`); walls, buttresses, piers and columns are tables in `src/ruin.js`.
- **The site plan is in `src/world.js`:** `SUBJECT` (what the picture is about: lens, drawing firmness,
  cloud lane, the composed meadow), `FLOOR` (the building's floor), `PATH`. Shaders take them from
  there (`SUBJECT` is a GLSL constant in every material); do not write those coordinates into a shader.
- **Shared contracts live in `src/glsl.js`:** `HAZE` / `stepFog` (the stepped atmosphere), `WIND`,
  `aastep`.

## What is drawn and what is left as a mass (applies to everything, nothing to opt into)
Three shared rules decide the hierarchy of detail. They work from the finished picture's depth and flags or
inside `atmo()`, so a new prop or far object falls under them without any code of its own.
- **Quiet masses** (`QUIET` / `describe()` in `src/pipeline.js`, `?quiet=0` turns it off, `?dbg=1` shows the
  field). The paint filter lays broader dabs (a fixed size on the thing itself, so only near things are
  affected) wherever the picture is not "described". Described = built things (the man-made flag), the rim
  of a mass that stands against something well behind it, and accent patches fixed to the ground (more of
  them round `SUBJECT`). So near flowers and blades are drawn in a few places and elsewhere merge into dabs.
  Do not fight this by drawing every instance harder; if something must always be drawn, give it the
  man-made flag or make it stand against a farther plane.
- **Haze keeps a plane's darks** (`HAZE_HOLD` in `src/glsl.js`, `?hold=1` restores the even wash). `atmo()`
  takes the lights fully to the haze and the darks only part of the way, so every far plane keeps one
  boundary between light and dark. Author far colours as before and haze them with `atmo()`.
- **Boundaries that survive in the distance** (`COUNTER` in `src/pipeline.js`, `?counter=0` off,
  `?cshadowdbg=5` shows it). Far land seen in a pocket behind nearer masses takes one flat, brushed-edged
  step paler; a distant ridge is painted deeper toward its crest. Only land beyond ~55 m takes part.

## Your working copy
You have a private copy of the project and a dev server already running for it (port given in your
task). Work ONLY inside your copy. Only edit the files your task says you own. If you need a new
texture, generate it inside your own module (copy helpers from `src/brush.js` if needed) rather
than editing shared files. If you believe a shared file must change, do not edit it - describe the
exact change in your final report.

## Taking screenshots (do this constantly; judge with your own eyes)
From your copy's directory:

    PORT=<your port> node tools/shot.mjs <tag> <view> [<view> ...]

writes `shots/<tag>-<view>.png` (1280x720, rendered on the real GPU) and prints the frame time and
any shader/console errors. Views are defined in `src/views.js` (hero, front, inside, westwall, back,
high, vista, low, close, down); you may add views there for your own needs (that file is yours to
extend). Look at the PNGs with the Read tool and compare them side by side with the reference
boards. Iterate many times: render, look, criticise honestly, fix. Check several camera angles and
distances including close-up and top-down, since the camera is free. Also take two shots a small
camera step apart when you need to judge stability (nothing should pop, flip or swim).

## Checking that a change did not move the picture
The render is not bit-stable from frame to frame (a few hundred pixels per view, along silhouettes of the
ground and the far crowns, wobble by a level or two), so two single screenshots never compare equal. Use

    node tools/regress.mjs save  <tag>          # before the change: the reference, as a per-pixel envelope
    node tools/regress.mjs check <tag>          # after: lists the views that differ, exit code 1 if any

It captures every view several times and fails a pixel only when it lies clear of everything the reference
did. An unchanged tree gives 0 pixels in every view. `tools/noise.mjs` measures the raw noise between two
loads; `tools/pdiff.mjs` compares two tags of plain screenshots. All tools hold the ambient clock from the
first frame (`?t=3`), so the sun map painted at start-up is the same in every run.

## Quality bar
Ask of every screenshot: "if this were paused in an episode of Frieren, would it pass as the painted
background?" Typical failures to hunt down: shapes that look like sprites/vector clip-art, uniform
repetition, perfectly straight or perfectly round silhouettes, colours that are too saturated or too
dark (the boards are high-key: darkest daytime values around 0.25-0.35 luminance, no black),
detail spread evenly everywhere (painters leave large quiet areas and concentrate detail at edges
and focal points), anything that reads as a 3D gradient.

Performance: the whole frame currently takes about 4 ms at 720p; keep your part cheap (alpha-tested
cards, no blending, modest instance counts, few texture taps).

## Final report
Reply with: what you changed and why (briefly), the list of files you modified or added, anything
that needs to change in shared files, frame time before/after, known remaining weaknesses, and the
paths of your best before/after screenshots. Do not claim something works unless you rendered it
and looked at it.
