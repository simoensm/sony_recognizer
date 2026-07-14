/** Shared top navigation — floating white rounded bar, like abovebelgium.be. */
import Link from "next/link";
import { ProfileMenu } from "./ProfileMenu";

export function AppHeader() {
  return (
    <header className="px-4 pt-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between rounded-full bg-white/80 px-8 py-3 text-black shadow-lg backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/above-logo-dark.svg" alt="Above Belgium" className="h-9 w-auto" />
          <span className="text-xs font-bold tracking-[0.3em] text-black/40 uppercase">
            Live Photos
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-black/60">
          <a
            href="https://www.abovebelgium.be/en"
            className="hidden hover:text-black sm:inline"
          >
            abovebelgium.be ↗
          </a>
          <Link href="/dashboard" className="hover:text-black">
            Events
          </Link>
          <ProfileMenu variant="light" />
        </nav>
      </div>
    </header>
  );
}
