import { NextResponse } from "next/server";
import { requireUser, requireModerator, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const snap = await adminDb()
    .collection("challenges")
    .orderBy("startDate", "desc")
    .limit(50)
    .get();

  const now = new Date();
  const challenges = snap.docs.map((doc) => {
    const d = doc.data();
    const end = d.endDate?.toDate ? d.endDate.toDate() : new Date(d.endDate);
    const start = d.startDate?.toDate ? d.startDate.toDate() : new Date(d.startDate);
    let status = "upcoming";
    if (now >= start && now <= end) status = "active";
    if (now > end) status = "completed";

    return {
      id: doc.id,
      title: d.title || "",
      description: d.description || "",
      emoji: d.emoji || "🏆",
      goal: d.goal || 10,
      startDate: start.getTime(),
      endDate: end.getTime(),
      status,
      participantCount: d.participantCount || 0,
    };
  });

  return NextResponse.json({ challenges });
}

export async function POST(req) {
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { title, description, emoji, goal, startDate, endDate } = await req.json();

  if (!title || !endDate) {
    return NextResponse.json({ error: "Title and end date required" }, { status: 400 });
  }

  const ref = await adminDb().collection("challenges").add({
    title: title.trim(),
    description: (description || "").trim(),
    emoji: emoji || "🏆",
    goal: Math.max(1, parseInt(goal, 10) || 10),
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: new Date(endDate),
    participantCount: 0,
    createdBy: auth.user.uid,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
