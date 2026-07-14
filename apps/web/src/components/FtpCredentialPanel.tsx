"use client";

/** Camera credential generator. The password appears exactly once. */
import { useState } from "react";

type Credential = { username: string; password: string };

export function FtpCredentialPanel({ eventId }: { eventId: string }) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch(`/api/v1/events/${eventId}/ftp-credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const { credential } = await res.json();
      setCredential(credential);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-xl border border-zinc-800 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Camera connection</h2>
          <p className="text-sm text-zinc-400">
            Generate an FTP login for a camera body. Settings: port 2121, passive
            mode on, secure off (dev).
          </p>
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Generating…" : "New camera login"}
        </button>
      </div>

      {credential && (
        <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4 font-mono text-sm">
          <p>user&nbsp;&nbsp;&nbsp;&nbsp; {credential.username}</p>
          <p>password&nbsp; {credential.password}</p>
          <p className="mt-2 font-sans text-xs text-emerald-300">
            Shown only once — enter it in the camera now.
          </p>
        </div>
      )}
    </section>
  );
}
