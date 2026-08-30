import { getCurrentUser, getUserDoc } from "@/lib/server/auth";
import { getAccessSub } from "@/lib/server/subscription";
import { getSettings } from "@/lib/server/settings";
import { getGamification } from "@/lib/server/gamification";

export async function loadAccount() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [userDoc, sub, settings, gamification] = await Promise.all([
    getUserDoc(user.uid).catch(() => null),
    getAccessSub(user.uid).catch(() => null),
    getSettings().catch(() => ({ welcomeChecklist: undefined })),
    getGamification(user.uid, user.displayName || user.name || "Member").catch(() => null),
  ]);

  return { user, userDoc, sub, settings, gamification };
}