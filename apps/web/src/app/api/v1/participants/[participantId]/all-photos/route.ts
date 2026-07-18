/** GET /api/v1/participants/:id/all-photos — the full event gallery.
 *  Only exists when the photographer enabled browse-all for the event;
 *  otherwise indistinguishable from not-found (docs/design/06 §5). */
import { NextResponse } from "next/server";
import { getAllEventPhotos } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantId } = await params;
  const photos = await getAllEventPhotos(session.user.id, participantId);
  if (!photos) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ photos });
}
