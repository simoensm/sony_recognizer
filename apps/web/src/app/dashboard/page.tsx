/** Photographer dashboard: event list + creation. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { listEventsForUser } from "@sr/core";
import { getSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { CreateEventForm } from "@/components/CreateEventForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const events = await listEventsForUser(session.user.id);

  return (
    <>
      <AppHeader userName={session.user.name} />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-wide uppercase">Your events</h1>

        <div className="mt-8">
          <CreateEventForm />
        </div>

        <ul className="mt-8 flex flex-col gap-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link
                href={`/dashboard/events/${e.id}`}
                className="flex items-center justify-between border border-white/10 px-5 py-4 transition-colors hover:border-white/50"
              >
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-white/40">
                    {e._count.photos} photos · {e._count.participants} participants
                  </p>
                </div>
                <span className="text-xs tracking-[0.2em] text-white/50 uppercase">
                  {e.status}
                </span>
              </Link>
            </li>
          ))}
          {events.length === 0 && (
            <li className="border border-dashed border-white/15 px-5 py-10 text-center text-white/30">
              No events yet — create your first one above.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
