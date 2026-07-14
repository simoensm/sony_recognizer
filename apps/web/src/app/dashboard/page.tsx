/** Photographer dashboard: event list + creation. Server component —
 *  data comes straight from core services, no HTTP round-trip. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { listEventsForUser } from "@sr/core";
import { getSession } from "@/lib/session";
import { CreateEventForm } from "@/components/CreateEventForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const events = await listEventsForUser(session.user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your events</h1>
        <span className="text-sm text-zinc-400">{session.user.name}</span>
      </div>

      <CreateEventForm />

      <ul className="mt-8 flex flex-col gap-3">
        {events.map((e) => (
          <li key={e.id}>
            <Link
              href={`/dashboard/events/${e.id}`}
              className="flex items-center justify-between rounded-xl border border-zinc-800 px-5 py-4 hover:border-zinc-600"
            >
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-zinc-400">
                  {e._count.photos} photos · {e._count.participants} participants
                </p>
              </div>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-wide text-zinc-300">
                {e.status}
              </span>
            </Link>
          </li>
        ))}
        {events.length === 0 && (
          <li className="rounded-xl border border-dashed border-zinc-800 px-5 py-8 text-center text-zinc-500">
            No events yet — create your first one above.
          </li>
        )}
      </ul>
    </main>
  );
}
