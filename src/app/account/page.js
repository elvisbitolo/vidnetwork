import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getSettings } from "@/lib/server/settings";
import Nav from "@/components/Nav";
import LogoutButton from "./LogoutButton";
import ManageSubscription from "./ManageSubscription";
import ProfileEditor from "./ProfileEditor";
import WelcomeChecklist from "./WelcomeChecklist";
import EmailNotifications from "./EmailNotifications";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getAccessSub(user.uid);
  const active = isActiveSub(sub);
  const settings = await getSettings();
  const { checkout } = await searchParams;

  const initialProfile = {
    name: userDoc?.name || user.name || "",
    headline: userDoc?.headline || "",
    location: userDoc?.location || "",
    country: userDoc?.country || "",
    state: userDoc?.state || "",
    bio: userDoc?.bio || "",
    favoriteColors: Array.isArray(userDoc?.favoriteColors) ? userDoc.favoriteColors : [],
    crafts: Array.isArray(userDoc?.crafts) ? userDoc.crafts : [],
    goToYarn: userDoc?.goToYarn || "",
    favoriteHookSize: userDoc?.favoriteHookSize || "",
    proudestProject: userDoc?.proudestProject || "",
    bestGiftProject: userDoc?.bestGiftProject || "",
    photoURL: userDoc?.photoURL || "",
  };

  return (
      <Nav role={userDoc?.role}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your account</h1>
          <LogoutButton />
        </div>

        {checkout === "success" && (
          <p className={styles.banner}>Welcome! Your membership is active.</p>
        )}

        <WelcomeChecklist uid={user.uid} initialProfile={initialProfile} steps={settings.welcomeChecklist} />

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Membership</h2>
          {active ? (
            <>
              <div className={styles.row}>
                <span className={styles.label}>Status</span>
                <span className={styles.value}>
                  <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Plan</span>
                <span className={styles.value}>{sub.tier ? `${sub.tier.charAt(0).toUpperCase()}${sub.tier.slice(1)}` : "Standard"} · {sub.plan}</span>
              </div>
              <ManageSubscription />
            </>
          ) : (
            <p className={styles.value}>
              No active membership.{" "}
              <Link className={styles.link} href="/pricing">View plans</Link>
            </p>
          )}
        </section>

        <ProfileEditor uid={user.uid} initial={initialProfile} />

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Notifications</h2>
          <EmailNotifications enabled={userDoc?.notifications} />
        </section>
      </div>
</Nav>
  );
}
