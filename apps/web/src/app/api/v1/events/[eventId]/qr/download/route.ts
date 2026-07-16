/** GET /api/v1/events/:id/qr/download — print-quality QR PNG (2048px). */
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getManagedEvent, ensureEventQr } from "@sr/core";
import { loadEnv } from "@sr/config";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const event = await getManagedEvent(session.user.id, eventId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const qr = await ensureEventQr(event.id);
  const env = loadEnv();
  const base = env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL;
  const joinUrl = `${base}/e/${qr.token}`;

  // 2048px with a quiet-zone margin — crisp on an A3 poster.
  const png = await QRCode.toBuffer(joinUrl, {
    type: "png",
    width: 2048,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${event.slug}-qr.png"`,
      "Cache-Control": "no-store",
    },
  });
}
