export function appOrigin(req) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const origin = req.headers.get("origin") || "";
  if (/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) return origin;
  return "http://localhost:3000";
}
