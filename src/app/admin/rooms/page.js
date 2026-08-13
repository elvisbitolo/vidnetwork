"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "./admin.module.css";

export default function AdminRoomsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [groupId, setGroupId] = useState("");
  const [kind, setKind] = useState("standard");
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRooms = useCallback(async () => {
    const res = await fetch("/api/rooms");
    if (res.ok) setRooms((await res.json()).rooms);
  }, []);

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups((await res.json()).groups);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      loadRooms();
      loadGroups();
    });
    return unsub;
  }, [router, loadRooms, loadGroups]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, maxParticipants, groupId, kind }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Failed to create room");
      return;
    }
    setName("");
    setDescription("");
    setMaxParticipants(20);
    setGroupId("");
    setKind("standard");
    await loadRooms();
  }

  async function handleDelete(id) {
    await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    await loadRooms();
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
        <h1 className={styles.title}>Manage rooms</h1>

        <form className={styles.form} onSubmit={handleCreate}>
          <h2 className={styles.formTitle}>Create a room</h2>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">Room name</label>
            <input
              id="name"
              className={styles.input}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label className={styles.label} htmlFor="max">Max participants</label>
            <input
              id="max"
              className={styles.input}
              type="number"
              min={2}
              max={100}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="group">Group (optional)</label>
            <select
              id="group"
              className={styles.input}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Main community</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="kind">Room type</label>
            <select
              id="kind"
              className={styles.input}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="standard">Video chat (everyone speaks)</option>
              <option value="broadcast">Broadcast (host speaks, members watch)</option>
            </select>
          </div>
          <button className={styles.submit} type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create room"}
          </button>
        </form>

        <h2 className={styles.listTitle}>Existing rooms</h2>
        {rooms.length === 0 ? (
          <p className={styles.empty}>No rooms yet.</p>
        ) : (
          <div className={styles.list}>
            {rooms.map((room) => (
              <div key={room.id} className={styles.item}>
                <div>
                  <p className={styles.itemName}>{room.name}</p>
                  <p className={styles.itemMeta}>
                    {room.status} · {room.maxParticipants} max · {room.slug}
                  </p>
                </div>
                <button className={styles.delete} onClick={() => handleDelete(room.id)}>
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
