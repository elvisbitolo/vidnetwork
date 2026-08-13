"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./LandingNav.module.css";
import { PlayIcon } from "./LandingIcons";

const LINKS = [
  { href: "/rooms", label: "Rooms" },
  { href: "/courses", label: "Courses" },
  { href: "/events", label: "Events" },
  { href: "/groups", label: "Community" },
  { href: "/pricing", label: "Pricing" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main">
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
            <span className={styles.brandMark} aria-hidden="true">
              <PlayIcon size={13} />
            </span>
            VidNetwork
          </Link>

          <div className={styles.desktopLinks}>
            {LINKS.map((link) => (
              <Link key={link.href} className={styles.link} href={link.href}>
                {link.label}
              </Link>
            ))}
            <span className={styles.divider} aria-hidden="true" />
            <Link className={styles.link} href="/login">
              Log in
            </Link>
            <Link className={styles.cta} href="/signup">
              Sign up
            </Link>
          </div>

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

        {open && (
          <div id="landing-menu" className={styles.mobileMenu}>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                className={styles.mobileLink}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link className={styles.mobileLink} href="/login" onClick={() => setOpen(false)}>
              Log in
            </Link>
            <Link className={styles.mobileCta} href="/signup" onClick={() => setOpen(false)}>
              Sign up
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
