"use client";

/**
 * Live event ticker. Polls /stats every 2.5s — simple and robust for one
 * photographer watching one event. Upgraded to SSE push in M2 alongside
 * the attendee gallery (where push actually matters at scale).
 */
import { useEffect, useState } from "react";

type Stats = {
  event: { id: string; name: string; status: string };
  photos: { total: number; ingested: number; processing: number; processed: number; failed: number };
  faces: number;
  recentPhotos: { id: string; status: string; createdAt: string }[];
};

export function EventLiveView({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/v1/events/${eventId}/stats`, { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          setStats(await res.json());
          setStale(false);
        } else {
          setStale(true);
        }
      } catch {
        if (alive) setStale(true);
      }
    }
    tick();
    const timer = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [eventId]);

  if (!stats) return <p className="text-zinc-500">Loading live view…</p>;

  const counters = [
    { label: "Photos", value: stats.photos.total },
    { label: "Processed", value: stats.photos.processed },
    { label: "In queue", value: stats.photos.ingested + stats.photos.processing },
    { label: "Failed", value: stats.photos.failed },
    { label: "Faces found", value: stats.faces },
  ];

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Live</h2>
        <span
          className={`inline-block h-2 w-2 rounded-full ${stale ? "bg-red-500" : "animate-pulse bg-emerald-500"}`}
          title={stale ? "connection lost" : "updating"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counters.map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-800 p-4 text-center">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {stats.recentPhotos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
          >
            {p.status === "processed" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/v1/photos/${p.id}/thumb`}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-wide text-zinc-500">
                {p.status}
              </div>
            )}
          </div>
        ))}
        {stats.recentPhotos.length === 0 && (
          <p className="col-span-full py-8 text-center text-zinc-500">
            Waiting for the first photo — point the camera and shoot.
          </p>
        )}
      </div>
    </section>
  );
}
