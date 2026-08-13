"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./recordings.module.css";

export default function TranscribeButton({ id, busyLabel }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleTranscribe() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/recordings/${id}/transcribe`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <button className={styles.transcribe} onClick={handleTranscribe} disabled={busy}>
        {busy ? (busyLabel || "Transcribing…") : "Transcribe"}
      </button>
      {error && <span className={styles.cardPath} style={{ color: "#b91c1c" }}>{error}</span>}
    </span>
  );
}
