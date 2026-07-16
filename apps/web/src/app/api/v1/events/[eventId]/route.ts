/**
 * PATCH  /api/v1/events/:id — change status (end / reopen)
 * DELETE /api/v1/events/:id — soft-delete the event
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setEventStatus, deleteEvent } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const patchInput = z.object({ status: z.enum(["live", "closed"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = patchInput.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { eventId } = await params;
  const event = await setEventStatus(session.user.id, eventId, body.data.status);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event: { id: event.id, status: event.status } });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const result = await deleteEvent(session.user.id, eventId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
