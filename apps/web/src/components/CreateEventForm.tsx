"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateEventForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        venue: String(form.get("venue")) || undefined,
      }),
    });
    if (!res.ok) {
      setError("Could not create the event");
      setBusy(false);
      return;
    }
    const { event } = await res.json();
    router.push(`/dashboard/events/${event.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-3">
      <input
        name="name"
        required
        minLength={2}
        placeholder="New event name"
        className="min-w-56 flex-1 border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none"
      />
      <input
        name="venue"
        placeholder="Venue (optional)"
        className="w-48 border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none"
      />
      <button
        disabled={busy}
        className="border border-white bg-transparent px-6 py-2.5 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
      >
        {busy ? "Creating…" : "Create"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
