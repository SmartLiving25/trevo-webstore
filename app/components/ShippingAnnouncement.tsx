"use client";

import { shippingAnnouncement } from "@/lib/shipping";
import { useShippingSettings } from "@/lib/use-shipping-settings";

export function ShippingAnnouncement() {
  const { settings } = useShippingSettings();
  return (
    <div className="announcement">
      <span>{shippingAnnouncement(settings)}</span>
      <span className="announcement-separator">•</span>
      <span>Advance payment has no extra fee</span>
    </div>
  );
}
