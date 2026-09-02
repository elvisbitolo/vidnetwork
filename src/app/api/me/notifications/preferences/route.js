import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { logError } from "@/lib/server/log";

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

  try {
    await adminDb().collection("users").doc(user.uid).update({
      notificationPreferences: prefs,
    });
  } catch (err) {
    logError("prefs.update_failed", { error: err.message, uid: user.uid });
    return NextResponse.json({ error: "Could not save preferences" }, { status: 500 });
  }

  return NextResponse.json(prefs);
}
