"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./dashboard.module.css";

const ACCENT = "#f42e79";
const SUBS_COLOR = "#f42e79";
const PURCHASE_COLOR = "#171a3d";

function formatMoney(cents) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function monthLabel(m) {
  if (!m) return "";
  const [y, mo] = String(m).split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export default function RevenueChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [hover, setHover] = useState(-1);
  const svgRef = useRef(null);

  useEffect(() => {
    fetch("/api/admin/analytics/revenue")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        setError("");
        setData(json.revenue || []);
      })
      .catch(() => setError("Couldn't load revenue data."));
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
  if (!data || data.length === 0) {
    return (
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.skeletonLine} style={{ width: "40%" }} />
        <div className={styles.skeletonLine} style={{ width: "100%" }} />
        <div className={styles.skeletonLine} style={{ width: "85%" }} />
      </div>
    );
  }

  const values1 = data.map((b) => Number(b.subscriptions) || 0);
  const values2 = data.map((b) => Number(b.purchases) || 0);
  const max = Math.max(...values1, ...values2, 1);
  const n = data.length;
  const W = 720;
  const H = 220;
  const pad = { top: 16, right: 12, bottom: 24, left: 12 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const xFor = (i) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yFor = (v) => pad.top + innerH - (v / max) * innerH;

  const lineFor = (values) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(2)},${yFor(v).toFixed(2)}`)
      .join(" ");

  const hoverPoint = hover >= 0 && hover < n ? data[hover] : null;

  function handleMove(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const i = Math.round(fx * (n - 1));
    setHover(i);
  }

  return (
    <div>
      <div className={styles.cardHeader} style={{ marginBottom: 8 }}>
        <h2 className={styles.cardTitle}>Revenue over time</h2>
        <div className={styles.chartToolbar}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: SUBS_COLOR }} />
            Subscriptions
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: PURCHASE_COLOR }} />
            Purchases
          </span>
        </div>
      </div>
      <p className={styles.chartCaption}>Last 12 months · monthly recurring + one-time</p>

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          className={styles.chartSvg}
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(-1)}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
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
                stroke="#eadfd2"
                strokeWidth={1}
              />
            );
          })}
          {data.map((b, i) => (
            <text
              key={b.month}
              x={xFor(i)}
              y={H - 6}
              textAnchor="middle"
              fontSize={10}
              fill="#8a7c6f"
            >
              {monthLabel(b.month)}
            </text>
          ))}
          <path d={lineFor(values1)} fill="none" stroke={SUBS_COLOR} strokeWidth={2.5} strokeLinejoin="round" />
          <path d={lineFor(values2)} fill="none" stroke={PURCHASE_COLOR} strokeWidth={2.5} strokeLinejoin="round" />
          {hover >= 0 && hover < n && (
            <line
              x1={xFor(hover)}
              y1={pad.top}
              x2={xFor(hover)}
              y2={pad.top + innerH}
              stroke={ACCENT}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
          {hover >= 0 && hover < n && (
            <>
              <circle cx={xFor(hover)} cy={yFor(values1[hover])} r={4} fill={SUBS_COLOR} stroke="#fff" strokeWidth={1.5} />
              <circle cx={xFor(hover)} cy={yFor(values2[hover])} r={4} fill={PURCHASE_COLOR} stroke="#fff" strokeWidth={1.5} />
            </>
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
              padding: "8px 10px",
              borderRadius: 8,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 10,
              border: `1px solid ${ACCENT}`,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{monthLabel(hoverPoint.month)}</div>
            <div>Subscriptions: {formatMoney(hoverPoint.subscriptions)}</div>
            <div>Purchases: {formatMoney(hoverPoint.purchases)}</div>
            <div style={{ fontWeight: 700 }}>Total: {formatMoney(hoverPoint.total)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
