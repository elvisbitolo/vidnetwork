export function postAccessCheck(post, ctx) {
  if (ctx.isOwner || post.authorId === ctx.uid) {
    return { ok: true, post };
  }
  if (!ctx.isActiveSub) {
    return { ok: false, status: 403, error: "Active membership required" };
  }
  if (post.spaceId && !ctx.isSpaceMember) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (post.groupId && !ctx.isGroupMember) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, post };
}

export function nextLikeState(likes, uid) {
  const current = likes || {};
  const already = Object.prototype.hasOwnProperty.call(current, uid);
  const count = Object.keys(current).length + (already ? -1 : 1);
  return { already, liked: !already, count };
}
