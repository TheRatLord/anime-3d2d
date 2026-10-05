An in progress attempt to get 2d anime visuals in 3d

## Development

Requires Node.js 22.18 or later (or 24+).

```sh
npm ci
npm run dev
```

## Hour and season

The scene can be seen at two hours (the day it was painted for, and evening) and in two seasons (summer, and
under snow) - four pictures of the same place. Toggle with the buttons at the top right or `N` (day / evening)
and `M` (summer / winter); a change is a short dissolve that keeps up with the camera (both states are drawn
for that second). The four states are baked once behind the loading screen (`?prebake=0` skips that). To open in a given state: `?time=evening`,
`?season=winter` (or `?eve=1&snow=1`). `?flakes=0` leaves out the falling snow.

Everything is still authored for the summer day; `src/mode.js` and the "season and hour" contract at the top of
`src/glsl.js` describe how the other three states are laid over it.

## Painter's licence

Five places where the picture is deliberately less true than the light and the geometry, because paint that is
less accurate reads better. `P` switches them while looking (all but the leaf shadows, which are baked with the
sun map); `?licence=0` opens without any of them, and each has its own strength (`0` off, `1` as painted, up to `2`):

| | what it does | where |
|---|---|---|
| `?arris=` | Edge hierarchy. A built thing's corners are read from its planned normals and drawn by rule: a re-entrant corner gathers a dark line; a corner with light on one side and shade on the other gets none (the tones draw it); a corner with one tone either side is found only where it points at the viewer, and let go when seen edge-on. Lines swell and lift in long runs. | composite, `src/pipeline.js` |
| `?kiwa=` | A shadow on stone is deepest against the light and opens toward its middle; the light is cleanest against the shade. Taken on the canvas, so a shaded pier is held against the sunlit wall behind it. | composite |
| `?facing=` | The front plane of a mass sits a step above its side planes whatever the light does, and they change hands as one walks round. | `planeFacing()` in `src/glsl.js` |
| `?loose=` | Leaf shadow is laid, not projected: a soft pool broken into dabs at its fringe, and every tree stands in a pool of it at its foot. Wall shadows stay cut. The sun map records what casts each shadow. | `leafShade()` in `src/glsl.js`, `src/terrain.js`, `src/extra/tree.js` |
| `?para=` | A warm gradient over the canvas from the sun's side, only when looking toward it. | final pass |

`?edgedbg=1..3` shows the arrises, the lines drawn of them, and the shadow-edge field.

## Deployment

Live site: https://chapel.cinne.dev

Hosted on Cloudflare Workers Static Assets. Three.js runs in the browser; no
server-side Worker code is required. `cloudflare.config.ts` defines the Worker
name and custom domain, and `vite.config.js` enables the Cloudflare build output.

```sh
npx cf auth login
npm run deploy
```

Deployment builds the app and publishes it with its custom domain. The signed-in
Cloudflare account must manage the `cinne.dev` zone. No separate DNS record is
needed for the Worker custom domain.

To validate without publishing, run `npx cf deploy --dry-run`. Build output lives
in `.cloudflare/output/v0/`, not `dist/`, and is excluded from version control.
The `cf` CLI and Cloudflare Vite plugin are beta dependencies; `package-lock.json`
locks the installed versions.

## Startup

The HTML loading screen paints before the scene module is evaluated and disappears
after the first scene render. It respects reduced-motion preferences and displays
an error if initialization fails. The `scene-ready` performance mark measures
navigation-to-first-render submission (not GPU completion); contentful paint now
measures the loading screen, not scene readiness.

Terrain generation uses power-of-two meadow wrapping and conservative radial
bins for flower arcs. Candidate order and floating-point accumulation are
preserved; no geometry density, texture resolution, animation, or controls are
reduced to improve startup.
