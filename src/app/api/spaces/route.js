import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  listSpaces,
  isSpaceMember,
  createSpace,
  SPACE_ACCESS,
} from "@/lib/server/spaces";
import { requireUser, requireOwner, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";

export async function GET(req) {
  const isAdmin = new URL(req.url).searchParams.get("admin") === "1";
  const auth = isAdmin ? await requireOwner() : await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const spaces = await listSpaces();
  const withMembership = [];
  for (const space of spaces) {
    const membership = await isSpaceMember(space.id, auth.user.uid);
    if (space.access === "invite" && !membership && !isAdmin) continue;
    const membersSnap = await adminDb()
      .collection("spaceMembers")
      .where("spaceId", "==", space.id)
      .get();
    withMembership.push({
      id: space.id,
      name: space.name,
      slug: space.slug,
      description: space.description || "",
      access: space.access,
      requiredTier: space.requiredTier || "",
      purchasePriceCents: space.purchasePriceCents || 0,
      features: space.features || {},
      memberCount: membersSnap.size,
      joined: !!membership,
    });
  }
  return NextResponse.json({ spaces: withMembership });
}

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { name, description = "", features = {}, access = "public", requiredTier = "", purchasePriceCents = 0 } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Space name required" }, { status: 400 });
  }
  if (!SPACE_ACCESS.includes(access)) {
    return NextResponse.json({ error: "Invalid access type" }, { status: 400 });
  }
  const price = Number(purchasePriceCents) || 0;
  if (price < 0 || price > 1000000) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const space = await createSpace({
    name,
    description,
    features,
    access,
    requiredTier,
    purchasePriceCents: price,
    createdBy: auth.user.uid,
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "space.created",
    targetId: space.id,
    metadata: { name: space.name, slug: space.slug, access },
  });

  return NextResponse.json(space);
}
