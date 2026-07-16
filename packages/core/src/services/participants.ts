/**
 * Attendee use-cases: QR resolve → join with consent → gallery
 * (docs/design/05 §2). The EventParticipant row is the authorization
 * anchor: every read below starts from it (docs/design/06 §2).
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@sr/db";

export const CONSENT_POLICY_VERSION = "dev-1";

/** Public info for the QR landing page. Invalid and revoked look identical. */
export async function resolveQrToken(token: string) {
  const qr = await prisma.qrCode.findUnique({
    where: { token },
    include: { event: { select: { id: true, name: true, venue: true, status: true, deletedAt: true } } },
  });
  if (!qr || qr.revokedAt || qr.event.deletedAt) return null;
  if (qr.event.status !== "live" && qr.event.status !== "closed") return null;

  // Fire-and-forget scan counter (analytics, not correctness).
  prisma.qrCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } }).catch(() => {});

  return { eventId: qr.event.id, eventName: qr.event.name, venue: qr.event.venue, qrId: qr.id };
}

/**
 * Join an event. Consent is a REQUIRED input — the consent row is written
 * in the same transaction as the participation (docs/design/06 §3).
 * Idempotent: joining twice returns the existing participation.
 */
export async function joinEvent(userId: string, input: { qrToken: string; consent: boolean }) {
  if (!input.consent) throw new ConsentRequiredError();

  const resolved = await resolveQrToken(input.qrToken);
  if (!resolved) return null;

  const existing = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: resolved.eventId, userId } },
  });
  if (existing && existing.status === "active") return existing;

  return prisma.$transaction(async (tx) => {
    const consent = await tx.consent.create({
      data: {
        userId,
        kind: "biometric_processing",
        eventId: resolved.eventId,
        policyVersion: CONSENT_POLICY_VERSION,
      },
    });
    if (existing) {
      // Rejoining after withdrawal: fresh consent, reset enrollment.
      return tx.eventParticipant.update({
        where: { id: existing.id },
        data: { status: "active", consentId: consent.id, enrollmentStatus: "none", enrollmentError: null },
      });
    }
    return tx.eventParticipant.create({
      data: {
        eventId: resolved.eventId,
        userId,
        joinedViaQrId: resolved.qrId,
        consentId: consent.id,
      },
    });
  });
}

export class ConsentRequiredError extends Error {
  constructor() {
    super("Consent is required");
    this.name = "ConsentRequiredError";
  }
}

/** Ownership gate for all /participants/:id/* routes.
 *  Deleted events take their galleries with them. */
export async function getOwnedParticipant(userId: string, participantId: string) {
  return prisma.eventParticipant.findFirst({
    where: { id: participantId, userId, status: "active", event: { deletedAt: null } },
    include: { event: { select: { id: true, orgId: true, name: true, status: true } } },
  });
}

/** Selfie accepted for processing: reset status before the worker runs. */
export async function markEnrollmentProcessing(participantId: string) {
  await prisma.eventParticipant.update({
    where: { id: participantId },
    data: { enrollmentStatus: "processing", enrollmentError: null },
  });
}

export async function getEnrollment(userId: string, participantId: string) {
  const participant = await getOwnedParticipant(userId, participantId);
  if (!participant) return null;
  const matchCount = await prisma.match.count({
    where: { participantId, status: { in: ["auto", "confirmed"] } },
  });
  return {
    status: participant.enrollmentStatus,
    error: participant.enrollmentError,
    matchCount,
  };
}

/**
 * The personal gallery: photos reached EXCLUSIVELY through matches
 * (docs/design/05 §2 — there is no "list event photos" path for attendees).
 */
export async function getGallery(userId: string, participantId: string) {
  const participant = await getOwnedParticipant(userId, participantId);
  if (!participant) return null;

  const matches = await prisma.match.findMany({
    where: {
      participantId,
      status: { in: ["auto", "confirmed"] },
      photo: { published: true, deletedAt: null, status: "processed" },
    },
    include: { photo: { select: { id: true, capturedAt: true, createdAt: true } } },
    orderBy: { photo: { capturedAt: "desc" } },
  });

  // A photo can contain the person twice (mirror, collage) — dedupe.
  const seen = new Set<string>();
  const photos = matches
    .filter((m) => !seen.has(m.photoId) && (seen.add(m.photoId), true))
    .map((m) => ({
      id: m.photo.id,
      capturedAt: m.photo.capturedAt ?? m.photo.createdAt,
      score: m.score,
    }));

  return { event: participant.event, photos };
}

/** May this user view this photo? True iff one of their matches links to it. */
export async function canViewPhotoAsParticipant(userId: string, photoId: string) {
  const match = await prisma.match.findFirst({
    where: {
      photoId,
      status: { in: ["auto", "confirmed"] },
      participant: { userId, status: "active" },
      photo: { published: true, deletedAt: null },
    },
  });
  return match !== null;
}

/**
 * Original-file download: authorize via the match relation, write the
 * audit row FIRST, then hand back the storage key (docs/design/05 §2,
 * 06 §4 — every original egress is logged).
 */
export async function requestDownload(
  userId: string,
  photoId: string,
  meta: { ip?: string; userAgent?: string },
) {
  const match = await prisma.match.findFirst({
    where: {
      photoId,
      status: { in: ["auto", "confirmed"] },
      participant: { userId, status: "active" },
      photo: { published: true, deletedAt: null },
    },
    include: { photo: { select: { s3Key: true, capturedAt: true } } },
  });
  if (!match) return null;

  await prisma.download.create({
    data: {
      participantId: match.participantId,
      photoId,
      variant: "original",
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  return { s3Key: match.photo.s3Key };
}

/** Dashboard helper: every event needs a QR; create on first ask. */
export async function ensureEventQr(eventId: string) {
  const existing = await prisma.qrCode.findFirst({
    where: { eventId, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.qrCode.create({
    data: { eventId, token: randomBytes(16).toString("base64url"), label: "Default" },
  });
}
