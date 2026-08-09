import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { META_PIXEL_ID } from "../lib/meta-pixel";
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
      <head>
        <link
          rel="preload"
          href="/images/trevo-hero-720.webp"
          imageSrcSet="/images/trevo-hero-720.webp 720w, /images/trevo-hero-1200.webp 1200w, /images/trevo-hero.webp 1586w"
          imageSizes="100vw"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
