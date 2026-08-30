export const DEFAULT_CHECKLIST_STEPS = [
  { key: "profile", label: "Complete your profile", href: "/account/profile", cta: "Edit profile" },
  { key: "room", label: "Join your first live room", href: "/rooms", cta: "Browse rooms" },
  { key: "post", label: "Make your first post", href: "/feed", cta: "Open the feed" },
  { key: "rsvp", label: "RSVP to an event", href: "/events", cta: "See events" },
];

export const CHECKLIST_KEYS = ["profile", "room", "post", "rsvp"];

export function normalizeChecklistSteps(steps) {
  if (!Array.isArray(steps)) return DEFAULT_CHECKLIST_STEPS;
  const cleaned = steps
    .map((step) => {
      const key = String(step?.key || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_");
      if (!key) return null;
      return {
        key,
        label: String(step?.label || "").trim() || key,
        href: String(step?.href || "#").trim() || "#",
        cta: String(step?.cta || "Go").trim() || "Go",
      };
    })
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : DEFAULT_CHECKLIST_STEPS;
}
