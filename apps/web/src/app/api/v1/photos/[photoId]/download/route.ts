/**
 * GET /api/v1/photos/:id/download — the ORIGINAL file, participants only.
 * Audit row is written before the URL exists; 60s single-use-ish TTL
 * (docs/design/06 §4).
 */
import { NextResponse, type NextRequest } from "next/server";
import { requestDownload } from "@sr/core";
import { getSession } from "@/lib/session";
import { signedGetUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = await params;
  const result = await requestDownload(session.user.id, photoId, {
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = result.s3Key.split(".").pop() ?? "jpg";
  const url = await signedGetUrl(result.s3Key, 60, {
    downloadName: `photo-${photoId.slice(0, 8)}.${ext}`,
  });
  return NextResponse.redirect(url, { status: 302 });
}
