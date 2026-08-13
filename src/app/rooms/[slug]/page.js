import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getRoomBySlug } from "@/lib/server/rooms";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import Nav from "@/components/Nav";
import RoomClient from "./RoomClient";
import styles from "./room.module.css";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const room = await getRoomBySlug(slug);
  if (!room || room.status !== "active") {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Room not found</h1>
          <p className={styles.subtitle}>This room is closed or doesn&apos;t exist.</p>
          <Link className={styles.link} href="/rooms">Back to rooms</Link>
        </div>
      </main>
    );
  }

  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Membership required</h1>
          <p className={styles.subtitle}>
            An active membership is required to join video rooms.
          </p>
          <Link className={styles.link} href="/pricing">View plans</Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Nav role={userDoc?.role} />
      <RoomClient
        roomName={room.name}
        slug={room.slug}
        roomId={room.id}
        kind={room.kind}
        role={userDoc?.role}
      />
    </>
  );
}
