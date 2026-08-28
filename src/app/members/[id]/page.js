import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";
import { getRecognitionCount, listRecognitions } from "@/lib/server/recognition";
import { RECOGNITION_VALUES, recognitionCountLabel } from "@/lib/server/recognition-core";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import RecognitionForm from "./RecognitionForm";
import StickerDisplay from "./StickerDisplay";
import styles from "./profile.module.css";

export const dynamic = "force-dynamic";

function toSerializable(value) {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  return value;
}

const CRAFT_LABELS = {
  crochet: "Crochet",
  knitting: "Knitting",
  weaving: "Weaving",
  spinning: "Spinning",
  dyeing: "Dyeing",
  embroidery: "Embroidery",
  macrame: "Macrame",
};

export default async function MemberProfilePage({ params }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const viewerDoc = await getUserDoc(viewer.uid);
  const sub = await getAccessSub(viewer.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const userRef = adminDb().collection("users").doc(id);
  const [memberDoc, postsSnap, recognitionCount, recognitions, stickersSnap] = await Promise.all([
    userRef.get(),
    adminDb().collection("posts").where("authorId", "==", id).get(),
    getRecognitionCount(id),
    listRecognitions(id, 10),
    adminDb().collection("stickers").where("toUid", "==", id).get(),
  ]);

  const stickerSummary = {};
  stickersSnap.docs.forEach((doc) => {
    const d = doc.data();
    stickerSummary[d.type] = (stickerSummary[d.type] || 0) + 1;
  });

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

  const bannerGradient = ((colors) => {
    const list = (Array.isArray(colors) ? colors : []).filter((c) =>
      /^#[0-9a-fA-F]{6}$/.test(c)
    );
    if (list.length === 0) return "";
    if (list.length === 1) return list[0];
    return `linear-gradient(135deg, ${list.join(", ")})`;
  })(member.favoriteColors);

  return (
      <Nav role={viewerDoc?.role}>
      <div className={styles.container}>
        <BackButton fallback="/members" label="All members" />

        <div className={styles.profileCard}>
          {bannerGradient && <div className={styles.banner} style={{ background: bannerGradient }} />}
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
            {Array.isArray(member.socialLinks) && member.socialLinks.length > 0 && (
              <div className={styles.socialLinks}>
                {member.socialLinks.map((link, i) => (
                  <a
                    key={i}
                    className={styles.socialLink}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.platform}
                  >
                    <span className={styles.socialIcon}>
                      {link.platform === "instagram" && "📷"}
                      {link.platform === "tiktok" && "🎵"}
                      {link.platform === "youtube" && "▶"}
                      {link.platform === "facebook" && "👤"}
                      {link.platform === "twitter" && "𝕏"}
                      {link.platform === "etsy" && "🛍"}
                      {link.platform === "pinterest" && "📌"}
                      {link.platform === "ravelry" && "🧶"}
                      {link.platform === "website" && "🌐"}
                      {link.platform === "other" && "🔗"}
                    </span>
                    <span className={styles.socialLabel}>
                      {link.platform === "twitter" ? "X / Twitter" : link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                    </span>
                  </a>
                ))}
              </div>
            )}
            {(member.favoriteColors?.length > 0 ||
              member.crafts?.length > 0 ||
              member.goToYarn ||
              member.favoriteHookSize ||
              member.proudestProject ||
              member.bestGiftProject) && (
              <div className={styles.yarnProfile}>
                {member.favoriteColors?.length > 0 && (
                  <div className={styles.yarnRow}>
                    <span className={styles.yarnLabel}>Favorite colors</span>
                    <span className={styles.colorDots}>
                      {member.favoriteColors.map((color, i) => (
                        <span
                          key={i}
                          className={styles.colorDot}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </div>
                )}
                {Array.isArray(member.crafts) && member.crafts.length > 0 && (
                  <div className={styles.yarnRow}>
                    <span className={styles.yarnLabel}>Crafts</span>
                    <span className={styles.craftTags}>
                      {member.crafts.map((craft) => (
                        <span key={craft} className={styles.craftTag}>
                          {CRAFT_LABELS[craft] || craft}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
                {member.goToYarn && (
                  <p className={styles.yarnRow}>
                    <span className={styles.yarnLabel}>Go-to yarn</span>
                    <span className={styles.yarnValue}>{member.goToYarn}</span>
                  </p>
                )}
                {member.favoriteHookSize && (
                  <p className={styles.yarnRow}>
                    <span className={styles.yarnLabel}>Favorite hook</span>
                    <span className={styles.yarnValue}>{member.favoriteHookSize}</span>
                  </p>
                )}
                {member.proudestProject && (
                  <p className={styles.yarnRow}>
                    <span className={styles.yarnLabel}>Proudest project</span>
                    <span className={styles.yarnValue}>{member.proudestProject}</span>
                  </p>
                )}
                {member.bestGiftProject && (
                  <p className={styles.yarnRow}>
                    <span className={styles.yarnLabel}>Best for gifting</span>
                    <span className={styles.yarnValue}>{member.bestGiftProject}</span>
                  </p>
                )}
              </div>
            )}
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
        </div>

        {!isSelf && <RecognitionForm toUid={id} values={RECOGNITION_VALUES} />}

        <StickerDisplay
          toUid={id}
          toName={member.name}
          isSelf={isSelf}
          initialSummary={stickerSummary}
        />

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
