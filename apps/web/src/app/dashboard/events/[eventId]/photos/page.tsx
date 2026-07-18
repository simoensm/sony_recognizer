/** Full photo archive of an event (photographer view). */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getManagedEvent } from "@sr/core";
import { getSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { PhotoArchive } from "@/components/PhotoArchive";

export const dynamic = "force-dynamic";

export default async function EventPhotosPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { eventId } = await params;
  const event = await getManagedEvent(session.user.id, eventId);
  if (!event) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="text-xs tracking-[0.2em] text-white/65 uppercase hover:text-white"
        >
          ← {event.name}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-wide uppercase">All photos</h1>
        <PhotoArchive eventId={event.id} />
      </main>
    </>
  );
}
