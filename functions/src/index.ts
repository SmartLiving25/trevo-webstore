import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";

initializeApp();
const db = getFirestore();

const itemSchema = z.object({ productId: z.string(), sku: z.string(), name: z.string(), color: z.string(), quantity: z.number().int().min(1).max(20), unitPrice: z.number().int().min(0) });
const orderSchema = z.object({
  customer: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(10), city: z.string().min(2), address: z.string().min(8), notes: z.string().max(500).optional(), delivery: z.enum(["standard", "urgent"]), payment: z.enum(["cod", "advance"]) }),
  items: z.array(itemSchema).min(1).max(30),
});

export const createOrder = onCall({ enforceAppCheck: true, region: "asia-south1" }, async (request) => {
  const parsed = orderSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Please check the order details.");
  const order = parsed.data;
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const shipping = 100;
  const total = subtotal + shipping;
  const orderNumber = `TRV-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const ref = db.collection("orders").doc();

  await db.runTransaction(async (transaction) => {
    const productRefs = order.items.map((item) => db.collection("products").doc(item.productId));
    const snapshots = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists || Number(snapshot.data()?.stock ?? 0) < order.items[index].quantity) throw new HttpsError("failed-precondition", `${order.items[index].name} is out of stock.`);
    });
    snapshots.forEach((snapshot, index) => transaction.update(snapshot.ref, { stock: FieldValue.increment(-order.items[index].quantity), updatedAt: FieldValue.serverTimestamp() }));
    transaction.create(ref, {
      orderNumber, customer: order.customer, userId: request.auth?.uid ?? null, items: order.items, subtotal, shipping, total,
      status: "new", paymentStatus: order.customer.payment === "cod" ? "cod" : "pending_advance",
      advanceAmount: order.customer.payment === "cod" ? 0 : total, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: ref.id, orderNumber, subtotal, shipping, total, status: "new" };
});

export const updateOrder = onCall({ enforceAppCheck: true, region: "asia-south1" }, async (request) => {
  if (request.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Admin access required.");
  const parsed = z.object({ id: z.string(), status: z.enum(["new", "confirmed", "packed", "shipped", "delivered", "cancelled"]).optional(), paymentStatus: z.enum(["pending_advance", "cod", "cod_advance_required", "paid", "refunded"]).optional(), trackingCode: z.string().max(100).optional() }).safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid order update.");
  const { id, ...updates } = parsed.data;
  await db.collection("orders").doc(id).update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const whatsappWebhook = onRequest({ region: "asia-south1" }, async (request, response) => {
  if (request.method === "GET") {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (request.query["hub.verify_token"] === verifyToken) {
      response.status(200).send(request.query["hub.challenge"]);
      return;
    }
    response.sendStatus(403);
    return;
  }
  const body = request.body;
  await db.collection("whatsappEvents").add({ body, receivedAt: FieldValue.serverTimestamp() });
  response.sendStatus(200);
});

export const paymentWebhook = onRequest({ region: "asia-south1" }, async (request, response) => {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!expected || request.headers["x-webhook-secret"] !== expected) {
    response.sendStatus(401);
    return;
  }
  const parsed = z.object({ orderId: z.string(), reference: z.string(), amount: z.number(), status: z.enum(["paid", "failed", "refunded"]) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid payload" });
    return;
  }
  await db.collection("orders").doc(parsed.data.orderId).update({ paymentStatus: parsed.data.status, paymentReference: parsed.data.reference, paidAmount: parsed.data.amount, updatedAt: FieldValue.serverTimestamp() });
  response.sendStatus(200);
});

export const createSignedImageUpload = onCall({ enforceAppCheck: true, region: "asia-south1" }, async (request) => {
  if (request.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Admin access required.");
  const parsed = z.object({ sku: z.string().regex(/^[A-Z0-9-]+$/), fileName: z.string(), contentType: z.string().startsWith("image/") }).safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid image metadata.");
  const path = `products/${parsed.data.sku}/${Date.now()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const [url] = await getStorage().bucket().file(path).getSignedUrl({ version: "v4", action: "write", expires: Date.now() + 10 * 60 * 1000, contentType: parsed.data.contentType });
  return { path, uploadUrl: url };
});
