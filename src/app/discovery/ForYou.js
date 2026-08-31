"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function Section({ title, items, renderItem }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f5f5f5", margin: "0 0 16px" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {items.map(renderItem)}
      </div>
    </div>
  );
}

export default function ForYou() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/discovery/for-you")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ color: "#9b9bab", fontSize: 13 }}>Loading recommendations...</p>;
  }

  if (!data) {
    return <p style={{ color: "#9b9bab", fontSize: 13 }}>Could not load recommendations.</p>;
  }

  return (
    <div>
      <Section
        title="Posts you might like"
        items={data.posts}
        renderItem={(post) => (
          <Link
            key={post.id}
            href="/feed"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "#2a2a3a",
              border: "1px solid #3a3a4a",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
            }}
          >
            <p style={{ fontSize: 14, color: "#e5e5e5", margin: 0, lineHeight: 1.5 }}>
              {(post.text || "").slice(0, 120)}
              {(post.text || "").length > 120 ? "..." : ""}
            </p>
            {post._reason && (
              <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{post._reason}</span>
            )}
          </Link>
        )}
      />

      <Section
        title="Spaces for you"
        items={data.spaces}
        renderItem={(space) => (
          <Link
            key={space.id}
            href={`/spaces/${space.slug || space.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "#2a2a3a",
              border: "1px solid #3a3a4a",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5", margin: 0 }}>{space.name}</p>
            {space.description && (
              <p style={{ fontSize: 13, color: "#9b9bab", margin: 0, lineHeight: 1.4 }}>
                {(space.description || "").slice(0, 100)}
              </p>
            )}
            {space._reason && (
              <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{space._reason}</span>
            )}
          </Link>
        )}
      />

      <Section
        title="Courses for you"
        items={data.courses}
        renderItem={(course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "#2a2a3a",
              border: "1px solid #3a3a4a",
              borderRadius: 12,
              padding: 16,
              textDecoration: "none",
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 700, color: "#f5f5f5", margin: 0 }}>{course.title}</p>
            {course.description && (
              <p style={{ fontSize: 13, color: "#9b9bab", margin: 0, lineHeight: 1.4 }}>
                {(course.description || "").slice(0, 100)}
              </p>
            )}
            {course._reason && (
              <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>{course._reason}</span>
            )}
          </Link>
        )}
      />
    </div>
  );
}
