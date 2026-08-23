"use client";

import { useState, useEffect, useRef } from "react";

function createAmbient(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.setTargetAtTime(0.25, ctx.currentTime, 1.5);
  master.connect(ctx.destination);

  function makePad(freq, detune, vol) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const g = ctx.createGain();
    g.gain.value = vol;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 1;

    osc.connect(filter);
    filter.connect(g);
    g.connect(master);
    osc.start();

    return { osc, gain: g, filter };
  }

  const notes = [
    [130.81, 0, 0.12],
    [164.81, 3, 0.10],
    [196.00, -2, 0.09],
    [261.63, 5, 0.08],
    [329.63, -3, 0.06],
  ];

  const pads = notes.map(([f, d, v]) => makePad(f, d, v));

  let t = ctx.currentTime;
  let running = true;
  const id = setInterval(() => {
    if (!running) return;
    t += 0.1;
    pads.forEach((pad, i) => {
      const speed = 0.02 + i * 0.008;
      const depth = 15 + i * 5;
      pad.filter.frequency.setTargetAtTime(
        400 + Math.sin(t * speed) * depth * 10,
        t,
        2
      );
      pad.gain.gain.setTargetAtTime(
        0.04 + Math.sin(t * speed + i) * 0.03,
        t,
        3
      );
    });
  }, 100);

  return {
    stop() {
      running = false;
      clearInterval(id);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => {
        pads.forEach((pad) => pad.osc.stop());
      }, 1000);
    },
  };
}

export default function AmbientAudio({ active }) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);
  const padRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;
    padRef.current = createAmbient(ctx);
    setPlaying(true);
  }, [active]);

  useEffect(() => {
    return () => {
      padRef.current?.stop();
      ctxRef.current?.close();
    };
  }, []);

  function toggle() {
    if (playing) {
      padRef.current?.stop();
      ctxRef.current?.close();
      ctxRef.current = null;
      padRef.current = null;
      setPlaying(false);
    } else {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      padRef.current = createAmbient(ctx);
      setPlaying(true);
    }
  }

  if (!active) return null;

  return (
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
  );
}
