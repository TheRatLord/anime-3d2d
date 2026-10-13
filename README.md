# anime-3d2d

Real-time 3D that reads as a 2D anime background painting — a ruined abbey in four states (day/evening, summer/winter).

![Hero](docs/hero.png)

**Live:** https://an-visuals.cinne.dev

## Run

```sh
npm ci
npm run dev   # Node 22.18+
```

`N` toggles day/evening, `M` summer/winter, `P` painter's licence. Deploy with `npm run deploy` (Cloudflare Workers).

## Quality

`?quality=high|medium|low|minimum|auto` (default `auto`), the ⚙ button (top right) or `U` cycles. `high` is the picture as painted; the lower levels only
reduce MSAA, render scale and the dppx cap (`src/quality.js`). `auto` starts at `high` and steps down only after a second of
frames slower than 25 ms, never back up, so a machine that keeps up is never touched. `?msaa=`, `?scale=` or a bare `?t=` pin
the picture. Measuring: `tools/ft.mjs "quality=low" hero 1920x1080` (frame ms), `tools/cpuprof.mjs`, `tools/autoq.mjs`.

## Clawd

A 3D-modelled Clawd (`src/extra/clawd.js`) wanders the meadow, turns to the viewer, waves, hops and looks about (`?clawd=0` leaves him out).
He is drawn as one flat cel held parallel to the canvas: the model takes the camera's own axes, its depth is squashed to a card, the
tone is one flat colour inside an ink hull, and a head turn is the eyes sliding across the face rather than the body turning, so
there is no angle from which a side of the block shows. Poses and positions are held at 12 drawings a second.
Review: `node tools/clawdsheet.mjs <tag> [--az=.. --el=.. --pose=walk:0.2 --q="eve=1&snow=1"]` writes a labelled contact sheet of stations
around him to `shots/<tag>.png`.
