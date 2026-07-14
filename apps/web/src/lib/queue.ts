/** BullMQ producer handles for the web app. */
import { Queue } from "bullmq";
import { loadEnv } from "@sr/config";
import { QUEUES, DEFAULT_JOB_OPTIONS } from "@sr/queue";

const env = loadEnv();
const redisUrl = new URL(env.REDIS_URL);

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  password: redisUrl.password || undefined,
};

const globalForQueues = globalThis as unknown as { selfieQueue?: Queue };

/** selfie.enroll — its own queue so a waiting human never sits behind photos. */
export const selfieQueue =
  globalForQueues.selfieQueue ??
  new Queue(QUEUES.selfieEnroll, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });

if (process.env.NODE_ENV !== "production") globalForQueues.selfieQueue = selfieQueue;
