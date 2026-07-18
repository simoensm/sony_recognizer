"use client";

/** Collapsible activity log on the event page. Polls every 5s. */
import { useEffect, useState } from "react";

type Entry = {
  at: string;
  kind: "photo" | "photo_failed" | "participant" | "download" | "camera";
  message: string;
};

const KIND_STYLE: Record<Entry["kind"], { dot: string; text: string }> = {
  photo: { dot: "bg-white", text: "text-white/85" },
  photo_failed: { dot: "bg-red-500", text: "text-red-400" },
  participant: { dot: "bg-amber-400", text: "text-amber-300" },
  download: { dot: "bg-sky-400", text: "text-sky-300" },
  camera: { dot: "bg-green-400", text: "text-green-300" },
};

export function EventLogPanel({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    async function tick() {
      const res = await fetch(`/api/v1/events/${eventId}/log`, { cache: "no-store" }).catch(
        () => null,
      );
      if (alive && res?.ok) setEntries((await res.json()).entries);
    }
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [eventId]);

  const shown = expanded ? (entries ?? []) : (entries ?? []).slice(0, 8);

  return (
    <section className="panel border border-white/10 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">
          Activity log
        </h2>
        {entries && entries.length > 8 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs tracking-[0.15em] text-white/55 uppercase hover:text-white"
          >
            {expanded ? "Show less" : `Show all (${entries.length})`}
          </button>
        )}
      </div>

      <ul className="mt-4 max-h-96 divide-y divide-white/5 overflow-y-auto">
        {shown.map((e, i) => (
          <li key={i} className="flex items-baseline gap-3 py-2.5 text-sm">
            <span className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full ${KIND_STYLE[e.kind].dot}`} />
            <span className="shrink-0 font-mono text-xs text-white/45">
              {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className={KIND_STYLE[e.kind].text}>{e.message}</span>
          </li>
        ))}
        {entries !== null && entries.length === 0 && (
          <li className="py-6 text-center text-sm text-white/40">
            Nothing yet — activity appears here as it happens.
          </li>
        )}
        {entries === null && (
          <li className="py-6 text-center text-sm text-white/30">Loading…</li>
        )}
      </ul>
    </section>
  );
}
