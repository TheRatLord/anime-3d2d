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

## Deployment

Live site: https://an-visuals.cinne.dev

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
