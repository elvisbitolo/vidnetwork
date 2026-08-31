"use client";

import React from "react";

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

function renderRichText(text) {
  if (!text || typeof text !== "string") return null;

  const escaped = escapeHtml(text);
  const elements = [];
  let remaining = escaped;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    const linkMatch = remaining.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);

    if (boldMatch) {
      elements.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
    } else if (italicMatch) {
      elements.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
    } else if (linkMatch) {
      elements.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
    } else {
      const nextMarker = remaining.search(/\*|(\[)/);
      if (nextMarker === -1) {
        elements.push(remaining);
        break;
      } else if (nextMarker === 0) {
        elements.push(remaining.charAt(0));
        remaining = remaining.slice(1);
      } else {
        elements.push(remaining.slice(0, nextMarker));
        remaining = remaining.slice(nextMarker);
      }
    }
  }

  return elements.length === 0 ? null : elements;
}

export { renderRichText };
