import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RECOGNITION_VALUES,
  RECOGNITION_POINTS,
  validateRecognition,
  recognitionCountLabel,
} from "../recognition-core.js";

test("RECOGNITION_VALUES: includes the five core values", () => {
  assert.deepEqual(RECOGNITION_VALUES, [
    "Generous",
    "Inspiring",
    "Helpful",
    "Supportive",
    "Brilliant",
  ]);
});

test("RECOGNITION_POINTS: awards 15 points", () => {
  assert.equal(RECOGNITION_POINTS, 15);
});

test("validateRecognition: accepts a valid recognition", () => {
  assert.deepEqual(
    validateRecognition({ fromUid: "a", toUid: "b", value: "Helpful", note: "" }),
    { ok: true, reason: "" }
  );
});

test("validateRecognition: rejects self-recognition", () => {
  const result = validateRecognition({ fromUid: "a", toUid: "a", value: "Helpful" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /yourself/i);
});

test("validateRecognition: rejects missing recipient", () => {
  assert.equal(validateRecognition({ fromUid: "a", toUid: "", value: "Helpful" }).ok, false);
});

test("validateRecognition: rejects unknown values", () => {
  const result = validateRecognition({ fromUid: "a", toUid: "b", value: "Rude" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /value/i);
});

test("validateRecognition: rejects oversized notes", () => {
  const result = validateRecognition({
    fromUid: "a",
    toUid: "b",
    value: "Helpful",
    note: "x".repeat(501),
  });
  assert.equal(result.ok, false);
});

test("validateRecognition: allows a long-but-valid note", () => {
  assert.equal(
    validateRecognition({ fromUid: "a", toUid: "b", value: "Helpful", note: "x".repeat(500) }).ok,
    true
  );
});

test("recognitionCountLabel: pluralizes correctly", () => {
  assert.equal(recognitionCountLabel(0), "No recognitions yet");
  assert.equal(recognitionCountLabel(1), "1 recognition");
  assert.equal(recognitionCountLabel(3), "3 recognitions");
});
