import { QUIZ_QUESTIONS } from "../profile/questions.js";

function clean(value, max) {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}

export const CRAFT_OPTIONS = [
  "crochet",
  "knitting",
  "weaving",
  "spinning",
  "dyeing",
  "embroidery",
  "macrame",
];

export function normalizeProfile(body) {
  const patch = {};
  const errors = {};

  if ("name" in body) {
    const name = clean(body.name, 60);
    if (!name) errors.name = "Name is required";
    else patch.name = name;
  }
  if ("headline" in body) patch.headline = clean(body.headline, 120);
  if ("location" in body) patch.location = clean(body.location, 80);
  if ("country" in body) patch.country = clean(body.country, 60);
  if ("state" in body) patch.state = clean(body.state, 60);
  if ("bio" in body) patch.bio = clean(body.bio, 600);
  if ("favoriteColors" in body) {
    const raw = Array.isArray(body.favoriteColors) ? body.favoriteColors.slice(0, 3) : [];
    patch.favoriteColors = raw
      .map((c) => (typeof c === "string" ? c.trim() : ""))
      .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
  }
  if ("goToYarn" in body) patch.goToYarn = clean(body.goToYarn, 80);
  if ("favoriteHookSize" in body) patch.favoriteHookSize = clean(body.favoriteHookSize, 40);
  if ("crafts" in body) {
    const raw = Array.isArray(body.crafts) ? body.crafts : [];
    patch.crafts = [
      ...new Set(
        raw
          .map((c) => (typeof c === "string" ? c.trim().toLowerCase() : ""))
          .filter((c) => CRAFT_OPTIONS.includes(c))
      ),
    ].slice(0, CRAFT_OPTIONS.length);
  }
  if ("proudestProject" in body) patch.proudestProject = clean(body.proudestProject, 140);
  if ("bestGiftProject" in body) patch.bestGiftProject = clean(body.bestGiftProject, 140);
  QUIZ_QUESTIONS.forEach((q) => {
    if (q.field in body) patch[q.field] = clean(body[q.field], 120);
  });
  if ("photoURL" in body) {
    const photoURL = typeof body.photoURL === "string" ? body.photoURL.trim().slice(0, 300000) : "";
    if (photoURL === "") {
      patch.photoURL = "";
    } else if (/^(https?:\/\/|data:image\/)/.test(photoURL)) {
      patch.photoURL = photoURL;
    } else {
      errors.photoURL = "Profile photo must be a valid URL or image";
    }
  }
  if ("notifications" in body) {
    if (body.notifications === "on" || body.notifications === "off") {
      patch.notifications = body.notifications;
    } else {
      errors.notifications = "Notifications must be \"on\" or \"off\"";
    }
  }
  if ("socialLinks" in body) {
    const raw = Array.isArray(body.socialLinks) ? body.socialLinks : [];
    patch.socialLinks = raw
      .slice(0, 8)
      .map((link) => ({
        platform: clean(typeof link.platform === "string" ? link.platform : "other", 30) || "other",
        url: clean(typeof link.url === "string" ? link.url : "", 300),
      }))
      .filter((link) => link.url.length > 0);
  }

  return { patch, errors };
}

export function profileChanged(prev, patch) {
  const changed = Object.keys(patch).filter((key) => prev?.[key] !== patch[key]);
  return { changed, hasChanges: changed.length > 0 };
}
