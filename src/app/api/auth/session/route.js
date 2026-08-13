import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/server/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { idToken, name } = body;
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await adminAuth().verifyIdToken(idToken);

    const users = adminDb().collection("users");
    const userRef = users.doc(decoded.uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        name: name || decoded.name || decoded.email?.split("@")[0] || "Member",
        email: decoded.email || "",
        role: "member",
        createdAt: new Date(),
      });
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const res = NextResponse.json({ ok: true, uid: decoded.uid });
    res.cookies.set(AUTH_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("Session exchange failed:", err.message);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
