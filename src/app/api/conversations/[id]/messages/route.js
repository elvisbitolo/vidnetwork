import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { addMessage, getConversation } from "@/lib/server/chat";

export async function GET(req, { params }) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const conv = await getConversation(conversationId, user.uid);
  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  const { listMessages } = await import("@/lib/server/chat");
  const messages = await listMessages(conversationId);
  return NextResponse.json({ messages });
}

export async function POST(req, { params }) {
  const { id: conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (text.trim().length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const userDoc = await getUserDoc(user.uid);
  const messageId = await addMessage(conversationId, {
    uid: user.uid,
    name: userDoc?.name || user.name || user.email?.split("@")[0] || "Member",
  }, text.trim());

  if (!messageId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  return NextResponse.json({ id: messageId });
}
