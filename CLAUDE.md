# CLAUDE.md — (app)

A product app in the **inex26** agent company. The canonical standards live in the **hq** repo
(`AGENTS.md` + `standards/`); the essentials, inlined:

- **Stack:** Next.js (App Router) + **TypeScript strict** (no `any`). Deployed on **Vercel**.
- **Done means green:** `npm run typecheck && npm run lint && npm run test && npm run build` all pass.
  A bug fix adds a regression test.
- **Small, focused changes**; match existing patterns before inventing new ones.
- **Design every state** — loading, empty, error, success — not just the happy path. Accessibility is
  non-negotiable (labels, contrast, keyboard, ≥44px targets).
- **Environments are isolated:** Preview (per-PR) and Production have separate env/secrets. Never
  touch production data. Real secrets live in Vercel env vars, never in the repo.
- **Ask before anything irreversible** (deleting data, spending money, publishing externally).
