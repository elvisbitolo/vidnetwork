"use client";

import { createContext, useContext, useCallback, useMemo, useState } from "react";
import { useDataChannel } from "@livekit/components-react";

const RoomDataContext = createContext(null);

export function useRoomData() {
  const ctx = useContext(RoomDataContext);
  if (!ctx) throw new Error("useRoomData must be used within RoomDataProvider");
  return ctx;
}

function encode(obj) {
  const str = JSON.stringify(obj);
  return new TextEncoder().encode(str);
}

function decode(bytes) {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export default function RoomDataProvider({
  hostId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  children,
}) {
  const [messages, setMessages] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [raisedHands, setRaisedHands] = useState({});
  const [myHandRaised, setMyHandRaised] = useState(false);

  const { send: sendChat } = useDataChannel("chat", (msg) => {
    const data = decode(msg.payload);
    if (!data || data.type !== "message") return;
    const from = msg.from?.identity || "";
    setMessages((prev) => [
      ...prev,
      {
        id: `${msg.timestamp}-${from}-${prev.length}`,
        userId: from,
        userName: data.userName || "Member",
        userAvatar: data.userAvatar || "",
        role: data.role || "",
        text: data.text,
        replyTo: data.replyTo || null,
        mentions: data.mentions || [],
        reactions: {},
        createdAt: new Date(),
      },
    ]);
  });

  const { send: sendReactionRaw } = useDataChannel("reaction", (msg) => {
    const data = decode(msg.payload);
    if (!data || data.type !== "reaction") return;
    const from = msg.from?.identity || "";
    const id = `${Date.now()}-${from}-${Math.random().toString(36).slice(2, 6)}`;
    setFloatingReactions((prev) => [
      ...prev,
      {
        id,
        from,
        emoji: data.emoji || "❤️",
        sent: data.sent || false,
      },
    ]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 4000);
  });

  const { send: sendHand } = useDataChannel("hand", (msg) => {
    const data = decode(msg.payload);
    if (!data || data.type !== "hand") return;
    const from = msg.from?.identity || "";
    setRaisedHands((prev) => ({ ...prev, [from]: !!data.value }));
  });

  const sendChatMessage = useCallback(    (text, replyTo = null, mentions = []) => {
      if (!text.trim()) return;
      const payload = {
        type: "message",
        text: text.trim(),
        userName: currentUserName || "Member",
        userAvatar: currentUserAvatar || "",
        role: currentUserId === hostId ? "host" : "speaker",
        replyTo,
        mentions,
      };
      sendChat(encode(payload), { reliable: true, topic: "chat" });
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          userId: currentUserId,
          userName: currentUserName || "You",
          userAvatar: currentUserAvatar || "",
          role: currentUserId === hostId ? "host" : "speaker",
          text: text.trim(),
          replyTo,
          mentions,
          reactions: {},
          createdAt: new Date(),
          isLocal: true,
        },
      ]);
    },
    [sendChat, currentUserId, currentUserName, currentUserAvatar, hostId]
  );

  const sendReaction = useCallback(
    (emoji) => {
      const id = `self-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setFloatingReactions((prev) => [...prev, { id, from: currentUserId, emoji, sent: true }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 4000);
      sendReactionRaw(encode({ type: "reaction", emoji, sent: true }), {
        reliable: false,
        topic: "reaction",
      });
    },
    [sendReactionRaw, currentUserId]
  );

  const toggleHand = useCallback(() => {
    const next = !myHandRaised;
    setMyHandRaised(next);
    if (currentUserId) setRaisedHands((prev) => ({ ...prev, [currentUserId]: next }));
    sendHand(encode({ type: "hand", value: next }), { reliable: true, topic: "hand" });
  }, [myHandRaised, currentUserId, sendHand]);

  const dismissHand = useCallback((identity) => {
    setRaisedHands((prev) => ({ ...prev, [identity]: false }));
  }, []);

  const value = useMemo(
    () => ({
      messages,
      floatingReactions,
      raisedHands,
      myHandRaised,
      sendChatMessage,
      sendReaction,
      toggleHand,
      dismissHand,
    }),
    [
      messages,
      floatingReactions,
      raisedHands,
      myHandRaised,
      sendChatMessage,
      sendReaction,
      toggleHand,
      dismissHand,
    ]
  );

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>;
}
