"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RoomBackground.module.css";

const SRC = "/videos/elivs-bg.mp4";

export default function RoomBackground({ show, musicActive, autoplaySound }) {
  const videoRef = useRef(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    if (!show) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, [show]);

  useEffect(() => {
    if (musicActive && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.pause();
    }
  }, [musicActive]);

  useEffect(() => {
    if (!autoplaySound || musicActive) return;
    const video = videoRef.current;
    if (!video || !video.muted) return;
    video.muted = false;
    video.play().then(() => setSoundOn(true)).catch(() => {});
  }, [autoplaySound, musicActive]);

  if (!show) return null;

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !v.muted;
    v.muted = nextMuted;
    setSoundOn(!nextMuted);
    if (nextMuted) v.pause();
    else v.play().catch(() => {});
  }

  return (
    <>
      <video
        ref={videoRef}
        className={styles.video}
        src={SRC}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />
      {!musicActive && (
        <button
          type="button"
          className={styles.toggle}
          onClick={toggleSound}
          aria-label={soundOn ? "Mute lounge background video" : "Unmute lounge background video"}
          title={soundOn ? "Lounge video sound on" : "Lounge video sound off — tap to hear"}
        >
          {soundOn ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}