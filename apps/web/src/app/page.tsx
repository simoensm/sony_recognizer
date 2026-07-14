/**
 * Temporary landing page — proves the stack runs end to end.
 * Replaced by the real marketing/QR landing flow in M2.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium tracking-widest text-emerald-400 uppercase">
        M0 · Foundation
      </p>
      <h1 className="text-4xl font-bold tracking-tight">Sony Recognizer</h1>
      <p className="text-zinc-400">
        Shoot an event. Photos upload themselves. Attendees scan a QR, take a
        selfie, and instantly get every photo they appear in.
      </p>
      <div className="flex gap-4 text-sm">
        <a
          href="/dashboard"
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium hover:bg-emerald-500"
        >
          Photographer dashboard
        </a>
        <a
          href="/api/v1/health"
          className="rounded-lg border border-zinc-700 px-4 py-2 hover:border-zinc-500"
        >
          Stack health check
        </a>
      </div>
    </main>
  );
}
