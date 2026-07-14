/** Global footer — minimal: logo (links to the main site) + copyright. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="https://www.abovebelgium.be/en">
          <img
            src="/above-logo.svg"
            alt="Above Belgium"
            className="h-8 w-auto opacity-80 hover:opacity-100"
          />
        </a>
        <p className="text-xs text-white/55">© Above Belgium</p>
      </div>
    </footer>
  );
}
