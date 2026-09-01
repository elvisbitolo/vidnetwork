"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

const MODAL_SHOWN_KEY = "yarnery_welcome_shown";

// Initial tour: short, cross-page, focused on first meaningful outcome.
const INITIAL_STEPS = [
  {
    target: "tour-welcome",
    route: "/dashboard",
    title: "Welcome to Yarnery Lounge",
    text: "This is your home base — a snapshot of your profile, quick actions, and everything happening in your community.",
  },
  {
    target: "tour-sidebar",
    route: "/dashboard",
    title: "Navigate with the Menu",
    text: "Use the menu to move between your Dashboard, Feed, Rooms, Members, Events and more.",
  },
  {
    target: "tour-members-nav",
    route: "/members",
    title: "Discover Members",
    text: "Explore the people in your community and connect with members who share your craft.",
  },
  {
    target: "tour-notifications",
    route: "/feed",
    title: "Notifications",
    text: "Stay updated about activity that matters to you.",
  },
  {
    target: "tour-profile",
    route: "/dashboard",
    title: "Your Profile",
    text: "Add your details so members can get to know you. You can edit anytime from here.",
  },
];

// Existing dashboard tour kept working through the same engine.
const DASHBOARD_STEPS = [
  {
    target: "tour-sidebar",
    title: "Navigate with the Sidebar",
    text: "Use the sidebar to jump between Dashboard, Feed, Rooms, Courses, Events and more. It collapses on desktop and slides open on mobile.",
  },
  {
    target: "tour-welcome",
    title: "Your Welcome Banner",
    text: "A quick snapshot of your status — your name, subscription tier, and a shortcut to set up your profile if you haven't yet.",
  },
  {
    target: "tour-actions",
    title: "Quick Actions",
    text: "Create a post, start a live room, or RSVP to an event — all in one click.",
  },
  {
    target: "tour-kpis",
    title: "Key Metrics",
    text: "Track members, live viewers, revenue or your points, and weekly engagement at a glance.",
  },
  {
    target: "tour-activity",
    title: "Recent Activity",
    text: "See the latest posts, comments and interactions across the community in real time.",
  },
  {
    target: "tour-rooms",
    title: "Upcoming Rooms",
    text: "See which live video rooms are scheduled next. Click to RSVP or join directly when they go live.",
  },
  {
    target: "tour-search",
    title: "Search Everything",
    text: "Find members, posts, courses and rooms from the search bar at the top of the dashboard.",
  },
];

const TARGET_WAIT_MS = 800;
const MISSING_SKIP_ATTEMPTS = 3;

export default function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [done, setDone] = useState(false); // initial tour completed/skipped
  const [active, setActive] = useState(false);
  const [tour, setTour] = useState(""); // "initial" | "dashboard"
  const [step, setStep] = useState(0);
  const [startedManual, setStartedManual] = useState(false);
  const [spotStyle, setSpotStyle] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState(null);
  const [targetGone, setTargetGone] = useState(false);
  const tooltipRef = useRef(null);
  const missingRef = useRef({ attempts: 0, timer: null });

  const steps = tour === "dashboard" ? DASHBOARD_STEPS : INITIAL_STEPS;
  const currentStep = steps[step];

  // Load onboarding state from server.
  useEffect(() => {
    let activeMount = true;
    fetch("/api/onboarding-state")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!activeMount) return;
        if (data?.completed || data?.skipped) {
          setDone(true);
          setLoading(false);
          return;
        }
        const wantsModal =
          typeof window !== "undefined" && !sessionStorage.getItem(MODAL_SHOWN_KEY);
        // Resume from saved step if in-progress.
        if (
          data?.currentTour === "initial" &&
          typeof data.currentStep === "number" &&
          data.currentStep > 0
        ) {
          setTour("initial");
          setStep(Math.min(data.currentStep, INITIAL_STEPS.length - 1));
          setLoading(false);
          if (wantsModal) {
            sessionStorage.setItem(MODAL_SHOWN_KEY, "1");
            const el = document.querySelector(`[data-tour="${INITIAL_STEPS[data.currentStep]?.target}"]`);
            if (el) startTour("initial", data.currentStep, false);
          }
          return;
        }
        // Otherwise show welcome modal once per session.
        if (wantsModal) {
          sessionStorage.setItem(MODAL_SHOWN_KEY, "1");
          setWelcomeOpen(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (activeMount) {
          setLoading(false);
          setDone(true);
        }
      });
    return () => {
      activeMount = false;
    };
  }, []);

  const positionElements = useCallback(() => {
    const s = steps[step];
    if (!s) return;
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) {
      setSpotStyle(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      setSpotStyle({
        position: "fixed",
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
        borderRadius: 14,
        border: "2.5px solid var(--secondary-light)",
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
        zIndex: 998,
        pointerEvents: "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      });
    });
  }, [step, steps]);

  const ensureOnRoute = useCallback(() => {
    const s = steps[step];
    if (!s) return;
    if (s.route && pathname !== s.route) {
      router.push(s.route);
    }
  }, [step, steps, pathname, router]);

  useEffect(() => {
    if (!active) return;
    ensureOnRoute();
  }, [active, ensureOnRoute]);

  // Recompute spotlight/tooltip when step, route, or scroll changes.
  useEffect(() => {
    if (!active) return;
    positionElements();
  }, [active, step, positionElements]);

  useEffect(() => {
    if (!active) return;
    function onResize() { positionElements(); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, positionElements]);

  useEffect(() => {
    if (!active) return;
    function onScroll() { positionElements(); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [active, positionElements]);

  // Position tooltip near target.
  useEffect(() => {
    if (!active || !tooltipRef.current) return;
    const tt = tooltipRef.current;
    const s = steps[step];
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) return;

    const r = el.getBoundingClientRect();
    const ttRect = tt.getBoundingClientRect();
    const gap = 14;
    const isMobile = window.innerWidth <= 600;

    let top, left;

    if (isMobile) {
      top = Math.min(r.bottom + gap, window.innerHeight - ttRect.height - 8);
      left = Math.max(8, (window.innerWidth - ttRect.width) / 2);
    } else {
      const fitsBelow = r.bottom + gap + ttRect.height < window.innerHeight;
      const fitsRight = r.right + gap + ttRect.width < window.innerWidth;

      if (fitsRight) {
        top = r.top + r.height / 2 - ttRect.height / 2;
        left = r.right + gap;
      } else if (fitsBelow) {
        top = r.bottom + gap;
        left = r.left;
      } else {
        top = Math.max(8, r.top - ttRect.height - gap);
        left = r.left;
      }
    }

    top = Math.max(8, Math.min(top, window.innerHeight - ttRect.height - 8));
    left = Math.max(8, Math.min(left, window.innerWidth - ttRect.width - 8));

    setTooltipStyle({
      position: "fixed",
      top,
      left,
      zIndex: 999,
    });
  }, [active, step, steps, spotStyle]);

  // Missing-target handling: wait, then skip the step safely.
  useEffect(() => {
    if (!active || !currentStep) return;
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (el) {
      missingRef.current.attempts = 0;
      if (missingRef.current.timer) clearTimeout(missingRef.current.timer);
      setTargetGone(false);
      return;
    }
    setTargetGone(true);
    if (missingRef.current.timer) clearTimeout(missingRef.current.timer);
    missingRef.current.timer = setTimeout(() => {
      missingRef.current.attempts += 1;
      if (missingRef.current.attempts >= MISSING_SKIP_ATTEMPTS) {
        // Give up after repeated failures; move on so the tour never traps the user.
        next();
      } else {
        // Force recompute (e.g., target should now be on this route).
        positionElements();
      }
    }, TARGET_WAIT_MS);
    return () => {
      if (missingRef.current.timer) clearTimeout(missingRef.current.timer);
    };
  }, [active, currentStep, step, positionElements, next]);

  async function startTour(tourName, startStep, showLoading) {
    setTour(tourName);
    setStep(startStep || 0);
    setActive(true);
    setStartedManual(tourName === "dashboard");
    setWelcomeOpen(false);
    await persistState(tourName, startStep || 0);
  }

  function persistState(tourName, stepNum) {
    return fetch("/api/onboarding-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTour: tourName, currentStep: stepNum }),
    }).catch(() => {});
  }

  async function next() {
    setTargetGone(false);
    if (step >= steps.length - 1) {
      await finish();
      return;
    }
    const newStep = step + 1;
    setStep(newStep);
    await persistState(tour, newStep);
  }

  function prev() {
    setTargetGone(false);
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      persistState(tour, newStep);
    }
  }

  async function finish() {
    setActive(false);
    setDone(true);
    setSpotStyle(null);
    setTooltipStyle(null);
    fetch("/api/onboarding-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", tour }),
    }).catch(() => {});
  }

  function skip() {
    setActive(false);
    setDone(true);
    setSpotStyle(null);
    setTooltipStyle(null);
    setWelcomeOpen(false);
    fetch("/api/onboarding-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipped: true }),
    }).catch(() => {});
  }

  function handleWelcomeStart() {
    startTour("initial", 0, true);
  }

  function handleManualStart() {
    startTour("dashboard", 0, true);
  }

  if (loading) return null;

  // Manual replay button for completed users (also allows dashboard tour quickly).
  if (done && !active && !welcomeOpen) {
    return (
      <button className="yn-tour-launch" onClick={handleManualStart} aria-label="Take a tour">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Take a tour
      </button>
    );
  }

  // Welcome modal for new members.
  if (welcomeOpen && !active) {
    return (
      <div className="yn-welcome-overlay">
        <div className="yn-welcome-card" role="dialog" aria-modal="true" aria-label="Welcome to Yarnery Lounge">
          <span className="yn-welcome-icon">🧶</span>
          <h2 className="yn-welcome-title">Welcome to Yarnery Lounge</h2>
          <p className="yn-welcome-text">
            Let&apos;s take a quick tour so you know where everything is.
          </p>
          <div className="yn-welcome-actions">
            <button className="yn-btn yn-btn-primary" onClick={handleWelcomeStart}>
              Start Tour
            </button>
            <button className="yn-btn yn-btn-ghost" onClick={skip}>
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!active) return null;

  const isLast = step >= steps.length - 1;

  return (
    <>
      <style>{`
        @keyframes ynTourPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(167,139,250,0); }
        }
        @keyframes ynTourFadeIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ynWelcomeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .yn-tour-launch {
          position: fixed;
          bottom: 90px;
          right: 24px;
          z-index: 996;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid rgba(167,139,250,0.35);
          background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(109,93,246,0.4);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .yn-tour-launch:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(109,93,246,0.5);
        }
        .yn-tour-box {
          width: 300px;
          max-width: calc(100vw - 32px);
          background: #1e1e26;
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.55);
          animation: ynTourFadeIn 0.2s ease;
        }
        .yn-tour-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(109,93,246,0.2);
          color: var(--secondary-light);
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .yn-tour-title {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 700;
          color: #f5f5f5;
        }
        .yn-tour-desc {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.5;
          color: #a8a8b4;
        }
        .yn-tour-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .yn-tour-dots {
          display: flex;
          gap: 4px;
        }
        .yn-tour-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }
        .yn-tour-dotOn {
          background: var(--secondary-light);
          width: 16px;
          border-radius: 3px;
        }
        .yn-tour-actions {
          display: flex;
          gap: 6px;
        }
        .yn-btn {
          padding: 7px 14px;
          border-radius: 10px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s;
        }
        .yn-btn-next {
          background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
          color: #fff;
        }
        .yn-btn-ghost {
          background: rgba(255,255,255,0.08);
          color: #9b9bab;
        }
        .yn-btn-ghost:hover { background: rgba(255,255,255,0.12); }
        .yn-btn-primary {
          background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
          color: #fff;
          padding: 11px 22px;
          font-size: 13px;
        }
        .yn-welcome-overlay {
          position: fixed;
          inset: 0;
          z-index: 1002;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 12vh;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
        }
        .yn-welcome-card {
          width: 360px;
          max-width: calc(100vw - 40px);
          background: #1e1e26;
          border: 1px solid rgba(167,139,250,0.35);
          border-radius: 20px;
          padding: 26px;
          text-align: center;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6);
          animation: ynWelcomeIn 0.25s ease;
        }
        .yn-welcome-icon { font-size: 40px; display: block; margin-bottom: 10px; }
        .yn-welcome-title {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 700;
          color: #f5f5f5;
        }
        .yn-welcome-text {
          margin: 0 0 20px;
          font-size: 14px;
          line-height: 1.5;
          color: #a8a8b4;
        }
        .yn-welcome-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (max-width: 600px) {
          .yn-tour-launch { bottom: 80px; right: 16px; padding: 10px 16px; font-size: 12px; }
          .yn-tour-box { width: calc(100vw - 32px); }
          .yn-tour-box .yn-tour-actions { flex-wrap: wrap; }
        }
      `}</style>

      {spotStyle && (
        <>
          <div style={spotStyle}>
            <div style={{
              position: "absolute",
              inset: -4,
              borderRadius: 18,
              border: "2px solid rgba(167,139,250,0.5)",
              animation: "ynTourPulse 2s ease infinite",
              pointerEvents: "none",
            }} />
          </div>

          {currentStep && currentStep.route && pathname !== currentStep.route && !targetGone ? (
            <div className="yn-tour-box" ref={tooltipRef} style={tooltipStyle}>
              <p className="yn-tour-desc">Loading…</p>
            </div>
          ) : (
            <div className="yn-tour-box" ref={tooltipRef} style={tooltipStyle} role="dialog" aria-label={currentStep?.title}>
              <span className="yn-tour-badge">
                {step + 1} / {steps.length}
              </span>
              <h3 className="yn-tour-title">{currentStep?.title}</h3>
              <p className="yn-tour-desc">{currentStep?.text}</p>
              <div className="yn-tour-footer">
                <div className="yn-tour-dots">
                  {steps.map((_, i) => (
                    <span key={i} className={i === step ? "yn-tour-dot yn-tour-dotOn" : "yn-tour-dot"} />
                  ))}
                </div>
                <div className="yn-tour-actions">
                  <button className="yn-btn yn-btn-ghost" onClick={skip}>Skip</button>
                  {!startedManual && step > 0 && (
                    <button className="yn-btn yn-btn-ghost" onClick={prev}>Back</button>
                  )}
                  <button className="yn-btn yn-btn-next" onClick={next}>
                    {isLast ? "Finish" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}