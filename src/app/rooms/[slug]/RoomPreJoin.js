"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePreviewTracks } from "@livekit/components-react";
import { Mic, MicOff, Video, VideoOff, ChevronDown } from "lucide-react";
import BackButton from "@/components/BackButton";
import styles from "./room.module.css";

export default function RoomPreJoin({
  roomName,
  userName,
  userAvatar,
  subtitle,
  joinLabel,
  busy,
  error,
  isViewer,
  onJoin,
}) {
  const t = useTranslations("rooms");
  const [name, setName] = useState(userName || "");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [devices, setDevices] = useState({ audio: [], video: [] });
  const [deviceError, setDeviceError] = useState("");
  const videoRef = useRef(null);

  const options = useMemo(
    () => ({
      audio: !isViewer && micOn ? { deviceId: audioDeviceId || undefined } : !isViewer,
      video: !isViewer && camOn ? { deviceId: videoDeviceId || undefined } : !isViewer,
    }),
    [micOn, camOn, audioDeviceId, videoDeviceId, isViewer]
  );

  const tracks = usePreviewTracks(options, (err) => {
    setDeviceError(err?.message || t("deviceUnavailable"));
  });

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.enumerateDevices?.().then((list) => {
      if (cancelled) return;
      const audio = list.filter((d) => d.kind === "audioinput");
      const video = list.filter((d) => d.kind === "videoinput");
      setDevices({ audio, video });
      if (!audioDeviceId && audio.length) setAudioDeviceId(audio[0].deviceId || "");
      if (!videoDeviceId && video.length) setVideoDeviceId(video[0].deviceId || "");
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const track = tracks?.find((tr) => tr.kind === "video");
    const el = videoRef.current;
    if (!track || !el) return;
    try {
      track.attach(el);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        track.detach(el);
      } catch {
        /* ignore */
      }
    };
  }, [tracks, videoDeviceId]);

  const hasVideoTrack = !!tracks?.some((tr) => tr.kind === "video");
  const initial = (name || userName || "?").charAt(0).toUpperCase();

  return (
    <div className={styles.prejoinWrap}>
      <BackButton fallback="/rooms" label="Back to rooms" />
      <div className={styles.prejoin}>
        <h1 className={styles.title}>{roomName}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        <div className={styles.preview}>
          {camOn && hasVideoTrack ? (
            <video
              ref={videoRef}
              className={styles.previewVideo}
              autoPlay
              playsInline
              muted
              aria-label={t("cameraPreview")}
            />
          ) : (
            <div className={styles.previewAvatar}>
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.previewAvatarImg} src={userAvatar} alt="" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
          )}
          {deviceError && <p className={styles.previewError}>{deviceError}</p>}
          <div className={styles.previewBadges}>
            <span className={micOn && !isViewer ? styles.previewBadgeOn : styles.previewBadgeOff}>
              {micOn && !isViewer ? "Mic" : "Mic off"}
            </span>
            <span className={camOn && !isViewer ? styles.previewBadgeOn : styles.previewBadgeOff}>
              {camOn && !isViewer ? "Camera" : "Camera off"}
            </span>
          </div>
        </div>

        {isViewer && <p className={styles.watchNote}>{t("watchingOnly")}</p>}

        <label className={styles.fieldLabel} htmlFor="prejoin-name">
          {t("yourName")}
        </label>
        <input
          id="prejoin-name"
          className={styles.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("yourName")}
          aria-label={t("yourName")}
        />

        {!isViewer && (
          <div className={styles.prejoinToggles}>
            <button
              type="button"
              className={micOn ? styles.prejoinToggleOn : styles.prejoinToggle}
              onClick={() => setMicOn((v) => !v)}
              aria-pressed={micOn}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              <span>{micOn ? t("unmuteMic") : t("muteMic")}</span>
            </button>
            <button
              type="button"
              className={camOn ? styles.prejoinToggleOn : styles.prejoinToggle}
              onClick={() => setCamOn((v) => !v)}
              aria-pressed={camOn}
            >
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              <span>{camOn ? t("turnOnCam") : t("turnOffCam")}</span>
            </button>
          </div>
        )}

        {!isViewer && devices.audio.length > 1 && (
          <label className={styles.selectWrap}>
            <span className={styles.selectLabel}>{t("audioInput")}</span>
            <span className={styles.selectBox}>
              <select
                value={audioDeviceId}
                onChange={(e) => setAudioDeviceId(e.target.value)}
                aria-label={t("audioInput")}
              >
                {devices.audio.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || t("microphone")}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className={styles.selectChevron} />
            </span>
          </label>
        )}
        {!isViewer && devices.video.length > 1 && (
          <label className={styles.selectWrap}>
            <span className={styles.selectLabel}>{t("videoInput")}</span>
            <span className={styles.selectBox}>
              <select
                value={videoDeviceId}
                onChange={(e) => setVideoDeviceId(e.target.value)}
                aria-label={t("videoInput")}
              >
                {devices.video.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || t("camera")}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className={styles.selectChevron} />
            </span>
          </label>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.join}
          onClick={() => onJoin(name.trim() || userName, { micOn, camOn, audioDeviceId, videoDeviceId })}
          disabled={busy}
        >
          {busy ? t("joining") : joinLabel}
        </button>
      </div>
    </div>
  );
}
