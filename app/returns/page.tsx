import { StorePageShell } from "../components/StorePageShell";

export const metadata = { title: "Returns | Trevo" };

export default function ReturnsPage() {
  return <StorePageShell eyebrow="Customer care" title="Returns" introduction="If your parcel arrives damaged, you may request a return within 2 days of delivery."><div className="policy-copy"><h2>How to request a return</h2><ol><li>Contact Trevo on WhatsApp within 2 days and include your order number.</li><li>Send clear photos or a short video showing the damage and parcel packaging.</li><li>Keep the product unused and in its original packaging while your request is reviewed.</li></ol><h2>Approved requests</h2><p>Approved damaged-item returns will be handled through WhatsApp with replacement or refund instructions.</p><a className="information-button" href="https://wa.me/923007041451" target="_blank" rel="noreferrer">Start a return on WhatsApp</a></div></StorePageShell>;
}
