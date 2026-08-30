import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { logError } from "@/lib/server/log";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  try {
    const body = await req.text();
    const authHeader = req.headers.get("authorization") || "";
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    receiver.receive(body, authHeader);
  } catch (err) {
    logError("webhook.livekit.invalid", { error: err.message });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}