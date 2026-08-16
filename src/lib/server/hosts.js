import { adminDb } from "@/lib/firebase/admin";
import { canModerate } from "@/lib/server/auth";
import { getRoom, getRoomBySlug } from "@/lib/server/rooms";
import { getEvent } from "@/lib/server/events";
import { getCourse } from "@/lib/server/courses";
import { getSpace } from "@/lib/server/spaces";
import { getGroup } from "@/lib/server/groups";
import {
  HOST_SCOPE_TYPES,
  hostAssignmentKey,
  normalizeHostRole,
  normalizeCanRecord,
  rightsFromAssignments,
  evaluateScopeRights,
} from "@/lib/server/host-core";

export { HOST_SCOPE_TYPES };

const SCOPE_LOADERS = {
  room: getRoom,
  event: getEvent,
  course: getCourse,
  group: getGroup,
  space: getSpace,
};

export async function scopeExists(scopeType, scopeId) {
  const loader = SCOPE_LOADERS[scopeType];
  if (!loader || !scopeId) return false;
  const doc = await loader(scopeId);
  return !!doc;
}

export async function resolveScopeData(scopeType, scopeId) {
  if (scopeType === "room") {
    const room = await getRoom(scopeId);
    return { spaceId: room?.spaceId || "", groupId: room?.groupId || "" };
  }
  if (scopeType === "event") {
    const event = await getEvent(scopeId);
    const room = event?.roomSlug ? await getRoomBySlug(event.roomSlug) : null;
    return { spaceId: event?.spaceId || "", roomId: room?.id || "" };
  }
  if (scopeType === "course") {
    const course = await getCourse(scopeId);
    return { spaceId: course?.spaceId || "" };
  }
  if (scopeType === "group") {
    const group = await getGroup(scopeId);
    return { spaceId: group?.spaceId || "" };
  }
  return {};
}

export async function listHostAssignments({ scopeType, scopeId, userId } = {}) {
  let query;
  if (scopeType && scopeId) {
    query = adminDb()
      .collection("hostAssignments")
      .where("scopeType", "==", scopeType)
      .where("scopeId", "==", scopeId)
      .limit(200);
  } else if (userId) {
    query = adminDb()
      .collection("hostAssignments")
      .where("userId", "==", userId)
      .limit(200);
  } else {
    query = adminDb().collection("hostAssignments").limit(200);
  }
  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function setHostAssignment({ scopeType, scopeId, userId, role, canRecord, grantedBy }) {
  const normalizedRole = normalizeHostRole(role);
  if (!normalizedRole || !scopeType || !scopeId || !userId || !grantedBy) {
    return { ok: false, error: "Invalid host assignment" };
  }
  const id = hostAssignmentKey({ scopeType, scopeId, userId });
  const data = {
    scopeType,
    scopeId,
    userId,
    role: normalizedRole,
    canRecord: normalizeCanRecord(normalizedRole, canRecord),
    grantedBy,
    updatedAt: new Date(),
  };
  const ref = adminDb().collection("hostAssignments").doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update(data);
  } else {
    await ref.set({ ...data, createdAt: new Date() });
  }
  return { ok: true, id };
}

export async function removeHostAssignment(scopeType, scopeId, userId) {
  const id = hostAssignmentKey({ scopeType, scopeId, userId });
  const ref = adminDb().collection("hostAssignments").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Assignment not found" };
  await ref.delete();
  return { ok: true, id };
}

export async function getUserHostRights(uid) {
  if (!uid) return {};
  const assignments = await listHostAssignments({ userId: uid });
  return rightsFromAssignments(assignments);
}

export async function userHasHostRights(uid) {
  if (!uid) return false;
  const assignments = await listHostAssignments({ userId: uid });
  return assignments.length > 0;
}

export async function canManageScope(uid, scopeType, scopeId) {
  const rights = await getScopedHostRights(uid, scopeType, scopeId);
  return rights.isStaff || rights.isHost;
}

export async function getScopedHostRights(uid, scopeType, scopeId) {
  if (!uid || !scopeType || !scopeId) {
    return { isStaff: false, isHost: false, isCoHost: false, canRecord: false, roles: [] };
  }
  const [userDoc, rights, scopeData] = await Promise.all([
    adminDb().collection("users").doc(uid).get(),
    getUserHostRights(uid),
    resolveScopeData(scopeType, scopeId),
  ]);
  const isStaff = canModerate({ role: userDoc.data()?.role });
  return {
    isStaff,
    ...evaluateScopeRights(rights, scopeType, scopeId, scopeData, isStaff),
  };
}
