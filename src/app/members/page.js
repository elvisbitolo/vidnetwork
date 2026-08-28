import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";
import { listLiveMemberUids } from "@/lib/server/livekit";
import Nav from "@/components/Nav";
import MembersDirectory from "./MembersDirectory";
import SimilarMembers from "./SimilarMembers";
import styles from "./members.module.css";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const snap = await adminDb().collection("users").orderBy("name", "asc").get();

  const gamiSnap = await adminDb().collection("gamification").get();
  const gami = new Map();
  gamiSnap.docs.forEach((doc) => {
    const data = doc.data();
    gami.set(doc.id, {
      points: data.points || 0,
      lastVisitDate: data.lastVisitDate || "",
    });
  });

  const liveUids = await listLiveMemberUids().catch(() => new Set());

  const todayKey = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  })();

  const members = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((m) => m.name)
    .map((m) => ({
      id: m.id,
      name: m.name,
      headline: m.headline || "",
      location: m.location || "",
      country: m.country || "",
      state: m.state || "",
      bio: m.bio || "",
      photoURL: m.photoURL || "",
      favoriteColors: Array.isArray(m.favoriteColors) ? m.favoriteColors : [],
      crafts: Array.isArray(m.crafts) ? m.crafts : [],
      role: m.role || "member",
      foundingMember: !!m.foundingMember,
      live: liveUids.has(m.id),
      points: gami.get(m.id)?.points || 0,
      lastVisitDate: gami.get(m.id)?.lastVisitDate || "",
      createdAt: m.createdAt?.toMillis
        ? m.createdAt.toMillis()
        : m.createdAt
          ? new Date(m.createdAt).getTime()
          : 0,
    }));

  return (
      <Nav role={userDoc?.role}>
      <div className={styles.container}>
        <h1 className={styles.title}>Members</h1>
        <p className={styles.subtitle}>
          {members.length} {members.length === 1 ? "member" : "members"} in the community
        </p>
        <MembersDirectory members={members} role={userDoc?.role} todayKey={todayKey} />
        <SimilarMembers />
      </div>
</Nav>
  );
}
