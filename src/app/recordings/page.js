import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";
import Nav from "@/components/Nav";
import DeleteRecording from "./DeleteRecording";
import TranscribeButton from "./TranscribeButton";
import styles from "./recordings.module.css";

export const dynamic = "force-dynamic";

export default async function RecordingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const snap = await adminDb().collection("recordings").orderBy("startedAt", "desc").get();
  const recordings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const s3Host = process.env.LIVEKIT_EGRESS_S3_PUBLIC_URL || "";

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Recordings</h1>
        <p className={styles.subtitle}>
          Recordings of broadcasts. Start recording from inside a broadcast room.
        </p>

        {recordings.length === 0 ? (
          <p className={styles.empty}>No recordings yet.</p>
        ) : (
          <div className={styles.list}>
            {recordings.map((rec) => (
              <div key={rec.id} className={styles.card}>
                <div>
                  <p className={styles.cardName}>{rec.roomName}</p>
                  <p className={styles.cardMeta}>
                    {rec.status} · started{" "}
                    {new Date(
                      rec.startedAt?.toMillis ? rec.startedAt.toMillis() : rec.startedAt
                    ).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {rec.retentionDays ? ` · kept ${rec.retentionDays} days` : ""}
                    {rec.transcriptionStatus ? ` · transcript: ${rec.transcriptionStatus}` : ""}
                  </p>
                  {rec.filepath && <p className={styles.cardPath}>{rec.filepath}</p>}
                  {rec.transcript && (
                    <details className={styles.transcript}>
                      <summary className={styles.transcriptSummary}>View transcript</summary>
                      <p className={styles.transcriptBody}>{rec.transcript}</p>
                    </details>
                  )}
                </div>
                {rec.status === "complete" && s3Host && (
                  <a className={styles.download} href={`${s3Host}/${rec.filepath}`} target="_blank" rel="noreferrer">
                    Download
                  </a>
                )}
                {userDoc?.role === "owner" && rec.status === "complete" && rec.transcriptionStatus !== "complete" && (
                  <TranscribeButton id={rec.id} busyLabel="Transcribing…" />
                )}
                {userDoc?.role === "owner" && (
                  <DeleteRecording id={rec.id} disabled={rec.status === "active" || rec.status === "stopping"} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
