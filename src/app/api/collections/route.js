import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/server/auth";
import { getCollectionsWithSpaces } from "@/lib/server/collections";

export async function GET() {
  const collections = await getCollectionsWithSpaces();
  return NextResponse.json(collections);
}
