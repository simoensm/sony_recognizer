/** Global footer — ties the app back to abovebelgium.be so the event
 *  experience feels like one continuous brand. */
export function SiteFooter() {
  const links = [
    { label: "Above Belgium", href: "https://www.abovebelgium.be/en" },
    { label: "Portfolio", href: "https://www.abovebelgium.be/en/portfolio" },
    { label: "Services", href: "https://www.abovebelgium.be/en/services" },
    { label: "Contact", href: "https://www.abovebelgium.be/en/contactus" },
  ];

  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="https://www.abovebelgium.be/en">
          <img src="/above-logo.svg" alt="Above Belgium" className="h-8 w-auto opacity-80 hover:opacity-100" />
        </a>
        <nav className="flex flex-wrap gap-5 text-xs tracking-[0.15em] text-white/40 uppercase">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <p className="text-xs text-white/30">© Above Belgium</p>
      </div>
    </footer>
  );
}
