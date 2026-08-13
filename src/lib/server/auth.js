import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const AUTH_COOKIE = "community-auth";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    return await adminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }
}

export async function getUserDoc(uid) {
  const doc = await adminDb().collection("users").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}
