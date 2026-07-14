import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Above Photos — your photos find you",
  description:
    "Instant AI-matched event photo delivery by Above Belgium — scan a QR, take a selfie, get your photos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
