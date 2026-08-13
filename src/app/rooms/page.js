import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { listRooms } from "@/lib/server/rooms";
import { adminDb } from "@/lib/firebase/admin";
import Nav from "@/components/Nav";
import styles from "./rooms.module.css";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const rooms = await listRooms();
  const activeRooms = rooms.filter((room) => room.status === "active");

  const groupIds = [...new Set(activeRooms.map((room) => room.groupId).filter(Boolean))];
  const groupsById = {};
  if (groupIds.length > 0) {
    const groupRefs = groupIds.map((id) => adminDb().collection("groups").doc(id));
    const groupSnaps = await adminDb().getAll(...groupRefs);
    groupSnaps.forEach((doc) => {
      if (doc.exists) {
        groupsById[doc.id] = { id: doc.id, name: doc.data().name, slug: doc.data().slug };
      }
    });
  }

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Rooms</h1>
          {userDoc?.role === "owner" && (
            <Link className={styles.adminLink} href="/admin/rooms">Manage rooms</Link>
          )}
        </div>
        <p className={styles.subtitle}>Live video rooms for the community. Pick one and join.</p>

        {activeRooms.length === 0 ? (
          <p className={styles.empty}>No open rooms right now — check back soon.</p>
        ) : (
          <div className={styles.grid}>
            {activeRooms.map((room) => (
              <Link key={room.id} href={`/rooms/${room.slug}`} className={styles.card}>
                <h2 className={styles.cardTitle}>
                  {room.name}
                  {room.kind === "broadcast" && <span className={styles.broadcastBadge}>Broadcast</span>}
                </h2>
                {room.description && <p className={styles.cardDesc}>{room.description}</p>}
                <p className={styles.cardMeta}>
                  Up to {room.maxParticipants} members · live
                  {room.groupId && groupsById[room.groupId] && (
                    <span className={styles.groupTag}>
                      · in {groupsById[room.groupId].name}
                    </span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
