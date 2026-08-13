import { NextResponse } from "next/server";

const AUTH_COOKIE = "community-auth";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(AUTH_COOKIE)?.value;

  if (!hasSession) {
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
  ],
};
