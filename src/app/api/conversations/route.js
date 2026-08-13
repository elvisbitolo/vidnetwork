import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getOrCreateDm, getOrCreateGroupChat, listConversations } from "@/lib/server/chat";
import { isGroupMember } from "@/lib/server/groups";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const conversations = await listConversations(user.uid);
  return NextResponse.json({ conversations });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { type, otherId, groupId } = await req.json();
  if (type === "dm") {
    if (!otherId || otherId === user.uid) {
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }
    const conversation = await getOrCreateDm(user.uid, otherId);
    return NextResponse.json({ conversation });
  }

  if (type === "group") {
    if (!groupId) {
      return NextResponse.json({ error: "Group required" }, { status: 400 });
    }
    const userDoc = await getUserDoc(user.uid);
    const membership = await isGroupMember(groupId, user.uid);
    if (!membership && userDoc?.role !== "owner") {
      return NextResponse.json({ error: "Join the group first" }, { status: 403 });
    }
    const conversation = await getOrCreateGroupChat(user.uid, groupId);
    if (!conversation) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
