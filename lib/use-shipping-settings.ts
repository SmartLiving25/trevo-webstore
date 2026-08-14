"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings } from "@/lib/shipping";

export function useShippingSettings() {
  const [settings, setSettings] = useState(DEFAULT_SHIPPING_SETTINGS);

  const refreshShippingSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/shipping", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const latest = normalizeShippingSettings(data.settings);
        setSettings(latest);
        return latest;
      }
    } catch {
      // The safe defaults remain available during a temporary network failure.
    }
    return null;
  }, []);

  useEffect(() => {
    void refreshShippingSettings();
    const interval = window.setInterval(refreshShippingSettings, 15000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshShippingSettings();
    };
    window.addEventListener("focus", refreshShippingSettings);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshShippingSettings);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshShippingSettings]);

  return { settings, setSettings, refreshShippingSettings };
}
