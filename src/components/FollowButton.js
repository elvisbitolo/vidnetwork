"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({ targetUserId, initialFollowing, initialFollowerCount, initialFollowingCount, isSelf }) {
  const router = useRouter();
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [followerCount, setFollowerCount] = useState(Number(initialFollowerCount) || 0);
  const [followingCount, setFollowingCount] = useState(Number(initialFollowingCount) || 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isSelf) return;
    let active = true;
    fetch(`/api/members/${targetUserId}/follow`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setFollowing(Boolean(data.following));
        setFollowerCount(Number(data.followerCount) || 0);
        setFollowingCount(Number(data.followingCount) || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [targetUserId, isSelf]);

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
        setFollowing(Boolean(data.following));
        setFollowerCount(Number(data.followerCount) || 0);
        setFollowingCount(Number(data.followingCount) || 0);
        router.refresh();
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
          border: following ? "1px solid var(--primary, #f42e79)" : "none",
          background: following ? "#ffffff" : "var(--primary, #f42e79)",
          color: following ? "var(--primary, #f42e79)" : "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.6 : 1,
          transition: "all 0.15s ease",
        }}
      >
        {busy ? "..." : following ? "Following" : "Follow"}
      </button>
      <span style={{ fontSize: 13, color: "#8a7c6f", fontWeight: 600 }}>
        {followerCount} {followerCount === 1 ? "follower" : "followers"}
      </span>
      <span style={{ fontSize: 13, color: "#8a7c6f", fontWeight: 600 }}>
        {followingCount} following
      </span>
    </div>
  );
}