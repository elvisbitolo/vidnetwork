import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { addMessage, getConversation } from "@/lib/server/chat";
import { createNotification } from "@/lib/server/notifications";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/server/email";
import { logError } from "@/lib/server/log";

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
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const limited = rateLimitGuard(`message:${user.uid}`, { limit: 30 });
  if (limited) return limited;

  const MAX_ATTACHMENT_LENGTH = 700_000;
  const body = await req.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const attachment = body?.attachment || null;

  if (text.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  if (attachment) {
    if (
      typeof attachment !== "object" ||
      typeof attachment.dataUrl !== "string" ||
      !attachment.dataUrl
    ) {
      return NextResponse.json({ error: "Invalid attachment" }, { status: 400 });
    }
    if (attachment.dataUrl.length > MAX_ATTACHMENT_LENGTH) {
      return NextResponse.json(
        { error: "Attachment too large (max ~500 KB). Compress the file and try again." },
        { status: 400 }
      );
    }
    if (!text && !attachment.dataUrl) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
  } else if (!text) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const userDoc = await getUserDoc(user.uid);
  const senderName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";
  const messageId = await addMessage(
    conversationId,
    {
      uid: user.uid,
      name: senderName,
    },
    text,
    attachment
  );

  if (!messageId) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conv = await getConversation(conversationId, user.uid);
  if (conv && conv.type === "dm") {
    const otherId = (conv.participantIds || []).find((id) => id !== user.uid);
    if (otherId) {
      const otherSnap = await adminDb().collection("users").doc(otherId).get();
      if (otherSnap.exists) {
        const other = otherSnap.data();
        if (other.notifications !== "off") {
          const snippet = text || (attachment?.kind === "image" ? "📷 Photo" : `📎 ${attachment?.name || "File"}`);
          await createNotification({
            userId: otherId,
            type: "dm",
            actorId: user.uid,
            actorName: senderName,
            href: `/chat/${conversationId}`,
            text: snippet,
          }).catch((err) => {
            logError("notification.dm_failed", { conversationId, error: err.message });
          });
          if (other.email) {
            await sendEmail({
              to: other.email,
              subject: `New message from ${senderName}`,
              text:
                `${senderName} sent you a message:\n\n"${snippet}"\n\n` +
                `Reply in the community chat: ${process.env.NEXT_PUBLIC_APP_URL || ""}/chat/${conversationId}`,
            }).catch((err) => {
              logError("email.dm_notify_failed", { conversationId, error: err.message });
            });
          }
        }
      }
    }
  }

  return NextResponse.json({ id: messageId });
}
