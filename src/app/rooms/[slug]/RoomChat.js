"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  MessageCircle,
  Smile,
  Paperclip,
  SendHorizontal,
  Heart,
  Reply,
  AtSign,
  MessageSquareReply,
  Pin,
} from "lucide-react";
import { useRoomData } from "./RoomDataProvider";
import styles from "./room.module.css";

const EMOJI = ["❤️", "👍", "👏", "🎉", "😂", "🙌"];

function ChatAvatar({ name, avatar }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.chatAvatarImg} src={avatar} alt="" />;
  }
  return <span className={styles.chatAvatar}>{(name || "?").charAt(0).toUpperCase()}</span>;
}

function MessageRow({ msg, hostId, onReply, onReact }) {
  const t = useTranslations("rooms");
  const isHost = msg.role === "host" || msg.userId === hostId;
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={msg.isLocal ? `${styles.chatRow} ${styles.chatRowMe}` : styles.chatRow}>
      <ChatAvatar name={msg.userName} avatar={msg.userAvatar} />
      <div className={styles.chatRowBody}>
        <div className={styles.chatRowMeta}>
          <span className={styles.chatRowName}>{msg.userName}</span>
          {isHost && <span className={styles.chatBadgeHost}>{t("host")}</span>}
          <span className={styles.chatRowTime}>{time}</span>
        </div>
        {msg.replyTo && (
          <span className={styles.chatReplyTo}>
            <MessageSquareReply size={12} />
            {t("replyingTo", { name: "" })}
          </span>
        )}
        <div className={msg.isLocal ? `${styles.chatBubble} ${styles.chatBubbleMe}` : styles.chatBubble}>
          <p className={styles.chatText}>
            {msg.mentions && msg.mentions.length > 0 && (
              <span className={styles.chatMention}>
                <AtSign size={12} />@
              </span>
            )}
            {msg.text}
          </p>
          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className={styles.chatReactions}>
              {Object.entries(msg.reactions).map(([emoji, count]) => (
                <span key={emoji} className={styles.chatReactionChip}>
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className={styles.chatActions}>
          <button type="button" className={styles.chatActionBtn} title={t("react")} onClick={() => onReact && onReact("❤️")}>
            <Heart size={13} />
          </button>
          <button type="button" className={styles.chatActionBtn} title={t("reply")} onClick={() => onReply && onReply(msg)}>
            <Reply size={13} />
          </button>
          {isHost && (
            <button type="button" className={styles.chatActionBtn} title={t("pin")}>
              <Pin size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoomChat({ hostId }) {
  const t = useTranslations("rooms");
  const { messages, sendChatMessage, sendReaction } = useRoomData();
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const listRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit() {
    if (!draft.trim()) return;
    sendChatMessage(draft, replyingTo ? { text: replyingTo.text, from: replyingTo.userName } : null, []);
    setDraft("");
    setReplyingTo(null);
    setShowEmoji(false);
  }

  function handleMention() {
    const val = draft + "@";
    setDraft(val);
    composerRef.current && composerRef.current.focus();
  }

  return (
    <div className={styles.chat}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <MessageCircle size={17} className={styles.chatHeaderIcon} />
          <span className={styles.chatHeaderTitle}>{t("liveChat")}</span>
          <span className={styles.chatHeaderCount}>
            {t("chatPeople", { count: messages.length })}
          </span>
        </div>
        <span className={styles.chatHeaderPinned}>
          <Pin size={13} /> {t("pinnedMessage")}
        </span>
      </div>

      <div className={styles.chatMessages} ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <div className={styles.chatEmpty}>{t("beFirst")}</div>
        )}
        {messages.map((m) => (
          <MessageRow
            key={m.id}
            msg={m}
            hostId={hostId}
            onReply={(msg) => setReplyingTo(msg)}
            onReact={() => sendReaction("❤️")}
          />
        ))}
      </div>

      {replyingTo && (
        <div className={styles.replyingBar}>
          <MessageSquareReply size={13} />
          <span>
            {t("replyingTo", { name: replyingTo.from || "" })}
          </span>
          <button type="button" className={styles.replyingClose} onClick={() => setReplyingTo(null)} aria-label={t("cancel")}>
            ×
          </button>
        </div>
      )}

      <div className={styles.composer}>
        {showEmoji && (
          <div className={styles.emojiPanel}>
            {EMOJI.map((e) => (
              <button key={e} type="button" className={styles.emojiBtn} onClick={() => { sendReaction(e); setShowEmoji(false); }}>
                {e}
              </button>
            ))}
          </div>
        )}
        <button type="button" className={styles.composerIconBtn} title={t("emoji")} onClick={() => setShowEmoji((v) => !v)}>
          <Smile size={18} />
        </button>
        <button type="button" className={styles.composerIconBtn} title={t("attach")}>
          <Paperclip size={18} />
        </button>
        <button type="button" className={styles.composerIconBtn} title={t("mention")} onClick={handleMention}>
          <AtSign size={18} />
        </button>
        <input
          ref={composerRef}
          className={styles.composerInput}
          placeholder={t("writeMessage")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          aria-label={t("writeMessage")}
        />
        <button type="button" className={styles.composerSend} onClick={submit} title={t("send")}>
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
