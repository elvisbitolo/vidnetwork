import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getConversation } from "@/lib/server/chat";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const TYPING_WINDOW_MS = 5000;

export async function GET(req, { params }) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const conv = await getConversation(conversationId, user.uid);
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const cutoff = new Date(Date.now() - TYPING_WINDOW_MS);
  const snap = await adminDb()
    .collection("typing")
    .where("conversationId", "==", conversationId)
    .where("lastTypedAt", ">=", cutoff)
    .get();

  const names = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.userId !== user.uid) {
      names.push(d.userName || "Someone");
    }
  }
  return NextResponse.json({ typing: names });
}

export async function POST(req, { params }) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const limited = rateLimitGuard(`typing:${user.uid}`, { limit: 30 });
  if (limited) return limited;

  const conv = await getConversation(conversationId, user.uid);
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const docId = `${conversationId}_${user.uid}`;
  const userDoc = await getUserDoc(user.uid);
  const userName = userDoc?.name || user.name || user.email?.split("@")[0] || "Someone";
  await adminDb().collection("typing").doc(docId).set(
    {
      conversationId,
      userId: user.uid,
      userName,
      lastTypedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
