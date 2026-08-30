import { getCurrentUser } from "@/lib/server/auth";
import { getPerkTier, perkTierAtLeast, getMonthlyPattern, buildPatternPdf } from "@/lib/server/perks";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Not signed in", { status: 401 });
  }
  const perkTier = await getPerkTier(user.uid);
  if (!perkTierAtLeast(perkTier, "plus")) {
    return new Response("Plus membership required", { status: 403 });
  }

  const pattern = getMonthlyPattern();
  const pdf = buildPatternPdf(pattern);
  const filename = `yarnery-${pattern.key || "pattern"}.pdf`;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}