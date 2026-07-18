"use client";

/**
 * Camera management: live status per camera, expandable rows with the
 * login + connection settings, password regeneration, revocation.
 */
import { useEffect, useState } from "react";
import { formatBytes } from "./EventLiveView";

type Camera = {
  id: string;
  username: string;
  label: string | null;
  photoCount: number;
  dataBytes: number;
  lastUploadAt: string | null;
  status: "sending" | "connected" | "idle" | "never" | "revoked";
};

type FreshCredential = { username: string; password: string };

const STATUS_STYLE: Record<Camera["status"], { dot: string; text: string }> = {
  sending: { dot: "bg-green-400 animate-pulse", text: "Sending" },
  connected: { dot: "bg-green-500", text: "Connected" },
  idle: { dot: "bg-white/30", text: "Idle" },
  never: { dot: "bg-white/10", text: "Never connected" },
  revoked: { dot: "bg-red-500/60", text: "Revoked" },
};

export function CameraPanel({
  eventId,
  serverHost,
}: {
  eventId: string;
  serverHost: string;
}) {
  const [cameras, setCameras] = useState<Camera[] | null>(null);
  const [fresh, setFresh] = useState<FreshCredential | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  // per-camera regenerated passwords, shown once
  const [regenerated, setRegenerated] = useState<Record<string, string>>({});

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

  async function regenerate(id: string) {
    if (!confirm("Generate a new password? The current one stops working immediately."))
      return;
    const res = await fetch(`/api/v1/ftp-credentials/${id}/regenerate`, { method: "POST" });
    if (res.ok) {
      const { credential } = await res.json();
      setRegenerated((prev) => ({ ...prev, [id]: credential.password }));
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this camera login? The camera stops working immediately.")) return;
    await fetch(`/api/v1/ftp-credentials/${id}/revoke`, { method: "POST" });
    setExpanded(null);
    refresh();
  }

  const settingsRows: [string, string][] = [
    ["Destination server", serverHost],
    ["Port", "2121"],
    ["Passive mode", "On"],
    ["Secure protocol", "Off"],
  ];

  return (
    <section className="panel border border-white/10 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-[0.2em] text-white/75 uppercase">
              Cameras
            </h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Connection settings"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[10px] font-bold text-white/70 transition-colors hover:border-white hover:text-white"
            >
              i
            </button>
          </div>
          <p className="mt-1 text-sm text-white/65">
            Click a camera for its login &amp; password options
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. A7III main)"
            className="w-44 rounded-xl border border-white/20 bg-transparent px-3 py-2 text-sm focus:border-white focus:outline-none"
          />
          <button
            onClick={create}
            disabled={busy}
            className="rounded-xl border border-white bg-transparent px-4 py-2 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
          >
            {busy ? "…" : "Add camera"}
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="mt-4 rounded-xl border border-white/20 bg-white/5 p-4 text-sm">
          <p className="text-xs tracking-[0.15em] text-white/55 uppercase">
            Camera FTP destination settings
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            {settingsRows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-white/65">{k}</dt>
                <dd className="font-mono text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {fresh && (
        <div className="mt-4 rounded-xl border border-white/30 bg-white/5 p-4 font-mono text-sm">
          <p>user&nbsp;&nbsp;&nbsp;&nbsp; {fresh.username}</p>
          <p>password&nbsp; {fresh.password}</p>
          <p className="mt-2 font-sans text-xs text-white/75">
            Shown only once — enter it in the camera now, then it lights up below.
          </p>
        </div>
      )}

      <ul className="mt-5 divide-y divide-white/10">
        {(cameras ?? []).map((c) => (
          <li key={c.id} className="py-3">
            <button
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[c.status].dot}`} />
                <div>
                  <p className="text-sm font-medium">
                    {c.label ?? c.username}
                    <span className="ml-2 font-mono text-xs text-white/65">{c.username}</span>
                  </p>
                  <p className="text-xs text-white/65">
                    {STATUS_STYLE[c.status].text}
                    {c.lastUploadAt &&
                      ` · last photo ${new Date(c.lastUploadAt).toLocaleTimeString()}`}
                    {` · ${c.photoCount} photos · ${formatBytes(c.dataBytes)}`}
                  </p>
                </div>
              </div>
              <span className="text-white/40">{expanded === c.id ? "▲" : "▼"}</span>
            </button>

            {expanded === c.id && (
              <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  <dt className="text-white/65">User name</dt>
                  <dd className="font-mono text-white/90">{c.username}</dd>
                  <dt className="text-white/65">Password</dt>
                  <dd className="font-mono text-white/90">
                    {regenerated[c.id] ?? (
                      <span className="font-sans text-white/55">
                        not stored — generate a new one if lost
                      </span>
                    )}
                  </dd>
                  {settingsRows.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-white/65">{k}</dt>
                      <dd className="font-mono text-white/90">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => regenerate(c.id)}
                    className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold tracking-wide text-white/85 uppercase transition-colors hover:border-white hover:text-white"
                  >
                    New password
                  </button>
                  <button
                    onClick={() => revoke(c.id)}
                    className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold tracking-wide text-red-400 uppercase transition-colors hover:border-red-400 hover:text-red-300"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {cameras !== null && cameras.length === 0 && (
          <li className="py-6 text-center text-sm text-white/55">
            No cameras yet — add one and put the login in your camera's FTP settings.
          </li>
        )}
      </ul>
    </section>
  );
}
