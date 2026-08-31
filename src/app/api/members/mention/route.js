import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { searchMembersForMention } from "@/lib/server/mentions";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const limited = rateLimitGuard(`mention-search:${user.uid}`, { limit: 30 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 1) {
    return NextResponse.json({ members: [] });
  }

  const members = await searchMembersForMention(q);
  return NextResponse.json({ members });
}
