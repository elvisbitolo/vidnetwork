import { adminDb } from "@/lib/firebase/admin";
import { videoChatRights } from "./plans";

const MONTH_KEY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export async function getVideoHoursUsed(uid) {
  const monthKey = MONTH_KEY();
  const doc = await adminDb()
    .collection("videoHours")
    .doc(`${uid}_${monthKey}`)
    .get();
  if (!doc.exists) return 0;
  return doc.data().hours || 0;
}

export async function recordVideoHours(uid, hours) {
  const monthKey = MONTH_KEY();
  const ref = adminDb().collection("videoHours").doc(`${uid}_${monthKey}`);
  await ref.set(
    {
      uid,
      monthKey,
      hours: adminDb.FieldValue.increment(hours),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function canJoinVideoRoom(uid, tier) {
  const rights = videoChatRights(tier);
  if (!rights.canJoin) return { allowed: false, reason: "Your membership doesn't include video chat access" };
  if (rights.monthlyHours === Infinity) return { allowed: true, remaining: Infinity };
  const used = await getVideoHoursUsed(uid);
  const remaining = Math.max(0, rights.monthlyHours - used);
  if (remaining <= 0) {
    return { allowed: false, reason: `You've used all ${rights.monthlyHours} video chat hours this month` };
  }
  return { allowed: true, remaining, used, total: rights.monthlyHours };
}

export async function canHostVideoRoom(uid, tier) {
  const rights = videoChatRights(tier);
  if (!rights.canHost) {
    return { allowed: false, reason: "Only Creator members can host video rooms" };
  }
  return { allowed: true };
}
