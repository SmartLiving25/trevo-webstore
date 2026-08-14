export type ShippingSettings = {
  flatFee: number;
  freeShippingEnabled: boolean;
  minimumEnabled: boolean;
  minimumOrderAmount: number;
  dateEnabled: boolean;
  startDate: string;
  endDate: string;
  updatedAt?: string;
};

export type ShippingQuote = {
  fee: number;
  isFree: boolean;
  reason: "minimum" | "date" | null;
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  flatFee: 200,
  freeShippingEnabled: false,
  minimumEnabled: true,
  minimumOrderAmount: 2000,
  dateEnabled: false,
  startDate: "",
  endDate: "",
};

const wholeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
};

export function normalizeShippingSettings(value: unknown): ShippingSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    flatFee: wholeNumber(source.flatFee, DEFAULT_SHIPPING_SETTINGS.flatFee),
    freeShippingEnabled: source.freeShippingEnabled === true,
    minimumEnabled: source.minimumEnabled !== false,
    minimumOrderAmount: wholeNumber(source.minimumOrderAmount, DEFAULT_SHIPPING_SETTINGS.minimumOrderAmount),
    dateEnabled: source.dateEnabled === true,
    startDate: typeof source.startDate === "string" ? source.startDate : "",
    endDate: typeof source.endDate === "string" ? source.endDate : "",
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export function pakistanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

export function calculateShipping(
  subtotal: number,
  input: ShippingSettings,
  dateKey = pakistanDateKey(),
): ShippingQuote {
  const settings = normalizeShippingSettings(input);
  if (subtotal <= 0) return { fee: 0, isFree: false, reason: null };

  if (settings.freeShippingEnabled) {
    if (settings.minimumEnabled && subtotal > settings.minimumOrderAmount) {
      return { fee: 0, isFree: true, reason: "minimum" };
    }
    const endDate = settings.endDate || settings.startDate;
    if (
      settings.dateEnabled &&
      settings.startDate &&
      dateKey >= settings.startDate &&
      dateKey <= endDate
    ) {
      return { fee: 0, isFree: true, reason: "date" };
    }
  }

  return { fee: settings.flatFee, isFree: false, reason: null };
}

export function shippingAnnouncement(settings: ShippingSettings) {
  const normalized = normalizeShippingSettings(settings);
  if (!normalized.freeShippingEnabled) return `Flat nationwide delivery — Rs. ${normalized.flatFee.toLocaleString("en-PK")}`;
  const offers: string[] = [];
  if (normalized.minimumEnabled) offers.push(`free above Rs. ${normalized.minimumOrderAmount.toLocaleString("en-PK")}`);
  if (normalized.dateEnabled && normalized.startDate) {
    offers.push(normalized.endDate && normalized.endDate !== normalized.startDate ? "free on selected offer dates" : "free on the selected offer date");
  }
  return `Delivery Rs. ${normalized.flatFee.toLocaleString("en-PK")} · ${offers.join(" or ")}`;
}
