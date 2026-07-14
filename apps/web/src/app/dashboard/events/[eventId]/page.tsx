/** Single-event live view: counters, camera credentials, incoming photos. */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getManagedEvent, ensureEventQr } from "@sr/core";
import { loadEnv } from "@sr/config";
import { getSession } from "@/lib/session";
import { EventLiveView } from "@/components/EventLiveView";
import { FtpCredentialPanel } from "@/components/FtpCredentialPanel";
import { QrPanel } from "@/components/QrPanel";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { eventId } = await params;
  const event = await getManagedEvent(session.user.id, eventId);
  if (!event) notFound();

  const qr = await ensureEventQr(event.id);
  const env = loadEnv();
  const base = env.NEXT_PUBLIC_APP_URL ?? env.BETTER_AUTH_URL;
  const joinUrl = `${base}/e/${qr.token}`;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← All events
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{event.name}</h1>
      {event.venue && <p className="text-zinc-400">{event.venue}</p>}

      <div className="mt-8 flex flex-col gap-8">
        <QrPanel joinUrl={joinUrl} />
        <FtpCredentialPanel eventId={event.id} />
        <EventLiveView eventId={event.id} />
      </div>
    </main>
  );
}
