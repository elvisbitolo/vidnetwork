import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSpaceBySlug, isSpaceMember } from "@/lib/server/spaces";
import { getPageBySlug } from "@/lib/server/pages";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import PageContent from "./PageContent";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function SpacePageDetail({ params }) {
  const { slug, pageSlug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const space = await getSpaceBySlug(slug);

  if (!space || space.status !== "active") {
    return (
      <Nav role={userDoc?.role}>
        <main className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.notFound}>Space not found</h1>
            <Link className={styles.link} href="/spaces">Back to spaces</Link>
          </div>
        </main>
      </Nav>
    );
  }

  const isOwner = userDoc?.role === "owner";
  const membership = await isSpaceMember(space.id, user.uid);
  const isMember = !!membership;

  const canView =
    isMember ||
    isOwner ||
    space.access === "public" ||
    (space.access !== "invite" && space.publicPreview);

  if (!canView) {
    return (
      <Nav role={userDoc?.role}>
        <main className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.notFound}>Not available</h1>
            <p className={styles.subtitle}>Join this space to view this page.</p>
            <Link className={styles.link} href={`/spaces/${space.slug}`}>Back to space</Link>
          </div>
        </main>
      </Nav>
    );
  }

  const page = await getPageBySlug(space.id, pageSlug);

  if (!page) {
    return (
      <Nav role={userDoc?.role}>
        <main className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.notFound}>Page not found</h1>
            <Link className={styles.link} href={`/spaces/${space.slug}/pages`}>
              Back to pages
            </Link>
          </div>
        </main>
      </Nav>
    );
  }

  if (page.visibility === "members" && !isMember && !isOwner) {
    return (
      <Nav role={userDoc?.role}>
        <main className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.notFound}>Members only</h1>
            <p className={styles.subtitle}>Join this space to view this page.</p>
            <Link className={styles.link} href={`/spaces/${space.slug}`}>Back to space</Link>
          </div>
        </main>
      </Nav>
    );
  }

  return (
    <Nav role={userDoc?.role}>
      <main className={styles.page}>
        <div className={styles.detailContainer}>
          <BackButton fallback={`/spaces/${space.slug}/pages`} label="All pages" />
          <p className={styles.breadcrumb}>
            <Link className={styles.link} href="/spaces">Spaces</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link className={styles.link} href={`/spaces/${space.slug}`}>{space.name}</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <Link className={styles.link} href={`/spaces/${space.slug}/pages`}>Pages</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>{page.title}</span>
          </p>

          <article className={styles.article}>
            <h1 className={styles.title}>{page.title}</h1>
            <div className={styles.meta}>
              <span>{page.visibility === "members" ? "Members only" : "Public"}</span>
              {page.createdAt && (
                <span>
                  {new Date(page.createdAt).toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <PageContent content={page.content} />
          </article>
        </div>
      </main>
    </Nav>
  );
}
