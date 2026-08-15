import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeNextRun,
  normalizeSchedule,
  formatSchedule,
} from "../questions-core.js";

test("normalizeSchedule: defaults to daily midnight", () => {
  assert.deepEqual(normalizeSchedule({}), {
    freq: "daily",
    hour: 0,
    minute: 0,
    weekday: 0,
    dayOfMonth: 1,
  });
});

test("normalizeSchedule: clamps hour and minute", () => {
  const s = normalizeSchedule({ freq: "daily", hour: 99, minute: -5 });
  assert.equal(s.hour, 23);
  assert.equal(s.minute, 0);
});

test("computeNextRun: daily runs later today when time has passed", () => {
  const after = new Date("2026-08-15T10:00:00Z").getTime();
  const run = computeNextRun({ freq: "daily", hour: 14, minute: 30 }, after);
  assert.equal(new Date(run).toISOString(), "2026-08-15T14:30:00.000Z");
});

test("computeNextRun: daily rolls to next day when time already passed", () => {
  const after = new Date("2026-08-15T16:00:00Z").getTime();
  const run = computeNextRun({ freq: "daily", hour: 9, minute: 0 }, after);
  assert.equal(new Date(run).toISOString(), "2026-08-16T09:00:00.000Z");
});

test("computeNextRun: weekly picks the matching weekday", () => {
  const after = new Date("2026-08-15T00:00:00Z").getTime(); // Saturday
  const run = computeNextRun({ freq: "weekly", weekday: 1, hour: 8 }, after); // Monday
  assert.equal(new Date(run).toISOString(), "2026-08-17T08:00:00.000Z");
});

test("computeNextRun: monthly picks the matching day", () => {
  const after = new Date("2026-08-15T00:00:00Z").getTime();
  const run = computeNextRun({ freq: "monthly", dayOfMonth: 1, hour: 7 }, after);
  assert.equal(new Date(run).toISOString(), "2026-09-01T07:00:00.000Z");
});

test("computeNextRun: weekly Saturday rolls to next week after its time passes", () => {
  const after = new Date("2026-08-15T10:00:00Z").getTime(); // Saturday, after 08:00
  const run = computeNextRun({ freq: "weekly", weekday: 6, hour: 8 }, after);
  assert.equal(new Date(run).toISOString(), "2026-08-22T08:00:00.000Z");
});

test("formatSchedule: renders human labels", () => {
  assert.equal(formatSchedule({ freq: "daily", hour: 9, minute: 5 }), "Daily at 09:05");
  assert.equal(formatSchedule({ freq: "weekly", weekday: 1, hour: 8 }), "Monday at 08:00");
  assert.match(formatSchedule({ freq: "monthly", dayOfMonth: 15 }), /Monthly on day 15/);
});
