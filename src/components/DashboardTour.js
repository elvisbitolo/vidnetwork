"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const TOUR_STEPS = [
  {
    target: "tour-sidebar",
    title: "Navigate with the Sidebar",
    text: "Use the sidebar to jump between Dashboard, Feed, Rooms, Courses, Events and more. It collapses on desktop and slides open on mobile.",
    placement: "right",
  },
  {
    target: "tour-welcome",
    title: "Your Welcome Banner",
    text: "A quick snapshot of your status — your name, subscription tier, and a shortcut to set up your profile if you haven't yet.",
    placement: "bottom",
  },
  {
    target: "tour-actions",
    title: "Quick Actions",
    text: "Create a post, start a live room, or RSVP to an event — all in one click.",
    placement: "bottom",
  },
  {
    target: "tour-kpis",
    title: "Key Metrics",
    text: "Track members, live viewers, revenue or your points, and weekly engagement at a glance.",
    placement: "bottom",
  },
  {
    target: "tour-activity",
    title: "Recent Activity",
    text: "See the latest posts, comments and interactions across the community in real time.",
    placement: "right",
  },
  {
    target: "tour-rooms",
    title: "Upcoming Rooms",
    text: "See which live video rooms are scheduled next. Click to RSVP or join directly when they go live.",
    placement: "right",
  },
  {
    target: "tour-search",
    title: "Search Everything",
    text: "Find members, posts, courses and rooms from the search bar at the top of the dashboard.",
    placement: "bottom",
  },
];

export default function DashboardTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);
  const [done, setDone] = useState(true);
  const tooltipRef = useRef(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("vn_dashboard_tour_done");
      if (v === "1") { setDone(true); return; }
    } catch {}
    fetch("/api/tour")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.dashboard) {
          setDone(true);
          try { localStorage.setItem("vn_dashboard_tour_done", "1"); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const computeSpot = useCallback(() => {
    const s = TOUR_STEPS[step];
    if (!s) return null;
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, [step]);

  useEffect(() => {
    if (!active) return;
    const r = computeSpot();
    setSpot(r);
    if (r && tooltipRef.current) {
      const tt = tooltipRef.current;
      const s = TOUR_STEPS[step];
      const pad = 12;
      let top, left;
      if (s.placement === "bottom") {
        top = r.y + r.h + pad;
        left = r.x + r.w / 2 - tt.offsetWidth / 2;
      } else {
        top = r.y + r.h / 2 - tt.offsetHeight / 2;
        left = r.x + r.w + pad;
      }
      left = Math.max(8, Math.min(left, window.innerWidth - tt.offsetWidth - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tt.offsetHeight - 8));
      tt.style.top = `${top}px`;
      tt.style.left = `${left}px`;
    }
  }, [active, step, computeSpot]);

  useEffect(() => {
    if (!active) return;
    function onResize() {
      const r = computeSpot();
      setSpot(r);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, computeSpot]);

  function start() {
    setStep(0);
    setActive(true);
  }

  function next() {
    if (step >= TOUR_STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function finish() {
    setActive(false);
    setDone(true);
    try { localStorage.setItem("vn_dashboard_tour_done", "1"); } catch {}
    fetch("/api/tour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tour: "dashboard", completed: true }),
    }).catch(() => {});
  }

  if (done) return null;

  return (
    <>
      <style>{`
        @keyframes tourPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(109,93,246,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(109,93,246,0); }
        }
        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tour-start-btn {
          position: fixed;
          bottom: 90px;
          right: 24px;
          z-index: 998;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid rgba(167,139,250,0.35);
          background: linear-gradient(135deg, #6d5df6, #a78bfa);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(109,93,246,0.4);
          animation: tourPulse 2.5s ease infinite;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tour-start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(109,93,246,0.5);
        }
        .tour-overlay {
          position: fixed;
          inset: 0;
          z-index: 997;
          background: rgba(0,0,0,0.6);
          pointer-events: auto;
        }
        .tour-spotlight {
          position: fixed;
          z-index: 998;
          border-radius: 12px;
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
          pointer-events: none;
        }
        .tour-spotlight-inner {
          position: absolute;
          inset: -6px;
          border-radius: 16px;
          border: 2px solid rgba(167,139,250,0.6);
          animation: tourPulse 2s ease infinite;
          pointer-events: none;
        }
        .tour-tooltip {
          position: fixed;
          z-index: 999;
          width: 320px;
          max-width: calc(100vw - 32px);
          background: #1e1e26;
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.6);
          animation: tourFadeIn 0.25s ease;
          pointer-events: auto;
        }
        .tour-step-num {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(109,93,246,0.2);
          color: #a78bfa;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .tour-title {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 700;
          color: #f5f5f5;
        }
        .tour-text {
          margin: 0 0 16px;
          font-size: 13px;
          line-height: 1.55;
          color: #b0b0b8;
        }
        .tour-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .tour-progress {
          display: flex;
          gap: 4px;
        }
        .tour-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transition: background 0.2s;
        }
        .tour-dot-active {
          background: #a78bfa;
          width: 18px;
          border-radius: 3px;
        }
        .tour-btns {
          display: flex;
          gap: 6px;
        }
        .tour-btn {
          padding: 7px 14px;
          border-radius: 10px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .tour-btn:hover { transform: translateY(-1px); }
        .tour-btnPrimary {
          background: linear-gradient(135deg, #6d5df6, #a78bfa);
          color: #fff;
        }
        .tour-btnGhost {
          background: rgba(255,255,255,0.08);
          color: #9b9bab;
        }
        .tour-btnGhost:hover { background: rgba(255,255,255,0.12); }
        @media (max-width: 600px) {
          .tour-tooltip { width: calc(100vw - 24px); }
        }
      `}</style>

      {!active && (
        <button className="tour-start-btn" onClick={start}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Take a tour
        </button>
      )}

      {active && (
        <>
          <div className="tour-overlay" onClick={finish} />
          {spot && (
            <div
              className="tour-spotlight"
              style={{ left: spot.x - 6, top: spot.y - 6, width: spot.w + 12, height: spot.h + 12 }}
            >
              <div className="tour-spotlight-inner" />
            </div>
          )}
          <div className="tour-tooltip" ref={tooltipRef}>
            <span className="tour-step-num">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <h3 className="tour-title">{TOUR_STEPS[step].title}</h3>
            <p className="tour-text">{TOUR_STEPS[step].text}</p>
            <div className="tour-footer">
              <div className="tour-progress">
                {TOUR_STEPS.map((_, i) => (
                  <span key={i} className={i === step ? "tour-dot tour-dot-active" : "tour-dot"} />
                ))}
              </div>
              <div className="tour-btns">
                <button className="tour-btn tour-btnGhost" onClick={finish}>Skip</button>
                {step > 0 && (
                  <button className="tour-btn tour-btnGhost" onClick={prev}>Back</button>
                )}
                <button className="tour-btn tour-btnPrimary" onClick={next}>
                  {step >= TOUR_STEPS.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
