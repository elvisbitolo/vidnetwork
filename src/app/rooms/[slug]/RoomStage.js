"use client";

import { useParticipants, useSpeakingParticipants, VideoTrack, useTrackByName } from "@livekit/components-react";
import { useTranslations } from "next-intl";
import { Track } from "livekit-client";
import { Mic, MicOff, Hand, Music4, VideoOff } from "lucide-react";
import { useRoomData } from "./RoomDataProvider";
import styles from "./room.module.css";

function PersonAvatar({ name, avatar, size = "md" }) {
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={size === "sm" ? styles.personAvatarImgSm : styles.personAvatarImg} src={avatar} alt="" />;
  }
  return (
    <span className={size === "sm" ? styles.personAvatarSm : styles.personAvatar}>
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function VideoTile({ participant, speaking }) {
  const trackRef = useTrackByName(Track.Source.Camera, participant);
  const hasVideo = trackRef?.publication?.track;
  return (
    <div className={styles.tileVideo}>
      {hasVideo ? (
        <VideoTrack trackRef={trackRef} className={styles.tileVideoEl} />
      ) : (
        <span className={styles.tileVideoPlaceholder}>
          {(participant.name || participant.identity || "?").charAt(0).toUpperCase()}
        </span>
      )}
      {speaking && <span className={styles.tileSpeakingRing} aria-hidden="true" />}
    </div>
  );
}

export default function RoomStage({ hostId, currentUserId, isCoHost, hideOffCamera = false, onShowPeople }) {
  const t = useTranslations("rooms");
  const participants = useParticipants();
  const speakers = useSpeakingParticipants();
  const { raisedHands, floatingReactions } = useRoomData();

  const speakerIds = new Set(speakers.map((p) => p.identity));
  const withPublish = participants.filter((p) =>
    p.permissions ? p.permissions.canPublish !== false : true
  );
  const visibleSpeakers = hideOffCamera
    ? withPublish.filter((p) => p.identity === hostId || p.isCameraEnabled !== false)
    : withPublish;

  return (
    <>
      <div className={styles.stage} aria-label={t("stage")}>
        <div className={styles.stageGrid}>
          {visibleSpeakers.length === 0 && (
            <div className={styles.stageEmpty}>
              <Music4 size={28} />
              <p>{t("waitingForSpeakers")}</p>
            </div>
          )}
          {visibleSpeakers.map((p) => {
            const isMe = p.identity === currentUserId;
            const isActive = speakerIds.has(p.identity);
            const isHostUser = p.identity === hostId;
            const handRaised = !!raisedHands[p.identity];
            return (
              <div
                key={p.identity}
                className={[
                  styles.tile,
                  isActive ? styles.tileActive : "",
                  isMe ? styles.tileMe : "",
                ].filter(Boolean).join(" ")}
              >
                <VideoTile participant={p} speaking={isActive} />
                <div className={styles.tileFooter}>
                  <span className={styles.tileName}>
                    {p.name || p.identity}
                    {isMe && <span className={styles.tileYou}>{t("you")}</span>}
                    {isHostUser && <span className={styles.tileHostBadge}>{t("host")}</span>}
                  </span>
                  <span
                    className={p.isMicrophoneEnabled === false ? `${styles.tileMic} ${styles.tileMicOff}` : styles.tileMic}
                    title={p.isMicrophoneEnabled === false ? t("muted") : t("micOn")}
                  >
                    {p.isMicrophoneEnabled === false ? <MicOff size={14} /> : <Mic size={14} />}
                  </span>
                </div>
                {handRaised && (
                  <span className={styles.tileHand}>
                    <Hand size={14} /> {t("raisedHand")}
                  </span>
                )}
                {p.isCameraEnabled === false && (
                  <span className={styles.tileCamOff}>
                    <VideoOff size={14} /> {t("cameraOff")}
                  </span>
                )}
                {isActive && (
                  <span className={styles.tileSpeaking} aria-live="polite">
                    {t("speaking")}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.reactionsLayer} aria-hidden="true">
          {floatingReactions.slice(-6).map((r) => (
            <span key={r.id} className={r.sent ? `${styles.floatReaction} ${styles.floatReactionSelf}` : styles.floatReaction}>
              {r.emoji}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.peopleStrip}>
        <button
          type="button"
          className={styles.peopleStripMain}
          onClick={() => onShowPeople && onShowPeople()}
        >
          <div className={styles.peopleAvatars}>
            {participants.slice(0, 7).map((p) => (
              <PersonAvatar key={p.identity} name={p.name || p.identity} avatar={p.avatar} size="sm" />
            ))}
          </div>
          <span className={styles.peopleCount}>{t("peopleInRoom", { count: participants.length })}</span>
          <span className={styles.peopleView}>{t("viewAll")}</span>
        </button>
      </div>
    </>
  );
}
