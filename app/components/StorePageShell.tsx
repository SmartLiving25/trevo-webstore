import { Camera, MessageCircle, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import { ShippingAnnouncement } from "@/app/components/ShippingAnnouncement";

const whatsapp = "923007041451";

export function StorePageShell({
  eyebrow,
  title,
  introduction,
  children,
}: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <main className="information-page">
      <ShippingAnnouncement />
      <header className="information-header">
        <a className="information-brand" href="/">Trevo</a>
        <nav aria-label="Main navigation">
          <a href="/new-arrivals">New arrivals</a>
          <a href="/bags">All bags</a>
          <a href="/our-story">Our story</a>
          <a href="/contact">Contact</a>
        </nav>
        <a className="information-account" href="/?account=1">My account</a>
      </header>
      <section className="information-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{introduction}</p>
      </section>
      <section className="information-content">{children}</section>
      <footer className="information-footer">
        <div>
          <a className="information-brand light" href="/">Trevo</a>
          <p>Modern handbags for everyday confidence.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <a href="/new-arrivals">New arrivals</a>
          <a href="/bags">All bags</a>
          <a href="/our-story">Brand story</a>
        </div>
        <div>
          <h3>Customer care</h3>
          <a href="/contact">Contact us</a>
          <a href="/returns">Returns</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
        <div>
          <h3>Follow Trevo</h3>
          <a href="https://www.instagram.com/trevo_pk/" target="_blank" rel="noreferrer"><Camera /> Instagram</a>
          <a href="https://www.tiktok.com/@trevo_pk" target="_blank" rel="noreferrer"><Music2 /> TikTok</a>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
        </div>
        <small>© 2026 Trevo. All rights reserved.</small>
      </footer>
    </main>
  );
}
