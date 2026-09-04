import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const ROOM_MESSAGE_MAX = 2000;
export const ROOM_QUICK_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "🙏",
  "🔥",
  "🎉",
  "👏",
  "💯",
  "🧶",
  "⭐",
];

function toMillis(value) {
  if (!value) return 0;
  if (value.toMillis) return value.toMillis();
  return new Date(value).getTime();
}

function messagesRef(roomId) {
  return adminDb().collection("rooms").doc(roomId).collection("messages");
}

export async function getRoomForChat(roomId) {
  const doc = await adminDb().collection("rooms").doc(roomId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.status !== "active") return null;
  return { id: doc.id, ...data };
}

function decodeMessage(raw) {
  const data = raw.data ? raw.data() : raw;
  const reactions = {};
  for (const [emoji, byUids] of Object.entries(data.reactions || {})) {
    reactions[emoji] = Object.keys(byUids || {});
  }
  const replyTo = data.replyTo || null;
  const msg = {
    id: raw.id,
    userId: data.userId || data.senderId || "",
    userName: data.userName || "Member",
    userAvatar: data.userAvatar || "",
    role: data.role || "viewer",
    text: data.deleted ? "" : data.text || "",
    mentions: data.mentions || [],
    replyTo: replyTo
      ? {
          id: replyTo.id || "",
          text: replyTo.text || "",
          from: replyTo.from || "",
        }
      : null,
    reactions,
    pinned: !!data.pinned,
    pinnedAt: toMillis(data.pinnedAt),
    deleted: !!data.deleted,
    deletedAt: toMillis(data.deletedAt),
    createdAt: toMillis(data.createdAt) || Date.now(),
  };
  return msg;
}

export async function listRoomMessages(roomId, { before, limit = 50 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  let q = messagesRef(roomId).orderBy("createdAt", "desc");
  if (before) {
    const beforeTs = Number.isFinite(before) ? before : toMillis(before);
    q = q.endBefore(new Date(beforeTs));
  }
  q = q.limit(safeLimit + 1);
  const snap = await q.get();
  const docs = snap.docs;
  const hasMore = docs.length > safeLimit;
  const list = docs
    .slice(0, safeLimit)
    .map(decodeMessage)
    .sort((a, b) => a.createdAt - b.createdAt);
  return { messages: list, hasMore };
}

export async function addRoomMessage(roomId, sender, { text, mentions = [], replyTo = null }) {
  const room = await getRoomForChat(roomId);
  if (!room) return null;
  const clean = String(text || "").trim();
  if (!clean || clean.length > ROOM_MESSAGE_MAX) return null;
  const ref = await messagesRef(roomId).add({
    roomId,
    userId: sender.uid,
    userName: sender.name,
    userAvatar: sender.avatar || "",
    role: sender.role || "viewer",
    text: clean,
    mentions: Array.isArray(mentions)
      ? [...new Set(mentions.filter((m) => typeof m === "string" && m))]
      : [],
    replyTo: replyTo ? { id: replyTo.id || "", text: replyTo.text || "", from: replyTo.from || "" } : null,
    reactions: {},
    createdAt: new Date(),
  });
  return ref.id;
}

export async function toggleRoomReaction(roomId, messageId, uid, emoji) {
  if (!ROOM_QUICK_EMOJIS.includes(emoji)) {
    return { error: "Invalid emoji" };
  }
  const ref = messagesRef(roomId).doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Message not found" };
  const reactions = snap.data().reactions || {};
  const alreadyReacted = reactions[emoji]?.[uid];
  await ref.update({
    [`reactions.${emoji}.${uid}`]: alreadyReacted ? FieldValue.delete() : true,
  });
  const after = await ref.get();
  const decoded = {};
  for (const [e, byUids] of Object.entries(after.data().reactions || {})) {
    decoded[e] = Object.keys(byUids || {});
  }
  return { reactions: decoded };
}

export async function toggleRoomPin(roomId, messageId) {
  const ref = messagesRef(roomId).doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Message not found" };
  const isPinned = !!snap.data().pinned;
  await ref.update(
    isPinned
      ? { pinned: FieldValue.delete(), pinnedAt: FieldValue.delete() }
      : { pinned: true, pinnedAt: new Date() }
  );
  return { pinned: !isPinned };
}

export async function softDeleteRoomMessage(roomId, messageId) {
  const ref = messagesRef(roomId).doc(messageId);
  const snap = await ref.get();
  if (!snap.exists) return { error: "Message not found" };
  if (snap.data().deleted) return { deleted: true };
  await ref.update({
    deleted: true,
    deletedAt: new Date(),
    text: "",
  });
  return { deleted: true };
}

export async function listPinnedRoomMessages(roomId, limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const snap = await messagesRef(roomId)
    .where("pinned", "==", true)
    .orderBy("pinnedAt", "desc")
    .limit(safeLimit)
    .get();
  return snap.docs.map(decodeMessage);
}
