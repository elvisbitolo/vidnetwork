"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocalParticipant } from "@livekit/components-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Hand,
  SmilePlus,
  Users,
  MessageCircle,
  Settings,
  MoreHorizontal,
  LogOut,
  Captions,
  Maximize,
  Volume2,
  SwitchCamera,
} from "lucide-react";
import { useRoomData } from "./RoomDataProvider";
import styles from "./room.module.css";

const REACTION_EMOJI = ["❤️", "👍", "👏", "🎉", "😂", "🙌"];

function TooltipBtn({ title, className, onClick, children, active }) {
  return (
    <button
      type="button"
      className={[styles.ctrlBtn, className || "", active ? styles.ctrlActive : ""].filter(Boolean).join(" ")}
      onClick={onClick}
      aria-label={title}
      title={title}
    >
      {children}
    </button>
  );
}

export default function RoomControls({
  isHost,
  onOpenParticipants,
  onOpenChat,
  onLeave,
  chatOpen,
  participantsOpen,
  hideOffCamera = false,
  onToggleHideOffCamera = () => {},
}) {
  const t = useTranslations("rooms");
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const { myHandRaised, toggleHand, sendReaction } = useRoomData();
  const [showReactions, setShowReactions] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const reactionsRef = useRef(null);

  function toggleMic() {
    if (localParticipant && typeof localParticipant.setMicrophoneEnabled === "function") {
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  }
  function toggleCam() {
    if (localParticipant && typeof localParticipant.setCameraEnabled === "function") {
      localParticipant.setCameraEnabled(!isCameraEnabled);
    }
  }
  function toggleScreen() {
    if (localParticipant && typeof localParticipant.setScreenShareEnabled === "function") {
      localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    }
  }

  return (
    <div className={styles.controlsBar}>
      <div className={styles.controlsLeft}>
        <TooltipBtn title={isMicrophoneEnabled ? t("muteMic") : t("unmuteMic")} onClick={toggleMic} className={isMicrophoneEnabled ? "" : styles.ctrlDanger}>
          {isMicrophoneEnabled ? <Mic size={18} /> : <MicOff size={18} />}
        </TooltipBtn>
        <TooltipBtn title={isCameraEnabled ? t("turnOffCam") : t("turnOnCam")} onClick={toggleCam} className={isCameraEnabled ? "" : styles.ctrlDanger}>
          {isCameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        </TooltipBtn>
        <TooltipBtn title={t("shareScreen")} onClick={toggleScreen} className={isScreenShareEnabled ? styles.ctrlActive : ""}>
          <MonitorUp size={18} />
        </TooltipBtn>
        <TooltipBtn title={t("raiseHand")} onClick={toggleHand} className={myHandRaised ? styles.ctrlActive : ""}>
          <Hand size={18} />
        </TooltipBtn>
        <div className={styles.ctrlWrap} ref={reactionsRef}>
          <TooltipBtn title={t("reactions")} onClick={() => setShowReactions((v) => !v)}>
            <SmilePlus size={18} />
          </TooltipBtn>
          {showReactions && (
            <div className={styles.reactionsPanel}>
              {REACTION_EMOJI.map((e) => (
                <button key={e} type="button" className={styles.reactionsEmoji} onClick={() => { sendReaction(e); setShowReactions(false); }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.controlsRight}>
        <TooltipBtn title={t("participants")} onClick={onOpenParticipants} active={participantsOpen}>
          <Users size={18} />
        </TooltipBtn>
        <TooltipBtn title={t("chat")} onClick={onOpenChat} active={chatOpen}>
          <MessageCircle size={18} />
        </TooltipBtn>
        <TooltipBtn title={t("settings")} onClick={() => setShowSettings((v) => !v)}>
          <Settings size={18} />
        </TooltipBtn>
        <div className={styles.ctrlWrap}>
          <TooltipBtn title={t("more")} onClick={() => setShowMore((v) => !v)}>
            <MoreHorizontal size={18} />
          </TooltipBtn>
          {showMore && (
            <div className={styles.moreMenu}>
              {isHost && <p className={styles.moreMenuTitle}>{t("hostControls")}</p>}
              <button type="button" className={styles.moreItem} onClick={() => setShowSettings(true)}>
                <Captions size={15} /> {t("captions")}
              </button>
              <button type="button" className={styles.moreItem}>
                <Maximize size={15} /> {t("fullscreen")}
              </button>
              <button type="button" className={styles.moreItem} onClick={toggleScreen}>
                <MonitorUp size={15} /> {t("shareScreen")}
              </button>
              <button
                type="button"
                className={[styles.moreItem, hideOffCamera ? styles.moreItemActive : ""].filter(Boolean).join(" ")}
                onClick={onToggleHideOffCamera}
              >
                <VideoOff size={15} /> {t("hideOffCamera")}
              </button>
              <button type="button" className={styles.moreItem} onClick={() => setShowSettings(true)}>
                <Volume2 size={15} /> {t("audioSettings")}
              </button>
              <button type="button" className={styles.moreItem}>
                <SwitchCamera size={15} /> {t("videoSettings")}
              </button>
              <div className={styles.moreDivider} />
              <button type="button" className={`${styles.moreItem} ${styles.moreDanger}`} onClick={onLeave}>
                <LogOut size={15} /> {t("leaveRoom")}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className={[styles.ctrlBtn, styles.ctrlLeave].join(" ")}
          onClick={onLeave}
          title={t("leaveRoom")}
          aria-label={t("leaveRoom")}
        >
          <LogOut size={18} />
        </button>
      </div>

      {showSettings && (
        <button type="button" className={styles.settingsBackdrop} onClick={() => setShowSettings(false)} aria-label={t("close")}>
          <div className={styles.settingsPanel} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.settingsTitle}>{t("settingsTitle")}</h4>
            <p className={styles.settingsRow}>
              <Volume2 size={16} /> {t("audioSettings")} — {t("comingSoon")}
            </p>
            <p className={styles.settingsRow}>
              <SwitchCamera size={16} /> {t("videoSettings")} — {t("comingSoon")}
            </p>
            <p className={styles.settingsRow}>
              <Captions size={16} /> {t("captions")} — {t("comingSoon")}
            </p>
            <button type="button" className={styles.settingsClose} onClick={() => setShowSettings(false)}>
              {t("close")}
            </button>
          </div>
        </button>
      )}
    </div>
  );
}
