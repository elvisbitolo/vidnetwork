import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getConversation } from "@/lib/server/chat";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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

  const snap = await adminDb()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .where("pinned", "==", true)
    .orderBy("pinnedAt", "desc")
    .limit(10)
    .get();

  const messages = snap.docs.map((doc) => ({
    id: doc.id,
    senderId: doc.data().senderId,
    senderName: doc.data().senderName,
    pinnedAt: doc.data().pinnedAt
      ? doc.data().pinnedAt.toMillis?.() || doc.data().pinnedAt
      : 0,
  }));
  return NextResponse.json({ messages });
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
  const limited = rateLimitGuard(`pin:${user.uid}`, { limit: 30 });
  if (limited) return limited;

  const conv = await getConversation(conversationId, user.uid);
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  if (!messageId) {
    return NextResponse.json({ error: "messageId required" }, { status: 400 });
  }

  const msgRef = adminDb()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .doc(messageId);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const isPinned = !!msgSnap.data().pinned;
  await msgRef.update(
    isPinned
      ? { pinned: FieldValue.delete(), pinnedAt: FieldValue.delete() }
      : { pinned: true, pinnedAt: new Date() }
  );

  return NextResponse.json({ pinned: !isPinned });
}
