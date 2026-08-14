import { z } from "zod";
import { getAdminSessionUser } from "@/lib/firebase/admin-session";
import { getShippingSettings, saveShippingSettings } from "@/lib/shipping-settings-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const date = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]);
const shippingSchema = z.object({
  flatFee: z.number().int().min(0).max(100000),
  freeShippingEnabled: z.boolean(),
  minimumEnabled: z.boolean(),
  minimumOrderAmount: z.number().int().min(1).max(10000000),
  dateEnabled: z.boolean(),
  startDate: date,
  endDate: date,
}).superRefine((settings, context) => {
  if (settings.freeShippingEnabled && !settings.minimumEnabled && !settings.dateEnabled) {
    context.addIssue({ code: "custom", message: "Enable at least one free-shipping condition." });
  }
  if (settings.dateEnabled && !settings.startDate) {
    context.addIssue({ code: "custom", path: ["startDate"], message: "Choose a start date." });
  }
  if (settings.endDate && settings.startDate && settings.endDate < settings.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "End date cannot be before start date." });
  }
});

export async function GET() {
  try {
    return Response.json(
      { settings: await getShippingSettings() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json({ error: "Shipping settings could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!await getAdminSessionUser()) {
    return Response.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const parsed = shippingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message || "Check the shipping settings." }, { status: 400 });
  }
  try {
    return Response.json({ settings: await saveShippingSettings(parsed.data) });
  } catch {
    return Response.json({ error: "Shipping settings could not be saved." }, { status: 500 });
  }
}
