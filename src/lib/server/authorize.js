import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc, canModerate } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { meetsTier } from "@/lib/server/plans";
import { adminDb } from "@/lib/firebase/admin";

function deny(status, error) {
  return { ok: false, status, error };
}

export async function authorize(options = {}) {
  const { active, tier, owner, moderator, groupId, self } = options;

  const user = await getCurrentUser();
  if (!user) return deny(401, "Not signed in");

  const userDoc = await getUserDoc(user.uid);

  if (owner && userDoc?.role !== "owner") return deny(403, "Forbidden");
  if (moderator && !canModerate(userDoc)) return deny(403, "Forbidden");
  if (self && user.uid !== self && !canModerate(userDoc)) return deny(403, "Forbidden");

  let sub = null;
  const needsSub = active !== false || tier;
  if (needsSub) {
    sub = await getSubscription(user.uid);
    if (!isActiveSub(sub)) return deny(403, "Active membership required");
    if (tier && userDoc?.role !== "owner" && !meetsTier(sub.tier || "standard", tier)) {
      return deny(403, "Premium membership required");
    }
  }

  if (groupId) {
    const memberSnap = await adminDb()
      .collection("groupMembers")
      .doc(`${groupId}_${user.uid}`)
      .get();
    if (userDoc?.role !== "owner" && !memberSnap.exists) {
      return deny(403, "Join the group first");
    }
  }

  return { ok: true, user, userDoc, sub };
}

export function guardJson(result) {
  return result.ok ? null : NextResponse.json({ error: result.error }, { status: result.status });
}

export const requireUser = (options = {}) => authorize({ active: false, ...options });

export const requireActiveMember = (options = {}) => authorize({ active: true, ...options });

export const requireTier = (tier, options = {}) =>
  authorize({ active: true, tier, ...options });

export const requireOwner = (options = {}) =>
  authorize({ owner: true, active: false, ...options });

export const requireModerator = (options = {}) =>
  authorize({ moderator: true, active: false, ...options });

export const requireGroupMember = (groupId, options = {}) =>
  authorize({ groupId, active: false, ...options });
