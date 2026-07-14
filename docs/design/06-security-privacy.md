# 06 — Security & Privacy Design

> The product's core promise is a privacy claim: *you only see photos you appear in*. Security here is the product, not a wrapper around it.

## 1. Threat model (what we defend against)

| Threat | Vector | Primary control |
|---|---|---|
| T1 Photo enumeration | Guessing photo/gallery URLs | UUIDv7 IDs, signed URLs, **no attendee endpoint lists event photos** (05 §2) |
| T2 Cross-gallery access | IDOR on participant/match IDs | Ownership check on every read in service layer; policy function unit-tested against IDOR matrix |
| T3 Selfie impersonation | Enrolling with someone else's photo (photo-of-a-photo) | v1: rate limit + report/suppress flow + audit trail. v2: passive liveness (screen/print detection). Documented residual risk — flagged honestly to photographers |
| T4 FTP surface compromise | Brute force, cred leak | FTPS only, per-event auto-expiring creds, fail2ban, network-isolated container, S3-prefix-scoped writes |
| T5 Scraping via signed URLs | Sharing/leaking preview URLs | 5-min TTL, participant-bound path, watermarked previews; originals single-use URLs |
| T6 Tenant data bleed | Bug in query scoping | `org_id`/`event_id` mandatory in repository method signatures (not optional filters); Postgres RLS as belt-and-braces in stage 2 |
| T7 Embedding theft | DB dump = biometric leak | Encryption at rest, embeddings unlinked from identity where possible, retention deletion; note: embeddings are not reversible to faces but are legally biometric regardless |
| T8 Malicious upload | Crafted image → decoder exploit in worker | Workers parse images in a no-network, read-only-FS container; format allowlist; size caps; quarantine status |

## 2. Authorization model

Single policy module in `packages/core` — `can(actor, action, resource)`:

- **Attendee**: reads flow *only* through `event_participants` → `matches`. There is structurally no code path from attendee session to another participant's photos: the gallery query starts from their participant row. IDs never cross tenants unchecked because every service method takes the authenticated scope as its first argument.
- **Photographer**: `event_photographers` join gates event assets; org role gates org assets.
- **Anonymous sessions** (pre-signup funnel): same participant anchor, flagged `anonymous`; can view gallery previews but **cannot download originals or persist beyond cookie lifetime** — the upgrade incentive.
- Enforcement lives in services (not routes, not UI). Routes cannot reach repositories directly — lint rule enforced.

## 3. GDPR architecture (processor discipline)

Roles: **photographer/organizer = data controller; the platform = data processor** for event photos; for *user accounts* we are the controller. This split drives everything:

- **Lawful basis**: explicit consent (Art. 9(2)(a)) collected at join time, versioned, append-only (04 §2 consents). No selfie processed before consent row exists — enforced by FK, not by UI discipline.
- **Bystanders** (photographed non-users): we process their faces under the controller's legitimate-interest assessment; our obligations: no identity linkage, retention limits (embeddings auto-deleted post-event per event setting), exclusion-request path (05 §4), and a signage/disclosure kit we require organizers to acknowledge at event creation.
- **Data minimization**: we store crops' coordinates + embeddings, not face crops themselves (crops recomputable from original if reprocessing is ever needed). Selfies deleted after embedding by default (keep only with explicit opt-in for "improve my matches").
- **Erasure**: single code path (04 §3), executed async with completion receipt, audit-logged. Target: < 24h, verified by an automated erasure test in CI (create → delete → assert zero rows/objects).
- **Portability/export**: 05 §4.
- **Records**: audit_logs (04) + a `docs/legal/ropa.md` records-of-processing doc maintained alongside code.
- **Hosting**: EU region for all data (VPS + EU S3/R2 jurisdiction options reviewed at deploy time). DPA template offered to every org — this is a sales asset.
- **DPIA**: biometric processing at scale requires a Data Protection Impact Assessment — drafted at M3 (07), before first public event.

## 4. Storage & transport security

- Buckets fully private; no public ACLs anywhere. Server-side encryption (SSE-S3 minimum; SSE-KMS when on AWS).
- **Previews**: watermarked WebP, signed GET, 5-min TTL, URL bound to participant (path includes participant scope so a leaked URL identifies the leaker).
- **Originals**: signed URL TTL 60s, issued only through `POST /downloads` (which writes the audit row first). Effectively single-use.
- FTPS (TLS) from camera; the A7III supports FTPS — plain FTP disabled. Ingest container: isolated network, write-only S3 prefix, no DB superuser.
- TLS 1.2+ everywhere; HSTS; secrets via env from a secret store (SOPS-encrypted in repo for VPS stage), never committed. Postgres encrypted volume.
- Backups encrypted, same jurisdiction, tested restore (calendarized — untested backups don't exist).

## 5. API hardening

- Rate limits (Redis sliding window): selfie upload 5/hr/participant; join 10/hr/IP; QR resolve 60/hr/IP; auth endpoints per Better Auth defaults + captcha after 3 failures; gallery reads 600/hr/session.
- Input validation with zod at every boundary; image uploads: magic-byte sniffing, max 50 MB, JPEG/PNG/HEIC allowlist, EXIF stripped from all served variants (GPS in EXIF is a privacy leak — kept only in the DB `exif` column for the photographer).
- 404-not-403 for resources outside the caller's scope (no existence oracle).
- Security headers (CSP, frame-ancestors none on galleries), CSRF via Better Auth, dependency audit + CodeQL in CI, `SECURITY.md` with disclosure policy (open-source hygiene).

## 6. Open-source-specific care

Public repo, private data: no real event data in fixtures ever; synthetic face dataset for tests (e.g. generated faces); secrets scanning (gitleaks) in CI + pre-commit; threat model published (this doc) — sunlight beats obscurity for a privacy product.
