"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateEventForm({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const light = variant === "light";
  const input = light
    ? "rounded-xl border border-black/25 bg-transparent px-4 py-2.5 text-black focus:border-black focus:outline-none"
    : "rounded-xl border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none";
  const button = light
    ? "rounded-xl border border-black bg-transparent px-6 py-2.5 text-sm font-semibold tracking-wide text-black uppercase transition-colors hover:bg-black hover:text-white disabled:opacity-40"
    : "rounded-xl border border-white bg-transparent px-6 py-2.5 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40";

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
        className={`min-w-56 flex-1 ${input}`}
      />
      <input name="venue" placeholder="Venue (optional)" className={`w-48 ${input}`} />
      <button disabled={busy} className={button}>
        {busy ? "Creating…" : "Create"}
      </button>
      {error && <p className="w-full text-sm text-red-500">{error}</p>}
    </form>
  );
}
