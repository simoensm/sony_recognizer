/** GET /api/v1/events/:id/log — activity feed for the event page. */
import { NextResponse } from "next/server";
import { getEventLog } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const entries = await getEventLog(session.user.id, eventId);
  if (!entries) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ entries });
}
