import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { getCourse, getLesson, getNextLessonId, getProgress, canAccessCourse } from "@/lib/server/courses";
import { getPurchasedKeys, canAccessPaid } from "@/lib/server/purchases";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import LessonView from "./LessonView";
import styles from "./lesson.module.css";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }) {
  const { id: courseId, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const course = await getCourse(courseId);
  const lesson = await getLesson(lessonId);
  if (!course || !lesson || lesson.courseId !== courseId) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Lesson not found</h1>
          <Link className={styles.link} href="/courses">Back to courses</Link>
        </div>
      </main>
    );
  }
  if (course.status !== "published" && userDoc?.role !== "owner") {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Course not published</h1>
          <Link className={styles.link} href="/courses">Back to courses</Link>
        </div>
      </main>
    );
  }

  const isOwner = userDoc?.role === "owner";
  const tier = sub.tier || "standard";
  if (!isOwner && !canAccessCourse(course, tier)) {
    return (
      <main className={styles.page}>
        <Nav role={userDoc?.role} />
        <div className={styles.container}>
          <h1 className={styles.title}>Membership upgrade required</h1>
          <p className={styles.lockedText}>
            This course requires the Premium membership tier. Upgrade to unlock it.
          </p>
          <Link className={styles.link} href="/pricing">See membership options</Link>
        </div>
      </main>
    );
  }

  if (!isOwner) {
    const purchasedKeys = await getPurchasedKeys(user.uid);
    if (!canAccessPaid("course", course, purchasedKeys)) {
      return (
        <main className={styles.page}>
          <Nav role={userDoc?.role} />
          <div className={styles.container}>
            <h1 className={styles.title}>Purchase required</h1>
            <p className={styles.lockedText}>
              This course is sold separately. Buy it to unlock the lessons.
            </p>
            <Link className={styles.link} href={`/courses/${courseId}`}>Back to course</Link>
          </div>
        </main>
      );
    }
  }

  const releaseAt = lesson.releaseAt ? new Date(lesson.releaseAt.toMillis ? lesson.releaseAt.toMillis() : lesson.releaseAt) : null;
  // eslint-disable-next-line react-hooks/purity
  const locked = !isOwner && releaseAt && releaseAt.getTime() > Date.now();

  if (locked) {
    return (
      <main className={styles.page}>
        <Nav role={userDoc?.role} />
        <div className={styles.container}>
          <BackButton fallback={`/courses/${courseId}`} label="Back to course" />
          <div className={styles.locked}>
            <h1 className={styles.title}>🔒 Locked</h1>
            <p className={styles.lockedText}>
              This lesson unlocks on{" "}
              {releaseAt.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
              . Check back then.
            </p>
            <Link className={styles.link} href={`/courses/${courseId}`}>Back to course</Link>
          </div>
        </div>
      </main>
    );
  }

  const progress = await getProgress(courseId, user.uid);
  const completed = (progress.completedLessons || []).includes(lessonId);
  const nextLessonId = await getNextLessonId(courseId, lesson);

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <BackButton fallback={`/courses/${courseId}`} label="Back to course" />
        <p className={styles.breadcrumb}>
          <Link className={styles.link} href="/courses">Courses</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link className={styles.link} href={`/courses/${courseId}`}>{course.title}</Link>
        </p>
        <LessonView
          courseId={courseId}
          lesson={lesson}
          completed={completed}
          nextLessonId={nextLessonId}
          isOwner={isOwner}
        />
      </div>
    </main>
  );
}
