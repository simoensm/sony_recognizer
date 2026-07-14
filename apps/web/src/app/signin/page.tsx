"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(error.message ?? "Sign-in failed");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6">
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/above-logo.svg" alt="Above Belgium" className="h-14 w-auto" />
        <h1 className="mt-4 text-2xl font-bold tracking-wide uppercase">Sign in</h1>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input name="email" type="email" required placeholder="Email"
          className="border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none" />
        <input name="password" type="password" required placeholder="Password"
          className="border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy}
          className="bg-white px-4 py-2.5 font-semibold tracking-wide text-black uppercase hover:bg-white/80 disabled:opacity-40">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-white/40">
        New here?{" "}
        <Link href="/signup" className="text-white underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
