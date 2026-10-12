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

`?quality=high|medium|low|minimum|auto` (default `auto`), `U` cycles. `high` is the picture as painted; the lower levels only
reduce MSAA, render scale and the dppx cap (`src/quality.js`). `auto` starts at `high` and steps down only after a second of
frames slower than 25 ms, never back up, so a machine that keeps up is never touched. `?msaa=`, `?scale=` or a bare `?t=` pin
the picture. Measuring: `tools/ft.mjs "quality=low" hero 1920x1080` (frame ms), `tools/cpuprof.mjs`, `tools/autoq.mjs`.

