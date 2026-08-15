import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CHECKLIST_STEPS,
  normalizeChecklistSteps,
} from "../settings-core.js";

test("normalizeChecklistSteps: returns defaults for non-array input", () => {
  assert.equal(normalizeChecklistSteps(null), DEFAULT_CHECKLIST_STEPS);
  assert.equal(normalizeChecklistSteps(undefined), DEFAULT_CHECKLIST_STEPS);
  assert.equal(normalizeChecklistSteps("nope"), DEFAULT_CHECKLIST_STEPS);
});

test("normalizeChecklistSteps: returns defaults for an empty array", () => {
  assert.equal(normalizeChecklistSteps([]), DEFAULT_CHECKLIST_STEPS);
});

test("normalizeChecklistSteps: cleans keys and fills defaults", () => {
  const steps = normalizeChecklistSteps([
    { key: "Profile Name!", label: "Complete your profile", href: "/account" },
    { key: "room", label: "", href: "", cta: "" },
  ]);
  assert.equal(steps[0].key, "profile_name_");
  assert.equal(steps[0].href, "/account");
  assert.equal(steps[0].cta, "Go");
  assert.equal(steps[1].label, "room");
  assert.equal(steps[1].href, "#");
  assert.equal(steps[1].cta, "Go");
});

test("normalizeChecklistSteps: drops steps without a key", () => {
  const steps = normalizeChecklistSteps([
    { label: "No key here" },
    { key: "post", label: "Make a post" },
  ]);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].key, "post");
});

test("normalizeChecklistSteps: keeps known keys in order", () => {
  const steps = normalizeChecklistSteps([
    { key: "rsvp", label: "RSVP" },
    { key: "profile", label: "Profile" },
    { key: "room", label: "Room" },
    { key: "post", label: "Post" },
  ]);
  assert.deepEqual(
    steps.map((step) => step.key),
    ["rsvp", "profile", "room", "post"]
  );
});
