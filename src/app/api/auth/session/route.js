import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { AUTH_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/server/auth";
import { rateLimitGuard } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/log";

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = rateLimitGuard(`session-ip:${ip}`, { limit: 30 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { idToken, name } = body;
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await adminAuth().verifyIdToken(idToken);

    if (decoded.email && !decoded.email_verified) {
      return NextResponse.json(
        { error: "email_not_verified" },
        { status: 403 }
      );
    }

    const users = adminDb().collection("users");
    const userRef = users.doc(decoded.uid);
    const snap = await userRef.get();
    let isNewUser = false;
    if (!snap.exists) {
      if (!name) {
        return NextResponse.json(
          { error: "no_account" },
          { status: 409 }
        );
      }
      isNewUser = true;
      const memberName = name || decoded.name || decoded.email?.split("@")[0] || "Member";
      await userRef.set({
        name: memberName,
        email: decoded.email || "",
        photoURL: decoded.picture || "",
        role: "member",
        createdAt: new Date(),
      });

      if (decoded.email) {
        const { sendEmail } = await import("@/lib/server/email");
        await sendEmail({
          to: decoded.email,
          subject: "Welcome to Yarnery Lounge",
          text:
            `Hi ${memberName},\n\n` +
            `Welcome to Yarnery Lounge! You're now a member of the community.\n\n` +
            `Here's what's inside:\n` +
            `- Live video rooms for real-time conversation\n` +
            `- Courses with lessons and progress tracking\n` +
            `- Events with RSVPs and reminders\n` +
            `- Groups, spaces, direct messages and a community feed\n\n` +
            `To start exploring: ${process.env.NEXT_PUBLIC_APP_URL || ""}/explore\n\n` +
            `We're glad you're here.\n\n— The Yarnery Lounge Team`,
        }).catch((err) => {
          logError("email.welcome_failed", { uid: decoded.uid, error: err.message });
        });
      }

      const { runAutomations } = await import("@/lib/server/automations");
      runAutomations("new_member", {
        memberName,
        memberEmail: decoded.email || "",
        memberUid: decoded.uid,
        subjectUid: decoded.uid,
        subjectName: memberName,
      }).catch((err) => {
        logError("automation.new_member_failed", { uid: decoded.uid, error: err.message });
      });
    } else {
      const existing = snap.data();
      if (decoded.picture && !existing.photoURL) {
        await userRef.update({ photoURL: decoded.picture }).catch(() => {});
      }
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const res = NextResponse.json({ ok: true, uid: decoded.uid, isNewUser });
    res.cookies.set(AUTH_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    logError("auth.session_exchange_failed", { error: err.message });
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
