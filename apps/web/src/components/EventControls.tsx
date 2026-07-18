"use client";

/** End / reopen / delete controls on the event page. */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EventControls({
  eventId,
  eventName,
  status,
  publicGallery,
}: {
  eventId: string;
  eventName: string;
  status: string;
  publicGallery: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function togglePublicGallery() {
    if (
      !publicGallery &&
      !confirm(
        "Enable 'Browse all'? Every attendee of this event will be able to see ALL event photos, not just their own. Recommended for public events only.",
      )
    )
      return;
    setBusy(true);
    await fetch(`/api/v1/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicGallery: !publicGallery }),
    });
    setBusy(false);
    router.refresh();
  }

  async function setStatus(next: "live" | "closed") {
    setBusy(true);
    await fetch(`/api/v1/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    const typed = prompt(
      `This removes "${eventName}" for you AND all attendees (galleries included).\n\nType the event name to confirm:`,
    );
    if (typed !== eventName) return;
    setBusy(true);
    const res = await fetch(`/api/v1/events/${eventId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/dashboard");
  }

  async function reprocess() {
    if (!confirm("Re-run the AI over all photos of this event? (regenerates previews, watermarks and face data — takes a while)")) return;
    setBusy(true);
    const res = await fetch(`/api/v1/events/${eventId}/reprocess`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { queued } = await res.json();
      alert(`${queued} photo(s) queued for reprocessing.`);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={togglePublicGallery}
        disabled={busy}
        title="When on, attendees can browse every event photo"
        className={`rounded-xl border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors disabled:opacity-40 ${
          publicGallery
            ? "border-white bg-white text-black hover:bg-white/80"
            : "border-white/30 text-white/85 hover:border-white hover:text-white"
        }`}
      >
        Browse all: {publicGallery ? "on" : "off"}
      </button>
      <button
        onClick={reprocess}
        disabled={busy}
        className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white disabled:opacity-40"
      >
        Reprocess
      </button>
      {status === "live" ? (
        <button
          onClick={() => setStatus("closed")}
          disabled={busy}
          className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white disabled:opacity-40"
        >
          End event
        </button>
      ) : (
        <button
          onClick={() => setStatus("live")}
          disabled={busy}
          className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white disabled:opacity-40"
        >
          Reopen event
        </button>
      )}
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold tracking-wide text-red-400 uppercase transition-colors hover:border-red-400 hover:text-red-300 disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
