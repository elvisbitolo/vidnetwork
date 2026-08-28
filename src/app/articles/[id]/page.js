"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 style="font-size:18px;font-weight:700;margin:24px 0 8px;color:#f5f5f5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:22px;font-weight:700;margin:28px 0 10px;color:#f5f5f5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:26px;font-weight:700;margin:32px 0 12px;color:#f5f5f5">$1</h1>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:20px;margin-bottom:4px">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/articles/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setArticle(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <Nav>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
          <p style={{ color: "#9b9bab", fontSize: 13 }}>Loading...</p>
        </div>
      </Nav>
    );
  }

  if (!article) {
    return (
      <Nav>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f5f5f5" }}>Article not found</h1>
          <Link href="/articles" style={{ color: "var(--secondary-light)", fontSize: 14, marginTop: 12, display: "inline-block" }}>
            Back to articles
          </Link>
        </div>
      </Nav>
    );
  }

  return (
    <Nav>
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 64px" }}>
        <Link href="/articles" style={{ color: "var(--secondary-light)", fontSize: 13, textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
          &larr; All articles
        </Link>

        {article.coverImage && (
          <img
            src={article.coverImage}
            alt=""
            style={{
              width: "100%",
              height: 300,
              objectFit: "cover",
              borderRadius: 14,
              marginBottom: 24,
            }}
          />
        )}

        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f5f5f5", margin: "0 0 12px", lineHeight: 1.3 }}>
          {article.title}
        </h1>

        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#9b9bab", marginBottom: 24, flexWrap: "wrap" }}>
          <Link href={`/members/${article.authorId}`} style={{ color: "var(--secondary-light)", textDecoration: "none", fontWeight: 600 }}>
            {article.authorName}
          </Link>
          <span>{article.readTime} min read</span>
          <span>{new Date(article.createdAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>

        {article.hashtags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
            {article.hashtags.map((tag) => (
              <span key={tag} style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--secondary-light)",
                background: "rgba(167,139,250,0.1)",
                padding: "3px 10px",
                borderRadius: 999,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: 16,
            lineHeight: 1.8,
            color: "#e5e5e5",
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
        />
      </article>
    </Nav>
  );
}
