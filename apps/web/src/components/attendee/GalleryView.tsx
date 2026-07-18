"use client";

/**
 * The living gallery: polls every 5s because the photographer is still
 * shooting — new matches appear while the attendee watches.
 */
import { useEffect, useRef, useState } from "react";
import { FollowLinks } from "./FollowLinks";

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
  const [retaking, setRetaking] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);
  const retakeRef = useRef<HTMLInputElement>(null);
  const [browseAllEnabled, setBrowseAllEnabled] = useState(false);
  const [allPhotos, setAllPhotos] = useState<GalleryPhoto[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function toggleBrowseAll() {
    if (showAll) {
      setShowAll(false);
      return;
    }
    if (allPhotos === null) {
      const res = await fetch(`/api/v1/participants/${participantId}/all-photos`, {
        cache: "no-store",
      }).catch(() => null);
      if (res?.ok) setAllPhotos((await res.json()).photos);
    }
    setShowAll(true);
  }

  async function retake(file: File) {
    setRetaking(true);
    setRetakeError(null);
    const form = new FormData();
    form.append("selfie", file);
    const res = await fetch(`/api/v1/participants/${participantId}/selfie`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      setRetakeError("Upload failed — please try again.");
      setRetaking(false);
      return;
    }
    // Wait for the worker to re-match, then refresh the grid.
    const timer = setInterval(async () => {
      const r = await fetch(`/api/v1/participants/${participantId}/enrollment`, {
        cache: "no-store",
      }).catch(() => null);
      if (!r?.ok) return;
      const e = await r.json();
      if (e.status === "ready") {
        clearInterval(timer);
        setRetaking(false);
        const g = await fetch(`/api/v1/participants/${participantId}/gallery`, {
          cache: "no-store",
        }).catch(() => null);
        if (g?.ok) setPhotos((await g.json()).photos);
      } else if (e.status === "failed") {
        clearInterval(timer);
        setRetaking(false);
        setRetakeError("That selfie didn't work (one clear face needed) — try again.");
      }
    }, 1500);
  }

  useEffect(() => {
    let alive = true;
    async function tick() {
      const res = await fetch(`/api/v1/participants/${participantId}/gallery`, {
        cache: "no-store",
      }).catch(() => null);
      if (alive && res?.ok) {
        const body = await res.json();
        setPhotos(body.photos);
        setBrowseAllEnabled(Boolean(body.browseAllEnabled));
      }
    }
    tick();
    const timer = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [participantId]);

  const list = (showAll ? allPhotos : photos) ?? [];

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/75">
          {retaking
            ? "Matching your new selfie…"
            : showAll
              ? `All event photos (${list.length})`
              : list.length === 0
                ? "No photos yet — they appear here automatically as the photographer shoots."
                : `${list.length} photo${list.length === 1 ? "" : "s"} — updates automatically.`}
        </p>
        <input
          ref={retakeRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) retake(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          {browseAllEnabled && (
            <button
              onClick={toggleBrowseAll}
              className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white"
            >
              {showAll ? "My photos" : "Browse all"}
            </button>
          )}
          <button
            onClick={() => retakeRef.current?.click()}
            disabled={retaking}
            className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white disabled:opacity-40"
          >
            {retaking ? "Matching…" : "Retake selfie"}
          </button>
        </div>
      </div>
      {retakeError && <p className="mt-2 text-sm text-amber-400">{retakeError}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="aspect-square overflow-hidden rounded-xl bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/v1/photos/${p.id}/preview`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-out hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
        {photos === null &&
          Array.from({ length: Math.max(initialCount, 3) }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/5" />
          ))}
      </div>

      <div className="mt-10">
        <FollowLinks />
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
            className="max-h-[80vh] max-w-full "
          />
          <div className="flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/api/v1/photos/${open.id}/download`}
              className="rounded-xl border border-white bg-transparent px-6 py-2.5 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black"
            >
              Download
            </a>
            {!showAll && (
              <button
                onClick={async () => {
                  if (
                    !confirm(
                      "Remove this photo? It will be hidden from everyone at the event, including you.",
                    )
                  )
                    return;
                  await fetch(`/api/v1/photos/${open.id}/report`, { method: "POST" });
                  setOpen(null);
                  setPhotos((prev) => prev?.filter((p) => p.id !== open.id) ?? null);
                }}
                className="rounded-xl border border-red-500/40 px-6 py-2.5 tracking-wide text-red-400 uppercase transition-colors hover:border-red-400 hover:text-red-300"
              >
                Remove me
              </button>
            )}
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
