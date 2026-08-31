import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const doc = await adminDb().collection("users").doc(user.uid).get();
  const data = doc.exists ? doc.data() : {};
  const prefs = data.notificationPreferences || {
    chat: true,
    feed: true,
    events: true,
    mentions: true,
    automations: true,
  };

  return NextResponse.json(prefs);
}

export async function PUT(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const prefs = {
    chat: !!body.chat,
    feed: !!body.feed,
    events: !!body.events,
    mentions: !!body.mentions,
    automations: !!body.automations,
  };

  await adminDb().collection("users").doc(user.uid).update({
    notificationPreferences: prefs,
  });

  return NextResponse.json(prefs);
}
