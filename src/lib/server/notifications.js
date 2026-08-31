import { adminDb } from "@/lib/firebase/admin";

const NOTIFICATION_TYPE_TO_PREF = {
  comment: "feed",
  like: "feed",
  mention: "mentions",
  chat: "chat",
  event_reminder: "events",
  event_rsvp: "events",
  space_activity: "feed",
  follow: "feed",
  automation: "automations",
  digest: "automations",
};

async function shouldNotify(userId, type) {
  const prefKey = NOTIFICATION_TYPE_TO_PREF[type];
  if (!prefKey) return true;
  const doc = await adminDb().collection("users").doc(userId).get();
  const prefs = doc.exists ? doc.data().notificationPreferences : null;
  if (!prefs) return true;
  return prefs[prefKey] !== false;
}

export async function createNotification({
  userId,
  type,
  actorId,
  actorName,
  targetId,
  href,
  text,
}) {
  const enabled = await shouldNotify(userId, type);
  if (!enabled) return;

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
