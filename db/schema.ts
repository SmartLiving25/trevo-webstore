import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const productsTable = sqliteTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  collection: text("collection").notNull().default("Everyday"),
  description: text("description").notNull().default(""),
  material: text("material").notNull().default(""),
  price: integer("price").notNull(),
  compareAt: integer("compare_at"),
  stock: integer("stock").notNull().default(0),
  colorsJson: text("colors_json").notNull().default("[]"),
  sizesJson: text("sizes_json").notNull().default("[]"),
  imagesJson: text("images_json").notNull().default("[]"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ordersTable = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  notes: text("notes").notNull().default(""),
  itemsJson: text("items_json").notNull(),
  subtotal: integer("subtotal").notNull(),
  shipping: integer("shipping").notNull(),
  total: integer("total").notNull(),
  deliveryMethod: text("delivery_method").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  advanceAmount: integer("advance_amount").notNull().default(0),
  status: text("status").notNull().default("new"),
  trackingCode: text("tracking_code"),
  whatsappNotified: integer("whatsapp_notified", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customersTable = sqliteTable("customers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull().default(""),
  preferencesJson: text("preferences_json").notNull().default("{}"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: real("total_spent").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const paymentsTable = sqliteTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  provider: text("provider").notNull(),
  reference: text("reference"),
  amount: integer("amount").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  proofUrl: text("proof_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  verifiedAt: text("verified_at"),
});

export const inventoryEventsTable = sqliteTable("inventory_events", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  reason: text("reason").notNull(),
  orderId: text("order_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
