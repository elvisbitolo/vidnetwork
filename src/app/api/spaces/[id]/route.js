import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getSpace, isSpaceMember, updateSpace, deleteSpace } from "@/lib/server/spaces";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

export async function GET(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const space = await getSpace(id);
  if (!space || space.status !== "active") {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }
  if (
    space.access === "invite" &&
    !(await isSpaceMember(id, auth.user.uid)) &&
    auth.userDoc?.role !== "owner"
  ) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const membership = await isSpaceMember(id, auth.user.uid);
  const membersSnap = await adminDb()
    .collection("spaceMembers")
    .where("spaceId", "==", id)
    .get();

  return NextResponse.json({
    space: {
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description || "",
      access: space.access,
      requiredTier: space.requiredTier || "",
      features: space.features || {},
      memberCount: membersSnap.size,
      joined: !!membership,
    },
  });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const space = await getSpace(id);
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await updateSpace(id, {
    name: body.name,
    description: body.description,
    features: body.features,
    access: body.access,
    requiredTier: body.requiredTier,
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "space.updated",
    targetId: id,
    metadata: { name: updated?.name, access: updated?.access },
  });

  return NextResponse.json({ space: updated });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const space = await getSpace(id);
  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  await deleteSpace(id);

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "space.deleted",
    targetId: id,
    metadata: { name: space.name },
  });

  return NextResponse.json({ ok: true });
}
