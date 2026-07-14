/** GET /api/v1/participants/:id/gallery — the personal photo list.
 *  Derived exclusively from matches (docs/design/05 §2). */
import { NextResponse } from "next/server";
import { getGallery } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantId } = await params;
  const gallery = await getGallery(session.user.id, participantId);
  if (!gallery) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(gallery);
}
