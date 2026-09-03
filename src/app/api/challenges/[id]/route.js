import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { logError } from "@/lib/server/log";

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const doc = await adminDb().collection("challenges").doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const d = doc.data();
  const now = new Date();
  const end = d.endDate?.toDate ? d.endDate.toDate() : new Date(d.endDate);
  const start = d.startDate?.toDate ? d.startDate.toDate() : new Date(d.startDate);
  let status = "upcoming";
  if (now >= start && now <= end) status = "active";
  if (now > end) status = "completed";

  const participantSnap = await adminDb()
    .collection("challengeParticipants")
    .where("challengeId", "==", id)
    .orderBy("progress", "desc")
    .limit(50)
    .get();

  const participants = participantSnap.docs.map((p) => {
    const pd = p.data();
    return {
      userId: pd.userId,
      userName: pd.userName,
      progress: pd.progress || 0,
      joinedAt: pd.joinedAt?.toDate ? pd.joinedAt.toDate().getTime() : 0,
    };
  });

  const myPart = participants.find((p) => p.userId === auth.user.uid);

  return NextResponse.json({
    challenge: {
      id: doc.id,
      title: d.title,
      description: d.description,
      emoji: d.emoji,
      goal: d.goal,
      startDate: start.getTime(),
      endDate: end.getTime(),
      status,
    },
    participants,
    myProgress: myPart?.progress || 0,
    joined: !!myPart,
  });
}

export async function POST(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const doc = await adminDb().collection("challenges").doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await adminDb()
    .collection("challengeParticipants")
    .doc(`${id}_${auth.user.uid}`)
    .get();

  if (existing.exists) {
    return NextResponse.json({ error: "Already joined" }, { status: 400 });
  }

  try {
    await adminDb().collection("challengeParticipants").doc(`${id}_${auth.user.uid}`).set({
      challengeId: id,
      userId: auth.user.uid,
      userName: auth.userDoc?.name || "Member",
      progress: 0,
      joinedAt: new Date(),
    });

    await doc.ref.update({
      participantCount: FieldValue.increment(1),
    });
  } catch (err) {
    logError("challenge.join_failed", { error: err.message, uid: auth.user.uid, id });
    return NextResponse.json({ error: "Could not join challenge" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { progress } = await req.json();
  const ref = adminDb().collection("challengeParticipants").doc(`${id}_${auth.user.uid}`);
  const challengeRef = adminDb().collection("challenges").doc(id);
  const target = Math.max(0, Math.floor(Number(progress) || 0));

  let justCompleted = false;
  try {
    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new Error("not-joined");
      }

      const current = snap.data().progress || 0;
      const next = Math.max(current, target);
      tx.update(ref, { progress: next });

      if (current < target) {
        const challengeSnap = await tx.get(challengeRef);
        if (challengeSnap.exists) {
          const goal = challengeSnap.data().goal || 10;
          if (current < goal && next >= goal) justCompleted = true;
        }
      }
    });
  } catch (err) {
    if (err.message === "not-joined") {
      return NextResponse.json({ error: "Join this challenge first" }, { status: 400 });
    }
    logError("challenge.progress_failed", { error: err.message, uid: auth.user.uid, id });
    return NextResponse.json({ error: "Could not update progress" }, { status: 500 });
  }

  if (justCompleted) {
    const challengeSnap = await challengeRef.get();
    const challengeData = challengeSnap.exists ? challengeSnap.data() : {};
    const { createNotification } = await import("@/lib/server/notifications");
    await createNotification({
      userId: auth.user.uid,
      type: "system",
      actorId: "system",
      actorName: "Secret Yarnery",
      href: `/challenges`,
      text: `You completed the "${challengeData.title || 'challenge'}" challenge! 🎉`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
