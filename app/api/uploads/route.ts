import { getRuntimeEnv } from "../../../lib/runtime-env";

function allowed(request: Request) {
  const runtime = getRuntimeEnv();
  return runtime.ADMIN_API_KEY ? request.headers.get("x-admin-key") === runtime.ADMIN_API_KEY : Boolean(request.headers.get("oai-authenticated-user-email"));
}

export async function POST(request: Request) {
  if (!allowed(request)) return Response.json({ error: "Admin authentication required" }, { status: 401 });
  const runtime = getRuntimeEnv();
  if (!runtime.BUCKET) return Response.json({ error: "Image storage is not configured" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return Response.json({ error: "Only images are accepted" }, { status: 415 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Image must be smaller than 8 MB" }, { status: 413 });
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const key = `products/${crypto.randomUUID()}-${safeName}`;
  await runtime.BUCKET.put(key, file.stream() as unknown as import("@cloudflare/workers-types").ReadableStream, { httpMetadata: { contentType: file.type }, customMetadata: { originalName: file.name } });
  return Response.json({ key, url: `/api/uploads/${encodeURIComponent(key)}` }, { status: 201 });
}
