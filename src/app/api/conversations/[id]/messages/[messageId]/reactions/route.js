import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getConversation } from "@/lib/server/chat";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👏", "💯", "🧶", "⭐"];

export async function POST(req, { params }) {
  const { id: conversationId, messageId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const limited = rateLimitGuard(`reaction:${user.uid}`, { limit: 60 });
  if (limited) return limited;

  const conv = await getConversation(conversationId, user.uid);
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";
  if (!emoji || !QUICK_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
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

  const reactions = msgSnap.data().reactions || {};
  const alreadyReacted = reactions[emoji]?.[user.uid];

  await msgRef.update({
    [`reactions.${emoji}.${user.uid}`]: alreadyReacted ? FieldValue.delete() : true,
  });

  const updatedSnap = await msgRef.get();
  const updatedReactions = updatedSnap.data().reactions || {};
  return NextResponse.json({ reactions: updatedReactions });
}
