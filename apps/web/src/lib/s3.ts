/** Shared S3 client + helpers for the web app. Bucket is private:
 *  reads are 5-minute signed URLs, writes are server-side only. */
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadEnv } from "@sr/config";

const env = loadEnv();

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  forcePathStyle: true,
});

export async function signedGetUrl(
  key: string,
  expiresIn = 300,
  opts?: { downloadName?: string },
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      // Makes the browser SAVE the file instead of showing it.
      ...(opts?.downloadName
        ? { ResponseContentDisposition: `attachment; filename="${opts.downloadName}"` }
        : {}),
    }),
    { expiresIn },
  );
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
}
