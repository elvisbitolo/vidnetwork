import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getSpace, isSpaceMember } from "@/lib/server/spaces";
import { extractHashtags } from "@/lib/server/hashtags";
import { awardPoints, awardBadge, POINTS } from "@/lib/server/gamification";
import { createNotification } from "@/lib/server/notifications";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const {
    text,
    imageUrl = "",
    groupId = "",
    spaceId = "",
    kind = "post",
    pollOptions = [],
  } = await req.json();

  const cleanText = typeof text === "string" ? text.trim() : "";
  const postKind = ["post", "poll", "question"].includes(kind) ? kind : "post";

  if (postKind === "poll") {
    const cleanOptions = (Array.isArray(pollOptions) ? pollOptions : [])
      .map((opt) => (typeof opt === "string" ? opt.trim() : ""))
      .filter((opt) => opt.length > 0 && opt.length <= 100);
    if (cleanOptions.length < 2 || cleanOptions.length > 5) {
      return NextResponse.json({ error: "Polls need 2-5 options" }, { status: 400 });
    }
  } else if (!cleanText) {
    return NextResponse.json({ error: "Post text required" }, { status: 400 });
  }

  const userDoc = await getUserDoc(user.uid);
  const authorName = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";

  const data = {
    authorId: user.uid,
    authorName,
    text: cleanText,
    likes: {},
    pinned: false,
    kind: postKind,
    hashtags: extractHashtags(cleanText),
    bookmarks: {},
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
    data.pollVotes = {};
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

  const postCount = (await adminDb().collection("posts").where("authorId", "==", user.uid).get()).size;
  await awardPoints(user.uid, POINTS.POST, authorName);
  await awardBadge(user.uid, "first_post", authorName);
  if (postCount >= 10) await awardBadge(user.uid, "ten_posts", authorName);
  if (postCount >= 50) await awardBadge(user.uid, "fifty_posts", authorName);

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
