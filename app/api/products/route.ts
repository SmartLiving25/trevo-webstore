import { asc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { productsTable } from "../../../db/schema";
import { getRuntimeEnv } from "../../../lib/runtime-env";

const productSchema = z.object({
  id: z.string().min(1), sku: z.string().min(3), name: z.string().min(2), category: z.string().min(2), collection: z.string().default("Everyday"),
  description: z.string().default(""), material: z.string().default(""), price: z.number().int().min(0), compareAt: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0), colors: z.array(z.string()).min(1), sizes: z.array(z.string()).min(1), images: z.array(z.string()).min(1), active: z.boolean().default(true),
});

function adminAllowed(request: Request) {
  const runtime = getRuntimeEnv();
  return runtime.ADMIN_API_KEY ? request.headers.get("x-admin-key") === runtime.ADMIN_API_KEY : Boolean(request.headers.get("oai-authenticated-user-email"));
}

export async function GET() {
  try {
    const rows = await getDb().select().from(productsTable).orderBy(asc(productsTable.name));
    return Response.json({ products: rows.map((row) => ({ ...row, colors: JSON.parse(row.colorsJson), sizes: JSON.parse(row.sizesJson), images: JSON.parse(row.imagesJson) })) });
  } catch {
    return Response.json({ products: [], setupRequired: true });
  }
}

export async function POST(request: Request) {
  if (!adminAllowed(request)) return Response.json({ error: "Admin authentication required" }, { status: 401 });
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid product data", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const product = parsed.data;
  await getDb().insert(productsTable).values({ ...product, compareAt: product.compareAt ?? null, colorsJson: JSON.stringify(product.colors), sizesJson: JSON.stringify(product.sizes), imagesJson: JSON.stringify(product.images) });
  return Response.json({ product }, { status: 201 });
}
