import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";
import { searchCommunity } from "@/lib/server/search";

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const results = await searchCommunity(
    {
      q: searchParams.get("q") || "",
      hashtag: searchParams.get("hashtag") || "",
    },
    user.uid
  );
  return NextResponse.json(results);
}
