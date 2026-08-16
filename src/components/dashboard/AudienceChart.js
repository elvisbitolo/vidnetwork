"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./dashboard.module.css";
import { SectionError } from "./Section";

const METRICS = {
  members: { label: "Members", key: "members", cumulative: true },
  activity: { label: "Activity", key: "activity", cumulative: false },
  membersNew: { label: "New members", key: "membersNew", cumulative: false },
};

const DAY_OPTIONS = [7, 30, 90, 365];

function formatNumber(n) {
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function AudienceChart() {
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("members");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [hover, setHover] = useState(-1);
  const svgRef = useRef(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const id = ++fetchIdRef.current;
    fetch(`/api/dashboard/audience?days=${days}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        if (fetchIdRef.current === id) {
          setError("");
          if (json.ok) setData(json.data);
        }
      })
      .catch(() => {
        if (fetchIdRef.current === id) setError("Couldn't load audience data.");
      });
  }, [days, retry]);

  if (error) {
    return (
      <SectionError
        message={error}
        onRetry={() => {
          setError("");
          setRetry((n) => n + 1);
        }}
      />
    );
  }
  if (!data || !data.series || data.series.length === 0) {
    return (
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.skeletonLine} style={{ width: "40%" }} />
        <div className={styles.skeletonLine} style={{ width: "100%" }} />
        <div className={styles.skeletonLine} style={{ width: "85%" }} />
      </div>
    );
  }

  const { series } = data;
  const meta = METRICS[metric] || METRICS.members;
  const values = series.map((b) => b[meta.key]);
  const total = meta.cumulative ? values[values.length - 1] : values.reduce((s, n) => s + n, 0);
  const max = Math.max(...values, 1);
  const n = values.length;
  const W = 640;
  const H = 200;
  const pad = { top: 14, right: 8, bottom: 18, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xFor = (i) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yFor = (v) => pad.top + innerH - (v / max) * innerH;

  const linePath = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${xFor(n - 1).toFixed(2)},${pad.top + innerH} L${xFor(
    0
  ).toFixed(2)},${pad.top + innerH} Z`;

  const hoverPoint = hover >= 0 && hover < n ? series[hover] : null;
  const hoverValue = hoverPoint ? hoverPoint[meta.key] : 0;

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const i = Math.round(fx * (n - 1));
    setHover(i);
  }

  return (
    <div>
      <div className={styles.cardHeader} style={{ marginBottom: 8 }}>
        <h2 className={styles.cardTitle}>Audience overview</h2>
        <div className={styles.chartToolbar}>
          {Object.keys(METRICS).map((m) => (
            <button
              key={m}
              type="button"
              className={metric === m ? `${styles.chartBtn} ${styles.chartBtnActive}` : styles.chartBtn}
              onClick={() => setMetric(m)}
            >
              {METRICS[m].label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.chartCaption}>
            {meta.label} · last {days} days
          </p>
          <p className={styles.chartValue}>{formatNumber(total)}</p>
        </div>
        <div className={styles.chartToolbar}>
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={days === d ? `${styles.chartBtn} ${styles.chartBtnActive}` : styles.chartBtn}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          className={styles.chartSvg}
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(-1)}
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>
          {Array.from({ length: 4 }).map((_, i) => {
            const y = pad.top + (innerH / 3) * i;
            return (
              <line
                key={i}
                x1={pad.left}
                y1={y}
                x2={pad.left + innerW}
                y2={y}
                stroke="#f1f1f5"
                strokeWidth={1}
              />
            );
          })}
          <path d={areaPath} fill="url(#chartFill)" />
          <path d={linePath} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinejoin="round" />
          {hover >= 0 && hover < n && (
            <line
              x1={xFor(hover)}
              y1={pad.top}
              x2={xFor(hover)}
              y2={pad.top + innerH}
              stroke="#4f46e5"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
          {hover >= 0 && hover < n && (
            <circle cx={xFor(hover)} cy={yFor(values[hover])} r={4.5} fill="#4f46e5" stroke="#fff" strokeWidth={2} />
          )}
        </svg>
        {hoverPoint && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${(xFor(hover) / W) * 100}%`,
              transform: "translateX(-50%)",
              background: "#17171c",
              color: "#fff",
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 6,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            {formatNumber(hoverValue)} ·{" "}
            {new Date(hoverPoint.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        )}
      </div>
    </div>
  );
}
