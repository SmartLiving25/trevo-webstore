export const META_PIXEL_ID = "1157123849628374";

declare global {
  interface Window {
    fbq?: (
      action: "track" | "trackCustom",
      event: string,
      parameters?: Record<string, unknown>,
    ) => void;
  }
}

export function trackMetaEvent(
  event: string,
  parameters?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event, parameters);
}
