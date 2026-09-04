"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDataChannel } from "@livekit/components-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

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

function mapSnapshot(doc) {
  const data = doc.data();
  const reactions = {};
  for (const [emoji, byUids] of Object.entries(data.reactions || {})) {
    reactions[emoji] = Object.keys(byUids || {});
  }
  const ts =
    data.createdAt instanceof Date
      ? data.createdAt.getTime()
      : data.createdAt?.toMillis
      ? data.createdAt.toMillis()
      : typeof data.createdAt === "number"
      ? data.createdAt
      : new Date(data.createdAt || 0).getTime();
  return {
    id: doc.id,
    userId: data.userId || data.senderId || "",
    userName: data.userName || "Member",
    userAvatar: data.userAvatar || "",
    role: data.role || "viewer",
    text: data.deleted ? "" : data.text || "",
    mentions: data.mentions || [],
    replyTo: data.replyTo
      ? { id: data.replyTo.id || "", text: data.replyTo.text || "", from: data.replyTo.from || "" }
      : null,
    reactions,
    pinned: !!data.pinned,
    pinnedAt: data.pinnedAt?.toMillis?.() || 0,
    deleted: !!data.deleted,
    createdAt: ts || Date.now(),
  };
}

export default function RoomDataProvider({
  roomId,
  hostId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  canModerate = false,
  isHost = false,
  children,
}) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [raisedHands, setRaisedHands] = useState({});
  const [myHandRaised, setMyHandRaised] = useState(false);

  const cursorRef = useRef(null);
  const lastLoadedAtRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const userIdRef = useRef(currentUserId);

  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  const mergeMessages = useCallback((incoming, { prepend = false } = {}) => {
    setMessages((prev) => {
      const map = new Map();
      for (const m of prepend ? incoming : prev) map.set(m.id, m);
      for (const m of prepend ? prev : incoming) map.set(m.id, m);
      const merged = [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
      const max = merged.reduce((acc, m) => Math.max(acc, m.createdAt || 0), lastLoadedAtRef.current || 0);
      lastLoadedAtRef.current = max;
      return merged;
    });
  }, []);

  const loadHistory = useCallback(
    async ({ reset = false } = {}) => {
      if (loadingMoreRef.current) return;
      const base = `/api/rooms/${roomId}/messages?limit=50`;
      const url = reset ? base : `${base}&before=${cursorRef.current || Date.now()}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load chat");
        const data = await res.json();
        const list = data.messages || [];
        mergeMessages(list, { prepend: !reset });
        cursorRef.current = list.length ? list[0].createdAt : cursorRef.current;
        setHasMore(!!data.hasMore);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingHistory(false);
        loadingMoreRef.current = false;
      }
    },
    [roomId, mergeMessages]
  );

  useEffect(() => {
    if (!roomId) return;
    loadHistory({ reset: true });
  }, [roomId, loadHistory]);

  const loadEarlier = useCallback(() => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    loadHistory({ reset: false });
  }, [hasMore, loadHistory]);

  useEffect(() => {
    if (!roomId) return;
    const col = collection(db, "rooms", roomId, "messages");
    const q = query(col, orderBy("createdAt", "desc"), limit(300));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(mapSnapshot);
        if (list.length) {
          mergeMessages(list);
        }
      },
      () => {
        // Live updates unavailable (e.g. rules) — history still works via API.
      }
    );
    return unsub;
  }, [roomId, mergeMessages]);

  const { send: sendReactionRaw } = useDataChannel("reaction", (msg) => {
    const data = decode(msg.payload);
    if (!data || data.type !== "reaction") return;
    const from = msg.from?.identity || "";
    const id = `${Date.now()}-${from}-${Math.random().toString(36).slice(2, 6)}`;
    setFloatingReactions((prev) => [
      ...prev,
      { id, from, emoji: data.emoji || "❤️", sent: data.sent || false },
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

  const sendChatMessage = useCallback(
    async (text, replyTo = null, mentions = []) => {
      if (!roomId || !text.trim()) return false;
      const optimistic = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUserId,
        userName: currentUserName || "You",
        userAvatar: currentUserAvatar || "",
        role: canModerate ? (isHost ? "host" : "moderator") : "speaker",
        text: text.trim(),
        mentions: mentions || [],
        replyTo: replyTo
          ? { id: replyTo.id || "", text: replyTo.text || "", from: replyTo.from || "" }
          : null,
        reactions: {},
        createdAt: Date.now(),
        isLocal: true,
      };
      setMessages((prev) => [...prev, optimistic].sort((a, b) => a.createdAt - b.createdAt));
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            mentions: mentions || [],
            replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, from: replyTo.from } : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to send");
        }
        return true;
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...m, failed: true } : m))
        );
        return false;
      }
    },
    [roomId, currentUserId, currentUserName, currentUserAvatar, canModerate, isHost]
  );

  const toggleReaction = useCallback(
    async (messageId, emoji) => {
      if (!roomId || !messageId) return;
      try {
        await fetch(
          `/api/rooms/${roomId}/messages/${messageId}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
          }
        );
      } catch {
        /* best effort — snapshot reconciles */
      }
    },
    [roomId]
  );

  const togglePin = useCallback(
    async (messageId) => {
      if (!roomId || !messageId) return;
      try {
        await fetch(`/api/rooms/${roomId}/messages/pinned`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
      } catch {
        /* best effort */
      }
    },
    [roomId]
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      if (!roomId || !messageId) return;
      try {
        await fetch(`/api/rooms/${roomId}/messages/${messageId}`, { method: "POST" });
      } catch {
        /* best effort */
      }
    },
    [roomId]
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
      loadingHistory,
      hasMore,
      loadEarlier,
      chatError: error,
      floatingReactions,
      raisedHands,
      myHandRaised,
      canModerate,
      isHost,
      sendChatMessage,
      toggleReaction,
      togglePin,
      deleteMessage,
      sendReaction,
      toggleHand,
      dismissHand,
    }),
    [
      messages,
      loadingHistory,
      hasMore,
      loadEarlier,
      error,
      floatingReactions,
      raisedHands,
      myHandRaised,
      canModerate,
      isHost,
      sendChatMessage,
      toggleReaction,
      togglePin,
      deleteMessage,
      sendReaction,
      toggleHand,
      dismissHand,
    ]
  );

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>;
}
