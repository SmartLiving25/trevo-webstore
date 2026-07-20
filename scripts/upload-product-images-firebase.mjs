#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const arg = (name, fallback = "") => { const index = process.argv.indexOf(`--${name}`); return index >= 0 ? process.argv[index + 1] : fallback; };
const folder = resolve(arg("folder", "data/product-images"));
const servicePath = arg("service-account", process.env.GOOGLE_APPLICATION_CREDENTIALS || "");
const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
if (!bucketName) throw new Error("FIREBASE_STORAGE_BUCKET is required.");
const credential = servicePath ? cert(JSON.parse(readFileSync(resolve(servicePath), "utf8"))) : applicationDefault();
const app = getApps()[0] ?? initializeApp({ credential, storageBucket: bucketName });
const bucket = getStorage(app).bucket();
const db = getFirestore(app);
const contentTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

for (const skuFolder of readdirSync(folder)) {
  const directory = join(folder, skuFolder);
  if (!statSync(directory).isDirectory()) continue;
  const urls = [];
  for (const fileName of readdirSync(directory).sort()) {
    const extension = extname(fileName).toLowerCase();
    if (!contentTypes[extension]) continue;
    const destination = `products/${skuFolder.toUpperCase()}/${basename(fileName)}`;
    await bucket.upload(join(directory, fileName), { destination, metadata: { contentType: contentTypes[extension], cacheControl: "public,max-age=31536000" } });
    const file = bucket.file(destination);
    await file.makePublic();
    urls.push(`https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(destination).replaceAll("%2F", "/")}`);
  }
  const match = await db.collection("products").where("sku", "==", skuFolder.toUpperCase()).limit(1).get();
  if (!match.empty && urls.length) await match.docs[0].ref.update({ images: urls, updatedAt: FieldValue.serverTimestamp() });
  console.log(`${skuFolder}: ${urls.length} image(s)`);
}
