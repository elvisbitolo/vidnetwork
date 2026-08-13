import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";
import Nav from "@/components/Nav";
import styles from "./members.module.css";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const snap = await adminDb().collection("users").orderBy("name", "asc").get();
  const members = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((m) => m.name);

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Members</h1>
        <p className={styles.subtitle}>
          {members.length} {members.length === 1 ? "member" : "members"} in the community
        </p>

        {members.length === 0 ? (
          <p className={styles.empty}>No members yet.</p>
        ) : (
          <div className={styles.grid}>
            {members.map((member) => (
              <div key={member.id} className={styles.card}>
                <div className={styles.avatar}>
                  {(member.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.name}>
                    {member.name}
                    {member.role === "owner" && <span className={styles.ownerBadge}>Owner</span>}
                  </p>
                  {member.headline && <p className={styles.headline}>{member.headline}</p>}
                  {member.bio && <p className={styles.bio}>{member.bio}</p>}
                  {member.location && <p className={styles.location}>{member.location}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
