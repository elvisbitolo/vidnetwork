"use client";

import { useState, useEffect } from "react";

const THEMES = [
  {
    name: "Hot Pink",
    primary: "#f6077a",
    primaryLight: "#fa81cd",
    primaryHover: "#d1066a",
    accent: "#019a9f",
    accentLight: "#6dd9d1",
    success: "#7fb704",
    warning: "#fb7906",
    highlight: "#faf100",
  },
  {
    name: "Teal",
    primary: "#019a9f",
    primaryLight: "#6dd9d1",
    primaryHover: "#017d81",
    accent: "#f6077a",
    accentLight: "#fa81cd",
    success: "#7fb704",
    warning: "#fb7906",
    highlight: "#faf100",
  },
  {
    name: "Orange",
    primary: "#fb7906",
    primaryLight: "#fa9672",
    primaryHover: "#e06a05",
    accent: "#019a9f",
    accentLight: "#6dd9d1",
    success: "#7fb704",
    warning: "#f6077a",
    highlight: "#faf100",
  },
  {
    name: "Lime",
    primary: "#7fb704",
    primaryLight: "#b0de2b",
    primaryHover: "#6a9a03",
    accent: "#f6077a",
    accentLight: "#fa81cd",
    success: "#019a9f",
    warning: "#fb7906",
    highlight: "#faf100",
  },
  {
    name: "Yellow",
    primary: "#faf100",
    primaryLight: "#fdf566",
    primaryHover: "#d4c900",
    accent: "#f6077a",
    accentLight: "#fa81cd",
    success: "#7fb704",
    warning: "#fb7906",
    highlight: "#019a9f",
  },
  {
    name: "Indigo",
    primary: "#6366f1",
    primaryLight: "#818cf8",
    primaryHover: "#4f46e5",
    accent: "#019a9f",
    accentLight: "#6dd9d1",
    success: "#7fb704",
    warning: "#fb7906",
    highlight: "#faf100",
  },
];

function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-light", theme.primaryLight);
  root.style.setProperty("--primary-hover", theme.primaryHover);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-light", theme.accentLight);
  root.style.setProperty("--success", theme.success);
  root.style.setProperty("--warning", theme.warning);
  root.style.setProperty("--highlight", theme.highlight);
}

export default function ThemePicker() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vidnetwork-theme");
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
    localStorage.setItem("vidnetwork-theme", idx.toString());
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
