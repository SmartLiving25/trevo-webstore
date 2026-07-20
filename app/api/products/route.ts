import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/admin-session";

export const runtime = "nodejs";

const productSchema = z.object({
  sku: z.string().trim().min(3),
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  collection: z.string().trim().default("Everyday"),
  description: z.string().trim().min(10),
  material: z.string().trim().default(""),
  price: z.number().int().min(0),
  compareAt: z.number().int().min(0).nullable().optional(),
  stock: z.number().int().min(0),
  colors: z.array(z.string().trim()).min(1),
  sizes: z.array(z.string().trim()).min(1),
  images: z.array(z.string().url()).min(4).max(6),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const snapshot = await getAdminFirestore()
      .collection("products")
      .where("active", "==", true)
      .get();

    const products = snapshot.docs
      .map((document) => ({
        id: document.id,
       ...(document.data() as { name?: string; [key: string]: unknown }),
      }))
      .sort((a, b) =>
        String(a.name).localeCompare(String(b.name)),
      );

    return Response.json({ products });
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
          error: "Check all product details and provide 4 to 6 image URLs.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const id = `${parsed.data.sku
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;

    const product = {
      id,
      ...parsed.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await getAdminFirestore()
      .collection("products")
      .doc(id)
      .set(product);

    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json(
      { error: "The product could not be saved." },
      { status: 500 },
    );
  }
}
