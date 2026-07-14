"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(error.message ?? "Sign-up failed");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input name="name" required placeholder="Your name" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2" />
        <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2" />
        <input name="password" type="password" required minLength={8} placeholder="Password (min 8 chars)" className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500 disabled:opacity-50">
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-zinc-400">
        Already have an account? <Link href="/signin" className="text-emerald-400">Sign in</Link>
      </p>
    </main>
  );
}
