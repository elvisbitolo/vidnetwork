"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import styles from "./LandingNav.module.css";
import { PlayIcon } from "./LandingIcons";

const LINKS = [
  { href: "/explore", key: "exploreCommunity" },
  { href: "/pricing", key: "pricing" },
];

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

function getCurrentLocale() {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
  return match ? match[1] : "en";
}

function switchLang(code) {
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
  window.location.reload();
}

function LangPicker({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [locale, setLocale] = useState("en");

  useEffect(() => setLocale(getCurrentLocale()), []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 8,
          padding: "6px 10px",
          color: "#9b9bab",
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            background: "#1a1a1a",
            border: "1px solid #2e2e38",
            borderRadius: 10,
            padding: 6,
            minWidth: 150,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 1000,
          }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                switchLang(lang.code);
                if (onNavigate) onNavigate();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                border: "none",
                background: locale === lang.code ? "rgba(167,139,250,0.15)" : "transparent",
                color: locale === lang.code ? "var(--secondary-light)" : "#f5f5f5",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: locale === lang.code ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 16 }}>{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LandingNav() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
            <span className={styles.brandMark} aria-hidden="true">
              <PlayIcon size={13} />
            </span>
            Yarnery Lounge
          </Link>

          <div className={styles.desktopLinks}>
            {LINKS.map((link) => (
              <Link key={link.href} className={styles.link} href={link.href}>
                {t(link.key)}
              </Link>
            ))}
            <span className={styles.divider} aria-hidden="true" />
            <Link className={styles.link} href="/login">
              {t("login")}
            </Link>
            <Link className={styles.cta} href="/signup">
              {t("signup")}
            </Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LangPicker />
            <button
              type="button"
              className={open ? `${styles.burger} ${styles.burgerOpen}` : styles.burger}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="landing-menu"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
              <span className={styles.burgerLine} />
            </button>
          </div>
        </div>

        {open && (
          <div id="landing-menu" className={styles.mobileMenu}>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                className={styles.mobileLink}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {t(link.key)}
              </Link>
            ))}
            <Link className={styles.mobileLink} href="/login" onClick={() => setOpen(false)}>
              {t("login")}
            </Link>
            <Link className={styles.mobileCta} href="/signup" onClick={() => setOpen(false)}>
              {t("signup")}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
