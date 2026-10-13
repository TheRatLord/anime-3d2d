# anime-3d2d

Real-time 3D that reads as a 2D anime background painting — a ruined abbey in four states (day/evening, summer/winter).

![Hero](docs/hero.png)

**Live:** https://chapel.cinne.dev

## Run

```sh
npm ci
npm run dev   # Node 22.18+
```

`N` toggles day/evening, `M` summer/winter, `P` painter's licence. A push to `main` deploys (`.github/workflows/deploy.yml`, Cloudflare Workers); `npm run deploy` does it by hand.

## Quality

`?quality=high|medium|low|minimum|auto` (default `auto`), the gear button (top right) or `U` cycles. `high` is the picture as painted; the lower levels only
reduce MSAA, render scale and the dppx cap (`src/quality.js`). `auto` starts at `high` and steps down only after a second of
frames slower than 25 ms, never back up, so a machine that keeps up is never touched. `?msaa=`, `?scale=` or a bare `?t=` pin
the picture. Measuring: `tools/ft.mjs "quality=low" hero 1920x1080` (frame ms), `tools/cpuprof.mjs`, `tools/autoq.mjs`.

## Clawd

A 3D-modelled Clawd (`src/extra/clawd.js`) wanders the meadow, turns to the viewer, waves, hops and looks about (`?clawd=0` leaves him out).
He is drawn like an anime character over a painted background: a real model that stands in the world and turns, so there is a top
from above, a flank from the side and a back from behind, lit by a toon ramp from the scene's own sun (lit tone, a hue-shifted
shade, a core, the turf's bounce, a rim and a small glossy sheen with brushed edges). The sun map and cloud shadow fall on him, his
ink swells on the shaded side, and his eyes carry a gradient, catchlights and a blush. Poses and positions are held at 12 drawings a second.
The solid model is cheated toward a flat drawing by three dials: `?csq=` depth kept (default 0.58), `?cturn=` share of his turn shown
(0.5, a 3/4 view at most, the back once he walks away) and `?cpitch=` how far he follows the camera's tilt (0.65).
Review: `node tools/clawdsheet.mjs <tag> [--az=.. --el=.. --pose=walk:0.2 --q="eve=1&snow=1"]` writes a labelled contact sheet of stations
around him to `shots/<tag>.png`.
