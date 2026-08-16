"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const PLACEHOLDERS = {
  new_member: [
    { token: "memberName", label: "Member's name" },
    { token: "memberEmail", label: "Member's email" },
  ],
  new_post: [
    { token: "authorName", label: "Author's name" },
    { token: "postText", label: "Post text" },
  ],
  event_rsvp: [
    { token: "rsvpName", label: "Member's name" },
    { token: "eventTitle", label: "Event title" },
  ],
  purchase: [
    { token: "memberName", label: "Member's name" },
    { token: "memberEmail", label: "Member's email" },
    { token: "itemName", label: "What they bought" },
    { token: "targetType", label: "Item type" },
    { token: "spaceId", label: "Space ID" },
  ],
  checklist_complete: [
    { token: "memberName", label: "Member's name" },
    { token: "memberEmail", label: "Member's email" },
  ],
};

export default function AdminAutomationsPage() {
  const router = useRouter();
  const [role, setRole] = useState("member");
  const [automations, setAutomations] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("new_member");
  const [action, setAction] = useState("send_email");
  const [toMode, setToMode] = useState("owner");
  const [customEmail, setCustomEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState(5);
  const [spaceId, setSpaceId] = useState("");

  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const messageRef = useRef(null);

  const loadAutomations = useCallback(async () => {
    const res = await fetch("/api/admin/automations");
    if (res.ok) setAutomations((await res.json()).automations);
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
      loadAutomations();
      loadSpaces();
    });
    return unsub;
  }, [router, loadAutomations, loadSpaces]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setRole(data.role));
  }, []);

  function insertPlaceholder(field, token) {
    const el =
      field === "subject"
        ? subjectRef.current
        : field === "body"
        ? bodyRef.current
        : messageRef.current;
    if (!el) return;
    const placeholder = `{{${token}}}`;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const setter = field === "subject" ? setSubject : field === "body" ? setBody : setMessage;
    setter(el.value.slice(0, start) + placeholder + el.value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + placeholder.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function renderChips(field) {
    const items = PLACEHOLDERS[trigger] || [];
    if (items.length === 0) return null;
    return (
      <div className={styles.checkRow}>
        <span className={styles.subtitle} style={{ margin: 0 }}>Insert: </span>
        {items.map((item) => (
          <button
            key={item.token}
            type="button"
            className={styles.toggle}
            onClick={() => insertPlaceholder(field, item.token)}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const to = toMode === "owner" ? "owner" : customEmail.trim();
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
      setCustomEmail("");
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
                <select
                  id="a-to"
                  className={styles.select}
                  value={toMode}
                  onChange={(e) => setToMode(e.target.value)}
                >
                  <option value="owner">The community owner</option>
                  <option value="custom">A specific email address</option>
                </select>
              </div>
              {toMode === "custom" && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="a-custom-email">Email address</label>
                  <input
                    id="a-custom-email"
                    className={styles.input}
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="someone@example.com"
                    required
                  />
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="a-subject">Subject</label>
                <input
                  id="a-subject"
                  ref={subjectRef}
                  className={styles.input}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Welcome aboard!"
                />
                {renderChips("subject")}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="a-body">Email body</label>
                <textarea
                  id="a-body"
                  ref={bodyRef}
                  className={styles.textarea}
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi, thanks for joining the community."
                />
                {renderChips("body")}
              </div>
            </>
          )}

          {action === "create_notification" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="a-message">Notification message</label>
              <input
                id="a-message"
                ref={messageRef}
                className={styles.input}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Welcome aboard!"
              />
              {renderChips("message")}
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
              <label className={styles.label} htmlFor="a-space">Space to add the member to</label>
              <select
                id="a-space"
                className={styles.select}
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
              >
                <option value="">
                  {trigger === "purchase"
                    ? "The space they just bought (recommended)"
                    : "Choose a space…"}
                </option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
              <p className={styles.subtitle}>
                {trigger === "purchase"
                  ? "With the “A member buys access” trigger, leaving this empty adds buyers to the space they paid for."
                  : "The member is added to this space as a member."}
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
