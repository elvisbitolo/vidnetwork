"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

function LikeButton({ postId, likes, uid, disabled }) {  const [count, setCount] = useState(Object.keys(likes || {}).length);
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

export default function Feed({ uid, userName, role, groupId }) {
  const canModerate = role === "owner" || role === "moderator";
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the fresh session cookie is sent
        window.location.assign("/login");
      }
    });
    const base = collection(db, "posts");
    const q = groupId
      ? query(base, where("groupId", "==", groupId))
      : query(base, orderBy("createdAt", "desc"), limit(100));
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
  }, [groupId]);

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
      if ((!trimmed && !imageUrl) || busy || uploading) return;
      setBusy(true);
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, imageUrl, groupId: groupId || "" }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Post failed");
        setText("");
        setImageUrl("");
      } catch (err) {
        console.error(err);
      } finally {
        setBusy(false);
      }
    },
    [text, imageUrl, busy, uploading, groupId]
  );

  async function handleDelete(postId) {
    await deleteDoc(doc(db, "posts", postId));
  }

  async function handlePin(postId) {
    await fetch(`/api/posts/${postId}/pin`, { method: "POST" });
  }

  const queryText = search.trim().toLowerCase();
  const filtered = queryText
    ? posts.filter(
        (p) =>
          p.text?.toLowerCase().includes(queryText) ||
          p.authorName?.toLowerCase().includes(queryText)
      )
    : posts;

  return (
    <div className={styles.feed}>
      <form className={styles.composer} onSubmit={handlePost}>
        <textarea
          className={styles.composerInput}
          rows={3}
          placeholder="Share something with the community…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
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
            disabled={(!text.trim() && !imageUrl) || busy || uploading}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <input
        className={styles.search}
        type="search"
        placeholder="Search posts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className={styles.empty}>
          {queryText
            ? "No posts match your search."
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
                    {post.pinned && (
                      <span className={styles.pinnedBadge}>📌 Pinned</span>
                    )}
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
              {post.text && <p className={styles.postText}>{post.text}</p>}
              {post.imageUrl && (
                <img src={post.imageUrl} alt="" className={styles.postImage} />
              )}
              <div className={styles.postActions}>
                <LikeButton postId={post.id} likes={post.likes} uid={uid} />
              </div>
              <CommentList postId={post.id} uid={uid} canModerate={canModerate} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
