import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { getCollectionsWithSpaces } from "@/lib/server/collections";
import { isSpaceMember } from "@/lib/server/spaces";
import { serialize } from "@/lib/server/serialize";

export async function GET() {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const collections = await getCollectionsWithSpaces();
  const visible = [];
  for (const collection of collections) {
    const spaces = [];
    for (const space of collection.spaces) {
      const membership = await isSpaceMember(space.id, auth.user.uid);
      if (space.access === "invite" && !membership) continue;
      spaces.push({
        id: space.id,
        name: space.name,
        slug: space.slug,
        requiredTier: space.requiredTier,
        purchasePriceCents: space.purchasePriceCents,
        joined: !!membership,
      });
    }
    visible.push({ id: collection.id, name: collection.name, spaces });
  }
  return NextResponse.json({ collections: serialize(visible) });
}
