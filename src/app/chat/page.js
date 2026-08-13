import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { listConversations, getOrCreateDm, getOrCreateGroupChat } from "@/lib/server/chat";
import { isGroupMember } from "@/lib/server/groups";
import Nav from "@/components/Nav";
import styles from "./chat.module.css";

export const dynamic = "force-dynamic";

function timeLabel(millis) {
  if (!millis) return "";
  const date = new Date(millis);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default async function ChatPage({ searchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  if (params.with && params.with !== user.uid) {
    const conversation = await getOrCreateDm(user.uid, params.with);
    if (conversation) redirect(`/chat/${conversation.id}`);
  }

  if (params.group) {
    const membership = await isGroupMember(params.group, user.uid);
    if (membership || userDoc?.role === "owner") {
      const conversation = await getOrCreateGroupChat(user.uid, params.group);
      if (conversation) redirect(`/chat/${conversation.id}`);
    }
  }

  const conversations = await listConversations(user.uid);

  return (
    <main className={styles.page}>
      <Nav role={userDoc?.role} />
      <div className={styles.container}>
        <h1 className={styles.title}>Chat</h1>
        <p className={styles.subtitle}>Direct messages and group conversations.</p>

        {conversations.length === 0 ? (
          <p className={styles.empty}>
            No conversations yet. Open a member&apos;s profile and hit Message to start chatting.
          </p>
        ) : (
          <div className={styles.list}>
            {conversations.map((conv) => (
              <Link key={conv.id} href={`/chat/${conv.id}`} className={styles.item}>
                <div className={styles.avatar}>
                  {(conv.title || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTop}>
                    <p className={styles.itemTitle}>{conv.title}</p>
                    <p className={styles.itemTime}>{timeLabel(conv.lastMessageAt)}</p>
                  </div>
                  <p className={conv.lastMessage ? styles.itemPreview : styles.itemPreviewEmpty}>
                    {conv.lastMessage || "Say hi!"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
