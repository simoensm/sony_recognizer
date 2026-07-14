/** Landing — Above Belgium monochrome. */
import { ProfileMenu } from "@/components/ProfileMenu";

export default function Home() {
  return (
    <>
      <div className="flex w-full justify-end px-6 pt-6">
        <ProfileMenu variant="dark" />
      </div>
      <main className="mx-auto flex flex-1 min-h-0 w-full max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/above-logo.svg" alt="Above Belgium" className="-mt-16 mb-4 h-24 w-auto" />
        <h1 className="flex items-center gap-4 text-4xl font-bold tracking-wide uppercase sm:text-5xl">
          <span className="flex items-center gap-3 rounded-2xl border-2 border-white px-4 py-1">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            Live
          </span>
          Photos
        </h1>
        <p className="max-w-xl text-white/75">
          Shoot an event. Photos upload themselves. Attendees scan a QR, take a
          selfie, and instantly receive every photo they appear in.
        </p>
        <div className="flex gap-4 text-sm">
          <a
            href="/dashboard"
            className="rounded-xl border border-white bg-transparent px-6 py-3 font-semibold tracking-wide text-white uppercase transition-colors hover:bg-white hover:text-black"
          >
            Photographer dashboard
          </a>
          <a
            href="https://www.abovebelgium.be/en"
            className="rounded-xl border border-white/20 px-6 py-3 tracking-wide text-white/85 uppercase hover:border-white/60"
          >
            Website
          </a>
        </div>
      </main>
    </>
  );
}
