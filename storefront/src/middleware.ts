import { NextRequest, NextResponse } from "next/server"
import { DEFAULT_REGION } from "./lib/config-env"

const ALLOWED_REGION = (DEFAULT_REGION || "us").toLowerCase()

/**
 * High-performance Middleware:
 * 1. Enforces single country code ('/us').
 * 2. Redirects root '/' or missing country routes to '/us/...'.
 * 3. Redirects any other country codes (e.g. /in, /dk, /iw, /ca, /uk) to '/us/...'.
 * 4. Redirects '/us/cart' to '/us/checkout'.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Skip static assets, API routes, or file extensions immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const segments = pathname.split("/").filter(Boolean)
  const firstSegment = segments[0]?.toLowerCase()

  // 2. Strict Check: If URL already starts with /us
  if (firstSegment === ALLOWED_REGION) {
    // Redirect /us/cart directly to /us/checkout
    if (pathname === `/${ALLOWED_REGION}/cart` || pathname.startsWith(`/${ALLOWED_REGION}/cart/`)) {
      const checkoutUrl = new URL(`/${ALLOWED_REGION}/checkout`, request.url)
      const res = NextResponse.redirect(checkoutUrl, 307)
      if (!request.cookies.get("_medusa_cache_id")) {
        res.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
          maxAge: 60 * 60 * 24,
        })
      }
      return res
    }

    // Fast-path: /us route is valid, proceed immediately
    const res = NextResponse.next()
    if (!request.cookies.get("_medusa_cache_id")) {
      res.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
        maxAge: 60 * 60 * 24,
      })
    }
    return res
  }

  const queryString = request.nextUrl.search || ""

  // 3. If first segment is another 2-letter country code (e.g. /in, /dk, /iw, /ca, /uk, etc.)
  // Automatically rewrite/redirect to /us with the rest of the path preserved
  if (firstSegment && /^[a-z]{2}$/.test(firstSegment)) {
    const remainingSegments = segments.slice(1)
    const newPath = remainingSegments.length > 0 ? `/${remainingSegments.join("/")}` : ""
    const targetUrl = `${request.nextUrl.origin}/${ALLOWED_REGION}${newPath}${queryString}`

    const res = NextResponse.redirect(targetUrl, 308)
    if (!request.cookies.get("_medusa_cache_id")) {
      res.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
        maxAge: 60 * 60 * 24,
      })
    }
    return res
  }

  // 4. User accessed root "/" or a path without country prefix (e.g. /webinars, /contact, /login)
  // Always redirect to /us prefix (ignoring any Vercel IP location header)
  const redirectPath = pathname === "/" ? "" : pathname
  const redirectUrl = `${request.nextUrl.origin}/${ALLOWED_REGION}${redirectPath}${queryString}`

  const response = NextResponse.redirect(redirectUrl, 308)
  if (!request.cookies.get("_medusa_cache_id")) {
    response.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
