"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";
import LanguageSwitcher from "./LanguageSwitcher";
import ProfileMenu from "./ProfileMenu";
import LiveNowBanner from "./LiveNowBanner";
import ChatbotGuide from "./ChatbotGuide";
import styles from "./Nav.module.css";

const CHEVRON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function getAdministrationLinks(role) {
  if (role === "owner") {
    return [
      { href: "/admin/analytics", key: "analytics" },
      { href: "/admin/income", key: "income" },
      { href: "/admin/promocodes", key: "promoCodes" },
      { href: "/admin/rooms", key: "manageRooms" },
      { href: "/admin/courses", key: "manageCourses" },
      { href: "/admin/collections", key: "collections" },
      { href: "/admin/questions", key: "questions" },
      { href: "/admin/hosts", key: "scopedHosts" },
      { href: "/admin/moderation", key: "moderation" },
      { href: "/admin/automations", key: "automations" },
      { href: "/admin/announcements", key: "announcements" },
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
  { href: "/challenges", key: "crochetAlong" },
];

const LEARN_ITEMS = [
  { href: "/courses", key: "courses" },
  { href: "/articles", key: "articles" },
];

function SidebarGroup({ id, label, items, open, onToggle, t, close, children }) {
  const isOpen = open.has(id);
  return (
    <div>
      <button type="button" className={styles.groupToggle} onClick={() => onToggle(id)} aria-expanded={isOpen}>
        <span className={styles.groupLabel}>{label}</span>
        <span className={isOpen ? `${styles.groupChevron} ${styles.groupChevronOpen}` : styles.groupChevron}>{CHEVRON}</span>
      </button>
      <div className={isOpen ? `${styles.groupBody} ${styles.groupBodyOpen}` : styles.groupBody}>
        {items && items.map((item) => (
          <Link key={item.href} className={styles.sidebarLink} href={item.href} onClick={close}>
            {t(item.key)}
          </Link>
        ))}
        {children}
      </div>
    </div>
  );
}

export default function Nav({ role, children }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("sidebarCollapsed") === "1"
  );
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const [collections, setCollections] = useState([]);
  const [hasHostTools, setHasHostTools] = useState(
    () => role === "owner" || role === "moderator"
  );
  const administrationLinks = getAdministrationLinks(role);
  const close = () => setMobileOpen(false);

  function toggleGroup(id) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const allGroups = [
      { id: "overview", items: OVERVIEW_ITEMS },
      { id: "connect", items: CONNECT_ITEMS },
      { id: "learn", items: LEARN_ITEMS },
      { id: "administration", items: administrationLinks },
      { id: "host", items: hasHostTools && role !== "owner" ? [{ href: "/host" }] : [] },
    ];
    const matched = allGroups
      .filter((g) => g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/")))
      .map((g) => g.id);
    if (matched.length) {
      setOpenGroups((prev) => {
        const next = new Set(prev);
        matched.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [pathname, administrationLinks, hasHostTools, role]);

  useEffect(() => {
    window.localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

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
            Yarnery Lounge
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
          <div className={styles.sidebarInner} data-tour="tour-sidebar">
            <nav className={styles.sidebarNav}>
              <SidebarGroup id="overview" label={t("overview")} items={OVERVIEW_ITEMS} open={openGroups} onToggle={toggleGroup} t={t} close={close} />
              <SidebarGroup id="connect" label={t("connect")} items={CONNECT_ITEMS} open={openGroups} onToggle={toggleGroup} t={t} close={close} />
              <SidebarGroup id="learn" label={t("learn")} items={LEARN_ITEMS} open={openGroups} onToggle={toggleGroup} t={t} close={close} />

              <div className={styles.membersLinkWrap}>
                <Link className={styles.sidebarLink} href="/members" onClick={close}>
                  {t("members")}
                </Link>
              </div>

              {collections.length > 0 && (
                <SidebarGroup id="collections" label={t("collections")} open={openGroups} onToggle={toggleGroup} t={t} close={close}>
                  {collections.map((collection) => (
                    <div key={collection.id} className={styles.collection}>
                      <p className={styles.collectionName}>{collection.name}</p>
                      {collection.spaces.map((space) => (
                        <Link key={space.id} className={styles.sidebarLinkNested} href={`/spaces/${space.slug}`} onClick={close}>
                          {space.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </SidebarGroup>
              )}

              {hasHostTools && role !== "owner" && (
                <SidebarGroup id="host" label={t("host")} items={[{ href: "/host", key: "hostTools" }]} open={openGroups} onToggle={toggleGroup} t={t} close={close} />
              )}

              {administrationLinks.length > 0 && (
                <SidebarGroup id="administration" label={t("administration")} items={administrationLinks} open={openGroups} onToggle={toggleGroup} t={t} close={close} />
              )}
            </nav>
          </div>
        </aside>

        {mobileOpen && (
          <div className={styles.backdrop} onClick={close} aria-hidden="true" />
        )}

        <div className={styles.content}>
          <LiveNowBanner />
          {children}
        </div>
        <ChatbotGuide />
      </div>
    </>
  );
}
