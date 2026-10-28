import React from "react"
import { notFound } from "next/navigation"
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
import WebinarCreditsAndInfo from "@/components/webinars/WebinarCreditsAndInfo"
import WebinarPromotionalBanner from "@/components/promotions/WebinarPromotionalBanner"
import WebinarHeroQuickCTA from "@/components/webinars/WebinarHeroQuickCTA"
import WebinarQuickNav from "@/components/webinars/WebinarQuickNav"
import WebinarStickyBottomBar from "@/components/webinars/WebinarStickyBottomBar"

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

          {/* Hero Action & Quick Pricing Bar */}
          <div className="pt-4 mt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                  Format & Tuition:
                </span>
                <span className="text-lg sm:text-xl font-black text-white">
                  {isSubscriptionIncluded ? (
                    <span className="text-emerald-400">Included Free with Subscription</span>
                  ) : (
                    <>
                      <span className="text-slate-400 text-xs font-normal mr-1">Starting from</span>
                      ${minPrice} <span className="text-xs text-slate-400 font-semibold uppercase">{currency}</span>
                    </>
                  )}
                </span>
                {webinar.cpe_credits > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                    {webinar.cpe_credits} CPE Approved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Selectable formats:</span>
                <span className="font-medium text-slate-200">Live Broadcast</span>
                <span>•</span>
                <span className="font-medium text-slate-200">Video Replay</span>
                <span>•</span>
                <span className="font-medium text-slate-200">Written Transcript</span>
                <span>•</span>
                <span className="font-medium text-slate-200">Study PDFs</span>
              </p>
            </div>

            <WebinarHeroQuickCTA
              minPrice={minPrice}
              maxPrice={maxPrice}
              currency={currency}
              isSubscriptionIncluded={isSubscriptionIncluded}
              hasActiveSubscription={subscriptionStatus?.has_active_subscription}
              isCompleted={webinar.is_completed}
              hasRecording={Boolean(webinar.recording_ready || webinar.has_recording)}
            />
          </div>
        </div>
      </section>

      {/* Sticky Quick-Nav Strip */}
      <WebinarQuickNav
        minPrice={minPrice}
        currency={currency}
        isSubscriptionIncluded={isSubscriptionIncluded}
        hasObjectives={Boolean(webinar.learning_objectives && webinar.learning_objectives.length > 0)}
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
          {/* Left Column: Course Details */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {/* Mobile Top Pricing Snapshot Card (Jump to purchase) */}
            <div className="lg:hidden p-4 rounded-xl bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                  Select Format & Tuition
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {isSubscriptionIncluded ? "Included Free" : `Starting from $${minPrice}`}
                  </span>
                  {!isSubscriptionIncluded && (
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 uppercase font-semibold">{currency}</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 dark:text-slate-400 mt-0.5">
                  Live Broadcast, HD Video Recording, Transcript & PDF Study Guide.
                </p>
              </div>

              <WebinarHeroQuickCTA
                minPrice={minPrice}
                maxPrice={maxPrice}
                currency={currency}
                isSubscriptionIncluded={isSubscriptionIncluded}
                hasActiveSubscription={subscriptionStatus?.has_active_subscription}
                isCompleted={webinar.is_completed}
                hasRecording={Boolean(webinar.recording_ready || webinar.has_recording)}
              />
            </div>

            {/* About the Instructor */}
            <div id="instructor" className="scroll-mt-28 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">About the Instructor</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {webinar.speaker_photo && (
                    <img
                      src={webinar.speaker_photo}
                      alt={webinar.speaker_name}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-gray-100 dark:border-slate-700 shadow-xs shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">{webinar.speaker_name}</h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{webinar.speaker_title || "Subject Matter Authority"}</p>
                  </div>
                </div>

                {webinar.speaker_id && (
                  <Link
                    href={`/${countryCode}/speakers/${webinar.speaker_id}`}
                    className="shrink-0 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700 text-xs font-bold transition-colors"
                  >
                    View Faculty Profile →
                  </Link>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {webinar.speaker_bio || "Nationally recognized educator with extensive hands-on experience advising clients and training practitioners."}
              </p>
            </div>

            {/* Course Overview & Program Description */}
            <div id="overview" className="scroll-mt-28 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Course Overview & Program Description</h2>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300 leading-relaxed space-y-2.5"
                dangerouslySetInnerHTML={{ __html: webinar.description || "<p>Full program description available.</p>" }}
              />
            </div>

            {/* Learning Objectives */}
            {webinar.learning_objectives && webinar.learning_objectives.length > 0 && (
              <div id="objectives" className="scroll-mt-28 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Key Learning Objectives</h2>
                <ul className="space-y-2.5">
                  {webinar.learning_objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target Audience & Prerequisites */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Target Audience & Qualifications</h2>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                {webinar.target_audience || "CPAs, Enrolled Agents (EAs), Tax Attorneys, Controllers, Financial Officers, and Corporate Tax Preparers."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-gray-600 dark:text-slate-400">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
                  <strong className="text-gray-900 dark:text-slate-200">Program Level:</strong> Intermediate to Advanced
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl">
                  <strong className="text-gray-900 dark:text-slate-200">Prerequisites:</strong> Basic knowledge of federal taxation & financial reporting
                </div>
              </div>
            </div>

            {/* Credits and Other Information */}
            <div id="credits" className="scroll-mt-28">
              <WebinarCreditsAndInfo webinar={webinar} creditInfo={webinar.credit_info} />
            </div>

            {/* Refund & Cancellation Policy */}
            <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 flex items-start gap-3.5">
              <ShieldAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-slate-100">Cancellation & Guarantee Policy</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {(webinar as any).refund_policy || "Full refunds are granted up to 24 hours prior to the live session broadcast. Self-study recordings provide 1 year of continuous access."}
                </p>
              </div>
            </div>
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
