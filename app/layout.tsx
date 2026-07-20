import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://trevopk.com"),
  title: "Trevo | Modern Handbags for Everyday Confidence",
  description: "Shop Trevo luxury handbags, totes, crossbody and statement box bags with secure checkout and nationwide delivery in Pakistan.",
  keywords: ["Trevo", "handbags Pakistan", "women bags", "crossbody bag", "tote bag", "shoulder bag"],
  openGraph: {
    title: "Trevo — Effortless Style",
    description: "Modern handbags for everyday confidence.",
    images: ["/images/trevo-hero.png"],
  },
  alternates: { canonical: "/" },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-PK">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
