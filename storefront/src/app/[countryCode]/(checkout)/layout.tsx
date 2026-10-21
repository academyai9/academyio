import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import { getStoreTrackingCodes } from "@lib/data/tracking-codes"
import FrontendTrackingLoader from "@/components/analytics/FrontendTrackingLoader"

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const trackingCodes = await getStoreTrackingCodes()

  return (
    <div className="w-full bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 relative small:min-h-screen">
      <FrontendTrackingLoader trackingCodes={trackingCodes} />
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/webinars"
            className="text-small-semi text-ui-fg-base dark:text-slate-200 flex items-center gap-x-2 uppercase flex-1 basis-0"
            data-testid="back-to-webinars-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle dark:text-slate-400 hover:text-ui-fg-base dark:hover:text-white">
              Back to webinars
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle dark:text-slate-400 hover:text-ui-fg-base dark:hover:text-white">
              Back
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="flex items-center"
            data-testid="store-link"
            aria-label="AcademyIO Homepage"
          >
            <img
              src="/logos/academyio-logo.png"
              alt="AcademyIO - Empowering Future Minds"
              className="h-9 w-auto max-w-[190px] object-contain dark:hidden"
            />
            <img
              src="/logos/academyio-logo-white.png"
              alt="AcademyIO - Empowering Future Minds"
              className="h-9 w-auto max-w-[190px] object-contain hidden dark:block"
            />
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
      <div className="py-4 w-full flex items-center justify-center">
        <MedusaCTA />
      </div>
    </div>
  )
}
