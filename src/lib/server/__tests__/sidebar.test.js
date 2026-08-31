import { test } from "node:test";
import assert from "node:assert/strict";
import { getNextMilestone } from "../sidebar-core.js";

test("getNextMilestone: no streak targets first milestone at 3 days", () => {
  assert.deepEqual(getNextMilestone(0), { target: 3, current: 0, daysLeft: 3 });
});

test("getNextMilestone: climbs through the streak targets", () => {
  assert.deepEqual(getNextMilestone(2), { target: 3, current: 2, daysLeft: 1 });
  assert.deepEqual(getNextMilestone(4), { target: 7, current: 4, daysLeft: 3 });
  assert.deepEqual(getNextMilestone(7), { target: 30, current: 7, daysLeft: 23 });
});

test("getNextMilestone: returns null once all targets are reached", () => {
  assert.equal(getNextMilestone(30), null);
  assert.equal(getNextMilestone(99), null);
});

test("getNextMilestone: tolerates null/undefined/garbage input", () => {
  assert.deepEqual(getNextMilestone(), { target: 3, current: 0, daysLeft: 3 });
  assert.deepEqual(getNextMilestone("4"), { target: 7, current: 4, daysLeft: 3 });
});