/**
 * GET /api/v1/photos/:id/preview — 302 to signed preview variant.
 * Allowed for: a participant matched IN the photo, or a photographer
 * managing the event. Anyone else: 404 (no existence oracle, 06 §5).
 */
import { NextResponse } from "next/server";
import { prisma } from "@sr/db";
import { canViewPhotoAsParticipant, getManagedPhoto } from "@sr/core";
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

  const allowed =
    (await canViewPhotoAsParticipant(session.user.id, photoId)) ||
    (await getManagedPhoto(session.user.id, photoId)) !== null;
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prefix = photo.s3Key.split("/originals/")[0];
  const url = await signedGetUrl(`${prefix}/variants/${photo.id}/preview.webp`);
  return NextResponse.redirect(url, { status: 302 });
}
