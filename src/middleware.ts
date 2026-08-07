import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/config/locales";
import { isKnownSession } from "@/lib/auth/app-users";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (pathname === "/install" || pathname.startsWith("/estimate/")) {
    return NextResponse.next();
  }

  if (!hasLocale) {
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const locale = locales.find((item) => pathname === `/${item}` || pathname.startsWith(`/${item}/`)) ?? defaultLocale;
  const isInstall = pathname === `/${locale}/install`;
  const isLogin = pathname === `/${locale}/login`;
  const isPublicSalesFlow = pathname === `/${locale}/start`;
  const isPublicEstimate = pathname.startsWith(`/${locale}/estimate/`);
  const isAdminRoute = pathname === `/${locale}/admin`;
  const isAuthenticated = isKnownSession(request.cookies.get("fastclean_session")?.value);
  const isPlatformAdmin = request.cookies.get("fastclean_platform_admin")?.value === "true";

  if (isInstall) {
    request.nextUrl.pathname = "/install";
    return NextResponse.redirect(request.nextUrl);
  }

  if (!isAuthenticated && !isLogin && !isPublicSalesFlow && !isPublicEstimate) {
    request.nextUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(request.nextUrl);
  }

  if (isAuthenticated && isLogin) {
    request.nextUrl.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(request.nextUrl);
  }

  if (isAdminRoute && !isPlatformAdmin) {
    request.nextUrl.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(request.nextUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
