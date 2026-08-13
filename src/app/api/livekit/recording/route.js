import { NextResponse } from "next/server";
import { EgressClient, EncodedFileOutput, S3Upload } from "livekit-server-sdk";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getRoomBySlug } from "@/lib/server/rooms";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";

function getEgressConfig() {
  const region = process.env.AWS_REGION || process.env.LIVEKIT_EGRESS_S3_REGION;
  const bucket = process.env.LIVEKIT_EGRESS_S3_BUCKET;
  const key = process.env.AWS_ACCESS_KEY_ID || process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY;
  const secret = process.env.AWS_SECRET_ACCESS_KEY || process.env.LIVEKIT_EGRESS_S3_SECRET;
  if (!region || !bucket || !key || !secret) return null;
  return { region, bucket, key, secret };
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  if (userDoc?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const cfg = getEgressConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Recording not configured — add S3 credentials to start recordings." },
      { status: 501 }
    );
  }

  const { slug, action = "start" } = await req.json();
  const room = await getRoomBySlug(slug);
  if (!room || room.status !== "active") {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const { LiveKitURL } = await import("livekit-server-sdk");
  const host = new URL(process.env.LIVEKIT_URL).protocol + "//" + new URL(process.env.LIVEKIT_URL).host;
  const egress = new EgressClient(
    host,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

  if (action === "start") {
    const existingSnap = await adminDb()
      .collection("recordings")
      .where("roomId", "==", room.id)
      .where("status", "in", ["active", "starting"])
      .get();
    if (!existingSnap.empty) {
      return NextResponse.json({ error: "Recording already in progress" }, { status: 409 });
    }

    const filepath = `recordings/${room.slug}/${Date.now()}`;
    const info = await egress.startRoomCompositeEgress(
      room.slug,
      {
        file: new EncodedFileOutput({
          filepath,
          output: {
            case: "s3",
            value: new S3Upload({
              region: cfg.region,
              bucket: cfg.bucket,
              accessKey: cfg.key,
              secret: cfg.secret,
            }),
          },
        }),
      },
      { encodingOptions: "H264_720P_30" }
    );

    const ref = await adminDb().collection("recordings").add({
      roomId: room.id,
      roomSlug: room.slug,
      roomName: room.name,
      egressId: info.egressId,
      filepath,
      status: "active",
      startedAt: new Date(),
      createdBy: user.uid,
    });
    return NextResponse.json({ id: ref.id, egressId: info.egressId });
  }

  if (action === "stop") {
    const snap = await adminDb()
      .collection("recordings")
      .where("roomId", "==", room.id)
      .where("status", "in", ["active", "starting"])
      .limit(1)
      .get();
    if (snap.empty) {
      return NextResponse.json({ error: "No active recording" }, { status: 404 });
    }
    const doc = snap.docs[0];
    await egress.stopEgress(doc.data().egressId);
    await doc.ref.update({ status: "stopping", stoppedAt: new Date() });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
