"use client";

import styles from "./dashboard.module.css";

export default function StatCard({ label, value, delta, deltaLabel, accent }) {
  const deltaClass = !delta
    ? styles.kpiDelta
    : delta > 0
      ? `${styles.kpiDelta} ${styles.kpiDeltaUp}`
      : delta < 0
        ? `${styles.kpiDelta} ${styles.kpiDeltaDown}`
        : styles.kpiDelta;

  return (
    <div className={styles.kpi}>
      <p className={styles.kpiLabel}>{label}</p>
      <p className={styles.kpiValue}>{value}</p>
      <p className={deltaClass}>
        {delta != null && delta !== 0 && (
          <span>{delta > 0 ? "▲" : "▼"} {Math.abs(delta)}% </span>
        )}
        {deltaLabel || ""}
      </p>
    </div>
  );
}
