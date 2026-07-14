# Contributing

Thanks for your interest! A few ground rules keep this codebase healthy.

## Before you code

1. Read the relevant design doc in `docs/design/` — every subsystem has one.
   PRs that contradict the design docs need to change the doc first (that's
   deliberate: design review before code review).
2. Open or claim an issue so work isn't duplicated.

## Architecture rules (enforced in review)

- **Business logic lives in `packages/core`**, never in Next.js route
  handlers. Routes parse input, call a core function, serialize output.
- **Authorization goes through `can()`** (`packages/core/src/policy`).
  No inline permission checks.
- **Job payloads use the contracts in `packages/queue`** — both the
  TypeScript producers and the Python worker validate against them.
- **Every query is tenant-scoped**: repository functions take org/event
  scope as required parameters, not optional filters.

## Privacy rules (non-negotiable)

- No real faces, real names, or real event data in tests, fixtures, or
  screenshots. Use synthetic images.
- Anything touching biometric data, consent, or deletion needs a note in
  the PR description explaining GDPR impact.

## Dev workflow

```bash
pnpm stack:up && pnpm install && pnpm db:migrate && pnpm dev
pnpm typecheck   # must pass before pushing
```

Commit style: conventional-ish (`feat:`, `fix:`, `docs:`, `chore:`).
Small PRs beat big ones.
