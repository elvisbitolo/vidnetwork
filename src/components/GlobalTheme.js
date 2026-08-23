"use client";

import { useEffect } from "react";

export default function GlobalTheme() {
  useEffect(() => {
    fetch("/api/dashboard/theme")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.theme) return;
        const t = data.theme;
        const r = document.documentElement;
        if (t.bg) {
          r.style.setProperty("--background", t.bg);
          r.style.setProperty("--dash-bg", t.bg);
        }
        if (t.surface) r.style.setProperty("--dash-surface", t.surface);
        if (t.border) r.style.setProperty("--dash-border", t.border);
        if (t.text) {
          r.style.setProperty("--foreground", t.text);
          r.style.setProperty("--dash-text", t.text);
        }
        if (t.muted) r.style.setProperty("--dash-muted", t.muted);
        if (t.accent) r.style.setProperty("--dash-accent", t.accent);
      })
      .catch(() => {});
  }, []);

  return null;
}
