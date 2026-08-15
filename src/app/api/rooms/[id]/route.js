import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { getScopedHostRights } from "@/lib/server/hosts";
import { logAudit } from "@/lib/server/audit";
import { deleteRoom } from "@/lib/server/rooms";

function isStaff(auth) {
  return auth.userDoc?.role === "owner" || auth.userDoc?.role === "moderator";
}

async function canManageRoom(auth, room) {
  if (isStaff(auth)) return { ok: true, isHost: true };
  const rights = await getScopedHostRights(auth.user.uid, "room", room.id);
  if (room.spaceId) {
    const spaceRights = await getScopedHostRights(auth.user.uid, "space", room.spaceId);
    if (spaceRights.isHost || spaceRights.isCoHost) {
      return { ok: true, isHost: spaceRights.isHost };
    }
  }
  if (room.groupId) {
    const groupRights = await getScopedHostRights(auth.user.uid, "group", room.groupId);
    if (groupRights.isHost || groupRights.isCoHost) {
      return { ok: true, isHost: groupRights.isHost };
    }
  }
  return { ok: rights.isHost || rights.isCoHost, isHost: rights.isHost };
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("rooms").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const room = snap.data();

  const access = await canManageRoom(auth, room);
  if (!access.ok) {
    return NextResponse.json({ error: "Host access required" }, { status: 403 });
  }

  const body = await req.json();
  const update = {};
  const changed = [];

  if (typeof body.publicPreview === "boolean") {
    update.publicPreview = body.publicPreview;
    changed.push("publicPreview");
  }
  if (typeof body.recordingAllowed === "boolean") {
    update.recordingAllowed = body.recordingAllowed;
    changed.push("recordingAllowed");
  }
  if (body.replayVisibility === "owner" || body.replayVisibility === "members") {
    update.replayVisibility = body.replayVisibility;
    changed.push("replayVisibility");
  }
  if (typeof body.name === "string" && body.name.trim()) {
    update.name = body.name.trim();
    changed.push("name");
  }
  if (typeof body.description === "string") {
    update.description = body.description;
    changed.push("description");
  }
  if (body.opensAt !== undefined) {
    if (body.opensAt === null || body.opensAt === "") {
      update.opensAt = null;
    } else {
      const parsed = new Date(body.opensAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
      }
      update.opensAt = parsed;
    }
    changed.push("opensAt");
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  update.updatedAt = new Date();
  await ref.update(update);

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.updated",
    targetId: id,
    metadata: { fields: changed },
  });
  return NextResponse.json({ ok: true, fields: changed });
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const ref = adminDb().collection("rooms").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const room = snap.data();

  const access = await canManageRoom(auth, room);
  if (!access.ok || !access.isHost) {
    return NextResponse.json({ error: "Room host access required" }, { status: 403 });
  }

  await deleteRoom({ id, slug: room.slug, name: room.name });

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "room.deleted",
    targetId: id,
    metadata: { name: room.name || "" },
  });

  return NextResponse.json({ ok: true });
}
