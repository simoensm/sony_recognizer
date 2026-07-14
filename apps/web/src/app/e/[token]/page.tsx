/** QR landing page — what opens when an attendee scans the event QR.
 *  Public: no account needed to LOOK; consent needed to JOIN. */
import { notFound } from "next/navigation";
import { resolveQrToken } from "@sr/core";
import { JoinFlow } from "@/components/attendee/JoinFlow";

export const dynamic = "force-dynamic";

export default async function EventJoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await resolveQrToken(token);
  if (!resolved) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.4em] text-white/40 uppercase">
          Above · Photos
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-wide uppercase">{resolved.eventName}</h1>
        {resolved.venue && <p className="mt-1 text-white/50">{resolved.venue}</p>}
      </div>
      <JoinFlow qrToken={token} eventId={resolved.eventId} />
    </main>
  );
}
