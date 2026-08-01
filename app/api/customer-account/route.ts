import { createHash } from "node:crypto";
import { z } from "zod";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().trim().max(100).optional().default(""),
  activity: z.enum(["register", "signin"]),
});

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

export async function POST(request: Request) {
  try {
    const token = bearerToken(request);
    if (!token) {
      return Response.json(
        { error: "Customer authentication required." },
        { status: 401 },
      );
    }

    const decoded = await getAdminAuth().verifyIdToken(token, true);
    const email = String(decoded.email || "").trim().toLowerCase();
    if (!email) {
      return Response.json(
        { error: "The customer account has no email address." },
        { status: 400 },
      );
    }

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "The customer profile is invalid." },
        { status: 400 },
      );
    }

    const database = getAdminFirestore();
    const customerId = createHash("sha256")
      .update(email)
      .digest("hex")
      .slice(0, 32);
    const reference = database.collection("customers").doc(customerId);
    const existing = await reference.get();
    const previous = existing.data() || {};
    const now = new Date().toISOString();
    const fallbackName = email.split("@")[0] || "Trevo customer";
    const name =
      parsed.data.name ||
      String(decoded.name || "").trim() ||
      String(previous.name || "").trim() ||
      fallbackName;

    await reference.set(
      {
        id: customerId,
        authUid: decoded.uid,
        email,
        name,
        phone: String(previous.phone || ""),
        city: String(previous.city || ""),
        registeredAccount: true,
        emailVerified: Boolean(decoded.email_verified),
        authProvider: decoded.firebase?.sign_in_provider || "password",
        totalOrders: Number(previous.totalOrders || 0),
        totalSpent: Number(previous.totalSpent || 0),
        accountCreatedAt:
          previous.accountCreatedAt ||
          (parsed.data.activity === "register" ? now : previous.createdAt || now),
        lastLoginAt: now,
        createdAt: previous.createdAt || now,
        updatedAt: now,
      },
      { merge: true },
    );

    return Response.json({ customer: { id: customerId, email, name } });
  } catch {
    return Response.json(
      { error: "The customer profile could not be saved." },
      { status: 401 },
    );
  }
}
