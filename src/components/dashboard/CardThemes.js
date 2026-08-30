"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const CardThemesContext = createContext({
  themes: {},
  setTheme: () => {},
  resetTheme: () => {},
});

export function CardThemesProvider({ children }) {
  const [themes, setThemes] = useState({});

  useEffect(() => {
    let active = true;
    fetch("/api/dashboard/card-theme")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json && json.themes) setThemes(json.themes);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback(async (cardId, theme) => {
    setThemes((prev) => ({ ...prev, [cardId]: theme }));
    try {
      await fetch("/api/dashboard/card-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, theme }),
      });
    } catch {
      /* keep optimistic value */
    }
  }, []);

  const resetTheme = useCallback(async (cardId) => {
    setThemes((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    try {
      await fetch("/api/dashboard/card-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, theme: null }),
      });
    } catch {
      /* keep optimistic value */
    }
  }, []);

  return (
    <CardThemesContext.Provider value={{ themes, setTheme, resetTheme }}>
      {children}
    </CardThemesContext.Provider>
  );
}

export function useCardThemes() {
  return useContext(CardThemesContext);
}