"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./spaces.module.css";

const FEATURE_ICONS = {
  feed: "💬",
  chat: "💭",
  members: "👥",
  events: "📅",
  courses: "🎓",
  live: "📡",
};

export default function SpacesBoard({ spaces, uid }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function handleJoin(spaceId) {
    if (!uid) return;
    setBusyId(spaceId);
    setError("");
    try {
      const res = await fetch(`/api/spaces/${spaceId}/join`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join space");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  const enabledFeatures = (features) =>
    Object.entries(features || {})
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.grid}>
        {spaces.map((space) => {
          const features = enabledFeatures(space.features);
          return (
            <div key={space.id} className={styles.card}>
              <div className={styles.cardBody}>
                <Link className={styles.cardLink} href={`/spaces/${space.slug}`}>
                  <h2 className={styles.cardTitle}>{space.name}</h2>
                </Link>
                {space.description && <p className={styles.cardDesc}>{space.description}</p>}
                <p className={styles.cardMeta}>
                  {space.memberCount} {space.memberCount === 1 ? "member" : "members"}
                  <span className={styles.accessBadge}>
                    {space.access === "public"
                      ? "Public"
                      : space.access === "private"
                      ? "Private"
                      : "Invite only"}
                    {space.requiredTier === "premium" ? " · Premium" : ""}
                  </span>
                </p>
                {features.length > 0 && (
                  <p className={styles.featureChips}>
                    {features.map((feature) => (
                      <span key={feature} className={styles.featureChip}>
                        {FEATURE_ICONS[feature]} {feature}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <button
                className={space.joined ? `${styles.join} ${styles.joinActive}` : styles.join}
                onClick={() => handleJoin(space.id)}
                disabled={!!busyId}
              >
                {busyId === space.id ? "Saving…" : space.joined ? "Joined ✓" : "Join space"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
