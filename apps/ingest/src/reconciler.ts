/**
 * Safety net (docs/design/02 §2.2): if Redis lost a job — crash, restart,
 * network blip — any photo stuck in `ingested` for over 5 minutes gets
 * re-enqueued. Postgres is the ground truth; Redis is disposable.
 * jobId = photoId makes re-enqueueing idempotent (BullMQ skips duplicates).
 */
import { prisma } from "@sr/db";
import { QUEUES, photoProcessJob } from "@sr/queue";
import { photoQueue } from "./queue";

const STUCK_AFTER_MS = 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

async function sweep() {
  const stuck = await prisma.photo.findMany({
    where: {
      status: "ingested",
      createdAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) },
      deletedAt: null,
    },
    take: 100,
  });

  for (const photo of stuck) {
    const payload = photoProcessJob.parse({
      photoId: photo.id,
      eventId: photo.eventId,
      s3Key: photo.s3Key,
      contentHash: photo.contentHash,
    });
    await photoQueue.add(QUEUES.photoProcess, payload, { jobId: photo.id });
  }

  if (stuck.length > 0) {
    console.log(`[reconciler] re-enqueued ${stuck.length} stuck photo(s)`);
  }
}

export function startReconciler() {
  const timer = setInterval(() => {
    sweep().catch((err) => console.error("[reconciler] sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  console.log("[reconciler] running (every 60s)");
  return timer;
}
