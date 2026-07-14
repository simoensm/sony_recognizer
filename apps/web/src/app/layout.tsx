import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sony Recognizer",
  description:
    "Instant AI-matched event photo delivery — scan a QR, take a selfie, get your photos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
