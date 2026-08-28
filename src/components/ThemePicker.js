"use client";

import { useState, useEffect } from "react";

const THEMES = [
  {
    name: "Blue",
    primary: "#2563eb",
    primaryLight: "#60a5fa",
    primaryHover: "#1d4ed8",
    secondary: "#7c3aed",
    secondaryLight: "#a78bfa",
    secondaryHover: "#6d28d9",
    accent: "#06b6d4",
    accentLight: "#67e8f9",
    accentHover: "#0891b2",
    success: "#16a34a",
    warning: "#f59e0b",
    highlight: "#faf100",
  },
  {
    name: "Sky",
    primary: "#2563eb",
    primaryLight: "#93c5fd",
    primaryHover: "#1d4ed8",
    secondary: "#7c3aed",
    secondaryLight: "#c4b5fd",
    secondaryHover: "#6d28d9",
    accent: "#22d3ee",
    accentLight: "#a5f3fc",
    accentHover: "#06b6d4",
    success: "#16a34a",
    warning: "#f59e0b",
    highlight: "#faf100",
  },
  {
    name: "Violet",
    primary: "#2563eb",
    primaryLight: "#818cf8",
    primaryHover: "#1d4ed8",
    secondary: "#7c3aed",
    secondaryLight: "#c4b5fd",
    secondaryHover: "#6d28d9",
    accent: "#06b6d4",
    accentLight: "#67e8f9",
    accentHover: "#0891b2",
    success: "#16a34a",
    warning: "#f59e0b",
    highlight: "#a78bfa",
  },
  {
    name: "Dusk",
    primary: "#1e40af",
    primaryLight: "#60a5fa",
    primaryHover: "#1e3a8a",
    secondary: "#6b21a8",
    secondaryLight: "#a78bfa",
    secondaryHover: "#581c87",
    accent: "#0891b2",
    accentLight: "#67e8f9",
    accentHover: "#0e7490",
    success: "#15803d",
    warning: "#d97706",
    highlight: "#faf100",
  },
];

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-light", theme.primaryLight);
  root.style.setProperty("--primary-hover", theme.primaryHover);
  root.style.setProperty("--secondary", theme.secondary);
  root.style.setProperty("--secondary-light", theme.secondaryLight);
  root.style.setProperty("--secondary-hover", theme.secondaryHover);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-light", theme.accentLight);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--success", theme.success);
  root.style.setProperty("--warning", theme.warning);
  root.style.setProperty("--highlight", theme.highlight);
}

export default function ThemePicker() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("yarnerylounge-theme");
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < THEMES.length) {
        setActive(idx);
        applyTheme(THEMES[idx]);
      }
    }
  }, []);

  const select = (idx) => {
    setActive(idx);
    applyTheme(THEMES[idx]);
    localStorage.setItem("yarnerylounge-theme", idx.toString());
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Change theme"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.15)",
          background: THEMES[active].primary,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 16px ${THEMES[active].primary}44`,
          transition: "all 0.2s ease",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 0,
            background: "#1f1f1f",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: 16,
            width: 200,
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 700, color: "#a1a1aa", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Theme
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {THEMES.map((theme, idx) => (
              <button
                key={theme.name}
                onClick={() => select(idx)}
                aria-label={`Select ${theme.name} theme`}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 10,
                  border: idx === active ? `2px solid ${theme.primary}` : "2px solid transparent",
                  background: theme.primary,
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.15s ease",
                  transform: idx === active ? "scale(1.1)" : "scale(1)",
                }}
              >
                {idx === active && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#71717a", margin: "12px 0 0", textAlign: "center" }}>
            {THEMES[active].name}
          </p>
        </div>
      )}
    </div>
  );
}
