import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getCourseFull, getProgress, canAccessCourse } from "@/lib/server/courses";
import { getPurchasedKeys, canAccessPaid } from "@/lib/server/purchases";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import BuyButton from "@/components/BuyButton";
import styles from "../courses.module.css";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const { course, modules, lessons } = (await getCourseFull(id)) || {};
  if (!course || (course.status !== "published" && userDoc?.role !== "owner")) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Course not found</h1>
          <p className={styles.subtitle}>This course isn&apos;t available.</p>
          <Link className={styles.link} href="/courses">Back to courses</Link>
        </div>
      </main>
    );
  }

  const isOwner = userDoc?.role === "owner";
  const tier = sub.tier || "standard";
  const needsHigherTier = !isOwner && !canAccessCourse(course, tier);

  const purchasedKeys = await getPurchasedKeys(user.uid);
  const needsPurchase = !isOwner && !canAccessPaid("course", course, purchasedKeys);

  if (needsHigherTier) {
    return (
      <main className={styles.page}>
        <Nav role={userDoc?.role} />
        <div className={styles.container}>
          <h1 className={styles.title}>Membership upgrade required</h1>
          <p className={styles.subtitle}>
            This course requires the Premium membership tier. Upgrade to unlock it.
          </p>
          <Link className={styles.link} href="/pricing">See membership options</Link>
        </div>
      </main>
    );
  }

  if (needsPurchase) {
    return (
      <main className={styles.page}>
        <Nav role={userDoc?.role} />
        <div className={styles.container}>
          <BackButton fallback="/courses" label="All courses" />
          <div className={styles.courseHeader}>
            <h1 className={styles.title}>{course.title}</h1>
            {course.description && <p className={styles.subtitle}>{course.description}</p>}
          </div>
          <div className={styles.paywall}>
            <h2 className={styles.paywallTitle}>
              {course.title} is sold separately
            </h2>
            <p className={styles.paywallText}>
              Buy one-time access to all lessons in this course. Your purchase never expires.
            </p>
            <BuyButton targetType="course" targetId={course.id} priceCents={course.purchasePriceCents} />
          </div>
        </div>
      </main>
    );
  }

  const progress = await getProgress(id, user.uid);
  const completed = new Set(progress.completedLessons || []);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const totalLessons = modules.reduce((sum, m) => sum + lessons[m.id].length, 0);
  const doneCount = modules.reduce(
    (sum, m) => sum + lessons[m.id].filter((l) => completed.has(l.id)).length,
    0
  );
  const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

  function isLocked(lesson) {
    if (isOwner || !lesson.releaseAt) return false;
    const ts = lesson.releaseAt?.toMillis?.() || Number(lesson.releaseAt) || 0;
    return ts > now;
  }

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <BackButton fallback="/courses" label="All courses" />
        <p className={styles.breadcrumb}>
          <Link className={styles.link} href="/courses">Courses</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span>{course.title}</span>
        </p>

        <div className={styles.courseHeader}>
          <div className={styles.courseTitleRow}>
            <h1 className={styles.title}>{course.title}</h1>
            {course.status !== "published" && <span className={styles.draftBadge}>Draft</span>}
          </div>
          {course.description && <p className={styles.subtitle}>{course.description}</p>}
          {userDoc?.role === "owner" && (
            <Link className={styles.adminLink} href={`/admin/courses/${id}`}>Manage course</Link>
          )}
        </div>

        {totalLessons > 0 && (
          <div className={styles.progressCard}>
            <div className={styles.progressRow}>
              <span className={styles.progressLabel}>
                {doneCount} of {totalLessons} lessons complete
              </span>
              <span className={styles.progressPct}>{pct}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {modules.length === 0 ? (
          <p className={styles.empty}>
            This course doesn&apos;t have any lessons yet.
            {userDoc?.role === "owner" && (
              <> <Link className={styles.link} href={`/admin/courses/${id}`}>Add content</Link>.</>
            )}
          </p>
        ) : (
          <div className={styles.moduleList}>
            {modules.map((module, index) => {
              const moduleLessons = lessons[module.id] || [];
              return (
                <section key={module.id} className={styles.module}>
                  <h2 className={styles.moduleTitle}>
                    <span className={styles.moduleIndex}>{index + 1}</span>
                    {module.title}
                  </h2>
                  <div className={styles.lessonList}>
                    {moduleLessons.map((lesson) => {
                      const isDone = completed.has(lesson.id);
                      const locked = isLocked(lesson);
                      const href = locked ? `#` : `/courses/${id}/lessons/${lesson.id}`;
                      return (
                        <Link
                          key={lesson.id}
                          href={href}
                          aria-disabled={locked}
                          className={locked ? `${styles.lesson} ${styles.lessonLocked}` : styles.lesson}
                        >
                          <span className={isDone ? `${styles.lessonMark} ${styles.lessonDone}` : styles.lessonMark}>
                            {locked ? "🔒" : isDone ? "✓" : "•"}
                          </span>
                          <span className={styles.lessonTitle}>{lesson.title}</span>
                          {lesson.kind === "video" && (
                            <span className={styles.lessonKind}>▶ video</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
