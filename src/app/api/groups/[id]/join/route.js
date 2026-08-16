import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { syncGroupChatParticipants } from "@/lib/server/chat";

export async function POST(req, { params }) {
  const { id: groupId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const groupSnap = await adminDb().collection("groups").doc(groupId).get();
  if (!groupSnap.exists || groupSnap.data().status !== "active") {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const userDoc = await getUserDoc(user.uid);
  const ref = adminDb().collection("groupMembers").doc(`${groupId}_${user.uid}`);
  const memberSnap = await ref.get();
  const joined = memberSnap.exists;

  if (joined) {
    await ref.delete();
    const memberSnap = await adminDb()
      .collection("groupMembers")
      .where("groupId", "==", groupId)
      .get();
    await syncGroupChatParticipants(
      groupId,
      memberSnap.docs.map((d) => d.data().userId)
    );
  } else {
    await ref.set({
      groupId,
      userId: user.uid,
      name: userDoc?.name || user.name || user.email?.split("@")[0] || "Member",
      role: "member",
      joinedAt: new Date(),
    });
    const memberSnap = await adminDb()
      .collection("groupMembers")
      .where("groupId", "==", groupId)
      .get();
    await syncGroupChatParticipants(
      groupId,
      memberSnap.docs.map((d) => d.data().userId)
    );
  }
  return NextResponse.json({ joined: !joined });
}
