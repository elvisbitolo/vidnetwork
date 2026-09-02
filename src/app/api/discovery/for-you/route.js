import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userDoc = await adminDb().collection("users").doc(user.uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  const interests = [
    ...(Array.isArray(userData.crafts) ? userData.crafts : []),
    ...(Array.isArray(userData.interests) ? userData.interests : []),
    ...(Array.isArray(userData.hashtags) ? userData.hashtags : []),
  ].map((s) => String(s).toLowerCase().trim()).filter(Boolean);

  const ownHashtags = [];
  const ownPostsSnap = await adminDb()
    .collection("posts")
    .where("authorId", "==", user.uid)
    .limit(50)
    .get();
  for (const d of ownPostsSnap.docs) {
    const tags = d.data().hashtags;
    if (!Array.isArray(tags)) continue;
    for (const t of tags) {
      const clean = String(t).toLowerCase().trim();
      if (clean && ownHashtags.indexOf(clean) === -1 && ownHashtags.length < 8) {
        ownHashtags.push(clean);
      }
    }
  }
  const allInterests = [...interests, ...ownHashtags];
  const interestsSet = new Set(allInterests);

  const [postsSnap, spacesSnap, coursesSnap] = await Promise.all([
    adminDb().collection("posts").orderBy("createdAt", "desc").limit(100).get(),
    adminDb().collection("spaces").where("status", "==", "active").limit(50).get(),
    adminDb().collection("courses").where("status", "==", "published").limit(50).get(),
  ]);

  function scoreItem(item) {
    let score = 0;
    const text = ((item.text || "") + " " + (item.description || "") + " " + (item.title || "")).toLowerCase();
    for (const interest of interestsSet) {
      if (text.includes(interest)) score += 10;
    }
    const tags = item.hashtags || [];
    for (const tag of tags) {
      if (interestsSet.has(String(tag).toLowerCase())) score += 5;
    }
    if (item.likes) score += Object.keys(item.likes).length * 0.5;
    return score;
  }

  function getReason(item) {
    const text = ((item.text || "") + " " + (item.description || "") + " " + (item.title || "")).toLowerCase();
    for (const interest of allInterests) {
      if (text.includes(interest)) {
        const label = interest.charAt(0).toUpperCase() + interest.slice(1);
        return `Because you like ${label}`;
      }
    }
    return null;
  }

  const posts = postsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data(), _type: "post" }))
    .map((item) => ({ ...item, _score: scoreItem(item), _reason: getReason(item) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10)
    .map(({ _score, _reason, ...item }) => item);

  const spaces = spacesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data(), _type: "space" }))
    .map((item) => ({ ...item, _score: scoreItem(item), _reason: getReason(item) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10)
    .map(({ _score, _reason, ...item }) => item);

  const courses = coursesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data(), _type: "course" }))
    .map((item) => ({ ...item, _score: scoreItem(item), _reason: getReason(item) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10)
    .map(({ _score, _reason, ...item }) => item);

  return NextResponse.json({ posts, spaces, courses });
}
