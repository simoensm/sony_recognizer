/**
 * Event management use-cases (docs/design/05 §3).
 * Called by API routes; never touched by React components directly.
 * Every function takes the acting userId FIRST — authorization is part
 * of the signature, not an afterthought (docs/design/06 §2).
 */
import { randomBytes, scryptSync } from "node:crypto";
import { prisma, type OrgRole } from "@sr/db";
import { can } from "../policy/can";

// ---------- helpers ----------

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "") // strip accents (é → e)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "event"
  );
}

/** Camera-friendly: lowercase + digits, no confusable characters. */
const FRIENDLY = "abcdefghjkmnpqrstuvwxyz23456789";
function friendlyToken(length: number): string {
  return Array.from(randomBytes(length), (b) => FRIENDLY[b % FRIENDLY.length]).join("");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// ---------- membership / authorization ----------

async function requireMembership(userId: string, orgId: string) {
  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!member) throw new AuthorizationError();
  return member;
}

export class AuthorizationError extends Error {
  constructor() {
    super("Not authorized");
    this.name = "AuthorizationError";
  }
}

/** Loads an event iff the user may manage it. 404-shaped null otherwise. */
export async function getManagedEvent(userId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
  });
  if (!event) return null;

  const member = await prisma.orgMember.findUnique({
    where: { orgId_userId: { orgId: event.orgId, userId } },
  });
  if (!member) return null; // outsiders get "not found", not "forbidden" (06 §5)

  const allowed =
    can(
      { kind: "orgMember", userId, orgId: event.orgId, role: member.role as OrgRole },
      "event.manage",
      { kind: "event", eventId: event.id, orgId: event.orgId },
    ) ||
    // photographers manage events they're assigned to (docs/design/04 §2)
    (member.role === "photographer" &&
      (await prisma.eventPhotographer.count({
        where: { eventId: event.id, orgMemberId: member.id },
      })) > 0);

  return allowed ? event : null;
}

// ---------- use-cases ----------

/** Every user gets a personal org on first use — multi-tenancy without special cases (04 §2). */
export async function ensurePersonalOrg(userId: string, displayName: string) {
  const existing = await prisma.orgMember.findFirst({
    where: { userId, role: "owner" },
    include: { org: true },
  });
  if (existing) return existing.org;

  const base = slugify(displayName || "studio");
  return prisma.organization.create({
    data: {
      name: displayName ? `${displayName}'s Studio` : "My Studio",
      slug: `${base}-${friendlyToken(4)}`,
      members: { create: { userId, role: "owner" } },
    },
  });
}

export async function createEvent(
  userId: string,
  input: { name: string; venue?: string; startsAt?: Date; endsAt?: Date },
) {
  const org = await ensurePersonalOrg(userId, "");
  await requireMembership(userId, org.id);

  const base = slugify(input.name);
  const taken = await prisma.event.findUnique({
    where: { orgId_slug: { orgId: org.id, slug: base } },
  });

  return prisma.event.create({
    data: {
      orgId: org.id,
      name: input.name,
      slug: taken ? `${base}-${friendlyToken(4)}` : base,
      venue: input.venue,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: "live",
    },
  });
}

export async function listEventsForUser(userId: string) {
  return prisma.event.findMany({
    where: {
      deletedAt: null,
      org: { members: { some: { userId } } },
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { photos: true, participants: true } } },
  });
}

/** Dashboard numbers + latest photos (client polls this — docs/design/05 §3). */
export async function getEventStats(userId: string, eventId: string) {
  const event = await getManagedEvent(userId, eventId);
  if (!event) return null;

  const [byStatus, participantCount, recognized, recentPhotos] = await Promise.all([
    prisma.photo.groupBy({
      by: ["status"],
      where: { eventId, deletedAt: null },
      _count: true,
    }),
    prisma.eventParticipant.count({ where: { eventId, status: "active" } }),
    // Distinct PEOPLE recognized in photos (not raw face detections).
    prisma.match.groupBy({
      by: ["participantId"],
      where: { eventId, status: { in: ["auto", "confirmed"] } },
    }),
    prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, status: true, createdAt: true, capturedAt: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const row of byStatus) counts[row.status] = row._count;

  return {
    event: { id: event.id, name: event.name, status: event.status },
    photos: {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      ingested: counts.ingested ?? 0,
      processing: counts.processing ?? 0,
      processed: counts.processed ?? 0,
      failed: counts.failed ?? 0,
    },
    participants: participantCount,
    recognized: recognized.length,
    recentPhotos,
  };
}

/**
 * Generates camera credentials. The password is returned ONCE and never
 * stored in plaintext (docs/design/04 §2 — blast-radius containment).
 */
export async function createFtpCredential(userId: string, eventId: string, label?: string) {
  const event = await getManagedEvent(userId, eventId);
  if (!event) return null;

  const username = `cam${friendlyToken(6)}`;
  const password = friendlyToken(10);

  await prisma.ftpCredential.create({
    data: {
      eventId: event.id,
      username,
      passwordHash: hashPassword(password),
      s3Prefix: `orgs/${event.orgId}/events/${event.id}`,
      label,
      expiresAt: event.endsAt ?? new Date(Date.now() + 90 * 24 * 3600 * 1000),
    },
  });

  return { username, password };
}

/** Camera list for the event dashboard: liveness + per-camera photo count. */
export async function listFtpCredentials(userId: string, eventId: string) {
  const event = await getManagedEvent(userId, eventId);
  if (!event) return null;

  const credentials = await prisma.ftpCredential.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { photos: true } } },
  });

  const now = Date.now();
  return credentials.map((c) => {
    const lastSeen = c.lastUploadAt ?? c.lastLoginAt;
    const seenMsAgo = lastSeen ? now - lastSeen.getTime() : null;
    return {
      id: c.id,
      username: c.username,
      label: c.label,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt,
      revoked: c.revokedAt !== null,
      lastLoginAt: c.lastLoginAt,
      lastUploadAt: c.lastUploadAt,
      photoCount: c._count.photos,
      // "sending" = delivered a photo in the last 3 min;
      // "connected" = logged in recently but no fresh photo;
      // "idle" = known but quiet; "never" = configured, never seen.
      status: c.revokedAt
        ? ("revoked" as const)
        : c.lastUploadAt && now - c.lastUploadAt.getTime() < 3 * 60_000
          ? ("sending" as const)
          : seenMsAgo !== null && seenMsAgo < 3 * 60_000
            ? ("connected" as const)
            : lastSeen
              ? ("idle" as const)
              : ("never" as const),
    };
  });
}

export async function revokeFtpCredential(userId: string, credentialId: string) {
  const credential = await prisma.ftpCredential.findUnique({ where: { id: credentialId } });
  if (!credential) return null;
  const event = await getManagedEvent(userId, credential.eventId);
  if (!event) return null;
  return prisma.ftpCredential.update({
    where: { id: credentialId },
    data: { revokedAt: new Date() },
  });
}

export type EventLogEntry = {
  at: Date;
  kind: "photo" | "photo_failed" | "participant" | "download" | "camera";
  message: string;
};

/** Activity feed for the event page: everything that happened, newest first. */
export async function getEventLog(userId: string, eventId: string, limit = 50) {
  const event = await getManagedEvent(userId, eventId);
  if (!event) return null;

  const [photos, participants, downloads, credentials] = await Promise.all([
    prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        createdAt: true,
        status: true,
        ftpCredential: { select: { label: true, username: true } },
        _count: { select: { faces: true } },
      },
    }),
    prisma.eventParticipant.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { createdAt: true, enrollmentStatus: true },
    }),
    prisma.download.findMany({
      where: { photo: { eventId } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { createdAt: true, variant: true },
    }),
    prisma.ftpCredential.findMany({
      where: { eventId },
      select: { createdAt: true, label: true, username: true, revokedAt: true },
    }),
  ]);

  const entries: EventLogEntry[] = [
    ...photos.map((p) => ({
      at: p.createdAt,
      kind: (p.status === "failed" ? "photo_failed" : "photo") as EventLogEntry["kind"],
      message:
        p.status === "failed"
          ? `Photo processing failed (from ${p.ftpCredential?.label ?? p.ftpCredential?.username ?? "camera"})`
          : `Photo received from ${p.ftpCredential?.label ?? p.ftpCredential?.username ?? "upload"} · ${p._count.faces} face${p._count.faces === 1 ? "" : "s"}`,
    })),
    ...participants.map((p) => ({
      at: p.createdAt,
      kind: "participant" as const,
      message:
        p.enrollmentStatus === "ready"
          ? "Attendee joined and enrolled"
          : "Attendee joined",
    })),
    ...downloads.map((d) => ({
      at: d.createdAt,
      kind: "download" as const,
      message: `Attendee downloaded a photo (${d.variant})`,
    })),
    ...credentials.flatMap((c) => {
      const label = c.label ?? c.username;
      const out: EventLogEntry[] = [
        { at: c.createdAt, kind: "camera", message: `Camera login created: ${label}` },
      ];
      if (c.revokedAt)
        out.push({ at: c.revokedAt, kind: "camera", message: `Camera login revoked: ${label}` });
      return out;
    }),
  ];

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

/** Thumbnail access check: may this user see this photo's variants? */
export async function getManagedPhoto(userId: string, photoId: string) {
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, deletedAt: null },
  });
  if (!photo) return null;
  const event = await getManagedEvent(userId, photo.eventId);
  return event ? photo : null;
}
