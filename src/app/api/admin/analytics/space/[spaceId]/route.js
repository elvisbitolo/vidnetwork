import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getSpaceAnalytics } from "@/lib/server/analytics";
import { canManageScope } from "@/lib/server/hosts";
import { rateLimitGuard } from "@/lib/server/rate-limit";

export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);

  const { spaceId } = await params;
  if (userDoc?.role !== "owner" && !(await canManageScope(user.uid, "space", spaceId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limited = rateLimitGuard(`space-analytics:${user.uid}`, { limit: 60 });
  if (limited) return limited;

  const data = await getSpaceAnalytics(spaceId);
  if (!data) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
