"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import Nav from "@/components/Nav";
import styles from "../questions/questions.module.css";

const TRIGGERS = {
  new_member: "New member signs up",
  new_post: "A new post is published",
  event_rsvp: "A member RSVPs to an event",
  purchase: "A member buys access (event, course or space)",
  checklist_complete: "A member finishes the Welcome Checklist",
};

const ACTIONS = {
  send_email: "Send an email",
  create_notification: "Create a notification",
  award_points: "Award points",
  add_member_to_space: "Add member to a space",
};

export default function AdminAutomationsPage() {
  const router = useRouter();
  const [role, setRole] = useState("member");
  const [automations, setAutomations] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("new_member");
  const [action, setAction] = useState("send_email");
  const [to, setTo] = useState("owner");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState(5);
  const [spaceId, setSpaceId] = useState("");

  const loadAutomations = useCallback(async () => {
    const res = await fetch("/api/admin/automations");
    if (res.ok) setAutomations((await res.json()).automations);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      loadAutomations();
    });
    return unsub;
  }, [router, loadAutomations]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const config =
        action === "send_email"
          ? { to, subject, body }
          : action === "create_notification"
          ? { to: "owner", message, href: "/dashboard" }
          : action === "award_points"
          ? { points }
          : { spaceId };
      const res = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, trigger, action, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create automation");
      setName("");
      setSubject("");
      setBody("");
      setMessage("");
      setSpaceId("");
      await loadAutomations();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(automation) {
    setError("");
    try {
      const res = await fetch(`/api/admin/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !automation.active }),
      });
      if (!res.ok) throw new Error("Could not update automation");
      await loadAutomations();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      const res = await fetch(`/api/admin/automations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete automation");
      await loadAutomations();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
      <Nav role={role}>
      <div className={styles.container}>
        <h1 className={styles.title}>Automations</h1>
        <p className={styles.subtitle}>
          Trigger an action when something happens — welcome emails, new-member
          notifications, or bonus points.
        </p>
        {error && <p className={styles.error}>{error}</p>}

        <form className={styles.form} onSubmit={handleCreate}>
          <h2 className={styles.formTitle}>New automation</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="a-name">Name</label>
            <input
              id="a-name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome new members"
              required
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="a-trigger">When</label>
              <select
                id="a-trigger"
                className={styles.select}
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
              >
                {Object.entries(TRIGGERS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="a-action">Then</label>
              <select
                id="a-action"
                className={styles.select}
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {Object.entries(ACTIONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {action === "send_email" && (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="a-to">Send to</label>
                <input
                  id="a-to"
                  className={styles.input}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="owner (or an email address)"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="a-subject">Subject</label>
                <input
                  id="a-subject"
                  className={styles.input}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. {{memberName}} just joined"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="a-body">Email body</label>
                <textarea
                  id="a-body"
                  className={styles.textarea}
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi team — {{memberName}} just joined the community."
                />
              </div>
              <p className={styles.subtitle}>
                Placeholders: {"{{memberName}}, {{memberEmail}}, {{authorName}}, {{postText}}, {{rsvpName}}, {{eventTitle}}, {{itemName}}, {{targetType}}, {{spaceId}}"}
              </p>
            </>
          )}

          {action === "create_notification" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="a-message">Notification message</label>
              <input
                id="a-message"
                className={styles.input}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. {{memberName}} just joined"
              />
            </div>
          )}

          {action === "award_points" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="a-points">Points to award</label>
              <input
                id="a-points"
                className={styles.input}
                type="number"
                min={0}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </div>
          )}

          {action === "add_member_to_space" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="a-space">
                Space ID to add the member to
              </label>
              <input
                id="a-space"
                className={styles.input}
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                placeholder="The Firestore id of the space"
              />
              <p className={styles.subtitle}>
                Use the {`{{spaceId}}`} placeholder or a purchase trigger to add buyers to the
                space they paid for.
              </p>
            </div>
          )}

          <button className={styles.submit} disabled={busy}>
            {busy ? "Saving…" : "Create automation"}
          </button>
        </form>

        <h2 className={styles.listTitle}>Automations</h2>
        {automations.length === 0 ? (
          <p className={styles.empty}>No automations yet.</p>
        ) : (
          <div className={styles.list}>
            {automations.map((automation) => (
              <div key={automation.id} className={styles.item}>
                <div>
                  <p className={styles.itemName}>{automation.name}</p>
                  <p className={styles.itemMeta}>
                    {TRIGGERS[automation.trigger] || automation.trigger} →{" "}
                    {ACTIONS[automation.action] || automation.action}
                  </p>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={automation.active ? styles.toggleOn : styles.toggle}
                    onClick={() => handleToggle(automation)}
                  >
                    {automation.active ? "Pause" : "Resume"}
                  </button>
                  <button className={styles.delete} onClick={() => handleDelete(automation.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
</Nav>
  );
}
