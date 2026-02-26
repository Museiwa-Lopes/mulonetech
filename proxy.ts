import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "mulone_admin_session";

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginRoute = request.nextUrl.pathname.startsWith("/admin/login");
  const hasAdminSession = Boolean(request.cookies.get(ADMIN_COOKIE_NAME)?.value);

  if (isLoginRoute && hasAdminSession) {
    const response = NextResponse.next();
    response.cookies.delete(ADMIN_COOKIE_NAME);
    return response;
  }

  if (isAdminRoute && !isLoginRoute && !hasAdminSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

