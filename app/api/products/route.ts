import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/admin-session";
import { normalizeProduct } from "@/lib/catalog";

export const runtime = "nodejs";

const variantSchema = z.object({
  id: z.string().trim().min(1).optional(),
  color: z.string().trim().min(1),
  colorHex: z.string().regex(/^#[0-9a-f]{6}$/i),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).min(1).max(6),
});

const productSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sku: z.string().trim().min(3),
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  collection: z.string().trim().default("Everyday"),
  description: z.string().trim().min(10),
  material: z.string().trim().default(""),
  price: z.number().int().min(0),
  compareAt: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0).optional(),
  colors: z.array(z.string().trim()).min(1).optional(),
  sizes: z.array(z.string().trim()).min(1),
  images: z.array(z.string().url()).max(36).optional(),
  variants: z.array(variantSchema).min(1).max(8),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const snapshot = await getAdminFirestore().collection("products").get();

    const allProducts = snapshot.docs.map((document) =>
      normalizeProduct({
        id: document.id,
        ...(document.data() as Record<string, unknown>),
      }),
    );
    const products = allProducts
      .filter((product) => product.active !== false)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    const inactiveIds = allProducts
      .filter((product) => product.active === false)
      .map((product) => product.id);
    return Response.json({ products, inactiveIds });
  } catch {
    return Response.json(
      { error: "Products could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const adminUser = await getAdminSessionUser();

  if (!adminUser) {
    return Response.json(
      { error: "Admin authentication required." },
      { status: 401 },
    );
  }

  try {
    const parsed = productSchema.safeParse(await request.json());

    if (!parsed.success) {
      return Response.json(
        {
          error: "Check the product, variants, colours, stock and image URLs.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const id =
      parsed.data.id ||
      parsed.data.sku
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const variants = parsed.data.variants.map((variant, index) => ({
      ...variant,
      id: variant.id || `${id}-variant-${index + 1}`,
    }));
    const images = variants
      .flatMap((variant) => variant.images)
      .filter((image, index, all) => all.indexOf(image) === index);
    if (images.length < 4) {
      return Response.json(
        { error: "Add at least 4 product images across the variants." },
        { status: 400 },
      );
    }

    const product = {
      id,
      ...parsed.data,
      variants,
      colors: variants.map((variant) => variant.color),
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await getAdminFirestore()
      .collection("products")
      .doc(id)
      .set(product, { merge: true });

    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json(
      { error: "The product could not be saved." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const adminUser = await getAdminSessionUser();
  if (!adminUser)
    return Response.json(
      { error: "Admin authentication required." },
      { status: 401 },
    );
  try {
    const parsed = productSchema.safeParse(await request.json());
    if (!parsed.success || !parsed.data.id) {
      return Response.json(
        {
          error: "Invalid product update.",
          fields: parsed.success
            ? undefined
            : parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const variants = parsed.data.variants.map((variant, index) => ({
      ...variant,
      id: variant.id || `${parsed.data.id}-variant-${index + 1}`,
    }));
    const images = variants
      .flatMap((variant) => variant.images)
      .filter((image, index, all) => all.indexOf(image) === index);
    if (images.length < 4)
      return Response.json(
        { error: "Add at least 4 product images across the variants." },
        { status: 400 },
      );
    const product = {
      ...parsed.data,
      id: parsed.data.id,
      variants,
      colors: variants.map((variant) => variant.color),
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      images,
      active: true,
      updatedAt: new Date().toISOString(),
    };
    await getAdminFirestore()
      .collection("products")
      .doc(parsed.data.id)
      .set(product, { merge: true });
    return Response.json({ product: normalizeProduct(product) });
  } catch {
    return Response.json(
      { error: "The product could not be updated." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const adminUser = await getAdminSessionUser();
  if (!adminUser)
    return Response.json(
      { error: "Admin authentication required." },
      { status: 401 },
    );
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return Response.json(
        { error: "Product ID is required." },
        { status: 400 },
      );
    await getAdminFirestore()
      .collection("products")
      .doc(id)
      .set(
        { id, active: false, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "The product could not be deleted." },
      { status: 500 },
    );
  }
}
