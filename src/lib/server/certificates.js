import { adminDb } from "@/lib/firebase/admin";

function generateCertNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "YC-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function generateCertificate({ userId, userName, courseId, courseTitle, completedAt }) {
  const existing = await getCertificateByUserAndCourse(userId, courseId);
  if (existing) return existing;

  const ref = adminDb().collection("certificates").doc();
  const cert = {
    id: ref.id,
    userId,
    userName,
    courseId,
    courseTitle,
    completedAt: completedAt || new Date().toISOString(),
    certificateNumber: generateCertNumber(),
    createdAt: new Date(),
  };
  await ref.set(cert);
  return cert;
}

export async function getCertificate(certificateId) {
  const doc = await adminDb().collection("certificates").doc(certificateId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function getCertificateByUserAndCourse(userId, courseId) {
  const snap = await adminDb()
    .collection("certificates")
    .where("userId", "==", userId)
    .where("courseId", "==", courseId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getUserCertificates(userId) {
  const snap = await adminDb()
    .collection("certificates")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
