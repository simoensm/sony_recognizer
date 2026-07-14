/** Shared BullMQ queue handles for the ingest service. */
import { Queue } from "bullmq";
import { loadEnv } from "@sr/config";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@sr/queue";

const env = loadEnv();
const redisUrl = new URL(env.REDIS_URL);

export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
};

export const photoQueue = new Queue(QUEUES.photoProcess, {
  connection: redisConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});
