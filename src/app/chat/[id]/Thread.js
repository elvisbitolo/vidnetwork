"use client";

import { useState, useEffect, useRef } from "react";
import styles from "../chat.module.css";

const POLL_INTERVAL_MS = 4000;

const MAX_FILE_RAW = 450 * 1024;
const MAX_IMAGE_RAW = 8 * 1024 * 1024;
const MAX_DATA_URL = 700_000;

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎",
  "🤩", "🥳", "😇", "🙂", "😉", "😅", "🤗", "🤔",
  "🙃", "😴", "🤤", "😋", "😜", "🥰", "😭", "😤",
  "😡", "🤯", "😱", "🥶", "🤒", "🤕", "👏", "🙌",
  "👍", "👎", "👊", "✊", "🤝", "💪", "🙏", "💅",
  "👋", "🫶", "❤️", "💜", "💛", "💚", "💙", "🔥",
  "✨", "🎉", "🎂", "🎁", "⭐", "🌈", "🌹", "🍀",
  "🍕", "☕", "🚀", "💯",
];

function timeLabel(millis) {
  if (!millis) return "";
  return new Date(millis).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resizeImage(file, maxSize = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height, 1);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("Couldn't read that image"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export default function Thread({ conversationId, uid, initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachError, setAttachError] = useState("");
  const [sendError, setSendError] = useState("");
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    let active = true;
    let timer;

    async function load() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`);
        if (active && res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
        fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
      } catch {
        // transient network error — the next poll will retry
      }
    }

    load();
    timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    function onPointerDown(e) {
      if (showEmoji && emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showEmoji]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError("");
    try {
      let dataUrl;
      if (file.type.startsWith("image/")) {
        if (file.size > MAX_IMAGE_RAW) {
          setAttachError("Image must be 8 MB or smaller.");
          return;
        }
        dataUrl = await resizeImage(file);
      } else {
        if (file.size > MAX_FILE_RAW) {
          setAttachError("Documents must be 450 KB or smaller right now (storage is being set up).");
          return;
        }
        dataUrl = await fileToDataUrl(file);
      }
      if (dataUrl.length > MAX_DATA_URL) {
        setAttachError("That file is too large to attach yet — try a smaller photo or file.");
        return;
      }
      setAttachment({
        name: file.name.slice(0, 120),
        mime: file.type || "application/octet-stream",
        kind: file.type.startsWith("image/") ? "image" : "file",
        size: file.size,
        dataUrl,
      });
    } catch (err) {
      setAttachError(err.message || "Couldn't attach that file.");
    }
  }

  function insertEmoji(emoji) {
    const el = inputRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || busy) return;
    setBusy(true);
    setSendError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          attachment,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send");
      }
      setText("");
      setAttachment(null);
      setShowEmoji(false);
    } catch (err) {
      setSendError(err.message || "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
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
              {msg.text && <p className={styles.bubbleText}>{msg.text}</p>}
              {msg.attachment?.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.bubbleImage}
                  src={msg.attachment.dataUrl}
                  alt={msg.attachment.name || "Shared image"}
                />
              )}
              {msg.attachment && msg.attachment.kind !== "image" && (
                <a
                  className={styles.fileChip}
                  href={msg.attachment.dataUrl}
                  download={msg.attachment.name}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={styles.fileIcon}>📎</span>
                  <span className={styles.fileMeta}>
                    <span className={styles.fileName}>{msg.attachment.name}</span>
                    <span className={styles.fileSize}>
                      {formatBytes(msg.attachment.size)}
                    </span>
                  </span>
                  <span className={styles.fileDownload}>Download</span>
                </a>
              )}
              <p className={styles.bubbleTime}>{timeLabel(millis)}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {attachError && <p className={styles.attachError}>{attachError}</p>}
      {sendError && <p className={styles.attachError}>{sendError}</p>}

      {attachment && (
        <div className={styles.attachPreview}>
          <span className={styles.attachPreviewIcon}>
            {attachment.kind === "image" ? "🖼️" : "📎"}
          </span>
          <span className={styles.attachPreviewName}>{attachment.name}</span>
          <button
            type="button"
            className={styles.attachRemove}
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      <div className={styles.emojiWrap} ref={emojiRef}>
        {showEmoji && (
          <div className={styles.emojiPicker}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.emojiBtn}
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={handleSend}>
        <button
          type="button"
          className={`${styles.iconBtn} ${showEmoji ? styles.iconBtnActive : ""}`}
          onClick={() => setShowEmoji((v) => !v)}
          aria-label="Add emoji"
        >
          😊
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a file"
        >
          📎
        </button>
        <textarea
          ref={inputRef}
          className={styles.input}
          rows={1}
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={2000}
        />
        <button
          className={styles.send}
          type="submit"
          disabled={(!text.trim() && !attachment) || busy}
        >
          {busy ? "Sending…" : "Send"}
        </button>
        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFile}
        />
      </form>
    </div>
  );
}
