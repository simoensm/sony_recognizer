/** Shared top navigation for signed-in pages — Above Belgium wordmark. */
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-sm font-bold tracking-[0.3em] uppercase">
          Above<span className="text-white/40">·</span>Photos
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/60">
          <Link href="/dashboard" className="hover:text-white">
            Events
          </Link>
          <Link href="/settings" className="hover:text-white">
            {userName}
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
