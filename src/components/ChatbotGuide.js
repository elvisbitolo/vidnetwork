"use client";

import { useState, useEffect, useRef } from "react";

const GUIDE_STEPS = [
  {
    id: "welcome",
    messages: [
      { from: "bot", text: "Hey there! I'm your guide to VidNetwork. I'll walk you through everything so you feel right at home." },
      { from: "bot", text: "First things first — let's set up your profile. A complete profile helps other members find and connect with you." },
    ],
    action: { label: "Set up my profile", href: "/account" },
  },
  {
    id: "profile",
    messages: [
      { from: "bot", text: "Great! Your profile is where you add your name, photo, bio, and your craft details — like your favorite yarn, hook size, and colors." },
      { from: "bot", text: "Other members use this to find people with similar interests. The more you share, the better your matches!" },
    ],
    action: { label: "Continue to Feed", href: "/feed" },
  },
  {
    id: "feed",
    messages: [
      { from: "bot", text: "This is your Feed — where the community talks. You can post photos, ask questions, share patterns, or just chat." },
      { from: "bot", text: "Use hashtags like #amigurumi or #beginner to help others find your posts. You can also like and comment on others' posts." },
    ],
    action: { label: "Next: Members", href: "/members" },
  },
  {
    id: "members",
    messages: [
      { from: "bot", text: "This is the Members directory. You can see everyone in the community — their profiles, skills, and favorite colors." },
      { from: "bot", text: "Hover over any circle to see their details. Click to view their full profile. We'll also show you members who share your interests!" },
    ],
    action: { label: "Next: Live Rooms", href: "/rooms" },
  },
  {
    id: "rooms",
    messages: [
      { from: "bot", text: "Live Rooms are where the magic happens — real-time video sessions for craft-alongs, tutorials, and just hanging out." },
      { from: "bot", text: 'As a "Community" member, you can join rooms for up to 8 hours a month. Upgrade to "Creator" to host your own unlimited rooms!' },
    ],
    action: { label: "Next: Courses", href: "/courses" },
  },
  {
    id: "courses",
    messages: [
      { from: "bot", text: "Courses are structured lessons to learn new techniques — from basic stitches to advanced patterns." },
      { from: "bot", text: "You can track your progress and earn badges as you complete lessons. Some courses are free, others require a purchase." },
    ],
    action: { label: "Next: Events", href: "/events" },
  },
  {
    id: "events",
    messages: [
      { from: "bot", text: "Events are scheduled meetups, workshops, and craft-alongs. RSVP to get reminders so you never miss one." },
      { from: "bot", text: "That's the basics! You're all set to explore. Click the chat icon anytime if you need help." },
    ],
    action: { label: "Start exploring!", href: "/feed" },
  },
];

export default function ChatbotGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const currentStep = GUIDE_STEPS[step];
  const currentMessages = currentStep?.messages || [];
  const displayedMessages = currentMessages.slice(0, msgIndex + 1);

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
    if (msgIndex === 0 && currentMessages.length > 0) {
      setTyping(true);
    }
  }

  function handleRestart() {
    setAllDone(false);
    setStep(0);
    setMsgIndex(0);
    setIsOpen(true);
    fetch("/api/guide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: 0, completed: false }),
    }).catch(() => {});
  }

  if (loading || !visible) return null;

  if (allDone && !isOpen) {
    return (
      <button
        onClick={handleRestart}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6d5df6, #a78bfa)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(109,93,246,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          zIndex: 999,
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        aria-label="Open guide"
      >
        ?
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleExpand}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6d5df6, #a78bfa)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(109,93,246,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          transition: "transform 0.2s ease",
          animation: "guideBounce 2s ease infinite",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        aria-label="Open guide"
      >
        <span style={{ fontSize: 24, lineHeight: 1 }}>?</span>
        <style>{`
          @keyframes guideBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        `}</style>
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
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
      }}
    >
      <style>{`
        @keyframes guideSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div style={{
        padding: "16px 18px",
        background: "linear-gradient(135deg, #6d5df6, #8b5cf6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🧶</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>VidNetwork Guide</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", margin: 0 }}>
              Step {step + 1} of {GUIDE_STEPS.length}
            </p>
          </div>
        </div>
        <button
          onClick={handleMinimize}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 8,
            width: 30,
            height: 30,
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Minimize"
        >
          _
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
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
            <style>{`
              @keyframes dotPulse {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
              }
              @keyframes msgFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {msgIndex >= currentMessages.length - 1 && !typing && currentStep?.action && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <a
            href={currentStep.action.href}
            onClick={handleNext}
            style={{
              display: "block",
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #6d5df6, #a78bfa)",
              color: "#fff",
              fontSize: 14,
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
