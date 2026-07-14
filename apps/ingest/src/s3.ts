/**
 * Object storage client. MinIO in dev, any S3-compatible service in prod —
 * identical code path (docs/design/02 ADR-6).
 */
import { createReadStream } from "node:fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { loadEnv } from "@sr/config";

const env = loadEnv();

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  // MinIO requires path-style URLs (bucket in the path, not the hostname).
  forcePathStyle: true,
});

/** Stream a local file to object storage — never buffers the whole photo in RAM. */
export async function uploadFile(localPath: string, key: string, contentType: string) {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: createReadStream(localPath),
      ContentType: contentType,
    },
  });
  await upload.done();
}
