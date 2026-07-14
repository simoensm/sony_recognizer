/**
 * Ingest service — the "deposit box" between the camera and the platform
 * (docs/design/02 §2.2). Deliberately dumb: accept file → store → enqueue.
 *
 * M0: skeleton that proves queue connectivity.
 * M1 adds, in this order:
 *   1. FTPS server the Sony A7III uploads to (per-event credentials)
 *   2. Upload-completion detection (size-stable check — cameras stream slowly)
 *   3. SHA-256 content hashing + duplicate rejection
 *   4. Streaming upload to S3 (never buffer whole files in memory)
 *   5. photos row INSERT (status: ingested) + photo.process job
 *   6. Reconciler cron: re-enqueue photos stuck in `ingested` (Redis died?)
 */
import { Queue } from "bullmq";
import { loadEnv } from "@sr/config";
import { QUEUES, DEFAULT_JOB_OPTIONS, photoProcessJob } from "@sr/queue";

const env = loadEnv();

// BullMQ takes host/port (ioredis options), not a URL string.
const redisUrl = new URL(env.REDIS_URL);

const photoQueue = new Queue(QUEUES.photoProcess, {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    password: redisUrl.password || undefined,
  },
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

async function main() {
  // Prove the queue contract works end to end (worker logs this job).
  // Removed in M1 when real ingestion replaces it.
  const demo = photoProcessJob.safeParse({
    photoId: "00000000-0000-7000-8000-000000000000",
    eventId: "00000000-0000-7000-8000-000000000001",
    s3Key: "dev/demo.jpg",
    contentHash: "e".repeat(64),
  });
  if (!demo.success) throw new Error("queue contract self-test failed");

  console.log("[ingest] skeleton up — FTPS server lands in M1");
  console.log(`[ingest] queue "${QUEUES.photoProcess}" connected via ${env.REDIS_URL}`);
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});

// Graceful shutdown: finish in-flight work, close connections.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await photoQueue.close();
    process.exit(0);
  });
}
