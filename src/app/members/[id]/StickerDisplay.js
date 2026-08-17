"use client";

import { useState, useEffect } from "react";
import StickerPicker from "@/components/StickerPicker";

export default function StickerDisplay({ toUid, toName, isSelf, initialSummary }) {
  const [summary, setSummary] = useState(initialSummary || {});
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  const STICKER_EMOJIS = {
    trophy: "🏆",
    star: "⭐",
    yarn: "🧶",
    heart: "❤️",
    celebration: "🎉",
    clap: "👏",
  };

  const topStickers = Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (total === 0 && isSelf) {
    return (
      <div style={{ margin: "0 0 20px" }}>
        <StickerPicker toUid={toUid} toName={toName} />
        <p style={{ fontSize: 12, color: "#9b9bab", marginTop: 8 }}>
          You haven&apos;t received any stickers yet. They&apos;ll appear here!
        </p>
      </div>
    );
  }

  if (total === 0 && !isSelf) {
    return (
      <div style={{ margin: "0 0 20px" }}>
        <StickerPicker toUid={toUid} toName={toName} />
      </div>
    );
  }

  return (
    <div style={{
      margin: "0 0 20px",
      padding: "14px 16px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
    }}>
      <p style={{
        fontSize: 12,
        fontWeight: 700,
        color: "#9b9bab",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        margin: "0 0 10px",
      }}>
        Stickers received ({total})
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {topStickers.map(([type, count]) => (
          <span key={type} style={{ fontSize: 24, position: "relative" }}>
            {STICKER_EMOJIS[type]}
            {count > 1 && (
              <span style={{
                position: "absolute",
                bottom: -4,
                right: -6,
                fontSize: 10,
                fontWeight: 800,
                color: "#a78bfa",
                background: "#1f1f1f",
                borderRadius: 999,
                padding: "1px 5px",
              }}>
                {count}
              </span>
            )}
          </span>
        ))}
      </div>
      {!isSelf && (
        <div style={{ marginTop: 12 }}>
          <StickerPicker toUid={toUid} toName={toName} />
        </div>
      )}
    </div>
  );
}
