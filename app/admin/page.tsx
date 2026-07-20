import { redirect } from "next/navigation";
import { getAdminSessionUser } from "@/lib/firebase/admin-session";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const adminUser = await getAdminSessionUser();

  if (!adminUser) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
