"use client";

/**
 * Camera management: list every camera login with LIVE status
 * (sending / connected / idle / never / revoked), create new ones with a
 * label, revoke leaked ones. Polls every 5s alongside the event view.
 */
import { useEffect, useState } from "react";

type Camera = {
  id: string;
  username: string;
  label: string | null;
  photoCount: number;
  lastUploadAt: string | null;
  status: "sending" | "connected" | "idle" | "never" | "revoked";
};

type FreshCredential = { username: string; password: string };

const STATUS_STYLE: Record<Camera["status"], { dot: string; text: string }> = {
  sending: { dot: "bg-white animate-pulse", text: "Sending" },
  connected: { dot: "bg-white/80", text: "Connected" },
  idle: { dot: "bg-white/30", text: "Idle" },
  never: { dot: "bg-white/10", text: "Never connected" },
  revoked: { dot: "bg-red-500/60", text: "Revoked" },
};

export function CameraPanel({ eventId }: { eventId: string }) {
  const [cameras, setCameras] = useState<Camera[] | null>(null);
  const [fresh, setFresh] = useState<FreshCredential | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/v1/events/${eventId}/ftp-credentials`, {
      cache: "no-store",
    }).catch(() => null);
    if (res?.ok) setCameras((await res.json()).cameras);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function create() {
    setBusy(true);
    const res = await fetch(`/api/v1/events/${eventId}/ftp-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() || undefined }),
    });
    if (res.ok) {
      setFresh((await res.json()).credential);
      setLabel("");
      refresh();
    }
    setBusy(false);
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this camera login? The camera stops working immediately.")) return;
    await fetch(`/api/v1/ftp-credentials/${id}/revoke`, { method: "POST" });
    refresh();
  }

  return (
    <section className="border border-white/10 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-white/50 uppercase">
            Cameras
          </h2>
          <p className="mt-1 text-sm text-white/40">
            FTP · port 2121 · passive mode on
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. A7III main)"
            className="w-44 border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-white focus:outline-none"
          />
          <button
            onClick={create}
            disabled={busy}
            className="bg-white px-4 py-2 text-sm font-semibold tracking-wide text-black uppercase hover:bg-white/80 disabled:opacity-40"
          >
            {busy ? "…" : "Add camera"}
          </button>
        </div>
      </div>

      {fresh && (
        <div className="mt-4 border border-white/30 bg-white/5 p-4 font-mono text-sm">
          <p>user&nbsp;&nbsp;&nbsp;&nbsp; {fresh.username}</p>
          <p>password&nbsp; {fresh.password}</p>
          <p className="mt-2 font-sans text-xs text-white/50">
            Shown only once — enter it in the camera now, then it lights up below.
          </p>
        </div>
      )}

      <ul className="mt-5 divide-y divide-white/10">
        {(cameras ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[c.status].dot}`} />
              <div>
                <p className={`text-sm font-medium ${c.status === "revoked" ? "text-white/30 line-through" : ""}`}>
                  {c.label ?? c.username}
                  <span className="ml-2 font-mono text-xs text-white/40">{c.username}</span>
                </p>
                <p className="text-xs text-white/40">
                  {STATUS_STYLE[c.status].text}
                  {c.lastUploadAt &&
                    ` · last photo ${new Date(c.lastUploadAt).toLocaleTimeString()}`}
                  {` · ${c.photoCount} photos`}
                </p>
              </div>
            </div>
            {c.status !== "revoked" && (
              <button
                onClick={() => revoke(c.id)}
                className="text-xs text-white/40 uppercase tracking-wide hover:text-red-400"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
        {cameras !== null && cameras.length === 0 && (
          <li className="py-6 text-center text-sm text-white/30">
            No cameras yet — add one and put the login in your camera's FTP settings.
          </li>
        )}
      </ul>
    </section>
  );
}
