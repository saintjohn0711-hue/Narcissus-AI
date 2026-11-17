import { NextResponse, type NextRequest } from "next/server";
import {
  AGE_GATE_COOKIE,
  AGE_GATE_PATH,
  AGE_GATE_VALUE,
  MENU_PATH,
  isAgeGateExemptPath,
  sanitizeNextPath,
} from "@/lib/ageGate";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const agreed =
    request.cookies.get(AGE_GATE_COOKIE)?.value === AGE_GATE_VALUE;

  if (pathname === AGE_GATE_PATH) {
    if (agreed) {
      const next = sanitizeNextPath(
        request.nextUrl.searchParams.get("next"),
        MENU_PATH,
      );
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (isAgeGateExemptPath(pathname)) {
    return NextResponse.next();
  }

  if (!agreed) {
    const dest = request.nextUrl.clone();
    dest.pathname = AGE_GATE_PATH;
    dest.search = "";
    const returnTo = `${pathname}${search}`;
    if (returnTo && returnTo !== "/") {
      dest.searchParams.set("next", returnTo);
    }
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on all paths except Next internals and common static assets.
     * Age-exempt logic also lives in isAgeGateExemptPath for defense in depth.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/).*)",
  ],
};
