import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard, Plus, Trash, PencilSquare, ArrowPath, CheckCircle, XMark, UserGroup, Sparkles } from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Subscriptions",
  icon: CreditCard,
  rank: 30,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  currency_code: string
  billing_interval: string
  webinar_access_limit?: number | null
  includes_live: boolean
  includes_recording: boolean
  includes_transcript: boolean
  includes_pdf: boolean
  status: "active" | "draft" | "archived"
  benefits?: string[]
  order_index?: number
  active_subscribers_count?: number
  metadata?: {
    plan_scope?: "all_webinars" | "selected_webinars"
    included_webinar_ids?: string[]
    excluded_webinar_ids?: string[]
    [key: string]: any
  } | null
}

interface CustomerSubscription {
  id: string
  customer_id: string
  customer_email: string
  plan_id: string
  plan_name: string
  status: "active" | "canceled" | "expired" | "past_due"
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  monthly_access_used: number
  payment_provider_id?: string
  payment_method_summary?: string
  metadata?: any
  plan?: SubscriptionPlan
}

export default function SubscriptionsAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [activeTab, setActiveTab] = useState<"plans" | "subscribers">("plans")
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscribers, setSubscribers] = useState<CustomerSubscription[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Plan Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [planForm, setPlanForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: 99,
    currency_code: "usd",
    billing_interval: "monthly",
    webinar_access_limit: "",
    includes_live: true,
    includes_recording: true,
    includes_transcript: true,
    includes_pdf: true,
    status: "active" as "active" | "draft" | "archived",
    benefitsText: "",
    order_index: 0,
    plan_scope: "all_webinars" as "all_webinars" | "selected_webinars",
    included_webinar_ids: "",
    excluded_webinar_ids: "",
  })

  // Manual Grant Modal
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [registeredCustomers, setRegisteredCustomers] = useState<any[]>([])
  const [subscriberSearch, setSubscriberSearch] = useState("")
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState("all")
  const [unsubscribeCandidate, setUnsubscribeCandidate] = useState<CustomerSubscription | null>(null)
  const [extendingSubId, setExtendingSubId] = useState<string | null>(null)
  const [grantForm, setGrantForm] = useState({
    customer_id: "",
    customer_email: "",
    plan_id: "",
    duration_days: 30,
    payment_provider_id: "admin_manual",
    payment_method_summary: "Manual Administrator Grant",
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch("/admin/subscriptions", { headers: getAuthHeaders(), credentials: "include" }),
        fetch("/admin/customer-subscriptions", { headers: getAuthHeaders(), credentials: "include" }),
      ])

      const plansData = await plansRes.json()
      const subsData = await subsRes.json()

      if (plansData.plans) setPlans(plansData.plans)
      if (subsData.subscriptions) setSubscribers(subsData.subscriptions)
      if (subsData.customers) setRegisteredCustomers(subsData.customers)
    } catch (e: any) {
      setStatusMessage({ type: "error", text: "Failed to load subscription data" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreatePlanModal = () => {
    setEditingPlan(null)
    setPlanForm({
      name: "",
      slug: "",
      description: "",
      price: 99,
      currency_code: "usd",
      billing_interval: "monthly",
      webinar_access_limit: "",
      includes_live: true,
      includes_recording: true,
      includes_transcript: true,
      includes_pdf: true,
      status: "active",
      benefitsText: "Access to all monthly live webinars\nFull HD recordings library\nTranscripts & study guides",
      order_index: plans.length + 1,
      plan_scope: "all_webinars",
      included_webinar_ids: "",
      excluded_webinar_ids: "",
    })
    setIsPlanModalOpen(true)
  }

  const openEditPlanModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price: plan.price,
      currency_code: plan.currency_code || "usd",
      billing_interval: plan.billing_interval || "monthly",
      webinar_access_limit: plan.webinar_access_limit ? plan.webinar_access_limit.toString() : "",
      includes_live: plan.includes_live,
      includes_recording: plan.includes_recording,
      includes_transcript: plan.includes_transcript,
      includes_pdf: plan.includes_pdf,
      status: plan.status,
      benefitsText: (plan.benefits || []).join("\n"),
      order_index: plan.order_index || 0,
      plan_scope: plan.metadata?.plan_scope || "all_webinars",
      included_webinar_ids: (plan.metadata?.included_webinar_ids || []).join(", "),
      excluded_webinar_ids: (plan.metadata?.excluded_webinar_ids || []).join(", "),
    })
    setIsPlanModalOpen(true)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planForm.name) {
      alert("Plan name is required")
      return
    }

    const incIds = planForm.included_webinar_ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const excIds = planForm.excluded_webinar_ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: planForm.name,
      slug: planForm.slug || planForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: planForm.description,
      price: parseFloat(planForm.price.toString()),
      currency_code: planForm.currency_code,
      billing_interval: planForm.billing_interval,
      webinar_access_limit: planForm.webinar_access_limit ? parseInt(planForm.webinar_access_limit) : null,
      includes_live: planForm.includes_live,
      includes_recording: planForm.includes_recording,
      includes_transcript: planForm.includes_transcript,
      includes_pdf: planForm.includes_pdf,
      status: planForm.status,
      benefits: planForm.benefitsText.split("\n").map((b) => b.trim()).filter(Boolean),
      order_index: planForm.order_index,
      metadata: {
        ...(editingPlan?.metadata || {}),
        plan_scope: planForm.plan_scope,
        included_webinar_ids: incIds,
        excluded_webinar_ids: excIds,
      },
    }

    try {
      if (editingPlan) {
        const res = await fetch(`/admin/subscriptions/${editingPlan.id}`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to update plan")
        setStatusMessage({ type: "success", text: `Plan "${planForm.name}" updated successfully` })
      } else {
        const res = await fetch("/admin/subscriptions", {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Failed to create plan")
        setStatusMessage({ type: "success", text: `Plan "${planForm.name}" created successfully` })
      }
      setIsPlanModalOpen(false)
      fetchData()
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message })
    }
  }

  const handleDeletePlan = async (plan: SubscriptionPlan) => {
    if (plan.active_subscribers_count && plan.active_subscribers_count > 0) {
      alert(`Cannot delete "${plan.name}" because it has ${plan.active_subscribers_count} active subscriber(s). Please archive it instead.`)
      return
    }

    if (!confirm(`Are you sure you want to delete plan "${plan.name}"?`)) return

    try {
      const res = await fetch(`/admin/subscriptions/${plan.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to delete plan")
      }
      setStatusMessage({ type: "success", text: `Plan "${plan.name}" deleted` })
      fetchData()
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message })
    }
  }

  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!grantForm.customer_email && !grantForm.customer_id) || !grantForm.plan_id) {
      setStatusMessage({ type: "error", text: "Customer email or ID and Plan are required" })
      return
    }

    try {
      const res = await fetch("/admin/customer-subscriptions", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(grantForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Failed to grant subscription")
      }
      setStatusMessage({ type: "success", text: "Customer successfully subscribed to plan!" })
      setIsGrantModalOpen(false)
      setGrantForm({
        customer_id: "",
        customer_email: "",
        plan_id: "",
        duration_days: 30,
        payment_provider_id: "admin_manual",
        payment_method_summary: "Manual Administrator Grant",
      })
      fetchData()
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message })
    }
  }

  const handleCancelSubscription = (sub: CustomerSubscription) => {
    setUnsubscribeCandidate(sub)
  }

  const confirmUnsubscribe = async () => {
    if (!unsubscribeCandidate) return
    try {
      const res = await fetch(`/admin/customer-subscriptions/${unsubscribeCandidate.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ status: "canceled", cancel_at_period_end: true }),
      })
      if (!res.ok) throw new Error("Failed to cancel subscription")
      setStatusMessage({ type: "success", text: `Subscription canceled / unsubscribed for ${unsubscribeCandidate.customer_email}` })
      setUnsubscribeCandidate(null)
      fetchData()
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message })
    }
  }

  const handleResubscribe = async (sub: CustomerSubscription) => {
    try {
      const res = await fetch(`/admin/customer-subscriptions/${sub.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ status: "active" }),
      })
      if (!res.ok) throw new Error("Failed to re-subscribe customer")
      setStatusMessage({ type: "success", text: `Customer ${sub.customer_email} re-subscribed and activated!` })
      fetchData()
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message })
    }
  }

  const handleExtendSubscription = async (sub: CustomerSubscription, days: number = 30) => {
    setExtendingSubId(sub.id)
    try {
      const res = await fetch(`/admin/customer-subscriptions/${sub.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ extend_days: days }),
      })
      if (!res.ok) throw new Error("Failed to extend subscription")
      setStatusMessage({ type: "success", text: `Extended subscription by ${days} days for ${sub.customer_email}` })
      fetchData()
    } catch (e: any) {
      setStatusMessage({ type: "error", text: e.message })
    } finally {
      setExtendingSubId(null)
    }
  }

  // Metrics
  const activeSubsCount = subscribers.filter((s) => s.status === "active").length
  const activePlansCount = plans.filter((p) => p.status === "active").length
  const unlimitedPlansCount = plans.filter((p) => !p.webinar_access_limit).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 transition-colors duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Subscription & Membership Tiers
              </Heading>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Recurring Billing
              </span>
            </div>
            <Text className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Configure recurring membership tiers, pricing, included webinar benefits, and subscriber access.
            </Text>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day / Night Mode Toggle */}
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />

          <Button
            variant="secondary"
            size="small"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {activeTab === "plans" ? (
            <Button
              variant="primary"
              size="small"
              onClick={openCreatePlanModal}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Subscription Plan
            </Button>
          ) : (
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsGrantModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Grant Subscription
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plans */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Active Plans
            </span>
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {activePlansCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{plans.length} total tiers configured</span>
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Active Subscribers
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserGroup className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {activeSubsCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Recurring member accounts</span>
          </div>
        </div>

        {/* All-Access Plans */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Unlimited Access
            </span>
            <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {unlimitedPlansCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Tiers without monthly caps</span>
          </div>
        </div>

        {/* Total Memberships */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Enrollments
            </span>
            <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {subscribers.length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Lifetime subscriptions tracked</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm border shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-semibold ml-4 hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 space-x-6">
        <button
          onClick={() => setActiveTab("plans")}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "plans"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab("subscribers")}
          className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "subscribers"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          <UserGroup className="w-4 h-4" />
          Active Subscribers ({activeSubsCount})
        </button>
      </div>

      {/* TAB 1: Plans View */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-neutral-900 rounded-2xl border p-6 flex flex-col justify-between shadow-sm relative transition-all hover:shadow-md ${
                plan.status === "active"
                  ? "border-neutral-200/80 dark:border-neutral-800"
                  : "border-dashed border-neutral-300 dark:border-neutral-700 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                      plan.status === "active"
                        ? "bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {plan.status}
                  </span>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    {plan.active_subscribers_count || 0} subscriber(s)
                  </div>
                </div>

                <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{plan.name}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 min-h-[40px]">{plan.description}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">${plan.price}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">/ month</span>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center justify-between">
                    <span>Webinar Access:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {plan.webinar_access_limit ? `${plan.webinar_access_limit} webinars/mo` : "Unlimited"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Live Webinars:</span>
                    <span className={plan.includes_live ? "text-green-600 dark:text-green-400 font-semibold" : "text-neutral-400 dark:text-neutral-500"}>
                      {plan.includes_live ? "Included" : "Excluded"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Recordings:</span>
                    <span className={plan.includes_recording ? "text-green-600 dark:text-green-400 font-semibold" : "text-neutral-400 dark:text-neutral-500"}>
                      {plan.includes_recording ? "Included" : "Excluded"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Transcripts & PDFs:</span>
                    <span className={plan.includes_transcript ? "text-green-600 dark:text-green-400 font-semibold" : "text-neutral-400 dark:text-neutral-500"}>
                      {plan.includes_transcript ? "Included" : "Excluded"}
                    </span>
                  </div>
                </div>

                {plan.benefits && plan.benefits.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                      Key Benefits
                    </div>
                    <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                <Button variant="secondary" size="small" onClick={() => openEditPlanModal(plan)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  <PencilSquare className="w-3.5 h-3.5 mr-1" />
                  Edit Plan
                </Button>
                <Button variant="danger" size="small" onClick={() => handleDeletePlan(plan)} className="rounded-xl">
                  <Trash className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Subscribers View */}
      {activeTab === "subscribers" && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, and Subscribe Customer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="Search customer email, ID, or plan..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "active", "canceled", "expired"] as const).map((st) => {
                const count = st === "all"
                  ? subscribers.length
                  : subscribers.filter((s) => s.status === st).length
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubscriberStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      subscriberStatusFilter === st
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {st === "all" ? `All (${count})` : st === "active" ? `Subscribed (${count})` : st === "canceled" ? `Unsubscribed (${count})` : `Expired (${count})`}
                  </button>
                )
              })}

              <Button
                variant="primary"
                size="small"
                onClick={() => setIsGrantModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold whitespace-nowrap ml-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Subscribe Customer
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 uppercase text-xs font-semibold">
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4">Billing Period</th>
                    <th className="py-3.5 px-4">Monthly Access</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {subscribers.filter((s) => {
                    if (subscriberStatusFilter !== "all" && s.status !== subscriberStatusFilter) return false
                    if (subscriberSearch.trim()) {
                      const q = subscriberSearch.toLowerCase().trim()
                      return (
                        s.customer_email?.toLowerCase().includes(q) ||
                        s.customer_id?.toLowerCase().includes(q) ||
                        s.plan_name?.toLowerCase().includes(q)
                      )
                    }
                    return true
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                        No customer subscriptions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    subscribers
                      .filter((s) => {
                        if (subscriberStatusFilter !== "all" && s.status !== subscriberStatusFilter) return false
                        if (subscriberSearch.trim()) {
                          const q = subscriberSearch.toLowerCase().trim()
                          return (
                            s.customer_email?.toLowerCase().includes(q) ||
                            s.customer_id?.toLowerCase().includes(q) ||
                            s.plan_name?.toLowerCase().includes(q)
                          )
                        }
                        return true
                      })
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="py-4 px-4">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100">{sub.customer_email}</div>
                            <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{sub.customer_id}</div>
                          </td>
                          <td className="py-4 px-4 font-medium text-neutral-800 dark:text-neutral-200">{sub.plan_name}</td>
                          <td className="py-4 px-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              {sub.payment_provider_id === "stripe" && (
                                <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px]">
                                  Stripe
                                </span>
                              )}
                              {sub.payment_provider_id === "paypal" && (
                                <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px]">
                                  PayPal
                                </span>
                              )}
                              {sub.payment_provider_id === "electronic_card" && (
                                <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                                  Electronic Card (Verified)
                                </span>
                              )}
                              {!["stripe", "paypal", "electronic_card"].includes(sub.payment_provider_id || "") && (
                                <span className="px-2 py-0.5 rounded font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 text-[10px]">
                                  {sub.payment_provider_id || "Admin Manual"}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate max-w-[200px]">
                              {sub.payment_method_summary || "Card ending in 4242"}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                            <div>Start: {new Date(sub.current_period_start).toLocaleDateString()}</div>
                            <div>Renews: {new Date(sub.current_period_end).toLocaleDateString()}</div>
                            {sub.cancel_at_period_end && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">(Cancels at renewal)</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-xs text-neutral-700 dark:text-neutral-300">
                            {sub.monthly_access_used} used this period
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                                sub.status === "active"
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                              }`}
                            >
                              {sub.status === "active" ? "Subscribed" : "Unsubscribed / Canceled"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {sub.status === "active" ? (
                                <>
                                  <Button
                                    variant="secondary"
                                    size="small"
                                    onClick={() => handleExtendSubscription(sub, 30)}
                                    disabled={extendingSubId === sub.id}
                                    className="px-2 py-1 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    title="Add 30 days access without billing"
                                  >
                                    {extendingSubId === sub.id ? "Adding..." : "+30 Days"}
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="small"
                                    onClick={() => handleCancelSubscription(sub)}
                                    className="px-2.5 py-1 text-xs rounded-xl"
                                    title="Unsubscribe / Cancel this membership"
                                  >
                                    Unsubscribe
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="small"
                                  onClick={() => handleResubscribe(sub)}
                                  className="px-2.5 py-1 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                  title="Re-subscribe and activate membership"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Re-subscribe
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {editingPlan ? `Edit Plan: ${editingPlan.name}` : "Create Subscription Package"}
              </Heading>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Plan Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Professional Monthly Plan"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Slug
                  </label>
                  <Input
                    placeholder="e.g. professional-monthly"
                    value={planForm.slug}
                    onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Description
                </label>
                <Input
                  placeholder="e.g. Full access to all live and on-demand webinars with verified CPE certificates"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Monthly Price ($) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Webinar Access Limit
                  </label>
                  <Input
                    type="number"
                    placeholder="Leave blank for unlimited"
                    value={planForm.webinar_access_limit}
                    onChange={(e) => setPlanForm({ ...planForm, webinar_access_limit: e.target.value })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={planForm.status}
                    onChange={(e: any) => setPlanForm({ ...planForm, status: e.target.value })}
                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Included content checkboxes */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-3">
                  Included Webinar Features
                </span>
                <div className="grid grid-cols-2 gap-3 text-sm text-neutral-800 dark:text-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.includes_live}
                      onChange={(e) => setPlanForm({ ...planForm, includes_live: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Live Webinar Attendance</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.includes_recording}
                      onChange={(e) => setPlanForm({ ...planForm, includes_recording: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Recorded Video Access</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.includes_transcript}
                      onChange={(e) => setPlanForm({ ...planForm, includes_transcript: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Full Text Transcripts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planForm.includes_pdf}
                      onChange={(e) => setPlanForm({ ...planForm, includes_pdf: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>PDF Download & Materials</span>
                  </label>
                </div>
              </div>

              {/* Webinar Access Scope */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                  Webinar Inclusion Scope
                </span>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-800 dark:text-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="plan_scope"
                      value="all_webinars"
                      checked={planForm.plan_scope === "all_webinars"}
                      onChange={() => setPlanForm({ ...planForm, plan_scope: "all_webinars" })}
                      className="text-blue-600"
                    />
                    <span>All Webinars Included</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="plan_scope"
                      value="selected_webinars"
                      checked={planForm.plan_scope === "selected_webinars"}
                      onChange={() => setPlanForm({ ...planForm, plan_scope: "selected_webinars" })}
                      className="text-blue-600"
                    />
                    <span>Selected Webinars Only</span>
                  </label>
                </div>

                {planForm.plan_scope === "all_webinars" ? (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Excluded Webinar IDs (Optional, comma-separated)
                    </label>
                    <Input
                      placeholder="e.g. web_premium_vip_1, web_special_bootcamp"
                      value={planForm.excluded_webinar_ids}
                      onChange={(e) => setPlanForm({ ...planForm, excluded_webinar_ids: e.target.value })}
                      className="w-full rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Subscribers can register for any webinar except those listed here.
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Included Webinar IDs (Required, comma-separated)
                    </label>
                    <Input
                      placeholder="e.g. web_01JMW..., web_01JMX..."
                      value={planForm.included_webinar_ids}
                      onChange={(e) => setPlanForm({ ...planForm, included_webinar_ids: e.target.value })}
                      className="w-full rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs"
                    />
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Only webinars with these IDs will be unlocked for subscribers of this tier.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Plan Benefits (One per line)
                </label>
                <textarea
                  rows={4}
                  value={planForm.benefitsText}
                  onChange={(e) => setPlanForm({ ...planForm, benefitsText: e.target.value })}
                  placeholder="Unlimited access to live webinars&#10;Downloadable study guides&#10;Verified CPE certificates"
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" type="button" onClick={() => setIsPlanModalOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  {editingPlan ? "Save Plan" : "Create Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unsubscribe Confirmation Modal */}
      {unsubscribeCandidate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h3" className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash className="w-5 h-5" />
                Confirm Unsubscribe
              </Heading>
              <button onClick={() => setUnsubscribeCandidate(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>
            <Text className="text-xs text-neutral-600 dark:text-neutral-300">
              Are you sure you want to unsubscribe / cancel the <strong>{unsubscribeCandidate.plan_name}</strong> membership for <strong>{unsubscribeCandidate.customer_email}</strong>?
            </Text>
            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button variant="secondary" size="small" onClick={() => setUnsubscribeCandidate(null)} className="rounded-xl border-neutral-200 dark:border-neutral-700">
                Keep Subscription
              </Button>
              <Button variant="danger" size="small" onClick={confirmUnsubscribe} className="rounded-xl font-semibold">
                Yes, Unsubscribe Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Manual Subscription Modal */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Subscribe Customer to Membership Plan
                </Heading>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Super admin manual grant and subscription management
                </Text>
              </div>
              <button onClick={() => setIsGrantModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantSubscription} className="space-y-4">
              {/* Quick Select Customer */}
              {registeredCustomers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Select Registered Customer
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedCust = registeredCustomers.find((c) => c.id === e.target.value)
                      if (selectedCust) {
                        setGrantForm((prev) => ({
                          ...prev,
                          customer_id: selectedCust.id,
                          customer_email: selectedCust.email,
                        }))
                      }
                    }}
                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">-- Choose Registered Customer (or type email below) --</option>
                    {registeredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.email} {c.first_name ? `(${c.first_name} ${c.last_name || ""})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Customer Email *
                </label>
                <Input
                  required
                  type="email"
                  placeholder="customer@academyio.com"
                  value={grantForm.customer_email}
                  onChange={(e) => setGrantForm({ ...grantForm, customer_email: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Customer ID (Optional)
                </label>
                <Input
                  placeholder="Leave blank to auto-generate or use registered ID"
                  value={grantForm.customer_id}
                  onChange={(e) => setGrantForm({ ...grantForm, customer_id: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Select Subscription Plan *
                </label>
                <select
                  required
                  value={grantForm.plan_id}
                  onChange={(e) => setGrantForm({ ...grantForm, plan_id: e.target.value })}
                  className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="">-- Choose Plan --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price} / {p.billing_interval || "month"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Access Duration
                  </label>
                  <select
                    value={grantForm.duration_days}
                    onChange={(e) => setGrantForm({ ...grantForm, duration_days: parseInt(e.target.value, 10) || 30 })}
                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (Quarterly)</option>
                    <option value={180}>180 Days (6 Months)</option>
                    <option value={365}>365 Days (1 Full Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Payment Gateway / Method
                  </label>
                  <select
                    value={grantForm.payment_provider_id}
                    onChange={(e) => {
                      const prov = e.target.value
                      let summ = "Manual Administrator Grant"
                      if (prov === "stripe") summ = "Stripe Credit Card (Admin Grant)"
                      if (prov === "paypal") summ = "PayPal Express (Admin Grant)"
                      if (prov === "electronic_card") summ = "Electronic Card [Instant Verified] (Admin Grant)"
                      setGrantForm({
                        ...grantForm,
                        payment_provider_id: prov,
                        payment_method_summary: summ,
                      })
                    }}
                    className="w-full border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="admin_manual">Admin Manual Override</option>
                    <option value="stripe">Stripe (Credit Card)</option>
                    <option value="paypal">PayPal Express</option>
                    <option value="electronic_card">Electronic Card Verified</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" type="button" onClick={() => setIsGrantModalOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  Subscribe Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
