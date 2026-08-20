import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireModerator, guardJson } from "@/lib/server/authorize";
import { logAudit } from "@/lib/server/audit";
import { deletePostWithComments, deleteDocs } from "@/lib/server/delete";

async function deleteQuery(query) {
  const snap = await query.get();
  if (snap.empty) return;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminDb().batch();
    for (const doc of docs.slice(i, i + 400)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { role, suspended } = await req.json();
  const ref = adminDb().collection("users").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const update = {};
  if (role !== undefined) {
    if (!["member", "moderator"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (auth.userDoc.role !== "owner") {
      return NextResponse.json({ error: "Only the owner can change roles" }, { status: 403 });
    }
    if (snap.data().role === "owner") {
      return NextResponse.json({ error: "Cannot change the owner's role" }, { status: 400 });
    }
    update.role = role;
  }
  if (suspended !== undefined) {
    if (snap.data().role === "owner" && suspended) {
      return NextResponse.json({ error: "Cannot suspend the owner" }, { status: 400 });
    }
    update.suspended = Boolean(suspended);
  }

  await ref.update(update);

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: role !== undefined ? "member.role_changed" : "member.suspended",
    targetId: id,
    metadata: { role, suspended, prevRole: snap.data().role },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await requireModerator();
  const denied = guardJson(auth);
  if (denied) return denied;

  if (id === auth.user.uid) {
    return NextResponse.json({ error: "You can't delete your own account here" }, { status: 400 });
  }

  const userSnap = await adminDb().collection("users").doc(id).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  const userData = userSnap.data();
  if (userData.role === "owner" && auth.userDoc.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can delete the owner" }, { status: 403 });
  }

  try {
    await adminAuth().deleteUser(id);
  } catch (err) {
    if (err.code !== "auth/user-not-found") {
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
  }

  const postsSnap = await adminDb().collection("posts").where("authorId", "==", id).get();
  for (const doc of postsSnap.docs) {
    await deletePostWithComments(doc.ref).catch(() => {});
  }
  await deleteQuery(adminDb().collection("notifications").where("userId", "==", id));
  await deleteQuery(adminDb().collection("groupMembers").where("userId", "==", id));
  await deleteQuery(adminDb().collection("spaceMembers").where("userId", "==", id));
  await deleteQuery(adminDb().collection("stickers").where("senderId", "==", id));
  await deleteQuery(adminDb().collection("stickers").where("recipientId", "==", id));

  const subs = await adminDb().collection("conversations")
    .where("participantIds", "array-contains", id)
    .get();
  for (const conv of subs.docs) {
    const next = (conv.data().participantIds || []).filter((p) => p !== id);
    await conv.ref.update({ participantIds: next, updatedAt: new Date() });
  }

  const deletes = [id, "subscriptions", "gamification"].map((path) =>
    path === id
      ? adminDb().collection("users").doc(id)
      : adminDb().collection(path).doc(id)
  );
  await Promise.all(deletes.map((ref) => ref.delete().catch(() => {})));

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "member.deleted",
    targetId: id,
    metadata: { name: userData.name, email: userData.email },
  });

  return NextResponse.json({ ok: true });
}
