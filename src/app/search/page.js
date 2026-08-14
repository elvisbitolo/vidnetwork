import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { searchCommunity } from "@/lib/server/search";
import Nav from "@/components/Nav";
import SearchBoard from "./SearchBoard";
import styles from "./search.module.css";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const q = params.q || "";
  const hashtag = params.hashtag || "";
  const results = q || hashtag ? await searchCommunity({ q, hashtag }, user.uid) : null;

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Search</h1>
        <p className={styles.subtitle}>
          Find posts, members, spaces, groups, courses, events and live rooms.
        </p>
        <SearchBoard
          initialQ={q}
          initialHashtag={hashtag}
          initialResults={results}
        />
      </div>
    </main>
  );
}
