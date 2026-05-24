# soulgrep

grep the human signal from the noise

**soulgrep** is an AI-driven chat-message analyzer that infers the psychological profile (psychotype) of a single target speaker from their Telegram messages. All inference runs entirely in your browser — your chat data is sent only to your own LLM provider under your own API key.

## Usage

1. **Set up your API key** — go to `/setup` and add a key for OpenAI, Anthropic, or OpenRouter.
2. **Export your Telegram chat** — in Telegram Desktop, export the conversation as `result.json` (JSON format). Go to `/import` for step-by-step instructions.
3. **Upload and parse** — on `/import`, upload the `result.json`. The app parses it in a background Worker and builds a persona corpus. You can download the corpus as `.jsonl` for offline use.
4. **Analyze** — navigate to `/import/analyze`, choose which side of the conversation to profile (outgoing or incoming), and run the analysis. Parallel LLM calls extract behavioral signals from all chunks, then a final synthesis step produces a comprehensive psychological portrait.

## Privacy

All processing happens client-side in your browser. Your chat data is never sent to soulgrep's servers — it goes directly to whichever LLM provider you configured, under your own API key and subject to their privacy policy.

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
| `pnpm corpus:build` | CLI: chunk a Telegram `result.json` into a `.jsonl` persona corpus (`data/` is gitignored) |

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
