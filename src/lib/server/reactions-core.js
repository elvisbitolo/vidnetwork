export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉", "👏", "💯", "🧶", "⭐"];

export function isValidReactionEmoji(emoji) {
  return typeof emoji === "string" && QUICK_EMOJIS.includes(emoji.trim());
}

export function normalizedReactionEmoji(emoji) {
  return typeof emoji === "string" ? emoji.trim() : "";
}

export function nextReactionState(reactions, emoji, uid) {
  const current = reactions || {};
  const emojiState = current[emoji] || {};
  const already = Boolean(emojiState[uid]);
  const nextEmojiState = { ...emojiState };
  if (already) {
    delete nextEmojiState[uid];
  } else {
    nextEmojiState[uid] = true;
  }
  const next = { ...current, [emoji]: nextEmojiState };
  const count = Object.keys(nextEmojiState).length;
  return { already, reacted: !already, count, reactions: next };
}

export function summarizeReactions(reactions) {
  const out = [];
  for (const [emoji, users] of Object.entries(reactions || {})) {
    const count = Object.keys(users || {}).length;
    if (count > 0) out.push({ emoji, count });
  }
  return out.sort((a, b) => b.count - a.count);
}
