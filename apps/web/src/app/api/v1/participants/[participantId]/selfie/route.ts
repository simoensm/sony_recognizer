/**
 * POST /api/v1/participants/:id/selfie — multipart upload.
 * Stores the selfie, marks enrollment `processing`, queues the priority
 * job. The worker validates (exactly one face) and reports back through
 * the enrollment status the client polls.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getOwnedParticipant, markEnrollmentProcessing } from "@sr/core";
import { QUEUES, selfieEnrollJob } from "@sr/queue";
import { getSession } from "@/lib/session";
import { putObject } from "@/lib/s3";
import { selfieQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { participantId } = await params;
  const participant = await getOwnedParticipant(session.user.id, participantId);
  if (!participant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("selfie");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "selfie file missing" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }
  // Phones report inconsistent MIME types (sometimes none at all).
  // Only reject clearly-wrong uploads; the worker's decoder is the real gate.
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: `unsupported type ${file.type}` }, { status: 415 });
  }

  const t = file.type;
  const ext = t === "image/png" ? "png" : t.includes("hei") ? "heic" : t === "image/webp" ? "webp" : "jpg";
  const contentType = t || "image/jpeg";
  const key = `orgs/${participant.event.orgId}/events/${participant.event.id}/selfies/${participant.id}/${Date.now()}.${ext}`;

  await putObject(key, Buffer.from(await file.arrayBuffer()), contentType);
  await markEnrollmentProcessing(participant.id);

  const payload = selfieEnrollJob.parse({
    participantId: participant.id,
    eventId: participant.event.id,
    s3Key: key,
  });
  await selfieQueue.add(QUEUES.selfieEnroll, payload);

  return NextResponse.json({ status: "processing" }, { status: 202 });
}
