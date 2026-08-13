import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { listGroups, isGroupMember } from "@/lib/server/groups";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const groups = await listGroups();
  const withMembership = [];
  for (const group of groups) {
    const membership = await isGroupMember(group.id, user.uid);
    const membersSnap = await adminDb()
      .collection("groupMembers")
      .where("groupId", "==", group.id)
      .get();
    withMembership.push({
      ...group,
      memberCount: membersSnap.size,
      joined: !!membership,
    });
  }
  return NextResponse.json({ groups: withMembership });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description = "" } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Group name required" }, { status: 400 });
  }

  const slug = `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)}-${Math.random().toString(36).slice(2, 6)}`;

  const ref = await adminDb().collection("groups").add({
    name,
    slug,
    description,
    status: "active",
    createdBy: user.uid,
    createdAt: new Date(),
  });
  return NextResponse.json({ id: ref.id, slug });
}
