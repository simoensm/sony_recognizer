/**
 * POST /api/v1/events/:id/ftp-credentials — generate camera login.
 * The response is the ONLY time the password exists in plaintext.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createFtpCredential } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const input = z.object({ label: z.string().trim().max(60).optional() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const body = input.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const credential = await createFtpCredential(session.user.id, eventId, body.data.label);
  if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ credential }, { status: 201 });
}
