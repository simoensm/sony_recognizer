"use client";

/**
 * The living gallery: polls every 5s because the photographer is still
 * shooting — new matches appear while the attendee watches.
 */
import { useEffect, useState } from "react";

type GalleryPhoto = { id: string; capturedAt: string; score: number };

export function GalleryView({
  participantId,
  initialCount,
}: {
  participantId: string;
  initialCount: number;
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const res = await fetch(`/api/v1/participants/${participantId}/gallery`, {
        cache: "no-store",
      }).catch(() => null);
      if (alive && res?.ok) setPhotos((await res.json()).photos);
    }
    tick();
    const timer = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [participantId]);

  const list = photos ?? [];

  return (
    <>
      <p className="mt-2 text-sm text-zinc-400">
        {list.length === 0
          ? "No photos yet — they appear here automatically as the photographer shoots."
          : `${list.length} photo${list.length === 1 ? "" : "s"} — updates automatically.`}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/v1/photos/${p.id}/preview`}
              alt=""
              className="h-full w-full object-cover transition-transform hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
        {photos === null &&
          Array.from({ length: Math.max(initialCount, 3) }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-zinc-900" />
          ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/v1/photos/${open.id}/preview`}
            alt=""
            className="max-h-[80vh] max-w-full rounded-lg"
          />
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/api/v1/photos/${open.id}/download`}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 font-medium hover:bg-emerald-500"
            >
              Download
            </a>
            <button
              onClick={() => setOpen(null)}
              className="rounded-xl border border-zinc-700 px-5 py-2.5 text-zinc-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
