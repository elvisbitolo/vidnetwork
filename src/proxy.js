import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const AUTH_COOKIE = "community-auth";
const handleI18nRouting = createMiddleware(routing);

const AUTH_ROUTES = [
  "/rooms",
  "/courses",
  "/groups",
  "/notifications",
  "/account",
  "/admin",
  "/members",
  "/feed",
  "/events",
  "/chat",
  "/host",
  "/leaderboard",
  "/challenges",
  "/recordings",
  "/spaces",
  "/discovery",
  "/dashboard",
];

export function proxy(request) {
  const i18nResponse = handleI18nRouting(request);
  if (i18nResponse) return i18nResponse;

  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(AUTH_COOKIE)?.value;

  const needsAuth = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (needsAuth && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
