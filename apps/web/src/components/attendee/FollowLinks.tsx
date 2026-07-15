/** Compact "follow the photographer" reminder shown in the attendee flow. */
export function FollowLinks() {
  const link =
    "flex items-center gap-2 text-xs tracking-wide text-white/65 transition-colors hover:text-white";

  return (
    <div className="flex flex-col items-center gap-2 border-t border-white/10 pt-4">
      <p className="text-xs text-white/55">Enjoying the photos? Follow Above Belgium</p>
      <div className="flex gap-6">
        <a
          href="https://www.instagram.com/abovebelgium/"
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
          </svg>
          Instagram
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61558587852489"
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V5c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3V11H9v3h2.3v7h2.2z" />
          </svg>
          Facebook
        </a>
      </div>
    </div>
  );
}
