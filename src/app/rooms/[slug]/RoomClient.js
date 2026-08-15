"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import BackButton from "@/components/BackButton";
import styles from "./room.module.css";

function currentTime() {
  return Date.now();
}

export default function RoomClient({ roomName, slug, roomId, kind, role, opensAt, isHost }) {
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

  useEffect(() => {
    const timer = setInterval(() => setNow(currentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isBroadcast = kind === "broadcast";
  const isOwner = role === "owner";
  const waiting = Boolean(opensAt) && !isHost && now < opensAt;
  const waitSeconds = waiting ? Math.max(0, Math.ceil((opensAt - now) / 1000)) : 0;

  function formatWait(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

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

  async function handleJoin() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        router.push("/pricing");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join room");
      setToken(data.token);
      setServerUrl(data.serverUrl);
      setIsViewer(data.kind === "broadcast" && data.canPublish === false);
      setJoined(true);
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

  if (waiting) {
    return (
      <main className={styles.page}>
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
        <div className={styles.container}>
          <div className={styles.prejoinWrap}>
            <BackButton fallback="/rooms" label="Back to rooms" />
            <div className={styles.prejoin}>
              <h1 className={styles.title}>{roomName}</h1>
              {isBroadcast ? (
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
                {busy ? "Joining…" : isBroadcast ? "Watch broadcast" : "Join room"}
              </button>
              {isBroadcast && isOwner && (
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
      <div className={styles.roomWrap}>
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          video={!isViewer}
          audio={!isViewer}
          options={{ adaptiveStream: true, dynacast: true }}
          onDisconnected={() => router.push("/rooms")}
        >
          {isViewer && (
            <p className={styles.viewerBanner}>
              Watching as a viewer — only the host can broadcast.
            </p>
          )}
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </main>
  );
}
