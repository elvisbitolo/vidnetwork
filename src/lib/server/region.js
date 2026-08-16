export function regionKeyFor(country, state) {
  const c = (country || "").trim();
  const s = (state || "").trim();
  if (!c && !s) return "";
  return [s, c].filter(Boolean).join(", ");
}

export function regionChatId(regionKey) {
  const slug = (regionKey || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `region__${slug || "unknown"}`;
}
