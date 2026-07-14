"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setMsg(error ? { ok: false, text: error.message ?? "Could not save" } : { ok: true, text: "Saved" });
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="panel mt-4 flex flex-col gap-4 border border-white/10 p-6">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/75">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          className="rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-white focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/75">Email</span>
        <input
          value={email}
          disabled
          className="border border-white/10 bg-white/5 px-4 py-2 text-white/65"
        />
        <span className="text-xs text-white/55">
          Email changes require verification — coming with the account-security milestone.
        </span>
      </label>
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-white/85" : "text-red-400"}`}>{msg.text}</p>
      )}
      <button
        disabled={busy || name.trim() === initialName}
        className="self-start rounded-xl border border-white bg-transparent px-6 py-2 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
