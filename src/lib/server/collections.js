import { adminDb } from "@/lib/firebase/admin";
import { getSpace } from "@/lib/server/spaces";

export function normalizeSpaceIds(spaceIds) {
  if (!Array.isArray(spaceIds)) return [];
  const seen = new Set();
  return spaceIds
    .map((id) => String(id || "").trim())
    .filter((id) => id && !seen.has(id) && seen.add(id));
}

export async function listCollections() {
  const snap = await adminDb().collection("collections").orderBy("createdAt", "asc").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function createCollection({ name, description, spaceIds, createdBy }) {
  const title = String(name || "").trim();
  if (!title) {
    throw Object.assign(new Error("Collection name required"), { code: 400 });
  }
  const ref = adminDb().collection("collections").doc();
  await ref.set({
    name: title,
    description: description || "",
    spaceIds: normalizeSpaceIds(spaceIds),
    createdBy,
    createdAt: new Date(),
  });
  return { id: ref.id, name: title };
}

export async function updateCollection(id, { name, description, spaceIds }) {
  const ref = adminDb().collection("collections").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();
  if (typeof description === "string") data.description = description;
  if (spaceIds !== undefined) data.spaceIds = normalizeSpaceIds(spaceIds);
  await ref.update(data);
  return { id, ...doc.data(), ...data };
}

export async function deleteCollection(id) {
  await adminDb().collection("collections").doc(id).delete();
}

export async function getCollectionsWithSpaces() {
  const collections = await listCollections();
  return Promise.all(
    collections.map(async (collection) => {
      const spaces = [];
      for (const spaceId of collection.spaceIds || []) {
        const space = await getSpace(spaceId);
        if (space && space.status !== "deleted") {
          spaces.push({
            id: space.id,
            name: space.name,
            slug: space.slug,
            access: space.access || "public",
            requiredTier: space.requiredTier || "",
            purchasePriceCents: space.purchasePriceCents || 0,
            publicPreview: !!space.publicPreview,
          });
        }
      }
      return { ...collection, spaces };
    })
  );
}
