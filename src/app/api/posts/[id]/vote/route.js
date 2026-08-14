import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebase/admin";
import { getSubscription, isActiveSub } from "@/lib/server/subscription";

export async function POST(req, { params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sub = await getSubscription(user.uid);
  if (!isActiveSub(sub)) {
    return NextResponse.json({ error: "Active membership required" }, { status: 403 });
  }

  const { option } = await req.json();
  if (typeof option !== "number" || option < 0) {
    return NextResponse.json({ error: "Invalid poll option" }, { status: 400 });
  }

  const ref = adminDb().collection("posts").doc(id);
  const post = await ref.get();
  if (!post.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const data = post.data();
  if (data.kind !== "poll" || !Array.isArray(data.pollOptions) || option >= data.pollOptions.length) {
    return NextResponse.json({ error: "Invalid poll option" }, { status: 400 });
  }

  const pollVotes = { ...(data.pollVotes || {}) };
  pollVotes[user.uid] = option;
  await ref.update({ pollVotes });

  const counts = data.pollOptions.map(
    (_, index) => Object.values(pollVotes).filter((v) => v === index).length
  );
  return NextResponse.json({ pollVotes, counts, votedOption: option });
}
