import { adminDb } from "@/lib/firebase/admin";
import { getSpaceMembers } from "@/lib/server/spaces";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function filterCollection(collectionName, predicate, limit = 300) {
  const snap = await adminDb().collection(collectionName).limit(limit).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(predicate)
    .slice(0, 20);
}

function includes(field, q) {
  return typeof field === "string" && field.toLowerCase().includes(q);
}

export async function searchCommunity({ q = "", hashtag = "" }, uid = "") {
  const needle = q.trim().toLowerCase();
  const tag = hashtag.trim().toLowerCase().replace(/^#/, "");

  let posts = [];
  if (tag) {
    const snap = await adminDb()
      .collection("posts")
      .where("hashtags", "array-contains", tag)
      .limit(30)
      .get();
    posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (needle) {
    posts = await filterCollection("posts", (p) => {
      return (
        includes(p.text, needle) ||
        includes(p.authorName, needle) ||
        (Array.isArray(p.pollOptions) &&
          p.pollOptions.some((opt) => includes(opt, needle))) ||
        (Array.isArray(p.hashtags) && p.hashtags.includes(needle))
      );
    });
  }
  posts = posts
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
    .map((p) => ({
      id: p.id,
      text: p.text || "",
      authorName: p.authorName || "",
      authorId: p.authorId || "",
      kind: p.kind || "post",
      hashtags: p.hashtags || [],
      likeCount: Object.keys(p.likes || {}).length,
      likedByMe: !!(p.likes || {})[uid],
      bookmarkedByMe: !!(p.bookmarks || {})[uid],
      createdAt: toMillis(p.createdAt),
      spaceId: p.spaceId || "",
      groupId: p.groupId || "",
    }));

  const [members, groups, spaces, courses, events, rooms] = await Promise.all([
    needle
      ? filterCollection("users", (u) => includes(u.name, needle) || includes(u.email, needle))
      : [],
    needle
      ? filterCollection("groups", (g) => g.status === "active" && includes(g.name, needle))
      : [],
    needle
      ? filterCollection("spaces", (s) => s.status === "active" && includes(s.name, needle))
      : [],
    needle
      ? filterCollection("courses", (c) => c.status === "published" && includes(c.title, needle))
      : [],
    needle
      ? filterCollection("events", (e) => includes(e.title, needle) || includes(e.description, needle))
      : [],
    needle
      ? filterCollection("rooms", (r) => r.status === "active" && includes(r.name, needle))
      : [],
  ]);

  return {
    posts,
    members: members.map((m) => ({
      id: m.id,
      name: m.name || "",
      role: m.role || "member",
    })),
    groups: groups.map((g) => ({ id: g.id, name: g.name, slug: g.slug, description: g.description || "" })),
    spaces: await Promise.all(
      spaces.map(async (s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description || "",
        memberCount: (await getSpaceMembers(s.id)).length,
      }))
    ),
    courses: courses.map((c) => ({ id: c.id, title: c.title, description: c.description || "" })),
    events: events
      .sort((a, b) => toMillis(b.startTime) - toMillis(a.startTime))
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description || "",
        startTime: toMillis(e.startTime),
      })),
    rooms: rooms.map((r) => ({ id: r.id, name: r.name, slug: r.slug, description: r.description || "" })),
  };
}
