import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  (process.env.NODE_ENV === "production" || process.env.VERCEL
    ? "https://academyio-backend.onrender.com"
    : "http://localhost:9000")
const PUBLISHABLE_API_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "us"

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
 * Middleware to handle region selection and onboarding status.
 */
export async function middleware(request: NextRequest) {
  let redirectUrl = request.nextUrl.href

  let response = NextResponse.redirect(redirectUrl, 307)

  let cacheIdCookie = request.cookies.get("_medusa_cache_id")

  let cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)

  const countryCode = regionMap && (await getCountryCode(request, regionMap))

  const urlHasCountryCode =
    countryCode && request.nextUrl.pathname.split("/")[1].includes(countryCode)

  // Redirect /cart directly to /checkout
  if (
    request.nextUrl.pathname.endsWith("/cart") ||
    request.nextUrl.pathname.includes("/cart/")
  ) {
    const targetCountry = countryCode || DEFAULT_REGION
    const checkoutUrl = new URL(`/${targetCountry}/checkout`, request.url)
    const redirectRes = NextResponse.redirect(checkoutUrl, 307)
    if (!cacheIdCookie) {
      redirectRes.cookies.set("_medusa_cache_id", cacheId, { maxAge: 60 * 60 * 24 })
    }
    return redirectRes
  }

  // if one of the country codes is in the url, return next (setting cookie if needed without extra redirect)
  if (urlHasCountryCode) {
    const res = NextResponse.next()
    if (!cacheIdCookie) {
      res.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
    }
    return res
  }

  // check if the url is a static asset
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname

  const queryString = request.nextUrl.search ? request.nextUrl.search : ""

  // If no country code is set, we redirect to the relevant region.
  if (!urlHasCountryCode && countryCode) {
    redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`
    response = NextResponse.redirect(`${redirectUrl}`, 307)
  } else if (!urlHasCountryCode && !countryCode) {
    // Handle case where no valid country code exists (empty regions)
    return new NextResponse(
      "No valid regions configured. Please set up regions with countries in your Medusa Admin.",
      { status: 500 }
    )
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
