import { getAdminSessionUser } from "@/lib/firebase/admin-session";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET() {
  const adminUser = await getAdminSessionUser();
  if (!adminUser) {
    return Response.json(
      { error: "Admin authentication required." },
      { status: 401 },
    );
  }

  try {
    const snapshot = await getAdminFirestore().collection("customers").get();
    const customers = snapshot.docs
      .map((document) => {
        const data = document.data();
        return {
          id: document.id,
          name: String(data.name || "Trevo customer"),
          email: String(data.email || ""),
          phone: String(data.phone || ""),
          city: String(data.city || ""),
          registeredAccount: Boolean(data.registeredAccount),
          emailVerified: Boolean(data.emailVerified),
          totalOrders: Number(data.totalOrders || 0),
          totalSpent: Number(data.totalSpent || 0),
          accountCreatedAt: String(data.accountCreatedAt || data.createdAt || ""),
          lastLoginAt: String(data.lastLoginAt || ""),
          updatedAt: String(data.updatedAt || data.createdAt || ""),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return Response.json({ customers });
  } catch {
    return Response.json(
      { error: "Customers could not be loaded." },
      { status: 500 },
    );
  }
}
