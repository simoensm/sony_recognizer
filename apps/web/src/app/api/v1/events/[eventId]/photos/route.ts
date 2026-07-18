/**
 * POST /api/v1/events/:id/photos — manual browser upload (one file per
 * request; the client sends files sequentially). Same pipeline as camera
 * uploads: hash → dedupe → store → record → queue AI job.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { v7 as uuidv7 } from "uuid";
import exifr from "exifr";
import { prisma, Prisma } from "@sr/db";
import { getManagedEvent } from "@sr/core";
import { QUEUES, photoProcessJob } from "@sr/queue";
import { getSession } from "@/lib/session";
import { putObject } from "@/lib/s3";
import { photoQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

const MAX_BYTES = 60 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getManagedEvent(session.user.id, eventId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "photo missing" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 413 });
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not an image" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  // Same dedupe as the FTP path — re-uploading a batch twice is harmless.
  const existing = await prisma.photo.findUnique({
    where: { eventId_contentHash: { eventId, contentHash } },
  });
  if (existing) return NextResponse.json({ duplicate: true });

  let capturedAt: Date | null = null;
  let exif: Record<string, unknown> = {};
  try {
    const parsed = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "Model", "LensModel", "ISO", "FNumber", "ExposureTime"],
    });
    if (parsed?.DateTimeOriginal instanceof Date) capturedAt = parsed.DateTimeOriginal;
    exif = parsed ?? {};
  } catch {
    /* EXIF is never fatal */
  }

  const ext = file.type === "image/png" ? "png" : file.type.includes("hei") ? "heic" : "jpg";
  const photoId = uuidv7();
  const s3Key = `orgs/${event.orgId}/events/${event.id}/originals/${photoId}.${ext}`;

  await putObject(s3Key, buffer, file.type || "image/jpeg");
  await prisma.photo.create({
    data: {
      id: photoId,
      eventId: event.id,
      contentHash,
      s3Key,
      sizeBytes: buffer.length,
      capturedAt,
      exif: exif as Prisma.InputJsonValue,
      status: "ingested",
      published: true,
      publishedAt: new Date(),
    },
  });
  await photoQueue.add(
    QUEUES.photoProcess,
    photoProcessJob.parse({ photoId, eventId: event.id, s3Key, contentHash }),
    { jobId: photoId },
  );

  return NextResponse.json({ photoId }, { status: 201 });
}
