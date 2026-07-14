/**
 * The FTP server the camera uploads to.
 *
 * How it works: each camera login gets a private temp directory on disk.
 * The camera writes files there (possibly into DCIM-style subfolders —
 * Sony bodies create them). When a file transfer COMPLETES, ftp-srv fires
 * a STOR event and we hand the finished file to processUpload().
 *
 * Plain FTP is fine on a private dev network. Production runs FTPS (TLS)
 * with a real certificate — wired in when we deploy (docs/design/06 §4).
 */
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FtpSrv, FileSystem } from "ftp-srv";
import { authenticateCamera, markCameraSeen, type CameraSession } from "./auth";
import { processUpload } from "./process";

/**
 * Sony bodies CWD into folders that don't exist yet (date folders, or the
 * configured destination directory) and expect the server to cope.
 * This file system silently creates any directory the camera asks for.
 */
class CameraFileSystem extends FileSystem {
  override async chdir(path = "."): Promise<string> {
    const { fsPath } = (this as unknown as {
      _resolvePath(p: string): { clientPath: string; fsPath: string };
    })._resolvePath(path);
    await mkdir(fsPath, { recursive: true }).catch(() => {});
    return super.chdir(path);
  }
}

export type FtpOptions = {
  port: number;
  /** IP the camera should connect back to for data transfers (your LAN IP). */
  pasvHost: string;
  pasvMin: number;
  pasvMax: number;
};

export function startFtpServer(opts: FtpOptions) {
  const server = new FtpSrv({
    url: `ftp://0.0.0.0:${opts.port}`,
    pasv_url: opts.pasvHost,
    pasv_min: opts.pasvMin,
    pasv_max: opts.pasvMax,
    anonymous: false,
    greeting: ["sony-recognizer ingest"],
  });

  server.on("login", async ({ connection, username, password }, resolve, reject) => {
    try {
      const session: CameraSession | null = await authenticateCamera(username, password);
      if (!session) {
        console.warn(`[ftp] rejected login for "${username}"`);
        return reject(new Error("Invalid credentials"));
      }

      // Private scratch space for this connection's uploads.
      const root = await mkdtemp(join(tmpdir(), "sr-ingest-"));
      console.log(`[ftp] camera connected: ${username} → event ${session.event.name}`);
      markCameraSeen(session.credential.id);

      // Fires when a file upload FINISHES (not while bytes still stream in).
      connection.on("STOR", (error: Error | null, filePath: string) => {
        if (error) {
          console.error(`[ftp] upload failed: ${error.message}`);
          return;
        }
        // Fire-and-forget: never make the camera wait on S3/DB/queue work.
        processUpload(session, filePath).catch((err) =>
          console.error(`[ingest] processing failed for ${filePath}:`, err),
        );
      });

      return resolve({
        fs: new CameraFileSystem(connection, { root, cwd: "/" }),
      });
    } catch (err) {
      console.error("[ftp] login handler error:", err);
      return reject(new Error("Internal error"));
    }
  });

  return server.listen().then(() => {
    console.log(`[ftp] listening on port ${opts.port} (passive ${opts.pasvMin}-${opts.pasvMax} via ${opts.pasvHost})`);
    return server;
  });
}
