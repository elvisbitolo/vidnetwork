import { test } from "node:test";
import assert from "node:assert/strict";
import { extractHashtags } from "../hashtags.js";
import {
  slugify,
  normalizeFeatures,
  normalizeAccess,
  SPACE_FEATURES,
} from "../spaces-core.js";

test("extractHashtags: pulls unique lowercase tags", () => {
  assert.deepEqual(
    extractHashtags("Loving #Community and #community plus #RealTime! and no tag here #x"),
    ["community", "realtime", "x"]
  );
});

test("extractHashtags: empty input", () => {
  assert.deepEqual(extractHashtags(""), []);
  assert.deepEqual(extractHashtags("   "), []);
  assert.deepEqual(extractHashtags(null), []);
  assert.deepEqual(extractHashtags(123), []);
});

test("extractHashtags: does not treat mid-word hashes as tags", () => {
  assert.deepEqual(extractHashtags("email is a#b and c#d"), []);
  assert.deepEqual(extractHashtags("tagged#no"), []);
});

test("slugify: normalizes names", () => {
  assert.equal(slugify("Morning Coffee"), "morning-coffee");
  assert.equal(slugify("  Spaces & Rooms! "), "spaces-rooms");
  assert.equal(slugify(""), "");
});

test("normalizeFeatures: defaults every feature to false", () => {
  const normalized = normalizeFeatures({ feed: true });
  for (const feature of SPACE_FEATURES) {
    assert.equal(normalized[feature], feature === "feed");
  }
});

test("normalizeFeatures: coerces truthy values to booleans", () => {
  const normalized = normalizeFeatures({ chat: 1, members: "yes", live: 0 });
  assert.equal(normalized.chat, true);
  assert.equal(normalized.members, true);
  assert.equal(normalized.live, false);
});

test("normalizeAccess: falls back to public for unknown values", () => {
  assert.equal(normalizeAccess("public"), "public");
  assert.equal(normalizeAccess("private"), "private");
  assert.equal(normalizeAccess("invite"), "invite");
  assert.equal(normalizeAccess("banana"), "public");
  assert.equal(normalizeAccess(""), "public");
});
