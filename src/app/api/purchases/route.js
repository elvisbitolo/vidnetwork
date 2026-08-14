import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getPurchasedKeys } from "@/lib/server/purchases";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const keys = await getPurchasedKeys(user.uid);
  return NextResponse.json({ keys: Array.from(keys) });
}
