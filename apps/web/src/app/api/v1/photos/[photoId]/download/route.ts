/**
 * GET /api/v1/photos/:id/download — the ORIGINAL file.
 * Allowed for: a participant matched IN the photo (download is audit-logged,
 * docs/design/06 §4), or a photographer managing the event (their own
 * content — no participant audit row applies).
 */
import { NextResponse, type NextRequest } from "next/server";
import { requestDownload, getManagedPhoto } from "@sr/core";
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

  // Attendee path: authorization via match + audit row.
  let s3Key: string | null = null;
  const asParticipant = await requestDownload(session.user.id, photoId, {
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  if (asParticipant) {
    s3Key = asParticipant.s3Key;
  } else {
    // Photographer path: event managers download their own material.
    const photo = await getManagedPhoto(session.user.id, photoId);
    if (photo) s3Key = photo.s3Key;
  }

  if (!s3Key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = s3Key.split(".").pop() ?? "jpg";
  const url = await signedGetUrl(s3Key, 60, {
    downloadName: `photo-${photoId.slice(0, 8)}.${ext}`,
  });
  return NextResponse.redirect(url, { status: 302 });
}
