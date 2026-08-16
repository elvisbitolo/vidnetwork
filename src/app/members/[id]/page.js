import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";
import { getRecognitionCount, listRecognitions } from "@/lib/server/recognition";
import { RECOGNITION_VALUES, recognitionCountLabel } from "@/lib/server/recognition-core";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import RecognitionForm from "./RecognitionForm";
import styles from "./profile.module.css";

export const dynamic = "force-dynamic";

function toSerializable(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  return value;
}

export default async function MemberProfilePage({ params }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const viewerDoc = await getUserDoc(viewer.uid);
  const sub = await getSubscription(viewer.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const userRef = adminDb().collection("users").doc(id);
  const [memberDoc, postsSnap, recognitionCount, recognitions] = await Promise.all([
    userRef.get(),
    adminDb().collection("posts").where("authorId", "==", id).get(),
    getRecognitionCount(id),
    listRecognitions(id, 10),
  ]);

  if (!memberDoc.exists) {
    return (
        <Nav role={viewerDoc?.role}>
        <div className={styles.container}>
          <h1 className={styles.title}>Member not found</h1>
          <p className={styles.subtitle}>This member isn&apos;t available.</p>
          <Link className={styles.link} href="/members">Back to members</Link>
        </div>
</Nav>
    );
  }

  const member = memberDoc.data();
  const posts = postsSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toSerializable(doc.data().createdAt),
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 20);

  const isSelf = viewer.uid === id;

  return (
      <Nav role={viewerDoc?.role}>
      <div className={styles.container}>
        <BackButton fallback="/members" label="All members" />

        <div className={styles.header}>
          <div className={styles.avatar}>
            {(member.name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className={styles.headerBody}>
            <h1 className={styles.title}>
              {member.name}
              {member.role === "owner" && <span className={styles.ownerBadge}>Owner</span>}
            </h1>
            {member.headline && <p className={styles.headline}>{member.headline}</p>}
            {member.location && <p className={styles.location}>{member.location}</p>}
            {(member.state || member.country) && (
              <p className={styles.location}>
                {[member.state, member.country].filter(Boolean).join(", ")}
              </p>
            )}
            {member.bio && <p className={styles.bio}>{member.bio}</p>}
            {recognitionCount > 0 && (
              <p className={styles.recognitionCount}>{recognitionCountLabel(recognitionCount)}</p>
            )}
            {!isSelf && (
              <Link className={styles.messageBtn} href={`/chat?with=${id}`}>
                Message
              </Link>
            )}
          </div>
        </div>

        {!isSelf && <RecognitionForm toUid={id} values={RECOGNITION_VALUES} />}

        {recognitions.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>Recognitions</h2>
            <div className={styles.postList}>
              {recognitions.map((rec) => (
                <div key={rec.id} className={styles.post}>
                  <p className={styles.postText}>
                    <Link className={styles.link} href={`/members/${rec.fromUid}`}>
                      {rec.fromName}
                    </Link>{" "}
                    recognized for being <strong>{rec.value}</strong>
                  </p>
                  {rec.note && <p className={styles.bio}>{rec.note}</p>}
                  <p className={styles.postMeta}>
                    {new Date(rec.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className={styles.sectionTitle}>Recent posts</h2>
        {posts.length === 0 ? (
          <p className={styles.empty}>No posts yet.</p>
        ) : (
          <div className={styles.postList}>
            {posts.map((post) => (
              <article key={post.id} className={styles.post}>
                <p className={styles.postText}>{post.text}</p>
                {post.imageUrl && <img src={post.imageUrl} alt="" className={styles.postImage} />}
                <p className={styles.postMeta}>
                  {post.createdAt ? new Date(post.createdAt.toMillis ? post.createdAt.toMillis() : post.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }) : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
</Nav>
  );
}
