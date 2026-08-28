import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/server/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - ONE_WEEK);

  const topPostsSnap = await adminDb()
    .collection("posts")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const topPosts = [];
  for (const doc of topPostsSnap.docs) {
    const d = doc.data();
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
    if (created < since) continue;
    const likeCount = Object.keys(d.likes || {}).length;
    topPosts.push({ id: doc.id, text: d.text || "", author: d.authorName || "Member", likes: likeCount });
    if (topPosts.length >= 5) break;
  }

  const eventsSnap = await adminDb()
    .collection("events")
    .where("startTime", ">=", new Date())
    .orderBy("startTime", "asc")
    .limit(10)
    .get();

  const upcomingEvents = eventsSnap.docs.map((doc) => {
    const d = doc.data();
    const date = d.date?.toDate ? d.date.toDate() : new Date(d.date);
    return {
      title: d.title || "Event",
      date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      location: d.location || "Online",
    };
  }).slice(0, 3);

  let postsHtml = "";
  if (topPosts.length > 0) {
    postsHtml = topPosts.map((p) => {
      const preview = escapeHtml(p.text.slice(0, 120));
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
            <strong style="color:#333;">${escapeHtml(p.author)}</strong>
            <span style="color:#999;margin-left:8px;">${p.likes} likes</span>
            <p style="margin:4px 0 0;color:#555;font-size:14px;">${preview}${p.text.length > 120 ? "..." : ""}</p>
          </td>
        </tr>`;
    }).join("");
  } else {
    postsHtml = `<tr><td style="padding:16px;color:#999;font-size:14px;">No posts this week yet.</td></tr>`;
  }

  let eventsHtml = "";
  if (upcomingEvents.length > 0) {
    eventsHtml = upcomingEvents.map((e) => `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;">
          <strong style="color:#333;">${escapeHtml(e.title)}</strong>
          <span style="color:#8b5cf6;margin-left:8px;">${escapeHtml(e.date)}</span>
          <span style="color:#999;margin-left:8px;">${escapeHtml(e.location)}</span>
        </td>
      </tr>`).join("");
  } else {
    eventsHtml = `<tr><td style="padding:16px;color:#999;font-size:14px;">No upcoming events.</td></tr>`;
  }

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="background:linear-gradient(135deg,#6d5df6,#8b5cf6);padding:32px 24px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;font-size:22px;margin:0;">This Week at VidNetwork</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Your weekly community digest</p>
      </div>
      <div style="background:#fff;padding:8px 0;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
        <h2 style="font-size:16px;color:#333;padding:16px 16px 8px;margin:0;">Top Posts</h2>
        <table style="width:100%;border-collapse:collapse;">${postsHtml}</table>
        <h2 style="font-size:16px;color:#333;padding:24px 16px 8px;margin:0;">Upcoming Events</h2>
        <table style="width:100%;border-collapse:collapse;">${eventsHtml}</table>
        <div style="padding:20px 16px;text-align:center;">
          <a href="https://yarnerylounge.vercel.app/feed" style="color:#8b5cf6;font-size:14px;font-weight:600;text-decoration:none;">Visit community &rarr;</a>
        </div>
      </div>
    </div>`;

  const textParts = [];
  textParts.push("=== THIS WEEK AT VIDNETWORK ===\n");
  textParts.push("Top Posts:");
  topPosts.forEach((p, i) => {
    textParts.push(`  ${i + 1}. ${p.author} (${p.likes} likes): ${p.text.slice(0, 100)}`);
  });
  textParts.push("\nUpcoming Events:");
  upcomingEvents.forEach((e) => {
    textParts.push(`  - ${e.title} | ${e.date} | ${e.location}`);
  });
  textParts.push(`\nVisit: https://yarnerylounge.vercel.app/feed`);

  const usersSnap = await adminDb().collection("users").limit(200).get();
  let sent = 0;
  let skipped = 0;

  for (const doc of usersSnap.docs) {
    const u = doc.data();
    if (!u.email) { skipped++; continue; }
    if (u.emailPreferences?.weeklyDigest === false) { skipped++; continue; }

    try {
      await sendEmail({
        to: u.email,
        subject: "This Week at VidNetwork",
        text: textParts.join("\n"),
        html,
      });
      sent++;
    } catch (err) {
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    topPosts: topPosts.length,
    upcomingEvents: upcomingEvents.length,
    timestamp: new Date().toISOString(),
  });
}
