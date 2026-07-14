/**
 * GET  /api/v1/events  — list events the signed-in user can manage
 * POST /api/v1/events  — create an event (personal org auto-created)
 * Thin adapters: parse → authorize → call core → serialize (docs/design/05).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createEvent, listEventsForUser } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const createEventInput = z.object({
  name: z.string().trim().min(2).max(120),
  venue: z.string().trim().max(200).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await listEventsForUser(session.user.id);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = createEventInput.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input", issues: body.error.issues }, { status: 400 });
  }

  const event = await createEvent(session.user.id, body.data);
  return NextResponse.json({ event }, { status: 201 });
}
