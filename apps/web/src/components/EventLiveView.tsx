"use client";

/**
 * Live event ticker. Polls /stats every 2.5s — simple and robust for one
 * photographer watching one event. Upgraded to SSE push when scale demands.
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

  if (!stats) return <p className="text-white/30">Loading live view…</p>;

  const counters = [
    { label: "Photos", value: stats.photos.total },
    { label: "Processed", value: stats.photos.processed },
    { label: "In queue", value: stats.photos.ingested + stats.photos.processing },
    { label: "Failed", value: stats.photos.failed },
    { label: "Faces found", value: stats.faces },
  ];

  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-[0.2em] text-white/50 uppercase">Live</h2>
        <span
          className={`inline-block h-2 w-2 rounded-full ${stale ? "bg-red-500" : "animate-pulse bg-white"}`}
          title={stale ? "connection lost" : "updating"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-5">
        {counters.map((c) => (
          <div key={c.label} className="panel p-5 text-center">
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="mt-1 text-xs tracking-[0.15em] text-white/40 uppercase">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-1 sm:grid-cols-8">
        {stats.recentPhotos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden bg-white/5">
            {p.status === "processed" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/v1/photos/${p.id}/thumb`}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[9px] tracking-widest text-white/30 uppercase">
                {p.status}
              </div>
            )}
          </div>
        ))}
        {stats.recentPhotos.length === 0 && (
          <p className="col-span-full border border-dashed border-white/15 py-10 text-center text-sm text-white/30">
            Waiting for the first photo — point the camera and shoot.
          </p>
        )}
      </div>
    </section>
  );
}
