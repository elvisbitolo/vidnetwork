import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { getSpace, addSpaceMember, getSpaceMembers } from "@/lib/server/spaces";
import { syncSpaceChatParticipants } from "@/lib/server/chat";
import { logAudit } from "@/lib/server/audit";

export async function POST(req, { params }) {
  const { id: spaceId } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { userId } = await req.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Member required" }, { status: 400 });
  }

  const space = await getSpace(spaceId);
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const userSnap = await adminDb().collection("users").doc(userId).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  const user = userSnap.data();

  const added = await addSpaceMember(spaceId, userId, user.name || "Member");
  const membersSnap = await adminDb()
    .collection("spaceMembers")
    .where("spaceId", "==", spaceId)
    .get();
  await syncSpaceChatParticipants(
    spaceId,
    membersSnap.docs.map((d) => d.data().userId)
  );

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "space.member.added",
    targetId: spaceId,
    metadata: { space: space.name, userId },
  });

  return NextResponse.json({ added });
}

export async function DELETE(req, { params }) {
  const { id: spaceId } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Member required" }, { status: 400 });
  }

  const space = await getSpace(spaceId);
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  await adminDb().collection("spaceMembers").doc(`${spaceId}_${userId}`).delete();

  const membersSnap = await adminDb()
    .collection("spaceMembers")
    .where("spaceId", "==", spaceId)
    .get();
  await syncSpaceChatParticipants(
    spaceId,
    membersSnap.docs.map((d) => d.data().userId)
  );

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "space.member.removed",
    targetId: spaceId,
    metadata: { space: space.name, userId },
  });

  return NextResponse.json({ removed: true });
}
