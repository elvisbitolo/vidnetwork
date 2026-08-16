"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatCard from "./StatCard";
import AudienceChart from "./AudienceChart";
import {
  WelcomeBanner,
  QuickActions,
  RecentActivity,
  UpcomingRooms,
  RecentMessages,
  ContentPerformance,
  NotificationsPanel,
  NeedsAttention,
  OnboardingProgress,
} from "./Sections";
import { CardSkeleton, SectionError } from "./Section";
import styles from "./dashboard.module.css";

function formatMoney(cents) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function StatSkeleton() {
  return (
    <div className={styles.kpi} aria-hidden="true">
      <div className={styles.skeletonLine} style={{ width: "45%" }} />
      <div className={styles.skeletonLine} style={{ width: "60%", height: 22 }} />
    </div>
  );
}

export default function DashboardShell() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/command")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        if (!active) return;
        if (json.ok) {
          setData(json.data);
          setFatal(false);
        } else {
          setFatal(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFatal(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  function handleRetry() {
    setLoading(true);
    setFatal(false);
    setRefresh((n) => n + 1);
  }

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  if (loading) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.page}>
          <div className={styles.skeletonLine} style={{ width: 220 }} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
          <div className={styles.grid} style={{ marginTop: 20 }}>
            <div className={styles.col}>
              <CardSkeleton lines={5} />
              <CardSkeleton lines={3} />
            </div>
            <div className={styles.col}>
              <CardSkeleton lines={4} />
              <CardSkeleton lines={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fatal || !data) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.page}>
          <SectionError
            message="The dashboard couldn't load. Check your connection and try again."
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  const { user, isStaff, stats, activity, upcomingRooms, messages, content, notifications, needsAttention, onboarding, leaderboard } = data;

  const statsValue = stats?.ok ? stats.value : null;
  const activityValue = activity?.ok ? activity.value : [];
  const roomsValue = upcomingRooms?.ok ? upcomingRooms.value : [];
  const messagesValue = messages?.ok ? messages.value : [];
  const contentValue = content?.ok ? content.value : null;
  const notificationsValue = notifications?.ok ? notifications.value : [];
  const attentionValue = needsAttention?.ok ? needsAttention.value : [];
  const onboardingValue = onboarding?.ok ? onboarding.value : null;

  const kpis = [];
  if (statsValue) {
    kpis.push(
      <StatCard
        key="members"
        label="Total members"
        value={statsValue.members.total.toLocaleString()}
        delta={statsValue.members.total ? Math.round((statsValue.members.new30 / statsValue.members.total) * 100) : 0}
        deltaLabel="new in 30d"
      />
    );
    kpis.push(
      <StatCard
        key="live"
        label="Live viewers"
        value={statsValue.live.viewers.toLocaleString()}
        deltaLabel={`${statsValue.live.rooms} room${statsValue.live.rooms === 1 ? "" : "s"} live`}
      />
    );
    if (isStaff && statsValue.revenue) {
      kpis.push(
        <StatCard
          key="revenue"
          label="Est. monthly revenue"
          value={formatMoney(statsValue.revenue.estMonthlyCents)}
          deltaLabel={`${statsValue.revenue.activeSubs} active subscriber${statsValue.revenue.activeSubs === 1 ? "" : "s"}`}
        />
      );
    } else {
      kpis.push(
        <StatCard key="points" label="Your points" value={(user.points || 0).toLocaleString()} deltaLabel="community recognition" />
      );
    }
    kpis.push(
      <StatCard
        key="engagement"
        label="Engagement"
        value={`${statsValue.engagement.contributionRate}%`}
        deltaLabel={`${statsValue.engagement.active7} active this week`}
      />
    );
  }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.heading}>
            <h1>Dashboard</h1>
            <p>
              {user.name} · {isStaff ? "Admin & creator" : "Member"}
            </p>
          </div>
          <div className={styles.headerRight}>
            <form className={styles.search} onSubmit={handleSearch}>
              <span className={styles.searchIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
              </span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search the community…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search"
              />
            </form>
          </div>
        </div>

        <WelcomeBanner name={user.name} />
        <QuickActions isStaff={isStaff} />

        <div className={styles.kpiGrid}>{kpis}</div>

        <div className={styles.grid}>
          <div className={styles.col}>
          {isStaff && (
            <div className={styles.card}>
              <AudienceChart />
            </div>
          )}

            {activity?.ok ? (
              <RecentActivity data={activityValue} />
            ) : (
              <SectionError message="Activity couldn't load." onRetry={handleRetry} />
            )}

            {upcomingRooms?.ok ? (
              <UpcomingRooms data={roomsValue} />
            ) : (
              <SectionError message="Rooms couldn't load." onRetry={handleRetry} />
            )}
          </div>

          <div className={styles.col}>
            {onboarding?.ok ? (
              <OnboardingProgress data={onboardingValue} />
            ) : (
              <SectionError message="Onboarding couldn't load." onRetry={handleRetry} />
            )}

            {needsAttention?.ok ? (
              <NeedsAttention data={attentionValue} />
            ) : (
              <SectionError message="Couldn't load your queue." onRetry={handleRetry} />
            )}

            {notifications?.ok ? (
              <NotificationsPanel data={notificationsValue} />
            ) : (
              <SectionError message="Notifications couldn't load." onRetry={handleRetry} />
            )}

            {messages?.ok ? (
              <RecentMessages data={messagesValue} />
            ) : (
              <SectionError message="Messages couldn't load." onRetry={handleRetry} />
            )}

            {content?.ok ? (
              <ContentPerformance data={contentValue} />
            ) : (
              <SectionError message="Content couldn't load." onRetry={handleRetry} />
            )}

            {leaderboard?.ok && leaderboard.value.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recognition</h2>
                  <Link className={styles.cardLink} href="/leaderboard">
                    Leaderboard
                  </Link>
                </div>
                <ul className={styles.list}>
                  {leaderboard.value.map((entry) => (
                    <li key={entry.userId}>
                      <Link className={styles.item} href={`/members/${entry.userId}`}>
                        <span className={styles.itemSplit}>
                          <span className={styles.itemTitle}>
                            #{entry.rank} {entry.name}
                          </span>
                          <span className={styles.itemMeta}>
                            {entry.points} pts · {entry.badgeCount} badges
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
