import React from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock,
  Video,
  PlayCircle,
  FileText,
  Download,
  Award,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  LayoutDashboard,
  User,
  Mail,
  Building2,
  Phone,
  CreditCard,
  Check,
  HelpCircle,
  FileCheck,
  BookOpen,
} from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import { PrintReceiptButton, AddToCalendarButton } from "../components/OrderConfirmationActions"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
  countryCode?: string
  customer?: HttpTypes.StoreCustomer | null
  webinars?: any[]
}

export default function OrderCompletedTemplate({
  order,
  countryCode = "us",
  customer,
  webinars = [],
}: OrderCompletedTemplateProps) {
  const currencyCode = (order.currency_code || "usd").toUpperCase()

  // Extract registrant details
  const billingAddress = order.billing_address || order.shipping_address
  const registrantName =
    `${billingAddress?.first_name || customer?.first_name || ""} ${
      billingAddress?.last_name || customer?.last_name || ""
    }`.trim() || "Valued Professional"

  const company =
    billingAddress?.company ||
    customer?.company_name ||
    (customer as any)?.metadata?.company_name ||
    (customer as any)?.metadata?.company ||
    ""

  const phone = billingAddress?.phone || customer?.phone || ""
  const ptin = (customer as any)?.metadata?.ptin
  const cfpId = (customer as any)?.metadata?.cfp_id

  // Formatted date
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Today"

  const orderTime = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  const displayId = order.display_id || order.id?.slice(-8).toUpperCase()

  // Financial values
  const subtotal = order.item_subtotal || order.subtotal || 0
  const discountTotal = order.discount_total || 0
  const taxTotal = order.tax_total || 0
  const totalPaid = order.total || 0

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 py-10 sm:py-16 text-slate-800 dark:text-slate-100 print:bg-white print:py-4 print:text-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Printable Official Receipt Header */}
        <div className="hidden print:flex items-center justify-between pb-6 border-b border-gray-300">
          <img
            src="/logos/academyio-logo.png"
            alt="AcademyIO"
            className="h-10 w-auto object-contain"
          />
          <div className="text-right text-xs text-gray-500">
            <span className="font-bold text-gray-900 block text-sm">OFFICIAL TAX RECEIPT</span>
            <span>Order #{displayId} • {orderDate}</span>
          </div>
        </div>

        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 print:hidden">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <Link href={`/${countryCode}/webinars`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Webinars
            </Link>
            <span>/</span>
            <Link href={`/${countryCode}/dashboard?tab=orders`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Orders
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-900 dark:text-white">Order #{displayId}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`/api/orders/${order.id}/invoice`}
              download={`AcademyIO-Invoice-${displayId}.pdf`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Download Official Itemized PDF Invoice"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official Invoice (PDF)</span>
            </a>
            <PrintReceiptButton />
            <Link
              href={`/${countryCode}/dashboard?tab=webinars`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Go to My Dashboard</span>
            </Link>
          </div>
        </div>

        {/* HERO CELEBRATION & VERIFICATION BANNER */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-8 sm:p-10 shadow-sm text-center relative overflow-hidden print:border-none print:shadow-none print:p-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 print:hidden" />

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Official CPE Enrollment Confirmed</span>
          </div>

          {/* Success Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 mb-5">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Thank You, {registrantName}!
          </h1>

          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 max-w-2xl mx-auto mt-2.5 leading-relaxed">
            Your registration is complete and your continuing education seats are officially reserved.
            An itemized tax receipt and calendar access credentials have been delivered to{" "}
            <strong className="text-blue-600 dark:text-blue-400 font-semibold">{order.email}</strong>.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-gray-100 dark:border-slate-800/80 text-left">
            <div className="p-3.5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">
                Order Number
              </span>
              <span className="text-sm sm:text-base font-extrabold font-mono text-gray-900 dark:text-white mt-0.5 block">
                #{displayId}
              </span>
            </div>

            <div className="p-3.5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">
                Date & Time
              </span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-0.5 block truncate">
                {orderDate} {orderTime && `• ${orderTime}`}
              </span>
            </div>

            <div className="p-3.5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">
                Payment Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  Paid & Authorized
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">
                Fulfillment Mode
              </span>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Instant CPE Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT: LEFT (WEBINAR ACCESS & MATERIALS), RIGHT (RECEIPT & BILLING) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT COLUMN: PURCHASED WEBINARS & LEARNING HUB ================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* ENROLLED WEBINARS CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Enrolled Learning Materials</span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Your CPE credentials and digital access portals are ready below.
                  </p>
                </div>
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-bold text-blue-700 dark:text-blue-300">
                  {order.items?.length || 0} {order.items?.length === 1 ? "Course" : "Courses"}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {order.items?.map((item) => {
                  const matchedWebinar = webinars.find(
                    (w) =>
                      w.product_id === item.product_id ||
                      w.id === item.product_id ||
                      w.variants?.some((v: any) => v.id === item.variant_id)
                  )

                  const isLiveVariant =
                    item.variant_title?.toLowerCase().includes("live") ||
                    (!matchedWebinar?.is_completed && matchedWebinar?.has_live)

                  const isRecordingVariant =
                    item.variant_title?.toLowerCase().includes("recording") ||
                    item.variant_title?.toLowerCase().includes("on-demand")

                  const isTranscriptVariant =
                    item.variant_title?.toLowerCase().includes("transcript")

                  const isHandoutVariant =
                    item.variant_title?.toLowerCase().includes("pdf") ||
                    item.variant_title?.toLowerCase().includes("handout")

                  const eventDateFormatted = matchedWebinar?.event_date
                    ? new Date(matchedWebinar.event_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : null

                  const itemTotalFormatted = convertToLocale({
                    amount: item.total || (item.unit_price || 0) * item.quantity,
                    currency_code: currencyCode,
                  })

                  return (
                    <div
                      key={item.id}
                      className="p-5 bg-gray-50/70 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-4 transition-all hover:border-gray-200 dark:hover:border-slate-700"
                    >
                      {/* Top Header: Thumbnail + Title + Pricing */}
                      <div className="flex items-start gap-4">
                        {item.thumbnail || matchedWebinar?.featured_image ? (
                          <img
                            src={item.thumbnail || matchedWebinar?.featured_image}
                            alt={item.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Video className="w-8 h-8" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-snug">
                              {matchedWebinar?.slug ? (
                                <Link
                                  href={`/${countryCode}/webinars/${matchedWebinar.slug}`}
                                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                item.title
                              )}
                            </h3>
                            <div className="text-right shrink-0">
                              <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white block">
                                {itemTotalFormatted}
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[11px] text-gray-400 block font-medium">
                                  Qty: {item.quantity}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Faculty */}
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                            <span>Instructor:</span>
                            <strong className="text-gray-800 dark:text-slate-200 font-semibold">
                              {matchedWebinar?.speaker_name || "AcademyIO Faculty"}
                            </strong>
                          </p>

                          {/* Format & Accreditation Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              {item.variant_title || "Full CPE Access"}
                            </span>

                            {matchedWebinar?.cpe_credits && matchedWebinar.cpe_credits > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                <Award className="w-3 h-3 text-amber-600" />
                                {matchedWebinar.cpe_credits} CPE Credits
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Schedule / Self-Study Info */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                          {eventDateFormatted ? (
                            <>
                              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {eventDateFormatted}
                              </span>
                              {matchedWebinar?.start_time && (
                                <span className="text-gray-500 dark:text-slate-400">
                                  • {matchedWebinar.start_time}{" "}
                                  {matchedWebinar?.end_time ? `- ${matchedWebinar.end_time}` : ""}{" "}
                                  {matchedWebinar?.timezone || "EDT"}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                On-Demand Self-Study Access Active
                              </span>
                            </>
                          )}
                        </div>

                        {/* Calendar Add Action for live events */}
                        {isLiveVariant && eventDateFormatted && (
                          <AddToCalendarButton
                            title={item.title}
                            startDate={matchedWebinar?.event_date}
                            startTime={matchedWebinar?.start_time}
                            timezone={matchedWebinar?.timezone}
                          />
                        )}
                      </div>

                      {/* Direct Digital Access Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center gap-2.5 print:hidden">
                        {isLiveVariant ? (
                          <Link
                            href={`/${countryCode}/dashboard?tab=webinars`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Access Live Webinar Portal</span>
                          </Link>
                        ) : isRecordingVariant ? (
                          <Link
                            href={`/${countryCode}/dashboard?tab=recordings`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Watch HD Video Replay</span>
                          </Link>
                        ) : isTranscriptVariant ? (
                          <Link
                            href={`/${countryCode}/dashboard?tab=transcripts`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Read & Download Transcript</span>
                          </Link>
                        ) : isHandoutVariant ? (
                          <Link
                            href={`/${countryCode}/dashboard?tab=downloads`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Study Guide & Slides</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/${countryCode}/dashboard?tab=webinars`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            <span>Open in Customer Dashboard</span>
                          </Link>
                        )}

                        {matchedWebinar?.slug && (
                          <Link
                            href={`/${countryCode}/webinars/${matchedWebinar.slug}`}
                            className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-gray-200 dark:border-slate-700"
                          >
                            <span>View Course Syllabus</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CPE ATTENDANCE & VERIFICATION 3-STEP GUIDE */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Next Steps: How to Earn Your Verified CPE Credit</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50/70 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-xs flex items-center justify-center">
                    1
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Join & Participate</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                    Log in 5-10 minutes prior to showtime. For live CPE, answer all interactive attendance check polling prompts.
                  </p>
                </div>

                <div className="p-4 bg-gray-50/70 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold text-xs flex items-center justify-center">
                    2
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Complete Evaluation</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                    Fill out the post-course evaluation survey following NASBA & IRS quality assurance standards.
                  </p>
                </div>

                <div className="p-4 bg-gray-50/70 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center">
                    3
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Instant Certificate</h4>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                    Download your official certificate with credit hours, Field of Study, and your IRS PTIN / CFP ID printed.
                  </p>
                </div>
              </div>
            </div>

            {/* ACCREDITATION & PROVIDER STATEMENT */}
            <div className="p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-slate-900/60 dark:to-slate-850/60 rounded-2xl border border-blue-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300 flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Accreditation & Provider Compliance Guarantee
                </span>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                  AcademyIO is an approved Continuing Professional Education sponsor adhering to NASBA QAS standards, IRS Return Preparer Office CE regulations, and CFP Board CE standards. Certificates are accepted across all 50 State Boards of Accountancy.
                </p>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: RECEIPT, BILLING & REGISTRANT CREDENTIALS ================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* ITEM FINANCIAL SUMMARY (RECEIPT) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Itemized Tax Receipt</span>
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
                  PAID IN FULL
                </span>
              </div>

              <div className="space-y-3 text-xs text-gray-600 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Educational Tuition Subtotal</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {convertToLocale({ amount: subtotal, currency_code: currencyCode })}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Instant Digital Fulfillment</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">
                    FREE ($0.00)
                  </span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold">
                    <span>Promotional Discount</span>
                    <span>- {convertToLocale({ amount: discountTotal, currency_code: currencyCode })}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Applicable State / Regional Tax</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {convertToLocale({ amount: taxTotal, currency_code: currencyCode })}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-base font-extrabold text-gray-900 dark:text-white">
                  <span>Total Amount Paid</span>
                  <span className="text-xl text-blue-600 dark:text-blue-400 font-mono">
                    {convertToLocale({ amount: totalPaid, currency_code: currencyCode })}
                  </span>
                </div>
              </div>

              {/* Payment Method Badge */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium">Direct Authorized Payment</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Lock className="w-3 h-3" />
                  <span>256-Bit Encrypted</span>
                </div>
              </div>
            </div>

            {/* PROFESSIONAL REGISTRANT & CPE INVOICING CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Registrant & CPE Invoicing</span>
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">
                    Registered Professional
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white block mt-0.5">
                    {registrantName}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">
                    Invoicing Email
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-slate-200 block mt-0.5">
                    {order.email}
                  </span>
                </div>

                {company && (
                  <div>
                    <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">
                      Firm / Company Name
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200 block mt-0.5">
                      {company}
                    </span>
                  </div>
                )}

                {phone && (
                  <div>
                    <span className="text-gray-400 dark:text-slate-500 font-medium block text-[11px]">
                      Phone Number
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-slate-200 block mt-0.5">
                      {phone}
                    </span>
                  </div>
                )}

                {/* Professional Reporting IDs */}
                {(ptin || cfpId) && (
                  <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                    {ptin && (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">IRS PTIN#</span>
                        </div>
                        <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-200">
                          {ptin}
                        </span>
                      </div>
                    )}

                    {cfpId && (
                      <div className="flex items-center justify-between p-2.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300">CFP ID#</span>
                        </div>
                        <span className="font-mono font-bold text-xs text-blue-800 dark:text-blue-200">
                          {cfpId}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* FACULTY & CUSTOMER SUPPORT CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>Need Assistance or Group Seats?</span>
              </h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Our academic faculty and customer care team are available Monday – Friday, 8am – 8pm EST.
              </p>
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <a href="mailto:support@academyio.com" className="hover:text-blue-600 font-semibold underline">
                    support@academyio.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>(800) 555-CPE1 • Toll Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAVIGATION CTA */}
        <div className="pt-6 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <Link
            href={`/${countryCode}/webinars/upcoming`}
            className="text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
          >
            <span>← Explore More Upcoming Live Webinars</span>
          </Link>

          <Link
            href={`/${countryCode}/dashboard?tab=webinars`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer"
          >
            <span>Open Learning Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
