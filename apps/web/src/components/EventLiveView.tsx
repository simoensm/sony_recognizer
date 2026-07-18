"use client";

/**
 * Live event ticker. Polls /stats every 2.5s — simple and robust for one
 * photographer watching one event. Upgraded to SSE push when scale demands.
 */
import { useEffect, useState } from "react";

type Stats = {
  event: { id: string; name: string; status: string };
  photos: { total: number; ingested: number; processing: number; processed: number; failed: number };
  participants: number;
  recognized: number;
  dataBytes: number;
  recentPhotos: { id: string; status: string; published: boolean; createdAt: string }[];
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function EventLiveView({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stale, setStale] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // photoId in the lightbox

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

  if (!stats) return <p className="text-white/55">Loading live view…</p>;

  const counters: { label: string; value: number | string }[] = [
    { label: "Photos", value: stats.photos.total },
    { label: "Processed", value: stats.photos.processed },
    { label: "In queue", value: stats.photos.ingested + stats.photos.processing },
    { label: "Failed", value: stats.photos.failed },
    { label: "Participants", value: stats.participants },
    { label: "Recognized", value: stats.recognized },
    { label: "Data used", value: formatBytes(stats.dataBytes) },
  ];

  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">Live</h2>
        <span
          className={`inline-block h-2 w-2 rounded-full ${stale ? "bg-red-500" : "animate-pulse bg-white"}`}
          title={stale ? "connection lost" : "updating"}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {counters.map((c) => (
          <div key={c.label} className="panel border border-white/10 p-5 text-center">
            <p className="text-2xl font-bold sm:text-3xl">{c.value}</p>
            <p className="mt-1 text-xs tracking-[0.15em] text-white/65 uppercase">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-4 gap-1 sm:grid-cols-8">
        {stats.recentPhotos.map((p) => (
          <button
            key={p.id}
            onClick={() => p.status === "processed" && setOpen(p.id)}
            className="relative aspect-square overflow-hidden rounded-lg bg-white/5"
          >
            {p.status === "processed" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/photos/${p.id}/thumb`}
                  alt=""
                  className={`h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-105 ${p.published ? "" : "opacity-40"}`}
                  loading="lazy"
                />
                {!p.published && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[8px] tracking-widest text-red-300 uppercase">
                    Hidden
                  </span>
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[9px] tracking-widest text-white/55 uppercase">
                {p.status}
              </div>
            )}
          </button>
        ))}
        {stats.recentPhotos.length === 0 && (
          <p className="col-span-full border border-dashed border-white/15 py-10 text-center text-sm text-white/55">
            Waiting for the first photo — point the camera and shoot.
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/v1/photos/${open}/preview`}
            alt=""
            className="max-h-[80vh] max-w-full rounded-lg"
          />
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/api/v1/photos/${open}/download`}
              className="rounded-xl border border-white bg-transparent px-6 py-2.5 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black"
            >
              Download original
            </a>
            {(() => {
              const current = stats.recentPhotos.find((p) => p.id === open);
              if (!current) return null;
              return (
                <button
                  onClick={async () => {
                    await fetch(`/api/v1/photos/${open}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ published: !current.published }),
                    });
                    setOpen(null);
                  }}
                  className="rounded-xl border border-white/30 px-6 py-2.5 tracking-wide text-white/80 uppercase transition-colors hover:border-white hover:text-white"
                >
                  {current.published ? "Hide" : "Unhide"}
                </button>
              );
            })()}
            <button
              onClick={() => setOpen(null)}
              className="rounded-xl border border-white/30 px-6 py-2.5 tracking-wide text-white/80 uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
