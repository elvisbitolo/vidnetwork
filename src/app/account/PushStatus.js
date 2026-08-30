"use client";

import { useState, useEffect } from "react";
import styles from "./account.module.css";

export default function PushStatus() {
  const [permission, setPermission] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const handler = () => setPermission(Notification.permission);
    navigator.permissions?.query({ name: "notifications" }).then((status) => {
      status.addEventListener("change", handler);
      setPermission(Notification.permission);
    }).catch(() => {});
    return () => {
      navigator.permissions?.query({ name: "notifications" }).then((status) => {
        status.removeEventListener("change", handler);
      }).catch(() => {});
    };
  }, []);

  const on = permission === "granted";

  async function ask() {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      // ignore
    }
  }

  return (
    <div className={styles.row} style={{ marginTop: 10 }}>
      <div>
        <span className={styles.label}>Push notifications</span>
        <p className={styles.hint}>
          {on
            ? "Browser notifications are on — get notified about new messages and mentions."
            : permission === "denied"
              ? "Browser notifications are blocked in your browser settings. Allow notifications for this site to turn them on."
              : "Get browser notifications for new messages and mentions. You'll be asked for permission once."}
        </p>
      </div>
      {permission === "default" ? (
        <button type="button" className={styles.toggle} onClick={ask}>
          Enable
        </button>
      ) : (
        <button
          type="button"
          className={on ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
          aria-pressed={on}
          aria-label={on ? "Push notifications on" : "Push notifications off"}
        >
          {on ? "On" : "Off"}
        </button>
      )}
    </div>
  );
}