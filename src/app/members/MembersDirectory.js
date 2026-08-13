"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./members.module.css";

export default function MembersDirectory({ members, role }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const query = search.trim().toLowerCase();
  const filtered = members.filter((member) => {
    if (filter === "location" && !member.location) return false;
    if (filter === "headline" && !member.headline) return false;
    if (!query) return true;
    return (
      member.name?.toLowerCase().includes(query) ||
      member.headline?.toLowerCase().includes(query) ||
      member.location?.toLowerCase().includes(query) ||
      member.bio?.toLowerCase().includes(query)
    );
  });

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
          <button
            className={filter === "all" ? `${styles.filterBtn} ${styles.filterActive}` : styles.filterBtn}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "location" ? `${styles.filterBtn} ${styles.filterActive}` : styles.filterBtn}
            onClick={() => setFilter("location")}
          >
            Has location
          </button>
          <button
            className={filter === "headline" ? `${styles.filterBtn} ${styles.filterActive}` : styles.filterBtn}
            onClick={() => setFilter("headline")}
          >
            Has headline
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {query || filter !== "all" ? "No members match your search." : "No members yet."}
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
                </p>
                {member.headline && <p className={styles.headline}>{member.headline}</p>}
                {member.bio && <p className={styles.bio}>{member.bio}</p>}
                {member.location && <p className={styles.location}>{member.location}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
