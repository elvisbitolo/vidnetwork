"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import styles from "../chat.module.css";

function timeLabel(millis) {
  if (!millis) return "";
  return new Date(millis).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Thread({ conversationId, uid, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
      limit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
    });
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.threadBody}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet — say hello!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === uid;
          const millis =
            msg.createdAt?.toMillis?.() ||
            msg.createdAt?.seconds * 1000 ||
            Number(msg.createdAt) ||
            0;
          return (
            <div
              key={msg.id}
              className={isMine ? `${styles.bubble} ${styles.mine}` : styles.bubble}
            >
              {!isMine && <p className={styles.bubbleName}>{msg.senderName}</p>}
              <p className={styles.bubbleText}>{msg.text}</p>
              <p className={styles.bubbleTime}>{timeLabel(millis)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className={styles.composer} onSubmit={handleSend}>
        <input
          className={styles.input}
          type="text"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button className={styles.send} type="submit" disabled={!text.trim() || busy}>
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
