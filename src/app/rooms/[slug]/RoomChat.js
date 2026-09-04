"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  MessageCircle,
  Smile,
  Paperclip,
  SendHorizontal,
  Reply,
  AtSign,
  MessageSquareReply,
  Pin,
  Trash2,
  ChevronUp,
  Loader2,
  Clock,
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

function ReactionChip({ emoji, userIds, onToggle, active }) {
  return (
    <button
      type="button"
      className={active ? `${styles.chatReactionChip} ${styles.chatReactionChipActive}` : styles.chatReactionChip}
      onClick={onToggle}
      aria-pressed={active}
    >
      {emoji} {userIds.length}
    </button>
  );
}

function MessageRow({ msg, hostId, currentUserId, canModerate, onToggleReaction, onReply, onReact }) {
  const t = useTranslations("rooms");
  const isHostUser = msg.role === "host" || (msg.userId && msg.userId === hostId);
  const isMe = msg.userId === currentUserId;
  const canModerateMsg = canModerate;
  const canDelete = canModerateMsg || isMe;
  const canPin = canModerateMsg;
  const { togglePin, deleteMessage } = useRoomData();
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={
        isMe ? `${styles.chatRow} ${styles.chatRowMe}` : styles.chatRow
      }
    >
      <ChatAvatar name={msg.userName} avatar={msg.userAvatar} />
      <div className={styles.chatRowBody}>
        <div className={styles.chatRowMeta}>
          <span className={styles.chatRowName}>{msg.userName}</span>
          {isHostUser && <span className={styles.chatBadgeHost}>{t("host")}</span>}
          {msg.role === "moderator" && !isHostUser && (
            <span className={styles.chatBadgeMod}>{t("moderator")}</span>
          )}
          <span className={styles.chatRowTime}>{time}</span>
        </div>
        {msg.deleted ? (
          <div className={msg.isLocal ? `${styles.chatBubble} ${styles.chatBubbleMe}` : styles.chatBubble}>
            <p className={styles.chatDeleted}>{t("messageDeleted")}</p>
          </div>
        ) : (
          <>
            {msg.replyTo && (
              <span className={styles.chatReplyTo}>
                <MessageSquareReply size={12} />
                {t("replyingTo", { name: msg.replyTo.from || "" })}
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
                {msg.isLocal && msg.failed && (
                  <span className={styles.chatFailed} title={t("sendFailed")}>
                    <Clock size={12} />
                  </span>
                )}
              </p>
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className={styles.chatReactions}>
                  {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                    <ReactionChip
                      key={emoji}
                      emoji={emoji}
                      userIds={userIds}
                      active={(userIds || []).includes(currentUserId)}
                      onToggle={() => onToggleReaction && onToggleReaction(msg.id, emoji)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className={styles.chatActions}>
              <button
                type="button"
                className={styles.chatActionBtn}
                title={t("react")}
                onClick={() => onReact && onReact(msg.id, "❤️")}
              >
                <Smile size={13} />
              </button>
              <button
                type="button"
                className={styles.chatActionBtn}
                title={t("reply")}
                onClick={() => onReply && onReply(msg)}
              >
                <Reply size={13} />
              </button>
              {canPin && (
                <button
                  type="button"
                  className={msg.pinned ? `${styles.chatActionBtn} ${styles.chatActionOn}` : styles.chatActionBtn}
                  title={t("pin")}
                  onClick={() => togglePin && togglePin(msg.id)}
                >
                  <Pin size={13} />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className={`${styles.chatActionBtn} ${styles.chatActionDanger}`}
                  title={t("delete")}
                  onClick={() => deleteMessage && deleteMessage(msg.id)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RoomChat({ hostId, currentUserId }) {
  const t = useTranslations("rooms");
  const {
    messages,
    loadingHistory,
    hasMore,
    loadEarlier,
    chatError,
    canModerate,
    sendChatMessage,
    toggleReaction,
    sendReaction,
  } = useRoomData();
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef(null);
  const composerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const prevLenRef = useRef(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      nearBottomRef.current = distance < 80;
      if (nearBottomRef.current) setUnread(0);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setUnread(0);
    } else if (messages.length > prevLenRef.current) {
      setUnread((u) => u + (messages.length - prevLenRef.current));
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  function scrollToBottom() {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      nearBottomRef.current = true;
      setUnread(0);
    }
  }

  function submit() {
    if (!draft.trim()) return;
    sendChatMessage(
      draft,
      replyingTo ? { id: replyingTo.id, text: replyingTo.text, from: replyingTo.userName } : null,
      []
    );
    setDraft("");
    setReplyingTo(null);
    scrollToBottom();
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
        {loadingHistory ? (
          <div className={styles.chatEmpty}>
            <Loader2 size={16} className={styles.loadingSpin} />
            <span>{t("loadingChat")}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.chatEmpty}>{t("beFirst")}</div>
        ) : (
          <>
            {hasMore && (
              <button type="button" className={styles.loadEarlier} onClick={loadEarlier}>
                <ChevronUp size={14} /> {t("loadEarlier")}
              </button>
            )}
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                msg={m}
                hostId={hostId}
                currentUserId={currentUserId}
                canModerate={canModerate}
                onToggleReaction={toggleReaction}
                onReact={(messageId, emoji) => toggleReaction(messageId, emoji)}
                onReply={(msg) => {
                  setReplyingTo(msg);
                  composerRef.current && composerRef.current.focus();
                }}
              />
            ))}
          </>
        )}
      </div>

      {unread > 0 && (
        <button type="button" className={styles.unreadPill} onClick={scrollToBottom}>
          {t("newMessages", { count: unread })} <ChevronUp size={13} />
        </button>
      )}

      {replyingTo && (
        <div className={styles.replyingBar}>
          <MessageSquareReply size={13} />
          <span>
            {t("replyingTo", { name: replyingTo.userName || "" })}
          </span>
          <button
            type="button"
            className={styles.replyingClose}
            onClick={() => setReplyingTo(null)}
            aria-label={t("cancel")}
          >
            ×
          </button>
        </div>
      )}

      {chatError && <div className={styles.chatError}>{chatError}</div>}

      <div className={styles.composer}>
        {showEmoji && (
          <div className={styles.emojiPanel}>
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                className={styles.emojiBtn}
                onClick={() => {
                  sendReaction(e);
                  setShowEmoji(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={styles.composerIconBtn}
          title={t("emoji")}
          onClick={() => setShowEmoji((v) => !v)}
        >
          <Smile size={18} />
        </button>
        <button type="button" className={styles.composerIconBtn} title={t("attach")} onClick={() => {}}>
          <Paperclip size={18} />
        </button>
        <button
          type="button"
          className={styles.composerIconBtn}
          title={t("mention")}
          onClick={handleMention}
        >
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
        <button
          type="button"
          className={styles.composerSend}
          onClick={submit}
          title={t("send")}
          disabled={!draft.trim()}
        >
          <SendHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
