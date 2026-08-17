import { redirect } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { isActiveSub, getAccessSub } from "@/lib/server/subscription";
import Nav from "@/components/Nav";
import GalleryGrid from "./GalleryGrid";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const userDoc = await getUserDoc(user.uid);
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const snap = await adminDb()
    .collection("posts")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();

  const photos = snap.docs
    .map((doc) => {
      const d = doc.data();
      if (!d.imageUrl) return null;
      return {
        id: doc.id,
        imageUrl: d.imageUrl,
        text: d.text || "",
        authorId: d.authorId || "",
        authorName: d.authorName || "Member",
        createdAt: d.createdAt?.toMillis
          ? d.createdAt.toMillis()
          : d.createdAt
            ? new Date(d.createdAt).getTime()
            : 0,
      };
    })
    .filter(Boolean)
    .slice(0, 80);

  return (
    <Nav role={userDoc?.role}>
      <div className="gallery-page" style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 64px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f5f5f5", margin: "0 0 6px" }}>
          Gallery
        </h1>
        <p style={{ fontSize: 14, color: "#9b9bab", margin: "0 0 28px" }}>
          Click any photo to see the project and its maker.
        </p>
        <GalleryGrid photos={photos} />
      </div>
    </Nav>
  );
}
