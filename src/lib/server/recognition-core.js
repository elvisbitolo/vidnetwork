export const RECOGNITION_VALUES = [
  "Generous",
  "Inspiring",
  "Helpful",
  "Supportive",
  "Brilliant",
];

export const RECOGNITION_POINTS = 15;

const MAX_NOTE_LENGTH = 500;

export function validateRecognition({ value, note, toUid, fromUid }) {
  if (!toUid || !fromUid) {
    return { ok: false, reason: "A member is required" };
  }
  if (toUid === fromUid) {
    return { ok: false, reason: "You can't recognize yourself" };
  }
  if (!RECOGNITION_VALUES.includes(value)) {
    return { ok: false, reason: "Choose a value to recognize" };
  }
  if (note && typeof note === "string" && note.trim().length > MAX_NOTE_LENGTH) {
    return { ok: false, reason: "Note is too long (max 500 characters)" };
  }
  return { ok: true, reason: "" };
}

export function recognitionCountLabel(count) {
  if (!Number.isFinite(Number(count)) || Number(count) <= 0) return "No recognitions yet";
  return count === 1 ? "1 recognition" : `${count} recognitions`;
}
