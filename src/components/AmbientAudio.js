"use client";

import { useState, useEffect, useRef } from "react";

function generateAmbientWav() {
  const sampleRate = 22050;
  const duration = 8;
  const numSamples = sampleRate * duration;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const freqs = [130.81, 164.81, 196.0, 261.63, 329.63];
  const amps = [0.15, 0.12, 0.10, 0.08, 0.06];
  const phases = freqs.map(() => Math.random() * Math.PI * 2);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (let f = 0; f < freqs.length; f++) {
      const env = 0.3 + 0.7 * Math.sin(2 * Math.PI * (0.03 + f * 0.008) * t + phases[f]);
      sample += amps[f] * env * Math.sin(2 * Math.PI * freqs[f] * t + Math.sin(2 * Math.PI * 0.1 * t) * 2);
    }
    const fadeLen = sampleRate * 2;
    let fade = 1;
    if (i < fadeLen) fade = i / fadeLen;
    else if (i > numSamples - fadeLen) fade = (numSamples - i) / fadeLen;
    const val = Math.max(-1, Math.min(1, sample * fade));
    view.setInt16(44 + i * 2, val * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return "data:audio/wav;base64," + btoa(binary);
}

export default function AmbientAudio({ active }) {
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState("");
  const audioRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    setSrc(generateAmbientWav());
  }, [active]);

  useEffect(() => {
    if (!audioRef.current || !src) return;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
  }, [src]);

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

  if (!active || !src) return null;

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <button
        onClick={toggle}
        aria-label={playing ? "Mute ambient music" : "Play ambient music"}
        style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          zIndex: 999,
          width: 48,
          height: 48,
          borderRadius: 14,
          border: playing ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.15)",
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
        {playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.5 4.5 0 002.5-3.5zM14 3.23v2.06a6.51 6.51 0 010 13.42v2.06A8.5 8.5 0 0014 3.23z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        )}
      </button>
    </>
  );
}
