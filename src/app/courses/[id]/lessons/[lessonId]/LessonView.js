"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./lesson.module.css";

function VideoPlayer({ url }) {
  const [error, setError] = useState("");

  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (ytMatch) {
    return (
      <div className={styles.videoWrap}>
        <iframe
          className={styles.video}
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Lesson video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className={styles.videoWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!error ? (
        <video
          className={styles.video}
          controls
          preload="metadata"
          src={url}
          onError={() => setError("Couldn't play this video — the link may be invalid.")}
        />
      ) : (
        <p className={styles.error}>{error}</p>
      )}
    </div>
  );
}

export default function LessonView({ courseId, lesson, completed, nextLessonId, isOwner }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, completed: !completed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update progress");
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.lesson}>
      <h1 className={styles.title}>{lesson.title}</h1>
      {lesson.kind === "video" && lesson.videoUrl && <VideoPlayer url={lesson.videoUrl} />}
      {error && <p className={styles.error}>{error}</p>}
      {lesson.body ? (
        <div className={styles.body}>
          {lesson.body.split("\n").map((line, i) =>
            line.trim() ? <p key={i}>{line}</p> : <br key={i} />
          )}
        </div>
      ) : (
        !lesson.videoUrl && <p className={styles.emptyBody}>No content in this lesson yet.</p>
      )}
      <div className={styles.actions}>
        <button
          className={completed ? `${styles.toggle} ${styles.toggleActive}` : styles.toggle}
          onClick={handleToggle}
          disabled={busy}
        >
          {busy ? "Saving…" : completed ? "Mark as not complete" : "Mark as complete"}
        </button>
        {nextLessonId && (
          <Link
            className={styles.next}
            href={`/courses/${courseId}/lessons/${nextLessonId}`}
          >
            Next lesson →
          </Link>
        )}
      </div>
    </article>
  );
}
