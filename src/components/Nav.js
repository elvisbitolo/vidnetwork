"use client";

import Link from "next/link";
import NotificationBell from "./NotificationBell";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/rooms", label: "Rooms" },
  { href: "/courses", label: "Courses" },
  { href: "/groups", label: "Groups" },
  { href: "/spaces", label: "Spaces" },
  { href: "/feed", label: "Feed" },
  { href: "/chat", label: "Chat" },
  { href: "/members", label: "Members" },
  { href: "/events", label: "Events" },
  { href: "/search", label: "Search" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Nav({ role }) {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/account">Community</Link>
        <div className={styles.links}>
          {LINKS.map((link) => (
            <Link key={link.href} className={styles.link} href={link.href}>{link.label}</Link>
          ))}
          {role === "owner" && (
            <>
              <Link className={styles.link} href="/recordings">Recordings</Link>
              <Link className={styles.link} href="/admin/rooms">Manage</Link>
              <Link className={styles.link} href="/admin/moderation">Moderation</Link>
            </>
          )}
          {role === "moderator" && (
            <>
              <Link className={styles.link} href="/recordings">Recordings</Link>
              <Link className={styles.link} href="/admin/moderation">Moderation</Link>
            </>
          )}
          <NotificationBell />
          <Link className={styles.account} href="/account">Account</Link>
        </div>
      </div>
    </nav>
  );
}
