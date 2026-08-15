function clean(value, max) {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}

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
  if ("bio" in body) patch.bio = clean(body.bio, 600);
  if ("notifications" in body) {
    if (body.notifications === "on" || body.notifications === "off") {
      patch.notifications = body.notifications;
    } else {
      errors.notifications = "Notifications must be \"on\" or \"off\"";
    }
  }

  return { patch, errors };
}

export function profileChanged(prev, patch) {
  const changed = Object.keys(patch).filter((key) => prev?.[key] !== patch[key]);
  return { changed, hasChanges: changed.length > 0 };
}
