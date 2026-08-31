export const REPLY_TEXT_MAX = 2000;

export function validateReplyText(text) {
  if (typeof text !== "string") return { ok: false, error: "Reply text is required" };
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Reply text cannot be empty" };
  if (trimmed.length > REPLY_TEXT_MAX) {
    return { ok: false, error: `Reply must be ${REPLY_TEXT_MAX} characters or fewer` };
  }
  return { ok: true, text: trimmed };
}
