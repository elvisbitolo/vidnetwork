export const HOST_SCOPE_TYPES = ["room", "event", "course", "group", "space"];

export function hostAssignmentKey({ scopeType, scopeId, userId }) {
  return `${scopeType}_${scopeId}_${userId}`;
}

export function scopeKey(scopeType, scopeId) {
  return `${scopeType}_${scopeId}`;
}

export function normalizeHostRole(role) {
  if (role === "co-host") return "co-host";
  if (role === "host") return "host";
  return null;
}

export function normalizeCanRecord(role, canRecord) {
  if (typeof canRecord === "boolean") return canRecord;
  return normalizeHostRole(role) === "host";
}

export function resolveScopeKeys(scopeType, scopeId, scopeData = {}) {
  const keys = new Set([scopeKey(scopeType, scopeId)]);
  if (scopeType === "room") {
    if (scopeData.spaceId) keys.add(scopeKey("space", scopeData.spaceId));
    if (scopeData.groupId) keys.add(scopeKey("group", scopeData.groupId));
  } else if (scopeType === "event") {
    if (scopeData.spaceId) keys.add(scopeKey("space", scopeData.spaceId));
    if (scopeData.roomId) keys.add(scopeKey("room", scopeData.roomId));
  } else if (scopeType === "course") {
    if (scopeData.spaceId) keys.add(scopeKey("space", scopeData.spaceId));
  } else if (scopeType === "group") {
    if (scopeData.spaceId) keys.add(scopeKey("space", scopeData.spaceId));
  }
  return [...keys];
}

export function rightsFromAssignments(assignments) {
  const rights = {};
  for (const a of assignments || []) {
    if (!a.scopeType || !a.scopeId || !a.userId) continue;
    const role = normalizeHostRole(a.role);
    if (!role) continue;
    rights[scopeKey(a.scopeType, a.scopeId)] = {
      role,
      canRecord: a.canRecord === true,
    };
  }
  return rights;
}

export function evaluateScopeRights(rights, scopeType, scopeId, scopeData = {}, isStaff = false) {
  if (isStaff) {
    return { isHost: true, isCoHost: true, canRecord: true, roles: ["host"] };
  }
  const keys = resolveScopeKeys(scopeType, scopeId, scopeData);
  const roles = [];
  let canRecord = false;
  for (const key of keys) {
    const entry = rights[key];
    if (!entry) continue;
    roles.push(entry.role);
    if (entry.canRecord) canRecord = true;
  }
  const isHost = roles.includes("host");
  const isCoHost = isHost || roles.includes("co-host");
  return { isHost, isCoHost, canRecord, roles: [...new Set(roles)] };
}
