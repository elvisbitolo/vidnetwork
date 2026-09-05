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
  const now = new Date().getTime();
  const rooms = await listRooms();
  const activeRooms = rooms.filter((room) => room.status === "active");
  const isLiveNow = (room) => {
    if (!room.opensAt) return true;
    const t = room.opensAt?.toMillis
      ? room.opensAt.toMillis()
      : typeof room.opensAt === "number"
        ? room.opensAt
        : Number.NaN;
    return Number.isFinite(t) ? t <= now : true;
  };
  const alwaysOnRoom = activeRooms.find((room) => room.alwaysOn);
  const regularRooms = activeRooms.filter((room) => !room.alwaysOn);
  const liveBroadcasts = regularRooms.filter(
    (room) => (room.kind || "standard") === "broadcast" && isLiveNow(room)
  );
  const gridRooms = regularRooms.filter(
    (room) => !(room.kind === "broadcast" && isLiveNow(room))
  );

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

        {liveBroadcasts.length > 0 && (
          <div className={styles.liveBanner}>
            <div className={styles.liveBannerHeader}>
              <span className={styles.liveBannerPulse} aria-hidden="true" />
              <span className={styles.liveBannerTitle}>Live now</span>
              <span className={styles.liveBannerCount}>
                {liveBroadcasts.length === 1 ? "1 broadcast" : `${liveBroadcasts.length} broadcasts`}
              </span>
            </div>
            <div className={styles.liveBannerList}>
              {liveBroadcasts.map((room) => (
                <Link key={room.id} href={`/rooms/${room.slug}`} className={styles.liveBannerCard}>
                  <span className={styles.liveBannerCardDot} aria-hidden="true" />
                  <span className={styles.liveBannerCardName}>{room.name}</span>
                  {room.groupId && groupsById[room.groupId] && (
                    <span className={styles.groupTag} style={{ marginLeft: 0 }}>
                      · {groupsById[room.groupId].name}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeRooms.length === 0 ? (
          <p className={styles.empty}>No open rooms right now — check back soon.</p>
        ) : (
          <div className={styles.grid}>
            {alwaysOnRoom && (
              <Link
                href={`/rooms/${alwaysOnRoom.slug}`}
                className={`${styles.card} ${styles.alwaysOnCard}`}
              >
                <span className={styles.alwaysOnBadge}>
                  <span className={styles.alwaysOnBadgeDot} aria-hidden="true" />
                  Always Open
                </span>
                <h2 className={`${styles.cardTitle} ${styles.alwaysOnTitle}`}>
                  {alwaysOnRoom.name}
                </h2>
                <p className={styles.cardDesc}>{alwaysOnRoom.description}</p>
                <p className={styles.cardMeta}>
                  Pop in anytime · background music plays when you&apos;re alone
                </p>
              </Link>
            )}
            {gridRooms.map((room) => (
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
