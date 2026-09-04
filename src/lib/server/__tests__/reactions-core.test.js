import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QUICK_EMOJIS,
  isValidReactionEmoji,
  normalizedReactionEmoji,
  nextReactionState,
  summarizeReactions,
} from "../reactions-core.js";

test("QUICK_EMOJIS includes expected set", () => {
  assert.ok(QUICK_EMOJIS.includes("👍"));
  assert.ok(QUICK_EMOJIS.includes("🧶"));
  assert.ok(QUICK_EMOJIS.includes("❤️"));
});

test("isValidReactionEmoji: accepts trim-able quick emojis", () => {
  assert.equal(isValidReactionEmoji("👍"), true);
  assert.equal(isValidReactionEmoji("  👍  "), true);
  assert.equal(isValidReactionEmoji("🚀"), false);
  assert.equal(isValidReactionEmoji(""), false);
  assert.equal(isValidReactionEmoji(42), false);
  assert.equal(isValidReactionEmoji(null), false);
});

test("normalizedReactionEmoji: trims and coerces", () => {
  assert.equal(normalizedReactionEmoji("  👍  "), "👍");
  assert.equal(normalizedReactionEmoji(42), "");
  assert.equal(normalizedReactionEmoji(undefined), "");
});

test("nextReactionState: first reaction adds the user", () => {
  const state = nextReactionState({}, "👍", "u1");
  assert.equal(state.already, false);
  assert.equal(state.reacted, true);
  assert.equal(state.count, 1);
});

test("nextReactionState: toggling off removes the user", () => {
  const state = nextReactionState({ "👍": { u1: true, u2: true } }, "👍", "u1");
  assert.equal(state.already, true);
  assert.equal(state.reacted, false);
  assert.equal(state.count, 1);
  assert.equal(state.reactions["👍"].u1, undefined);
});

test("nextReactionState: distinct emojis are independent", () => {
  const state = nextReactionState({ "👍": { u1: true } }, "❤️", "u1");
  assert.equal(state.count, 1);
  assert.ok(state.reactions["👍"].u1);
  assert.ok(state.reactions["❤️"].u1);
});

test("summarizeReactions: counts and sorts emojis by popularity", () => {
  const summary = summarizeReactions({
    "🔥": { u1: true, u2: true, u3: true },
    "👍": { u1: true },
  });
  assert.deepEqual(summary, [
    { emoji: "🔥", count: 3 },
    { emoji: "👍", count: 1 },
  ]);
});

test("summarizeReactions: ignores empty emoji buckets and non-object input", () => {
  assert.deepEqual(summarizeReactions({ "👍": {} }), []);
  assert.deepEqual(summarizeReactions(null), []);
  assert.deepEqual(summarizeReactions(undefined), []);
});
