import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub, getTier } from "@/lib/server/subscription";
import { listRooms } from "@/lib/server/rooms";
import { getVideoHoursUsed } from "@/lib/server/videoHours";
import { videoChatRights } from "@/lib/server/plans";
import { adminDb } from "@/lib/firebase/admin";
import Nav from "@/components/Nav";
import styles from "./rooms.module.css";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const tier = sub.tier || "standard";
  const rights = videoChatRights(tier);
  let videoHours = null;
  if (rights.monthlyHours !== Infinity) {
    const used = await getVideoHoursUsed(user.uid);
    videoHours = { used, total: rights.monthlyHours, remaining: Math.max(0, rights.monthlyHours - used) };
  }

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
      <Nav role={userDoc?.role}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Rooms</h1>
          {userDoc?.role === "owner" && (
            <Link className={styles.adminLink} href="/admin/rooms">Manage rooms</Link>
          )}
        </div>
        <p className={styles.subtitle}>Live video rooms for the community. Pick one and join.</p>

        {videoHours ? (
          <div style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: videoHours.remaining <= 2 ? "rgba(239,68,68,0.12)" : "rgba(167,139,250,0.1)",
            border: `1px solid ${videoHours.remaining <= 2 ? "rgba(239,68,68,0.25)" : "rgba(167,139,250,0.2)"}`,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, color: "#f5f5f5" }}>
              Video chat hours this month:{" "}
              <strong style={{ color: videoHours.remaining <= 2 ? "#ef4444" : "#a78bfa" }}>
                {videoHours.remaining}
              </strong>
              {" / "}{videoHours.total} remaining
            </span>
            {rights.canHost && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#a78bfa",
                background: "rgba(167,139,250,0.15)",
                padding: "3px 10px",
                borderRadius: 999,
              }}>
                Creator — Unlimited hosting
              </span>
            )}
          </div>
        ) : rights.canHost ? (
          <div style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(167,139,250,0.1)",
            border: "1px solid rgba(167,139,250,0.2)",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 13, color: "#f5f5f5" }}>
              Creator membership — <strong style={{ color: "#a78bfa" }}>Unlimited</strong> video chat hours
            </span>
          </div>
        ) : null}

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
</Nav>
  );
}
