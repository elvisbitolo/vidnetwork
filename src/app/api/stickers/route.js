import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { getUserDoc } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

const STICKER_TYPES = {
  trophy: { emoji: "🏆", label: "Trophy" },
  star: { emoji: "⭐", label: "Star" },
  yarn: { emoji: "🧶", label: "Yarn Ball" },
  heart: { emoji: "❤️", label: "Heart" },
  celebration: { emoji: "🎉", label: "Celebration" },
  clap: { emoji: "👏", label: "Clap" },
};

const MAX_STICKERS_PER_DAY = 10;

export async function GET(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const toUid = searchParams.get("toUid");

  if (!toUid) {
    return NextResponse.json({ error: "toUid required" }, { status: 400 });
  }

  const snap = await adminDb()
    .collection("stickers")
    .where("toUid", "==", toUid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const stickers = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      ...d,
      createdAt: d.createdAt?.toMillis
        ? d.createdAt.toMillis()
        : d.createdAt
          ? new Date(d.createdAt).getTime()
          : 0,
    };
  });

  const summary = {};
  stickers.forEach((s) => {
    summary[s.type] = (summary[s.type] || 0) + 1;
  });

  return NextResponse.json({ stickers, summary, types: STICKER_TYPES });
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const { toUid, type } = await req.json();

  if (!toUid || !type) {
    return NextResponse.json({ error: "toUid and type required" }, { status: 400 });
  }
  if (!STICKER_TYPES[type]) {
    return NextResponse.json({ error: "Invalid sticker type" }, { status: 400 });
  }
  if (toUid === auth.user.uid) {
    return NextResponse.json({ error: "You can't send stickers to yourself" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const todaySnap = await adminDb()
    .collection("stickers")
    .where("fromUid", "==", auth.user.uid)
    .where("createdAt", ">=", today)
    .get();

  if (todaySnap.size >= MAX_STICKERS_PER_DAY) {
    return NextResponse.json(
      { error: `You can only send ${MAX_STICKERS_PER_DAY} stickers per day` },
      { status: 429 }
    );
  }

  const recipient = await getUserDoc(toUid);
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const senderName = auth.userDoc?.name || auth.user.email || "Someone";

  const ref = await adminDb().collection("stickers").add({
    fromUid: auth.user.uid,
    fromName: senderName,
    toUid,
    toName: recipient.name || "Member",
    type,
    emoji: STICKER_TYPES[type].emoji,
    createdAt: new Date(),
  });

  await logAudit({
    actorId: auth.user.uid,
    actorName: senderName,
    action: "sticker.sent",
    targetId: toUid,
    metadata: { type, stickerId: ref.id },
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
