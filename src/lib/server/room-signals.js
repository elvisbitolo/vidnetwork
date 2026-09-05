import { adminDb } from "@/lib/firebase/admin";

export const ROOM_SIGNAL_TYPES = ["hand", "reaction", "speakerInvite"];

function signalsRef(roomId) {
  return adminDb().collection("rooms").doc(roomId).collection("signals");
}

function decodeSignal(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type || "",
    fromIdentity: data.fromIdentity || "",
    target: data.target || "",
    value: data.value,
    emoji: data.emoji || "",
    hostName: data.hostName || "",
    createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
  };
}

export async function getRoomForSignals(roomId) {
  const doc = await adminDb().collection("rooms").doc(roomId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.status !== "active") return null;
  return { id: doc.id, ...data };
}

export async function addRoomSignal(roomId, fromIdentity, payload) {
  const doc = await signalsRef(roomId).add({
    ...payload,
    fromIdentity,
    createdAt: new Date(),
  });
  return doc.id;
}

export async function listRoomSignals(roomId, { after, limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const afterTs = Number.isFinite(after) ? after : 0;
  let q = signalsRef(roomId)
    .where("createdAt", ">", new Date(afterTs))
    .orderBy("createdAt", "asc")
    .limit(safeLimit);
  const snap = await q.get();
  const signals = snap.docs.map(decodeSignal);
  return { signals, hasMore: snap.docs.length >= safeLimit };
}