"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useParticipants,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import BackButton from "@/components/BackButton";
import AmbientAudio from "@/components/AmbientAudio";
import RoomBackground from "@/components/RoomBackground";
import RoomMusicPicker from "@/components/RoomMusicPicker";
import styles from "./room.module.css";

function currentTime() {
  return Date.now();
}

function ConnectionStatus() {
  const state = useConnectionState();
  const label =
    state === "connected"
      ? ""
      : state === "connecting" || state === "reconnecting"
      ? "Reconnecting…"
      : state === "disconnected"
      ? "Disconnected"
      : "";
  if (!label) return null;
  return (
    <div className={styles.connectionStatus}>
      <span className={styles.connectionDot} data-state={state} />
      {label}
    </div>
  );
}

function HostControls({ roomId, isHost }) {
  const participants = useParticipants();
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const remote = participants.filter((p) => !p.isLocal);

  async function act(identity, action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/rooms/${roomId}/participants/${encodeURIComponent(identity)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function endRoom() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId}/end`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not end the room");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.hostControls}>
        <button
          type="button"
          className={styles.hostButton}
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          Participants ({remote.length})
        </button>
        {isHost && (
          <button
            type="button"
            className={styles.hostButtonDanger}
            onClick={endRoom}
            disabled={busy}
          >
            {busy ? "…" : "End room"}
          </button>
        )}
        {error && <p className={styles.hostError}>{error}</p>}
      </div>
      {panelOpen && (
        <div className={styles.participantPanel}>
          <p className={styles.participantPanelTitle}>Participants</p>
          {remote.length === 0 ? (
            <p className={styles.participantName}>No other participants yet.</p>
          ) : (
            remote.map((p) => {
              const canPublish = p.permissions ? p.permissions.canPublish !== false : true;
              return (
                <div key={p.identity} className={styles.participantRow}>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.participantName}>
                      {p.name || p.identity}
                    </p>
                    <p className={styles.participantTag}>
                      {canPublish ? "speaker" : "viewer"}
                    </p>
                  </div>
                  {isHost && (
                    <div className={styles.participantActions}>
                      {!canPublish ? (
                        <button
                          type="button"
                          className={styles.participantBtn}
                          onClick={() => act(p.identity, "speaker")}
                          disabled={busy}
                        >
                          Speaker
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.participantBtn}
                          onClick={() => act(p.identity, "viewer")}
                          disabled={busy}
                        >
                          Viewer
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.participantBtn} ${styles.participantBtnDanger}`}
                        onClick={() => act(p.identity, "remove")}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

export default function RoomClient({ roomName, slug, roomId, kind, role, opensAt, isHost, isCoHost, canRecord, alwaysOn, musicUrl, musicPlaying, musicFileId }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [now, setNow] = useState(() => currentTime());
  const [statusMsg, setStatusMsg] = useState("");

  const tokenRef = useRef("");
  const reconnectTimer = useRef(null);
  const refreshTimer = useRef(null);
  const reconnectCountRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(currentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isBroadcast = kind === "broadcast";
  const isOwner = role === "owner";
  const isStaff = role === "owner" || role === "moderator";
  const canToggleRecording = isBroadcast && canRecord;
  const waiting = Boolean(opensAt) && !isHost && now < opensAt;
  const waitSeconds = waiting ? Math.max(0, Math.ceil((opensAt - now) / 1000)) : 0;

  function formatWait(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  async function fetchToken() {
    const res = await fetch("/api/livekit/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (res.status === 401) {
      router.push("/login");
      return null;
    }
    if (res.status === 403) {
      router.push("/pricing");
      return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to join room");
    return data;
  }

  function scheduleRefresh(expiresInSeconds) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const refreshAt = Math.max(60, (expiresInSeconds || 3600) * 0.75) * 1000;
    refreshTimer.current = setTimeout(async () => {
      try {
        const data = await fetchToken();
        if (data) {
          setToken(data.token);
          tokenRef.current = data.token;
          scheduleRefresh(expiresInSeconds);
        }
      } catch {
        scheduleRefresh(expiresInSeconds);
      }
    }, refreshAt);
  }

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  async function handleJoin() {
    setBusy(true);
    setError("");
    try {
      const data = await fetchToken();
      if (!data) return;
      setToken(data.token);
      tokenRef.current = data.token;
      setServerUrl(data.serverUrl);
      setIsViewer(data.kind === "broadcast" && data.canPublish === false);
      setJoined(true);
      reconnectCountRef.current = 0;
      scheduleRefresh(alwaysOn ? 86400 : 14400);
      onAuthStateChanged(auth, (user) => {
        if (user && roomId) {
          addDoc(collection(db, "roomEvents"), {
            userId: user.uid,
            roomId,
            roomName,
            joinedAt: new Date(),
          }).catch(() => {});
        }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const handleDisconnect = useCallback(() => {
    if (!alwaysOn) {
      router.push("/rooms");
      return;
    }
    setStatusMsg("Connection lost. Reconnecting…");
    const count = reconnectCountRef.current;
    const delay = Math.min(1000 * 2 ** count, 30000);
    reconnectTimer.current = setTimeout(async () => {
      try {
        const data = await fetchToken();
        if (data) {
          setToken(data.token);
          tokenRef.current = data.token;
          setServerUrl(data.serverUrl);
          reconnectCountRef.current = count + 1;
          setStatusMsg("");
          scheduleRefresh(alwaysOn ? 86400 : 14400);
        }
      } catch {
        reconnectCountRef.current = count + 1;
        handleDisconnect();
      }
    }, delay);
  }, [alwaysOn, router, slug]);

  useEffect(() => {
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  async function toggleRecording() {
    if (recordBusy) return;
    setRecordBusy(true);
    setRecordError("");
    try {
      const res = await fetch("/api/livekit/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: recording ? "stop" : "start" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recording failed");
      setRecording(!recording);
    } catch (err) {
      setRecordError(err.message);
    } finally {
      setRecordBusy(false);
    }
  }

  if (waiting) {
    return (
      <main className={styles.page}>
        <RoomBackground show={alwaysOn} musicActive={!!musicPlaying} />
        <div className={styles.container}>
          <div className={styles.prejoinWrap}>
            <BackButton fallback="/rooms" label="Back to rooms" />
            <div className={styles.prejoin}>
              <h1 className={styles.title}>{roomName}</h1>
              <p className={styles.subtitle}>This room opens at the scheduled time.</p>
              <p className={styles.countdown} role="timer" aria-label="Time until the room opens">
                {formatWait(waitSeconds)}
              </p>
              <p className={styles.waitHint}>
                {opensAt
                  ? new Date(opensAt).toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
              </p>
              <p className={styles.waitHint}>
                We&apos;ll let you in automatically when it starts.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className={styles.page}>
        <RoomBackground show={alwaysOn} musicActive={!!musicPlaying} />
        <div className={styles.container}>
          <div className={styles.prejoinWrap}>
            <BackButton fallback="/rooms" label="Back to rooms" />
            <div className={styles.prejoin}>
              <h1 className={styles.title}>{roomName}</h1>
              {alwaysOn ? (
                <p className={styles.subtitle}>
                  Always open — drop in anytime. A cozy lounge video plays while you&apos;re here.
                </p>
              ) : isBroadcast ? (
                <p className={styles.subtitle}>
                  This is a live broadcast. Join to watch the stream.
                </p>
              ) : (
                <p className={styles.subtitle}>
                  You&apos;re about to join the live room. Your camera and mic will be used.
                </p>
              )}
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles.join} onClick={handleJoin} disabled={busy}>
                {busy ? "Joining…" : alwaysOn ? "Drop in" : isBroadcast ? "Watch broadcast" : "Join room"}
              </button>
              {canRecord && (
                <div className={styles.recordBox}>
                  {recordError && <p className={styles.error}>{recordError}</p>}
                  <button
                    className={recording ? styles.recordStop : styles.record}
                    onClick={toggleRecording}
                    disabled={recordBusy}
                  >
                    {recordBusy
                      ? "…"
                      : recording
                      ? "Stop recording"
                      : "Start recording"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <RoomBackground show={alwaysOn} musicActive={!!musicPlaying} />
      <div className={styles.roomWrap} style={{ position: "relative" }}>
        <AmbientAudio active={alwaysOn} roomId={roomId} musicUrl={musicUrl} musicPlaying={musicPlaying} musicFileId={musicFileId} hasVideoBackdrop={alwaysOn} />
        {alwaysOn && isStaff && <RoomMusicPicker isStaff={isStaff} />}
        {statusMsg && (
          <div className={styles.reconnectBanner}>
            {statusMsg}
          </div>
        )}
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={!isViewer}
          audio={!isViewer}
          options={{
            adaptiveStream: true,
            dynacast: true,
            disconnectOnPageLeave: false,
            expWebsocketTimeout: 15000,
          }}
          onDisconnected={handleDisconnect}
        >
          {isViewer && (
            <p className={styles.viewerBanner}>
              Watching as a viewer — only the host can broadcast.
            </p>
          )}
          <ConnectionStatus />
          {(isHost || isCoHost) && <HostControls roomId={roomId} isHost={isHost} />}
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </main>
  );
}
