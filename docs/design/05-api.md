# 05 — API Design

> REST over Next.js route handlers under `/api/v1`. Route handlers are thin: parse (zod) → authorize → call `packages/core` service → serialize. Versioned from day one because camera-adjacent integrations and a future mobile app will outlive UI churn.

## 1. Conventions

- Auth: Better Auth session cookie (web) — no API keys in v1 except FTP credentials (which never touch this API).
- IDs: UUIDv7 everywhere; no sequential identifiers escape the system (anti-enumeration).
- Errors: RFC 9457 problem+json (`type`, `title`, `status`, `detail`, `traceId`).
- Pagination: cursor-based (`?cursor=&limit=`), never offset (galleries mutate while paging).
- All mutating endpoints idempotent via `Idempotency-Key` header where retries are plausible.
- Rate limits (per session/IP, enforced at middleware): tight on auth + selfie endpoints, generous on gallery reads. Numbers in 06 §5.

## 2. Attendee flow (the funnel — ordered as the user experiences it)

| # | Endpoint | Purpose | Notes |
|---|---|---|---|
| 1 | `GET /api/v1/qr/{token}` | Resolve QR → event public info | No auth. Returns event name, branding, consent copy, participation state. Invalid/revoked token → 404 (identical body — no oracle) |
| 2 | `POST /api/v1/events/{eventId}/participants` | Join event | Anonymous session allowed. Body: `{ qrToken, consent: { biometric: true, policyVersion } }`. **Consent is required input, not a checkbox afterthought** — 400 without it. Creates participant + consent rows |
| 3 | `POST /api/v1/participants/{id}/selfie` | Upload selfie | Multipart. Sync fast-path validation (one face, quality) → `202 { enrollmentId }` or `422 { reason: "no_face" \| "multiple_faces" \| "low_quality" }` with retake hint |
| 4 | `GET /api/v1/participants/{id}/enrollment` | Poll enrollment status | `processing → ready (matchCount)`. SSE alternative below |
| 5 | `GET /api/v1/participants/{id}/gallery` | The personal gallery | Only `matches.status IN (auto, confirmed)`. Returns photo metadata + short-lived signed preview URLs (5 min TTL) |
| 6 | `GET /api/v1/participants/{id}/pending-matches` | "Is this you?" strip | Mid-band matches |
| 7 | `POST /api/v1/matches/{id}/confirm` · `/reject` | Confirmation loop | Updates centroid embedding (03 §2) |
| 8 | `POST /api/v1/participants/{id}/downloads` | Request original | Body: `{ photoIds[] }` → signed URLs (single-use semantics, 06 §4) + `downloads` rows. Zip bundling for >5 photos (async job → notification) |
| 9 | `GET /api/v1/participants/{id}/stream` | SSE | Events: `match.created`, `enrollment.ready`, `photo.unpublished` |

Authorization invariant for 4–9: `session → participant` ownership checked in the service layer; participant must belong to the session's user *or* anonymous session id. **Gallery data is derived exclusively from `matches` — there is no endpoint that lists an event's photos to attendees.**

## 3. Photographer / organizer

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/orgs` · `GET/PATCH /api/v1/orgs/{id}` | Tenant CRUD (Better Auth org plugin handles members/invites) |
| `POST /api/v1/orgs/{id}/events` · `GET/PATCH /api/v1/events/{id}` | Event CRUD; PATCH covers settings (auto_publish, threshold, retention) |
| `POST /api/v1/events/{id}/ftp-credentials` | Generate camera creds (returns password **once**) |
| `POST /api/v1/events/{id}/qr-codes` · `POST /api/v1/qr-codes/{id}/revoke` | QR lifecycle |
| `GET /api/v1/events/{id}/photos?status=&cursor=` | Full photo grid (photographer sees everything, incl. failed/quarantined) |
| `PATCH /api/v1/photos/{id}` | publish/unpublish, album assignment |
| `POST /api/v1/photos/{id}/reprocess` | Requeue from DLQ |
| `GET /api/v1/events/{id}/stats` | Dashboard: ingested/processed/failed counts, queue depth, participants, match rate, scan counts |
| `GET /api/v1/events/{id}/stream` | SSE: live ingest/processing ticker |
| `POST /api/v1/uploads` | Browser upload fallback (drag-drop) → same pipeline as FTP (presigned S3 PUT + ingest notification) |

Authorization: org role via `org_members` (`photographer` can manage photos on assigned events only; `admin/owner` full org scope). Enforced in `packages/core` policy module — one `can(actor, action, resource)` function, unit-tested exhaustively, used by every route.

## 4. Privacy & compliance endpoints

| Endpoint | Purpose |
|---|---|
| `DELETE /api/v1/me` | Account + biometric erasure (cascades per 04 §3), async with confirmation email |
| `GET /api/v1/me/export` | GDPR data export (async job → download link) |
| `POST /api/v1/participants/{id}/withdraw` | Leave one event: matches suppressed, identity embeddings deleted |
| `POST /api/v1/events/{id}/exclusion-requests` | Non-user face suppression (01 §2.6): selfie in, no account needed, human-reviewed |
| `POST /api/v1/photos/{id}/report` | "This isn't me / remove this photo of me" — flags match + notifies photographer |

## 5. Internal interfaces (not HTTP)

Worker ↔ system boundaries are **queue jobs and DB writes, not API calls** (02 §1). Job contracts (zod → JSON Schema → pydantic, `packages/queue`):

```
photo.process   { photoId, eventId, s3Key, contentHash }
selfie.enroll   { participantId, eventId, s3Key }        # priority queue
gallery.zip     { participantId, photoIds[] }
retention.sweep { eventId }
```

Signed-URL issuance is the one thing the worker requests from nothing — it signs directly against S3 creds scoped to variants/ prefix. The web app is the only signer for originals.

## 6. OpenAPI

Contract-first: `docs/api/openapi.yaml` generated from zod schemas (`zod-openapi`) at build; CI fails on drift. Published in the repo for the open-source audience.
