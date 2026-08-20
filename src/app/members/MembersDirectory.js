"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./members.module.css";

const TABS = [
  { key: "all", label: "All" },
  { key: "online", label: "Online now" },
  { key: "newest", label: "Newest" },
  { key: "top", label: "Top" },
  { key: "hosts", label: "Hosts" },
];

function distinct(values) {
  return [...new Set(values.filter((v) => v && v.trim()))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function colorStrip(colors) {
  const list = (Array.isArray(colors) ? colors : []).filter((c) =>
    /^#[0-9a-fA-F]{6}$/.test(c)
  );
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  const segments = list.map((c, i) => `${c} ${(i / list.length) * 100}% ${((i + 1) / list.length) * 100}%`);
  return `conic-gradient(${segments.join(", ")})`;
}

function initialsOf(member) {
  return (member.name || "?").slice(0, 1).toUpperCase();
}

function circleSize(points) {
  const base = 64;
  const maxBonus = 40;
  const step = 20;
  const bonus = Math.min(Math.floor((points || 0) / step) * 4, maxBonus);
  return base + bonus;
}

const TOOLTIP_W = 280;
const TOOLTIP_H = 200;

export default function MembersDirectory({ members, role, todayKey }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [hover, setHover] = useState(null);

  function showDetails(member, e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({ member, rect });
  }

  function hideDetails() {
    setHover(null);
  }

  const tooltipPos = (() => {
    if (!hover) return null;
    const vw = typeof window !== "undefined" ? window.innerWidth : 800;
    const vh = typeof window !== "undefined" ? window.innerHeight : 600;
    const cx = hover.rect.left + hover.rect.width / 2;
    const left = Math.max(8, Math.min(cx - TOOLTIP_W / 2, vw - TOOLTIP_W - 8));
    let top = hover.rect.bottom + 12;
    if (top + TOOLTIP_H > vh) {
      top = Math.max(8, hover.rect.top - TOOLTIP_H - 12);
    }
    return { left, top };
  })();

  const countries = useMemo(() => distinct(members.map((m) => m.country)), [members]);

  const states = useMemo(() => {
    const pool = country
      ? members.filter((m) => m.country === country)
      : members;
    return distinct(pool.map((m) => m.state));
  }, [members, country]);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const pool = members.filter((member) => {
      if (tab === "online" && member.lastVisitDate !== todayKey) return false;
      if (tab === "hosts" && member.role !== "owner" && member.role !== "moderator") return false;
      if (country && member.country !== country) return false;
      if (state && member.state !== state) return false;
      if (!query) return true;
      return (
        member.name?.toLowerCase().includes(query) ||
        member.headline?.toLowerCase().includes(query) ||
        member.location?.toLowerCase().includes(query) ||
        member.country?.toLowerCase().includes(query) ||
        member.state?.toLowerCase().includes(query) ||
        member.bio?.toLowerCase().includes(query)
      );
    });
    if (tab === "newest") {
      return [...pool].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    if (tab === "top") {
      return [...pool].sort((a, b) => (b.points || 0) - (a.points || 0));
    }
    return [...pool].sort((a, b) => a.name.localeCompare(b.name));
  }, [members, tab, query, country, state, todayKey]);

  return (
    <>
      <div className={styles.controls}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search members by name, headline, or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.filters}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? `${styles.filterBtn} ${styles.filterActive}` : styles.filterBtn}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.locationFilters}>
        <select
          className={styles.locationSelect}
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setState("");
          }}
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className={styles.locationSelect}
          value={state}
          onChange={(e) => setState(e.target.value)}
          aria-label="Filter by state or region"
          disabled={states.length === 0}
        >
          <option value="">All states / regions</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {query || tab !== "all" || country || state
            ? "No members match this view."
            : "No members yet."}
        </p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((member) => {
            const ring = colorStrip(member.favoriteColors);
            return (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className={styles.avatarCell}
                onMouseEnter={(e) => showDetails(member, e)}
                onMouseLeave={hideDetails}
                onFocus={(e) => showDetails(member, e)}
                onBlur={hideDetails}
                aria-label={`View ${member.name}`}
              >
                <span
                  className={ring ? `${styles.ring} ${styles.ringActive}` : styles.ring}
                  style={ring ? { background: ring, padding: 3 } : undefined}
                >
                  <span
                    className={styles.circle}
                    style={{ width: circleSize(member.points), height: circleSize(member.points), fontSize: circleSize(member.points) * 0.35 }}
                  >
                    {member.photoURL ? (
                      <img
                        className={styles.circleImage}
                        src={member.photoURL}
                        alt={member.name}
                      />
                    ) : (
                      initialsOf(member)
                    )}
                    {member.role === "owner" && <span className={styles.hostDot}>Owner</span>}
                    {member.role === "moderator" && <span className={styles.hostDot}>Mod</span>}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {hover && tooltipPos && (
        <div className={styles.tooltip} style={{ left: tooltipPos.left, top: tooltipPos.top }}>
          <p className={styles.tooltipName}>{hover.member.name}</p>
          {hover.member.headline && <p className={styles.tooltipHeadline}>{hover.member.headline}</p>}
          {hover.member.bio && <p className={styles.tooltipBio}>{hover.member.bio}</p>}
          {hover.member.location && (
            <p className={styles.tooltipLocation}>📍 {hover.member.location}</p>
          )}
          {(hover.member.state || hover.member.country) && (
            <p className={styles.tooltipLocation}>
              {[hover.member.state, hover.member.country].filter(Boolean).join(", ")}
            </p>
          )}
          {hover.member.favoriteColors?.length > 0 && (
            <span className={styles.tooltipDots}>
              {hover.member.favoriteColors.map((color, i) => (
                <span
                  key={i}
                  className={styles.tooltipDot}
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
          )}
          {hover.member.points > 0 && (
            <p className={styles.tooltipPoints}>{hover.member.points} interaction points</p>
          )}
        </div>
      )}
    </>
  );
}
