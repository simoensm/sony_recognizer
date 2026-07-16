"use client";

/** End / reopen / delete controls on the event page. */
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EventControls({
  eventId,
  eventName,
  status,
}: {
  eventId: string;
  eventName: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="flex items-center gap-3">
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
