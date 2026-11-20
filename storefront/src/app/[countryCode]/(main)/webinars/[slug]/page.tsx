import React from "react"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBaseURL } from "@lib/util/env"
import Link from "next/link"
import {
  Calendar,
  Clock,
  Award,
  Video,
  FileText,
  Download,
  Users,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import { cookies } from "next/headers"
import { getWebinarBySlug, getWebinars, getWebinarSubscriptionStatus } from "@lib/data/webinars"
import { retrieveCustomer } from "@lib/data/customer"
import { getActivePromotionalBanner } from "@lib/data/promotions"
import WebinarPurchaseOptions from "@/components/webinars/WebinarPurchaseOptions"
import WebinarCard from "@/components/webinars/WebinarCard"
import WebinarDetailsTabs from "@/components/webinars/WebinarDetailsTabs"
import WebinarPromotionalBanner from "@/components/promotions/WebinarPromotionalBanner"
import WebinarQuickNav from "@/components/webinars/WebinarQuickNav"
import WebinarStickyBottomBar from "@/components/webinars/WebinarStickyBottomBar"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string; slug: string }>
}): Promise<Metadata> {
  const { countryCode, slug } = await props.params
  const webinar = await getWebinarBySlug(slug).catch(() => null)

  if (!webinar) {
    return {
      title: "Webinar Not Found | AcademyIO",
      robots: { index: false, follow: false },
    }
  }

  const baseUrl = getBaseURL().replace(/\/$/, "")
  const canonicalUrl = `${baseUrl}/${countryCode}/webinars/${webinar.slug}`
  const title = webinar.seo_title || `${webinar.title} | AcademyIO CPE Webinar`
  const description =
    webinar.seo_description ||
    webinar.short_description ||
    `Earn ${webinar.cpe_credits || 2} CPE credits with ${webinar.speaker_name} on AcademyIO.`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: webinar.featured_image ? [{ url: webinar.featured_image, alt: webinar.title }] : undefined,
    },
  }
}

export default async function WebinarDetailsPage(props: {
  params: Promise<{ countryCode: string; slug: string }>
}) {
  const { countryCode, slug } = await props.params
  const [webinar, customer] = await Promise.all([
    getWebinarBySlug(slug),
    retrieveCustomer(),
  ])

  if (!webinar) {
    notFound()
  }

  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value

  const [activeBanner, { webinars: allWebinars }, subscriptionStatus] = await Promise.all([
    getActivePromotionalBanner({
      webinarId: webinar.id,
      category: webinar.category,
    }),
    getWebinars({ limit: 4 }),
    getWebinarSubscriptionStatus(webinar.id, token, customer?.email, customer?.id),
  ])
  const relatedWebinars = allWebinars.filter((w) => w.id !== webinar.id).slice(0, 3)

  const prices = (webinar.variants || [])
    .map((v) => Number(v.price))
    .filter((p) => !isNaN(p) && p > 0)
  const minPrice = prices.length > 0 ? Math.min(...prices) : 29
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 249
  const currency = webinar.variants?.[0]?.currency_code?.toUpperCase() || "USD"
  const isSubscriptionIncluded = Boolean(
    subscriptionStatus?.has_active_subscription && subscriptionStatus?.is_webinar_included
  )

  const eventDate = new Date(webinar.event_date)
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="pb-16 bg-gray-50/50 dark:bg-slate-950 transition-colors">
      {/* Hero Header */}
      <section className="bg-slate-950 text-white pt-8 pb-7 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto space-y-3.5">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <Link href={`/${countryCode}`} className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/${countryCode}/webinars`} className="hover:text-white transition-colors">Webinars</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-200 truncate">{webinar.category}</span>
          </nav>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
              {webinar.category}
            </span>
            {webinar.is_ondemand || (webinar.is_completed && webinar.has_recording) ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                Self-Study Recording
              </span>
            ) : webinar.is_completed ? (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700/60">
                Live Broadcast Concluded
              </span>
            ) : (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">
                Upcoming Live Session
              </span>
            )}
            {webinar.cpe_credits > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white">
                <Award className="w-3.5 h-3.5" />
                {webinar.cpe_credits} CPE Credits Approved
              </span>
            )}
            {subscriptionStatus?.has_active_subscription && subscriptionStatus?.is_webinar_included && (
              <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Included in Your Subscription
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {webinar.title}
          </h1>

          {/* Short Description */}
          {webinar.short_description && (
            <p className="text-slate-300 text-sm sm:text-base max-w-4xl leading-relaxed">
              {webinar.short_description}
            </p>
          )}

          {/* Key Event Metadata Row */}
          <div className="pt-3 flex flex-wrap items-center gap-5 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>{webinar.start_time} - {webinar.end_time} ({webinar.timezone})</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Duration: {webinar.duration_minutes} Minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Quick-Nav Strip */}
      <WebinarQuickNav
        minPrice={minPrice}
        currency={currency}
        isSubscriptionIncluded={isSubscriptionIncluded}
        hasObjectives={Boolean(
          Array.isArray(webinar.learning_objectives) &&
          webinar.learning_objectives.some((o: any) => typeof o === "string" && o.trim().length > 0)
        )}
        hasCredits={Boolean(webinar.cpe_credits || webinar.credit_info)}
      />

      {/* Main Content Grid: Description (Left) + Purchase Options (Right) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6">
        {activeBanner && (
          <div className="mb-4 sm:mb-5">
            <WebinarPromotionalBanner banner={activeBanner} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Course Details Organized into Tabs */}
          <div className="lg:col-span-7">
            <WebinarDetailsTabs
              webinar={webinar}
              countryCode={countryCode}
              creditInfo={webinar.credit_info}
            />
          </div>

          {/* Right Column: Sticky Purchase Box */}
          <div id="purchase-options" className="lg:col-span-5 sticky top-24 scroll-mt-24 transition-all">
            <WebinarPurchaseOptions
              webinar={webinar}
              countryCode={countryCode}
              customer={customer}
              initialSubscriptionStatus={subscriptionStatus}
              authToken={token}
            />
          </div>
        </div>
      </section>

      {/* Related Webinars Section */}
      {relatedWebinars.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-10 border-t border-gray-200 dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mb-5">Related Courses & Masterclasses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedWebinars.map((item) => (
              <WebinarCard key={item.id} webinar={item} countryCode={countryCode} />
            ))}
          </div>
        </section>
      )}

      {/* Floating Mobile Sticky Bottom Bar */}
      <WebinarStickyBottomBar
        title={webinar.title}
        minPrice={minPrice}
        currency={currency}
        isSubscriptionIncluded={isSubscriptionIncluded}
        cpeCredits={webinar.cpe_credits}
        isCompleted={webinar.is_completed}
      />
    </div>
  )
}
