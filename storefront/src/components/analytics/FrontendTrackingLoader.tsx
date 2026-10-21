"use client"

import React, { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import { StoreTrackingCode } from "@lib/data/tracking-codes"

interface FrontendTrackingLoaderProps {
  trackingCodes: StoreTrackingCode[]
}

declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
    _linkedin_data_partner_ids?: any[]
    lintrk?: (...args: any[]) => void
    clarity?: (...args: any[]) => void
  }
}

/**
 * Checks whether a tracking code should execute on the current route path
 */
function isCodeEligibleForPath(code: StoreTrackingCode, pathname: string): boolean {
  if (!code.is_enabled) return false
  if (code.target_pages === "all") return true

  // Normalize pathname (remove country code prefix if needed for matching)
  const normalizedPath = pathname.replace(/^\/[a-zA-Z]{2}(?=\/|$)/, "") || "/"

  switch (code.target_pages) {
    case "homepage":
      return pathname === "/" || normalizedPath === "/" || /^\/[a-zA-Z]{2}$/.test(pathname)
    case "webinars":
      return pathname.includes("/webinars")
    case "subscriptions":
      return pathname.includes("/subscriptions")
    case "checkout":
      return pathname.includes("/checkout")
    case "custom":
      if (!code.target_paths || code.target_paths.length === 0) return true
      return code.target_paths.some((p) => {
        const cleanP = p.trim()
        return pathname.includes(cleanP) || normalizedPath.startsWith(cleanP)
      })
    default:
      return true
  }
}

export default function FrontendTrackingLoader({ trackingCodes = [] }: FrontendTrackingLoaderProps) {
  const pathname = usePathname()
  const [codes, setCodes] = React.useState<StoreTrackingCode[]>(trackingCodes)
  const initializedProviders = useRef<Set<string>>(new Set())
  const lastPathname = useRef<string>(pathname)

  // Client-side fetch to ensure instant reactivity if admin modifies tracking codes
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    const publishableKey =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
      "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"

    fetch(`${backendUrl}/store/tracking-codes`, {
      headers: {
        "x-publishable-api-key": publishableKey,
      },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data && Array.isArray(data.tracking_codes)) {
          setCodes(data.tracking_codes)
        }
      })
      .catch(() => {
        // Fail safely and keep initial codes
      })
  }, [])

  // 1. Mandatory Security Boundary: Block if route is administrative
  if (
    !pathname ||
    pathname.startsWith("/webapp") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/api")
  ) {
    return null
  }

  // Filter only enabled codes
  const enabledCodes = codes.filter((c) => c.is_enabled)
  if (enabledCodes.length === 0) return null

  // 2. Client-side Route Transition Listener (avoid duplicate scripts, dispatch single page_view event)
  useEffect(() => {
    if (!pathname) return
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname

    // Notify active trackers on route transition
    enabledCodes.forEach((code) => {
      if (!isCodeEligibleForPath(code, pathname)) return

      try {
        if (code.type === "ga4" && code.tracking_id && typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "page_view", {
            page_title: document.title,
            page_path: pathname,
            page_location: window.location.href,
          })
        }

        if (code.type === "gtm" && typeof window !== "undefined" && window.dataLayer) {
          window.dataLayer.push({
            event: "page_view",
            page_path: pathname,
            page_title: document.title,
          })
        }

        if (code.type === "meta_pixel" && typeof window !== "undefined" && window.fbq) {
          window.fbq("track", "PageView")
        }
      } catch (err) {
        console.warn("[Analytics] Error recording route transition:", err)
      }
    })
  }, [pathname, enabledCodes])

  // 3. Inject Verification Meta Tags (Google Search Console & Bing Webmaster)
  useEffect(() => {
    const metaCodes = enabledCodes.filter(
      (c) => (c.type === "gsc" || c.type === "bing") && c.tracking_id
    )

    metaCodes.forEach((code) => {
      if (!isCodeEligibleForPath(code, pathname)) return

      const metaName = code.type === "gsc" ? "google-site-verification" : "msvalidate.01"
      let existing = document.querySelector(`meta[name="${metaName}"]`)

      if (!existing && code.tracking_id) {
        const meta = document.createElement("meta")
        meta.name = metaName
        meta.content = code.tracking_id
        document.head.appendChild(meta)
      }
    })
  }, [enabledCodes, pathname])

  return (
    <>
      {enabledCodes.map((code) => {
        if (!isCodeEligibleForPath(code, pathname)) return null

        switch (code.type) {
          // --- Google Search Console Verification ---
          case "gsc": {
            if (!code.tracking_id) return null
            return (
              <meta
                key={`gsc-${code.id}`}
                name="google-site-verification"
                content={code.tracking_id}
              />
            )
          }

          // --- Bing Webmaster Verification ---
          case "bing": {
            if (!code.tracking_id) return null
            return (
              <meta
                key={`bing-${code.id}`}
                name="msvalidate.01"
                content={code.tracking_id}
              />
            )
          }

          // --- Google Analytics 4 ---
          case "ga4": {
            if (!code.tracking_id) return null
            const gaId = code.tracking_id

            return (
              <React.Fragment key={`ga4-${code.id}`}>
                <Script
                  id={`ga4-script-${code.id}`}
                  strategy="afterInteractive"
                  src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                />
                <Script
                  id={`ga4-init-${code.id}`}
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${gaId}', {
                        page_path: window.location.pathname,
                        send_page_view: true
                      });
                    `,
                  }}
                />
              </React.Fragment>
            )
          }

          // --- Google Tag Manager ---
          case "gtm": {
            if (!code.tracking_id) return null
            const gtmId = code.tracking_id

            return (
              <Script
                key={`gtm-${code.id}`}
                id={`gtm-init-${code.id}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${gtmId}');
                  `,
                }}
              />
            )
          }

          // --- Meta (Facebook) Pixel ---
          case "meta_pixel": {
            if (!code.tracking_id) return null
            const pixelId = code.tracking_id

            return (
              <Script
                key={`meta-${code.id}`}
                id={`meta-pixel-${code.id}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${pixelId}');
                    fbq('track', 'PageView');
                  `,
                }}
              />
            )
          }

          // --- Microsoft Clarity ---
          case "clarity": {
            if (!code.tracking_id) return null
            const clarityId = code.tracking_id

            return (
              <Script
                key={`clarity-${code.id}`}
                id={`clarity-init-${code.id}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    (function(c,l,a,r,i,t,y){
                      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                    })(window, document, "clarity", "script", "${clarityId}");
                  `,
                }}
              />
            )
          }

          // --- LinkedIn Insight Tag ---
          case "linkedin": {
            if (!code.tracking_id) return null
            const partnerId = code.tracking_id

            return (
              <Script
                key={`linkedin-${code.id}`}
                id={`linkedin-init-${code.id}`}
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    _linkedin_partner_id = "${partnerId}";
                    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
                    window._linkedin_data_partner_ids.push(_linkedin_partner_id);
                    (function(l) {
                      if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                      window.lintrk.q=[]}
                      var s = document.getElementsByTagName("script")[0];
                      var b = document.createElement("script");
                      b.type = "text/javascript";b.async = true;
                      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                      s.parentNode.insertBefore(b, s);
                    })(window.lintrk);
                  `,
                }}
              />
            )
          }

          // --- Custom Script Snippets ---
          case "custom": {
            if (!code.custom_code) return null
            const strategy = code.placement === "body_end" ? "lazyOnload" : "afterInteractive"

            // Extract pure script text if enclosed in <script> tags
            let scriptContent = code.custom_code
            const scriptTagMatch = scriptContent.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)
            if (scriptTagMatch) {
              scriptContent = scriptTagMatch[1]
            }

            return (
              <Script
                key={`custom-${code.id}`}
                id={`custom-tracking-${code.id}`}
                strategy={strategy}
                dangerouslySetInnerHTML={{
                  __html: `
                    try {
                      ${scriptContent}
                    } catch (e) {
                      console.warn("[Custom Tracking Code '${code.name}' Error]:", e);
                    }
                  `,
                }}
              />
            )
          }

          default:
            return null
        }
      })}
    </>
  )
}
