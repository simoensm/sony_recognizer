/**
 * Ingest service entrypoint — the "deposit box" between camera and platform
 * (docs/design/02 §2.2): accept upload → store → record → enqueue. Nothing else.
 */
import { loadEnv } from "@sr/config";
import { startFtpServer } from "./ftp";
import { startReconciler } from "./reconciler";
import { photoQueue } from "./queue";

const env = loadEnv();

async function main() {
  await startFtpServer({
    port: env.FTP_PORT,
    pasvHost: env.FTP_PASV_HOST,
    pasvMin: env.FTP_PASV_MIN,
    pasvMax: env.FTP_PASV_MAX,
  });
  startReconciler();
  console.log("[ingest] ready — point the camera at this machine and shoot");
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.log("\n[ingest] shutting down…");
    await photoQueue.close().catch(() => {});
    process.exit(0);
  });
}
