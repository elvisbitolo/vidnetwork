"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./spaces.module.css";

export default function SpaceInvite({ spaceId, allMembers, memberIds, isOwner }) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const available = allMembers.filter((member) => !memberIds.includes(member.id));

  async function handleAdd(e) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add member");
      setSelected("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(userId) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/spaces/${spaceId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to remove member");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) return null;

  return (
    <div className={styles.invite}>
      {error && <p className={styles.error}>{error}</p>}
      {available.length > 0 ? (
        <form className={styles.inviteForm} onSubmit={handleAdd}>
          <select
            className={styles.inviteSelect}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Add a member…</option>
            {available.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <button className={styles.inviteButton} type="submit" disabled={!selected || busy}>
            {busy ? "Adding…" : "Add"}
          </button>
        </form>
      ) : (
        <p className={styles.notMember}>Everyone in the community is already in this space.</p>
      )}
      <div className={styles.removeList}>
        {memberIds.map((id) => (
          <button
            key={id}
            className={styles.removeMember}
            onClick={() => handleRemove(id)}
            disabled={busy}
          >
            Remove member #{id.slice(0, 6)}
          </button>
        ))}
      </div>
    </div>
  );
}
