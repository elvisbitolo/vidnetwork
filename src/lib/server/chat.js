import { adminDb } from "@/lib/firebase/admin";
import { encryptText, decryptText } from "@/lib/server/crypto";

export async function getOrCreateDm(uid, otherId) {
  if (!otherId) return null;
  const ids = [uid, otherId].sort();
  const snap = await adminDb()
    .collection("conversations")
    .where("type", "==", "dm")
    .where("participantIds", "==", ids)
    .limit(1)
    .get();
  if (!snap.empty) {
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }
  const ref = await adminDb().collection("conversations").add({
    type: "dm",
    participantIds: ids,
    name: "",
    groupId: "",
    createdBy: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessage: "",
    lastMessageAt: null,
  });
  return { id: ref.id, type: "dm", participantIds: ids };
}

export async function getOrCreateGroupChat(uid, groupId) {
  if (!groupId) return null;
  const snap = await adminDb()
    .collection("conversations")
    .where("type", "==", "group")
    .where("groupId", "==", groupId)
    .limit(1)
    .get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    const data = doc.data();
    if (!data.participantIds.includes(uid)) {
      await doc.ref.update({
        participantIds: [...new Set([...data.participantIds, uid])],
        updatedAt: new Date(),
      });
      return { id: doc.id, ...data, participantIds: [...data.participantIds, uid] };
    }
    return { id: doc.id, ...data };
  }
  const groupSnap = await adminDb().collection("groups").doc(groupId).get();
  if (!groupSnap.exists) return null;
  const group = groupSnap.data();
  const membersSnap = await adminDb()
    .collection("groupMembers")
    .where("groupId", "==", groupId)
    .get();
  const participantIds = [uid, ...membersSnap.docs.map((d) => d.data().userId)];
  const ref = await adminDb().collection("conversations").add({
    type: "group",
    participantIds: [...new Set(participantIds)],
    name: group.name,
    groupId,
    createdBy: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessage: "",
    lastMessageAt: null,
  });
  return { id: ref.id, type: "group", name: group.name, groupId };
}

export async function syncGroupChatParticipants(groupId, participantIds) {
  const snap = await adminDb()
    .collection("conversations")
    .where("type", "==", "group")
    .where("groupId", "==", groupId)
    .limit(1)
    .get();
  if (snap.empty) return;
  const doc = snap.docs[0];
  const data = doc.data();
  const next = [...new Set(participantIds)];
  if (JSON.stringify(data.participantIds) !== JSON.stringify(next)) {
    await doc.ref.update({ participantIds: next, updatedAt: new Date() });
  }
}

export async function getOrCreateSpaceChat(uid, spaceId) {
  if (!spaceId) return null;
  const snap = await adminDb()
    .collection("conversations")
    .where("type", "==", "space")
    .where("spaceId", "==", spaceId)
    .limit(1)
    .get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    const data = doc.data();
    if (!data.participantIds.includes(uid)) {
      await doc.ref.update({
        participantIds: [...new Set([...data.participantIds, uid])],
        updatedAt: new Date(),
      });
      return { id: doc.id, ...data, participantIds: [...data.participantIds, uid] };
    }
    return { id: doc.id, ...data };
  }
  const spaceSnap = await adminDb().collection("spaces").doc(spaceId).get();
  if (!spaceSnap.exists) return null;
  const space = spaceSnap.data();
  const membersSnap = await adminDb()
    .collection("spaceMembers")
    .where("spaceId", "==", spaceId)
    .get();
  const participantIds = [uid, ...membersSnap.docs.map((d) => d.data().userId)];
  const ref = await adminDb().collection("conversations").add({
    type: "space",
    participantIds: [...new Set(participantIds)],
    name: space.name,
    spaceId,
    createdBy: uid,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessage: "",
    lastMessageAt: null,
  });
  return { id: ref.id, type: "space", name: space.name, spaceId };
}

export async function syncSpaceChatParticipants(spaceId, participantIds) {
  const snap = await adminDb()
    .collection("conversations")
    .where("type", "==", "space")
    .where("spaceId", "==", spaceId)
    .limit(1)
    .get();
  if (snap.empty) return;
  const doc = snap.docs[0];
  const data = doc.data();
  const next = [...new Set(participantIds)];
  if (JSON.stringify(data.participantIds) !== JSON.stringify(next)) {
    await doc.ref.update({ participantIds: next, updatedAt: new Date() });
  }
}

export async function listConversations(uid) {
  const snap = await adminDb()
    .collection("conversations")
    .where("participantIds", "array-contains", uid)
    .get();
  const ids = uniqueIds(
    snap.docs.flatMap((d) => (d.data().participantIds || []).filter((id) => id !== uid))
  );
  const names = await loadNames(ids);
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const title = data.type === "dm"
        ? data.participantIds.filter((id) => id !== uid)[0] || "Chat"
        : data.name || "Group chat";
      return {
        id: doc.id,
        type: data.type,
        title: names[title] || title,
        groupId: data.groupId || "",
        lastMessage: data.lastMessageEnc ? decryptText(data.lastMessage) : data.lastMessage || "",
        lastMessageAt: data.lastMessageAt
          ? data.lastMessageAt.toMillis
            ? data.lastMessageAt.toMillis()
            : new Date(data.lastMessageAt).getTime()
          : 0,
        updatedAt: data.updatedAt
          ? data.updatedAt.toMillis
            ? data.updatedAt.toMillis()
            : new Date(data.updatedAt).getTime()
          : 0,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getConversation(id, uid) {
  const doc = await adminDb().collection("conversations").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data.participantIds.includes(uid)) return null;
  const ids = uniqueIds((data.participantIds || []).filter((id) => id !== uid));
  const names = await loadNames(ids);
  return {
    id: doc.id,
    ...data,
    lastMessage: data.lastMessageEnc ? decryptText(data.lastMessage) : data.lastMessage || "",
    participantIds: data.participantIds,
    title: data.type === "dm"
      ? names[data.participantIds.filter((v) => v !== uid)[0]] || "Chat"
      : data.name || "Group chat",
    createdAt: data.createdAt?.toMillis?.() || new Date(data.createdAt || 0).getTime(),
  };
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))].slice(0, 100);
}

async function loadNames(ids) {
  const names = {};
  if (ids.length === 0) return names;
  const db = adminDb();
  const refs = ids.map((id) => db.collection("users").doc(id));
  const snaps = await db.getAll(...refs);
  snaps.forEach((snap, i) => {
    if (snap.exists) names[ids[i]] = snap.data().name || "Member";
  });
  return names;
}

export async function listMessages(conversationId, limitCount = 200) {
  const snap = await adminDb()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      const readBy = {};
      for (const [uid, ts] of Object.entries(data.readBy || {})) {
        readBy[uid] = ts?.toMillis?.() ?? (Number(ts) || 0);
      }
      const msg = {
        id: doc.id,
        ...data,
        readBy,
        createdAt: data.createdAt?.toMillis
          ? data.createdAt.toMillis()
          : new Date(data.createdAt || 0).getTime(),
      };
      msg.text = decryptText(msg.text);
      if (msg.attachment && typeof msg.attachment.dataUrl === "string") {
        msg.attachment = { ...msg.attachment, dataUrl: decryptText(msg.attachment.dataUrl) };
      }
      return msg;
    })
    .reverse();
}

export async function addMessage(conversationId, sender, text, attachment = null, parentId = null) {
  const convRef = adminDb().collection("conversations").doc(conversationId);
  const convDoc = await convRef.get();
  if (!convDoc.exists) return null;
  const conv = convDoc.data();
  if (!conv.participantIds.includes(sender.uid)) return null;

  const message = {
    conversationId,
    senderId: sender.uid,
    senderName: sender.name,
    text: encryptText(text),
    createdAt: new Date(),
    readBy: {},
    parentId: parentId || null,
    replyCount: 0,
  };
  if (attachment) {
    message.attachment = {
      name: String(attachment.name || "").slice(0, 120),
      mime: String(attachment.mime || "").slice(0, 100),
      kind: attachment.kind === "image" ? "image" : "file",
      size: Number.isFinite(attachment.size) && attachment.size > 0
        ? Math.round(attachment.size)
        : 0,
      dataUrl: encryptText(attachment.dataUrl),
    };
    message.hasAttachment = true;
  }
  const ref = await convRef.collection("messages").add(message);

  const preview =
    text ||
    (attachment?.kind === "image"
      ? "📷 Photo"
      : attachment?.name
        ? `📎 ${attachment.name}`
        : "");
  await convRef.update({
    lastMessage: encryptText(preview),
    lastMessageEnc: true,
    lastMessageAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

export async function markConversationRead(conversationId, uid) {
  const convRef = adminDb().collection("conversations").doc(conversationId);
  const convDoc = await convRef.get();
  if (!convDoc.exists) return false;
  const conv = convDoc.data();
  if (!conv.participantIds.includes(uid)) return false;

  const snap = await convRef
    .collection("messages")
    .where("senderId", "!=", uid)
    .get();
  for (const msg of snap.docs) {
    const data = msg.data();
    const readBy = { ...(data.readBy || {}) };
    if (!readBy[uid]) {
      readBy[uid] = new Date();
      await msg.ref.update({ readBy });
    }
  }
  return true;
}

export async function unreadCount(uid) {
  const convs = await listConversations(uid);
  let count = 0;
  for (const conv of convs) {
    const doc = await adminDb().collection("conversations").doc(conv.id).get();
    const data = doc.data();
    const snap = await doc.ref
      .collection("messages")
      .where("senderId", "!=", uid)
      .limit(50)
      .get();
    for (const msg of snap.docs) {
      const readBy = msg.data().readBy || {};
      if (!readBy[uid]) count++;
    }
    void data;
  }
  return count;
}
