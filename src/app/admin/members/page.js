"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "../rooms/admin.module.css";

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState("member");
  const [error, setError] = useState("");

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/admin/members");
    if (res.ok) setMembers((await res.json()).members);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      loadMembers();
    });
    return unsub;
  }, [router, loadMembers]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  async function updateMember(id, changes) {
    setError("");
    const res = await fetch(`/api/admin/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Update failed");
      return;
    }
    await loadMembers();
  }

  return (
    <main className={styles.page}>
      <Nav role={role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Members</h1>
        {error && <p className={styles.error}>{error}</p>}

        {members.length === 0 ? (
          <p className={styles.empty}>No members yet.</p>
        ) : (
          <div className={styles.list}>
            {members.map((member) => (
              <div key={member.id} className={styles.item}>
                <div>
                  <p className={styles.itemName}>
                    {member.name || "Unnamed"}
                    {member.role === "owner" && (
                      <span style={{ fontSize: 12, color: "#9b9bab", fontWeight: 500 }}> (owner)</span>
                    )}
                  </p>
                  <p className={styles.itemMeta}>
                    {member.email || ""}
                    {member.suspended ? " · suspended" : ""}
                  </p>
                </div>
                {member.role !== "owner" && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      className={styles.input}
                      style={{ width: 130, height: 36, padding: "0 8px" }}
                      value={member.role === "moderator" ? "moderator" : "member"}
                      onChange={(e) => updateMember(member.id, { role: e.target.value })}
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                    </select>
                    <button
                      className={member.suspended ? styles.submit : styles.delete}
                      style={{ height: 36, padding: "0 14px", fontSize: 13 }}
                      onClick={() => updateMember(member.id, { suspended: !member.suspended })}
                    >
                      {member.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
