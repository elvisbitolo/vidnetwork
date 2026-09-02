import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getSpace, isSpaceMember } from "@/lib/server/spaces";
import { extractHashtags } from "@/lib/server/hashtags";
import { extractMentions, resolveMentions, sendMentionNotifications } from "@/lib/server/mentions";
import { awardPoints, awardBadge, POINTS } from "@/lib/server/gamification";
import { createNotification } from "@/lib/server/notifications";
import { runAutomations } from "@/lib/server/automations";
import { logError } from "@/lib/server/log";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { validatePostText, isValidImageUrl, POST_TEXT_MAX } from "@/lib/server/posts-core";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }
  const limited = rateLimitGuard(`feed-post:${user.uid}`, { limit: 10 });
  if (limited) return limited;

  const {
    text,
    imageUrl = "",
    groupId = "",
    spaceId = "",
    kind = "post",
    pollOptions = [],
    pollDeadline = "",
  } = await req.json();

  let cleanText = typeof text === "string" ? text.trim() : "";
  const postKind = ["post", "poll", "question", "win"].includes(kind) ? kind : "post";
  if (postKind === "poll") {
    const cleanOptions = (Array.isArray(pollOptions) ? pollOptions : [])
      .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
      .filter((opt) => opt.length > 0 && opt.length <= 100);
    if (cleanOptions.length < 2 || cleanOptions.length > 5) {
      return NextResponse.json({ error: "Polls need 2-5 options" }, { status: 400 });
    }
    if (pollDeadline) {
      const deadlineDate = new Date(pollDeadline);
      if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Poll deadline must be a valid future date" }, { status: 400 });
      }
    }
  } else {
    if (!cleanText && !imageUrl) {
      return NextResponse.json({ error: "Post text required" }, { status: 400 });
    }
    if (cleanText) {
      const check = validatePostText(cleanText);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      cleanText = check.text;
    }
  }

  if (cleanText.length > POST_TEXT_MAX) {
    return NextResponse.json(
      { error: `Post text too long (max ${POST_TEXT_MAX} characters)` },
      { status: 400 }
    );
  }

  if (imageUrl && !isValidImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const userDoc = await getUserDoc(user.uid);
  const authorName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";
  const authorRole = userDoc?.role || "member";

  const data = {
    authorId: user.uid,
    authorName,
    authorRole,
    text: cleanText,
    likes: {},
    pinned: false,
    kind: postKind,
    hashtags: extractHashtags(cleanText),
    bookmarks: {},
    commentCount: 0,
    lastActivityAt: new Date(),
    createdAt: new Date(),
  };
  if (imageUrl && typeof imageUrl === "string") {
    data.imageUrl = imageUrl;
  }
  if (postKind === "poll") {
    data.pollOptions = (Array.isArray(pollOptions) ? pollOptions : [])
      .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
      .filter((opt) => opt.length > 0)
      .slice(0, 5);
    data.pollCounts = {};
    data.pollTotal = 0;
    if (pollDeadline) {
      data.pollDeadline = new Date(pollDeadline).toISOString();
    }
  }

  let spaceSlug = "";
  let spaceName = "";
  if (spaceId) {
    const space = await getSpace(spaceId);
    if (!space || space.status !== "active" || !(space.features || {}).feed) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 });
    }
    const isOwner = userDoc?.role === "owner";
    const membership = await isSpaceMember(spaceId, user.uid);
    if (!membership && !isOwner) {
      return NextResponse.json({ error: "Join the space first" }, { status: 403 });
    }
    data.spaceId = spaceId;
    spaceSlug = space.slug;
    spaceName = space.name;
  }

  if (groupId) {
    const groupSnap = await adminDb().collection("groups").doc(groupId).get();
    if (!groupSnap.exists || groupSnap.data().status !== "active") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const memberSnap = await adminDb().collection("groupMembers").doc(`${groupId}_${user.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Join the group first" }, { status: 403 });
    }
    data.groupId = groupId;
  }

  const ref = await adminDb().collection("posts").add(data);

  const mentionUsernames = extractMentions(cleanText);
  if (mentionUsernames.length > 0) {
    resolveMentions(mentionUsernames).then((mentions) =>
      sendMentionNotifications({
        mentions,
        actorId: user.uid,
        actorName: authorName,
        targetId: ref.id,
        href: spaceId ? `/spaces/${spaceSlug}` : `/feed`,
        text: "post",
      })
    ).catch((err) => {
      logError("mention.notify_failed", { uid: user.uid, postId: ref.id, error: err.message });
    });
  }

  runAutomations("new_post", {
    authorName,
    authorUid: user.uid,
    postText: cleanText.slice(0, 200),
    postKind,
    postId: ref.id,
    subjectUid: user.uid,
    subjectName: authorName,
  }).catch((err) => {
    logError("automation.new_post_failed", { uid: user.uid, postId: ref.id, error: err.message });
  });

  const postCount = (await adminDb().collection("posts").where("authorId", "==", user.uid).get()).size;
  await awardPoints(user.uid, POINTS.POST, authorName).catch((err) => {
    logError("gamification.post_failed", { uid: user.uid, postId: ref.id, error: err.message });
  });
  await awardBadge(user.uid, "first_post", authorName).catch((err) => {
    logError("gamification.badge_failed", { uid: user.uid, postId: ref.id, error: err.message });
  });
  if (postCount >= 10)
    await awardBadge(user.uid, "ten_posts", authorName).catch((err) => {
      logError("gamification.badge_failed", { uid: user.uid, postId: ref.id, error: err.message });
    });
  if (postCount >= 50)
    await awardBadge(user.uid, "fifty_posts", authorName).catch((err) => {
      logError("gamification.badge_failed", { uid: user.uid, postId: ref.id, error: err.message });
    });

  if (spaceId) {
    const membersSnap = await adminDb()
      .collection("spaceMembers")
      .where("spaceId", "==", spaceId)
      .limit(100)
      .get();
    for (const member of membersSnap.docs) {
      const memberId = member.data().userId;
      if (memberId === user.uid) continue;
      await createNotification({
        userId: memberId,
        type: "space_activity",
        actorId: user.uid,
        actorName: authorName,
        text: "posted in " + (spaceName || "a space"),
        href: `/spaces/${spaceSlug}`,
      });
    }
  }

  return NextResponse.json({ id: ref.id });
}
