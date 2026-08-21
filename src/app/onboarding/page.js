"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const STEPS = [
  {
    key: "skill",
    titleKey: "skillTitle",
    subtitleKey: "skillSubtitle",
    type: "single",
    options: [
      { value: "beginner", labelKey: "beginner", descKey: "beginnerDesc" },
      { value: "intermediate", labelKey: "intermediate", descKey: "intermediateDesc" },
      { value: "advanced", labelKey: "advanced", descKey: "advancedDesc" },
      { value: "expert", labelKey: "expert", descKey: "expertDesc" },
    ],
  },
  {
    key: "crafts",
    titleKey: "craftsTitle",
    subtitleKey: "craftsSubtitle",
    type: "multi",
    options: [
      { value: "crochet", labelKey: "crochet" },
      { value: "knitting", labelKey: "knitting" },
      { value: "weaving", labelKey: "weaving" },
      { value: "spinning", labelKey: "spinning" },
      { value: "dyeing", labelKey: "dyeing" },
      { value: "embroidery", labelKey: "embroidery" },
      { value: "macrame", labelKey: "macrame" },
    ],
  },
  {
    key: "projects",
    titleKey: "projectsTitle",
    subtitleKey: "projectsSubtitle",
    type: "multi",
    options: [
      { value: "amigurumi", labelKey: "amigurumi", descKey: "amigurumiDesc" },
      { value: "garments", labelKey: "garments", descKey: "garmentsDesc" },
      { value: "blankets", labelKey: "blankets", descKey: "blanketsDesc" },
      { value: "accessories", labelKey: "accessories", descKey: "accessoriesDesc" },
      { value: "home-decor", labelKey: "homeDecor", descKey: "homeDecorDesc" },
      { value: "baby-items", labelKey: "babyItems", descKey: "babyItemsDesc" },
      { value: "jewelry", labelKey: "jewelry", descKey: "jewelryDesc" },
    ],
  },
  {
    key: "yarn",
    titleKey: "yarnTitle",
    subtitleKey: "yarnSubtitle",
    type: "single",
    options: [
      { value: "lace-fingering", labelKey: "laceFingering", descKey: "laceFingeringDesc" },
      { value: "sport-dk", labelKey: "sportDk", descKey: "sportDkDesc" },
      { value: "worsted-aran", labelKey: "worstedAran", descKey: "worstedAranDesc" },
      { value: "bulky-super", labelKey: "bulkySuper", descKey: "bulkySuperDesc" },
      { value: "no-preference", labelKey: "noPreference", descKey: "noPreferenceDesc" },
    ],
  },
  {
    key: "hooks",
    titleKey: "hooksTitle",
    subtitleKey: "hooksSubtitle",
    type: "single",
    options: [
      { value: "small", labelKey: "smallHook", descKey: "smallHookDesc" },
      { value: "medium", labelKey: "mediumHook", descKey: "mediumHookDesc" },
      { value: "large", labelKey: "largeHook", descKey: "largeHookDesc" },
      { value: "mixed", labelKey: "mixedHook", descKey: "mixedHookDesc" },
    ],
  },
  {
    key: "goals",
    titleKey: "goalsTitle",
    subtitleKey: "goalsSubtitle",
    type: "multi",
    options: [
      { value: "learn", labelKey: "learnTechniques" },
      { value: "share", labelKey: "shareWork" },
      { value: "patterns", labelKey: "findPatterns" },
      { value: "connect", labelKey: "connectOthers" },
      { value: "marketplace", labelKey: "buySell" },
      { value: "challenges", labelKey: "joinChallenges" },
      { value: "courses", labelKey: "takeCourses" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
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
          setError(t("timeoutError"));
        } else if (err.message?.includes("NetworkError") || err.message?.includes("Failed to fetch")) {
          setError(t("networkError"));
        } else {
          setError(err.message || t("genericError"));
        }
        setSaving(false);
        return;
      }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#9b9bab", fontSize: 14 }}>{tc("loading")}</p>
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
              {t("stepOf", { current: step + 1, total: STEPS.length })}
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
              {tc("skipForNow")}
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
          {t(current.titleKey)}
        </h1>
        <p style={{ fontSize: 14, color: "#9b9bab", margin: "0 0 28px" }}>
          {t(current.subtitleKey)}
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
                    {t(opt.labelKey)}
                  </span>
                </div>
                {opt.descKey && (
                  <p style={{ fontSize: 12, color: "#9b9bab", margin: "4px 0 0", marginLeft: current.type === "multi" ? 30 : 0 }}>
                    {t(opt.descKey)}
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
              {tc("back")}
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
            {saving ? t("saving") : isLast ? tc("finish") : tc("continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
