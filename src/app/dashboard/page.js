import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub, getTier } from "@/lib/server/subscription";
import { getDashboardData } from "@/lib/server/dashboard";
import { recordDailyVisit } from "@/lib/server/gamification";
import { getSettings } from "@/lib/server/settings";
import Nav from "@/components/Nav";
import WelcomeChecklist from "@/app/account/WelcomeChecklist";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

function formatTime(millis) {
  return new Date(millis).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const tier = await getTier(user.uid);
  const data = await getDashboardData(user.uid, userDoc, tier);
  recordDailyVisit(user.uid, userDoc?.name || user.name || "Member").catch(() => {});
  const settings = await getSettings();

  const name = userDoc?.name || user.name || "Member";
  const unread = data.notifications.filter((n) => !n.read).length;
  const initialProfile = {
    name: userDoc?.name || user.name || "",
    headline: userDoc?.headline || "",
    location: userDoc?.location || "",
    bio: userDoc?.bio || "",
  };

  return (
      <Nav role={userDoc?.role}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Welcome back, {name}</h1>
            <p className={styles.subtitle}>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link className={styles.accountLink} href="/account">Your account</Link>
        </div>

        <div className={styles.grid}>
          <div className={styles.col}>
            {data.rooms.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Live now</h2>
                  <Link className={styles.cardLink} href="/rooms">All rooms</Link>
                </div>
                <ul className={styles.list}>
                  {data.rooms.map((room) => (
                    <li key={room.id}>
                      <Link className={styles.item} href={`/rooms/${room.slug}`}>
                        <span className={styles.dot} />
                        <span className={styles.itemTitle}>{room.name}</span>
                        <span className={styles.itemMeta}>
                          {room.kind === "broadcast" ? "Broadcast" : "Live"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.events.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Upcoming events</h2>
                  <Link className={styles.cardLink} href="/events">All events</Link>
                </div>
                <ul className={styles.list}>
                  {data.events.map((event) => (
                    <li key={event.id}>
                      <Link className={styles.item} href="/events">
                        <span className={styles.itemTitle}>{event.title}</span>
                        <span className={styles.itemMeta}>{formatTime(event.startTime)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.activity.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Community activity</h2>
                  <Link className={styles.cardLink} href="/feed">Open the feed</Link>
                </div>
                <ul className={styles.list}>
                  {data.activity.map((post) => (
                    <li key={post.id}>
                      <Link className={styles.item} href={post.href}>
                        <span className={styles.itemTitle}>{post.authorName}</span>
                        <span className={styles.itemBody}>{post.text}</span>
                        <span className={styles.itemMeta}>
                          {new Date(post.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.messages.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recent messages</h2>
                  <Link className={styles.cardLink} href="/chat">Open chat</Link>
                </div>
                <ul className={styles.list}>
                  {data.messages.map((conv) => (
                    <li key={conv.id}>
                      <Link className={styles.item} href="/chat">
                        <span className={styles.itemTitle}>{conv.title}</span>
                        <span className={styles.itemBody}>{conv.lastMessage}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className={styles.col}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Notifications</h2>
                <Link className={styles.cardLink} href="/notifications">View all</Link>
              </div>
              {unread > 0 && (
                <p className={styles.unread}>You have {unread} unread notification{unread === 1 ? "" : "s"}</p>
              )}
              {data.notifications.length === 0 && (
                <p className={styles.empty}>No notifications yet.</p>
              )}
              <ul className={styles.list}>
                {data.notifications.map((n) => (
                  <li key={n.id}>
                    <Link className={`${styles.item} ${n.read ? styles.itemRead : ""}`} href={n.href}>
                      <span className={styles.itemBody}>{n.text}</span>
                      <span className={styles.itemMeta}>
                        {new Date(n.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {data.learning.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Continue learning</h2>
                  <Link className={styles.cardLink} href="/courses">All courses</Link>
                </div>
                <ul className={styles.list}>
                  {data.learning.map((course) => (
                    <li key={course.id}>
                      <Link className={styles.item} href={`/courses/${course.id}`}>
                        <span className={styles.itemTitle}>{course.title}</span>
                        <span className={styles.itemMeta}>
                          {course.done} of {course.total} lessons
                        </span>
                      </Link>
                      <div className={styles.track}>
                        <div className={styles.trackFill} style={{ width: `${course.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.spaces.length > 0 && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recommended spaces</h2>
                  <Link className={styles.cardLink} href="/spaces">All spaces</Link>
                </div>
                <ul className={styles.list}>
                  {data.spaces.map((space) => (
                    <li key={space.id}>
                      <Link className={styles.item} href={`/spaces/${space.slug}`}>
                        <span className={styles.itemTitle}>{space.name}</span>
                        <span className={styles.itemBody}>{space.description}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <WelcomeChecklist
              uid={user.uid}
              initialProfile={initialProfile}
              steps={settings.welcomeChecklist}
            />
          </div>
        </div>
      </div>
</Nav>
  );
}
