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

export default function MembersDirectory({ members, role, todayKey }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const query = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    const pool = members.filter((member) => {
      if (tab === "online" && member.lastVisitDate !== todayKey) return false;
      if (tab === "hosts" && member.role !== "owner" && member.role !== "moderator") return false;
      if (!query) return true;
      return (
        member.name?.toLowerCase().includes(query) ||
        member.headline?.toLowerCase().includes(query) ||
        member.location?.toLowerCase().includes(query) ||
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
  }, [members, tab, query, todayKey]);

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

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {query || tab !== "all" ? "No members match this view." : "No members yet."}
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
