"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./groups.module.css";

export default function GroupsBoard({ groups, uid }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function handleJoin(groupId) {
    if (!uid) return;
    setBusyId(groupId);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join group");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.grid}>
        {groups.map((group) => (
          <div key={group.id} className={styles.card}>
            <div className={styles.cardBody}>
              <Link className={styles.cardLink} href={`/groups/${group.slug}`}>
                <h2 className={styles.cardTitle}>{group.name}</h2>
              </Link>
              {group.description && <p className={styles.cardDesc}>{group.description}</p>}
              <p className={styles.cardMeta}>
                {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
            <button
              className={group.joined ? `${styles.join} ${styles.joinActive}` : styles.join}
              onClick={() => handleJoin(group.id)}
              disabled={!!busyId}
            >
              {busyId === group.id ? "Saving…" : group.joined ? "Joined ✓" : "Join group"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
