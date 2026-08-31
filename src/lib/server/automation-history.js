import { adminDb } from "@/lib/firebase/admin";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function recordAutomationRun({ automationId, trigger, action, targetUserId, success, error }) {
  const ref = adminDb().collection("automationHistory").doc();
  await ref.set({
    automationId,
    trigger: trigger || "",
    action: action || "",
    targetUserId: targetUserId || "",
    success: !!success,
    error: error || "",
    ranAt: new Date(),
  });
  return { id: ref.id };
}

export async function listAutomationRuns(automationId, limit = 25) {
  const snap = await adminDb()
    .collection("automationHistory")
    .where("automationId", "==", automationId)
    .orderBy("ranAt", "desc")
    .limit(Math.max(1, Math.min(Number(limit) || 25, 100)))
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      ranAt: toMillis(data.ranAt),
    };
  });
}

export async function getAutomationStats(automationId) {
  const snap = await adminDb()
    .collection("automationHistory")
    .where("automationId", "==", automationId)
    .get();
  let total = 0;
  let success = 0;
  let failed = 0;
  let lastRun = 0;
  snap.docs.forEach((doc) => {
    const data = doc.data();
    total += 1;
    if (data.success) success += 1;
    else failed += 1;
    const ms = toMillis(data.ranAt);
    if (ms > lastRun) lastRun = ms;
  });
  return { total, success, failed, lastRun };
}
