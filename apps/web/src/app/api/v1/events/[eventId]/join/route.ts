/**
 * POST /api/v1/events/:id/join — join an event via QR token + consent.
 * Works with anonymous sessions (docs/design/01 §2.1): the attendee never
 * saw a signup form, but they DID see and accept the consent notice.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { joinEvent, ConsentRequiredError } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const input = z.object({
  qrToken: z.string().min(8),
  consent: z.boolean(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = input.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const participant = await joinEvent(session.user.id, body.data);
    if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { participant: { id: participant.id, enrollmentStatus: participant.enrollmentStatus } },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      return NextResponse.json({ error: "consent_required" }, { status: 400 });
    }
    throw err;
  }
}
