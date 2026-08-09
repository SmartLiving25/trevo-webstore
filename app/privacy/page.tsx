import { StorePageShell } from "../components/StorePageShell";

export const metadata = { title: "Privacy | Trevo" };

export default function PrivacyPage() {
  return <StorePageShell eyebrow="Store policies" title="Privacy" introduction="Trevo uses your information only to process orders, arrange delivery and provide customer support."><div className="policy-copy"><h2>Information we collect</h2><p>We collect the contact, delivery and order details you provide at checkout or when creating an account.</p><h2>How it is used</h2><p>Your information is used to complete your order, communicate updates and improve your shopping experience. It may be shared with a delivery partner only when needed to fulfill your order.</p><h2>Payments and security</h2><p>Trevo does not store card PINs, OTPs or wallet passwords. Never share those details with anyone claiming to represent Trevo.</p><h2>Your choices</h2><p>For a privacy question or data request, contact Trevo through WhatsApp.</p></div></StorePageShell>;
}
