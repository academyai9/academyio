import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import {
  BACKEND_URL,
  PUBLISHABLE_KEY as PUBLISHABLE_API_KEY,
  DEFAULT_REGION,
} from "./lib/config-env"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    if (BACKEND_URL && PUBLISHABLE_API_KEY) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        const response = await fetch(`${BACKEND_URL}/store/regions`, {
          headers: {
            "x-publishable-api-key": PUBLISHABLE_API_KEY,
          },
          next: {
            revalidate: 3600,
            tags: [`regions-${cacheId}`],
          },
          cache: "force-cache",
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout))

        if (response.ok) {
          const json = await response.json()
          if (json.regions?.length) {
            json.regions.forEach((region: HttpTypes.StoreRegion) => {
              region.countries?.forEach((c) => {
                regionMapCache.regionMap.set(c.iso_2 ?? "", region)
              })
            })
            regionMapCache.regionMapUpdated = Date.now()
            return regionMapCache.regionMap
          }
        }
      } catch (err) {
        // Log gently and continue with fallback
        if (process.env.NODE_ENV === "development") {
          console.warn("Middleware: Unable to reach backend for regions, using fallback.")
        }
      }
    }

    // Fallback default region if backend is unreachable or has no regions configured yet
    if (!regionMapCache.regionMap.has(DEFAULT_REGION)) {
      regionMapCache.regionMap.set(DEFAULT_REGION, {
        id: "reg_default",
        name: "United States",
        currency_code: "usd",
        countries: [{ id: "c_us", iso_2: DEFAULT_REGION, display_name: "United States" }],
      } as any)
    }
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
) {
  try {
    let countryCode

    const vercelCountryCode = request.headers
      .get("x-vercel-ip-country")
      ?.toLowerCase()

    const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

    if (urlCountryCode && regionMap.has(urlCountryCode)) {
      countryCode = urlCountryCode
    } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
      countryCode = vercelCountryCode
    } else if (regionMap.has(DEFAULT_REGION)) {
      countryCode = DEFAULT_REGION
    } else if (regionMap.keys().next().value) {
      countryCode = regionMap.keys().next().value
    }

    return countryCode
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "Middleware.ts: Error getting the country code. Did you set up regions in your Medusa Admin and define a MEDUSA_BACKEND_URL environment variable? Note that the variable is no longer named NEXT_PUBLIC_MEDUSA_BACKEND_URL."
      )
    }
  }
}

/**
 * Optimized high-performance Middleware:
 * 1. Instantly passes through requests that already contain country code without blocking on backend.
 * 2. Instantly redirects root "/" or missing country paths to target country without waiting for Render.
 * 3. Handles /cart -> /checkout redirection seamlessly.
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

  // 2. Check if URL already has valid country code (e.g. /us or any 2-letter ISO code)
  const isCountryPath =
    firstSegment === DEFAULT_REGION || (firstSegment && /^[a-z]{2}$/.test(firstSegment))

  if (isCountryPath) {
    const country = firstSegment

    // Redirect /cart directly to /checkout
    if (pathname.endsWith("/cart") || pathname.includes("/cart/")) {
      const checkoutUrl = new URL(`/${country}/checkout`, request.url)
      const res = NextResponse.redirect(checkoutUrl, 307)
      if (!request.cookies.get("_medusa_cache_id")) {
        res.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
          maxAge: 60 * 60 * 24,
        })
      }
      return res
    }

    // Fast-path: URL already has country code, proceed without ANY backend latency!
    const res = NextResponse.next()
    if (!request.cookies.get("_medusa_cache_id")) {
      res.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
        maxAge: 60 * 60 * 24,
      })
    }
    return res
  }

  // 3. For root or paths without country prefix, detect country or fallback to DEFAULT_REGION
  const vercelCountry = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()

  const targetCountry =
    vercelCountry && /^[a-z]{2}$/.test(vercelCountry)
      ? vercelCountry
      : DEFAULT_REGION

  const redirectPath = pathname === "/" ? "" : pathname
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${targetCountry}${redirectPath}${queryString}`

  const response = NextResponse.redirect(redirectUrl, 307)
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
