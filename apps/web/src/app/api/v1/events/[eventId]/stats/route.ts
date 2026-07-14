/** GET /api/v1/events/:id/stats — live dashboard numbers (client polls this). */
import { NextResponse } from "next/server";
import { getEventStats } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const stats = await getEventStats(session.user.id, eventId);
  // Not found and not-yours look identical — no existence oracle (06 §5).
  if (!stats) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(stats);
}
