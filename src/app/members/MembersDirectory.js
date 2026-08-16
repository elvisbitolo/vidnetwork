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

export default function MembersDirectory({ members, role, todayKey }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");

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
          {filtered.map((member) => (
            <Link key={member.id} href={`/members/${member.id}`} className={styles.card}>
              <div className={styles.avatar}>
                {(member.name || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.cardBody}>
                <p className={styles.name}>
                  {member.name}
                  {member.role === "owner" && <span className={styles.ownerBadge}>Owner</span>}
                  {member.role === "moderator" && <span className={styles.moderatorBadge}>Mod</span>}
                </p>
                {member.headline && <p className={styles.headline}>{member.headline}</p>}
                {member.bio && <p className={styles.bio}>{member.bio}</p>}
                {member.location && <p className={styles.location}>{member.location}</p>}
                {(member.state || member.country) && (
                  <p className={styles.location}>
                    {[member.state, member.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {(tab === "top" || tab === "online") && (
                  <p className={styles.meta}>
                    {tab === "top" && `${member.points || 0} points`}
                    {tab === "top" && tab === "online" && " · "}
                    {tab === "online" && member.lastVisitDate === todayKey && "Online today"}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
