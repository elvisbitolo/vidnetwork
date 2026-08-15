"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
import LiveNowBanner from "./LiveNowBanner";
import styles from "./Nav.module.css";

const FEATURES = [
  { href: "/dashboard", label: "Home" },
  { href: "/feed", label: "Feed" },
  { href: "/discovery", label: "Discovery" },
  { href: "/members", label: "Members" },
  { href: "/events", label: "Events" },
];

const CONTENT = [
  { href: "/rooms", label: "Rooms" },
  { href: "/courses", label: "Courses" },
  { href: "/spaces", label: "Spaces" },
  { href: "/groups", label: "Groups" },
  { href: "/chat", label: "Chat" },
  { href: "/search", label: "Search" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function getManageLinks(role) {
  if (role === "owner") {
    return [
      { href: "/recordings", label: "Recordings" },
      { href: "/admin/rooms", label: "Manage" },
      { href: "/admin/income", label: "Income" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/promocodes", label: "Promo codes" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/questions", label: "Questions" },
      { href: "/admin/automations", label: "Automations" },
      { href: "/admin/moderation", label: "Moderation" },
      { href: "/admin/settings", label: "Settings" },
    ];
  }
  if (role === "moderator") {
    return [
      { href: "/recordings", label: "Recordings" },
      { href: "/admin/moderation", label: "Moderation" },
    ];
  }
  return [];
}

export default function Nav({ role, children }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const manageLinks = getManageLinks(role);
  const close = () => setOpen(false);

  useEffect(() => {
    fetch("/api/collections")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setCollections(
            data.collections.filter((collection) => collection.spaces.length > 0)
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/dashboard" onClick={close}>
          VidNetwork
        </Link>
        <div className={styles.topbarRight}>
          <NotificationBell />
          <button
            type="button"
            className={open ? `${styles.burger} ${styles.burgerOpen}` : styles.burger}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="sidebar-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
        </div>
      </header>

      <div className={styles.shell}>
        <aside
          id="sidebar-menu"
          className={open ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
        >
          <div className={styles.sidebarInner}>
            <Link className={styles.sidebarBrand} href="/dashboard" onClick={close}>
              VidNetwork
            </Link>
            <nav className={styles.sidebarNav}>
              <p className={styles.groupLabel}>Global Features</p>
              {FEATURES.map((link) => (
                <Link
                  key={link.href}
                  className={styles.sidebarLink}
                  href={link.href}
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}

              {collections.length > 0 && (
                <>
                  <p className={styles.groupLabel}>Collections</p>
                  {collections.map((collection) => (
                    <div key={collection.id} className={styles.collection}>
                      <p className={styles.collectionName}>{collection.name}</p>
                      {collection.spaces.map((space) => (
                        <Link
                          key={space.id}
                          className={styles.sidebarLinkNested}
                          href={`/spaces/${space.slug}`}
                          onClick={close}
                        >
                          {space.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </>
              )}

              <p className={styles.groupLabel}>Content</p>
              {CONTENT.map((link) => (
                <Link
                  key={link.href}
                  className={styles.sidebarLink}
                  href={link.href}
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}

              {manageLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>Manage</p>
                  {manageLinks.map((link) => (
                    <Link
                      key={link.href}
                      className={styles.sidebarLink}
                      href={link.href}
                      onClick={close}
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
            <div className={styles.sidebarFooter}>
              <Link className={styles.account} href="/account" onClick={close}>
                Account
              </Link>
              <NotificationBell />
            </div>
          </div>
        </aside>

        <div className={styles.content}>
          <LiveNowBanner />
          {children}
        </div>
      </div>
    </>
  );
}
