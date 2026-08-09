import { StorePageShell } from "../components/StorePageShell";

export const metadata = { title: "Terms | Trevo" };

export default function TermsPage() {
  return <StorePageShell eyebrow="Store policies" title="Terms" introduction="By placing an order, you confirm that the delivery and contact information you provide is correct."><div className="policy-copy"><h2>Orders</h2><p>Product availability, prices and delivery estimates are confirmed when your order is accepted. Trevo may contact you by phone or WhatsApp to confirm order details.</p><h2>Products</h2><p>Product colour may vary slightly from the original product online because of lighting and screen settings.</p><h2>Payments</h2><p>Advance payment is optional and has no extra fee. Never send PINs, OTPs or wallet passwords.</p></div></StorePageShell>;
}
