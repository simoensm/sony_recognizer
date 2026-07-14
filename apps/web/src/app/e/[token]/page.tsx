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
    <main className="mx-auto flex flex-1 min-h-0 w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/above-logo.svg" alt="Above Belgium" className="h-14 w-auto" />
        <h1 className="mt-4 text-3xl font-bold tracking-wide uppercase">{resolved.eventName}</h1>
        {resolved.venue && <p className="mt-1 text-white/75">{resolved.venue}</p>}
      </div>
      <JoinFlow qrToken={token} eventId={resolved.eventId} />
    </main>
  );
}
