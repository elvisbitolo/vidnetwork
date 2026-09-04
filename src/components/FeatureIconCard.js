import styles from "./FeatureIconCard.module.css";

export default function FeatureIconCard({ icon: Icon, title, desc, tag, accent = "red", className = "" }) {
  return (
    <article className={`${styles.card} ${styles[`accent_${accent}`]} ${className}`.trim()}>
      <div className={styles.top}>
        <span className={styles.iconBox}>
          <Icon className={styles.icon} strokeWidth={1.9} aria-hidden="true" />
        </span>
        {tag && <span className={styles.tag}>{tag}</span>}
      </div>
      <h3 className={styles.name}>{title}</h3>
      {desc && <p className={styles.desc}>{desc}</p>}
    </article>
  );
}
