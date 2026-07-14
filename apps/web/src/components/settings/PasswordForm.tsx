"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next = String(data.get("new"));
    if (next !== String(data.get("confirm"))) {
      setMsg({ ok: false, text: "New passwords don't match" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get("current")),
      newPassword: next,
      revokeOtherSessions: true, // stolen sessions die with the old password
    });
    if (error) {
      setMsg({ ok: false, text: error.message ?? "Could not change password" });
    } else {
      setMsg({ ok: true, text: "Password changed — other devices were signed out." });
      form.reset();
    }
    setBusy(false);
  }

  return (
    <form onSubmit={change} className="panel mt-4 flex flex-col gap-4 border border-white/10 p-6">
      {(["current", "new", "confirm"] as const).map((field) => (
        <label key={field} className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/75">
            {field === "current" ? "Current password" : field === "new" ? "New password (min 8)" : "Confirm new password"}
          </span>
          <input
            name={field}
            type="password"
            required
            minLength={field === "current" ? 1 : 8}
            autoComplete={field === "current" ? "current-password" : "new-password"}
            className="rounded-xl border border-white/20 bg-transparent px-4 py-2 focus:border-white focus:outline-none"
          />
        </label>
      ))}
      {msg && (
        <p className={`text-sm ${msg.ok ? "text-white/85" : "text-red-400"}`}>{msg.text}</p>
      )}
      <button
        disabled={busy}
        className="self-start rounded-xl border border-white bg-transparent px-6 py-2 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40"
      >
        {busy ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
