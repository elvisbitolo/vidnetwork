"use client";

import { useState } from "react";
import styles from "./profile.module.css";

export default function RecognitionForm({ toUid, values }) {
  const [value, setValue] = useState(values[0] || "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/recognitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUid, value, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recognition failed");
      setDone(true);
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className={styles.recognizeDone}>Recognized for being {value}. They were notified!</p>;
  }

  return (
    <form className={styles.recognizeBox} onSubmit={handleSubmit}>
      <p className={styles.recognizeLabel}>Recognize this member</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.recognizeValues}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            className={value === v ? `${styles.valueBtn} ${styles.valueActive}` : styles.valueBtn}
            onClick={() => setValue(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <input
        className={styles.recognizeInput}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (max 500 characters)"
        maxLength={500}
      />
      <button className={styles.messageBtn} disabled={busy}>
        {busy ? "Sending…" : `Recognize for being ${value}`}
      </button>
    </form>
  );
}
