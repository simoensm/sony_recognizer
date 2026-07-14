/** GET /api/v1/participants/:id/enrollment — poll while the worker runs. */
import { NextResponse } from "next/server";
import { getEnrollment } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantId } = await params;
  const enrollment = await getEnrollment(session.user.id, participantId);
  if (!enrollment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(enrollment);
}
