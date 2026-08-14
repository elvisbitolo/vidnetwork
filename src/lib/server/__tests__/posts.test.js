import { test } from "node:test";
import assert from "node:assert/strict";
import { postAccessCheck, nextLikeState } from "../posts-core.js";

const post = { authorId: "u1", spaceId: "s1", groupId: "" };
const groupPost = { authorId: "u1", spaceId: "", groupId: "g1" };

test("postAccessCheck: author always passes", () => {
  const result = postAccessCheck(post, {
    uid: "u1",
    isOwner: false,
    isActiveSub: false,
    isSpaceMember: false,
  });
  assert.equal(result.ok, true);
});

test("postAccessCheck: owner always passes", () => {
  const result = postAccessCheck(post, {
    uid: "u9",
    isOwner: true,
    isActiveSub: false,
    isSpaceMember: false,
  });
  assert.equal(result.ok, true);
});

test("postAccessCheck: non-member without active sub is denied", () => {
  const result = postAccessCheck(post, {
    uid: "u2",
    isOwner: false,
    isActiveSub: false,
    isSpaceMember: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.match(result.error, /membership/i);
});

test("postAccessCheck: non-space-member is denied", () => {
  const result = postAccessCheck(post, {
    uid: "u2",
    isOwner: false,
    isActiveSub: true,
    isSpaceMember: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("postAccessCheck: non-group-member is denied for group posts", () => {
  const result = postAccessCheck(groupPost, {
    uid: "u2",
    isOwner: false,
    isActiveSub: true,
    isSpaceMember: true,
    isGroupMember: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
});

test("postAccessCheck: active member with space membership passes", () => {
  const result = postAccessCheck(post, {
    uid: "u2",
    isOwner: false,
    isActiveSub: true,
    isSpaceMember: true,
    isGroupMember: true,
  });
  assert.equal(result.ok, true);
});

test("nextLikeState: first like adds and counts 1", () => {
  const state = nextLikeState({}, "u1");
  assert.equal(state.already, false);
  assert.equal(state.liked, true);
  assert.equal(state.count, 1);
});

test("nextLikeState: unlike removes and counts back to 0", () => {
  const state = nextLikeState({ u1: true, u2: true }, "u1");
  assert.equal(state.already, true);
  assert.equal(state.liked, false);
  assert.equal(state.count, 1);
});

test("nextLikeState: toggle is idempotent over repeated calls", () => {
  const first = nextLikeState({ u1: true }, "u1");
  assert.equal(first.liked, false);
  const second = nextLikeState({}, "u1");
  assert.equal(second.liked, true);
});
