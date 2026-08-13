import { test } from "node:test";
import assert from "node:assert/strict";
import { addInterval, expandEvent, expandEvents } from "../events-core.js";

function event(overrides = {}) {
  return {
    id: "evt_1",
    title: "Coffee chat",
    startTime: new Date("2026-09-01T12:00:00Z"),
    recurrence: null,
    ...overrides,
  };
}

test("addInterval advances daily/weekly/monthly", () => {
  const base = new Date("2026-01-15T00:00:00Z");
  assert.equal(addInterval(base, "daily", 1).getTime(), new Date("2026-01-16T00:00:00Z").getTime());
  assert.equal(addInterval(base, "weekly", 1).getTime(), new Date("2026-01-22T00:00:00Z").getTime());
  assert.equal(addInterval(base, "monthly", 1).getTime(), new Date("2026-02-15T00:00:00Z").getTime());
});

test("non-recurring event yields a single occurrence", () => {
  const occurrences = expandEvent(event());
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].occurrenceId, "evt_1_0");
  assert.equal(occurrences[0].occurrenceIndex, 0);
});

test("recurring event expands by count", () => {
  const occurrences = expandEvent(
    event({ recurrence: { freq: "weekly", interval: 1, count: 3 } })
  );
  assert.equal(occurrences.length, 3);
  assert.equal(occurrences[1].startTime.getTime(), new Date("2026-09-08T12:00:00Z").getTime());
  assert.equal(occurrences[2].occurrenceId, "evt_1_2");
});

test("expansion stops at the until boundary", () => {
  const until = new Date("2026-09-10T00:00:00Z");
  const occurrences = expandEvent(
    event({ recurrence: { freq: "weekly", interval: 1, count: 10 } }),
    until
  );
  assert.equal(occurrences.length, 2);
});

test("recurring count is capped at 52", () => {
  const occurrences = expandEvent(
    event({ recurrence: { freq: "daily", interval: 1, count: 5000 } })
  );
  assert.equal(occurrences.length, 52);
});

test("expandEvents sorts across events", () => {
  const later = event({ id: "b", startTime: new Date("2026-10-01T00:00:00Z") });
  const earlier = event({ id: "a", startTime: new Date("2026-08-01T00:00:00Z") });
  const sorted = expandEvents([later, earlier]);
  assert.equal(sorted[0].id, "a");
  assert.equal(sorted[1].id, "b");
});
