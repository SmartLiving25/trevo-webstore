import { StorePageShell } from "../components/StorePageShell";

export const metadata = { title: "Contact Us | Trevo" };

export default function ContactPage() {
  return (
    <StorePageShell eyebrow="Trevo customer care" title="We are here to help." introduction="For product questions, delivery help or a damaged-parcel return, contact Trevo using the option that suits you.">
      <div className="contact-cards">
        <article><h2>WhatsApp</h2><p>Fast help with products, orders, payments and returns.</p><a href="https://wa.me/923007041451" target="_blank" rel="noreferrer">Message +92 300 7041451</a></article>
        <article><h2>Email</h2><p>Send a detailed message and include your order number when relevant.</p><a href="mailto:hello@trevopk.com">hello@trevopk.com</a></article>
        <article><h2>Social</h2><p>Follow new drops and styling inspiration.</p><a href="https://www.instagram.com/trevo_pk/" target="_blank" rel="noreferrer">Instagram @trevo_pk</a></article>
      </div>
    </StorePageShell>
  );
}
