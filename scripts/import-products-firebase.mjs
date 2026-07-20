#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

function readArgument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index], next = text[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field.trim()); field = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const headerAliases = {
  "SKU": "sku",
  "Product Name": "name",
  "Category": "category",
  "Regular Price": "compare_at",
  "Sale Price": "price",
  "Stock": "stock",
  "Image URL": "images",
};

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [headerAliases[key] || key.trim().toLowerCase().replaceAll(" ", "_"), value]));
}

const filePath = resolve(readArgument("file", "data/products.sample.csv"));
const dryRun = process.argv.includes("--dry-run");
const records = parseCsv(readFileSync(filePath, "utf8")).map(normalizeRow);

const required = ["sku", "name", "category", "price", "stock", "images"];
const products = records.map((row, index) => {
  const missing = required.filter((key) => !row[key]);
  if (missing.length) throw new Error(`CSV row ${index + 2} is missing: ${missing.join(", ")}`);
  const price = Number(row.price), stock = Number(row.stock), regularPrice = row.compare_at ? Number(row.compare_at) : null;
  const compareAt = regularPrice && regularPrice > price ? regularPrice : null;
  if (!Number.isFinite(price) || !Number.isInteger(stock)) throw new Error(`CSV row ${index + 2} has an invalid price or stock value.`);
  return {
    id: row.id || slugify(`${row.sku}-${row.name}`), sku: row.sku.trim().toUpperCase(), name: row.name.trim(), category: row.category.trim(),
    collection: row.collection?.trim() || "Everyday", description: row.description?.trim() || "", material: row.material?.trim() || "",
    price, compareAt, stock, colors: (row.colors || "As shown").split("|").map((item) => item.trim()).filter(Boolean), sizes: (row.sizes || "One size").split("|").map((item) => item.trim()).filter(Boolean),
    images: row.images.split("|").map((item) => item.trim()).filter(Boolean), badge: stock === 0 ? "Sold out" : row.badge?.trim() || null, active: row.active?.toLowerCase() !== "false",
  };
});

if (dryRun) {
  console.log(JSON.stringify({ valid: true, file: filePath, products: products.length, skus: products.map((product) => product.sku) }, null, 2));
  process.exit(0);
}

const serviceAccountPath = readArgument("service-account", process.env.GOOGLE_APPLICATION_CREDENTIALS || "");
const credentials = serviceAccountPath ? cert(JSON.parse(readFileSync(resolve(serviceAccountPath), "utf8"))) : applicationDefault();
const app = getApps()[0] ?? initializeApp({ credential: credentials, storageBucket: process.env.FIREBASE_STORAGE_BUCKET });
const db = getFirestore(app);

let batch = db.batch(), operations = 0, imported = 0;
for (const product of products) {
  const { id, ...data } = product;
  batch.set(db.collection("products").doc(id), { ...data, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
  operations += 1;
  if (operations === 400) { await batch.commit(); batch = db.batch(); operations = 0; }
  imported += 1;
}
if (operations) await batch.commit();
console.log(JSON.stringify({ success: true, imported, collection: "products" }, null, 2));
