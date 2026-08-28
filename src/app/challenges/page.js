"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";

const STATUS_COLORS = {
  active: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)", text: "#22c55e" },
  upcoming: { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.2)", text: "var(--secondary-light)" },
  completed: { bg: "rgba(156,156,166,0.1)", border: "rgba(156,156,166,0.2)", text: "#9c9ca6" },
};

function timeLeft(endDate) {
  const diff = endDate - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setChallenges(data.challenges || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function loadDetail(id) {
    setSelected(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/challenges/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch {}
    setDetailLoading(false);
  }

  async function joinChallenge(id) {
    await fetch(`/api/challenges/${id}`, { method: "POST" });
    loadDetail(id);
  }

  async function updateProgress(id, progress) {
    await fetch(`/api/challenges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    loadDetail(id);
  }

  const filtered = challenges.filter((c) => c.status === activeTab);

  return (
    <Nav>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f5f5f5", margin: "0 0 6px" }}>
          Challenges
        </h1>
        <p style={{ fontSize: 14, color: "#9b9bab", margin: "0 0 20px" }}>
          Join time-limited challenges, track progress, and earn recognition.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["active", "upcoming", "completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelected(null); setDetail(null); }}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === tab ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.06)",
                color: activeTab === tab ? "var(--secondary-light)" : "#9b9bab",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#9b9bab", fontSize: 13 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#9b9bab", fontSize: 13 }}>
            No {activeTab} challenges. {activeTab === "active" ? "Check back soon!" : ""}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((c) => {
              const sc = STATUS_COLORS[c.status];
              return (
                <div
                  key={c.id}
                  onClick={() => loadDetail(c.id)}
                  style={{
                    padding: "18px 20px",
                    background: selected === c.id ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selected === c.id ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 14,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 24 }}>{c.emoji}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#f5f5f5" }}>{c.title}</span>
                    <span style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: sc.bg,
                      border: `1px solid ${sc.border}`,
                      color: sc.text,
                    }}>
                      {c.status}
                    </span>
                  </div>
                  {c.description && (
                    <p style={{ fontSize: 13, color: "#d5d5d5", margin: "0 0 8px", lineHeight: 1.5 }}>
                      {c.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#9b9bab" }}>
                    <span>Goal: {c.goal} posts</span>
                    <span>{c.participantCount} participants</span>
                    {c.status === "active" && <span>{timeLeft(c.endDate)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selected && (
          <div style={{
            marginTop: 20,
            padding: 20,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
          }}>
            {detailLoading ? (
              <p style={{ color: "#9b9bab", fontSize: 13 }}>Loading details...</p>
            ) : detail ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f5", margin: "0 0 12px" }}>
                  {detail.challenge.emoji} {detail.challenge.title}
                </h3>
                {!detail.joined && detail.challenge.status === "active" && (
                  <button
                    onClick={() => joinChallenge(selected)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "none",
                      background: "var(--secondary-light)",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      marginBottom: 16,
                    }}
                  >
                    Join Challenge
                  </button>
                )}
                {detail.joined && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: "#9b9bab", margin: "0 0 8px" }}>
                      Your progress: {detail.myProgress} / {detail.challenge.goal}
                    </p>
                    <div style={{
                      height: 8,
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: 999,
                      overflow: "hidden",
                      marginBottom: 8,
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, (detail.myProgress / detail.challenge.goal) * 100)}%`,
                        background: "linear-gradient(90deg, var(--secondary), var(--secondary-light))",
                        borderRadius: 999,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 3, 5, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => updateProgress(selected, detail.myProgress + n)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.15)",
                            background: "rgba(255,255,255,0.06)",
                            color: "#f5f5f5",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {detail.participants.length > 0 && (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#9b9bab", margin: "0 0 8px" }}>
                      Leaderboard
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {detail.participants.slice(0, 10).map((p, i) => (
                        <div key={p.userId} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 12px",
                          background: i === 0 ? "rgba(234,179,8,0.1)" : "rgba(255,255,255,0.03)",
                          borderRadius: 8,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: i === 0 ? "#eab308" : "#9b9bab", width: 20 }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: 13, color: "#f5f5f5", flex: 1 }}>{p.userName}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--secondary-light)" }}>
                            {p.progress}/{detail.challenge.goal}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </Nav>
  );
}
