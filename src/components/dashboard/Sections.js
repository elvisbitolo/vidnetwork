"use client";

import Link from "next/link";
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
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div className={styles.welcome}>
      <div>
        <h2 className={styles.welcomeTitle}>Welcome back, {name}</h2>
        <p className={styles.welcomeSub}>{today}</p>
      </div>
      <div className={styles.welcomeActions}>
        <Link className={styles.welcomeLink} href="/rooms">
          Join a live room
        </Link>
        <Link className={styles.welcomeLink} href="/feed">
          View the feed
        </Link>
      </div>
    </div>
  );
}

export function QuickActions({ isStaff }) {
  const actions = [
    { label: "Start live", href: "/rooms", icon: "●" },
    { label: "Upload video", href: "/recordings", icon: "▲" },
    { label: "Create room", href: isStaff ? "/admin/rooms" : "/rooms", icon: "+" },
    { label: "Create post", href: "/feed", icon: "✎" },
  ];
  return (
    <Card title="Quick actions">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}
      >
        {actions.map((action) => (
          <Link
            key={action.label}
            className={styles.kpi}
            href={action.href}
            style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, padding: 14 }}
          >
            <span style={{ fontSize: 18, color: "#4f46e5" }}>{action.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#17171c" }}>{action.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function RecentActivity({ data }) {
  return (
    <Card title="Recent activity" linkLabel="Open feed" linkHref="/feed">
      {data.length === 0 ? (
        <EmptyState text="Nothing has happened yet. Start the conversation in the feed." />
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
  return (
    <Card title="Live & upcoming" linkLabel="All rooms" linkHref="/rooms">
      {data.length === 0 ? (
        <EmptyState text="No live or upcoming rooms. Schedule an event to get going." />
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
                      {item.kind === "live" ? "Live now" : formatTime(item.startTime)}
                    </span>
                  </span>
                </span>
                {item.kind === "upcoming" && item.rsvpCount > 0 && (
                  <span className={`${styles.tag} ${styles.tagRsvp}`}>{item.rsvpCount} RSVPs</span>
                )}
                {item.kind === "live" && (
                  <span className={`${styles.tag} ${styles.tagLive}`}>LIVE</span>
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
  return (
    <Card title="Top content" linkLabel="Explore" linkHref="/feed">
      {!data || data.items.length === 0 ? (
        <EmptyState text="Share posts to start building your content library." />
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
                  by {item.authorName} · {item.likeCount} likes · {item.commentCount} comments
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
  return (
    <Card title="Needs attention">
      {data.length === 0 ? (
        <EmptyState text="You're all caught up." />
      ) : (
        <ul className={styles.list}>
          {data.map((item) => (
            <li key={item.id}>
              <Link className={styles.attention} href={item.href}>
                <span className={styles.attentionIcon}>!</span>
                <span className={styles.attentionText}>{item.label}</span>
                <span className={styles.attentionMeta}>Review</span>
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
