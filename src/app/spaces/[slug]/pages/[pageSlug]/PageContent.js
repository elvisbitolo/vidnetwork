"use client";

import DOMPurify from "dompurify";
import styles from "../page.module.css";

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 class="' + styles.markdownH3 + '">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="' + styles.markdownH2 + '">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="' + styles.markdownH1 + '">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="' + styles.markdownLi + '">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a class="' + styles.markdownLink + '" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code class="' + styles.markdownCode + '">$1</code>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

function safePageHtml(content) {
  return DOMPurify.sanitize(renderMarkdown(content || ""), {
    USE_PROFILES: { html: true },
  });
}

export default function PageContent({ content }) {
  return (
    <div
      className={styles.content}
      dangerouslySetInnerHTML={{ __html: safePageHtml(content) }}
    />
  );
}
