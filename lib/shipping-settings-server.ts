import "server-only";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings, type ShippingSettings } from "@/lib/shipping";

const shippingDocument = () => getAdminFirestore().collection("storeSettings").doc("shipping");

export async function getShippingSettings(): Promise<ShippingSettings> {
  const snapshot = await shippingDocument().get();
  return snapshot.exists
    ? normalizeShippingSettings(snapshot.data())
    : DEFAULT_SHIPPING_SETTINGS;
}

export async function saveShippingSettings(settings: ShippingSettings) {
  const saved = { ...normalizeShippingSettings(settings), updatedAt: new Date().toISOString() };
  await shippingDocument().set(saved, { merge: false });
  return saved;
}
