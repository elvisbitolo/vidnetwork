"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";
import LiveNowBanner from "./LiveNowBanner";
import styles from "./Nav.module.css";

const OVERVIEW = [{ href: "/dashboard", label: "Dashboard" }];

const CONTENT = [
  { href: "/courses", label: "Courses" },
  { href: "/articles", label: "Articles" },
  { href: "/rooms", label: "Live Rooms" },
  { href: "/events", label: "Events" },
  { href: "/recordings", label: "Recordings" },
  { href: "/gallery", label: "Gallery" },
  { href: "/challenges", label: "Challenges" },
];

const COMMUNITY = [
  { href: "/feed", label: "Feed" },
  { href: "/topics", label: "Topics" },
  { href: "/discovery", label: "Discovery" },
  { href: "/members", label: "Members" },
  { href: "/groups", label: "Groups" },
  { href: "/spaces", label: "Spaces" },
  { href: "/chat", label: "Chat" },
  { href: "/search", label: "Search" },
  { href: "/leaderboard", label: "Leaderboard" },
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
      { href: "/admin/rooms", label: "Manage rooms" },
      { href: "/admin/courses", label: "Manage courses" },
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/questions", label: "Questions" },
      { href: "/admin/hosts", label: "Scoped hosts" },
      { href: "/admin/moderation", label: "Moderation" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("sidebarCollapsed") === "1"
  );
  const [collections, setCollections] = useState([]);
  const [hasHostTools, setHasHostTools] = useState(
    () => role === "owner" || role === "moderator"
  );
  const [onboardingDone, setOnboardingDone] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const analyticsLinks = getAnalyticsLinks(role);
  const monetizationLinks = getMonetizationLinks(role);
  const automationLinks = getAutomationLinks(role);
  const administrationLinks = getAdministrationLinks(role);
  const close = () => setMobileOpen(false);

  useEffect(() => {
    window.localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  }

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
    fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.completed) setOnboardingDone(false);
      })
      .catch(() => {});
  }, [role]);

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
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={mobileOpen ? `${styles.burger} ${styles.burgerOpen}` : styles.burger}
            onClick={toggleSidebar}
            aria-expanded={mobileOpen || !collapsed}
            aria-controls="sidebar-menu"
            aria-label="Toggle navigation"
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
          <Link className={styles.brand} href="/dashboard" onClick={close}>
            VidNetwork
          </Link>
        </div>
        <div className={styles.topbarRight}>
          <NotificationBell />
          <ProfileMenu />
        </div>
      </header>

      <div className={styles.shell}>
        <aside
          id="sidebar-menu"
          className={
            mobileOpen
              ? `${styles.sidebar} ${styles.sidebarOpen}`
              : collapsed
                ? `${styles.sidebar} ${styles.sidebarCollapsed}`
                : styles.sidebar
          }
        >
          <div className={styles.sidebarInner}>
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
            </nav>
          </div>
        </aside>

        {mobileOpen && (
          <div className={styles.backdrop} onClick={close} aria-hidden="true" />
        )}

        <div className={styles.content}>
          <LiveNowBanner />
          {!onboardingDone && !bannerDismissed && (
            <div style={{
              margin: "0 20px 16px",
              padding: "14px 20px",
              background: "linear-gradient(135deg, rgba(109,93,246,0.15), rgba(167,139,250,0.1))",
              border: "1px solid rgba(167,139,250,0.25)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <p style={{ fontSize: 14, color: "#f5f5f5", margin: 0 }}>
                <strong>Complete your profile</strong> — tell us about your craft so we can personalize your experience.
              </p>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setBannerDismissed(true)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(255,255,255,0.08)",
                    color: "#9b9bab",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Later
                </button>
                <a
                  href="/onboarding"
                  style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#a78bfa",
                    color: "#ffffff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  Set up
                </a>
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
