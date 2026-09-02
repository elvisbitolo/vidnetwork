import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  RECOGNITION_POINTS,
  validateRecognition,
} from "@/lib/server/recognition-core";
import { awardPoints } from "@/lib/server/gamification";
import { createNotification } from "@/lib/server/notifications";

export { RECOGNITION_POINTS };

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function createRecognition({ fromUid, fromName, toUid, value, note }) {
  const cleanNote = typeof note === "string" ? note.trim() : "";
  const check = validateRecognition({ value, note: cleanNote, toUid, fromUid });
  if (!check.ok) {
    throw Object.assign(new Error(check.reason), { code: 400 });
  }

  const toUserRef = adminDb().collection("users").doc(toUid);
  const toUserSnap = await toUserRef.get();
  if (!toUserSnap.exists) {
    throw Object.assign(new Error("Member not found"), { code: 404 });
  }
  const toName = toUserSnap.data().name || "Member";

  await adminDb().runTransaction(async (tx) => {
    const ref = adminDb().collection("recognitions").doc();
    tx.set(ref, {
      fromUid,
      fromName: fromName || "Member",
      toUid,
      toName,
      value,
      note: cleanNote,
      createdAt: new Date(),
    });
    tx.update(toUserRef, {
      recognitionCount: FieldValue.increment(1),
    });
  });

  await awardPoints(toUid, RECOGNITION_POINTS, toName);
  await createNotification({
    userId: toUid,
    type: "recognition",
    actorId: fromUid,
    actorName: fromName || "Member",
    targetId: toUid,
    href: `/members/${toUid}`,
    text: `recognized you for being ${value}${cleanNote ? ` — "${cleanNote.slice(0, 120)}"` : ""}`,
  });

  return { ok: true, value };
}

export async function listRecognitions(uid, limit = 20) {
  const snap = await adminDb()
    .collection("recognitions")
    .where("toUid", "==", uid)
    .get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        fromUid: data.fromUid,
        fromName: data.fromName,
        value: data.value,
        note: data.note || "",
        createdAt: toMillis(data.createdAt),
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getRecognitionCount(uid) {
  const doc = await adminDb().collection("users").doc(uid).get();
  return doc.exists ? Number(doc.data().recognitionCount) || 0 : 0;
}

export async function getRecognitionLeaderboard(limit = 20) {
  const snap = await adminDb()
    .collection("users")
    .orderBy("recognitionCount", "desc")
    .limit(limit)
    .get();
  let rank = 0;
  const rows = [];
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const count = Number(data.recognitionCount) || 0;
    if (count <= 0) return;
    rank += 1;
    rows.push({
      userId: doc.id,
      name: data.name || "Member",
      count,
      rank,
    });
  });
  return rows;
}
