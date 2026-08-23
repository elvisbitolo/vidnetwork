"use client";

import { useState, useEffect, useRef } from "react";

export default function RoomMusicPicker({ isStaff }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const panelRef = useRef(null);
  const fileRef = useRef(null);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!isStaff) return;
    fetch("/api/rooms/music", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUrl(data.music || "");
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

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => {
      setUrl(reader.result);
      if (!name) setName(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.onerror = () => setUploadError("Failed to read file.");
    reader.readAsDataURL(file);
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
        setUrlError("Doesn't look like an audio file. Must end in .mp3, .wav, .ogg, etc.");
        return;
      }
    }
    setUrlError("");
    setSaving(true);
    try {
      const res = await fetch("/api/rooms/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        setUrlError(err.error || "Failed to save");
        setSaving(false);
        return;
      }
      if (typeof updates.musicPlaying === "boolean") setPlaying(updates.musicPlaying);
      if (typeof updates.musicUrl === "string") setUrl(updates.musicUrl);
      if (typeof updates.musicName === "string") setName(updates.musicName);
      notifyGlobalPlayer();
    } catch {}
    setSaving(false);
  }

  if (!isStaff || loading) return null;

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
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Upload audio file
          </button>
          <input ref={fileRef} type="file" accept="audio/*" onChange={handleFile} style={{ display: "none" }} />
          {uploadError && <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 10px" }}>{uploadError}</p>}

          <div style={{ height: 1, background: "#2e2e38", margin: "12px 0" }} />

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#a0a0ac", marginBottom: 4 }}>
            Or paste an audio URL
          </label>
          <input
            type="url"
            value={url.startsWith("data:") ? "" : url}
            onChange={(e) => { setUrl(e.target.value); setUrlError(""); }}
            placeholder="https://example.com/song.mp3"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 10,
              border: urlError ? "1px solid rgba(239,68,68,0.5)" : "1px solid #2e2e38",
              background: "#24242a",
              color: "#f5f5f5",
              fontSize: 13,
              outline: "none",
              marginBottom: 6,
              boxSizing: "border-box",
            }}
          />
          {urlError && <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 10px" }}>{urlError}</p>}
          <p style={{ fontSize: 11, color: "#6b6b7b", margin: "0 0 14px" }}>
            Direct link to an audio file (.mp3, .wav, .ogg).
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => save({ musicUrl: url, musicName: name })}
              disabled={saving || !url}
              style={{
                flex: 1,
                padding: "9px 0",
                borderRadius: 10,
                border: "none",
                background: url ? "linear-gradient(135deg, #6d5df6, #a78bfa)" : "#2e2e38",
                color: url ? "#fff" : "#6b6b7b",
                fontSize: 13,
                fontWeight: 600,
                cursor: url ? "pointer" : "default",
              }}
            >
              {saving ? "Saving…" : "Save song"}
            </button>
            <button
              onClick={() => save({ musicPlaying: !playing })}
              disabled={saving || !url}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                border: playing ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(74,222,128,0.4)",
                background: playing ? "rgba(239,68,68,0.15)" : "rgba(74,222,128,0.15)",
                color: playing ? "#f87171" : "#4ade80",
                fontSize: 13,
                fontWeight: 600,
                cursor: url ? "pointer" : "default",
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
