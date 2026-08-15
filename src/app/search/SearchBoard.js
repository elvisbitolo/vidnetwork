"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./search.module.css";

function timeAgo(millis) {
  if (!millis) return "";
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

function Section({ title, count, children }) {
  if (count === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title} <span className={styles.sectionCount}>{count}</span>
      </h2>
      {children}
    </section>
  );
}

export default function SearchBoard({ initialQ, initialHashtag, initialResults }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ || "");
  const [busy, setBusy] = useState(false);
  const results = initialResults;

  function submit(e) {
    e.preventDefault();
    const term = q.trim();
    if (!term || busy) return;
    setBusy(true);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const hashtagMode = !!initialHashtag;
  const total =
    results
      ? results.posts.length +
        results.members.length +
        results.groups.length +
        results.spaces.length +
        results.courses.length +
        results.events.length +
        results.rooms.length
      : 0;

  return (
    <div>
      <form className={styles.form} onSubmit={submit}>
        <input
          className={styles.input}
          type="search"
          placeholder="Search the community…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className={styles.button} type="submit" disabled={!q.trim() || busy}>
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      {hashtagMode && initialHashtag && (
        <p className={styles.hashtagBanner}>Showing posts tagged #{initialHashtag}</p>
      )}

      {!results ? (
        <p className={styles.empty}>Search across the whole community — try a name or topic.</p>
      ) : total === 0 ? (
        <p className={styles.empty}>No results found.</p>
      ) : (
        <div className={styles.results}>
          <Section title="Posts" count={results.posts.length}>
            <div className={styles.cardList}>
              {results.posts.map((post) => (
                <article key={post.id} className={styles.card}>
                  <p className={styles.cardTitle}>
                    {post.text.slice(0, 120) || "Untitled post"}
                    {post.kind === "poll" && <span className={styles.kindBadge}>Poll</span>}
                  </p>
                  <p className={styles.cardMeta}>
                    by {post.authorName} · {timeAgo(post.createdAt)} · ❤ {post.likeCount}
                  </p>
                  {post.hashtags.length > 0 && (
                    <p className={styles.tags}>
                      {post.hashtags.map((tag) => (
                        <Link
                          key={tag}
                          className={styles.tag}
                          href={`/search?hashtag=${encodeURIComponent(tag)}`}
                        >
                          #{tag}
                        </Link>
                      ))}
                    </p>
                  )}
                  <p className={styles.cardActions}>
                    <Link className={styles.cardLink} href="/feed">View in feed</Link>
                  </p>
                </article>
              ))}
            </div>
          </Section>

          <Section title="Members" count={results.members.length}>
            <div className={styles.cardList}>
              {results.members.map((member) => (
                <Link key={member.id} href={`/members/${member.id}`} className={styles.card}>
                  <p className={styles.cardTitle}>{member.name}</p>
                  <p className={styles.cardMeta}>{member.role}</p>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Spaces" count={results.spaces.length}>
            <div className={styles.cardList}>
              {results.spaces.map((space) => (
                <Link key={space.id} href={`/spaces/${space.slug}`} className={styles.card}>
                  <p className={styles.cardTitle}>{space.name}</p>
                  {space.description && <p className={styles.cardMeta}>{space.description}</p>}
                  <p className={styles.cardMeta}>{space.memberCount} members</p>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Groups" count={results.groups.length}>
            <div className={styles.cardList}>
              {results.groups.map((group) => (
                <Link key={group.id} href={`/groups/${group.slug}`} className={styles.card}>
                  <p className={styles.cardTitle}>{group.name}</p>
                  {group.description && <p className={styles.cardMeta}>{group.description}</p>}
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Courses" count={results.courses.length}>
            <div className={styles.cardList}>
              {results.courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} className={styles.card}>
                  <p className={styles.cardTitle}>{course.title}</p>
                  {course.description && <p className={styles.cardMeta}>{course.description}</p>}
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Events" count={results.events.length}>
            <div className={styles.cardList}>
              {results.events.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className={styles.card}>
                  <p className={styles.cardTitle}>{event.title}</p>
                  <p className={styles.cardMeta}>
                    {new Date(event.startTime).toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Live rooms" count={results.rooms.length}>
            <div className={styles.cardList}>
              {results.rooms.map((room) => (
                <Link key={room.id} href={`/rooms/${room.slug}`} className={styles.card}>
                  <p className={styles.cardTitle}>{room.name}</p>
                  {room.description && <p className={styles.cardMeta}>{room.description}</p>}
                </Link>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
