"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Music4, Volume2, VolumeX } from "lucide-react";

export default function GlobalRoomMusic() {
  const [src, setSrc] = useState("");
  const [playing, setPlaying] = useState(false);
  const [songName, setSongName] = useState("");
  const audioRef = useRef(null);
  const pollingRef = useRef(null);
  const pathname = usePathname();
  const inRoom = pathname?.startsWith("/rooms/");

  useEffect(() => {
    let mounted = true;
    async function loadMusic() {
      try {
        const res = await fetch("/api/rooms/music");
        if (!res.ok || !mounted) return;
        const data = await res.json();
        if (!mounted) return;
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
    }

    loadMusic();
    pollingRef.current = setInterval(loadMusic, 5000);

    function onMusicChange() {
      loadMusic();
    }
    window.addEventListener("room-music-changed", onMusicChange);
    return () => {
      mounted = false;
      clearInterval(pollingRef.current);
      window.removeEventListener("room-music-changed", onMusicChange);
    };
  }, []);

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
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  if (!src) return null;

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
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
        <Music4 size={14} />
        {playing ? <Volume2 size={12} /> : <VolumeX size={12} />}
        {songName && (
          <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
            {songName}
          </span>
        )}
      </button>
    </>
  );
}
