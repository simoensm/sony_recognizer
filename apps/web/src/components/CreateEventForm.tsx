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
    <form onSubmit={onSubmit} className="flex gap-3">
      <input
        name="name"
        required
        minLength={2}
        placeholder="New event name (e.g. City Marathon 2026)"
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2"
      />
      <input
        name="venue"
        placeholder="Venue (optional)"
        className="w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2"
      />
      <button disabled={busy} className="rounded-lg bg-emerald-600 px-5 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50">
        {busy ? "Creating…" : "Create"}
      </button>
      {error && <p className="self-center text-sm text-red-400">{error}</p>}
    </form>
  );
}
