/** POST /api/v1/ftp-credentials/:id/revoke — kill a camera login instantly. */
import { NextResponse } from "next/server";
import { revokeFtpCredential } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { credentialId } = await params;
  const result = await revokeFtpCredential(session.user.id, credentialId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
