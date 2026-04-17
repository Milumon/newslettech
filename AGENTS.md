<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next.js `16.2.4` + React `19.2.4`. Before changing framework behavior, read the relevant docs in `node_modules/next/dist/docs/` and follow deprecation notes.
<!-- END:nextjs-agent-rules -->

## Repo Reality Check

- This is currently a single-app Next.js App Router project (no monorepo, no `src/` directory).
- Real entrypoints today: `app/layout.tsx`, `app/page.tsx`, and `app/globals.css`.
- Do not assume planned stack pieces exist yet (e.g., Supabase/Zod/Resend) unless you add and wire them in this repo.

## Commands (from executable config)

- Install deps: `bun install` (lockfile is `bun.lock`; prefer Bun tooling).
- Dev server: `bun run dev`.
- Lint: `bun run lint`.
- Build check: `bun run build`.
- Type check (no script exists): `bun x tsc --noEmit`.

## Validation Order

- For meaningful changes, run: `bun run lint` -> `bun x tsc --noEmit` -> `bun run build`.
- There is no test script, no CI workflow, and no Husky/pre-commit hook configured right now; do local verification explicitly.

## Structure + Conventions That Matter

- Route handlers belong in `app/api/**/route.ts` (App Router conventions).
- TS config has `strict: true` and path alias `@/*` -> repo root; keep imports consistent.
- ESLint uses flat config via `eslint.config.mjs` with `eslint-config-next` core-web-vitals + TypeScript presets.

## Working In `.opencode/`

- `.opencode/` is product content, not disposable tooling output; edits there are first-class repo changes.
- When editing slash-command/context docs under `.opencode/`, preserve their required structure (frontmatter, XML-like tags, MVI-style constraints) unless the task explicitly changes those standards.
