import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { normalizeProfile } from "@/lib/server/profile";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { getGamification } from "@/lib/server/gamification";
import {
  regionKeyFor,
  getOrCreateRegionChat,
  leaveRegionChat,
} from "@/lib/server/chat";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  const gamification = await getGamification(user.uid, userDoc?.name || "Member");
  return NextResponse.json({
    uid: user.uid,
    name: userDoc?.name || user.name || user.displayName || "",
    email: user.email,
    role: userDoc?.role || "member",
    headline: userDoc?.headline || "",
    location: userDoc?.location || "",
    country: userDoc?.country || "",
    state: userDoc?.state || "",
    bio: userDoc?.bio || "",
    photoURL: userDoc?.photoURL || "",
    notifications: userDoc?.notifications || "on",
    points: Number(gamification.points) || 0,
    streak: Number(gamification.streak) || 0,
    createdAt: userDoc?.createdAt
      ? (userDoc.createdAt.toMillis ? userDoc.createdAt.toMillis() : new Date(userDoc.createdAt).getTime())
      : null,
  });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limited = rateLimitGuard(`me:${user.uid}`, { limit: 30 });
  if (limited) return limited;

  const body = await req.json();
  const { patch, errors } = normalizeProfile(body || {});

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: Object.values(errors)[0], errors }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const ref = adminDb().collection("users").doc(user.uid);
  const doc = await ref.get();
  const prevCountry = doc.exists ? doc.data().country || "" : "";
  const prevState = doc.exists ? doc.data().state || "" : "";
  if (doc.exists) {
    await ref.update(patch);
  } else {
    await ref.set({ ...patch, role: "member", createdAt: new Date() });
  }

  if ("country" in patch || "state" in patch) {
    try {
      const newCountry = patch.country ?? prevCountry;
      const newState = patch.state ?? prevState;
      if (regionKeyFor(prevCountry, prevState) !== regionKeyFor(newCountry, newState)) {
        if (regionKeyFor(prevCountry, prevState)) {
          await leaveRegionChat(user.uid, prevCountry, prevState);
        }
        if (regionKeyFor(newCountry, newState)) {
          await getOrCreateRegionChat(user.uid, newCountry, newState);
        }
      }
    } catch {
      // Region chat sync is best-effort; profile saves regardless.
    }
  }

  if (patch.name) {
    try {
      await adminAuth().updateUser(user.uid, { displayName: patch.name });
    } catch {
      // The profile is saved regardless; the Auth display name sync is best-effort.
    }
  }

  return NextResponse.json({ ok: true, ...patch });
}
