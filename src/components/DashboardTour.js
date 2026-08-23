"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const TOUR_STEPS = [
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

export default function DashboardTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(true);
  const [spotStyle, setSpotStyle] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState(null);
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

  const positionElements = useCallback(() => {
    const s = TOUR_STEPS[step];
    if (!s) return;
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) return;

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
        border: "2.5px solid #a78bfa",
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
        zIndex: 998,
        pointerEvents: "none",
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      });
    });
  }, [step]);

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

  useEffect(() => {
    if (!active || !tooltipRef.current) return;
    const tt = tooltipRef.current;
    const s = TOUR_STEPS[step];
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
  }, [active, step]);

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
    setSpotStyle(null);
    setTooltipStyle(null);
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0.6); }
          50% { box-shadow: 0 0 0 6px rgba(167,139,250,0); }
        }
        @keyframes tourFadeIn {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .tour-start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(109,93,246,0.5);
        }
        .tour-tooltip-box {
          width: 300px;
          max-width: calc(100vw - 32px);
          background: #1e1e26;
          border: 1px solid rgba(167,139,250,0.3);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.55);
          animation: tourFadeIn 0.2s ease;
        }
        .tour-step-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(109,93,246,0.2);
          color: #a78bfa;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .tour-heading {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 700;
          color: #f5f5f5;
        }
        .tour-desc {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.5;
          color: #a8a8b4;
        }
        .tour-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .tour-dots {
          display: flex;
          gap: 4px;
        }
        .tour-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }
        .tour-dotOn {
          background: #a78bfa;
          width: 16px;
          border-radius: 3px;
        }
        .tour-actions {
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
          transition: background 0.12s;
        }
        .tour-btnNext {
          background: linear-gradient(135deg, #6d5df6, #a78bfa);
          color: #fff;
        }
        .tour-btnSkip {
          background: rgba(255,255,255,0.08);
          color: #9b9bab;
        }
        .tour-btnSkip:hover { background: rgba(255,255,255,0.12); }
        @media (max-width: 600px) {
          .tour-start-btn { bottom: 80px; right: 16px; padding: 10px 16px; font-size: 12px; }
          .tour-tooltip-box { width: calc(100vw - 32px); }
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

      {active && spotStyle && (
        <>
          <div style={spotStyle}>
            <div style={{
              position: "absolute",
              inset: -4,
              borderRadius: 18,
              border: "2px solid rgba(167,139,250,0.5)",
              animation: "tourPulse 2s ease infinite",
              pointerEvents: "none",
            }} />
          </div>

          <div className="tour-tooltip-box" ref={tooltipRef} style={tooltipStyle}>
            <span className="tour-step-badge">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <h3 className="tour-heading">{TOUR_STEPS[step].title}</h3>
            <p className="tour-desc">{TOUR_STEPS[step].text}</p>
            <div className="tour-footer">
              <div className="tour-dots">
                {TOUR_STEPS.map((_, i) => (
                  <span key={i} className={i === step ? "tour-dot tour-dotOn" : "tour-dot"} />
                ))}
              </div>
              <div className="tour-actions">
                <button className="tour-btn tour-btnSkip" onClick={finish}>Skip</button>
                {step > 0 && (
                  <button className="tour-btn tour-btnSkip" onClick={prev}>Back</button>
                )}
                <button className="tour-btn tour-btnNext" onClick={next}>
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
