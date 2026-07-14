# 07 — Milestones & Delivery Plan

> Principle: **every milestone ends in something demonstrable with a real camera**, and nothing beyond M2 starts until a real event has run on the system. One feature at a time, production quality each step.

## M0 — Foundation (repo you'd be proud to open-source)
Scaffold the monorepo per 02 §3: Turborepo, `apps/web` (Next.js + Tailwind + Better Auth wired), `packages/db` (full Prisma schema from doc 04 + pgvector migrations), `packages/queue` contracts, `packages/core` skeleton, Docker Compose dev stack (Postgres+pgvector, Redis, MinIO), CI (lint, typecheck, test, prisma validate, gitleaks, contract-drift check), README / CONTRIBUTING / SECURITY.md / issue templates / `.env.example`.
**Done when:** `docker compose up` + `pnpm dev` gives a running empty app with auth, green CI on a PR.

## M1 — The spine: camera → processed photo
Ingest service (FTPS → S3 → DB → queue, with dedupe + reconciler), Python worker (detect + embed + persist; matching stubbed), photographer can create org/event/FTP creds and watch the live ingest ticker (SSE) with thumbnails.
**Done when:** your actual A7III uploads over FTPS and faces appear in the DB with embeddings, p95 ingest→processed < 60s on dev hardware; kill -9 any service mid-event and no photo is lost.
*Risk retired:* R3, R4 (camera quirks, burst tolerance) — the highest-unknown integration.

## M2 — The magic: QR → selfie → personal gallery
QR resolve + join + consent flow, anonymous sessions, selfie enrollment (quality gate, priority queue), both match directions, two-threshold confirmation strip, personal gallery with signed previews, downloads with audit rows, account-upgrade flow.
**Done when:** end-to-end demo: shoot a photo of a friend, they scan a printed QR, selfie, see the photo in < 90s, download it. This is the **first-real-event gate**.
*Risk retired:* R2 partially (match quality measured on real data → tune thresholds), R6.

## M3 — Compliance & trust (before any public event)
Erasure + export + withdrawal flows with CI-verified cascade test, exclusion requests, retention sweeper, consent versioning UI, organizer disclosure kit, DPIA drafted, **model-weights commercial licensing resolved (launch gate, 03 §1.2)**, rate limiting + security headers pass, restore-from-backup rehearsal.
**Done when:** the erasure test is green in CI and you'd hand the DPA to a school.
*Risk retired:* R1, R7.

## M4 — Run a real event
Photographer dashboard hardening (DLQ requeue, failure states, stats), watermarking, browser-upload fallback, live-gallery screen mode, ops runbook, load test with 5k synthetic photos + 500 synthetic identities (fixes the pgvector filtered-HNSW question with data, 03 §4).
**Done when:** a real event (even a small one — a club match, a birthday) runs start-to-finish with zero manual intervention. Collect the metric that matters: **% of attendees who scanned and found their photos**.

## M5 — SaaS-ification
Multi-org onboarding polish, plans/billing (Stripe), per-event GPU-rental worker playbook (03 §6), organizer branding, album curation, email notifications ("your photos are ready"), public docs site.
**Done when:** a photographer you've never met runs an event without talking to you.

## M6+ — Backlog (explicitly not now)
Postgres RLS defense layer, worker autoscaling, CDN for variants, passive liveness detection, cross-event opt-in identity, mobile PWA polish → native, INT8/dual-detector CPU optimizations, Qdrant extraction (only at 100M+ vectors), marketplace/print sales.

## Sequencing rationale
Spine before magic (M1 before M2) because camera integration is the biggest unknown and everything downstream depends on its data shape. Compliance before public events (M3 before M4) because biometric mistakes are unrecoverable reputationally. Billing last (M5) because a paying customer requires everything before it, and nothing before it requires billing.
