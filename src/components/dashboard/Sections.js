"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import styles from "./dashboard.module.css";
import { Card, EmptyState } from "./Section";

function timeAgo(ms) {
  if (!ms) return "";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WelcomeBanner({ name }) {
  const t = useTranslations("dashboard");
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div className={styles.welcome}>
      <div>
        <h2 className={styles.welcomeTitle}>{t("welcomeBack", { name })}</h2>
        <p className={styles.welcomeSub}>{today}</p>
      </div>
      <div className={styles.welcomeActions}>
        <Link className={styles.welcomeLink} href="/rooms">
          {t("joinLiveRoom")}
        </Link>
        <Link className={styles.welcomeLink} href="/feed">
          {t("viewFeed")}
        </Link>
      </div>
    </div>
  );
}

export function QuickActions({ isStaff }) {
  const t = useTranslations("dashboard");
  const actions = [
    { key: "startLive", href: "/rooms", icon: "●" },
    { key: "uploadVideo", href: "/recordings", icon: "▲" },
    { key: "createRoom", href: isStaff ? "/admin/rooms" : "/rooms", icon: "+" },
    { key: "createPost", href: "/feed", icon: "✎" },
  ];
  return (
    <Card title={t("quickActions")}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {actions.map((action) => (
          <Link
            key={action.key}
            className={styles.kpi}
            href={action.href}
            style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, padding: 14 }}
          >
            <span style={{ fontSize: 18, color: "#a78bfa" }}>{action.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f5" }}>{t(action.key)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function CommunityHub() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const links = [
    { href: "/members", key: "members", icon: "○" },
    { href: "/groups", key: "groups", icon: "◎" },
    { href: "/spaces", key: "spaces", icon: "▣" },
    { href: "/gallery", key: "gallery", icon: "▦" },
    { href: "/discovery", key: "discover", icon: "⌕" },
    { href: "/leaderboard", key: "leaderboard", icon: "★" },
  ];
  return (
    <Card title={t("communityHub")} linkLabel={t("exploreCommunity")} linkHref="/members">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
        className={styles.communityHubGrid}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            className={styles.kpi}
            href={link.href}
            style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, padding: 14 }}
          >
            <span style={{ fontSize: 18, color: "#a78bfa" }}>{link.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f5f5f5" }}>{tNav(link.key)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function RecentActivity({ data }) {
  const t = useTranslations("dashboard");
  return (
    <Card title={t("recentActivity")} linkLabel={t("openFeed")} linkHref="/feed">
      {data.length === 0 ? (
        <EmptyState text={t("noActivity")} />
      ) : (
        <ul className={styles.list}>
          {data.map((item) => (
            <li key={item.id}>
              <Link className={styles.item} href={item.href}>
                <span className={styles.itemSplit}>
                  <span className={styles.itemTitle}>
                    {item.actor}
                    <span className={styles.itemMeta}> · {item.text}</span>
                  </span>
                  <span className={styles.itemMeta}>{timeAgo(item.createdAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function UpcomingRooms({ data }) {
  const t = useTranslations("dashboard");
  return (
    <Card title={t("liveAndUpcoming")} linkLabel={t("allRooms")} linkHref="/rooms">
      {data.length === 0 ? (
        <EmptyState text={t("noRooms")} />
      ) : (
        <ul className={styles.list}>
          {data.map((item) => (
            <li key={item.id}>
              <Link className={`${styles.item} ${styles.itemRow}`} href={item.href}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span className={item.kind === "live" ? `${styles.dot} ${styles.dotLive}` : styles.dot} />
                  <span style={{ minWidth: 0 }}>
                    <span className={styles.itemTitle} style={{ display: "block" }}>
                      {item.title}
                    </span>
                    <span className={styles.itemMeta}>
                      {item.kind === "live" ? t("liveNow") : formatTime(item.startTime)}
                    </span>
                  </span>
                </span>
                {item.kind === "upcoming" && item.rsvpCount > 0 && (
                  <span className={`${styles.tag} ${styles.tagRsvp}`}>{t("rsvps", { count: item.rsvpCount })}</span>
                )}
                {item.kind === "live" && (
                  <span className={`${styles.tag} ${styles.tagLive}`}>{t("live")}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RecentMessages({ data }) {
  return (
    <Card title="Recent messages" linkLabel="Open chat" linkHref="/chat">
      {data.length === 0 ? (
        <EmptyState text="No messages yet. Start a conversation in Chat." />
      ) : (
        <ul className={styles.list}>
          {data.map((conv) => (
            <li key={conv.id}>
              <Link className={styles.item} href="/chat">
                <span className={styles.itemSplit}>
                  <span className={styles.itemTitle}>{conv.title}</span>
                  <span className={styles.itemMeta}>{timeAgo(conv.lastMessageAt)}</span>
                </span>
                <span className={styles.itemBody}>{conv.lastMessage || "No messages yet"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function ContentPerformance({ data }) {
  const t = useTranslations("dashboard");
  return (
    <Card title={t("topContent")} linkLabel={t("explore")} linkHref="/feed">
      {!data || data.items.length === 0 ? (
        <EmptyState text={t("sharePosts")} />
      ) : (
        <ul className={styles.list}>
          {data.items.map((item) => (
            <li key={item.id}>
              <Link className={styles.item} href={item.href}>
                <span className={styles.itemSplit}>
                  <span className={styles.itemTitle} style={{ maxWidth: "70%" }}>
                    {item.title}
                  </span>
                  <span className={`${styles.tag} ${styles.tagRsvp}`}>
                    {item.score} eng.
                  </span>
                </span>
                <span className={styles.itemMeta}>
                  {t("byAuthor", { name: item.authorName })} · {t("likesAndComments", { likes: item.likeCount, comments: item.commentCount })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function NotificationsPanel({ data }) {
  const unread = data.filter((n) => !n.read).length;
  return (
    <Card title="Notifications" linkLabel="View all" linkHref="/notifications">
      {data.length === 0 ? (
        <EmptyState text="No notifications yet." />
      ) : (
        <ul className={styles.list}>
          {data.map((n) => (
            <li key={n.id}>
              <Link className={styles.item} href={n.href}>
                <span className={styles.itemSplit}>
                  <span className={styles.itemBody}>{n.text}</span>
                  {!n.read && <span className={`${styles.dot} ${styles.dotLive}`} />}
                </span>
                <span className={styles.itemMeta}>{timeAgo(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function NeedsAttention({ data }) {
  const t = useTranslations("dashboard");
  return (
    <Card title={t("needsAttention")}>
      {data.length === 0 ? (
        <EmptyState text={t("allCaughtUp")} />
      ) : (
        <ul className={styles.list}>
          {data.map((item) => (
            <li key={item.id}>
              <Link className={styles.attention} href={item.href}>
                <span className={styles.attentionIcon}>!</span>
                <span className={styles.attentionText}>{item.label}</span>
                <span className={styles.attentionMeta}>{t("review")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function OnboardingProgress({ data }) {
  const total = data?.total || 0;
  const done = data?.doneCount || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (total === 0) return null;
  return (
    <Card title={data.complete ? "Onboarding complete" : "Getting started"}>
      <p className={styles.chartCaption}>
        {done} of {total} steps complete
      </p>
      <div className={styles.progress}>
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
      <ul className={styles.list}>
        {(data.steps || []).map((step, i) => {
          const isDone = i < done;
          return (
            <li key={step.key || i}>
              <Link className={styles.item} href={step.href || "/account"}>
                <span className={styles.itemSplit}>
                  <span className={styles.itemTitle}>
                    {isDone ? "✓ " : `${i + 1}. `}
                    {step.label}
                  </span>
                  {step.cta && <span className={styles.itemMeta}>{step.cta}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
