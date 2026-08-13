"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./recordings.module.css";

export default function DeleteRecording({ id, disabled }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm("Delete this recording permanently? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/recordings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete recording");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button className={styles.delete} onClick={handleDelete} disabled={busy || disabled}>
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && <span className={styles.cardPath} style={{ color: "#b91c1c" }}>{error}</span>}
    </span>
  );
}
