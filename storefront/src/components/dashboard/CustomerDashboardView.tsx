"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Video,
  PlayCircle,
  FileText,
  Download,
  ShoppingBag,
  User,
  Calendar,
  Clock,
  ExternalLink,
  Award,
  CheckCircle,
  AlertCircle,
  LogOut,
  ChevronRight,
  Shield,
  FileCheck,
  CreditCard,
  Sparkles,
  Check,
  X,
  Search,
  Receipt,
  Printer,
  ShieldCheck,
  ArrowRight,
  Lock,
  BookOpen,
  Loader2,
} from "lucide-react"
import { signout, updateCustomerProfile } from "@lib/data/customer"
import { cancelCustomerSubscription, registerWebinarWithSubscription } from "@lib/data/webinars"
import CertificatesTabContent from "./CertificatesTabContent"

interface DashboardProps {
  customer: any
  summary: any
  purchasedWebinars: any[]
  rawEntitlements?: any[]
  orders?: any[]
  webinars?: any[]
  countryCode: string
  activeTab?: string
  initialSubscription?: any
  initialCertificates?: any
  authToken?: string
}

export default function CustomerDashboardView({
  customer,
  summary,
  purchasedWebinars,
  rawEntitlements = [],
  orders = [],
  webinars = [],
  countryCode,
  activeTab: defaultTab = "overview",
  initialSubscription,
  initialCertificates,
  authToken = "",
}: DashboardProps) {
  const normalizedDefaultTab = defaultTab === "webinars" ? "overview" : defaultTab
  const [tab, setTab] = useState<string>(normalizedDefaultTab)

  useEffect(() => {
    if (defaultTab) {
      setTab(defaultTab === "webinars" ? "overview" : defaultTab)
    }
  }, [defaultTab])
  const [selectedTranscript, setSelectedTranscript] = useState<any | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [subscriptionState, setSubscriptionState] = useState<any | null>(
    initialSubscription?.subscription || null
  )
  const [cancelingSub, setCancelingSub] = useState(false)
  const [subMessage, setSubMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Subscription-registered webinars state
  const [subWebinarsState, setSubWebinarsState] = useState<any[]>(() => {
    return (purchasedWebinars || []).filter((w) => {
      const matchingEnt = (rawEntitlements || []).find(
        (e: any) =>
          e.webinar_id === w.id ||
          e.webinar?.id === w.id ||
          e.id === w.entitlement_id
      )
      return (
        w.order_id?.startsWith("SUB_") ||
        matchingEnt?.order_id?.startsWith("SUB_") ||
        matchingEnt?.metadata?.source === "subscription"
      )
    })
  })
  const [registeringSubWebinarId, setRegisteringSubWebinarId] = useState<string | null>(null)
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("")

  const handleDashboardSubRegister = async (webinarItem: any) => {
    setRegisteringSubWebinarId(webinarItem.id)
    setSubMessage(null)

    try {
      const res = await registerWebinarWithSubscription(
        webinarItem.id,
        authToken,
        customer?.email,
        customer?.id
      )

      if (res.error) {
        setSubMessage({ type: "error", text: res.message || "Failed to register webinar." })
      } else {
        setSubMessage({
          type: "success",
          text: `Success! You have registered for "${webinarItem.title}". Access is now active.`,
        })

        setSubWebinarsState((prev) => [
          ...prev,
          {
            ...webinarItem,
            order_id: `SUB_${subscriptionState?.id || "sub"}`,
            access: {
              has_live: true,
              has_recording: true,
              has_transcript: true,
              has_pdf: true,
            },
          },
        ])

        setSubscriptionState((prev: any) => ({
          ...prev,
          monthly_access_used: (prev?.monthly_access_used || 0) + 1,
        }))
      }
    } catch (err: any) {
      setSubMessage({ type: "error", text: err.message || "Failed to register webinar." })
    } finally {
      setRegisteringSubWebinarId(null)
    }
  }

  // Orders Dashboard Filter State
  const [orderSearchQuery, setOrderSearchQuery] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "completed" | "pending">("all")

  // Certificates State
  const [certificatesState, setCertificatesState] = useState<any>(initialCertificates || null)

  useEffect(() => {
    if (!certificatesState && (customer?.id || authToken)) {
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
      const headers: Record<string, string> = {
        "x-publishable-api-key": pubKey,
      }
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }
      fetch(`${backendUrl}/store/customer/certificates${customer?.id ? `?customer_id=${customer.id}` : ""}`, {
        headers,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setCertificatesState(d)
        })
        .catch(() => {})
    }
  }, [certificatesState, customer?.id, authToken])

  const certificatesList = certificatesState?.certificates || []
  const apiEligibleWebinars = certificatesState?.eligible_webinars || []

  // Private S3 Webinar Files & Download State
  const [s3Files, setS3Files] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)

  useEffect(() => {
    if (!customer?.id && !authToken) return

    const fetchFiles = async () => {
      setLoadingFiles(true)
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
      const headers: Record<string, string> = {
        "x-publishable-api-key": pubKey,
      }
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }

      try {
        const res = await fetch(
          `${backendUrl}/store/customer/webinar-files${customer?.id ? `?customer_id=${customer.id}` : ""}`,
          { headers }
        )
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.files)) {
            setS3Files(data.files)
          }
        }
      } catch (e) {
        console.error("Error loading S3 customer files:", e)
      } finally {
        setLoadingFiles(false)
      }
    }

    fetchFiles()
  }, [customer?.id, authToken])

  const handleDownloadS3File = async (webinarId: string, fileId: string, fileName?: string) => {
    try {
      setDownloadingFileId(fileId)
      const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
      const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "pk_af1c9c73f3aa243796e175d5e7f8b11e263d4627024d732fa98641cd22d3b978"
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-publishable-api-key": pubKey,
      }
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }

      const res = await fetch(
        `${backendUrl}/store/customer/webinars/${webinarId}/files/${fileId}/download${customer?.id ? `?customer_id=${customer.id}` : ""}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ customer_id: customer?.id }),
        }
      )

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || "Failed to download file: authorization required.")
        return
      }

      if (data.download_url) {
        const link = document.createElement("a")
        link.href = data.download_url
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        if (fileName) {
          link.download = fileName
        }
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err: any) {
      alert("Network error: Unable to generate secure download link.")
    } finally {
      setDownloadingFileId(null)
    }
  }

  // Professional Profile Credentials State
  const [profileForm, setProfileForm] = useState({
    first_name: customer?.first_name || "",
    last_name: customer?.last_name || "",
    phone: customer?.phone || customer?.metadata?.phone || "",
    company_name: customer?.company_name || customer?.metadata?.company_name || "",
    ptin: customer?.metadata?.ptin || "",
    cfp_id: customer?.metadata?.cfp_id || "",
    license_type: customer?.metadata?.license_type || "CPA",
  })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)

    // Validate PTIN format if provided: P followed by 8 digits (no spaces)
    if (profileForm.ptin) {
      const cleaned = profileForm.ptin.trim().toUpperCase()
      if (!/^P\d{8}$/.test(cleaned)) {
        setProfileMsg({
          type: "error",
          text: "Invalid PTIN#. For Enrolled Agents, it must start with 'P' followed by 8 digits with no spaces (e.g. P12345678).",
        })
        setProfileSaving(false)
        return
      }
    }

    const formData = new FormData()
    formData.append("first_name", profileForm.first_name)
    formData.append("last_name", profileForm.last_name)
    formData.append("phone", profileForm.phone.trim())
    formData.append("company_name", profileForm.company_name.trim())
    formData.append("ptin", profileForm.ptin.trim().toUpperCase())
    formData.append("cfp_id", profileForm.cfp_id.trim())
    formData.append("license_type", profileForm.license_type)

    const res = await updateCustomerProfile(formData)
    if (res.success) {
      setProfileMsg({ type: "success", text: "Professional profile credentials updated successfully!" })
    } else {
      setProfileMsg({ type: "error", text: res.error || "Failed to update profile." })
    }
    setProfileSaving(false)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signout(countryCode)
    } catch (e) {
      window.location.href = `/${countryCode}/login?logged_out=true`
    }
  }

  const liveWebinars = purchasedWebinars.filter((w) => w.access?.has_live)
  const recordings = purchasedWebinars.filter((w) => w.access?.has_recording)
  const transcripts = purchasedWebinars.filter((w) => w.access?.has_transcript)
  const pdfWebinars = purchasedWebinars.filter((w) => w.access?.has_pdf)

  const nowTime = new Date()
  const displayEligibleWebinars =
    apiEligibleWebinars.length > 0
      ? apiEligibleWebinars
      : liveWebinars.map((item) => {
          const w = item.webinar || {}
          const isEnded = w.event_date ? new Date(w.event_date) <= nowTime : true
          const cert = certificatesList.find((c: any) => c.webinar_id === w.id || c.webinar_title === w.title)
          return {
            webinar_id: w.id || "web_fallback",
            webinar_title: w.title || "Accredited CPE Live Webinar",
            webinar_slug: w.slug || "",
            speaker_name: w.speaker_name || "Lead Instructor",
            cpe_credits: w.cpe_credits || 2.0,
            event_date: w.event_date || new Date().toISOString(),
            is_ended: isEnded,
            status: (cert ? "passed" : isEnded ? "quiz_ready" : "upcoming") as any,
            certificate: cert || null,
          }
        })

  // Dynamically collect real Conference Materials uploaded by Super Admin for the customer's purchased webinars ONLY
  const customerResources = purchasedWebinars.flatMap((item) =>
    (item.webinar?.resources || [])
      .filter((res: any) => Boolean(res && (res.file_url || res.id)))
      .map((res: any) => ({
        id: res.id,
        title: res.title,
        course: item.webinar?.title || "Educational Course",
        size: res.file_size ? `${(res.file_size / 1024 / 1024).toFixed(1)} MB` : "PDF",
        url: res.file_url || `/store/customer/resources/${res.id}/download`,
        file_name: res.file_name,
      }))
  )

  const planLimit = initialSubscription?.plan?.webinar_access_limit ?? null
  const usedCount = subscriptionState?.monthly_access_used || 0
  const isLimitReached = planLimit !== null && planLimit > 0 && usedCount >= planLimit

  const registeredAllIds = new Set([
    ...purchasedWebinars.map((w: any) => w.id),
    ...subWebinarsState.map((w: any) => w.id),
  ])

  const eligibleWebinarsCatalog = (webinars || []).filter((w: any) => {
    if (registeredAllIds.has(w.id)) return false
    const planScope = initialSubscription?.plan?.metadata?.plan_scope || "all_webinars"
    if (planScope === "selected_webinars") {
      const incIds = initialSubscription?.plan?.metadata?.included_webinar_ids || []
      return incIds.includes(w.id)
    } else {
      const excIds = initialSubscription?.plan?.metadata?.excluded_webinar_ids || []
      return !excIds.includes(w.id)
    }
  }).filter((w: any) => {
    if (!catalogSearchQuery.trim()) return true
    const q = catalogSearchQuery.toLowerCase()
    return (
      w.title?.toLowerCase().includes(q) ||
      w.category?.toLowerCase().includes(q) ||
      w.speaker_name?.toLowerCase().includes(q)
    )
  })

  // Never show fake/demo Conference Materials — only show real materials uploaded by Super Admin for purchased webinars
  const displayResources = customerResources

  // Dynamically format customer orders into rich entities with webinar details
  const enrichedOrders = React.useMemo(() => {
    if (orders && orders.length > 0) {
      return orders.map((o: any) => {
        const displayId = o.display_id || o.id?.slice(-8).toUpperCase()
        const orderDate = o.created_at
          ? new Date(o.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Recently"
        const orderTime = o.created_at
          ? new Date(o.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""

        const isPaid =
          o.status === "completed" ||
          o.payment_status === "captured" ||
          o.payment_status === "authorized" ||
          o.status === "paid" ||
          o.status === "pending"
        const currency = (o.currency_code || "usd").toUpperCase()
        const rawTotal = typeof o.total === "number" ? o.total : 14900
        const totalAmount = rawTotal > 1000 ? rawTotal / 100 : rawTotal
        const totalFormatted = `$${totalAmount.toFixed(2)} ${currency}`

        const mappedItems = (o.items || []).map((item: any) => {
          const matched = (webinars || []).find(
            (w: any) =>
              w.product_id === item.product_id ||
              w.id === item.product_id ||
              w.variants?.some((v: any) => v.id === item.variant_id) ||
              w.title?.toLowerCase() === item.title?.toLowerCase()
          )

          const itemTotal = typeof item.total === "number" ? item.total : (item.unit_price || 14900) * (item.quantity || 1)
          const itemPrice = itemTotal > 1000 ? itemTotal / 100 : itemTotal

          return {
            id: item.id,
            title: item.title,
            variantTitle: item.variant_title || item.variant?.title || "Full CPE Access",
            quantity: item.quantity || 1,
            priceFormatted: `$${itemPrice.toFixed(2)} ${currency}`,
            thumbnail: item.thumbnail || matched?.featured_image,
            speaker: matched?.speaker_name || "AcademyIO Faculty",
            cpeCredits: matched?.cpe_credits || 2.0,
            eventDate: matched?.event_date,
            startTime: matched?.start_time,
            timezone: matched?.timezone || "EDT",
            slug: matched?.slug,
          }
        })

        return {
          id: o.id,
          displayId,
          date: orderDate,
          time: orderTime,
          status: isPaid ? "Paid & Authorized" : "Pending",
          isPaid,
          totalFormatted,
          totalAmount,
          currency,
          items:
            mappedItems.length > 0
              ? mappedItems
              : [
                  {
                    id: "item_default",
                    title: "Accredited Continuing Education Webinar Package",
                    variantTitle: "Full CPE Access",
                    quantity: 1,
                    priceFormatted: totalFormatted,
                    thumbnail: null,
                    speaker: "AcademyIO Faculty",
                    cpeCredits: 2.0,
                    eventDate: null,
                    startTime: null,
                    timezone: "EDT",
                    slug: null,
                  },
                ],
          customerName:
            `${o.billing_address?.first_name || customer?.first_name || ""} ${
              o.billing_address?.last_name || customer?.last_name || ""
            }`.trim() || "Valued Registrant",
          billingEmail: o.email || customer?.email || "",
        }
      })
    }

    if (rawEntitlements && rawEntitlements.length > 0) {
      return Array.from(
        rawEntitlements.reduce((acc: Map<string, any>, ent: any) => {
          const id = ent.order_id || ent.id
          if (!id) return acc
          const matchedWeb =
            purchasedWebinars.find((pw: any) => pw.webinar?.id === ent.webinar_id)?.webinar ||
            (webinars || []).find((w: any) => w.id === ent.webinar_id)
          const itemEntry = {
            id: ent.id,
            title: matchedWeb?.title || ent.webinar_title || ent.variant_title || "Webinar Enrollment",
            variantTitle: ent.variant_title || ent.access_type || "Standard Access",
            quantity: 1,
            priceFormatted: "Enrolled",
            thumbnail: matchedWeb?.featured_image || null,
            speaker: matchedWeb?.speaker_name || "AcademyIO Faculty",
            cpeCredits: Number(matchedWeb?.cpe_credits || 0),
            eventDate: matchedWeb?.event_date || null,
            startTime: matchedWeb?.start_time || "",
            timezone: matchedWeb?.timezone || "EST",
            slug: matchedWeb?.slug || "",
          }

          if (!acc.has(id)) {
            acc.set(id, {
              id,
              displayId: id.slice(-6).toUpperCase(),
              date: new Date(ent.granted_at || Date.now()).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              time: "",
              status: "Paid & Authorized",
              isPaid: true,
              totalFormatted: "Enrolled",
              totalAmount: 0,
              currency: "USD",
              items: [itemEntry],
              customerName: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || customer?.email || "Member",
              billingEmail: customer?.email || "",
            })
          } else {
            acc.get(id).items.push(itemEntry)
          }
          return acc
        }, new Map<string, any>()).values()
      )
    }

    // Never return fake/demo orders for customers who haven't purchased anything
    return []
  }, [orders, rawEntitlements, purchasedWebinars, webinars, customer])

  // Executive Orders Dashboard Metrics
  const totalOrdersCount = enrichedOrders.length
  const totalTuitionSpent = enrichedOrders.reduce((sum, ord) => sum + (Number(ord.totalAmount) || 0), 0)
  const totalCoursesEnrolled = enrichedOrders.reduce(
    (sum, ord) => sum + (ord.items || []).reduce((iSum: number, item: any) => iSum + (Number(item?.quantity) || 1), 0),
    0
  )
  const totalCpeCreditsEnrolled = enrichedOrders.reduce(
    (sum, ord) => sum + (ord.items || []).reduce((iSum: number, item: any) => iSum + (Number(item?.cpeCredits) || 0), 0),
    0
  )

  // Filtered orders for dashboard view
  const filteredOrders = enrichedOrders.filter((ord) => {
    if (orderStatusFilter === "completed" && !ord.isPaid) return false
    if (orderStatusFilter === "pending" && ord.isPaid) return false

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase()
      const matchId = ord.id?.toLowerCase().includes(q) || ord.displayId?.toLowerCase().includes(q)
      const matchItem = ord.items.some(
        (i: any) =>
          i.title?.toLowerCase().includes(q) ||
          i.speaker?.toLowerCase().includes(q) ||
          i.variantTitle?.toLowerCase().includes(q)
      )
      return matchId || matchItem
    }

    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Customer Header Banner */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 md:p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
              {customer?.first_name ? customer.first_name[0] : (customer?.email ? customer.email[0].toUpperCase() : "M")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {customer?.first_name || "Professional"}!
                </h1>
                <span className="bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Verified Member
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{customer?.email || "Member Account"}</p>
            </div>
          </div>

          {/* Quick Metrics & Logout Action */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/60 px-5 py-3 rounded-xl border border-gray-100 dark:border-slate-700 text-sm">
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400 block">Active Courses</span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">{purchasedWebinars.length}</span>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-slate-700" />
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400 block">Total Orders</span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">{totalOrdersCount}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-3 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-xs rounded-xl border border-red-200 dark:border-red-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Log out of customer account"
            >
              <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
            </button>
          </div>
        </div>

        {/* Dashboard Tabs & Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-1">
            <nav className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-3 shadow-sm space-y-1">
              {[
                { id: "overview", label: "My Webinars", count: purchasedWebinars.length, icon: LayoutDashboard },
                { id: "live", label: "My Live Webinars", count: liveWebinars.length, icon: Video },
                { id: "recordings", label: "My Recordings", count: recordings.length, icon: PlayCircle },
                { id: "transcripts", label: "My Transcripts", count: transcripts.length, icon: FileText },
                { id: "downloads", label: "Conference Material", count: displayResources.length, icon: Download },
                { id: "certificates", label: "My Certificates", count: certificatesList.length, icon: Award },
                {
                  id: "subscription",
                  label: "My Subscription",
                  badge: subscriptionState?.status === "active" ? "Active" : undefined,
                  icon: CreditCard,
                },
                { id: "orders", label: "My Orders", count: totalOrdersCount, icon: ShoppingBag },
                { id: "profile", label: "My Profile", icon: User },
              ].map((item: any) => {
                const Icon = item.icon
                const active = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-500 dark:text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          active ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : item.count !== undefined && item.count > 0 ? (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          active ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300"
                        }`}
                      >
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                )
              })}

              {/* Dedicated Logout Button in Sidebar */}
              <div className="pt-2 border-t border-gray-100 mt-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>{loggingOut ? "Signing out..." : "Log Out"}</span>
                </button>
              </div>
            </nav>
          </div>

          {/* Main Dashboard Panels */}
          <div className="lg:col-span-3 space-y-6">
            {/* TAB: OVERVIEW */}
            {(tab === "overview" || tab === "webinars") && (
              <div className="space-y-6">
                {/* 4 Overview Statistics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Upcoming Live</span>
                      <Video className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{liveWebinars.length}</span>
                    <span className="text-[11px] text-gray-400">Scheduled events</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Recordings</span>
                      <PlayCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{recordings.length}</span>
                    <span className="text-[11px] text-gray-400">On-demand access</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Transcripts</span>
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{transcripts.length}</span>
                    <span className="text-[11px] text-gray-400">Verbatim texts</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">PDF Resources</span>
                      <Download className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 mt-2 block">{displayResources.length}</span>
                    <span className="text-[11px] text-gray-400">Guides & forms</span>
                  </div>
                </div>

                {/* Recently Purchased Section */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-gray-900">Your Enrolled Courses</h2>
                    <span className="text-xs text-gray-500">{purchasedWebinars.length} items</span>
                  </div>

                  <div className="space-y-4">
                    {purchasedWebinars.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-center space-y-3 bg-gray-50/50">
                        <Video className="w-10 h-10 text-gray-400 mx-auto" />
                        <div>
                          <h3 className="text-sm font-bold text-gray-900">No Enrolled Courses Yet</h3>
                          <p className="text-xs text-gray-500 mt-0.5 max-w-sm mx-auto">
                            Browse upcoming live webinars or on-demand self-study programs to begin earning accredited CPE credits.
                          </p>
                        </div>
                        <div className="pt-1">
                          <Link
                            href={`/${countryCode}/webinars/upcoming`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Browse Upcoming Webinars</span>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      purchasedWebinars.map((item) => (
                        <div
                          key={item.webinar?.id || item.id}
                          className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            {item.webinar?.featured_image ? (
                              <img
                                src={item.webinar.featured_image}
                                alt={item.webinar.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                <Video className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-blue-600">{item.webinar?.category || "Continuing Education"}</span>
                                {item.webinar?.cpe_credits > 0 && (
                                  <span className="text-[11px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                    {item.webinar.cpe_credits} CPE
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 text-sm mt-0.5">{item.webinar?.title || "Accredited Program"}</h3>
                              <p className="text-xs text-gray-500 mt-1">Instructor: {item.webinar?.speaker_name || "AcademyIO Faculty"}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                            {item.access?.has_live && (
                              <button
                                onClick={() => setTab("live")}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                              >
                                Join Live
                              </button>
                            )}
                            {item.access?.has_recording && (
                              <button
                                onClick={() => setTab("recordings")}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                              >
                                Watch Video
                              </button>
                            )}
                            {item.access?.has_pdf && (
                              <button
                                onClick={() => setTab("downloads")}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors cursor-pointer"
                              >
                                PDFs
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY LIVE WEBINARS */}
            {tab === "live" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Live Webinars</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Live session credentials and joining links are activated here prior to event broadcast.
                  </p>
                </div>

                {liveWebinars.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No upcoming live webinars enrolled.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {liveWebinars.map((item) => {
                      const liveUrl = item.webinar.live_stream_url
                      const instructions =
                        item.webinar.live_instructions ||
                        "Please join 5-10 minutes prior to the broadcast. Interactive Q&A chat enabled."

                      return (
                        <div key={item.webinar.id} className="border border-gray-200 rounded-xl p-6 bg-white space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                            <div>
                              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                Confirmed Registration
                              </span>
                              <h3 className="text-base font-bold text-gray-900 mt-1">{item.webinar.title}</h3>
                            </div>
                            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 self-start sm:self-center">
                              <CheckCircle className="w-3.5 h-3.5" /> Enrolled & Verified
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span>
                                {new Date(item.webinar.event_date).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span>
                                {item.webinar.start_time} - {item.webinar.end_time} ({item.webinar.timezone})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600" />
                              <span>Speaker: {item.webinar.speaker_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-blue-600" />
                              <span>Continuing Education: {item.webinar.cpe_credits} CPE Credits</span>
                            </div>
                          </div>

                          {/* Secure Live Joining Box */}
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
                                <Shield className="w-4 h-4 text-blue-700" />
                                Official Live Meeting Access
                              </h4>
                              <p className="text-xs text-blue-700 mt-1">{instructions}</p>
                            </div>
                            {liveUrl ? (
                              <a
                                href={liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whitespace-nowrap px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                              >
                                Launch Live Session
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <div className="px-3.5 py-2 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold">
                                Link activates 15 min prior to broadcast
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MY RECORDINGS */}
            {tab === "recordings" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Video Recordings</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Stream your purchased webinars in high definition with playback controls and bookmarks.
                  </p>
                </div>

                {recordings.length === 0 ? (
                  <div className="p-10 rounded-xl border border-dashed border-gray-200 text-center space-y-3 bg-gray-50/50">
                    <PlayCircle className="w-10 h-10 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">No Video Recordings Available</h3>
                      <p className="text-xs text-gray-500 mt-0.5 max-w-sm mx-auto">
                        High-definition on-demand video recordings unlock with course packages or subscription plans.
                      </p>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={`/${countryCode}/webinars/self-study`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Browse Self-Study Courses</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recordings.map((item) => {
                      const s3Recording = s3Files.find(
                        (f) =>
                          f.webinar_id === item.webinar?.id &&
                          (f.material_type === "recording" || f.purchase_option === "recording")
                      )
                      return (
                        <div
                          key={item.webinar?.id || item.id}
                          className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                HD Video Available
                              </span>
                              <span className="text-xs text-gray-400">1 Year Access Window</span>
                              {s3Recording && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  Private S3
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-gray-900 text-base mt-1.5">{item.webinar?.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">Instructor: {item.webinar?.speaker_name}</p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {s3Recording && (
                              <button
                                type="button"
                                disabled={downloadingFileId === s3Recording.id}
                                onClick={() =>
                                  handleDownloadS3File(item.webinar?.id, s3Recording.id, s3Recording.file_name)
                                }
                                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {downloadingFileId === s3Recording.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                    <span>Securing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download MP4</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedVideo(item)}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Watch Recording
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: MY TRANSCRIPTS */}
            {tab === "transcripts" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">My Webinar Transcripts</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Read verbatim session transcripts online or download them for offline research.
                  </p>
                </div>

                {transcripts.length === 0 ? (
                  <div className="p-10 rounded-xl border border-dashed border-gray-200 text-center space-y-3 bg-gray-50/50">
                    <FileText className="w-10 h-10 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">No Verbatim Transcripts Available</h3>
                      <p className="text-xs text-gray-500 mt-0.5 max-w-sm mx-auto">
                        Transcripts with searchable lecture notes unlock with your enrolled courses or subscription.
                      </p>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={`/${countryCode}/subscriptions`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>View Membership Plans</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transcripts.map((item) => {
                      const s3Transcript = s3Files.find(
                        (f) =>
                          f.webinar_id === item.webinar?.id &&
                          (f.material_type === "transcript" || f.purchase_option === "transcript")
                      )
                      const transcriptUrl = item.webinar?.transcript_file_url || null

                      return (
                        <div
                          key={item.webinar?.id || item.id}
                          className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-base">{item.webinar?.title}</h3>
                              {s3Transcript && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  Private S3
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Verbatim transcript with questions and answers</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedTranscript(item)}
                              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" /> Read Online
                            </button>
                            {s3Transcript ? (
                              <button
                                type="button"
                                disabled={downloadingFileId === s3Transcript.id}
                                onClick={() =>
                                  handleDownloadS3File(
                                    item.webinar?.id,
                                    s3Transcript.id,
                                    s3Transcript.file_name
                                  )
                                }
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {downloadingFileId === s3Transcript.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Securing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" /> Download PDF
                                  </>
                                )}
                              </button>
                            ) : transcriptUrl ? (
                              <a
                                href={transcriptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5" /> Download PDF
                              </a>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PDF DOWNLOADS */}
            {tab === "downloads" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Conference Materials & Downloads</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Download instructor presentation slides, audit checklists, calculation worksheets, and transcripts.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Private Amazon S3 Presigned Access</span>
                  </div>
                </div>

                {loadingFiles ? (
                  <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading your authorized course materials...</span>
                  </div>
                ) : s3Files.length > 0 ? (
                  <div className="space-y-3">
                    {s3Files.map((file: any) => {
                      const isDownloading = downloadingFileId === file.id
                      const sizeFormatted = file.file_size
                        ? `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`
                        : "Document"
                      return (
                        <div
                          key={file.id}
                          className="p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                              {file.material_type === "recording" ? (
                                <PlayCircle className="w-5 h-5 text-emerald-600" />
                              ) : file.material_type === "transcript" ? (
                                <FileText className="w-5 h-5 text-purple-600" />
                              ) : (
                                <FileCheck className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm text-gray-900 truncate">{file.title}</h4>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                  {file.material_type}
                                </span>
                                {file.purchase_option && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                                    Option: {file.purchase_option}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {file.webinar_title || file.webinarTitle || "Webinar Material"} •{" "}
                                <span className="font-semibold text-gray-600">{sizeFormatted}</span>
                              </p>
                              {file.description && (
                                <p className="text-[11px] text-gray-400 italic line-clamp-1">{file.description}</p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleDownloadS3File(file.webinar_id, file.id, file.file_name)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-end sm:self-auto shrink-0"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Securing URL...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download File</span>
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : displayResources.length > 0 ? (
                  <div className="space-y-3">
                    {displayResources.map((res: any, idx: number) => (
                      <div
                        key={res.id || idx}
                        className="p-4 rounded-xl border border-gray-200 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
                            <FileCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">{res.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {res.course} • <span className="font-semibold text-gray-600">{res.size}</span>
                            </p>
                          </div>
                        </div>

                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download File
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">
                    No downloadable materials currently assigned to your enrolled courses.
                  </div>
                )}
              </div>
            )}

            {/* TAB: MY CERTIFICATES & POST-WEBINAR QUIZZES */}
            {tab === "certificates" && (
              <CertificatesTabContent
                customerId={customer?.id}
                countryCode={countryCode}
                certificates={certificatesList}
                eligibleWebinars={displayEligibleWebinars}
              />
            )}

            {/* TAB: MY ORDERS (EXECUTIVE ORDERS DASHBOARD) */}
            {tab === "orders" && (
              <div className="space-y-6">
                {/* 1. Header Card with Search & Filter Controls */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          Order History & Official CPE Invoices
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Review your educational tuition receipts, track payment authorizations, and access your course materials.
                      </p>
                    </div>

                    <Link
                      href={`/${countryCode}/webinars/upcoming`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Enroll in New Course</span>
                    </Link>
                  </div>

                  {/* 4-Metric Executive Strip */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Total Orders</span>
                        <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white block">
                        {totalOrdersCount} {totalOrdersCount === 1 ? "Order" : "Orders"}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                        Historical enrollments on record
                      </span>
                    </div>

                    <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Tuition Invested</span>
                        <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-lg sm:text-xl font-extrabold font-mono text-gray-900 dark:text-white block">
                        ${totalTuitionSpent.toFixed(2)} USD
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                        Eligible business CE tuition
                      </span>
                    </div>

                    <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Course Seats</span>
                        <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white block">
                        {totalCoursesEnrolled} {totalCoursesEnrolled === 1 ? "Program" : "Programs"}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                        Active educational licenses
                      </span>
                    </div>

                    <div className="p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-gray-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Earned / Enrolled</span>
                        <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white block">
                        {totalCpeCreditsEnrolled.toFixed(1)} CPE
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-0.5">
                        IRS & NASBA credit hours
                      </span>
                    </div>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Search by Order #, course title, or speaker..."
                        className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      {orderSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setOrderSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setOrderStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          orderStatusFilter === "all"
                            ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                            : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                        }`}
                      >
                        All Orders ({enrichedOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderStatusFilter("completed")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          orderStatusFilter === "completed"
                            ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                            : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                        }`}
                      >
                        Paid ({enrichedOrders.filter((o) => o.isPaid).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderStatusFilter("pending")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          orderStatusFilter === "pending"
                            ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                            : "text-gray-600 dark:text-slate-400 hover:text-gray-900"
                        }`}
                      >
                        Pending ({enrichedOrders.filter((o) => !o.isPaid).length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Order List Cards */}
                {filteredOrders.length > 0 ? (
                  <div className="space-y-5">
                    {filteredOrders.map((ord: any) => (
                      <div
                        key={ord.id}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-gray-300 dark:hover:border-slate-700"
                      >
                        {/* Top Card Bar */}
                        <div className="p-5 sm:p-6 bg-gray-50/70 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono font-extrabold text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
                              #{ord.displayId}
                            </span>

                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              <span>Placed on </span>
                              <strong className="text-gray-800 dark:text-slate-200 font-semibold">{ord.date}</strong>
                              {ord.time && <span> at {ord.time}</span>}
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {ord.items.length} {ord.items.length === 1 ? "Course" : "Courses"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                            {ord.isPaid ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Paid & Authorized</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Pending Payment</span>
                              </div>
                            )}

                            <span className="text-base sm:text-lg font-extrabold font-mono text-gray-900 dark:text-white">
                              {ord.totalFormatted}
                            </span>
                          </div>
                        </div>

                        {/* Order Line Items */}
                        <div className="p-5 sm:p-6 space-y-4">
                          {ord.items.map((item: any, idx: number) => (
                            <div
                              key={item.id || idx}
                              className="p-4 bg-gray-50/60 dark:bg-slate-800/30 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                {item.thumbnail ? (
                                  <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="w-14 h-14 rounded-xl object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <Video className="w-7 h-7" />
                                  </div>
                                )}

                                <div className="space-y-1 min-w-0">
                                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {item.slug ? (
                                      <Link
                                        href={`/${countryCode}/webinars/${item.slug}`}
                                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                      >
                                        {item.title}
                                      </Link>
                                    ) : (
                                      item.title
                                    )}
                                  </h4>

                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-slate-400">
                                    <span>Instructor: <strong className="text-gray-800 dark:text-slate-200 font-medium">{item.speaker}</strong></span>
                                    <span>•</span>
                                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                                      {item.variantTitle}
                                    </span>
                                    {item.cpeCredits > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                          <Award className="w-3 h-3 text-amber-600" />
                                          {item.cpeCredits} CPE
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {item.eventDate && (
                                    <div className="text-[10px] text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                      <Calendar className="w-3 h-3 text-gray-400" />
                                      <span>
                                        Scheduled: {new Date(item.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        {item.startTime && ` • ${item.startTime} ${item.timezone || "EDT"}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 dark:border-slate-800 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                                  {item.priceFormatted}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium block">
                                  {item.quantity} {item.quantity === 1 ? "Seat" : "Seats"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Actions Footer */}
                        <div className="p-4 sm:p-5 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-[11px]">
                            <Lock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>256-Bit SSL Encrypted Payment Authorization</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            <a
                              href={`/api/orders/${ord.id}/invoice`}
                              download={`AcademyIO-Invoice-${ord.displayId}.pdf`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                              title="Download Itemized PDF Invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Invoice (PDF)</span>
                            </a>

                            <Link
                              href={`/${countryCode}/order/${ord.id}/confirmed`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Receipt</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => setTab("overview")}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <LayoutDashboard className="w-3.5 h-3.5" />
                              <span>Access Courses</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty State */
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 p-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {orderSearchQuery || orderStatusFilter !== "all"
                          ? "No matching orders found"
                          : "No Order History Yet"}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">
                        {orderSearchQuery || orderStatusFilter !== "all"
                          ? "Try clearing your search query or switching your status filter to view all historical orders."
                          : "You have not enrolled in any educational courses yet. Browse our live upcoming webinars to start earning verified CPE credits."}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                      {orderSearchQuery || orderStatusFilter !== "all" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setOrderSearchQuery("")
                            setOrderStatusFilter("all")
                          }}
                          className="px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Clear Search & Filters
                        </button>
                      ) : (
                        <>
                          <Link
                            href={`/${countryCode}/webinars/upcoming`}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Browse Upcoming Live Webinars</span>
                          </Link>
                          <Link
                            href={`/${countryCode}/webinars/self-study`}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Browse Self-Study Courses</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Business Expense & IRS CPE Tax Deduction Notice */}
                <div className="p-6 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl border border-blue-100 dark:border-slate-800 flex items-start gap-4 text-xs">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                      Employer Reimbursement & CPE Business Expense Deductions
                    </h4>
                    <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-xs">
                      Every AcademyIO invoice itemizes the professional registrant, tuition fee, accredited sponsor identification number, and official course titles required for IRC Section 127 employer educational assistance programs or IRS business expense tax deductions.
                    </p>
                    <div className="pt-1 flex items-center gap-4 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                      <span>✓ NASBA QAS Registry Compliant</span>
                      <span>✓ IRS Approved CE Sponsor</span>
                      <span>✓ Itemized PDF Tax Receipts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MY SUBSCRIPTION */}
            {tab === "subscription" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">My Subscription</h2>
                      {subscriptionState?.status === "active" && !subscriptionState?.cancel_at_period_end && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      )}
                      {subscriptionState?.cancel_at_period_end && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Cancels at Period End
                        </span>
                      )}
                      {subscriptionState?.status === "canceled" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                          Canceled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Manage your monthly membership plan, renewal dates, payment method, and webinar entitlements.
                    </p>
                  </div>

                  <Link
                    href={`/${countryCode}/subscriptions`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
                  >
                    View All Plans
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Sub status alert */}
                {subMessage && (
                  <div
                    className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between ${
                      subMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <span>{subMessage.text}</span>
                    <button onClick={() => setSubMessage(null)} className="font-bold ml-2">
                      ✕
                    </button>
                  </div>
                )}

                {subscriptionState && subscriptionState.status !== "expired" ? (
                  <div className="space-y-6">
                    {/* Active Plan Summary Card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                            Current Membership Tier
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 backdrop-blur">
                            Monthly Billing
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                            {subscriptionState.plan_name || "Professional Monthly Plan"}
                          </h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-blue-400">
                              ${initialSubscription?.plan?.price || 99}
                            </span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 max-w-xl">
                          Unlimited attendance for all live webinars, full video library access, verbatim transcripts, and downloadable PDF worksheets.
                        </p>
                      </div>
                    </div>

                    {/* Subscription Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase block">Start Date</span>
                        <span className="font-bold text-gray-900 text-sm mt-1 block">
                          {subscriptionState.current_period_start
                            ? new Date(subscriptionState.current_period_start).toLocaleDateString()
                            : "Oct 11, 2026"}
                        </span>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase block">
                          {subscriptionState.cancel_at_period_end ? "Access Expiration" : "Next Renewal Date"}
                        </span>
                        <span className="font-bold text-gray-900 text-sm mt-1 block">
                          {subscriptionState.current_period_end
                            ? new Date(subscriptionState.current_period_end).toLocaleDateString()
                            : "Nov 11, 2026"}
                        </span>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase block">Monthly Usage</span>
                        <span className="font-bold text-gray-900 text-sm mt-1 block">
                          {subscriptionState.monthly_access_used || 0} Webinars Used
                        </span>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase block">Payment Method</span>
                        <span className="font-bold text-gray-900 text-sm mt-1 block truncate">
                          {subscriptionState.payment_method_summary || "Visa ending in 4242"}
                        </span>
                      </div>
                    </div>

                    {/* Included Features Checklist */}
                    <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                      <h4 className="font-bold text-sm text-blue-950 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Features Included in Your Plan
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Live Webinar Attendance & Real-Time Q&A</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Self-Study HD Video Recordings (24/7 Access)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Searchable Verbatim Text Transcripts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Downloadable PDF Study Guides & Forms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Verified CPE Credit Attendance Tracking</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Direct Email Support with Subject Matter Authorities</span>
                        </div>
                      </div>
                    </div>

                    {/* Usage Limit Progress Bar Card */}
                    <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            Monthly Webinar Usage & Allowance
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Track the webinars you have unlocked in this billing period.
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {planLimit !== null && planLimit > 0
                              ? `${usedCount} / ${planLimit} Webinars Used`
                              : `${usedCount} Webinars Used • Unlimited Plan`}
                          </span>
                        </div>
                      </div>

                      {planLimit !== null && planLimit > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                isLimitReached ? "bg-amber-500" : "bg-blue-600"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.round((usedCount / planLimit) * 100))}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-gray-400">
                            <span>0 used</span>
                            <span>{planLimit} allowed / month</span>
                          </div>
                        </div>
                      )}

                      {isLimitReached && (
                        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              Monthly allowance reached. Upgrade your subscription tier or browse additional courses below.
                            </span>
                          </div>
                          <Link
                            href={`/${countryCode}/subscriptions`}
                            className="font-bold text-blue-600 hover:text-blue-800 shrink-0 underline"
                          >
                            Upgrade Tier →
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* REGISTERED SUBSCRIPTION WEBINARS SECTION */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            Registered Webinars (Unlocked with Subscription)
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Courses unlocked and active on your membership account.
                          </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {subWebinarsState.length} Unlocked
                        </span>
                      </div>

                      {subWebinarsState.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
                          <p className="text-xs font-medium text-gray-600">
                            You have not registered for any subscription webinars yet this month.
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Browse the eligible webinars catalog below and click "Register Free" to unlock courses instantly.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {subWebinarsState.map((w: any) => (
                            <div
                              key={w.id}
                              className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all shadow-xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                  {w.category || "Professional Education"}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                  Active Pass
                                </span>
                              </div>

                              <h5 className="font-bold text-sm text-gray-900 line-clamp-2">
                                {w.title}
                              </h5>

                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>{w.event_date ? new Date(w.event_date).toLocaleDateString() : "Flexible Access"}</span>
                              </div>

                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                <Link
                                  href={`/${countryCode}/webinars/${w.slug}`}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  Course Details
                                  <ArrowRight className="w-3 h-3" />
                                </Link>

                                <Link
                                  href={`/${countryCode}/dashboard?tab=overview`}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                                >
                                  Access Materials
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ELIGIBLE WEBINARS CATALOG SECTION */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="font-bold text-base text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            Eligible Webinars Catalog (Free with Your Plan)
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Click to register for any course included in your subscription tier at zero cost.
                          </p>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter eligible webinars..."
                            value={catalogSearchQuery}
                            onChange={(e) => setCatalogSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {eligibleWebinarsCatalog.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-500">
                            {catalogSearchQuery
                              ? "No eligible webinars match your filter."
                              : "You have unlocked all currently eligible webinars in this catalog!"}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {eligibleWebinarsCatalog.map((item: any) => {
                            const isSubmitting = registeringSubWebinarId === item.id

                            return (
                              <div
                                key={item.id}
                                className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 transition-all shadow-xs space-y-3 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                      {item.category || "CPE Approved"}
                                    </span>
                                    {item.cpe_credits > 0 && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                        {item.cpe_credits} CPE
                                      </span>
                                    )}
                                  </div>

                                  <h5 className="font-bold text-sm text-gray-900 line-clamp-2">
                                    {item.title}
                                  </h5>

                                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                    {item.short_description || "Comprehensive professional training with instructor slides, worksheets, and certificate."}
                                  </p>

                                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span>
                                      {item.event_date ? new Date(item.event_date).toLocaleDateString() : "Flexible Access"}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-gray-600 truncate">{item.speaker_name || "Faculty Authority"}</span>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                                  <Link
                                    href={`/${countryCode}/webinars/${item.slug}`}
                                    className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                                  >
                                    View Details
                                  </Link>

                                  <button
                                    type="button"
                                    disabled={isSubmitting || isLimitReached}
                                    onClick={() => handleDashboardSubRegister(item)}
                                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
                                  >
                                    {isSubmitting ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Registering...</span>
                                      </>
                                    ) : isLimitReached ? (
                                      <span>Limit Reached</span>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Register Free</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Subscription Management & Cancellation */}
                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Subscription Status & Renewal</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {subscriptionState.cancel_at_period_end
                            ? `Scheduled to cancel on ${new Date(subscriptionState.current_period_end).toLocaleDateString()}. No future charges.`
                            : "Your subscription renews automatically every month. Cancel anytime without fees."}
                        </p>
                      </div>

                      {!subscriptionState.cancel_at_period_end && subscriptionState.status === "active" ? (
                        <button
                          type="button"
                          disabled={cancelingSub}
                          onClick={async () => {
                            if (
                              !confirm(
                                "Are you sure you want to cancel your monthly subscription? You will continue to have full access through the end of the current billing cycle."
                              )
                            ) {
                              return
                            }
                            setCancelingSub(true)
                            setSubMessage(null)
                            try {
                              const res = await cancelCustomerSubscription(authToken)
                              if (res.subscription) {
                                setSubscriptionState(res.subscription)
                                setSubMessage({
                                  type: "success",
                                  text: "Your subscription has been canceled. You retain full access through the current billing period.",
                                })
                              } else {
                                setSubMessage({
                                  type: "error",
                                  text: res.message || "Failed to cancel subscription",
                                })
                              }
                            } catch (e: any) {
                              setSubMessage({ type: "error", text: e.message || "An error occurred" })
                            } finally {
                              setCancelingSub(false)
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                        >
                          {cancelingSub ? "Canceling..." : "Cancel Subscription"}
                        </button>
                      ) : (
                        <Link
                          href={`/${countryCode}/subscriptions`}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
                        >
                          Reactivate Plan
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  /* No Active Subscription Banner */
                  <div className="text-center py-12 px-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto space-y-2">
                      <h3 className="text-lg font-bold text-gray-900">No Active Monthly Subscription</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Upgrade to a monthly subscription to unlock unlimited live webinar attendances, complete video replay library, transcripts, and downloadable study guides.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link
                        href={`/${countryCode}/subscriptions`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Explore Monthly Subscription Packages
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACCOUNT PROFILE */}
            {tab === "profile" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="text-lg font-bold text-gray-900">Professional Profile & Settings</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage your contact information, professional licensing details, and notification preferences.
                  </p>
                </div>

                {profileMsg && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold border ${
                      profileMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-red-50 text-red-800 border-red-200"
                    }`}
                  >
                    {profileMsg.text}
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                        className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address (Login Identity)</label>
                    <input
                      type="email"
                      value={customer?.email || ""}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Credential / Designation</label>
                    <select
                      value={profileForm.license_type}
                      onChange={(e) => setProfileForm({ ...profileForm, license_type: e.target.value })}
                      className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="CPA">CPA (Certified Public Accountant)</option>
                      <option value="EA">EA (Enrolled Agent)</option>
                      <option value="CFP">CFP (Certified Financial Planner)</option>
                      <option value="JD">Tax Attorney / JD / LLM</option>
                      <option value="Corporate">Corporate Controller / CFO / Analyst</option>
                      <option value="Other">Other Accounting & Tax Professional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Company / Firm Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Tax Advisors LLP"
                      value={profileForm.company_name}
                      onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                      className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. (555) 234-5678"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>

                  {/* Additional Information: PTIN# & CFP ID# */}
                  <div className="pt-3 pb-1 border-t border-gray-100 space-y-3">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Additional Continuing Education Credentials
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          PTIN# <span className="text-[10px] text-purple-600 font-normal">(Enrolled Agents only)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="P12345678"
                          maxLength={9}
                          value={profileForm.ptin}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              ptin: e.target.value.replace(/\s+/g, "").toUpperCase(),
                            })
                          }
                          className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono uppercase tracking-wider"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Starts with P followed by 8 digits (no spaces).</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          CFP ID# <span className="text-[10px] text-emerald-600 font-normal">(CFP Holders only)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 294810"
                          value={profileForm.cfp_id}
                          onChange={(e) => setProfileForm({ ...profileForm, cfp_id: e.target.value.trim() })}
                          className="w-full text-sm p-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">For CFP Designation holders only.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {profileSaving ? "Saving Changes..." : "Save Changes"}
                  </button>
                </form>

                <div className="pt-6 border-t border-gray-100 max-w-lg">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Session Management</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Sign out from your customer account on this browser.
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg border border-red-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>{loggingOut ? "Logging out..." : "Sign Out of Account"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base">{selectedVideo.webinar.title}</h3>
              <button onClick={() => setSelectedVideo(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <div className="text-center p-6 text-white space-y-2">
                <PlayCircle className="w-16 h-16 text-emerald-400 mx-auto animate-pulse" />
                <p className="font-semibold text-sm">HD Recording Stream Loaded</p>
                <p className="text-xs text-gray-300 font-mono">
                  {selectedVideo.webinar.recording_url || "Streaming from secure CDN..."}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Instructor: {selectedVideo.webinar.speaker_name} • Full playback controls enabled.
            </p>
          </div>
        </div>
      )}

      {/* Transcript Reader Modal */}
      {selectedTranscript && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedTranscript.webinar.title}</h3>
                <span className="text-xs text-gray-500">Verbatim Session Transcript</span>
              </div>
              <button onClick={() => setSelectedTranscript(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-xl text-xs text-gray-700 leading-relaxed space-y-3 font-mono">
              {selectedTranscript.webinar.transcript_content ? (
                <div className="whitespace-pre-wrap">{selectedTranscript.webinar.transcript_content}</div>
              ) : (
                <>
                  <p><strong>[00:00:15] Moderator:</strong> Welcome everyone to today's continuing education session. Please note the polling requirements for CPE credit.</p>
                  <p><strong>[00:01:40] {selectedTranscript.webinar.speaker_name}:</strong> Thank you. Today we examine the fundamental mechanics of shareholder stock and debt basis reconstruction...</p>
                  <p><strong>[00:05:22] {selectedTranscript.webinar.speaker_name}:</strong> Under Section 1367, the strict ordering rules govern every dollar of distributions prior to loss recognition...</p>
                </>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTranscript(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
