"use client";

import { useState } from "react";
import styles from "./account.module.css";

function normalize(value) {
  return (value || "").trim();
}

const LIMITS = { name: 60, headline: 120, location: 80, bio: 600 };

export default function ProfileEditor({ initial }) {
  const [name, setName] = useState(initial.name || "");
  const [headline, setHeadline] = useState(initial.headline || "");
  const [location, setLocation] = useState(initial.location || "");
  const [bio, setBio] = useState(initial.bio || "");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setNotice("");

    const cleanName = normalize(name);
    if (!cleanName) {
      setError("Name is required.");
      return;
    }
    if (cleanName.length > LIMITS.name) {
      setError(`Name must be ${LIMITS.name} characters or fewer.`);
      return;
    }
    if (normalize(headline).length > LIMITS.headline) {
      setError(`Headline must be ${LIMITS.headline} characters or fewer.`);
      return;
    }
    if (normalize(location).length > LIMITS.location) {
      setError(`Location must be ${LIMITS.location} characters or fewer.`);
      return;
    }
    if (normalize(bio).length > LIMITS.bio) {
      setError(`About you must be ${LIMITS.bio} characters or fewer.`);
      return;
    }

    const patch = {};
    if (cleanName !== normalize(initial.name)) patch.name = cleanName;
    const cleanHeadline = normalize(headline);
    if (cleanHeadline !== normalize(initial.headline)) patch.headline = cleanHeadline;
    const cleanLocation = normalize(location);
    if (cleanLocation !== normalize(initial.location)) patch.location = cleanLocation;
    const cleanBio = normalize(bio);
    if (cleanBio !== normalize(initial.bio)) patch.bio = cleanBio;

    if (Object.keys(patch).length === 0) {
      setNotice("No changes to save.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
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
      {notice && <p className={styles.formNotice}>{notice}</p>}
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="profile-name">Name</label>
        <input
          id="profile-name"
          className={styles.input}
          type="text"
          required
          maxLength={LIMITS.name}
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
          maxLength={LIMITS.headline}
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
          maxLength={LIMITS.location}
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
          maxLength={LIMITS.bio}
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
