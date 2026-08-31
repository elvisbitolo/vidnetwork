"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

function colorFor(pct) {
  const v = Math.max(0, Math.min(100, pct));
  if (v >= 60) return "#16a34a";
  if (v >= 35) return "#eab308";
  return "#b91c1c";
}

function formatPct(value, size) {
  if (!size) return "—";
  return `${Math.round((value / size) * 100)}%`;
}

export default function RetentionChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    fetch("/api/admin/analytics/retention")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        setError("");
        setData(json.retention || []);
      })
      .catch(() => setError("Couldn't load retention data."));
  }, [retry]);

  if (error) {
    return (
      <div className={styles.skeleton}>
        <p className={styles.error}>{error}</p>
        <button
          type="button"
          className={styles.retry}
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
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.skeletonLine} style={{ width: "40%" }} />
        <div className={styles.skeletonLine} style={{ width: "100%" }} />
        <div className={styles.skeletonLine} style={{ width: "85%" }} />
      </div>
    );
  }

  const weeks = [
    { key: "week1", label: "Week 1" },
    { key: "week2", label: "Week 2" },
    { key: "week4", label: "Week 4" },
    { key: "week8", label: "Week 8" },
  ];

  return (
    <div>
      <div className={styles.cardHeader} style={{ marginBottom: 8 }}>
        <h2 className={styles.cardTitle}>Cohort retention</h2>
      </div>
      <p className={styles.chartCaption}>% of each signup cohort still active over time</p>

      {data.length === 0 ? (
        <div className={styles.retentionEmpty}>No cohort data yet.</div>
      ) : (
        <div className={styles.retentionScroll}>
          <table className={styles.retentionTable}>
            <thead>
              <tr>
                <th>Signup Month</th>
                <th>Size</th>
                {weeks.map((w) => (
                  <th key={w.key}> {w.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.cohort}>
                  <td>{row.cohort}</td>
                  <td>{row.size}</td>
                  {weeks.map((w) => {
                    const pct = formatPct(row[w.key], row.size);
                    return (
                      <td key={w.key}>
                        <span
                          className={styles.retentionCell}
                          style={{
                            color: colorFor(Number(pct.replace("%", ""))),
                          }}
                        >
                          {pct}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
