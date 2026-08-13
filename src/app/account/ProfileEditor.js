"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import styles from "./account.module.css";

export default function ProfileEditor({ uid, initial }) {
  const [name, setName] = useState(initial.name || "");
  const [headline, setHeadline] = useState(initial.headline || "");
  const [location, setLocation] = useState(initial.location || "");
  const [bio, setBio] = useState(initial.bio || "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    const patch = {};
    if (name !== initial.name) patch.name = name.trim();
    if (headline !== initial.headline) patch.headline = headline.trim();
    if (location !== initial.location) patch.location = location.trim();
    if (bio !== initial.bio) patch.bio = bio.trim();
    try {
      if (Object.keys(patch).length > 0) {
        await updateDoc(doc(db, "users", uid), patch);
      }
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.card} id="profile" onSubmit={handleSave}>
      <h2 className={styles.cardTitle}>Edit profile</h2>
      {error && <p className={styles.formError}>{error}</p>}
      {saved && <p className={styles.formSaved}>Profile saved.</p>}
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-name">Name</label>
        <input
          id="profile-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-headline">Headline</label>
        <input
          id="profile-headline"
          className={styles.input}
          type="text"
          placeholder="e.g. Yoga teacher · mom of two"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-location">Location</label>
        <input
          id="profile-location"
          className={styles.input}
          type="text"
          placeholder="e.g. Austin, TX"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-bio">About you</label>
        <textarea
          id="profile-bio"
          className={styles.textarea}
          rows={3}
          placeholder="Tell the community a little about yourself…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <button className={styles.manage} type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
