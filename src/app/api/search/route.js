import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc, canModerate } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { searchCommunity } from "@/lib/server/search";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  const sub = await getSubscription(user.uid);
  if (!canModerate(userDoc) && !isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const results = await searchCommunity(
    {
      q: searchParams.get("q") || "",
      hashtag: searchParams.get("hashtag") || "",
    },
    user.uid,
    userDoc?.role || "member"
  );
  return NextResponse.json(results);
}
