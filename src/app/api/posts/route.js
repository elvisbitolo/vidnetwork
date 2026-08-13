import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { text, imageUrl = "", groupId = "" } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Post text required" }, { status: 400 });
  }

  const userDoc = await getUserDoc(user.uid);
  const data = {
    authorId: user.uid,
    authorName: userDoc?.name || user.name || user.email?.split("@")[0] || "Member",
    text: text.trim(),
    likes: {},
    pinned: false,
    createdAt: new Date(),
  };
  if (imageUrl && typeof imageUrl === "string") {
    data.imageUrl = imageUrl;
  }
  if (groupId) {
    const groupSnap = await adminDb().collection("groups").doc(groupId).get();
    if (!groupSnap.exists || groupSnap.data().status !== "active") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const memberSnap = await adminDb().collection("groupMembers").doc(`${groupId}_${user.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Join the group first" }, { status: 403 });
    }
    data.groupId = groupId;
  }

  const ref = await adminDb().collection("posts").add(data);
  return NextResponse.json({ id: ref.id });
}
