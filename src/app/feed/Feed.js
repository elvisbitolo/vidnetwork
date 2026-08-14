"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase/client";
import styles from "./feed.module.css";

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
    >
      {liked ? "❤" : "🤍"} {count}
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
    >
      {bookmarked ? "🔖" : "▢"}
    </button>
  );
}

function PollBlock({ postId, post, uid, disabled }) {
  const [votes, setVotes] = useState(post.pollVotes || {});
  const [busy, setBusy] = useState(false);
  const votedOption = votes[uid];
  const options = post.pollOptions || [];
  const total = Object.keys(votes).length;

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
        setVotes(data.pollVotes || {});
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
      {options.map((option, index) => {
        const count = Object.values(votes).filter((v) => v === index).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const mine = votedOption === index;
        return (
          <button
            key={index}
            className={`${styles.pollOption} ${mine ? styles.pollOptionMine : ""}`}
            onClick={() => handleVote(index)}
            disabled={busy || disabled || votedOption !== undefined}
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
  const [busy, setBusy] = useState(false);

  async function handleReport() {
    const reason = window.prompt("What's the issue with this content? (e.g. spam, harassment, misinformation)");
    if (!reason || !reason.trim()) return;
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, commentPostId, reason: reason.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Report failed");
      alert("Thanks — a moderator will review this.");
    } catch (err) {
      console.error(err);
      alert("Report failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={small ? styles.reportSmall : styles.report}
      onClick={handleReport}
      disabled={busy}
      title="Report this content"
    >
      Report
    </button>
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
    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
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
              <p className={styles.commentText}>{c.text}</p>
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

export default function Feed({ uid, userName, role, groupId, spaceId }) {
  const canModerate = role === "owner" || role === "moderator";
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [kind, setKind] = useState("post");
  const [pollOptions, setPollOptions] = useState(EMPTY_POLL);
  const [filter, setFilter] = useState("all");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
        window.location.assign("/login");
      }
    });
    const base = collection(db, "posts");
    let q;
    if (spaceId) {
      q = query(base, where("spaceId", "==", spaceId));
    } else if (groupId) {
      q = query(base, where("groupId", "==", groupId));
    } else {
      q = query(base, orderBy("createdAt", "desc"), limit(100));
    }
    const unsubPosts = onSnapshot(q, (snap) =>
      setPosts(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ap = a.pinned ? 1 : 0;
            const bp = b.pinned ? 1 : 0;
            if (ap !== bp) return bp - ap;
            const at = a.createdAt?.toMillis?.() || Number(a.createdAt) || 0;
            const bt = b.createdAt?.toMillis?.() || Number(b.createdAt) || 0;
            return bt - at;
          })
      )
    );
    return () => {
      unsubAuth();
      unsubPosts();
    };
  }, [groupId, spaceId]);

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
      const ref = storageRef(storage, `posts/${uid}/${Date.now()}-${file.name}`);
      await uploadBytes(ref, file, { customMetadata: { uid, role } });
      const url = await getDownloadURL(ref);
      setImageUrl(url);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check storage rules are deployed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handlePost = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = text.trim();
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
            text: trimmed,
            imageUrl,
            groupId: groupId || "",
            spaceId: spaceId || "",
            kind,
            pollOptions: kind === "poll" ? cleanPoll : [],
          }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Post failed");
        setText("");
        setImageUrl("");
        setKind("post");
        setPollOptions(EMPTY_POLL);
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
      }
    },
    [text, imageUrl, busy, uploading, groupId, spaceId, kind, pollOptions]
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
    await deleteDoc(doc(db, "posts", postId));
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
  }

  const postCount = posts.length;
  const popularCount = posts.filter((p) => Object.keys(p.likes || {}).length > 0).length;
  const mineCount = posts.filter((p) => p.authorId === uid).length;
  const bookmarkedCount = posts.filter((p) => p.bookmarks?.[uid]).length;

  const kindLabel =
    kind === "poll" ? "Ask a poll" : kind === "question" ? "Ask a question" : "New post";

  return (
    <div className={styles.feed}>
      <form className={styles.composer} onSubmit={handlePost}>
        <div className={styles.kindTabs}>
          {[
            { key: "post", label: "✍️ Post" },
            { key: "poll", label: "📊 Poll" },
            { key: "question", label: "❓ Question" },
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
        <textarea
          className={styles.composerInput}
          rows={3}
          placeholder={
            kind === "poll"
              ? "Ask a question, then add options below…"
              : kind === "question"
              ? "What do you want to ask the community?…"
              : "Share something with the community…"
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
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
        </div>
      </div>

      {filtered.length === 0 ? (
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
            <article key={post.id} className={styles.post}>
              <div className={styles.postHeader}>
                <div className={styles.avatar}>
                  {(post.authorName || "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className={styles.postAuthor}>
                    {post.authorName}
                    {post.kind === "poll" && <span className={styles.kindBadge}>📊 Poll</span>}
                    {post.kind === "question" && <span className={styles.kindBadge}>❓ Question</span>}
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
              {post.text && <p className={styles.postText}>{renderHashtags(post.text)}</p>}
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
