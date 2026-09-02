"use client";

import { useState, useEffect, useRef } from "react";

const PRESETS = [
  { name: "Default", bg: "#12121a", surface: "#1c1c26", border: "#2a2a38", text: "#f5f5f7", muted: "#9a9ab0", accent: "#f42e79" },
  { name: "Midnight", bg: "#0a0a14", surface: "#14141f", border: "#1f1f2e", text: "#e8e8f5", muted: "#6b6b85", accent: "#f42e79" },
  { name: "Navy", bg: "#0a0d24", surface: "#12163a", border: "#222b52", text: "#eef1ff", muted: "#8d94bd", accent: "#f42e79" },
  { name: "Violet", bg: "#140f26", surface: "#1d1534", border: "#2a1f45", text: "#f0e8ff", muted: "#8a78b8", accent: "#f42e79" },
  { name: "Ink", bg: "#0e1322", surface: "#151c30", border: "#202a44", text: "#e2e8f0", muted: "#64748b", accent: "#ff6fa9" },
  { name: "Arctic", bg: "#f4f6fc", surface: "#ffffff", border: "#d8e0ec", text: "#1a2233", muted: "#5a6578", accent: "#f42e79" },
];

function Swatch({ color, size = 28 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 8,
      background: color, border: "2px solid rgba(255,255,255,0.15)",
      flexShrink: 0,
    }} />
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <label style={{ flex: 1, fontSize: 12, color: "#a0a0ac", fontWeight: 500 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 32, height: 32, border: "none", borderRadius: 8, cursor: "pointer", background: "transparent", padding: 0 }}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => { if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value); }}
        style={{
          width: 78, padding: "5px 8px", borderRadius: 8, border: "1px solid #2e2e38",
          background: "#1a1a1f", color: "#e0e0e8", fontSize: 11, fontFamily: "monospace",
          outline: "none",
        }}
      />
    </div>
  );
}

export default function DashboardThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(PRESETS[0]);
  const [loading, setLoading] = useState(true);
  const [panelPos, setPanelPos] = useState(null);
  const panelRef = useRef(null);
  const lastRect = useRef(null);

  function clampPanel(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxH = vw < 1024 ? Math.min(vh * 0.52, 440) : Math.min(vh * 0.7, 560);
    const width = Math.min(340, vw - 24);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, vw - width - 8));
    let top = rect.bottom + 10;
    if (top + maxH > vh - 8) top = Math.max(8, rect.top - maxH - 10);
    return { left, top };
  }

  function togglePanel(e) {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    lastRect.current = rect;
    setPanelPos(clampPanel(rect));
    setOpen(true);
  }

  useEffect(() => {
    fetch("/api/dashboard/theme")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.theme) setTheme(data.theme);
        else setTheme(PRESETS[0]);
      })
      .catch(() => setTheme(PRESETS[0]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!theme) return;
    const r = document.documentElement;
    if (theme.bg) {
      r.style.setProperty("--background", theme.bg);
      r.style.setProperty("--dash-bg", theme.bg);
    }
    if (theme.surface) r.style.setProperty("--dash-surface", theme.surface);
    if (theme.border) r.style.setProperty("--dash-border", theme.border);
    if (theme.text) {
      r.style.setProperty("--foreground", theme.text);
      r.style.setProperty("--dash-text", theme.text);
    }
    if (theme.muted) r.style.setProperty("--dash-muted", theme.muted);
    if (theme.accent) r.style.setProperty("--dash-accent", theme.accent);
  }, [theme]);

  useEffect(() => {
    if (!open || !lastRect.current) return;
    function onResize() {
      setPanelPos(clampPanel(lastRect.current));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function applyPreset(preset) {
    setTheme({ ...preset });
    save({ ...preset });
  }

  function updateColor(key, value) {
    setTheme((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }

  function save(t) {
    fetch("/api/dashboard/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {});
  }

  if (loading || !theme) return null;

  const compact = typeof window !== "undefined" && window.innerWidth < 1024;
  const panelMaxHeight = compact ? "min(52vh, 440px)" : "min(70vh, 560px)";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={togglePanel}
        title="Customize theme"
        aria-expanded={open}
        style={{
          width: 36, height: 36, borderRadius: 10, border: "1px solid #2e2e38",
          background: "#24242a", color: "#a0a0ac", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a78bfa"; e.currentTarget.style.color = "#f5f5f5"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e2e38"; e.currentTarget.style.color = "#a0a0ac"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2a5 5 0 0 1 5 5c0 2-1 3-2 4l-1 1a1 1 0 0 0-.3.7V14a1 1 0 0 1-1 1h-1.4a1 1 0 0 0-.7.3l-.7.7a1 1 0 0 1-.7.3H9a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3z" />
          <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" />
          <circle cx="14" cy="8" r="1.5" fill="currentColor" />
          <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {open && panelPos && (
        <div ref={panelRef} style={{
          position: "fixed", left: panelPos.left, top: panelPos.top, zIndex: 200,
          width: "min(340px, calc(100vw - 24px))",
          maxHeight: panelMaxHeight, overflowY: "auto",
          background: "#1a1a1f", border: "1px solid #2e2e38", borderRadius: 16,
          padding: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f5", marginBottom: 14, textAlign: "center" }}>
            Customize Dashboard
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Presets
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 18 }}>
            {PRESETS.map((p) => {
              const isActive = theme.bg === p.bg && theme.surface === p.surface;
              return (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 10,
                    border: isActive ? "2px solid #a78bfa" : "1px solid #2e2e38",
                    background: p.surface, cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  <Swatch color={p.bg} size={18} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.text }}>{p.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b6b7b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Custom Colors
          </div>
          <ColorRow label="Background" value={theme.bg} onChange={(v) => updateColor("bg", v)} />
          <ColorRow label="Surface / Cards" value={theme.surface} onChange={(v) => updateColor("surface", v)} />
          <ColorRow label="Borders" value={theme.border} onChange={(v) => updateColor("border", v)} />
          <ColorRow label="Text" value={theme.text} onChange={(v) => updateColor("text", v)} />
          <ColorRow label="Muted Text" value={theme.muted} onChange={(v) => updateColor("muted", v)} />
          <ColorRow label="Accent" value={theme.accent} onChange={(v) => updateColor("accent", v)} />

          <button
            onClick={() => applyPreset(PRESETS[0])}
            style={{
              width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 10,
              border: "1px solid #2e2e38", background: "transparent",
              color: "#8b8b9b", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Reset to Default
          </button>
        </div>
      )}
    </div>
  );
}
