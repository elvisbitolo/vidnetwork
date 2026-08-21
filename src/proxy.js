import { NextResponse } from "next/server";

const AUTH_COOKIE = "community-auth";

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
  matcher: [
    "/rooms/:path*",
    "/courses/:path*",
    "/groups/:path*",
    "/notifications/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/members/:path*",
    "/feed/:path*",
    "/events/:path*",
    "/chat/:path*",
    "/host/:path*",
    "/leaderboard/:path*",
    "/challenges/:path*",
    "/recordings/:path*",
    "/spaces/:path*",
    "/discovery/:path*",
    "/dashboard/:path*",
  ],
};
