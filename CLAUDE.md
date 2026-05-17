# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Architecture

### Deploy pipeline (the non-obvious part)

This SPA deploys to **Cloudflare Workers with static assets** (not Pages) via `@cloudflare/vite-plugin`. The build flow is two-step and writes config files in unusual places — knowing this saves time when something looks "missing":

1. `vite build` produces `dist/` with the bundled assets **and** a generated `dist/wrangler.json` — a production-resolved version of the root `wrangler.jsonc` with `assets.directory` rewritten to `.` (relative to `dist/`).
2. The plugin also writes `.wrangler/deploy/config.json` containing `{"configPath": "../../dist/wrangler.json"}`. When you run `wrangler deploy` from the project root, Wrangler reads this redirect file and silently uses the production config from `dist/` — that is why the root `wrangler.jsonc` has no `directory` field and why `pnpm deploy` "just works" from the root.

The root `wrangler.jsonc` sets `assets.not_found_handling: "single-page-application"` — this is what makes client-side React Router routes work on Cloudflare (every unknown path falls back to `index.html`).

### Routing

`src/main.tsx` creates a `createBrowserRouter` instance and wraps the tree in `RouterProvider`. The router uses React Router v7's `Component:` field (not `element:`), and the structure is:

```
/        → App  (layout with <Outlet />)
  index  → Home
  *      → NotFound  (client-side catch-all)
```

To add a route: create `src/routes/<Name>.tsx`, then add a `{ path, Component }` entry under the `children` array in `main.tsx`. The `*` catch-all must stay last.

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
