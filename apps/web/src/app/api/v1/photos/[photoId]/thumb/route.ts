/**
 * GET /api/v1/photos/:id/thumb — 302 to a short-lived signed URL for the
 * thumbnail variant. The bucket is private; EVERY image read goes through
 * an authorization check + signed URL (docs/design/06 §4).
 */
import { NextResponse } from "next/server";
import { getManagedPhoto } from "@sr/core";
import { getSession } from "@/lib/session";
import { signedGetUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = await params;
  const photo = await getManagedPhoto(session.user.id, photoId);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prefix = photo.s3Key.split("/originals/")[0];
  const url = await signedGetUrl(`${prefix}/variants/${photo.id}/thumb.webp`);
  return NextResponse.redirect(url, { status: 302 });
}
