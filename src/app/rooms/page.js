import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { listRooms, seedAlwaysOnRoom } from "@/lib/server/rooms";
import { adminDb } from "@/lib/firebase/admin";
import Nav from "@/components/Nav";
import styles from "./rooms.module.css";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);

  await seedAlwaysOnRoom();
  const rooms = await listRooms();
  const activeRooms = rooms.filter((room) => room.status === "active");
  const alwaysOnRoom = activeRooms.find((room) => room.alwaysOn);
  const regularRooms = activeRooms.filter((room) => !room.alwaysOn);

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
      <Nav role={userDoc?.role}>
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
            {alwaysOnRoom && (
              <Link href={`/rooms/${alwaysOnRoom.slug}`} className={styles.card} style={{
                background: "linear-gradient(135deg, rgba(109,93,246,0.15), rgba(167,139,250,0.08))",
                border: "1px solid rgba(167,139,250,0.3)",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(167,139,250,0.2)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--secondary-light)",
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#4ade80",
                    animation: "livePulse 1.4s ease-in-out infinite",
                  }} />
                  Always Open
                </div>
                <h2 className={styles.cardTitle} style={{ paddingRight: 100 }}>
                  {alwaysOnRoom.name}
                </h2>
                <p className={styles.cardDesc}>{alwaysOnRoom.description}</p>
                <p className={styles.cardMeta}>
                  Drop in anytime · background music plays when you&apos;re alone
                </p>
              </Link>
            )}
            {regularRooms.map((room) => (
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
</Nav>
  );
}
