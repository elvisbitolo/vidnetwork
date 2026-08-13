import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const AUTH_COOKIE = "community-auth";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE)?.value;
  if (!sessionCookie) return null;

  let user;
  try {
    user = await adminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return null;
  }

  const doc = await adminDb().collection("users").doc(user.uid).get();
  if (doc.exists && doc.data().suspended) {
    return null;
  }

  return user;
}

export async function getUserDoc(uid) {
  const doc = await adminDb().collection("users").doc(uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export function canModerate(userDoc) {
  return ["owner", "moderator"].includes(userDoc?.role);
}

export function isOwner(userDoc) {
  return userDoc?.role === "owner";
}
