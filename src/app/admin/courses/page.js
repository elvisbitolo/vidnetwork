"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "../rooms/admin.module.css";

export default function AdminCoursesPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [spaceId, setSpaceId] = useState("");
  const [courses, setCourses] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCourses = useCallback(async () => {
    const res = await fetch("/api/courses");
    if (res.ok) setCourses((await res.json()).courses);
  }, []);

  const loadSpaces = useCallback(async () => {
    const res = await fetch("/api/spaces?admin=1");
    if (res.ok) setSpaces((await res.json()).spaces);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      loadCourses();
      loadSpaces();
    });
    return unsub;
  }, [router, loadCourses, loadSpaces]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, status, spaceId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to create course");
      return;
    }
    setTitle("");
    setDescription("");
    setStatus("draft");
    setSpaceId("");
    await loadCourses();
  }

  async function handleDelete(id) {
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    await loadCourses();
  }

  return (
    <main className={styles.page}>
      <Nav role={role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Manage courses</h1>

        <form className={styles.form} onSubmit={handleCreate}>
          <h2 className={styles.formTitle}>Create a course</h2>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="title">Title</label>
            <input
              id="title"
              className={styles.input}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">Description</label>
            <textarea
              id="description"
              className={styles.textarea}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="status">Status</label>
            <select
              id="status"
              className={styles.input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="space">Space (optional)</label>
            <select
              id="space"
              className={styles.input}
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
            >
              <option value="">No space</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
            </select>
          </div>
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create course"}
          </button>
        </form>

        <h2 className={styles.listTitle}>Existing courses</h2>
        {courses.length === 0 ? (
          <p className={styles.empty}>No courses yet.</p>
        ) : (
          <div className={styles.list}>
            {courses.map((course) => (
              <div key={course.id} className={styles.item}>
                <div>
                  <p className={styles.itemName}>{course.title}</p>
                  <p className={styles.itemMeta}>
                    {course.status} ·{" "}
                    <Link
                      className={styles.itemMeta}
                      href={`/admin/courses/${course.id}`}
                    >
                      Manage content
                    </Link>
                  </p>
                </div>
                <button className={styles.delete} onClick={() => handleDelete(course.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
