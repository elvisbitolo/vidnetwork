import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.brand}>Community</span>
          <div className={styles.navLinks}>
            <Link className={styles.navLink} href="/rooms">Rooms</Link>
            <Link className={styles.navLink} href="/pricing">Pricing</Link>
            <Link className={`${styles.navLink} ${styles.navLogin}`} href="/login">Log in</Link>
            <Link className={styles.ctaSmall} href="/signup">Sign up</Link>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Talk face-to-face with people who get it.</h1>
        <p className={styles.heroSub}>
          Live video rooms for the community. Real conversations, real people — no doomscrolling.
        </p>
        <div className={styles.heroCtas}>
          <Link className={styles.primary} href="/signup">Join the community</Link>
          <Link className={styles.secondary} href="/pricing">View pricing</Link>
        </div>
        <p className={styles.heroFine}>14-day free trial · no credit card required</p>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything in one place</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Live video rooms</h3>
            <p className={styles.featureDesc}>
              Drop into a room and talk in real time with dozens of members at once.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Real-time chat</h3>
            <p className={styles.featureDesc}>
              Keep the conversation going with instant text chat alongside every call.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h3 className={styles.featureTitle}>Members only</h3>
            <p className={styles.featureDesc}>
              A paid, moderated community — quality over noise, on any device.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Simple membership</h2>
        <div className={styles.priceCard}>
          <p className={styles.priceAmount}>
            $20<span className={styles.priceInterval}>/month</span>
          </p>
          <p className={styles.priceNote}>Unlimited access to all live video rooms and chat.</p>
          <Link className={styles.primary} href="/signup">Start your free trial</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Community · members-only live video chat</p>
      </footer>
    </main>
  );
}
