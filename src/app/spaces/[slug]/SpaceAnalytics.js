"use client";

import { useEffect, useState } from "react";
import styles from "./SpaceAnalytics.module.css";

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

function StatCard({ label, value }) {
  return (
    <div className={styles.analyticsCard}>
      <p className={styles.analyticsValue}>{value}</p>
      <p className={styles.analyticsLabel}>{label}</p>
    </div>
  );
}

export default function SpaceAnalytics({ spaceId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/analytics/space/${spaceId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        setError("");
        setData(json);
      })
      .catch(() => setError("Couldn't load space analytics."));
  }, [spaceId, retry]);

  if (error) {
    return (
      <div className={styles.analyticsBox}>
        <h2 className={styles.sectionTitle}>Space analytics</h2>
        <p className={styles.analyticsEmpty}>{error}</p>
        <button
          className={styles.analyticsRetry}
          onClick={() => {
            setError("");
            setRetry((n) => n + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={styles.analyticsBox}>
        <h2 className={styles.sectionTitle}>Space analytics</h2>
        <p className={styles.analyticsEmpty}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={styles.analyticsBox}>
      <h2 className={styles.sectionTitle}>Space analytics</h2>

      <div className={styles.analyticsGrid}>
        <StatCard label="Posts" value={data.posts.toLocaleString()} />
        <StatCard label="Members" value={data.members.toLocaleString()} />
        <StatCard label="Active this week" value={data.activeMembers.toLocaleString()} />
        <StatCard label="Top contributors" value={data.topMembers.length} />
      </div>

      {(data.topContent && data.topContent.length > 0) || (data.topMembers && data.topMembers.length > 0) ? (
        <div className={styles.analyticsSplit}>
          {data.topMembers && data.topMembers.length > 0 && (
            <div>
              <h3 className={styles.analyticsHeading}>Top contributors</h3>
              <ul className={styles.analyticsList}>
                {data.topMembers.map((m, i) => (
                  <li key={m.authorId}>
                    <span className={styles.analyticsRank}>#{i + 1}</span>
                    <span className={styles.analyticsName}>{m.authorName || "Member"}</span>
                    <span className={styles.analyticsCount}>{m.count} posts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.topContent && data.topContent.length > 0 && (
            <div>
              <h3 className={styles.analyticsHeading}>Top content</h3>
              <ul className={styles.analyticsList}>
                {data.topContent.map((p) => (
                  <li key={p.id}>
                    <span className={styles.analyticsName}>{p.text}</span>
                    <span className={styles.analyticsCount}>{p.score} eng.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className={styles.analyticsEmpty}>No activity in this space yet.</p>
      )}

      {data.recentActivity && data.recentActivity.length > 0 && (
        <>
          <h3 className={styles.analyticsHeading}>Recent activity</h3>
          <ul className={styles.analyticsList}>
            {data.recentActivity.map((a) => (
              <li key={a.id}>
                <span className={styles.analyticsName}>
                  {a.actorName || "Member"} · {a.text}
                </span>
                <span className={styles.analyticsCount}>{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
