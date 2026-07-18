/** PATCH /api/v1/photos/:id — photographer hides/unhides a photo. */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setPhotoPublished } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const input = z.object({ published: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = input.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { photoId } = await params;
  const photo = await setPhotoPublished(session.user.id, photoId, body.data.published);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ photo: { id: photo.id, published: photo.published } });
}
