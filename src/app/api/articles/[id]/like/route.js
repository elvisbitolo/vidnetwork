import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitGuard(`article-like:${user.uid}`, { limit: 60 });
  if (limited) return limited;

  const ref = adminDb().collection("articles").doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = doc.data();
  const likes = data.likes || {};
  const already = Object.prototype.hasOwnProperty.call(likes, user.uid);
  const update = already
    ? { [`likes.${user.uid}`]: FieldValue.delete() }
    : { [`likes.${user.uid}`]: new Date() };

  await ref.update(update);

  const count = Object.keys(likes).length + (already ? -1 : 1);
  return NextResponse.json({ liked: !already, count });
}
