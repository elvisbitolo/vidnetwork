import Link from "next/link";
import styles from "@/app/perks/perks.module.css";

export default function PerkLocked({ icon = "🔒", title, body, ctaLabel, ctaHref }) {
  return (
    <section className={styles.locked}>
      <div className={styles.lockedIcon} aria-hidden="true">
        {icon}
      </div>
      <h1 className={styles.lockedTitle}>{title}</h1>
      <p className={styles.lockedBody}>{body}</p>
      {ctaLabel && ctaHref && (
        <Link className={styles.lockedCta} href={ctaHref}>
          {ctaLabel}
        </Link>
      )}
    </section>
  );
}