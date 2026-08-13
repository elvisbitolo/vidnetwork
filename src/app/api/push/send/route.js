import { NextResponse } from "next/server";
import webpush from "web-push";
import { adminDb } from "@/lib/firebase/admin";
import { requireOwner, guardJson } from "@/lib/server/authorize";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const limited = rateLimitGuard(`push-send:${auth.user.uid}`, { limit: 10 });
  if (limited) return limited;

  const { title, body, url } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return NextResponse.json(
      { error: "Push not configured — add VAPID keys." },
      { status: 501 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const snap = await adminDb().collection("pushSubscriptions").get();
  const payload = JSON.stringify({ title, body, url: url || "/" });

  let sent = 0;
  let failed = 0;
  for (const doc of snap.docs) {
    const sub = doc.data();
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: sub.keys,
      }, payload);
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 404 || err.statusCode === 410) {
        await doc.ref.delete();
      }
    }
  }

  await logAudit({
    actorId: auth.user.uid,
    actorName: auth.userDoc?.name || auth.user.email || "",
    action: "push.announcement_sent",
    metadata: { title, sent, failed },
  });

  return NextResponse.json({ sent, failed });
}