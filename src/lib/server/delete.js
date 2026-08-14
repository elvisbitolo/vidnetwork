import { adminDb } from "@/lib/firebase/admin";

export async function deleteDocs(docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminDb().batch();
    for (const doc of docs.slice(i, i + 400)) batch.delete(doc.ref);
    await batch.commit();
  }
}

export async function deleteWhere(collectionPath, field, value) {
  const snap = await adminDb().collection(collectionPath).where(field, "==", value).get();
  await deleteDocs(snap.docs);
}

export async function deleteSubcollection(parentRef, collectionPath) {
  const snap = await parentRef.collection(collectionPath).get();
  await deleteDocs(snap.docs);
}

export async function deletePostWithComments(postRef) {
  await deleteSubcollection(postRef, "comments");
  await postRef.delete();
}
