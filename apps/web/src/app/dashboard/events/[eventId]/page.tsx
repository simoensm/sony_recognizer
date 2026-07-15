/** Single-event live view: cameras, QR, counters, incoming photos. */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getManagedEvent, ensureEventQr } from "@sr/core";
import { loadEnv } from "@sr/config";
import { getSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { EventLiveView } from "@/components/EventLiveView";
import { CameraPanel } from "@/components/CameraPanel";
import { QrPanel } from "@/components/QrPanel";
import { EventLogPanel } from "@/components/EventLogPanel";

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
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/dashboard" className="text-xs tracking-[0.2em] text-white/65 uppercase hover:text-white">
          ← Events
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-wide uppercase">{event.name}</h1>
        {event.venue && <p className="mt-1 text-white/75">{event.venue}</p>}

        <div className="mt-10 flex flex-col gap-8">
          <EventLiveView eventId={event.id} />
          <div className="grid gap-8 lg:grid-cols-2">
            <CameraPanel eventId={event.id} />
            <QrPanel joinUrl={joinUrl} />
          </div>
          <EventLogPanel eventId={event.id} />
        </div>
      </main>
    </>
  );
}
