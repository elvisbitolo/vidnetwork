import { NextResponse } from "next/server";
import { requireUser, guardJson } from "@/lib/server/authorize";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const VALID_SKILLS = ["beginner", "intermediate", "advanced", "expert"];
const VALID_CRAFTS = ["crochet", "knitting", "weaving", "spinning", "dyeing", "embroidery", "macrame"];
const VALID_PROJECTS = ["amigurumi", "garments", "blankets", "accessories", "home-decor", "baby-items", "jewelry"];
const VALID_YARNS = ["lace-fingering", "sport-dk", "worsted-aran", "bulky-super", "no-preference"];
const VALID_HOOKS = ["small", "medium", "large", "mixed"];
const VALID_GOALS = ["learn", "share", "patterns", "connect", "marketplace", "challenges", "courses"];

function validate(body) {
  const errors = [];
  if (!VALID_SKILLS.includes(body.skillLevel)) errors.push("Invalid skill level");
  if (!Array.isArray(body.craftInterests) || body.craftInterests.length === 0) errors.push("Select at least one craft");
  if (!Array.isArray(body.projectTypes) || body.projectTypes.length === 0) errors.push("Select at least one project type");
  if (!VALID_YARNS.includes(body.yarnPreference)) errors.push("Invalid yarn preference");
  if (!VALID_HOOKS.includes(body.hookSize)) errors.push("Invalid hook size");
  if (!Array.isArray(body.communityGoals) || body.communityGoals.length === 0) errors.push("Select at least one goal");
  return errors;
}

export async function POST(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const body = await req.json();
  const errors = validate(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0] }, { status: 400 });
  }

  const profile = {
    skillLevel: body.skillLevel,
    craftInterests: body.craftInterests.filter((c) => VALID_CRAFTS.includes(c)),
    projectTypes: body.projectTypes.filter((p) => VALID_PROJECTS.includes(p)),
    yarnPreference: body.yarnPreference,
    hookSize: body.hookSize,
    communityGoals: body.communityGoals.filter((g) => VALID_GOALS.includes(g)),
    onboardingCompleted: true,
    onboardingCompletedAt: new Date(),
  };

  await adminDb().collection("users").doc(auth.user.uid).set(profile, { merge: true });

  return NextResponse.json({ ok: true });
}

export async function GET(req) {
  const auth = await requireUser();
  const denied = guardJson(auth);
  if (denied) return denied;

  const doc = await adminDb().collection("users").doc(auth.user.uid).get();
  const data = doc.exists ? doc.data() : {};

  return NextResponse.json({
    completed: !!data.onboardingCompleted,
    skillLevel: data.skillLevel || "",
    craftInterests: data.craftInterests || [],
    projectTypes: data.projectTypes || [],
    yarnPreference: data.yarnPreference || "",
    hookSize: data.hookSize || "",
    communityGoals: data.communityGoals || [],
  });
}
