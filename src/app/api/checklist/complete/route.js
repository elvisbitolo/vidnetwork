import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";
import { runAutomations } from "@/lib/server/automations";
import { logError } from "@/lib/server/log";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const [settings, userDoc, postsSnap, rsvpsSnap, roomEventsSnap] = await Promise.all([
    getSettings(),
    getUserDoc(user.uid),
    adminDb().collection("posts").where("authorId", "==", user.uid).limit(1).get(),
    adminDb().collection("rsvps").where("userId", "==", user.uid).limit(1).get(),
    adminDb().collection("roomEvents").where("userId", "==", user.uid).limit(1).get(),
  ]);

  const checks = {
    profile: !!(userDoc?.bio || userDoc?.headline || userDoc?.location),
    room: !roomEventsSnap.empty,
    post: !postsSnap.empty,
    rsvp: !rsvpsSnap.empty,
  };

  const allDone = settings.welcomeChecklist.every((step) => !!checks[step.key]);
  if (!allDone) {
    return NextResponse.json({ error: "Not all checklist steps are complete" }, { status: 400 });
  }

  const ref = adminDb().collection("users").doc(user.uid);
  const existing = userDoc?.checklistCompletedAt?.toMillis?.();
  const completedAt = new Date();
  await ref.update({ checklistCompletedAt: completedAt });

  if (!existing) {
    runAutomations("checklist_complete", {
      subjectUid: user.uid,
      subjectName: userDoc?.name || user.name || "Member",
      memberName: userDoc?.name || user.name || "Member",
      memberEmail: user.email || "",
      checklistSteps: settings.welcomeChecklist.length,
    }).catch((err) => {
      logError("automation.checklist_hook_failed", { uid: user.uid, error: err.message });
    });
  }

  return NextResponse.json({ completed: true });
}
