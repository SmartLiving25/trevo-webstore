import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase/admin";

export const ADMIN_SESSION_COOKIE = "trevo_admin_session";

export async function getAdminSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const adminUid = process.env.FIREBASE_ADMIN_UID;

  if (!sessionCookie || !adminUid) {
    return null;
  }

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(
      sessionCookie,
      true,
    );

    if (decodedToken.uid !== adminUid) {
      return null;
    }

    return decodedToken;
  } catch {
    return null;
  }
}
