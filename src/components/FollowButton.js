"use client";

import { useState, useEffect } from "react";

export default function FollowButton({ targetUserId, initialFollowing, initialFollowerCount, initialFollowingCount, isSelf }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [busy, setBusy] = useState(false);

  if (isSelf) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/members/${targetUserId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: following ? "unfollow" : "follow" }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setFollowerCount(data.followerCount);
        setFollowingCount(data.followingCount);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={toggle}
        disabled={busy}
        style={{
          height: 36,
          padding: "0 20px",
          borderRadius: 999,
          border: following ? "1px solid #d8d8e3" : "none",
          background: following ? "#ffffff" : "#7c3aed",
          color: following ? "#34344a" : "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
          transition: "all 0.15s ease",
        }}
      >
        {busy ? "..." : following ? "Following" : "Follow"}
      </button>
      <span style={{ fontSize: 13, color: "#6b6b7b", fontWeight: 600 }}>
        {followerCount} {followerCount === 1 ? "follower" : "followers"}
      </span>
      <span style={{ fontSize: 13, color: "#6b6b7b", fontWeight: 600 }}>
        {followingCount} following
      </span>
    </div>
  );
}
