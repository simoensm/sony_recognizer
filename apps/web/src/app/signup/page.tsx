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
    <>
      <div className="w-full px-6 pt-6">
        <a href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/above-logo.svg" alt="Above Belgium" className="h-12 w-auto" />
        </a>
      </div>
      <main className="mx-auto flex flex-1 min-h-0 w-full max-w-sm flex-col justify-center gap-8 px-6">
        <h1 className="text-2xl font-bold tracking-wide uppercase">Create account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input name="name" required placeholder="Your name"
          className="rounded-xl border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none" />
        <input name="email" type="email" required placeholder="Email"
          className="rounded-xl border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none" />
        <input name="password" type="password" required minLength={8} placeholder="Password (min 8 chars)"
          className="rounded-xl border border-white/20 bg-transparent px-4 py-2.5 focus:border-white focus:outline-none" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy}
          className="rounded-xl border border-white bg-transparent px-4 py-2.5 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black disabled:opacity-40">
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
        <p className="text-sm text-white/65">
          Already have an account?{" "}
          <Link href="/signin" className="text-white underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </>
  );
}
