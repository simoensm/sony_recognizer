/**
 * POST /api/v1/events/:id/reprocess — re-run the AI pipeline over every
 * photo of the event. Regenerates variants (thumb/preview/watermarked)
 * and re-detects faces. Idempotent by design (docs/design/03 §5).
 */
import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { listReprocessablePhotos } from "@sr/core";
import { loadEnv } from "@sr/config";
import { QUEUES, DEFAULT_JOB_OPTIONS, photoProcessJob } from "@sr/queue";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const env = loadEnv();
const redisUrl = new URL(env.REDIS_URL);
const globalForQueue = globalThis as unknown as { photoQueue?: Queue };
const photoQueue =
  globalForQueue.photoQueue ??
  new Queue(QUEUES.photoProcess, {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      password: redisUrl.password || undefined,
    },
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
if (process.env.NODE_ENV !== "production") globalForQueue.photoQueue = photoQueue;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const photos = await listReprocessablePhotos(session.user.id, eventId);
  if (!photos) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stamp = Date.now();
  await photoQueue.addBulk(
    photos.map((p) => ({
      name: QUEUES.photoProcess,
      data: photoProcessJob.parse({
        photoId: p.id,
        eventId: p.eventId,
        s3Key: p.s3Key,
        contentHash: p.contentHash,
      }),
      // unique jobId per run so BullMQ doesn't skip photos it processed before
      opts: { jobId: `${p.id}:r${stamp}` },
    })),
  );

  return NextResponse.json({ queued: photos.length });
}
