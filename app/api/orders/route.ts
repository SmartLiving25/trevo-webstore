import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../db";
import { customersTable, inventoryEventsTable, ordersTable } from "../../../db/schema";
import { getRuntimeEnv } from "../../../lib/runtime-env";

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

function adminAllowed(request: Request) {
  const runtime = getRuntimeEnv();
  const configured = runtime.ADMIN_API_KEY;
  if (configured) return request.headers.get("x-admin-key") === configured;
  return Boolean(request.headers.get("oai-authenticated-user-email"));
}

export async function GET(request: Request) {
  if (!adminAllowed(request)) return Response.json({ error: "Admin authentication required" }, { status: 401 });
  try {
    const rows = await getDb().select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
    return Response.json({ orders: rows.map((row) => ({ ...row, items: JSON.parse(row.itemsJson) })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Please check the submitted order details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    const order = parsed.data;
    const calculatedSubtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const allowedShipping = order.customer.delivery === "urgent" ? 500 : calculatedSubtotal >= 1500 ? 0 : 250;
    if (calculatedSubtotal !== order.subtotal || allowedShipping !== order.shipping || calculatedSubtotal + allowedShipping !== order.total) {
      return Response.json({ error: "Order totals could not be verified" }, { status: 400 });
    }
    const db = getDb();
    const id = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    await db.insert(ordersTable).values({
      id,
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerEmail: order.customer.email.toLowerCase(),
      customerPhone: order.customer.phone,
      city: order.customer.city,
      address: order.customer.address,
      notes: order.customer.notes,
      itemsJson: JSON.stringify(order.items),
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      deliveryMethod: order.customer.delivery,
      paymentMethod: order.customer.payment,
      paymentStatus: order.paymentStatus,
      advanceAmount: order.customer.payment === "cod" ? 200 : order.total,
    });
    const existing = await db.select().from(customersTable).where(eq(customersTable.email, order.customer.email.toLowerCase())).limit(1);
    if (!existing.length) {
      await db.insert(customersTable).values({ id: customerId, email: order.customer.email.toLowerCase(), name: order.customer.name, phone: order.customer.phone, city: order.customer.city, totalOrders: 1, totalSpent: order.total });
    } else {
      await db.update(customersTable).set({ name: order.customer.name, phone: order.customer.phone, city: order.customer.city, totalOrders: existing[0].totalOrders + 1, totalSpent: existing[0].totalSpent + order.total, updatedAt: new Date().toISOString() }).where(eq(customersTable.id, existing[0].id));
    }
    await db.insert(inventoryEventsTable).values(order.items.map((item) => ({ id: crypto.randomUUID(), productId: item.productId, quantityChange: -item.quantity, reason: "order_reserved", orderId: id })));
    return Response.json({ order: { id, orderNumber: order.orderNumber, status: "new", paymentStatus: order.paymentStatus } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create order";
    return Response.json({ error: message }, { status: message.includes("UNIQUE") ? 409 : 500 });
  }
}

export async function PATCH(request: Request) {
  if (!adminAllowed(request)) return Response.json({ error: "Admin authentication required" }, { status: 401 });
  const schema = z.object({ id: z.string().min(1), status: z.enum(["new", "confirmed", "packed", "shipped", "delivered", "cancelled"]).optional(), paymentStatus: z.enum(["pending_advance", "cod_advance_required", "paid", "refunded"]).optional(), trackingCode: z.string().max(100).optional() });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid order update" }, { status: 400 });
  const { id, ...updates } = parsed.data;
  await getDb().update(ordersTable).set({ ...updates, updatedAt: new Date().toISOString() }).where(eq(ordersTable.id, id));
  return Response.json({ ok: true });
}
