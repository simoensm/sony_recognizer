# Design Documents

Architecture phase deliverables — review these in order before any implementation begins. Each doc flags the decisions that need your sign-off.

| Doc | Contents | Key decisions to review |
|---|---|---|
| [01 — Requirements & Risks](01-requirements-and-risks.md) | Analysis, challenged assumptions, improvements, ranked risks | Anonymous-first attendee funnel · auto-publish default · two-threshold matching · GDPR as data-model driver |
| [02 — Architecture](02-architecture.md) | Services, diagrams, monorepo layout, ADR summary, scaling path | Next.js API + Python worker (no NestJS) · pgvector over vector DB · BullMQ · Better Auth · SSE |
| [03 — AI Pipeline](03-ai-pipeline.md) | Model comparison, matching design, vector search, worker architecture, CPU/GPU sizing | InsightFace/ONNX · **model weights licensing (launch gate)** · CPU-first, rent GPU per big event |
| [04 — Database](04-database.md) | Full ER design, every relationship explained, deletion semantics, index plan | Event-scoped identities · matches as authorization anchor · consent as append-only |
| [05 — API](05-api.md) | REST surface, attendee funnel, photographer dashboard, compliance endpoints | Consent-required join · no attendee photo-listing endpoint · contract-first OpenAPI |
| [06 — Security & Privacy](06-security-privacy.md) | Threat model, authorization, GDPR architecture, hardening | Processor/controller split · bystander handling · signed-URL policy |
| [07 — Milestones](07-milestones.md) | M0–M6 delivery plan with done-criteria and gates | First-real-event gate at M2 · compliance gate at M3 |

Decision workflow: agree/amend these docs → they become ADRs in `docs/adr/` at scaffold time (M0) → implementation follows one milestone at a time.
