"use client";

import styles from "./dashboard.module.css";

export function Card({ title, linkLabel, linkHref, children }) {
  return (
    <section className={styles.card}>
      {(title || linkLabel) && (
        <div className={styles.cardHeader}>
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {linkLabel && linkHref && (
            <a className={styles.cardLink} href={linkHref}>
              {linkLabel}
            </a>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={styles.skeletonLine} style={{ width: `${100 - i * 18}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ text }) {
  return <p className={styles.empty}>{text}</p>;
}

export function SectionError({ message = "This section couldn't load.", onRetry }) {
  return (
    <div className={styles.error}>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
