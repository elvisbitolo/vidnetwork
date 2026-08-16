"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/client-auth";
import styles from "./Nav.module.css";

function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(role) {
  if (role === "owner") return "Owner";
  if (role === "moderator") return "Moderator";
  return "Member";
}

export default function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setProfile(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  const name = profile?.name || "Account";
  const isStaff = profile?.role === "owner" || profile?.role === "moderator";

  return (
    <div className={styles.profileWrap}>
      <button
        type="button"
        className={styles.profileBtn}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile menu"
      >
        {profile?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.profileAvatar} src={profile.photoURL} alt="" />
        ) : (
          <span className={styles.profileAvatar}>{initials(name)}</span>
        )}
        <span className={styles.profileName}>{name}</span>
        <svg
          className={open ? `${styles.profileCaret} ${styles.profileCaretUp}` : styles.profileCaret}
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.profileMenu} role="menu">
          <div className={styles.profileHeader}>
            {profile?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.profileMenuAvatar} src={profile.photoURL} alt="" />
            ) : (
              <span className={styles.profileMenuAvatar}>{initials(name)}</span>
            )}
            <div style={{ minWidth: 0 }}>
              <p className={styles.profileNameMenu}>{name}</p>
              <p className={styles.profileEmail}>
                {profile?.email || ""}
                {isStaff ? (
                  <span className={styles.roleBadge}>{roleLabel(profile.role)}</span>
                ) : null}
              </p>
            </div>
          </div>

          <Link className={styles.profileLink} href="/account" onClick={() => setOpen(false)}>
            Account
          </Link>
          <Link className={styles.profileLink} href="/notifications" onClick={() => setOpen(false)}>
            Notifications
          </Link>
          {isStaff && (
            <Link className={styles.profileLink} href="/admin" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
          {isStaff && (
            <Link className={styles.profileLink} href="/admin/settings" onClick={() => setOpen(false)}>
              Settings
            </Link>
          )}
          <div className={styles.profileMenuDivider} />
          <button type="button" className={styles.profileLink} role="menuitem" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
