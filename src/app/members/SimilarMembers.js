"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SimilarMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/members/similar")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMembers(data.members || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px 0", color: "#9b9bab", fontSize: 13 }}>
        Finding members like you...
      </div>
    );
  }

  if (members.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 18,
        fontWeight: 800,
        color: "#f5f5f5",
        margin: "0 0 14px",
      }}>
        Members like you
      </h2>
      <div style={{
        display: "flex",
        gap: 14,
        overflowX: "auto",
        paddingBottom: 8,
        scrollbarWidth: "thin",
      }}>
        {members.map((m) => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              minWidth: 120,
              textDecoration: "none",
              padding: "14px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(167,139,250,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            <span style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: m.photoURL ? "none" : "linear-gradient(135deg, var(--secondary), var(--secondary-light))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              color: "#ffffff",
              overflow: "hidden",
              flexShrink: 0,
            }}>
              {m.photoURL ? (
                <img src={m.photoURL} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                (m.name || "?").slice(0, 1).toUpperCase()
              )}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#f5f5f5",
              textAlign: "center",
              maxWidth: 100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {m.name}
            </span>
            {m.headline && (
              <span style={{
                fontSize: 11,
                color: "var(--secondary-light)",
                textAlign: "center",
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {m.headline}
              </span>
            )}
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--secondary)",
              background: "rgba(109,93,246,0.15)",
              padding: "2px 8px",
              borderRadius: 999,
            }}>
              {m.score}% match
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
