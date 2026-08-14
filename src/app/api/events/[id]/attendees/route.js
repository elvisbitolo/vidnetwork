import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const eventSnap = await adminDb().collection("events").doc(id).get();
  if (!eventSnap.exists) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const occurrenceId = searchParams.get("occurrenceId") || "";

  const snap = occurrenceId
    ? await adminDb()
        .collection("rsvps")
        .where("eventId", "==", id)
        .where("occurrenceId", "==", occurrenceId)
        .get()
    : await adminDb().collection("rsvps").where("eventId", "==", id).get();

  const attendees = snap.docs.map((d) => d.data());
  const names = attendees.map((a) => a.name || "Member").slice(0, 6);

  return NextResponse.json({
    count: attendees.length,
    names,
    mine: attendees.some((a) => a.userId === user.uid),
  });
}
