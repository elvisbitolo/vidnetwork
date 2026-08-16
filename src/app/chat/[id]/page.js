import { redirect } from "next/navigation";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub, isActiveSub } from "@/lib/server/subscription";
import { getConversation, listMessages } from "@/lib/server/chat";
import Nav from "@/components/Nav";
import BackButton from "@/components/BackButton";
import Thread from "./Thread";
import styles from "../chat.module.css";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDoc = await getUserDoc(user.uid);
  const sub = await getAccessSub(user.uid);
  if (!isActiveSub(sub)) redirect("/pricing");

  const conversation = await getConversation(id, user.uid);
  if (!conversation) {
    redirect("/chat");
  }

  const messages = await listMessages(id);

  return (
      <Nav role={userDoc?.role}>
      <div className={styles.container}>
        <BackButton fallback="/chat" label="All chats" />
        <div className={styles.thread}>
          <div className={styles.threadHeader}>
            <h1 className={styles.threadTitle}>{conversation.title}</h1>
          </div>
          <Thread
            conversationId={id}
            uid={user.uid}
            initialMessages={messages}
          />
        </div>
      </div>
</Nav>
  );
}
