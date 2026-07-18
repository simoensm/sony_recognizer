/** POST /api/v1/ftp-credentials/:id/regenerate — fresh camera password,
 *  returned once. The previous password stops working immediately. */
import { NextResponse } from "next/server";
import { regenerateFtpPassword } from "@sr/core";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { credentialId } = await params;
  const credential = await regenerateFtpPassword(session.user.id, credentialId);
  if (!credential) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ credential });
}
