/**
 * Queue contracts — the agreement between the TypeScript services
 * (web, ingest) and the Python AI worker (docs/design/05 §5).
 *
 * Rules:
 * - A job payload is NEVER constructed by hand elsewhere; producers call
 *   schema.parse() so an invalid payload fails at send time, not in the worker.
 * - The Python side validates the same shapes with pydantic
 *   (apps/worker/src/worker/contracts.py — kept in sync; an automated
 *   JSON-Schema drift check lands in M1).
 * - Changing a field here is a breaking change: bump the JOB_CONTRACT_VERSION.
 */
import { z } from "zod";

export const JOB_CONTRACT_VERSION = 1;

/** Queue names — Redis keys, shared verbatim with the Python worker. */
export const QUEUES = {
  /** New photo landed in storage → detect faces, embed, match. */
  photoProcess: "photo.process",
  /** Attendee selfie → embed + search. Higher priority than photos: a human is waiting. */
  selfieEnroll: "selfie.enroll",
  /** Bundle many originals into one zip for download. */
  galleryZip: "gallery.zip",
  /** Post-event biometric cleanup (docs/design/04 §3). */
  retentionSweep: "retention.sweep",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const uuid = z.string().uuid();

export const photoProcessJob = z.object({
  photoId: uuid,
  eventId: uuid,
  s3Key: z.string().min(1),
  /** sha256 hex — also the idempotency anchor for retries. */
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type PhotoProcessJob = z.infer<typeof photoProcessJob>;

export const selfieEnrollJob = z.object({
  participantId: uuid,
  eventId: uuid,
  s3Key: z.string().min(1),
});
export type SelfieEnrollJob = z.infer<typeof selfieEnrollJob>;

export const galleryZipJob = z.object({
  participantId: uuid,
  photoIds: z.array(uuid).min(1).max(500),
});
export type GalleryZipJob = z.infer<typeof galleryZipJob>;

export const retentionSweepJob = z.object({
  eventId: uuid,
});
export type RetentionSweepJob = z.infer<typeof retentionSweepJob>;

/** Default job options producers should use (mirrors docs/design/03 §5). */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 24 * 3600 },
  removeOnFail: false, // failed jobs stay visible = our dead-letter queue
};
