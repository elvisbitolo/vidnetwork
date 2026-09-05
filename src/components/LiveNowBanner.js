"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Nav.module.css";

export default function LiveNowBanner() {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/rooms/live");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setRooms(data.rooms || []);
        }
      } catch {
        // Ignore transient network errors; banner simply stays hidden.
      }
    }
    poll();
    const timer = setInterval(poll, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (rooms.length === 0) return null;

  const [primary, ...rest] = rooms;
  const extra = rest.length > 0 ? ` +${rest.length} more` : "";

  return (
    <div className={styles.liveBanner}>
      <Link className={styles.liveLink} href={`/rooms/${primary.slug}`}>
        <span className={styles.liveDot} />
        <span className={styles.liveText}>
          {primary.name}{extra}
        </span>
        <span className={styles.liveJoin}>Join</span>
      </Link>
    </div>
  );
}
