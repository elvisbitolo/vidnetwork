import { adminDb } from "@/lib/firebase/admin";

export async function logAudit({ actorId, actorName, action, targetId, metadata = {} }) {
  await adminDb().collection("auditLogs").add({
    actorId: actorId || "",
    actorName: actorName || "",
    action,
    targetId: targetId || "",
    metadata,
    createdAt: new Date(),
  });
}
