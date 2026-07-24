import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/admin-session";

export const runtime = "nodejs";

class InventoryError extends Error {}

const orderSchema = z.object({
  customer: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().max(160),
    phone: z.string().min(10).max(20),
    city: z.string().min(2).max(80),
    address: z.string().min(8).max(500),
    notes: z.string().max(500).optional().default(""),
    delivery: z.enum(["standard", "urgent"]),
    payment: z.enum(["cod", "advance"]),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        sku: z.string().min(1),
        name: z.string().min(1),
        color: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
        unitPrice: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(30),
  subtotal: z.number().int().min(0),
  shipping: z.number().int().min(0),
  total: z.number().int().min(0),
  paymentStatus: z.enum(["pending_advance", "cod", "cod_advance_required"]),
});

export async function GET() {
  const adminUser = await getAdminSessionUser();
  if (!adminUser) {
    return Response.json(
      { error: "Admin authentication required." },
      { status: 401 },
    );
  }

  try {
    const snapshot = await getAdminFirestore()
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const orders = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    return Response.json({ orders });
  } catch {
    return Response.json(
      { error: "Orders could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        {
          error: "Please check the submitted order details.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const order = parsed.data;
    const calculatedSubtotal = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const allowedShipping = 100;

    if (
      calculatedSubtotal !== order.subtotal ||
      allowedShipping !== order.shipping ||
      calculatedSubtotal + allowedShipping !== order.total
    ) {
      return Response.json(
        { error: "Order totals could not be verified." },
        { status: 400 },
      );
    }

    const database = getAdminFirestore();
    const id = randomUUID();
    const now = new Date().toISOString();
    const dateKey = now.slice(0, 10).replaceAll("-", "");
    const customerEmail = order.customer.email.toLowerCase();
    const customerId = createHash("sha256")
      .update(customerEmail)
      .digest("hex")
      .slice(0, 32);
    const orderReference = database.collection("orders").doc(id);
    const customerReference = database.collection("customers").doc(customerId);
    const counterReference = database
      .collection("counters")
      .doc(`orders-${dateKey}`);
    const productIds = [...new Set(order.items.map((item) => item.productId))];
    const productReferences = productIds.map((productId) =>
      database.collection("products").doc(productId),
    );
    let orderNumber = "";

    await database.runTransaction(async (transaction) => {
      const [existingCustomer, counterSnapshot, ...productSnapshots] =
        await Promise.all([
          transaction.get(customerReference),
          transaction.get(counterReference),
          ...productReferences.map((reference) => transaction.get(reference)),
        ]);
      const sequence = Number(counterSnapshot.data()?.value || 0) + 1;
      orderNumber = `TRV-${dateKey.slice(2)}-${String(sequence).padStart(4, "0")}`;
      const previous = existingCustomer.data();

      productSnapshots.forEach((productSnapshot, productIndex) => {
        if (!productSnapshot.exists) {
          throw new InventoryError(
            "A product in your cart is no longer available.",
          );
        }

        const product = productSnapshot.data() as Record<string, unknown>;
        if (product.active === false) {
          throw new InventoryError(
            `${String(product.name || "A product")} is no longer available.`,
          );
        }

        const requestedItems = order.items.filter(
          (item) => item.productId === productSnapshot.id,
        );
        const savedPrice = Number(product.price);
        if (
          !Number.isFinite(savedPrice) ||
          requestedItems.some((item) => item.unitPrice !== savedPrice)
        ) {
          throw new InventoryError(
            `The price of ${String(product.name || "a product")} has changed. Please refresh your cart.`,
          );
        }

        const requestedByColor = new Map<string, number>();
        requestedItems.forEach((item) => {
          const colorKey = item.color.trim().toLowerCase();
          requestedByColor.set(
            colorKey,
            (requestedByColor.get(colorKey) || 0) + item.quantity,
          );
        });

        const savedVariants = Array.isArray(product.variants)
          ? (product.variants as Array<Record<string, unknown>>)
          : [];
        let updatedStock = 0;
        let inventoryUpdate: Record<string, unknown>;

        if (savedVariants.length) {
          const matchedColors = new Set<string>();
          const updatedVariants = savedVariants.map((variant) => {
            const color = String(variant.color || "").trim();
            const colorKey = color.toLowerCase();
            const requestedQuantity = requestedByColor.get(colorKey) || 0;
            const currentStock = Math.max(0, Number(variant.stock || 0));

            if (requestedQuantity > 0) {
              matchedColors.add(colorKey);
              if (currentStock < requestedQuantity) {
                throw new InventoryError(
                  `${String(product.name || "This product")} in ${color} has only ${currentStock} left.`,
                );
              }
            }

            const remainingStock = currentStock - requestedQuantity;
            updatedStock += remainingStock;
            return { ...variant, stock: remainingStock };
          });

          const missingColor = [...requestedByColor.keys()].find(
            (color) => !matchedColors.has(color),
          );
          if (missingColor) {
            throw new InventoryError(
              `The selected colour for ${String(product.name || "a product")} is no longer available.`,
            );
          }

          inventoryUpdate = {
            variants: updatedVariants,
            stock: updatedStock,
            updatedAt: now,
          };
        } else {
          const requestedQuantity = requestedItems.reduce(
            (sum, item) => sum + item.quantity,
            0,
          );
          const currentStock = Math.max(0, Number(product.stock || 0));
          if (currentStock < requestedQuantity) {
            throw new InventoryError(
              `${String(product.name || "This product")} has only ${currentStock} left.`,
            );
          }
          inventoryUpdate = {
            stock: currentStock - requestedQuantity,
            updatedAt: now,
          };
        }

        transaction.update(productReferences[productIndex], inventoryUpdate);
      });

      const savedOrder = {
        id,
        orderNumber,
        customerName: order.customer.name,
        customerEmail,
        customerPhone: order.customer.phone,
        city: order.customer.city,
        address: order.customer.address,
        notes: order.customer.notes,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        deliveryMethod: order.customer.delivery,
        paymentMethod: order.customer.payment,
        paymentStatus:
          order.customer.payment === "cod" ? "cod" : "pending_advance",
        advanceAmount: order.customer.payment === "cod" ? 0 : order.total,
        status: "new",
        trackingCode: "",
        inventoryDeducted: true,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(orderReference, savedOrder);
      transaction.set(
        counterReference,
        { value: sequence, updatedAt: now },
        { merge: true },
      );
      transaction.set(customerReference, {
        id: customerId,
        email: customerEmail,
        name: order.customer.name,
        phone: order.customer.phone,
        city: order.customer.city,
        totalOrders: Number(previous?.totalOrders || 0) + 1,
        totalSpent: Number(previous?.totalSpent || 0) + order.total,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      });
    });

    return Response.json(
      {
        order: {
          id,
          orderNumber,
          status: "new",
          paymentStatus:
            order.customer.payment === "cod" ? "cod" : "pending_advance",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InventoryError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json({ error: "Unable to create order." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const adminUser = await getAdminSessionUser();
  if (!adminUser) {
    return Response.json(
      { error: "Admin authentication required." },
      { status: 401 },
    );
  }

  const updateSchema = z.object({
    id: z.string().min(1),
    status: z
      .enum(["new", "confirmed", "packed", "shipped", "delivered", "cancelled"])
      .optional(),
    paymentStatus: z
      .enum(["pending_advance", "cod", "cod_advance_required", "paid", "refunded"])
      .optional(),
    trackingCode: z.string().max(100).optional(),
  });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid order update." }, { status: 400 });
  }

  try {
    const { id, ...updates } = parsed.data;
    await getAdminFirestore()
      .collection("orders")
      .doc(id)
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      });

    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "Order could not be updated." },
      { status: 500 },
    );
  }
}
