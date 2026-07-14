# Sony Recognizer

**Instant AI-matched event photo delivery.** A photographer shoots an event;
every photo uploads itself from the camera over FTPS. Attendees scan a QR
code, take a selfie, and within seconds see — and download — every photo
they appear in. Nothing manual in between.

> Status: **M0 — foundation.** Architecture is designed, the skeleton runs,
> features land milestone by milestone (`docs/design/07-milestones.md`).

## How it works

```
Sony A7III ──FTPS──▶ Ingest ──▶ S3 storage ──▶ queue ──▶ AI worker
                                                            │ detect faces
                                                            │ embed + match
Attendee ──QR──▶ selfie ──▶ personal gallery ◀── Postgres ◀─┘
```

Full design with justifications for every decision: [`docs/design/`](docs/design/README.md).

## Stack

Next.js 15 + TypeScript + Tailwind (web & API) · Python + InsightFace/ONNX
(AI worker) · PostgreSQL + pgvector (data + vector search) · Redis + BullMQ
(queues) · S3-compatible object storage · Docker.

## Quickstart

Prereqs: Node ≥ 20, [pnpm](https://pnpm.io), Docker, Python ≥ 3.11 (worker only).

```bash
# 1. Configuration
cp .env.example .env          # defaults work for local dev

# 2. Backends (Postgres+pgvector, Redis, MinIO)
pnpm stack:up

# 3. Dependencies + database tables
pnpm install
pnpm db:migrate               # answer "init" when asked for a migration name

# 4. Run everything
pnpm dev
```

Open http://localhost:3000 — the health check link on the page should report
`database: ok`.

## Repository layout

```
apps/web        Next.js app: attendee flow, photographer dashboard, API
apps/ingest     FTPS deposit box: camera → storage → queue (M1)
apps/worker     Python AI worker: detect, embed, match (M1)
packages/db     Prisma schema — the single source of truth for data
packages/queue  Job contracts shared between TypeScript and Python
packages/core   Business logic & authorization policy (framework-free)
packages/config Environment validation
docs/design     Architecture documents (start with the README there)
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License

Not yet chosen — decision pending before the repository goes public
(MIT vs AGPL-3.0 trade-off is tracked in the M0 notes).
