const HEX = /^#[0-9a-f]{6}$/i;

function rgba(hex, alpha) {
  if (!HEX.test(hex)) return hex;
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mix(hex1, hex2, p) {
  const a = parseInt(hex1.slice(1), 16);
  const b = parseInt(hex2.slice(1), 16);
  const r = Math.round(((a >> 16) & 0xff) * (1 - p) + ((b >> 16) & 0xff) * p);
  const g = Math.round(((a >> 8) & 0xff) * (1 - p) + ((b >> 8) & 0xff) * p);
  const bl = Math.round((a & 0xff) * (1 - p) + (b & 0xff) * p);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

const SURFACE = "#1c1c26";

export function makeCardTheme(accent, opts = {}) {
  const text = opts.text || "#f5f5f7";
  const muted = opts.muted || "rgba(245, 245, 247, 0.6)";
  return {
    accent,
    "--card-accent": accent,
    "--card-soft": rgba(accent, opts.soft ?? 0.14),
    "--card-bg": opts.bg || mix(SURFACE, accent, 0.08),
    "--card-border": opts.border || rgba(accent, opts.borderAlpha ?? 0.32),
    "--card-text": text,
    "--card-muted": muted,
    "--card-title": opts.title || accent,
  };
}

export const CARD_THEMES = {
  indigo: makeCardTheme("#818cf8"),
  violet: makeCardTheme("#a78bfa"),
  fuchsia: makeCardTheme("#e879f9"),
  rose: makeCardTheme("#fb7185"),
  amber: makeCardTheme("#fbbf24"),
  emerald: makeCardTheme("#34d399"),
  teal: makeCardTheme("#2dd4bf"),
  sky: makeCardTheme("#38bdf8"),
  slate: makeCardTheme("#94a3b8"),
};

const LIGHT_ACCENTS = {
  indigo: "#4f46e5",
  violet: "#7c3aed",
  fuchsia: "#c026d3",
  rose: "#e11d48",
  amber: "#d97706",
  emerald: "#059669",
  teal: "#0d9488",
  sky: "#0284c7",
  slate: "#475569",
};

export function cardThemeVars(name, opts = {}) {
  const theme = CARD_THEMES[name] || CARD_THEMES.indigo;
  if (opts.light) {
    const accent = LIGHT_ACCENTS[name] || LIGHT_ACCENTS.indigo;
    return {
      "--card-accent": accent,
      "--card-soft": "rgba(79, 70, 229, 0.08)",
      "--card-bg": "#ffffff",
      "--card-border": "rgba(79, 70, 229, 0.22)",
      "--card-text": "#1a1a24",
      "--card-muted": "#6b6b7b",
      "--card-title": accent,
    };
  }
  return {
    "--card-accent": theme["--card-accent"],
    "--card-soft": theme["--card-soft"],
    "--card-bg": theme["--card-bg"],
    "--card-border": theme["--card-border"],
    "--card-text": theme["--card-text"],
    "--card-muted": theme["--card-muted"],
    "--card-title": theme["--card-title"],
  };
}
