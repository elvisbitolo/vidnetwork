"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export default function GlobalRoomMusic() {
  const [src, setSrc] = useState("");
  const [playing, setPlaying] = useState(false);
  const [songName, setSongName] = useState("");
  const audioRef = useRef(null);
  const pollingRef = useRef(null);
  const pathname = usePathname();
  const inRoom = pathname?.startsWith("/rooms/");

  const fetchMusic = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/music");
      if (!res.ok) return;
      const data = await res.json();
      if (data.musicPlaying && (data.music || data.musicFileId)) {
        const audioSrc = data.musicFileId
          ? `/api/rooms/music/stream?id=${data.musicFileId}`
          : data.music;
        setSrc(audioSrc);
        setSongName(data.musicName || "");
      } else {
        setSrc("");
        setPlaying(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchMusic();
    pollingRef.current = setInterval(fetchMusic, 5000);

    function onMusicChange() {
      fetchMusic();
    }
    window.addEventListener("room-music-changed", onMusicChange);
    return () => {
      clearInterval(pollingRef.current);
      window.removeEventListener("room-music-changed", onMusicChange);
    };
  }, [fetchMusic]);

  useEffect(() => {
    if (!audioRef.current || !src) return;
    audioRef.current.load();
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
  }, [src]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (inRoom) {
      audioRef.current.pause();
    } else if (src) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [inRoom, src]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  function toggle() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  if (!src) return null;

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        onClick={toggle}
        aria-label={playing ? "Mute music" : "Play music"}
        title={songName || "Room music"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          height: 40,
          padding: "0 14px",
          borderRadius: 20,
          border: playing
            ? "1px solid rgba(167,139,250,0.4)"
            : "1px solid rgba(255,255,255,0.15)",
          background: playing
            ? "linear-gradient(135deg, rgba(109,93,246,0.9), rgba(167,139,250,0.8))"
            : "rgba(30,30,38,0.9)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: playing
            ? "0 4px 20px rgba(109,93,246,0.4)"
            : "0 2px 12px rgba(0,0,0,0.4)",
          transition: "all 0.2s ease",
          backdropFilter: "blur(8px)",
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.5 4.5 0 002.5-3.5zM14 3.23v2.06a6.51 6.51 0 010 13.42v2.06A8.5 8.5 0 0014 3.23z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
        {songName && (
          <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
            {songName}
          </span>
        )}
      </button>
    </>
  );
}
