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

function snapshotTs(value) {
  if (value instanceof Date) return value.getTime();
  if (value?.toMillis) return value.toMillis();
  if (typeof value === "number") return value;
  return new Date(value || 0).getTime();
}

function mapSnapshot(doc) {
  const data = doc.data();
  const reactions = {};
  for (const [emoji, byUids] of Object.entries(data.reactions || {})) {
    reactions[emoji] = Object.keys(byUids || {});
  }
  return {
    id: doc.id,
    userId: data.userId || data.senderId || "",
    userName: data.userName || "Member",
    userAvatar: data.userAvatar || "",
    role: data.role || "viewer",
    imageData: data.deleted ? "" : data.imageData || "",
    text: data.deleted ? "" : data.text || "",
    mentions: data.mentions || [],
    replyTo: data.replyTo
      ? { id: data.replyTo.id || "", text: data.replyTo.text || "", from: data.replyTo.from || "" }
      : null,
    reactions,
    pinned: !!data.pinned,
    pinnedAt: snapshotTs(data.pinnedAt),
    deleted: !!data.deleted,
    createdAt: snapshotTs(data.createdAt) || Date.now(),
  };
}

function mapSignal(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type || "",
    fromIdentity: data.fromIdentity || "",
    target: data.target || "",
    value: data.value,
    emoji: data.emoji || "",
    hostName: data.hostName || "",
    createdAt: snapshotTs(data.createdAt) || Date.now(),
  };
}

export default function RoomDataProvider({
  roomId,
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
  const [speakerInvite, setSpeakerInvite] = useState(null);
  const [messagesPoll, setMessagesPoll] = useState(false);
  const [signalsPoll, setSignalsPoll] = useState(false);

  const cursorRef = useRef(null);
  const lastLoadedAtRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const userIdRef = useRef(currentUserId);
  const signalsCursorRef = useRef(null);

  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (signalsCursorRef.current !== null) return;
    signalsCursorRef.current = Date.now() - 60 * 1000;
  }, [roomId]);

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
    let unsub;
    try {
      const col = collection(db, "rooms", roomId, "messages");
      const q = query(col, orderBy("createdAt", "desc"), limit(300));
      unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map(mapSnapshot);
          if (list.length) {
            mergeMessages(list);
          }
        },
        () => {
          setMessagesPoll(true);
        }
      );
    } catch {
      setTimeout(() => setMessagesPoll(true), 0);
    }
    return () => unsub?.();
  }, [roomId, mergeMessages]);

  useEffect(() => {
    if (!roomId || !messagesPoll) return;
    const timer = setInterval(async () => {
      const after = (lastLoadedAtRef.current || Date.now()) - 1;
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages?limit=60&after=${after}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.messages || [];
        if (list.length) {
          mergeMessages(list);
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [roomId, messagesPoll, mergeMessages]);

  const applySignals = useCallback((list) => {
    const sorted = [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    for (const s of sorted) {
      if (s.type === "hand") {
        const who = s.target || s.fromIdentity || "";
        if (!who) continue;
        setRaisedHands((prev) => ({ ...prev, [who]: !!s.value }));
        if (who === userIdRef.current) setMyHandRaised(!!s.value);
      } else if (s.type === "reaction") {
        const from = s.fromIdentity || "";
        if (from === userIdRef.current) continue;
        const id = `${Date.now()}-${from}-${Math.random().toString(36).slice(2, 6)}`;
        setFloatingReactions((prev) => [...prev, { id, from, emoji: s.emoji || "❤️", sent: false }]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
        }, 4000);
      } else if (s.type === "speakerInvite") {
        if (s.target && s.target !== userIdRef.current) continue;
        const from = s.fromIdentity || "";
        setSpeakerInvite({ host: from, hostName: s.hostName || from });
      }
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let unsub;
    try {
      const col = collection(db, "rooms", roomId, "signals");
      const q = query(col, orderBy("createdAt", "desc"), limit(100));
      unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map(mapSignal);
          if (list.length) {
            const max = list.reduce((acc, s) => Math.max(acc, s.createdAt || 0), signalsCursorRef.current || 0);
            signalsCursorRef.current = max;
          }
          applySignals(list);
        },
        () => {
          setSignalsPoll(true);
        }
      );
    } catch {
      setTimeout(() => setSignalsPoll(true), 0);
    }
    return () => unsub?.();
  }, [roomId, applySignals]);

  useEffect(() => {
    if (!roomId || !signalsPoll) return;
    const timer = setInterval(async () => {
      const after = signalsCursorRef.current || Date.now() - 60 * 1000;
      try {
        const res = await fetch(`/api/rooms/${roomId}/signals?after=${after}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.signals || [];
        if (list.length) {
          signalsCursorRef.current = list[list.length - 1].createdAt;
          applySignals(list);
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [roomId, signalsPoll, applySignals]);

  const clearSpeakerInvite = useCallback(() => setSpeakerInvite(null), []);

  const sendSpeakerInvite = useCallback(
    async (target, hostName) => {
      if (!roomId || !target) return;
      try {
        await fetch(`/api/rooms/${roomId}/signals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "speakerInvite", target, hostName: hostName || "" }),
        });
      } catch {
        /* server enforces and persists via signals collection */
      }
    },
    [roomId]
  );

  const sendChatMessage = useCallback(
    async (text, replyTo = null, mentions = [], imageData = "") => {
      if (!roomId) return false;
      const cleanText = String(text || "").trim();
      const cleanImage = String(imageData || "").trim();
      if (!cleanText && !cleanImage) return false;
      const optimistic = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUserId,
        userName: currentUserName || "You",
        userAvatar: currentUserAvatar || "",
        role: canModerate ? (isHost ? "host" : "moderator") : "speaker",
        imageData: cleanImage,
        text: cleanText,
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
            text: cleanText,
            imageData: cleanImage,
            mentions: mentions || [],
            replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, from: replyTo.from } : null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to send");
        }
        const data = await res.json().catch(() => ({}));
        const realId = data?.id;
        setMessages((prev) => {
          const withoutLocal = prev.filter((m) => m.id !== optimistic.id);
          if (realId && withoutLocal.some((m) => m.id === realId)) {
            return withoutLocal;
          }
          return realId
            ? withoutLocal
                .concat({ ...optimistic, id: realId, isLocal: false })
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
            : withoutLocal;
        });
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
        await fetch(`/api/rooms/${roomId}/messages/${messageId}/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
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
      if (!roomId) return;
      const id = `self-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setFloatingReactions((prev) => [...prev, { id, from: currentUserId, emoji, sent: true }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 4000);
      fetch(`/api/rooms/${roomId}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "reaction", emoji }),
      }).catch(() => {});
    },
    [roomId, currentUserId]
  );

  const toggleHand = useCallback(() => {
    if (!roomId || !currentUserId) return;
    const next = !myHandRaised;
    setMyHandRaised(next);
    setRaisedHands((prev) => ({ ...prev, [currentUserId]: next }));
    fetch(`/api/rooms/${roomId}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "hand", value: next }),
    }).catch(() => {});
  }, [roomId, currentUserId, myHandRaised]);

  const dismissHand = useCallback(
    (identity) => {
      if (!roomId || !identity) return;
      setRaisedHands((prev) => ({ ...prev, [identity]: false }));
      fetch(`/api/rooms/${roomId}/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "hand", value: false, target: identity }),
      }).catch(() => {});
    },
    [roomId]
  );

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
      speakerInvite,
      canModerate,
      isHost,
      sendChatMessage,
      toggleReaction,
      togglePin,
      deleteMessage,
      sendReaction,
      toggleHand,
      dismissHand,
      clearSpeakerInvite,
      sendSpeakerInvite,
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
      speakerInvite,
      canModerate,
      isHost,
      sendChatMessage,
      toggleReaction,
      togglePin,
      deleteMessage,
      sendReaction,
      toggleHand,
      dismissHand,
      clearSpeakerInvite,
      sendSpeakerInvite,
    ]
  );

  return <RoomDataContext.Provider value={value}>{children}</RoomDataContext.Provider>;
}