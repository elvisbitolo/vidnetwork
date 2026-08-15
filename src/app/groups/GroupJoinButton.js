"use client";

import { useState } from "react";
import styles from "./groups.module.css";

export default function GroupJoinButton({ groupId, initialJoined }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't update membership");
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Couldn't update membership");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        className={initialJoined ? `${styles.joinBtn} ${styles.joinBtnActive}` : styles.joinBtn}
        onClick={handleToggle}
        disabled={busy}
      >
        {busy ? "Saving…" : initialJoined ? "Leave group" : "Join group"}
      </button>
      {error && <p className={styles.joinError}>{error}</p>}
    </div>
  );
}
