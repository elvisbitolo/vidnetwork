import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOST_SCOPE_TYPES,
  hostAssignmentKey,
  scopeKey,
  normalizeHostRole,
  normalizeCanRecord,
  resolveScopeKeys,
  rightsFromAssignments,
  evaluateScopeRights,
} from "../host-core.js";

test("normalizeHostRole: accepts host and co-host, rejects others", () => {
  assert.equal(normalizeHostRole("host"), "host");
  assert.equal(normalizeHostRole("co-host"), "co-host");
  assert.equal(normalizeHostRole("admin"), null);
  assert.equal(normalizeHostRole(""), null);
  assert.equal(normalizeHostRole(undefined), null);
});

test("normalizeCanRecord: honors explicit boolean, defaults true for host", () => {
  assert.equal(normalizeCanRecord("host", undefined), true);
  assert.equal(normalizeCanRecord("co-host", undefined), false);
  assert.equal(normalizeCanRecord("co-host", true), true);
  assert.equal(normalizeCanRecord("host", false), false);
});

test("hostAssignmentKey and scopeKey are stable", () => {
  assert.equal(
    hostAssignmentKey({ scopeType: "room", scopeId: "r1", userId: "u1" }),
    "room_r1_u1"
  );
  assert.equal(scopeKey("space", "s1"), "space_s1");
});

test("HOST_SCOPE_TYPES lists supported scopes", () => {
  assert.deepEqual(HOST_SCOPE_TYPES, ["room", "event", "course", "group", "space"]);
});

test("resolveScopeKeys: room resolves space and group ancestors", () => {
  const keys = resolveScopeKeys("room", "r1", { spaceId: "s1", groupId: "g1" });
  assert.ok(keys.includes("room_r1"));
  assert.ok(keys.includes("space_s1"));
  assert.ok(keys.includes("group_g1"));
});

test("resolveScopeKeys: event resolves its space and room", () => {
  const keys = resolveScopeKeys("event", "e1", { spaceId: "s1", roomId: "r1" });
  assert.ok(keys.includes("event_e1"));
  assert.ok(keys.includes("space_s1"));
  assert.ok(keys.includes("room_r1"));
});

test("resolveScopeKeys: course resolves space only", () => {
  const keys = resolveScopeKeys("course", "c1", { spaceId: "s1" });
  assert.deepEqual(keys.sort(), ["course_c1", "space_s1"]);
});

test("resolveScopeKeys: space has no ancestors", () => {
  assert.deepEqual(resolveScopeKeys("space", "s1"), ["space_s1"]);
});

test("rightsFromAssignments: builds rights map and ignores invalid rows", () => {
  const rights = rightsFromAssignments([
    { scopeType: "room", scopeId: "r1", userId: "u1", role: "host", canRecord: true },
    { scopeType: "space", scopeId: "s1", userId: "u1", role: "co-host", canRecord: false },
    { scopeType: "room", scopeId: "r2", userId: "u1", role: "superuser" },
    { scopeType: "", scopeId: "x", userId: "u1", role: "host" },
  ]);
  assert.equal(rights["room_r1"].role, "host");
  assert.equal(rights["room_r1"].canRecord, true);
  assert.equal(rights["space_s1"].role, "co-host");
  assert.equal(rights["room_r2"], undefined);
});

test("evaluateScopeRights: staff always has full powers", () => {
  const r = evaluateScopeRights({}, "room", "r1", {}, true);
  assert.equal(r.isHost, true);
  assert.equal(r.isCoHost, true);
  assert.equal(r.canRecord, true);
});

test("evaluateScopeRights: no rights means no powers", () => {
  const r = evaluateScopeRights({}, "room", "r1", { spaceId: "s1" }, false);
  assert.equal(r.isHost, false);
  assert.equal(r.isCoHost, false);
  assert.equal(r.canRecord, false);
});

test("evaluateScopeRights: host on the room gains host powers", () => {
  const rights = { room_r1: { role: "host", canRecord: true } };
  const r = evaluateScopeRights(rights, "room", "r1", {}, false);
  assert.equal(r.isHost, true);
  assert.equal(r.isCoHost, true);
  assert.equal(r.canRecord, true);
});

test("evaluateScopeRights: space host inherits host powers in the space's rooms", () => {
  const rights = { space_s1: { role: "host", canRecord: true } };
  const r = evaluateScopeRights(rights, "room", "r1", { spaceId: "s1" }, false);
  assert.equal(r.isHost, true);
  assert.equal(r.canRecord, true);
});

test("evaluateScopeRights: co-host on the room is not a host but can publish", () => {
  const rights = { room_r1: { role: "co-host", canRecord: false } };
  const r = evaluateScopeRights(rights, "room", "r1", {}, false);
  assert.equal(r.isHost, false);
  assert.equal(r.isCoHost, true);
  assert.equal(r.canRecord, false);
});

test("evaluateScopeRights: co-host granted recording can record", () => {
  const rights = { room_r1: { role: "co-host", canRecord: true } };
  const r = evaluateScopeRights(rights, "room", "r1", {}, false);
  assert.equal(r.isCoHost, true);
  assert.equal(r.canRecord, true);
});

test("evaluateScopeRights: host without recording grant cannot record", () => {
  const rights = { room_r1: { role: "host", canRecord: false } };
  const r = evaluateScopeRights(rights, "room", "r1", {}, false);
  assert.equal(r.isHost, true);
  assert.equal(r.canRecord, false);
});

test("evaluateScopeRights: event host via event's room is still a host of the event", () => {
  const rights = { room_r1: { role: "host", canRecord: true } };
  const r = evaluateScopeRights(rights, "event", "e1", { roomId: "r1" }, false);
  assert.equal(r.isHost, true);
});

test("evaluateScopeRights: group co-host does not inherit to the room unless group is an ancestor", () => {
  const rights = { group_g1: { role: "co-host", canRecord: false } };
  const r = evaluateScopeRights(rights, "room", "r1", { groupId: "g1" }, false);
  assert.equal(r.isHost, false);
  assert.equal(r.isCoHost, true);
});
