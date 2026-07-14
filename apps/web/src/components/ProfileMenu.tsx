"use client";

/**
 * Profile avatar + dropdown, shown top-right everywhere.
 * Signed in  → initials avatar; menu: Account / Disconnect.
 * Signed out (or anonymous attendee session) → generic icon; menu: Log in / Sign up.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function ProfileMenu({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);

  const connected = !!session && !session.user.isAnonymous;
  const initials =
    connected && session
      ? session.user.name
          .split(/\s+/)
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : null;

  const ring =
    variant === "light"
      ? "border-black/30 text-black hover:border-black"
      : "border-white/40 text-white hover:border-white";

  async function disconnect() {
    setOpen(false);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const item =
    "block w-full px-4 py-2.5 text-left text-sm text-white/85 hover:bg-white/10";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile menu"
        className={`flex h-9 w-9 items-center justify-center rounded-full border ${ring} ${
          connected ? "text-xs font-bold tracking-wide" : ""
        }`}
      >
        {isPending ? (
          "·"
        ) : initials ? (
          initials
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4.5 19.5c1.6-3.2 4.3-4.8 7.5-4.8s5.9 1.6 7.5 4.8" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/15 bg-black/90 shadow-xl backdrop-blur-md">
            {connected ? (
              <>
                <p className="border-b border-white/10 px-4 py-2.5 text-xs text-white/55">
                  {session?.user.name}
                </p>
                <Link href="/settings" className={item} onClick={() => setOpen(false)}>
                  Account
                </Link>
                <button onClick={disconnect} className={item}>
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className={item} onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link href="/signup" className={item} onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
