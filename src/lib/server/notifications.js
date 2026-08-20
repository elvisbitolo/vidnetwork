import { adminDb } from "@/lib/firebase/admin";

export async function createNotification({
  userId,
  type,
  actorId,
  actorName,
  targetId,
  href,
  text,
}) {
  await adminDb().collection("notifications").add({
    userId,
    type,
    actorId,
    actorName,
    targetId: targetId || "",
    href: href || "",
    text,
    read: false,
    createdAt: new Date(),
  });
}

export async function listNotifications(uid, limit = 50) {
  const snap = await adminDb()
    .collection("notifications")
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function markNotificationRead(id, uid) {
  const ref = adminDb().collection("notifications").doc(id);
  await ref.update({ read: true, readAt: new Date() }).catch(() => {});
  return true;
}
