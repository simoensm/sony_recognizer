import type { Metadata } from "next";
import { Roboto, Open_Sans } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// The same fonts as abovebelgium.be: Roboto for headings, Open Sans for body.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-roboto",
});
const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-opensans",
});

export const metadata: Metadata = {
  title: "Above Live Photos — your photos find you",
  description:
    "Instant AI-matched event photo delivery by Above Belgium — scan a QR, take a selfie, get your photos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${openSans.variable} flex min-h-screen flex-col bg-black text-white antialiased`}
      >
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
