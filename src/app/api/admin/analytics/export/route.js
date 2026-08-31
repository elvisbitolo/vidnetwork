import { requireOwner, guardJson } from "@/lib/server/authorize";
import { buildAnalyticsCsv } from "@/lib/server/analytics";

export async function GET() {
  const auth = await requireOwner();
  const denied = guardJson(auth);
  if (denied) return denied;

  const csv = await buildAnalyticsCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yarnery-analytics-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
