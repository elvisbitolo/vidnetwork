import { NextResponse } from "next/server";
import { getCurrentUser, getUserDoc } from "@/lib/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userDoc = await getUserDoc(user.uid);
  return NextResponse.json({
    uid: user.uid,
    name: userDoc?.name || user.name || user.displayName || "",
    email: user.email,
    role: userDoc?.role || "member",
  });
}
