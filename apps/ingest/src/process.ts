/**
 * What happens after a photo finishes uploading (docs/design/02 §4):
 *   hash → dedupe → stream to S3 → INSERT photos row → enqueue job → cleanup
 *
 * Ordering matters: the photo is safe in S3 + Postgres BEFORE we touch
 * Redis. If Redis is down the job is lost but the photo is not — the
 * reconciler re-enqueues it later. Photos are never lost.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { extname, basename } from "node:path";
import { v7 as uuidv7 } from "uuid";
import exifr from "exifr";
import { prisma, Prisma } from "@sr/db";
import { QUEUES, photoProcessJob } from "@sr/queue";
import { photoQueue } from "./queue";
import { uploadFile } from "./s3";
import { markCameraSeen, type CameraSession } from "./auth";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic"]);

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

export async function processUpload(session: CameraSession, localPath: string) {
  const name = basename(localPath);
  const ext = extname(name).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    console.warn(`[ingest] skipping non-photo upload: ${name}`);
    await unlink(localPath).catch(() => {});
    return;
  }

  const contentHash = await sha256File(localPath);
  const sizeBytes = (await stat(localPath)).size;
  const { event } = session;

  // Camera EXIF: capture time is what galleries sort by. Never fatal.
  let capturedAt: Date | null = null;
  let exif: Record<string, unknown> = {};
  try {
    const parsed = await exifr.parse(localPath, {
      pick: ["DateTimeOriginal", "Model", "LensModel", "ISO", "FNumber", "ExposureTime"],
    });
    if (parsed?.DateTimeOriginal instanceof Date) capturedAt = parsed.DateTimeOriginal;
    exif = parsed ?? {};
  } catch {
    console.warn(`[ingest] EXIF parse failed for ${name} (continuing)`);
  }

  const photoId = uuidv7();
  const s3Key = `${session.credential.s3Prefix}/originals/${photoId}${ext}`;
  const contentType = ext === ".png" ? "image/png" : ext === ".heic" ? "image/heic" : "image/jpeg";

  // 1. Object storage first — the photo's real home.
  await uploadFile(localPath, s3Key, contentType);

  // 2. Database row. The unique (event_id, content_hash) constraint is our
  //    dedupe: cameras re-send files after connection drops.
  try {
    await prisma.photo.create({
      data: {
        id: photoId,
        eventId: event.id,
        contentHash,
        s3Key,
        sizeBytes,
        capturedAt,
        exif: exif as Prisma.InputJsonValue,
        status: "ingested",
        ftpCredentialId: session.credential.id,
        // Auto-publish default (docs/design/01 §2.4); per-event review mode later.
        published: true,
        publishedAt: new Date(),
      },
    });
    markCameraSeen(session.credential.id, true);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      console.log(`[ingest] duplicate (camera retry?) — skipped: ${name}`);
      await unlink(localPath).catch(() => {});
      return;
    }
    throw err;
  }

  // 3. Queue the AI job. jobId = photoId → BullMQ ignores duplicates.
  const payload = photoProcessJob.parse({
    photoId,
    eventId: event.id,
    s3Key,
    contentHash,
  });
  await photoQueue.add(QUEUES.photoProcess, payload, { jobId: photoId });

  await unlink(localPath).catch(() => {});
  console.log(`[ingest] ✓ ${name} → photo ${photoId} (event ${event.slug ?? event.id})`);
}
