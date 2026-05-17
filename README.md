# soulgrep

grep the human signal from the noise

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **React Router v7** (data-router mode)
- **Biome** — lint + format
- **Vitest** + Testing Library — tests
- **Cloudflare Workers** + static assets — deploy (via `@cloudflare/vite-plugin` + `wrangler`)

## Development

Requires `pnpm` and Node.js >= 20.

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Scripts

| Script              | Action                                                  |
| ------------------- | ------------------------------------------------------- |
| `pnpm dev`          | Vite dev server with HMR                                |
| `pnpm build`        | Type-check + production build into `dist/`              |
| `pnpm preview`      | Serve the production build locally                      |
| `pnpm lint`         | Run Biome (lint + format check)                         |
| `pnpm format`       | Apply Biome formatting                                  |
| `pnpm test`         | Run Vitest                                              |
| `pnpm test:ui`      | Vitest UI                                               |
| `pnpm deploy`       | Build and deploy to Cloudflare Workers                  |
| `pnpm cf-typegen`   | Regenerate Cloudflare env types from `wrangler.jsonc`   |

## Deploy

First time only:

```bash
pnpm dlx wrangler login
```

Then:

```bash
pnpm deploy
```

Routing for the SPA is handled by `assets.not_found_handling: "single-page-application"` in `wrangler.jsonc` — all unmatched paths fall back to `index.html` so React Router takes over client-side.
