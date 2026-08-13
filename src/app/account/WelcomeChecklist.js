"use client";

import { useState, useEffect } from "react";
import {
  collection,
  doc,
  query,
  where,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import styles from "./account.module.css";

const STEPS = [
  { key: "profile", label: "Complete your profile", href: "#profile", cta: "Edit profile" },
  { key: "room", label: "Join your first live room", href: "/rooms", cta: "Browse rooms" },
  { key: "post", label: "Make your first post", href: "/feed", cta: "Open the feed" },
  { key: "rsvp", label: "RSVP to an event", href: "/events", cta: "See events" },
];

export default function WelcomeChecklist({ uid, initialProfile }) {
  const [profile, setProfile] = useState(initialProfile || {});
  const [hasRoomEvent, setHasRoomEvent] = useState(false);
  const [hasPost, setHasPost] = useState(false);
  const [hasRsvp, setHasRsvp] = useState(false);

  useEffect(() => {
    const unsubUser = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
    const unsubPosts = onSnapshot(
      query(collection(db, "posts"), where("authorId", "==", uid), limit(1)),
      (snap) => setHasPost(!snap.empty)
    );
    const unsubRsvps = onSnapshot(
      query(collection(db, "rsvps"), where("userId", "==", uid), limit(1)),
      (snap) => setHasRsvp(!snap.empty)
    );
    const unsubRooms = onSnapshot(
      query(collection(db, "roomEvents"), where("userId", "==", uid), limit(1)),
      (snap) => setHasRoomEvent(!snap.empty)
    );
    return () => {
      unsubUser();
      unsubPosts();
      unsubRsvps();
      unsubRooms();
    };
  }, [uid]);

  const profileDone = !!(profile.bio || profile.headline || profile.location);
  const doneMap = { profile: profileDone, room: hasRoomEvent, post: hasPost, rsvp: hasRsvp };
  const doneCount = STEPS.filter((step) => doneMap[step.key]).length;
  const allDone = doneCount === STEPS.length;

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>
        {allDone ? "Welcome, you're all set!" : "Welcome checklist"}
      </h2>
      <p className={styles.checklistProgress}>
        {doneCount} of {STEPS.length} complete
      </p>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
        />
      </div>
      <ul className={styles.checklist}>
        {STEPS.map((step) => {
          const done = doneMap[step.key];
          return (
            <li
              key={step.key}
              className={done ? `${styles.checkItem} ${styles.checkDone}` : styles.checkItem}
            >
              <span className={styles.checkMark}>{done ? "✓" : "•"}</span>
              <span className={styles.checkLabel}>{step.label}</span>
              {!done && (
                <a className={styles.checkCta} href={step.href}>{step.cta}</a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
