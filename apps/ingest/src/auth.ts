/**
 * FTP credential verification against the database.
 * Passwords are stored as scrypt:<salt>:<hash> (see packages/db/src/seed.ts).
 */
import { scryptSync, timingSafeEqual } from "node:crypto";
import { prisma, type FtpCredential, type Event } from "@sr/db";

export type CameraSession = {
  credential: FtpCredential;
  event: Event & { orgId: string };
};

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/**
 * Returns the camera's event context if credentials are valid, else null.
 * Rules: credential must exist, not be revoked, not be expired, and its
 * event must not be archived/deleted.
 */
export async function authenticateCamera(
  username: string,
  password: string,
): Promise<CameraSession | null> {
  const credential = await prisma.ftpCredential.findUnique({
    where: { username },
    include: { event: true },
  });

  if (!credential) return null;
  if (credential.revokedAt) return null;
  if (credential.expiresAt < new Date()) return null;
  if (!verifyPassword(password, credential.passwordHash)) return null;

  const { event } = credential;
  // Uploads only while the event is being set up or running —
  // ending an event closes the door on new photos.
  if (event.deletedAt || event.status === "closed" || event.status === "archived") return null;

  return { credential, event };
}

/** Update the liveness timestamp — fire-and-forget, never blocks the camera. */
export function markCameraSeen(credentialId: string, uploaded = false) {
  prisma.ftpCredential
    .update({
      where: { id: credentialId },
      data: uploaded
        ? { lastUploadAt: new Date(), lastLoginAt: new Date() }
        : { lastLoginAt: new Date() },
    })
    .catch(() => {});
}
