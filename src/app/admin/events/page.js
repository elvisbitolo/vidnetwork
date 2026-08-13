"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "../rooms/admin.module.css";

export default function AdminEventsPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [recurFreq, setRecurFreq] = useState("");
  const [recurCount, setRecurCount] = useState(1);
  const [events, setEvents] = useState([]);
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) setEvents((await res.json()).events);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      loadEvents();
    });
    return unsub;
  }, [router, loadEvents]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : null,
        roomSlug,
        capacity,
        recurrence: recurFreq ? { freq: recurFreq, interval: 1, count: Number(recurCount) || 2 } : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to create event");
      return;
    }
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setRoomSlug("");
    setCapacity(0);
    setRecurFreq("");
    setRecurCount(1);
    await loadEvents();
  }

  async function handleDelete(id) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    await loadEvents();
  }

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  return (
    <main className={styles.page}>
      <Nav role={role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Manage events</h1>

        <form className={styles.form} onSubmit={handleCreate}>
          <h2 className={styles.formTitle}>Create an event</h2>
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
            <label className={styles.label} htmlFor="startTime">Starts</label>
            <input
              id="startTime"
              className={styles.input}
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endTime">Ends (optional)</label>
            <input
              id="endTime"
              className={styles.input}
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="roomSlug">Room slug (optional)</label>
            <input
              id="roomSlug"
              className={styles.input}
              type="text"
              placeholder="e.g. morning-coffee"
              value={roomSlug}
              onChange={(e) => setRoomSlug(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="capacity">Capacity (optional)</label>
            <input
              id="capacity"
              className={styles.input}
              type="number"
              min={0}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="recurFreq">Repeat (optional)</label>
            <div style={{ display: "flex", gap: 12 }}>
              <select
                id="recurFreq"
                className={styles.input}
                value={recurFreq}
                onChange={(e) => setRecurFreq(e.target.value)}
              >
                <option value="">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <input
                className={styles.input}
                type="number"
                min={1}
                max={52}
                placeholder="Times"
                title="Number of occurrences"
                value={recurCount}
                disabled={!recurFreq}
                onChange={(e) => setRecurCount(e.target.value)}
              />
            </div>
          </div>
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create event"}
          </button>
        </form>

        <h2 className={styles.listTitle}>Existing events</h2>
        {events.length === 0 ? (
          <p className={styles.empty}>No events yet.</p>
        ) : (
          <div className={styles.list}>
            {events.map((event) => (
              <div key={event.id} className={styles.item}>
                <div>
                  <p className={styles.itemName}>{event.title}</p>
                  <p className={styles.itemMeta}>
                    {new Date(event.startTime.toMillis ? event.startTime.toMillis() : event.startTime).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {event.roomSlug ? ` · ${event.roomSlug}` : ""}
                  </p>
                </div>
                <button className={styles.delete} onClick={() => handleDelete(event.id)}>
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
