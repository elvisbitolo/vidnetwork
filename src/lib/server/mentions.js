import { adminDb } from "@/lib/firebase/admin";
import { createNotification } from "./notifications";

const MENTION_REGEX = /@([a-zA-Z0-9_]{1,30})/g;

export function extractMentions(text) {
  if (typeof text !== "string") return [];
  const mentions = [];
  const seen = new Set();
  let match;
  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    if (!seen.has(username)) {
      seen.add(username);
      mentions.push(username);
    }
  }
  return mentions;
}

export async function resolveMentions(usernames) {
  if (!usernames.length) return [];
  const results = [];
  for (const username of usernames) {
    const snap = await adminDb()
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      results.push({ uid: doc.id, username, name: doc.data().name || username });
    }
  }
  return results;
}

export async function sendMentionNotifications({
  mentions,
  actorId,
  actorName,
  targetId,
  href,
  text,
  excludeSelf = true,
}) {
  for (const mention of mentions) {
    if (excludeSelf && mention.uid === actorId) continue;
    await createNotification({
      userId: mention.uid,
      type: "mention",
      actorId,
      actorName,
      targetId,
      href,
      text: `mentioned you in a ${text || "post"}`,
    }).catch(() => {});
  }
}

export async function searchMembersForMention(query, limit = 8) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const snap = await adminDb().collection("users").limit(100).get();
  const matches = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const name = (data.name || "").toLowerCase();
    const username = (data.username || "").toLowerCase();
    if (name.includes(q) || username.includes(q)) {
      matches.push({
        uid: doc.id,
        name: data.name || "",
        username: data.username || "",
        photoURL: data.photoURL || "",
      });
      if (matches.length >= limit) break;
    }
  }
  matches.sort((a, b) => {
    const aExact = a.username === q || a.name.toLowerCase() === q;
    const bExact = b.username === q || b.name.toLowerCase() === q;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    const aStarts = a.username.startsWith(q) || a.name.toLowerCase().startsWith(q);
    const bStarts = b.username.startsWith(q) || b.name.toLowerCase().startsWith(q);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  });
  return matches;
}
