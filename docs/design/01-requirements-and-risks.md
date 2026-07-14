# 01 — Requirements Analysis, Challenged Assumptions & Risks

> Status: Draft for review · Author: Architecture phase, July 2026

## 1. What we are actually building

Strip the tech away and the product is: **a real-time photo-to-person matching service with a self-serve claim flow**. Three actors:

| Actor | Job to be done | Success metric |
|---|---|---|
| Photographer | Shoot, never touch a computer during the event | Camera → live gallery latency < 60s |
| Attendee | Get *my* photos with zero effort | QR scan → personal gallery < 90s (incl. signup + selfie) |
| Organizer (later) | Branded experience, engagement stats | Adoption rate per event |

The photographer is the **paying customer**. The attendee is the **user**. Every architectural decision should protect the attendee experience (that's the wow factor that sells) while billing the photographer.

## 2. Challenged assumptions

These are places where I recommend deviating from the brief. Each is a decision point — push back if you disagree.

### 2.1 "Better Auth or Auth.js" → Better Auth, but attendee auth must be near-invisible
Correct instinct, wrong emphasis. The critical auth problem isn't the library — it's that **forcing account creation before the selfie kills conversion**. Recommendation: attendees start as an *anonymous session* (event-scoped, cookie-based), take the selfie, see their gallery immediately, and are only asked to create an account to **download originals or persist access**. Show value first, ask for commitment second. Better Auth supports anonymous → linked account upgrade natively, which is one reason I pick it over Auth.js (see 02).

### 2.2 "Next.js API or NestJS" → neither alone; the AI worker cannot be TypeScript
The entire serious open-source face stack (InsightFace, ONNX pipelines) is Python. Running face recognition in Node means either shelling out to Python anyway or using inferior JS ports. So the honest architecture is a **polyglot monorepo**: Next.js (frontend + API for CRUD/auth/galleries) + a **Python worker service** for AI + a small **ingest service** for FTP. NestJS as a third TypeScript service adds ceremony without owning any problem Next.js API routes can't handle at this scale. Full justification in 02.

### 2.3 "Vector database (Qdrant/Milvus/Weaviate) or pgvector" → pgvector, and search direction matters more than the DB
Your enhancement instinct (index embeddings, don't brute-force) is right. But at your stated scale — millions of embeddings total, **tens of thousands per event** — a dedicated vector DB is over-engineering. The killer insight: **searches are always event-scoped**. A user at event X only matches against faces from event X (~100k vectors max). pgvector with an HNSW index *per-event-partitioned* does this in single-digit milliseconds, keeps embeddings transactionally consistent with photo metadata (one source of truth, no sync pipeline), and is one less service to operate. Migrate to Qdrant only if we ever need cross-event global search over 100M+ vectors. Details in 03.

Also note **the match direction is two-way**, which the brief underspecifies:
- *Selfie → photos*: user registers, search their embedding against existing event faces (one query).
- *New photo → users*: photo arrives *after* user registered; its faces must match against registered selfies (query per detected face, against enrolled-user embeddings only — a tiny set).

Both directions are needed for the "instant" promise; photos keep arriving all event long.

### 2.4 "Everything should happen automatically" → not photo publishing
Auto-publishing every frame is a liability: test shots, unflattering photos, accidental captures, other people's children. Default should be **auto-publish with a photographer kill-switch** (per-event setting: auto vs. review queue) and per-photo unpublish that retroactively removes it from galleries. Weddings/schools will demand review mode; sports events will want full auto.

### 2.5 Matching must be probabilistic in the UX, not just the backend
No face model is perfect. At 50k photos × ~5 faces/photo = 250k faces per event, even 99% precision leaks thousands of wrong photos. Design consequence: **two thresholds**. High-confidence matches go straight to the gallery; a mid-confidence band lands in a "Is this you?" confirmation strip. User confirmations become labeled data that (a) fixes their gallery and (b) tightens their embedding centroid. This turns the model's weakness into an engagement feature.

### 2.6 GDPR is not a checklist item — it shapes the core data model
Face embeddings are **Article 9 biometric data**. Processing requires *explicit consent*, and — the part most competitors get wrong — **the people in the photos who never registered also have rights**. We can't get consent from a stranger in the background. Mitigations baked into the design (full treatment in 06):

- Unmatched face embeddings are stored **without identity**, auto-deleted N days after the event (configurable retention).
- Event signage/QR page must disclose photography + AI matching (we give organizers the template — it's their legal duty as controller; we're the processor).
- "Delete my data" must cascade: account → selfie embeddings → matches → confirmations, and *exclusion request*: a non-user can submit a selfie to have their face suppressed from galleries (matched, then blocked — an elegant reuse of the same pipeline).
- EU hosting, DPA template for photographers, records of processing.

This is a **competitive moat**, not overhead: agencies and schools choose the compliant vendor.

### 2.7 FTP is the ingest path, not part of the app
Sony A7III speaks FTP/FTPS only — fixed constraint. But the FTP server should be a **dumb, isolated deposit box**: accept file → write to storage → emit event. No AI, no DB writes beyond registering the upload. Reasons: FTP daemons are a security liability (isolate them), cameras retry on failure (idempotency needed), and events happen in venues with terrible Wi-Fi (the pipeline must tolerate bursts when connectivity returns — 500 photos arriving at once after a dead zone).

### 2.8 "50k photos/event, 5k attendees" — believe the shape, not the numbers, on day one
Design the *data model and interfaces* for that scale (partitioning, event-scoped queries, queue-based processing) but don't build the infrastructure for it yet (no Kubernetes, no multi-region). A single decent VPS handles a real 3,000-photo event. Scale the deployment, not the architecture.

## 3. Improvements to the brief (additions you didn't ask for)

1. **Live gallery mode** — a public, auto-updating "all photos" slideshow URL per event (opt-in). Great for screens at venues; drives QR scans.
2. **Watermarked previews vs. paid originals** — the obvious monetization: free watermarked web-res, photographer sets price for originals. Design the storage/variant model for this now (photo variants: thumbnail / preview / original) even if selling comes later.
3. **Selfie quality gate** — reject blurry/dark/masked selfies at capture with instant feedback (face detector runs on the selfie synchronously). Cheap to build, dramatically reduces "no photos found" support pain.
4. **Idempotent ingest** — cameras and FTP retry; dedupe by content hash, not filename.
5. **Processing status surface** — photographers need a dashboard: photos ingested / processed / failed, queue depth, per-photo face counts. Ops visibility is a feature.

## 4. Technical risks, ranked

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Biometric/GDPR legal exposure** (also BIPA-like laws if US expansion) | High | Existential | Consent-first flows, retention limits, processor/controller split, EU hosting; legal review before public launch |
| R2 | **Match quality on hard photos** (sports helmets, profile shots, sunglasses, motion blur, children) | High | High — product promise breaks | InsightFace SOTA model, quality-score-weighted matching, two-threshold UX (2.5), user confirmation loop |
| R3 | **Ingest burst overload** (venue Wi-Fi returns → 1k photos in 2 min) | Medium | Medium | Queue decoupling, backpressure, worker autoscale knob; FTP box does no heavy work |
| R4 | **Camera FTP quirks** (partial uploads, re-uploads, weird temp filenames) | High | Medium | Upload-complete detection (rename-based or size-stable), content-hash dedupe, quarantine bucket for corrupt files |
| R5 | **GPU cost vs. latency** | Medium | Medium | CPU-first with measured throughput; GPU worker is the *same container* with a flag — see sizing in 03 §6 |
| R6 | **Photo enumeration / gallery leakage** (someone scrapes other people's photos) | Medium | High — trust destroying | Non-sequential IDs, per-user signed URLs, authorization on the *match* relation, rate limiting — see 06 |
| R7 | **Wrong-person match shown** (privacy incident, not just bug) | Medium | High | Conservative default threshold, report button, instant suppression path |
| R8 | **Scope creep before first paying event** | High | High | Milestone plan (07) gates: nothing beyond M2 until a real event runs on it |

## 5. Non-functional requirements (targets)

- Photo ingest → visible in matched gallery: **p50 < 30s, p95 < 90s** (CPU workers), < 10s with GPU.
- Selfie → gallery first paint: **< 5s** (search is ms; budget is upload + embed).
- Availability during an event: ingest pipeline must degrade gracefully — **photos are never lost** even if AI workers are down (storage-first, process-later).
- 50k photos/event ≈ 150 GB originals (6 MB avg) — storage design must stream, never buffer whole files in memory, and originals go to S3-compatible object storage from day one (MinIO locally, so the code path never changes).

## 6. Explicit non-goals (v1)

Video, on-camera/edge inference, mobile native apps, print fulfillment, US biometric-law markets, cross-event person search (deliberately excluded — creepy and legally radioactive).
