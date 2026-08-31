import { adminDb } from "@/lib/firebase/admin";
import {
  normalizeFeatures,
} from "@/lib/server/spaces-core";

export const PAGE_VISIBILITIES = ["all", "members"];

function serializeTs(value) {
  if (value == null) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return value;
}

export function serializePage(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    title: d.title || "",
    slug: d.slug || "",
    content: d.content || "",
    spaceId: d.spaceId || "",
    position: Number(d.position) || 0,
    visibility: PAGE_VISIBILITIES.includes(d.visibility) ? d.visibility : "all",
    createdBy: d.createdBy || "",
    createdAt: serializeTs(d.createdAt),
    updatedAt: serializeTs(d.updatedAt),
  };
}

export async function createPage({ title, slug, content, spaceId, position, visibility, createdBy }) {
  const ref = adminDb().collection("pages").doc();
  const now = new Date();
  await ref.set({
    title,
    slug,
    content,
    spaceId,
    position: Number(position) || 0,
    visibility: PAGE_VISIBILITIES.includes(visibility) ? visibility : "all",
    createdBy,
    createdAt: now,
    updatedAt: now,
  });

  const spaceRef = adminDb().collection("spaces").doc(spaceId);
  const spaceDoc = await spaceRef.get();
  if (spaceDoc.exists) {
    const features = spaceDoc.data().features || {};
    if (!features.pages) {
      await spaceRef.update({ features: normalizeFeatures({ ...features, pages: true }) });
    }
  }

  return { id: ref.id, title, slug, spaceId };
}

export async function listPages(spaceId) {
  const snap = await adminDb()
    .collection("pages")
    .where("spaceId", "==", spaceId)
    .get();
  return snap.docs
    .map(serializePage)
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
}

export async function getPage(pageId) {
  const doc = await adminDb().collection("pages").doc(pageId).get();
  return doc.exists ? serializePage(doc) : null;
}

export async function getPageBySlug(spaceId, slug) {
  const snap = await adminDb()
    .collection("pages")
    .where("spaceId", "==", spaceId)
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return serializePage(snap.docs[0]);
}

export async function updatePage(pageId, { title, slug, content, position, visibility } = {}) {
  const ref = adminDb().collection("pages").doc(pageId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = {};
  if (title !== undefined) data.title = title;
  if (slug !== undefined) data.slug = slug;
  if (content !== undefined) data.content = content;
  if (position !== undefined) data.position = Number(position) || 0;
  if (visibility !== undefined) {
    data.visibility = PAGE_VISIBILITIES.includes(visibility) ? visibility : "all";
  }
  data.updatedAt = new Date();
  await ref.update(data);
  return { id: pageId, ...doc.data(), ...data };
}

export async function deletePage(pageId) {
  await adminDb().collection("pages").doc(pageId).delete();
}

export async function reorderPages(spaceId, pageIds) {
  const batch = adminDb().batch();
  pageIds.forEach((pageId, index) => {
    batch.update(adminDb().collection("pages").doc(pageId), {
      position: index,
      updatedAt: new Date(),
    });
  });
  await batch.commit();
  return { ok: true };
}
