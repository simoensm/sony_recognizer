/**
 * Environment validation.
 *
 * Every service calls loadEnv() once at startup. If a variable is missing
 * or malformed the process exits immediately with a readable message —
 * instead of failing mysteriously an hour later during an event.
 */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(16, "generate with: openssl rand -base64 32"),
  BETTER_AUTH_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Parse and cache process.env. Lazy so importing this module is side-effect free. */
export function loadEnv(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      throw new Error(`Invalid environment configuration:\n${issues}`);
    }
    cached = result.data;
  }
  return cached;
}
