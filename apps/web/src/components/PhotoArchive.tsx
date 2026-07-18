"use client";

/** Full photo archive for the photographer: paginated grid + lightbox
 *  with download / hide / unhide. */
import { useEffect, useState } from "react";

type ArchivePhoto = {
  id: string;
  status: string;
  published: boolean;
  capturedAt: string;
  faces: number;
};

export function PhotoArchive({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<ArchivePhoto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<ArchivePhoto | null>(null);

  async function loadPage(c?: string | null) {
    setLoading(true);
    const url = `/api/v1/events/${eventId}/photos${c ? `?cursor=${c}` : ""}`;
    const res = await fetch(url, { cache: "no-store" }).catch(() => null);
    if (res?.ok) {
      const body = await res.json();
      setPhotos((prev) => (c ? [...prev, ...body.photos] : body.photos));
      setCursor(body.nextCursor);
    }
    setLoading(false);
    setHasLoaded(true);
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function togglePublished(photo: ArchivePhoto) {
    await fetch(`/api/v1/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !photo.published }),
    });
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, published: !photo.published } : p)),
    );
    setOpen(null);
  }

  return (
    <>
      <p className="mt-2 text-sm text-white/65">
        {photos.length} photo{photos.length === 1 ? "" : "s"} loaded
        {cursor ? " — more below" : hasLoaded ? " — that's everything" : ""}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => p.status === "processed" && setOpen(p)}
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
      </div>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            onClick={() => loadPage(cursor)}
            disabled={loading}
            className="rounded-xl border border-white/30 px-6 py-2.5 text-sm font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white disabled:opacity-40"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/v1/photos/${open.id}/preview`}
            alt=""
            className="max-h-[78vh] max-w-full rounded-lg"
          />
          <p className="text-xs text-white/55">
            {new Date(open.capturedAt).toLocaleString()} · {open.faces} face
            {open.faces === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/api/v1/photos/${open.id}/download`}
              className="rounded-xl border border-white bg-transparent px-6 py-2.5 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black"
            >
              Download original
            </a>
            <button
              onClick={() => togglePublished(open)}
              className="rounded-xl border border-white/30 px-6 py-2.5 tracking-wide text-white/80 uppercase transition-colors hover:border-white hover:text-white"
            >
              {open.published ? "Hide" : "Unhide"}
            </button>
            <button
              onClick={() => setOpen(null)}
              className="rounded-xl border border-white/30 px-6 py-2.5 tracking-wide text-white/80 uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
