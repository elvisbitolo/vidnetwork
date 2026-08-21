"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import NotificationBell from "./NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import ProfileMenu from "./ProfileMenu";
import LiveNowBanner from "./LiveNowBanner";
import ChatbotGuide from "./ChatbotGuide";
import styles from "./Nav.module.css";

function getAnalyticsLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin/analytics", key: "analytics" },
      { href: "/admin/income", key: "income" },
    ];
  }
  return [];
}

function getMonetizationLinks(role) {
  if (role === "owner") {
    return [{ href: "/admin/promocodes", key: "promoCodes" }];
  }
  return [];
}

function getAutomationLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin/automations", key: "automations" },
      { href: "/admin/announcements", key: "announcements" },
    ];
  }
  return [];
}

function getAdministrationLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin/rooms", key: "manageRooms" },
      { href: "/admin/courses", key: "manageCourses" },
      { href: "/admin/collections", key: "collections" },
      { href: "/admin/questions", key: "questions" },
      { href: "/admin/hosts", key: "scopedHosts" },
      { href: "/admin/moderation", key: "moderation" },
    ];
  }
  if (role === "moderator") {
    return [
      { href: "/admin/hosts", key: "scopedHosts" },
      { href: "/admin/moderation", key: "moderation" },
    ];
  }
  return [];
}

const OVERVIEW_ITEMS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/feed", key: "feed" },
];

const CONNECT_ITEMS = [
  { href: "/rooms", key: "rooms" },
  { href: "/events", key: "events" },
  { href: "/challenges", key: "challenges" },
];

const LEARN_ITEMS = [
  { href: "/courses", key: "courses" },
  { href: "/articles", key: "articles" },
  { href: "/recordings", key: "recordings" },
];

const COMMUNITY_ITEMS = [
  { href: "/members", key: "members" },
  { href: "/groups", key: "groups" },
  { href: "/spaces", key: "spaces" },
  { href: "/gallery", key: "gallery" },
  { href: "/discovery", key: "discover" },
  { href: "/leaderboard", key: "leaderboard" },
];

export default function Nav({ role, children }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
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
            aria-label={t("toggleNav")}
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
          <LanguageSwitcher />
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
              <p className={styles.groupLabel}>{t("overview")}</p>
              {OVERVIEW_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  className={styles.sidebarLink}
                  href={item.href}
                  onClick={close}
                >
                  {t(item.key)}
                </Link>
              ))}

              <p className={styles.groupLabel}>{t("connect")}</p>
              {CONNECT_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  className={styles.sidebarLink}
                  href={item.href}
                  onClick={close}
                >
                  {t(item.key)}
                </Link>
              ))}

              <p className={styles.groupLabel}>{t("learn")}</p>
              {LEARN_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  className={styles.sidebarLink}
                  href={item.href}
                  onClick={close}
                >
                  {t(item.key)}
                </Link>
              ))}

              {collections.length > 0 && (
                <>
                  <p className={styles.groupLabel}>{t("collections")}</p>
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

              <p className={styles.groupLabel}>{t("community")}</p>
              {COMMUNITY_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  className={styles.sidebarLink}
                  href={item.href}
                  onClick={close}
                >
                  {t(item.key)}
                </Link>
              ))}

              {hasHostTools && !analyticsLinks.length && (
                <>
                  <p className={styles.groupLabel}>{t("host")}</p>
                  <Link className={styles.sidebarLink} href="/host" onClick={close}>
                    {t("hostTools")}
                  </Link>
                </>
              )}

              {analyticsLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>{t("analytics")}</p>
                  {analyticsLinks.map((item) => (
                    <Link
                      key={item.href}
                      className={styles.sidebarLink}
                      href={item.href}
                      onClick={close}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </>
              )}

              {monetizationLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>{t("monetization")}</p>
                  {monetizationLinks.map((item) => (
                    <Link
                      key={item.href}
                      className={styles.sidebarLink}
                      href={item.href}
                      onClick={close}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </>
              )}

              {automationLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>{t("automation")}</p>
                  {automationLinks.map((item) => (
                    <Link
                      key={item.href}
                      className={styles.sidebarLink}
                      href={item.href}
                      onClick={close}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </>
              )}

              {administrationLinks.length > 0 && (
                <>
                  <p className={styles.groupLabel}>{t("administration")}</p>
                  {administrationLinks.map((item) => (
                    <Link
                      key={item.href}
                      className={styles.sidebarLink}
                      href={item.href}
                      onClick={close}
                    >
                      {t(item.key)}
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
                <strong>{t("completeProfile")}</strong> — {t("completeProfileDesc")}
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
                  {tc("later")}
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
                  {t("setUp")}
                </a>
              </div>
            </div>
          )}
          {children}
        </div>
        <ChatbotGuide />
      </div>
    </>
  );
}
