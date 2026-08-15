import { adminDb } from "@/lib/firebase/admin";
import { getRoom } from "@/lib/server/rooms";

const BATCH_LIMIT = 400;
export const ANNOUNCEMENT_MAX = 2000;

async function communityRecipients() {
  const snap = await adminDb().collection("users").limit(1000).get();
  return snap.docs
    .filter((doc) => !doc.data().suspended)
    .map((doc) => doc.id);
}

async function spaceRecipients(spaceId) {
  const snap = await adminDb()
    .collection("spaceMembers")
    .where("spaceId", "==", spaceId)
    .limit(1000)
    .get();
  return snap.docs.map((doc) => doc.data().userId);
}

async function groupRecipients(groupId) {
  const snap = await adminDb()
    .collection("groupMembers")
    .where("groupId", "==", groupId)
    .limit(1000)
    .get();
  return snap.docs.map((doc) => doc.data().userId);
}

async function roomRecipients(roomId) {
  const room = await getRoom(roomId);
  if (!room) return [];
  if (room.spaceId) return spaceRecipients(room.spaceId);
  if (room.groupId) return groupRecipients(room.groupId);
  return [];
}

export async function recipientsForScope({ scopeType, scopeId }) {
  if (scopeType === "community") return communityRecipients();
  if (scopeType === "space") return spaceRecipients(scopeId);
  if (scopeType === "group") return groupRecipients(scopeId);
  if (scopeType === "room") return roomRecipients(scopeId);
  return [];
}

export async function sendAnnouncement({
  scopeType,
  scopeId,
  message,
  href = "/dashboard",
  actorId = "",
  actorName = "",
}) {
  const text = typeof message === "string" ? message.trim().slice(0, ANNOUNCEMENT_MAX) : "";
  if (!text) throw Object.assign(new Error("Announcement message required"), { code: 400 });

  const uids = await recipientsForScope({ scopeType, scopeId });
  const db = adminDb();

  for (let i = 0; i < uids.length; i += BATCH_LIMIT) {
    const chunk = uids.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const userId of chunk) {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        userId,
        type: "announcement",
        actorId: actorId || "",
        actorName: actorName || "VidNetwork",
        targetId: scopeId || "",
        href,
        text,
        read: false,
        createdAt: new Date(),
      });
    }
    await batch.commit();
  }

  await db.collection("announcements").add({
    scopeType,
    scopeId: scopeId || "",
    message: text,
    sentCount: uids.length,
    actorId: actorId || "",
    createdAt: new Date(),
  });

  return { sentCount: uids.length };
}

export async function listAnnouncements(limit = 20) {
  const snap = await adminDb()
    .collection("announcements")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0,
    };
  });
}
