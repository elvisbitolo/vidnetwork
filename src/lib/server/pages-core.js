export const PAGE_TITLE_MAX = 100;
export const PAGE_CONTENT_MAX = 50000;
export const PAGE_SLUG_MIN = 3;
export const PAGE_SLUG_MAX = 80;
export const PAGE_VISIBILITIES = ["all", "members"];

export function validatePageTitle(title) {
  if (typeof title !== "string" || !title.trim()) {
    return { ok: false, error: "Title required" };
  }
  const clean = title.trim();
  if (clean.length > PAGE_TITLE_MAX) {
    return { ok: false, error: `Title too long (max ${PAGE_TITLE_MAX} characters)` };
  }
  return { ok: true, title: clean };
}

export function validatePageContent(content) {
  if (typeof content !== "string" || !content.trim()) {
    return { ok: false, error: "Content required" };
  }
  const clean = content.trim();
  if (clean.length > PAGE_CONTENT_MAX) {
    return { ok: false, error: `Content too long (max ${PAGE_CONTENT_MAX} characters)` };
  }
  return { ok: true, content: clean };
}

export function validatePageSlug(slug) {
  if (typeof slug !== "string" || !slug.trim()) {
    return { ok: false, error: "Slug required" };
  }
  const clean = slug.trim().toLowerCase();
  if (clean.length < PAGE_SLUG_MIN || clean.length > PAGE_SLUG_MAX) {
    return { ok: false, error: `Slug must be ${PAGE_SLUG_MIN}-${PAGE_SLUG_MAX} characters` };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
    return { ok: false, error: "Slug may only contain letters, numbers, and hyphens" };
  }
  return { ok: true, slug: clean };
}

export function validateVisibility(visibility) {
  return PAGE_VISIBILITIES.includes(visibility) ? visibility : "all";
}
