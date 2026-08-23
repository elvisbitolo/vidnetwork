"use client";

import { useState, useEffect, useRef } from "react";

export default function RoomMusicPicker({ isStaff }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [fileId, setFileId] = useState("");
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isStaff) return;
    fetch("/api/rooms/music", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUrl(data.music || "");
          setFileId(data.musicFileId || "");
          setName(data.musicName || "");
          setPlaying(data.musicPlaying);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isStaff]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/rooms/music/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }
      setFileId(data.id);
      setUrl("");
      if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError("Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  }

  function notifyGlobalPlayer() {
    window.dispatchEvent(new Event("room-music-changed"));
  }

  async function save(updates) {
    if (updates.musicUrl && !updates.musicUrl.startsWith("data:")) {
      const ext = updates.musicUrl.split("?")[0].split(".").pop().toLowerCase();
      const validExts = ["mp3", "wav", "ogg", "aac", "flac", "m4a", "webm"];
      if (!validExts.includes(ext)) {
        setError("Doesn't look like an audio file. Must end in .mp3, .wav, .ogg, etc.");
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/rooms/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        setError(err.error || "Failed to save");
        setSaving(false);
        return;
      }
      if (typeof updates.musicPlaying === "boolean") setPlaying(updates.musicPlaying);
      if (typeof updates.musicUrl === "string") setUrl(updates.musicUrl);
      if (typeof updates.musicFileId === "string") setFileId(updates.musicFileId);
      if (typeof updates.musicName === "string") setName(updates.musicName);
      notifyGlobalPlayer();
    } catch (e) {
      if (e.name === "AbortError") setError("Save timed out — try again");
      else setError("Failed to save");
    }
    setSaving(false);
  }

  if (!isStaff || loading) return null;

  const hasMusic = !!(fileId || url);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Manage room music"
        style={{
          position: "fixed",
          bottom: 24,
          left: 82,
          zIndex: 999,
          width: 48,
          height: 48,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.15)",
          background: playing
            ? "linear-gradient(135deg, rgba(109,93,246,0.85), rgba(167,139,250,0.75))"
            : "rgba(30,30,38,0.9)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: playing
            ? "0 4px 20px rgba(109,93,246,0.4)"
            : "0 2px 12px rgba(0,0,0,0.4)",
          transition: "all 0.2s ease",
          backdropFilter: "blur(8px)",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            bottom: 82,
            left: 24,
            zIndex: 1000,
            width: 340,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "calc(100vh - 120px)",
            overflowY: "auto",
            background: "#1a1a1f",
            border: "1px solid #2e2e38",
            borderRadius: 16,
            padding: 18,
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f5f5f5", marginBottom: 4 }}>
            Room Music
          </div>
          <p style={{ fontSize: 12, color: "#8b8b9b", margin: "0 0 14px" }}>
            Set the background music. Plays on every page for all visitors.
          </p>

          {playing && (
            <div style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.3)",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 600 }}>
                Now playing — {name || "Music"}
              </span>
            </div>
          )}

          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#f87171" }}>{error}</span>
            </div>
          )}

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0ac", marginBottom: 4 }}>
            Song name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chill Vibes"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #2e2e38",
              background: "#24242a",
              color: "#f5f5f5",
              fontSize: 13,
              outline: "none",
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              border: "1px dashed rgba(167,139,250,0.4)",
              background: "rgba(109,93,246,0.08)",
              color: "#a78bfa",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 6,
              opacity: uploading ? 0.5 : 1,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            {uploading ? "Uploading…" : "Upload audio file"}
          </button>
          <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} style={{ display: "none" }} />
          <p style={{ fontSize: 11, color: "#6b6b7b", margin: "0 0 10px" }}>
            Max 750KB. For larger songs, use a URL below.
          </p>

          {fileId && (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span style={{ fontSize: 12, color: "#4ade80" }}>File uploaded</span>
            </div>
          )}

          <div style={{ height: 1, background: "#2e2e38", margin: "10px 0" }} />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0ac", marginBottom: 4 }}>
            Or paste an audio URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setFileId(""); setError(""); }}
            placeholder="https://example.com/song.mp3"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #2e2e38",
              background: "#24242a",
              color: "#f5f5f5",
              fontSize: 13,
              outline: "none",
              marginBottom: 14,
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => save({ musicUrl: url || undefined, musicFileId: fileId || undefined, musicName: name })}
              disabled={saving || (!url && !fileId)}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 10,
                border: "none",
                background: (url || fileId) ? "linear-gradient(135deg, #6d5df6, #a78bfa)" : "#2e2e38",
                color: (url || fileId) ? "#fff" : "#6b6b7b",
                fontSize: 13,
                fontWeight: 600,
                cursor: (url || fileId) ? "pointer" : "default",
              }}
            >
              {saving ? "Saving…" : "Save song"}
            </button>
            <button
              onClick={() => save({ musicPlaying: !playing })}
              disabled={saving || (!url && !fileId)}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                border: playing ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(74,222,128,0.4)",
                background: playing ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)",
                color: playing ? "#f87171" : "#4ade80",
                fontSize: 13,
                fontWeight: 600,
                cursor: (url || fileId) ? "pointer" : "default",
              }}
            >
              {saving ? "…" : playing ? "Stop" : "Play"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
