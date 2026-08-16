"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
import LiveNowBanner from "./LiveNowBanner";
import styles from "./Nav.module.css";

const OVERVIEW = [{ href: "/dashboard", label: "Dashboard" }];

const CONTENT = [
  { href: "/courses", label: "Courses" },
  { href: "/rooms", label: "Live Rooms" },
  { href: "/events", label: "Events" },
  { href: "/recordings", label: "Recordings" },
];

const COMMUNITY = [
  { href: "/feed", label: "Feed" },
  { href: "/discovery", label: "Discovery" },
  { href: "/members", label: "Members" },
  { href: "/groups", label: "Groups" },
  { href: "/spaces", label: "Spaces" },
  { href: "/chat", label: "Chat" },
  { href: "/search", label: "Search" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const ACCOUNT = [
  { href: "/account", label: "Account" },
  { href: "/notifications", label: "Notifications" },
];

function getAnalyticsLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/income", label: "Income" },
    ];
  }
  return [];
}

function getMonetizationLinks(role) {
  if (role === "owner") {
    return [{ href: "/admin/promocodes", label: "Promo codes" }];
  }
  return [];
}

function getAutomationLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin/automations", label: "Automations" },
      { href: "/admin/announcements", label: "Announcements" },
    ];
  }
  return [];
}

function getAdministrationLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin", label: "Overview" },
      { href: "/admin/rooms", label: "Manage rooms" },
      { href: "/admin/courses", label: "Manage courses" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/questions", label: "Questions" },
      { href: "/admin/hosts", label: "Scoped hosts" },
      { href: "/admin/moderation", label: "Moderation" },
      { href: "/admin/settings", label: "Settings" },
    ];
  }
  if (role === "moderator") {
    return [
      { href: "/admin/hosts", label: "Scoped hosts" },
      { href: "/admin/moderation", label: "Moderation" },
    ];
  }
  return [];
}

export default function Nav({ role, children }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState([]);
  const [hasHostTools, setHasHostTools] = useState(
    () => role === "owner" || role === "moderator"
  );
  const analyticsLinks = getAnalyticsLinks(role);
  const monetizationLinks = getMonetizationLinks(role);
  const automationLinks = getAutomationLinks(role);
  const administrationLinks = getAdministrationLinks(role);
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

  useEffect(() => {
    if (role === "owner" || role === "moderator") return;
    fetch("/api/host/scopes")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setHasHostTools(data.scopes.length > 0);
      })
      .catch(() => {});
  }, [role]);

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
              <p className={styles.groupLabel}>Overview</p>
              {OVERVIEW.map((link) => (
                <Link
                  key={link.href}
                  className={styles.sidebarLink}
                  href={link.href}
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}

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

              <p className={styles.groupLabel}>Community</p>
              {COMMUNITY.map((link) => (
                <Link
                  key={link.href}
                  className={styles.sidebarLink}
                  href={link.href}
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}

              {hasHostTools && !analyticsLinks.length && (
                <>
                  <p className={styles.groupLabel}>Host</p>
                  <Link className={styles.sidebarLink} href="/host" onClick={close}>
                    Host tools
                  </Link>
                </>
              )}

              {analyticsLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>Analytics</p>
                  {analyticsLinks.map((link) => (
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

              {monetizationLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>Monetization</p>
                  {monetizationLinks.map((link) => (
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

              {automationLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>Automation</p>
                  {automationLinks.map((link) => (
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

              {administrationLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>Administration</p>
                  {administrationLinks.map((link) => (
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

              <p className={styles.groupLabel}>Account</p>
              {ACCOUNT.map((link) => (
                <Link
                  key={link.href}
                  className={styles.sidebarLink}
                  href={link.href}
                  onClick={close}
                >
                  {link.label}
                </Link>
              ))}
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
