import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const body = await req.text();
  const authHeader = req.headers.get("authorization") || "";
  const receiver = new WebhookReceiver(apiKey, apiSecret);
  const event = receiver.receive(body, authHeader);

  if (event.event === "egress_started" || event.event === "egress_ended") {
    const egressId = event.egressInfo?.egressId;
    if (!egressId) return NextResponse.json({ ok: true });

    const snap = await adminDb()
      .collection("recordings")
      .where("egressId", "==", egressId)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();
      if (event.event === "egress_started") {
        await doc.ref.update({ status: "active" });
      } else {
        const status = event.egressInfo?.status;
        const isComplete = status === "EGRESS_COMPLETE";
        await doc.ref.update({
          status: isComplete ? "complete" : "failed",
          endedAt: new Date(),
          visibility: data.visibility || "members",
          retentionDays: data.retentionDays || 90,
          resultUrl: event.egressInfo?.fileResults?.[0]?.url || data.resultUrl || "",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
