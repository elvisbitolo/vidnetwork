import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getGamification, getLeaderboard, BADGES } from "@/lib/server/gamification";
import Nav from "@/components/Nav";
import styles from "./leaderboard.module.css";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const name = userDoc?.name || user.name || user.email?.split("@")[0] || "Member";
  const [mine, leaderboard] = await Promise.all([
    getGamification(user.uid, name),
    getLeaderboard(20),
  ]);

  const myRank = leaderboard.find((entry) => entry.userId === user.uid)?.rank || null;
  const earnedCodes = Object.keys(mine.badges || {});
  const unearned = Object.entries(BADGES).filter(([code]) => !earnedCodes.includes(code));

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Leaderboard</h1>
        <p className={styles.subtitle}>
          Earn points by posting, commenting, attending events and finishing lessons.
        </p>

        <div className={styles.statsCard}>
          <div className={styles.stat}>
            <p className={styles.statValue}>{mine.points}</p>
            <p className={styles.statLabel}>Points</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{mine.streak} {mine.streak === 1 ? "day" : "days"}</p>
            <p className={styles.statLabel}>Current streak</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{mine.bestStreak} {mine.bestStreak === 1 ? "day" : "days"}</p>
            <p className={styles.statLabel}>Best streak</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{myRank ? `#${myRank}` : "—"}</p>
            <p className={styles.statLabel}>Your rank</p>
          </div>
          <div className={styles.stat}>
            <p className={styles.statValue}>{earnedCodes.length}</p>
            <p className={styles.statLabel}>Badges</p>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>Top members</h2>
        <div className={styles.rows}>
          {leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className={entry.userId === user.uid ? `${styles.row} ${styles.rowMine}` : styles.row}
            >
              <p className={styles.rank}>#{entry.rank}</p>
              <p className={styles.name}>{entry.name}</p>
              <p className={styles.streak}>{entry.streak} 🔥</p>
              <p className={styles.badges}>{entry.badgeCount} badges</p>
              <p className={styles.points}>{entry.points} pts</p>
            </div>
          ))}
          {leaderboard.length === 0 && <p className={styles.empty}>No points yet — be the first!</p>}
        </div>

        <h2 className={styles.sectionTitle}>Badges</h2>
        <div className={styles.badges}>
          {Object.entries(BADGES).map(([code, badge]) => {
            const earned = mine.badges[code];
            return (
              <div key={code} className={earned ? styles.badge : `${styles.badge} ${styles.badgeLocked}`}>
                <p className={styles.badgeName}>{earned ? "✓" : "🔒"} {badge.name}</p>
                <p className={styles.badgeDesc}>{badge.description}</p>
              </div>
            );
          })}
          {unearned.length === 0 && <p className={styles.empty}>All badges earned!</p>}
        </div>
      </div>
    </main>
  );
}
