"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    key: "skill",
    title: "What's your skill level?",
    subtitle: "This helps us recommend the right content for you.",
    type: "single",
    options: [
      { value: "beginner", label: "Beginner", desc: "Just started my journey" },
      { value: "intermediate", label: "Intermediate", desc: "Can read patterns confidently" },
      { value: "advanced", label: "Advanced", desc: "I design my own patterns" },
      { value: "expert", label: "Expert", desc: "I teach and mentor others" },
    ],
  },
  {
    key: "crafts",
    title: "What crafts interest you?",
    subtitle: "Select all that apply.",
    type: "multi",
    options: [
      { value: "crochet", label: "Crochet" },
      { value: "knitting", label: "Knitting" },
      { value: "weaving", label: "Weaving" },
      { value: "spinning", label: "Spinning" },
      { value: "dyeing", label: "Dyeing" },
      { value: "embroidery", label: "Embroidery" },
      { value: "macrame", label: "Macramé" },
    ],
  },
  {
    key: "projects",
    title: "What do you like to make?",
    subtitle: "Pick your favorites.",
    type: "multi",
    options: [
      { value: "amigurumi", label: "Amigurumi", desc: "Toys & figures" },
      { value: "garments", label: "Garments", desc: "Clothing & wearables" },
      { value: "blankets", label: "Blankets", desc: "Afghans & throws" },
      { value: "accessories", label: "Accessories", desc: "Hats, scarves, bags" },
      { value: "home-decor", label: "Home Decor", desc: "Coasters, pillows, wall art" },
      { value: "baby-items", label: "Baby Items", desc: "Booties, blankets, toys" },
      { value: "jewelry", label: "Jewelry", desc: "Earrings, bracelets, necklaces" },
    ],
  },
  {
    key: "yarn",
    title: "What yarn weight do you prefer?",
    subtitle: "This helps match you with similar makers.",
    type: "single",
    options: [
      { value: "lace-fingering", label: "Lace / Fingering", desc: "Thin, delicate projects" },
      { value: "sport-dk", label: "Sport / DK", desc: "Lightweight, versatile" },
      { value: "worsted-aran", label: "Worsted / Aran", desc: "Medium, most popular" },
      { value: "bulky-super", label: "Bulky / Super Bulky", desc: "Thick, quick results" },
      { value: "no-preference", label: "No preference", desc: "I use it all!" },
    ],
  },
  {
    key: "hooks",
    title: "What hook size do you usually reach for?",
    subtitle: "",
    type: "single",
    options: [
      { value: "small", label: "Small (1–3mm)", desc: "Fine, detailed work" },
      { value: "medium", label: "Medium (3.5–6mm)", desc: "Everyday projects" },
      { value: "large", label: "Large (6.5–10mm)", desc: "Chunky, cozy pieces" },
      { value: "mixed", label: "Mixed / No preference", desc: "Depends on the project" },
    ],
  },
  {
    key: "goals",
    title: "What do you want from this community?",
    subtitle: "Select all that matter to you.",
    type: "multi",
    options: [
      { value: "learn", label: "Learn new techniques" },
      { value: "share", label: "Share my work" },
      { value: "patterns", label: "Find patterns" },
      { value: "connect", label: "Connect with others" },
      { value: "marketplace", label: "Buy & sell yarn/tools" },
      { value: "challenges", label: "Join challenges" },
      { value: "courses", label: "Take courses" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    skillLevel: "",
    craftInterests: [],
    projectTypes: [],
    yarnPreference: "",
    hookSize: "",
    communityGoals: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.completed) {
          router.replace("/feed");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  function toggleMulti(key, value) {
    setAnswers((prev) => {
      const arr = prev[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  }

  function setSingle(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function canProceed() {
    if (current.type === "single") return !!answers[current.key === "skill" ? "skillLevel" : current.key === "yarn" ? "yarnPreference" : "hookSize"];
    const keyMap = { crafts: "craftInterests", projects: "projectTypes", goals: "communityGoals" };
    return answers[keyMap[current.key]]?.length > 0;
  }

  async function handleFinish() {
    setSaving(true);
    setError("");
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Server error (${res.status})`);
        }
        setSaving(false);
        router.push("/feed");
        return;
      } catch (err) {
        if (attempt === 0 && (err.name === "AbortError" || err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch"))) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (err.name === "AbortError") {
          setError("Request timed out. Please try again.");
        } else if (err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch")) {
          setError("Connection issue. Please try again in a moment.");
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
        setSaving(false);
        return;
      }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#9b9bab", fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  function getAnswerKey() {
    if (current.key === "skill") return "skillLevel";
    if (current.key === "yarn") return "yarnPreference";
    if (current.key === "hooks") return "hookSize";
    if (current.key === "crafts") return "craftInterests";
    if (current.key === "projects") return "projectTypes";
    if (current.key === "goals") return "communityGoals";
    return current.key;
  }

  const answerKey = getAnswerKey();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px",
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>
              Step {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={() => router.push("/feed")}
              style={{
                background: "none",
                border: "none",
                color: "#9b9bab",
                fontSize: 13,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Skip for now
            </button>
          </div>
          <div style={{
            height: 4,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 999,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6d5df6, #a78bfa)",
              borderRadius: 999,
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f5f5f5", margin: "0 0 6px" }}>
          {current.title}
        </h1>
        <p style={{ fontSize: 14, color: "#9b9bab", margin: "0 0 28px" }}>
          {current.subtitle}
        </p>

        {error && (
          <p style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.12)",
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 20,
          }}>
            {error}
          </p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: current.type === "single" ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          {current.options.map((opt) => {
            const isSelected = current.type === "single"
              ? answers[answerKey] === opt.value
              : (answers[answerKey] || []).includes(opt.value);

            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (current.type === "single") {
                    setSingle(answerKey, opt.value);
                  } else {
                    toggleMulti(answerKey, opt.value);
                  }
                }}
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: `2px solid ${isSelected ? "#a78bfa" : "rgba(255,255,255,0.1)"}`,
                  background: isSelected ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {current.type === "multi" && (
                    <span style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? "#a78bfa" : "rgba(255,255,255,0.25)"}`,
                      background: isSelected ? "#a78bfa" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      color: "#fff",
                      flexShrink: 0,
                    }}>
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#f5f5f5" }}>
                    {opt.label}
                  </span>
                </div>
                {opt.desc && (
                  <p style={{ fontSize: 12, color: "#9b9bab", margin: "4px 0 0", marginLeft: current.type === "multi" ? 30 : 0 }}>
                    {opt.desc}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: "12px 24px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                color: "#f5f5f5",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) {
                handleFinish();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={!canProceed() || saving}
            style={{
              flex: 1,
              padding: "12px 24px",
              borderRadius: 12,
              border: "none",
              background: !canProceed() || saving ? "rgba(167,139,250,0.3)" : "linear-gradient(135deg, #6d5df6, #a78bfa)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 600,
              cursor: !canProceed() || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : isLast ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
