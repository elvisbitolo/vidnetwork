function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSubsequence(query, text) {
  let i = 0;
  for (let j = 0; j < text.length && i < query.length; j++) {
    if (text[j] === query[i]) i++;
  }
  return i === query.length;
}

export function scoreMatch(query, text) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return 0;
  if (typeof text !== "string" || !text) return 0;
  const t = text.toLowerCase();
  const escaped = escapeRegExp(q);

  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (new RegExp(`\\b${escaped}\\b`).test(t)) return 60;
  if (t.includes(q)) return 40;
  if (isSubsequence(q, t)) return 20;
  return 0;
}

export function rankResults(query, items, textGetter) {
  return items
    .map((item, index) => {
      const raw = textGetter ? textGetter(item) || "" : "";
      const text = Array.isArray(raw) ? raw.join(" ") : raw;
      return { item, score: scoreMatch(query, text), index };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => ({ ...r.item, _score: r.score }));
}

export function buildAutocompleteSuggestions(query, members = [], spaces = [], courses = [], events = []) {
  const sections = [
    {
      type: "member",
      items: members,
      label: (m) => m.name || "",
      subtitle: (m) => (m.username ? `@${m.username}` : ""),
    },
    {
      type: "space",
      items: spaces,
      label: (s) => s.name || "",
      subtitle: () => "",
      enrich: (s) => ({ slug: s.slug || "" }),
    },
    {
      type: "course",
      items: courses,
      label: (c) => c.title || "",
      subtitle: () => "Course",
    },
    {
      type: "event",
      items: events,
      label: (e) => e.title || "",
      subtitle: () => "Event",
    },
  ];

  const suggestions = [];
  for (const section of sections) {
    for (const item of section.items) {
      const label = section.label(item);
      const score = scoreMatch(query, label);
      if (score <= 0 || !item.id) continue;
      suggestions.push({
        type: section.type,
        id: item.id,
        label,
        subtitle: section.subtitle(item),
        ...(section.enrich ? section.enrich(item) : {}),
        _score: score,
      });
    }
  }

  suggestions.sort((a, b) => b._score - a._score);
  return suggestions.slice(0, 8).map(({ _score, ...rest }) => rest);
}

export function parseSearchQuery(raw) {
  const trimmed = String(raw || "").trim().toLowerCase();
  const tokens = trimmed ? trimmed.split(/\s+/) : [];
  return { tokens, phrase: tokens.join(" ") };
}
