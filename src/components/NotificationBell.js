"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import styles from "./Nav.module.css";

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUnread(0);
        return;
      }
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
      );
      const unsubSnap = onSnapshot(
        q,
        (snap) => setUnread(snap.docs.filter((d) => !d.data().read).length),
        () => {}
      );
      return unsubSnap;
    });
    return unsubAuth;
  }, []);

  return (
    <Link className={styles.bell} href="/notifications" title="Notifications">
      <span className={styles.bellIcon}>🔔</span>
      {unread > 0 && <span className={styles.bellBadge}>{unread}</span>}
    </Link>
  );
}
