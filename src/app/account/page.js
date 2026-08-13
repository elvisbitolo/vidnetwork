import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import Nav from "@/components/Nav";
import LogoutButton from "./LogoutButton";
import ManageSubscription from "./ManageSubscription";
import ProfileEditor from "./ProfileEditor";
import WelcomeChecklist from "./WelcomeChecklist";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  const active = isActiveSub(sub);
  const { checkout } = await searchParams;

  const initialProfile = {
    name: userDoc?.name || user.name || "",
    headline: userDoc?.headline || "",
    location: userDoc?.location || "",
    bio: userDoc?.bio || "",
  };

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your account</h1>
          <LogoutButton />
        </div>

        {checkout === "success" && (
          <p className={styles.banner}>Welcome! Your membership is active.</p>
        )}

        <WelcomeChecklist uid={user.uid} initialProfile={initialProfile} />

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
                <span className={styles.value}>{sub.plan}</span>
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
      </div>
    </main>
  );
}
