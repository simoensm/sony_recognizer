/** Photographer dashboard: event grid + creation. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { listEventsForUser } from "@sr/core";
import { getSession } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { CreateEventForm } from "@/components/CreateEventForm";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  live: "bg-white text-black",
  draft: "border border-white/30 text-white/75",
  closed: "border border-white/20 text-white/55",
  archived: "border border-white/10 text-white/40",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const events = await listEventsForUser(session.user.id);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-wide uppercase">Your events</h1>
            <p className="mt-1 text-sm text-white/65">
              {events.length === 0
                ? "Create your first event to start shooting."
                : `${events.length} event${events.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <section className="panel-light mt-8 p-6 shadow-lg">
          <h2 className="text-sm font-semibold tracking-[0.2em] text-black/50 uppercase">
            New event
          </h2>
          <div className="mt-4">
            <CreateEventForm variant="light" />
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/events/${e.id}`}
              className="panel group flex flex-col gap-4 border border-white/10 p-6 transition-colors hover:border-white/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{e.name}</p>
                  <p className="truncate text-sm text-white/55">
                    {e.venue || " "}
                  </p>
                </div>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.15em] uppercase ${STATUS_BADGE[e.status] ?? STATUS_BADGE.draft}`}
                >
                  {e.status === "live" && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />
                  )}
                  {e.status}
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-bold">{e._count.photos}</p>
                    <p className="text-[10px] tracking-[0.15em] text-white/55 uppercase">
                      Photos
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{e._count.participants}</p>
                    <p className="text-[10px] tracking-[0.15em] text-white/55 uppercase">
                      Participants
                    </p>
                  </div>
                </div>
                <span className="text-white/40 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>

              <p className="text-xs text-white/40">
                Created{" "}
                {new Date(e.createdAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
          {events.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-white/15 px-5 py-14 text-center text-white/55">
              No events yet — create your first one above.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
