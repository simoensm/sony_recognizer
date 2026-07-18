/** POST /api/v1/photos/:id/report — "remove me from this photo".
 *  Only people actually matched in the photo can use it; the photo is
 *  hidden from everyone immediately and flagged for the photographer. */
import { NextResponse } from "next/server";
import { reportAndHidePhoto } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = await params;
  const result = await reportAndHidePhoto(session.user.id, photoId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(result);
}
