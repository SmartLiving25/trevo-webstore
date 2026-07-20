import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/admin-session";

export const runtime = "nodejs";

const orderSchema = z.object({
  orderNumber: z.string().min(8).max(40),
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
  items: z.array(z.object({
    productId: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    color: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
    unitPrice: z.number().int().min(0),
  })).min(1).max(30),
  subtotal: z.number().int().min(0),
  shipping: z.number().int().min(0),
  total: z.number().int().min(0),
  paymentStatus: z.enum(["pending_advance", "cod_advance_required"]),
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
    const allowedShipping = order.customer.delivery === "urgent"
      ? 500
      : calculatedSubtotal >= 1500
        ? 0
        : 250;

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
    const customerEmail = order.customer.email.toLowerCase();
    const customerId = createHash("sha256")
      .update(customerEmail)
      .digest("hex")
      .slice(0, 32);
    const orderReference = database.collection("orders").doc(id);
    const customerReference = database.collection("customers").doc(customerId);
    const savedOrder = {
      id,
      orderNumber: order.orderNumber,
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
      paymentStatus: order.paymentStatus,
      advanceAmount: order.customer.payment === "cod" ? 200 : order.total,
      status: "new",
      trackingCode: "",
      createdAt: now,
      updatedAt: now,
    };

    await database.runTransaction(async (transaction) => {
      const existingCustomer = await transaction.get(customerReference);
      const previous = existingCustomer.data();

      transaction.set(orderReference, savedOrder);
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
          orderNumber: order.orderNumber,
          status: "new",
          paymentStatus: order.paymentStatus,
        },
      },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { error: "Unable to create order." },
      { status: 500 },
    );
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
    status: z.enum([
      "new",
      "confirmed",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
    ]).optional(),
    paymentStatus: z.enum([
      "pending_advance",
      "cod_advance_required",
      "paid",
      "refunded",
    ]).optional(),
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
