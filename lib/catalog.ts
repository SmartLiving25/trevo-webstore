export type ProductVariant = {
  id: string;
  color: string;
  colorHex: string;
  stock: number;
  images: string[];
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: "Crossbody" | "Tote Bags" | "Box Bags" | "Luxury Collection";
  collection: "Everyday" | "Luxury" | "Statement";
  price: number;
  compareAt?: number;
  colors: string[];
  sizes: string[];
  stock: number;
  badge?: string;
  description: string;
  material: string;
  images: string[];
  variants?: ProductVariant[];
  active?: boolean;
};

const fallbackSwatches = [
  "#939174",
  "#272622",
  "#e8e1d4",
  "#b98688",
  "#9f826a",
];

export function productVariants(product: Product): ProductVariant[] {
  if (product.variants?.length) return product.variants;
  return (product.colors.length ? product.colors : ["As shown"]).map(
    (color, index) => ({
      id: `${product.id}-${index + 1}`,
      color,
      colorHex: fallbackSwatches[index % fallbackSwatches.length],
      stock: product.stock,
      images: product.images,
    }),
  );
}

type ProductInput = Partial<Omit<Product, "category" | "collection" | "compareAt">> & {
  id: string;
  category?: string;
  collection?: string;
  compareAt?: number | null;
  [key: string]: unknown;
};

export function normalizeProduct(raw: ProductInput): Product {
  const variants =
    Array.isArray(raw.variants) && raw.variants.length
      ? raw.variants.map((variant, index) => ({
          id: String(variant.id || `${raw.id}-${index + 1}`),
          color: String(variant.color || `Variant ${index + 1}`),
          colorHex: /^#[0-9a-f]{6}$/i.test(String(variant.colorHex))
            ? String(variant.colorHex)
            : fallbackSwatches[index % fallbackSwatches.length],
          stock: Math.max(0, Number(variant.stock || 0)),
          images: Array.isArray(variant.images)
            ? variant.images.filter(Boolean).map(String)
            : [],
        }))
      : undefined;
  const images =
    variants
      ?.flatMap((variant) => variant.images)
      .filter((image, index, all) => all.indexOf(image) === index) ||
    (Array.isArray(raw.images) ? raw.images.filter(Boolean).map(String) : []);
  const colors =
    variants?.map((variant) => variant.color) ||
    (Array.isArray(raw.colors) && raw.colors.length
      ? raw.colors.map(String)
      : ["As shown"]);
  const stock =
    variants?.reduce((sum, variant) => sum + variant.stock, 0) ??
    Math.max(0, Number(raw.stock || 0));

  return {
    id: raw.id,
    sku: String(raw.sku || raw.id).toUpperCase(),
    name: String(raw.name || "Untitled product"),
    category: (raw.category || "Crossbody") as Product["category"],
    collection: (raw.collection || "Everyday") as Product["collection"],
    price: Math.max(0, Number(raw.price || 0)),
    compareAt: raw.compareAt ? Number(raw.compareAt) : undefined,
    colors,
    sizes:
      Array.isArray(raw.sizes) && raw.sizes.length
        ? raw.sizes.map(String)
        : ["One size"],
    stock,
    badge: raw.badge ? String(raw.badge) : undefined,
    description: String(
      raw.description || "Product details available on WhatsApp.",
    ),
    material: String(raw.material || "Material details available on WhatsApp"),
    images: images.length ? images : ["/images/trevo-hero.png"],
    variants,
    active: raw.active !== false,
  };
}

const productMaterial = "Material details available on WhatsApp";

export const products: Product[] = [
  {
    id: "pearl-grace-shoulder-bag",
    sku: "TRV-PC-001",
    name: "Pearl Grace Shoulder Bag",
    category: "Crossbody",
    collection: "Everyday",
    price: 1200,
    compareAt: 1400,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 4,
    badge: "Sale",
    description:
      "A graceful everyday shoulder bag with a refined silhouette that transitions easily from casual plans to polished outings.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_yd44sqyd44sqyd44%20%281%29.png",
    ],
  },
  {
    id: "trevo-aura-structured-satchel",
    sku: "TRV-ST-001",
    name: "Trevo Aura Structured Satchel",
    category: "Luxury Collection",
    collection: "Luxury",
    price: 4600,
    compareAt: 5800,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 2,
    badge: "Luxury edit",
    description:
      "A confident structured satchel selected for its elevated shape, polished presence and day-to-evening versatility.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/WhatsApp%20Image%202026-07-13%20at%2010.42.52%20PM.jpeg",
    ],
  },
  {
    id: "trevo-cloe-multi-compartment-wallet",
    sku: "TRV-WL-001",
    name: "Trevo Cloe Multi-Compartment Wallet",
    category: "Luxury Collection",
    collection: "Luxury",
    price: 3700,
    compareAt: 4700,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 3,
    badge: "Limited",
    description:
      "A polished multi-compartment wallet designed to keep cards, cash and daily essentials neatly organised.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/WhatsApp%20Image%202026-07-13%20at%2010.32.44%20PM.jpeg",
    ],
  },
  {
    id: "trevo-executive-office-tote",
    sku: "TRV-TT-001",
    name: "Trevo Executive Office Tote",
    category: "Tote Bags",
    collection: "Everyday",
    price: 2500,
    compareAt: 3000,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 2,
    badge: "Work edit",
    description:
      "A smart office tote with a professional profile and practical capacity for workday essentials.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_fqxdxifqxdxifqxd.png",
    ],
  },
  {
    id: "trevo-forever-young-phone-wallet",
    sku: "TRV-PB-001",
    name: "Trevo Forever Young Phone Wallet",
    category: "Crossbody",
    collection: "Everyday",
    price: 1500,
    compareAt: 2000,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 3,
    badge: "Limited",
    description:
      "A compact phone wallet that keeps your mobile, cards and small necessities comfortably within reach.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/WhatsApp%20Image%202026-07-13%20at%2010.33.06%20PM.jpeg",
    ],
  },
  {
    id: "trevo-heritage-printed-tote",
    sku: "TRV-PT-001",
    name: "Trevo Heritage Printed Tote",
    category: "Tote Bags",
    collection: "Everyday",
    price: 1200,
    compareAt: 1400,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 4,
    badge: "Sale",
    description:
      "An expressive printed tote that brings character and easy carrying space to relaxed everyday dressing.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_a5wgm3a5wgm3a5wg.png",
    ],
  },
  {
    id: "trevo-mandala-round-art-bag",
    sku: "TRV-RD-001",
    name: "Trevo Mandala Round Art Bag",
    category: "Crossbody",
    collection: "Statement",
    price: 1700,
    compareAt: 2000,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 3,
    badge: "Art edit",
    description:
      "A distinctive round crossbody bag featuring an artistic mandala-inspired look for statement styling.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_rw5t4rw5t4rw5t4r.png",
    ],
  },
  {
    id: "trevo-marble-ring-handle-bag",
    sku: "TRV-RG-001",
    name: "Trevo Marble Ring Handle Bag",
    category: "Box Bags",
    collection: "Statement",
    price: 1200,
    compareAt: 1400,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 4,
    badge: "Statement",
    description:
      "A compact box bag with a striking ring handle and marble-inspired visual character.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_8k3y198k3y198k3y.png",
    ],
  },
  {
    id: "trevo-monochrome-cow-print-tote",
    sku: "TRV-CW-001",
    name: "Trevo Monochrome Cow Print Tote",
    category: "Tote Bags",
    collection: "Statement",
    price: 2500,
    compareAt: 3000,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 2,
    badge: "Statement",
    description:
      "A monochrome statement tote with a bold print and practical shape for confident everyday looks.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_6k2zs46k2zs46k2z.png",
    ],
  },
  {
    id: "trevo-noor-mini-handbag",
    sku: "TRV-HJ-001",
    name: "Trevo Noor Mini Handbag",
    category: "Crossbody",
    collection: "Everyday",
    price: 1400,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 0,
    badge: "Sold out",
    description:
      "A compact mini handbag with a charming silhouette for carrying small essentials with ease.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_td0mxktd0mxktd0m.png",
    ],
  },
  {
    id: "trevo-pastel-premium-tote",
    sku: "TRV-DT-001",
    name: "Trevo Pastel Premium Tote",
    category: "Box Bags",
    collection: "Statement",
    price: 2200,
    compareAt: 2600,
    colors: ["As shown"],
    sizes: ["One size"],
    stock: 2,
    badge: "Premium edit",
    description:
      "A softly coloured premium tote with a structured box-inspired shape and polished visual finish.",
    material: productMaterial,
    images: [
      "https://raw.githubusercontent.com/SmartLiving25/trevo-by-fatima/main/images/Gemini_Generated_Image_qz0oddqz0oddqz0o.png",
    ],
  },
];

export const formatPKR = (value: number) =>
  `Rs. ${value.toLocaleString("en-PK")}`;
