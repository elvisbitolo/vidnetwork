import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { listCourses } from "@/lib/server/courses";
import Nav from "@/components/Nav";
import styles from "./courses.module.css";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const courses = await listCourses(false);

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Courses</h1>
          {userDoc?.role === "owner" && (
            <Link className={styles.adminLink} href="/admin/courses">Manage courses</Link>
          )}
        </div>
        <p className={styles.subtitle}>Structured learning for the community. Go at your own pace.</p>

        {courses.length === 0 ? (
          <p className={styles.empty}>No courses yet — check back soon.</p>
        ) : (
          <div className={styles.grid}>
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className={styles.card}>
                <h2 className={styles.cardTitle}>
                  {course.title}
                  {course.requiredTier === "premium" && (
                    <span className={styles.premiumBadge}>Premium</span>
                  )}
                </h2>
                {course.description && <p className={styles.cardDesc}>{course.description}</p>}
                <p className={styles.cardMeta}>Start learning →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
