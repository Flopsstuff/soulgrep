# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

**soulgrep** is an AI-driven chat-message analyzer that infers the psychological profile (psychotype) of a single target speaker from their messages in a chat. The full end-to-end pipeline is implemented:

1. User stores LLM provider API keys (OpenAI / Anthropic / OpenRouter) in `localStorage` via `/setup`.
2. User exports a Telegram Desktop chat as `result.json` (instructions on `/import`) and uploads it on the same page.
3. The upload section parses the JSON in a Web Worker and turns it into a **persona corpus** — chunked, cleaned, speaker-tagged text ready to feed an LLM (`PersonaCorpusChunk[]`). User can download the corpus as `.jsonl`.
4. User navigates to `/import/analyze` where **parallel LLM-driven signal extraction** runs across all chunks (up to 10 concurrent requests), then a **summary synthesis** step merges the signals into a comprehensive psychological portrait. The user chooses which side of the conversation to profile (outgoing or incoming).

All inference runs client-side from the browser using the Vercel AI SDK against the user's own keys; there is no backend.

## Commands

Package manager is **pnpm** (enforced via `pnpm.onlyBuiltDependencies` allowlist for `esbuild` and `workerd`).

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server (with Cloudflare Workers runtime via `@cloudflare/vite-plugin`) |
| `pnpm build` | `tsc -b` + `vite build` → `dist/` |
| `pnpm preview` | Serve production build locally |
| `pnpm test` | Vitest watch mode |
| `pnpm test --run` | Single-shot run (use in CI / when you just need pass/fail) |
| `pnpm test src/routes/Home.test.tsx` | Run one test file |
| `pnpm exec vitest --run -t 'renders the soulgrep heading'` | Run a single test by name |
| `pnpm lint` | Biome check (lint + format check, no writes) |
| `pnpm format` | `biome format --write .` |
| `pnpm exec biome check --write .` | Apply both formatter and safe lint fixes (e.g. organize imports) |
| `pnpm deploy` | Build, then `wrangler deploy` |
| `pnpm cf-typegen` | Regenerate Cloudflare env types from `wrangler.jsonc` |
| `pnpm corpus:build` | Run `scripts/build-persona-corpus.mjs` to chunk a Telegram `result.json` into a `.jsonl` persona corpus from the CLI (`data/` is gitignored) |

## Architecture

### Deploy pipeline (the non-obvious part)

This SPA deploys to **Cloudflare Workers with static assets** (not Pages) via `@cloudflare/vite-plugin`. The build flow is two-step and writes config files in unusual places — knowing this saves time when something looks "missing":

1. `vite build` produces `dist/` with the bundled assets **and** a generated `dist/wrangler.json` — a production-resolved version of the root `wrangler.jsonc` with `assets.directory` rewritten to `.` (relative to `dist/`).
2. The plugin also writes `.wrangler/deploy/config.json` containing `{"configPath": "../../dist/wrangler.json"}`. When you run `wrangler deploy` from the project root, Wrangler reads this redirect file and silently uses the production config from `dist/` — that is why the root `wrangler.jsonc` has no `directory` field and why `pnpm deploy` "just works" from the root.

The root `wrangler.jsonc` sets `assets.not_found_handling: "single-page-application"` — this is what makes client-side React Router routes work on Cloudflare (every unknown path falls back to `index.html`).

### Routing

`src/main.tsx` creates a `createBrowserRouter` instance and wraps the tree in `RouterProvider`. The router uses React Router v7's `Component:` field (not `element:`), and the structure is:

```
/                  → App  (layout with header nav + <Outlet />)
  index            → Home
  setup            → Setup           (API keys)
  import           → Import          (instructions + file upload + corpus preview)
  import/analyze   → Analyze         (parallel signal extraction + portrait synthesis)
  *                → NotFound        (client-side catch-all)
```

The root layout has a `loader` in `main.tsx` that redirects to `/setup` whenever no provider key is present in `localStorage` (checked via `hasActiveSelection()`). The `/setup` route itself is exempt from the redirect — first-time visitors always land there.

To add a route: create `src/routes/<Name>.tsx`, then add a `{ path, Component }` entry under the `children` array in `main.tsx`. The `*` catch-all must stay last.

### LLM providers & API-key storage

Three provider integrations are wired in: OpenAI, Anthropic, and OpenRouter — via the Vercel AI SDK (`ai` v6, `@ai-sdk/react`, plus `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@openrouter/ai-sdk-provider`).

- **`src/lib/providers.ts`** — single source of truth for provider metadata: `id`, `label`, `testUrl` (used by the Setup page's "Test" button to hit the provider's `/models`-style endpoint), `buildHeaders(key)`, `docsUrl`, `keyHint`, plus a curated `models: readonly string[]` and `defaultModel`. The model list is static — no live `/models` fetch. Anthropic requires `anthropic-dangerous-direct-browser-access: true` because we call the API directly from the browser.
- **`src/lib/keys.ts`** — `localStorage`-backed config store. Persists three things, all reactive through a single custom `soulgrep:keys:changed` event (the `storage` event only fires cross-tab):
  - **API key per provider** at `soulgrep:keys:<provider>` — `getKey` / `setKey` / `clearKey` / `listKeys` / `hasAnyKey`, hook `useStoredKey(id)`.
  - **Selected model per provider** at `soulgrep:model:<provider>` — `getModel` / `setModel`, hook `useStoredModel(id)`. `getModel` falls back to `PROVIDERS[id].defaultModel` when nothing is stored, so it always returns a usable model id.
  - **Active provider** (single) at `soulgrep:active-provider` — `getActiveProvider` / `setActiveProvider`, hook `useActiveProvider()`. This is the (provider, model) pair downstream features will read as `(getActiveProvider(), getModel(getActiveProvider()))`.

  Auto-wiring inside `setKey` / `clearKey`: saving a key when no active provider exists auto-activates that provider; clearing the active provider's key falls back to the first other provider in `PROVIDER_IDS` order that still has a key, or `null`. Clearing a key also wipes that provider's stored model.

  The "fully configured" gate is **`hasActiveSelection()`** (hook: `useHasActiveSelection()`) — true iff an active provider is set AND its key is non-empty. The root loader in `main.tsx` uses this to decide whether to redirect to `/setup`. `hasAnyKey()` is kept for cases where we only care that something is configured.

  All snapshot-getters are SSR-safe (return `''` / `null` / `false` / `defaultModel` on the server).
- **`src/lib/testKey.ts`** — one-shot fetch to a provider's `testUrl` to verify a key. Model-agnostic — does not exercise any chat endpoint.
- **`src/lib/pingModel.ts`** — end-to-end model check. Uses `buildModel` (see below) and runs `generateText` with `prompt: 'Reply with the single word: pong'` and `maxOutputTokens: 16`. Returns `{ ok: true, reply } | { ok: false, error }`.
- **`src/lib/buildModel.ts`** — factory that creates the correct Vercel AI SDK `LanguageModel` for a `(providerId, key, modelId)` triple. Handles provider-specific setup (Anthropic's browser-access header, `-1m` long-context suffix → `anthropic-beta` header). Shared by `pingModel`, `extractSignals`, and `generateSummary`.

When adding a new provider: extend `ProviderId`, add an entry to `PROVIDERS` (including `models` and `defaultModel`), and append to `PROVIDER_IDS`. The Setup page renders one row per `PROVIDER_IDS` entry automatically.

### Analysis pipeline

The core analysis flow (the actual "soulgrep" step) lives in three modules:

- **`src/lib/extractSignals.ts`** — takes a single `PersonaCorpusChunk` and calls `generateText` with the signals system prompt to extract behavioral observations. Returns `SignalsResult` (ok/error discriminated union). Called in parallel across all chunks via `runPool`.
- **`src/lib/generateSummary.ts`** — takes all successful signal fragments and calls `generateText` with the summary system prompt to synthesize a comprehensive psychological portrait. The prompt concatenates all fragment signals in chronological order.
- **`src/lib/prompts.ts`** — contains `DEFAULT_SIGNALS_SYSTEM_TEMPLATE` and `DEFAULT_SUMMARY_SYSTEM_TEMPLATE` (the two large system prompts). Both support `localStorage`-based overrides so power users can customize the analysis prompts without touching code. Template placeholders (`{{SUBJECT_MARKER}}`, `{{SUBJECT_LABEL}}`, etc.) are resolved at call time based on the selected analysis side (outgoing/incoming). Versioned with `SIGNALS_PROMPT_VERSION` / `SUMMARY_PROMPT_VERSION`. React hooks (`useSignalsPromptTemplate`, `useSummaryPromptTemplate`) expose reactive state.
- **`src/lib/runPool.ts`** — generic concurrency-limited async pool. Used by `Analyze.tsx` to run up to 10 parallel `extractSignals` calls.
- **`src/lib/analysisStore.ts`** — ephemeral in-memory `Map<string, PersonaCorpusChunk[]>` that passes corpus data from the Import page to the Analyze page via `location.state.sessionId`. Cleaned up on unmount.

The `Analyze` route (`src/routes/Analyze.tsx`) orchestrates the full flow: chunk job tracking, parallel extraction, per-chunk retry on error, summary synthesis, progress bar, and a copy-to-clipboard portrait panel.

### Persona corpus pipeline

`src/lib/persona-corpus.ts` is the core data-prep step. `buildPersonaCorpus(rawExport, options) → PersonaCorpusChunk[]` takes a Telegram Desktop `result.json` and produces speaker-tagged, cleaned, chunked text. Non-obvious bits:

- **Target speaker** is identified by the root `id` field of the export. Telegram's per-message `from_id` is prefixed with `user` (e.g. `user12345`), so `resolveTargetFromId` adds the prefix if missing. Throws if `id` is missing/empty.
- **Speaker tags** default to `>` for the target and `<` for the opponent (`speakerFormat: 'symbols'`). Pass `speakerFormat: 'roles'` to get the literal words `target` / `opponent` instead. Consecutive messages from the same speaker are coalesced into one entry separated by `\n`.
- **Text cleaning** pipeline per message: `extractText` (handles both `string` and Telegram's `Array<string | {text}>` entity form) → `stripLinksAndPhones` (drops `http(s)://`, `www.`, `t.me/`, and any `+?\d...\d` run of 9+ digits with separators) → `normalizeMessageText` (CRLF→LF, collapse intra-line whitespace, trim, drop blank lines). If `dropShortMessages` is on, anything below `minMessageLength` chars (default 3) or with no letters/digits is dropped.
- **Chunking** respects three caps: `maxCharsPerChunk` (required), `maxWordsPerChunk` (default 10_000), `maxMessagesPerChunk` (default 1_000). A chunk is also force-flushed when it reaches `minCharsPerChunk`. Speaker-marker tokens (`>`, `<`, `target`, `opponent`) are excluded from word counts. Each chunk gets a sequential `chunk_id` like `c000001`.

Two consumers share this lib:

1. **`scripts/build-persona-corpus.mjs`** (`pnpm corpus:build`) — Node CLI that writes `.jsonl` (one chunk per line). Used for offline experimentation; `data/` is gitignored.
2. **`src/workers/corpus.worker.ts`** — Web Worker that runs `JSON.parse` + `buildPersonaCorpus` off the main thread, posting back `{type: 'ok', chunks} | {type: 'error', message}`. `src/lib/runCorpusInWorker.ts` wraps it as a typed one-shot Promise helper used by the Import page. Large Telegram exports would jank the UI on the main thread — always go through the worker for browser-side corpus builds.

### Styling

Tailwind CSS v4 via the **new `@tailwindcss/vite` plugin** — no `tailwind.config.js`. The entire setup is `@import 'tailwindcss';` at the top of `src/index.css`. Customization (theme tokens, etc.) goes inline in CSS using the v4 `@theme {}` directive when needed.

### Testing

Vitest is configured inside `vite.config.ts` (single source of truth — there is no `vitest.config.ts`). Setup:

- `environment: 'jsdom'`, `globals: true` — `describe`/`it`/`expect` are global, no imports needed for them (though existing tests import them explicitly for clarity)
- `setupFiles: ['./src/test-setup.ts']` — wires up `@testing-library/jest-dom/vitest` matchers
- Test files live alongside source: `src/routes/Home.test.tsx` next to `src/routes/Home.tsx`

### Linting & formatting (Biome)

`biome.json` enforces: single quotes, no semicolons, trailing commas everywhere, 2-space indent, 100-char line width. Biome's `organize imports` is on — imports get auto-sorted on `biome check --write`. The `vcs.useIgnoreFile: true` means Biome respects `.gitignore`.

### TypeScript

Project references setup: root `tsconfig.json` references `tsconfig.app.json` (for `src/`) and `tsconfig.node.json` (for `vite.config.ts`). Test/jest-dom globals live in `tsconfig.app.json` under `types`. Strict-ish settings are inherited from the Vite React-TS template (`erasableSyntaxOnly`, `verbatimModuleSyntax`, `noUnusedLocals/Parameters`).
