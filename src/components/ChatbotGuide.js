"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const GUIDE_STEPS = [
  {
    id: "welcome",
    messages: [
      { from: "bot", text: "Hey there! Welcome to VidNetwork! I'm your friendly guide, and I'll help you get settled in." },
      { from: "bot", text: "Let's start by making your profile shine — it's how other members get to know you, and how we match you with people who share your craft." },
    ],
    action: { label: "Let's set up my profile", href: "/account" },
  },
  {
    id: "profile",
    messages: [
      { from: "bot", text: "Here you can add your name, photo, bio, and fun details like your favorite yarn, hook size, and colors you love." },
      { from: "bot", text: "The more you add, the easier it is for others to find you. Think of it as your crafty calling card!" },
    ],
    action: { label: "Continue to Feed", href: "/feed" },
  },
  {
    id: "feed",
    messages: [
      { from: "bot", text: "This is your Feed — the heart of the community! Share photos, ask questions, post patterns, or just say hi." },
      { from: "bot", text: "Tip: Use hashtags like #amigurumi or #beginner to help others discover your posts. You can like and comment on anything!" },
    ],
    action: { label: "Next: Meet the Members", href: "/members" },
  },
  {
    id: "members",
    messages: [
      { from: "bot", text: "This is where you meet everyone! Browse member circles — hover to peek at their profile, click to see the full picture." },
      { from: "bot", text: "We'll also show you 'Members Like You' — people who share your skills, favorite yarns, and project ideas." },
    ],
    action: { label: "Next: Live Rooms", href: "/rooms" },
  },
  {
    id: "rooms",
    messages: [
      { from: "bot", text: "Live Rooms are real-time video hangouts — craft-alongs, tutorials, or just chilling with fellow makers." },
      { from: "bot", text: 'As a "Community" member, you can join rooms for up to 8 hours a month. Go "Creator" to host your own unlimited rooms!' },
    ],
    action: { label: "Next: Courses", href: "/courses" },
  },
  {
    id: "courses",
    messages: [
      { from: "bot", text: "Courses are structured lessons — from basic stitches to advanced techniques. Learn at your own pace!" },
      { from: "bot", text: "Track your progress, earn badges, and unlock new skills. Some courses are free, others are premium." },
    ],
    action: { label: "Next: Events", href: "/events" },
  },
  {
    id: "events",
    messages: [
      { from: "bot", text: "Events are scheduled meetups, workshops, and craft-alongs. RSVP to get reminders so you never miss the fun." },
      { from: "bot", text: "That's the tour! You're all set to explore. I'll be here if you need me — just tap my icon. Happy crafting!" },
    ],
    action: { label: "Let's go!", href: "/feed" },
  },
];

const IDLE_TIMEOUT = 60000;

export default function ChatbotGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [typing, setTyping] = useState(false);
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [idle, setIdle] = useState(false);
  const dragRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const idleTimer = useRef(null);
  const messagesEndRef = useRef(null);

  const currentStep = GUIDE_STEPS[step];
  const currentMessages = currentStep?.messages || [];
  const displayedMessages = currentMessages.slice(0, msgIndex + 1);

  const resetIdleTimer = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    if (isOpen) {
      idleTimer.current = setTimeout(() => {
        setIdle(true);
        setIsOpen(false);
      }, IDLE_TIMEOUT);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) resetIdleTimer();
    return () => clearTimeout(idleTimer.current);
  }, [isOpen, resetIdleTimer]);

  useEffect(() => {
    const handler = () => resetIdleTimer();
    window.addEventListener("mousemove", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    fetch("/api/guide")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.guideCompleted) {
          setAllDone(true);
        } else if (typeof data?.guideStep === "number" && data.guideStep > 0) {
          setStep(data.guideStep);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setTimeout(() => setVisible(true), 500);
      });
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || allDone) return;
    if (msgIndex < currentMessages.length - 1) {
      const t = setTimeout(() => {
        setTyping(false);
        setMsgIndex((i) => i + 1);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [isOpen, msgIndex, currentMessages.length, allDone]);

  function saveStep(newStep) {
    fetch("/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: newStep }),
    }).catch(() => {});
  }

  function handleNext() {
    const nextStep = step + 1;
    if (nextStep >= GUIDE_STEPS.length) {
      setAllDone(true);
      setIsOpen(false);
      fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      }).catch(() => {});
      return;
    }
    setStep(nextStep);
    setMsgIndex(0);
    setTyping(true);
    saveStep(nextStep);
  }

  function handleMinimize() {
    setIsOpen(false);
  }

  function handleExpand() {
    setIsOpen(true);
    setIdle(false);
    if (msgIndex === 0 && currentMessages.length > 0) {
      setTyping(true);
    }
  }

  function handleRestart() {
    setAllDone(false);
    setStep(0);
    setMsgIndex(0);
    setIsOpen(true);
    setIdle(false);
    fetch("/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: 0, completed: false }),
    }).catch(() => {});
  }

  function onDragStart(e) {
    e.preventDefault();
    setDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setPos({
        x: Math.max(0, Math.min(clientX - dragOffset.current.x, window.innerWidth - 400)),
        y: Math.max(0, Math.min(clientY - dragOffset.current.y, window.innerHeight - 60)),
      });
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  const btnStyle = {
    position: "fixed",
    bottom: pos.y !== null ? "auto" : 24,
    right: pos.x !== null ? "auto" : 24,
    top: pos.y !== null ? pos.y : "auto",
    left: pos.x !== null ? pos.x : "auto",
    width: idle ? 40 : 52,
    height: idle ? 40 : 52,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6d5df6, #a78bfa)",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(109,93,246,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    transition: "all 0.3s ease",
  };

  if (loading || !visible) return null;

  if (allDone && !isOpen) {
    return (
      <button onClick={handleRestart} style={btnStyle} aria-label="Open guide">
        <span style={{ fontSize: idle ? 16 : 22, color: "#fff" }}>?</span>
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button onClick={handleExpand} style={{ ...btnStyle, animation: idle ? "none" : "guideBounce 2s ease infinite" }} aria-label="Open guide">
        <span style={{ fontSize: idle ? 16 : 24, color: "#fff", lineHeight: 1 }}>?</span>
        <style>{`
          @keyframes guideBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
      </button>
    );
  }

  const panelStyle = {
    position: "fixed",
    bottom: pos.y !== null ? "auto" : 24,
    right: pos.x !== null ? "auto" : 24,
    top: pos.y !== null ? pos.y : "auto",
    left: pos.x !== null ? pos.x : "auto",
    width: 380,
    maxWidth: "calc(100vw - 48px)",
    height: 500,
    maxHeight: "calc(100vh - 100px)",
    background: "#1a1a1a",
    border: "1px solid rgba(167,139,250,0.25)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 1000,
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    animation: "guideSlideUp 0.25s ease",
    userSelect: dragging ? "none" : "auto",
  };

  return (
    <div ref={dragRef} style={panelStyle}>
      <style>{`
        @keyframes guideSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg, #6d5df6, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧶</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>VidNetwork Guide</p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Step {step + 1} of {GUIDE_STEPS.length}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 8,
            width: 28,
            height: 28,
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Minimize"
        >
          —
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        {displayedMessages.map((msg, i) => (
          <div
            key={`${step}-${i}`}
            style={{
              alignSelf: "flex-start",
              maxWidth: "85%",
              padding: "10px 14px",
              borderRadius: "14px 14px 14px 4px",
              background: "rgba(167,139,250,0.12)",
              border: "1px solid rgba(167,139,250,0.15)",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#e5e5e5",
              animation: "msgFadeIn 0.3s ease",
            }}
          >
            {msg.text}
          </div>
        ))}
        {typing && (
          <div style={{
            alignSelf: "flex-start",
            padding: "10px 14px",
            borderRadius: "14px 14px 14px 4px",
            background: "rgba(167,139,250,0.12)",
            border: "1px solid rgba(167,139,250,0.15)",
            display: "flex",
            gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "dotPulse 1s ease infinite" }} />
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "dotPulse 1s ease 0.2s infinite" }} />
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "dotPulse 1s ease 0.4s infinite" }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {msgIndex >= currentMessages.length - 1 && !typing && currentStep?.action && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <a
            href={currentStep.action.href}
            onClick={handleNext}
            style={{
              display: "block",
              width: "100%",
              padding: "11px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #6d5df6, #a78bfa)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
              cursor: "pointer",
              border: "none",
            }}
          >
            {currentStep.action.label}
          </a>
        </div>
      )}
    </div>
  );
}
