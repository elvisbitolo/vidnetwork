import Link from "next/link";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSpace } from "@/lib/server/spaces";
import styles from "../collections.module.css";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const userDoc = user ? await getUserDoc(user.uid) : null;

  const colDoc = await adminDb().collection("collections").doc(id).get();
  if (!colDoc.exists) {
    return (
      <Nav role={userDoc?.role}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
          <BackButton fallback="/collections" label="All collections" />
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#17171c" }}>Collection not found</h1>
        </div>
      </Nav>
    );
  }

  const collection = { id: colDoc.id, ...colDoc.data() };
  const spaces = [];
  for (const spaceId of collection.spaceIds || []) {
    const space = await getSpace(spaceId);
    if (space && space.status !== "deleted") {
      const memberSnap = await adminDb()
        .collection("spaceMembers")
        .where("spaceId", "==", spaceId)
        .get();
      spaces.push({
        id: space.id,
        name: space.name,
        description: space.description || "",
        features: space.features || {},
        memberCount: memberSnap.size,
      });
    }
  }

  return (
    <Nav role={userDoc?.role}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        <BackButton fallback="/collections" label="All collections" />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#17171c", margin: "16px 0 8px" }}>
          {collection.name}
        </h1>
        {collection.description && (
          <p style={{ fontSize: 16, color: "#6b6b7b", margin: "0 0 32px" }}>
            {collection.description}
          </p>
        )}

        {spaces.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: "center",
            background: "#ffffff",
            border: "1px dashed #d8d8e3",
            borderRadius: 14,
            color: "#9b9bab",
            fontSize: 15,
          }}>
            No spaces in this collection yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${space.slug || space.id}`}
                className={styles.spaceCard}
              >
                <h3 className={styles.spaceName}>{space.name}</h3>
                {space.description && <p className={styles.spaceDesc}>{space.description}</p>}
                <div className={styles.badgeRow}>
                  <span className={styles.badge}>{space.memberCount} members</span>
                  {Object.entries(space.features)
                    .filter(([, v]) => v)
                    .map(([key]) => (
                      <span key={key} className={styles.badge}>{key}</span>
                    ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Nav>
  );
}
