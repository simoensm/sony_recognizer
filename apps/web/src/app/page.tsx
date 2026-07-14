/** Landing — Above Belgium monochrome. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <p className="text-xs font-bold tracking-[0.4em] text-white/40 uppercase">
        Above · Photos
      </p>
      <h1 className="text-4xl font-bold tracking-wide uppercase sm:text-5xl">
        Your photos find you
      </h1>
      <p className="max-w-xl text-white/50">
        Shoot an event. Photos upload themselves. Attendees scan a QR, take a
        selfie, and instantly receive every photo they appear in.
      </p>
      <div className="flex gap-4 text-sm">
        <a
          href="/dashboard"
          className="bg-white px-6 py-3 font-semibold tracking-wide text-black uppercase hover:bg-white/80"
        >
          Photographer dashboard
        </a>
        <a
          href="/api/v1/health"
          className="border border-white/20 px-6 py-3 tracking-wide text-white/70 uppercase hover:border-white/60"
        >
          Status
        </a>
      </div>
    </main>
  );
}
