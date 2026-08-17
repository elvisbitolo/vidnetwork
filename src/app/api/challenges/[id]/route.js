import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

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

  await adminDb().collection("challengeParticipants").doc(`${id}_${auth.user.uid}`).set({
    challengeId: id,
    userId: auth.user.uid,
    userName: auth.userDoc?.name || "Member",
    progress: 0,
    joinedAt: new Date(),
  });

  await doc.ref.update({
    participantCount: (doc.data().participantCount || 0) + 1,
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { progress } = await req.json();
  const ref = adminDb().collection("challengeParticipants").doc(`${id}_${auth.user.uid}`);
  const snap = await ref.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "Join this challenge first" }, { status: 400 });
  }

  const current = snap.data().progress || 0;
  await ref.update({ progress: Math.max(current, progress || 0) });

  const challenge = await adminDb().collection("challenges").doc(id).get();
  if (challenge.exists) {
    const goal = challenge.data().goal || 10;
    if (current < goal && progress >= goal) {
      const { createNotification } = await import("@/lib/server/notifications");
      await createNotification({
        userId: auth.user.uid,
        type: "system",
        actorId: "system",
        actorName: "VidNetwork",
        href: `/challenges`,
        text: `You completed the "${challenge.data().title}" challenge! 🎉`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
