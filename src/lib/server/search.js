import { adminDb } from "@/lib/firebase/admin";
import { canModerate } from "@/lib/server/auth";
import { rankResults } from "@/lib/server/search-engine";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function fetchDocs(collectionName, limit = 300) {
  const snap = await adminDb().collection(collectionName).limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getUserMemberships(uid) {
  const [spaceSnap, groupSnap] = await Promise.all([
    adminDb().collection("spaceMembers").where("userId", "==", uid).limit(500).get(),
    adminDb().collection("groupMembers").where("userId", "==", uid).limit(500).get(),
  ]);
  return {
    spaceIds: new Set(spaceSnap.docs.map((d) => d.data().spaceId)),
    groupIds: new Set(groupSnap.docs.map((d) => d.data().groupId)),
  };
}

const TYPE_LIMIT = 20;

const TYPE_CATEGORIES = {
  posts: ["posts"],
  members: ["members"],
  spaces: ["spaces", "groups", "rooms"],
  courses: ["courses"],
  events: ["events"],
};

export async function searchCommunity(
  { q = "", hashtag = "", type = "", spaceId = "" },
  uid = "",
  role = ""
) {
  const needle = q.trim().toLowerCase();
  const tag = hashtag.trim().toLowerCase().replace(/^#/, "");
  const isStaff = canModerate({ role });
  const normalizedType =
    ["posts", "members", "spaces", "courses", "events"].includes(type) ? type : "";

  const includeCategory = (category) =>
    !normalizedType || (TYPE_CATEGORIES[normalizedType] || []).includes(category);

  const memberships = isStaff ? null : await getUserMemberships(uid);

  const canReadPost = (post) => {
    if (isStaff || post.authorId === uid) return true;
    if (post.status === "deleted") return false;
    if (post.spaceId && !memberships.spaceIds.has(post.spaceId)) return false;
    if (post.groupId && !memberships.groupIds.has(post.groupId)) return false;
    return true;
  };

  const inSpaceScope = (item) => !spaceId || item.spaceId === spaceId;

  const postText = (p) => [
    p.text,
    p.authorName,
    ...(Array.isArray(p.pollOptions) ? p.pollOptions : []),
    ...(Array.isArray(p.hashtags) ? p.hashtags : []),
  ];

  let rawPosts = [];
  if (tag) {
    const snap = await adminDb()
      .collection("posts")
      .where("hashtags", "array-contains", tag)
      .limit(60)
      .get();
    rawPosts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (needle && includeCategory("posts")) {
    rawPosts = await fetchDocs("posts");
  }

  const visiblePosts = rawPosts.filter(canReadPost).filter(inSpaceScope);

  let posts;
  if (tag) {
    posts = [...visiblePosts].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } else if (needle) {
    posts = rankResults(needle, visiblePosts, postText);
  } else {
    posts = [];
  }

  posts = posts.slice(0, TYPE_LIMIT).map((p) => {
      const out = {
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
      };
      if (p._score) out._score = p._score;
      return out;
    });

  const [members, groups, spaces, courses, events, rooms] = await Promise.all([
    needle && includeCategory("members")
      ? rankResults(needle, await fetchDocs("users"), (u) => [u.name, u.username]).slice(0, TYPE_LIMIT)
      : [],
    needle && includeCategory("spaces")
      ? rankResults(
          needle,
          (await fetchDocs("groups")).filter((g) => g.status === "active"),
          (g) => g.name
        ).slice(0, TYPE_LIMIT)
      : [],
    needle && includeCategory("spaces")
      ? rankResults(
          needle,
          (await fetchDocs("spaces")).filter(
            (s) =>
              s.status === "active" &&
              (s.publicPreview || isStaff || memberships.spaceIds.has(s.id))
          ),
          (s) => s.name
        ).slice(0, TYPE_LIMIT)
      : [],
    needle && includeCategory("courses")
      ? rankResults(
          needle,
          (await fetchDocs("courses"))
            .filter((c) => c.status === "published")
            .filter(inSpaceScope),
          (c) => c.title
        ).slice(0, TYPE_LIMIT)
      : [],
    needle && includeCategory("events")
      ? rankResults(
          needle,
          (await fetchDocs("events"))
            .filter(
              (e) =>
                e.status !== "deleted" &&
                (e.publicPreview ||
                  isStaff ||
                  !e.spaceId ||
                  memberships.spaceIds.has(e.spaceId))
            )
            .filter(inSpaceScope),
          (e) => [e.title, e.description]
        ).slice(0, TYPE_LIMIT)
      : [],
    needle && includeCategory("spaces")
      ? rankResults(
          needle,
          (await fetchDocs("rooms")).filter(
            (r) =>
              r.status === "active" &&
              (r.publicPreview ||
                isStaff ||
                (r.spaceId && memberships.spaceIds.has(r.spaceId)) ||
                (r.groupId && memberships.groupIds.has(r.groupId)))
          ),
          (r) => r.name
        ).slice(0, TYPE_LIMIT)
      : [],
  ]);

  return {
    posts,
    members: members.map((m) => ({
      id: m.id,
      name: m.name || "",
      role: m.role || "member",
      _score: m._score,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      description: g.description || "",
      _score: g._score,
    })),
    spaces: await Promise.all(
      spaces.map(async (s) => {
        const memberSnap = await adminDb()
          .collection("spaceMembers")
          .where("spaceId", "==", s.id)
          .limit(1)
          .get();
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          description: s.description || "",
          memberCount: memberSnap.size,
          _score: s._score,
        };
      })
    ),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description || "",
      _score: c._score,
    })),
    events: events
      .sort((a, b) => toMillis(b.startTime) - toMillis(a.startTime))
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description || "",
        startTime: toMillis(e.startTime),
        _score: e._score,
      })),
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description || "",
      _score: r._score,
    })),
  };
}
