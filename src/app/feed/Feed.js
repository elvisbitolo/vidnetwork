"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import ReportModal from "./ReportModal";
import MentionInput from "@/components/MentionInput";
import { cardThemeVars } from "@/lib/card-themes";
import styles from "./feed.module.css";

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

function timeAgo(ts) {
  if (!ts) return "";
  const millis = typeof ts.toMillis === "function" ? ts.toMillis() : Number(ts);
  const seconds = Math.floor((Date.now() - millis) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(millis).toLocaleDateString([], { month: "short", day: "numeric" });
}

function renderMentions(text) {
  if (!text) return "";
  const parts = text.split(/(@[a-zA-Z0-9_]{1,30})/g);
  return parts.map((part, index) => {
    const match = part.match(/^@([a-zA-Z0-9_]{1,30})$/);
    if (!match) return renderHashtags(part);
    const username = match[1];
    return (
      <Link key={index} className={styles.mention} href={`/members?search=${encodeURIComponent(username)}`}>
        @{username}
      </Link>
    );
  });
}

function renderHashtags(text) {
  if (!text) return "";
  const parts = text.split(/((?:^|\s)#[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    const match = part.match(/^(\s*)#([a-zA-Z0-9_]+)$/);
    if (!match) return part;
    const [, space, tag] = match;
    return (
      <span key={index}>
        {space}
        <Link className={styles.hashtag} href={`/search?hashtag=${encodeURIComponent(tag)}`}>
          #{tag}
        </Link>
      </span>
    );
  });
}

const POST_KIND_THEMES = {
  poll: "amber",
  question: "indigo",
  win: "emerald",
  article: "violet",
  event: "rose",
  text: "sky",
  default: "slate",
};

function postCardStyle(kind) {
  return cardThemeVars(POST_KIND_THEMES[kind] || POST_KIND_THEMES.default, { light: true });
}

function LikeButton({ postId, likes, uid, disabled }) {
  const [count, setCount] = useState(Object.keys(likes || {}).length);
  const [liked, setLiked] = useState(!!likes?.[uid]);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
        setLiked(data.liked);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`${styles.like} ${liked ? styles.likeActive : ""}`}
      onClick={toggle}
      disabled={busy || disabled}
      title={liked ? "Unlike this post" : "Like this post"}
      aria-pressed={liked}
    >
      <svg
        className={styles.likeIcon}
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.5-1.5 3-3.5 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2 1.5 4 3 5.5l7 7 7-7z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}

function BookmarkButton({ postId, bookmarks, uid, disabled }) {
  const [bookmarked, setBookmarked] = useState(!!bookmarks?.[uid]);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`${styles.bookmark} ${bookmarked ? styles.bookmarkActive : ""}`}
      onClick={toggle}
      disabled={busy || disabled}
      title={bookmarked ? "Remove bookmark" : "Bookmark this post"}
      aria-pressed={bookmarked}
    >
      <svg
        className={styles.bookmarkIcon}
        viewBox="0 0 24 24"
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </button>
  );
}

function PollBlock({ postId, post, uid, disabled }) {
  const [counts, setCounts] = useState(post.pollCounts || {});
  const [total, setTotal] = useState(
    post.pollTotal ?? Object.values(post.pollCounts || {}).reduce((a, b) => a + b, 0)
  );
  const [votedOption, setVotedOption] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));
  const options = post.pollOptions || [];

  useEffect(() => {
    let active = true;
    getDoc(doc(db, "pollVotes", `${postId}_${uid}`))
      .then((snap) => {
        if (active && snap.exists()) {
          setVotedOption(snap.data().option);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [postId, uid]);

  const deadlineMs = post.pollDeadline ? new Date(post.pollDeadline).getTime() : 0;
  const isExpired = deadlineMs > 0 && now >= deadlineMs;
  const countdownText = deadlineMs > 0 && !isExpired && now > 0
    ? (() => {
        const diff = deadlineMs - now;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        if (days > 0) return `${days}d ${hours}h remaining`;
        if (hours > 0) return `${hours}h ${mins}m remaining`;
        return `${mins}m remaining`;
      })()
    : null;

  useEffect(() => {
    if (!deadlineMs || isExpired) return;
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [deadlineMs, isExpired]);

  async function handleVote(option) {
    if (busy || disabled || votedOption !== undefined) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || {});
        setTotal(Object.values(data.counts || {}).reduce((a, b) => a + b, 0));
        setVotedOption(data.votedOption);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.poll}>
      <p className={styles.pollCount}>
        {total} {total === 1 ? "vote" : "votes"}
        {votedOption !== undefined ? " — you voted" : ""}
      </p>
      {countdownText && (
        <p style={{ fontSize: 12, color: "#9b9bab", margin: "0 0 8px", fontWeight: 600 }}>
          {countdownText}
        </p>
      )}
      {isExpired && votedOption === undefined && (
        <p style={{ fontSize: 12, color: "#9b9bab", margin: "0 0 8px", fontWeight: 600 }}>
          Voting closed
        </p>
      )}
      {options.map((option, index) => {
        const count = counts[index] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const mine = votedOption === index;
        return (
          <button
            key={index}
            className={`${styles.pollOption} ${mine ? styles.pollOptionMine : ""}`}
            onClick={() => handleVote(index)}
            disabled={busy || disabled || votedOption !== undefined || isExpired}
          >
            <span className={styles.pollOptionText}>{option}</span>
            {votedOption !== undefined && (
              <span className={styles.pollOptionPct}>
                {count} · {pct}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ReportButton({ type, targetId, commentPostId, small }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={small ? styles.reportSmall : styles.report}
        onClick={() => setOpen(true)}
        title="Report this content"
      >
        Report
      </button>
      {open && (
        <ReportModal
          type={type}
          targetId={targetId}
          commentPostId={commentPostId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CommentList({ postId, uid, canModerate }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) =>
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, [postId]);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Reply failed");
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(commentId) {
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete comment");
    }
  }

  return (
    <div className={styles.comments}>
      {comments.length > 0 && (
        <div className={styles.commentList}>
          {comments.map((c) => (
            <div key={c.id} className={styles.comment}>
              <div className={styles.commentHeader}>
                <span className={styles.commentName}>{c.authorName}</span>
                <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                {(c.authorId === uid || canModerate) && (
                  <button
                    className={styles.deleteSmall}
                    onClick={() => handleDelete(c.id)}
                    title="Delete comment"
                  >
                    ×
                  </button>
                )}
                {c.authorId !== uid && (
                  <ReportButton type="comment" targetId={c.id} commentPostId={postId} small />
                )}
              </div>
              <p className={styles.commentText}>{renderMentions(c.text)}</p>
            </div>
          ))}
        </div>
      )}
      <form className={styles.commentForm} onSubmit={handleAdd}>
        <input
          className={styles.commentInput}
          type="text"
          placeholder="Reply…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={styles.commentSubmit} type="submit" disabled={!text.trim() || busy}>
          {busy ? "Replying…" : "Reply"}
        </button>
      </form>
    </div>
  );
}

const EMPTY_POLL = ["", ""];

export default function Feed({ uid, userName, role, groupId, spaceId, initialKind }) {
  const canModerate = role === "owner" || role === "moderator";
  const [posts, setPosts] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [kind, setKind] = useState(
    initialKind === "poll" || initialKind === "question" || initialKind === "win"
      ? initialKind
      : "post"
  );
  const [pollOptions, setPollOptions] = useState(EMPTY_POLL);
  const [pollDeadline, setPollDeadline] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const fileInputRef = useRef(null);

  const sortFeedPosts = useCallback(
    (list) =>
      [...list].sort((a, b) => {
        const ap = a.pinned ? 1 : 0;
        const bp = b.pinned ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const at = a.createdAt?.toMillis?.() || Number(a.createdAt) || 0;
        const bt = b.createdAt?.toMillis?.() || Number(b.createdAt) || 0;
        return bt - at;
      }),
    []
  );

  const loadCommunityPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("Feed read failed");
      const data = await res.json();
      setPosts(sortFeedPosts(data.posts || []));
      setLoadError(false);
    } catch (err) {
      console.error("Feed read failed", err);
      setLoadError(true);
    }
  }, [sortFeedPosts]);

  useEffect(() => {
    const isCommunity = !groupId && !spaceId;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
        window.location.assign("/login");
        return;
      }
      if (isCommunity) loadCommunityPosts();
    });

    if (isCommunity) {
      const interval = setInterval(loadCommunityPosts, 25000);
      return () => {
        clearInterval(interval);
        unsubAuth();
      };
    }

    const base = collection(db, "posts");
    let q;
    if (spaceId) {
      q = query(base, where("spaceId", "==", spaceId));
    } else {
      q = query(base, where("groupId", "==", groupId));
    }
    const unsubPosts = onSnapshot(
      q,
      (snap) => setPosts(sortFeedPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
      (err) => {
        console.error("Feed read failed", err);
      }
    );
    return () => {
      unsubAuth();
      unsubPosts();
    };
  }, [groupId, spaceId, loadCommunityPosts, sortFeedPosts]);

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      if (dataUrl.length > 700_000) {
        alert("That image is too large to attach yet — try a smaller one.");
        return;
      }
      setImageUrl(dataUrl);
    } catch (err) {
      console.error(err);
      alert("Couldn't process that image. Try a different one.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handlePost = useCallback(
    async (e) => {
      e.preventDefault();
const trimmed = text.trim();
      const tag = /\b#win\b/i.test(trimmed) ? "" : "#win";
      const payloadText = kind === "win" && trimmed ? `${trimmed} ${tag}`.trim() : trimmed;
      const cleanPoll = pollOptions
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0);
      if (kind === "poll") {
        if (cleanPoll.length < 2 || busy || uploading) return;
      } else if ((!trimmed && !imageUrl) || busy || uploading) {
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: payloadText,
            imageUrl,
            groupId: groupId || "",
            spaceId: spaceId || "",
            kind,
            pollOptions: kind === "poll" ? cleanPoll : [],
            pollDeadline: kind === "poll" && pollDeadline ? pollDeadline : "",
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Post failed");
        setText("");
        setImageUrl("");
        setKind("post");
        setPollOptions(EMPTY_POLL);
        setPollDeadline("");
        if (!spaceId && !groupId) loadCommunityPosts();
      } catch (err) {
        console.error(err);
        alert(err.message || "Post failed. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [text, imageUrl, busy, uploading, groupId, spaceId, kind, pollOptions, pollDeadline, loadCommunityPosts]
  );

  function setPollOption(index, value) {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  function addPollOption() {
    setPollOptions((prev) =>
      prev.length < 5 ? [...prev, ""] : prev
    );
  }

  function removePollOption(index) {
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDelete(postId) {
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to delete post");
    }
  }

  async function handlePin(postId) {
    await fetch(`/api/posts/${postId}/pin`, { method: "POST" });
  }

  const queryText = search.trim().toLowerCase();
  let filtered = posts;
  if (queryText) {
    filtered = filtered.filter(
      (p) =>
        p.text?.toLowerCase().includes(queryText) ||
        p.authorName?.toLowerCase().includes(queryText) ||
        (p.pollOptions || []).some((opt) => opt.toLowerCase().includes(queryText))
    );
  }
  if (filter === "popular") {
    filtered = [...filtered].sort(
      (a, b) => Object.keys(b.likes || {}).length - Object.keys(a.likes || {}).length
    );
  } else if (filter === "mine") {
    filtered = filtered.filter((p) => p.authorId === uid);
  } else if (filter === "bookmarked") {
    filtered = filtered.filter((p) => p.bookmarks?.[uid]);
  } else if (filter === "hosts") {
    filtered = filtered.filter((p) => p.authorRole === "owner" || p.authorRole === "moderator");
  } else if (filter === "unanswered") {
    filtered = filtered.filter((p) => p.kind === "question" && (p.commentCount || 0) === 0);
  }
  if (sort === "oldest") {
    filtered = [...filtered].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const at = a.createdAt?.toMillis?.() || Number(a.createdAt) || 0;
      const bt = b.createdAt?.toMillis?.() || Number(b.createdAt) || 0;
      return at - bt;
    });
  } else if (sort === "top") {
    filtered = [...filtered].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return Object.keys(b.likes || {}).length - Object.keys(a.likes || {}).length;
    });
  } else if (sort === "activity") {
    filtered = [...filtered].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const at = a.lastActivityAt?.toMillis?.() || a.createdAt?.toMillis?.() || Number(a.createdAt) || 0;
      const bt = b.lastActivityAt?.toMillis?.() || b.createdAt?.toMillis?.() || Number(b.createdAt) || 0;
      return bt - at;
    });
  } else {
    filtered = [...filtered].sort((a, b) => {
      const ap = a.pinned ? 1 : 0;
      const bp = b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      const at = a.createdAt?.toMillis?.() || Number(a.createdAt) || 0;
      const bt = b.createdAt?.toMillis?.() || Number(b.createdAt) || 0;
      return bt - at;
    });
  }

  const postCount = posts.length;
  const popularCount = posts.filter((p) => Object.keys(p.likes || {}).length > 0).length;
  const mineCount = posts.filter((p) => p.authorId === uid).length;
  const bookmarkedCount = posts.filter((p) => p.bookmarks?.[uid]).length;
  const unansweredCount = posts.filter((p) => p.kind === "question" && (p.commentCount || 0) === 0).length;

  const kindLabel =
    kind === "poll"
      ? "Ask a poll"
      : kind === "question"
        ? "Ask a question"
        : kind === "win"
          ? "Share a win"
          : "New post";

  return (
    <div className={styles.feed}>
      <form className={styles.composer} onSubmit={handlePost}>
        <div className={styles.kindTabs}>
          {[
            { key: "post", label: "✍️ Post" },
            { key: "poll", label: "📊 Poll" },
            { key: "question", label: "❓ Question" },
            { key: "win", label: "🏆 Win" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={kind === tab.key ? styles.kindTabActive : styles.kindTab}
              onClick={() => setKind(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <MentionInput
          className={styles.composerInput}
          rows={3}
          placeholder={
            kind === "poll"
              ? "Ask a question, then add options below…"
              : kind === "question"
                ? "What do you want to ask the community?…"
                : kind === "win"
                  ? "Share a win with the community…"
                  : "Share something with the community… Type @ to mention someone."
          }
          value={text}
          onChange={setText}
          maxLength={5000}
        />
        {kind === "poll" && (
          <div className={styles.pollComposer}>
            {pollOptions.map((option, index) => (
              <div key={index} className={styles.pollOptionRow}>
                <input
                  className={styles.pollOptionInput}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  maxLength={100}
                  onChange={(e) => setPollOption(index, e.target.value)}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    className={styles.pollRemove}
                    onClick={() => removePollOption(index)}
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 5 && (
              <button type="button" className={styles.pollAdd} onClick={addPollOption}>
                + Add option
              </button>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b6b7b", display: "block", marginBottom: 4 }}>
                Deadline (optional)
              </label>
              <input
                type="datetime-local"
                className={styles.pollOptionInput}
                value={pollDeadline}
                onChange={(e) => setPollDeadline(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                style={{ maxWidth: 260 }}
              />
            </div>
          </div>
        )}
        {imageUrl && (
          <div className={styles.imagePreview}>
            <img src={imageUrl} alt="Attached" className={styles.imagePreviewImg} />
            <button
              type="button"
              className={styles.removeImage}
              onClick={() => setImageUrl("")}
            >
              Remove
            </button>
          </div>
        )}
        <div className={styles.composerRow}>
          <div className={styles.composerLeft}>
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Add photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
            <p className={styles.composerHint}>Be kind. This is a safe space.</p>
          </div>
          <button
            className={styles.postButton}
            type="submit"
            disabled={
              busy ||
              uploading ||
              (kind === "poll"
                ? pollOptions.filter((opt) => opt.trim().length > 0).length < 2
                : !text.trim() && !imageUrl)
            }
          >
            {busy ? "Posting…" : kindLabel}
          </button>
        </div>
      </form>

      <div className={styles.feedBar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.filterTabs}>
          <button
            className={filter === "all" ? styles.filterTabActive : styles.filterTab}
            onClick={() => setFilter("all")}
          >
            All ({postCount})
          </button>
          <button
            className={filter === "popular" ? styles.filterTabActive : styles.filterTab}
            onClick={() => setFilter("popular")}
          >
            Popular ({popularCount})
          </button>
          <button
            className={filter === "mine" ? styles.filterTabActive : styles.filterTab}
            onClick={() => setFilter("mine")}
          >
            Mine ({mineCount})
          </button>
          <button
            className={filter === "bookmarked" ? styles.filterTabActive : styles.filterTab}
            onClick={() => setFilter("bookmarked")}
          >
            Saved ({bookmarkedCount})
          </button>
          <button
            className={filter === "hosts" ? styles.filterTabActive : styles.filterTab}
            onClick={() => setFilter("hosts")}
          >
            Hosts
          </button>
          <button
            className={filter === "unanswered" ? styles.filterTabActive : styles.filterTab}
            onClick={() => setFilter("unanswered")}
          >
            Unanswered ({unansweredCount})
          </button>
        </div>
        <div className={styles.sortTabs}>
          <select
            className={styles.sortSelect}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="top">Top</option>
            <option value="activity">Latest Activity</option>
          </select>
        </div>
      </div>

      {loadError ? (
        <p className={styles.empty}>Couldn&apos;t load the feed. Refreshing&hellip;</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>
          {queryText
            ? "No posts match your search."
            : spaceId
            ? "No posts in this space yet — be the first to say hi."
            : groupId
            ? "No posts in this group yet — be the first to say hi."
            : "No posts yet — be the first to say hi."}
        </p>
      ) : (
        <div className={styles.postList}>
          {filtered.map((post) => (
            <article key={post.id} className={styles.post} style={postCardStyle(post.kind)}>
              <div className={styles.postHeader}>
                <div className={styles.avatar}>
                  {(post.authorName || "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className={styles.postAuthor}>
                    {post.authorName}
                    {post.kind === "poll" && <span className={styles.kindBadge}>📊 Poll</span>}
                    {post.kind === "question" && <span className={styles.kindBadge}>❓ Question</span>}
                    {post.kind === "win" && <span className={styles.kindBadge}>🏆 Win</span>}
                    {post.pinned && <span className={styles.pinnedBadge}>📌 Pinned</span>}
                  </p>
                  <p className={styles.postTime}>{timeAgo(post.createdAt)}</p>
                </div>
                {canModerate && (
                  <button
                    className={styles.pinBtn}
                    onClick={() => handlePin(post.id)}
                    title={post.pinned ? "Unpin post" : "Pin post"}
                  >
                    {post.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
                {(post.authorId === uid || canModerate) && (
                  <button
                    className={styles.deletePost}
                    onClick={() => handleDelete(post.id)}
                    title="Delete post"
                  >
                    Delete
                  </button>
                )}
                {post.authorId !== uid && (
                  <ReportButton type="post" targetId={post.id} />
                )}
              </div>
              {post.text && <p className={styles.postText}>{renderMentions(post.text)}</p>}
              {post.kind === "poll" && (
                <PollBlock postId={post.id} post={post} uid={uid} />
              )}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="" className={styles.postImage} />
              )}
              <div className={styles.postActions}>
                <LikeButton postId={post.id} likes={post.likes} uid={uid} />
                <BookmarkButton postId={post.id} bookmarks={post.bookmarks} uid={uid} />
              </div>
              <CommentList postId={post.id} uid={uid} canModerate={canModerate} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
