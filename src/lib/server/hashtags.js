export function extractHashtags(text) {
  if (!text || typeof text !== "string") return [];
  const tags = new Set();
  for (const match of text.matchAll(/(?:^|\s)#([a-zA-Z0-9_]+)/g)) {
    const tag = match[1].toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

export function hashtagRegex() {
  return /(?:^|\s)#([a-zA-Z0-9_]+)/g;
}
