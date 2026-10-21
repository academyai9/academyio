import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ChartBar,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  Sparkles,
  ShoppingBag,
  ExclamationCircle,
  CurrencyDollar,
  Eye,
  DocumentText,
  Calendar,
  ArrowDownTray,
  UserGroup,
  AcademicCap,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Tag,
  Buildings,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Overview",
  icon: ChartBar,
  rank: 0,
})

const getAuthHeaders = () => {
  let token: string | null = null
  if (typeof window !== "undefined") {
    token =
      localStorage.getItem("medusa_auth_token") ||
      localStorage.getItem("_medusa_jwt") ||
      localStorage.getItem("medusa_token")
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface OverviewMetrics {
  total_customers: number
  new_customers_30d: number
  new_customers_7d: number
  active_accounts: number
  inactive_accounts: number
  suspended_accounts: number

  active_subscriptions: number
  expired_subscriptions: number
  total_subscriptions: number

  total_webinars: number
  upcoming_live_webinars: number
  total_registrations: number

  total_orders: number
  orders_today: number
  paid_orders: number
  pending_orders: number
  canceled_orders: number
  total_revenue: number
  average_order_value: number
  open_incidents: number
}

interface RevenueDay {
  date_label: string
  date_key: string
  orders_count: string | number
  revenue: string | number
}

interface GrowthDay {
  date_label: string
  date_key: string
  new_customers: string | number
  new_registrations: string | number
}

interface RecentOrder {
  id: string
  display_id: number
  order_status: string
  customer_name: string
  customer_email: string
  currency_code: string
  created_at: string
  order_total: number
  paid_total: number
  payment_status: string
  items?: Array<{
    title: string
    variant_title?: string | null
    quantity: number
    unit_price: number | string
  }>
}

interface RecentCustomer {
  id: string
  email: string
  full_name: string
  company_name: string | null
  ptin: string | null
  cfp_id: string | null
  license_type: string | null
  account_status: string
  created_at: string
}

interface UpcomingWebinar {
  id: string
  title: string
  slug: string
  event_date: string
  start_time: string | null
  end_time: string | null
  time_zone: string | null
  cpe_credits: number | null
  category: string | null
  status: string
  speaker_name: string | null
  registrations_count: number
}

export default function AdminDashboardPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [revenueChart, setRevenueChart] = useState<RevenueDay[]>([])
  const [growthChart, setGrowthChart] = useState<GrowthDay[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([])
  const [upcomingWebinars, setUpcomingWebinars] = useState<UpcomingWebinar[]>([])
  const [monitoringInfo, setMonitoringInfo] = useState<{
    last_reconciliation_at: string | null
    alert_recipient_email: string
    open_incidents_count: number
  }>({
    last_reconciliation_at: null,
    alert_recipient_email: "support@academyio.com",
    open_incidents_count: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<"today" | "7d" | "30d" | "all">("30d")
  const [isReconciling, setIsReconciling] = useState(false)
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null)

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState<RecentOrder | null>(null)

  const fetchOverviewData = async (range = selectedRange) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/admin/overview?range=${range}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Authentication session required. Please sign in.")
        }
        throw new Error(`Failed to load overview data (Status: ${res.status})`)
      }
      const data = await res.json()
      setMetrics(data.metrics)
      setRevenueChart(data.chart_revenue || [])
      setGrowthChart(data.chart_growth || [])
      setRecentOrders(data.recent_orders || [])
      setRecentCustomers(data.recent_customers || [])
      setUpcomingWebinars(data.upcoming_webinars || [])
      if (data.monitoring) {
        setMonitoringInfo(data.monitoring)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load dashboard overview.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverviewData(selectedRange)
  }, [selectedRange])

  const handleRunReconciliation = async () => {
    setIsReconciling(true)
    setReconcileMessage(null)
    try {
      const res = await fetch(`/admin/order-monitoring/reconcile`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ dryRun: false }),
      })
      const data = await res.json()
      if (res.ok) {
        setReconcileMessage(data.message || "Reconciliation completed successfully.")
        fetchOverviewData()
      } else {
        throw new Error(data.message || "Reconciliation failed.")
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute reconciliation.")
    } finally {
      setIsReconciling(false)
    }
  }

  const formatCurrency = (val: number | string | null | undefined, currency = "usd") => {
    const num = parseFloat(String(val || 0))
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(num)
  }

  const formatDate = (dateString?: string | null, includeTime = false) => {
    if (!dateString) return "—"
    try {
      const d = new Date(dateString)
      if (includeTime) {
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      }
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateString
    }
  }

  // Calculate Max Values for Chart Scaling
  const maxRevenue = Math.max(
    ...revenueChart.map((d) => parseFloat(String(d.revenue)) || 0),
    100
  )
  const maxGrowth = Math.max(
    ...growthChart.map((d) => Math.max(parseInt(String(d.new_customers)) || 0, parseInt(String(d.new_registrations)) || 0)),
    5
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 transition-colors duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & EXECUTIVE BAR                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ChartBar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Executive Overview & Operations
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live PostgreSQL
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Medusa v2 Core
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Real-time marketplace revenue, student acquisitions, live webinar attendance, and system health telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Time Filter, Day/Night Toggle, Manual Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="inline-flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1 text-xs font-semibold shadow-xs">
            {(["today", "7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedRange === r
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {r === "today" ? "Today" : r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>

          {/* Dedicated Day / Night Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to Day View (Light Mode)" : "Switch to Night View (Dark Mode)"}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800"
          >
            {isDark ? (
              <>
                <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
                <span>Day Mode</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-indigo-500 fill-current" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
                <span>Night Mode</span>
              </>
            )}
          </button>

          {/* Quick Refresh Button */}
          <button
            type="button"
            onClick={() => fetchOverviewData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800 disabled:opacity-50"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <ExclamationCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {reconcileMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{reconcileMessage}</span>
          </div>
          <button onClick={() => setReconcileMessage(null)} className="text-emerald-400 hover:text-emerald-600">
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SIX EXECUTIVE KPI METRIC CARDS                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Gross Sales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CurrencyDollar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(metrics?.total_revenue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>AOV: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(metrics?.average_order_value)}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics?.paid_orders ?? 0} paid</span>
          </div>
        </div>

        {/* Card 2: Orders Throughput */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics?.total_orders ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{metrics?.pending_orders ?? 0} pending</span>
            <span className="text-slate-400">{metrics?.canceled_orders ?? 0} canceled</span>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
            {metrics?.active_subscriptions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300 font-medium">{metrics?.total_subscriptions ?? 0} Total Plans</span>
            <span className="text-slate-400">{metrics?.expired_subscriptions ?? 0} Expired</span>
          </div>
        </div>

        {/* Card 4: Registered Customers */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Customers</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserGroup className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics?.total_customers ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">+{metrics?.new_customers_30d ?? 0} in 30d</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% active</span>
          </div>
        </div>

        {/* Card 5: Webinar Catalog */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Webinars</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <AcademicCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {metrics?.total_webinars ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{metrics?.upcoming_live_webinars ?? 0} live</span>
            <span className="text-slate-400">IRS/NASBA</span>
          </div>
        </div>

        {/* Card 6: Seat Registrations */}
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Enrollments</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {metrics?.total_registrations ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Active Seats</span>
            <span className="text-slate-400">Granted</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DUAL INTERACTIVE PERFORMANCE VISUALIZATIONS                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Revenue Volume Histogram */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CurrencyDollar className="w-4 h-4 text-emerald-500" />
                14-Day Revenue Trajectory & Daily Order Volume
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Real customer checkout transactions processed through active payment gateways.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
              {formatCurrency(metrics?.total_revenue)} Total
            </span>
          </div>

          <div className="h-48 w-full pt-4 flex items-end gap-2 border-b border-slate-100 dark:border-slate-800">
            {revenueChart.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No checkout orders recorded in this period.
              </div>
            ) : (
              revenueChart.map((d, i) => {
                const rev = parseFloat(String(d.revenue)) || 0
                const heightPct = Math.max(Math.round((rev / maxRevenue) * 100), 8)
                const count = parseInt(String(d.orders_count)) || 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                      {d.date_label}: {formatCurrency(rev)} ({count} orders)
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 transition-all cursor-pointer relative shadow-xs"
                    >
                      {count > 0 && (
                        <span className="hidden sm:block absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-full font-mono">
                      {d.date_label.split(" ")[1]}
                    </span>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span>
              Gross Sales ($ USD)
            </span>
            <span className="text-slate-400">Hover bars to inspect exact day totals</span>
          </div>
        </div>

        {/* Chart 2: Customer Acquisition & Registrations */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserGroup className="w-4 h-4 text-purple-500" />
                Customer Signups vs. Course Enrollments
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Velocity of newly registered professional accounts vs. webinar seat enrollments.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
              {metrics?.total_customers ?? 0} Accounts
            </span>
          </div>

          <div className="h-48 w-full pt-4 flex items-end gap-2 border-b border-slate-100 dark:border-slate-800">
            {growthChart.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No user growth events recorded in this period.
              </div>
            ) : (
              growthChart.map((d, i) => {
                const customers = parseInt(String(d.new_customers)) || 0
                const enrollments = parseInt(String(d.new_registrations)) || 0
                const custHeight = Math.max(Math.round((customers / maxGrowth) * 100), 6)
                const enrollHeight = Math.max(Math.round((enrollments / maxGrowth) * 100), 6)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md shadow-lg pointer-events-none whitespace-nowrap z-20">
                      {d.date_label}: +{customers} users, +{enrollments} seats
                    </div>

                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      <div
                        style={{ height: `${custHeight}%` }}
                        className="w-1/2 rounded-t-sm bg-purple-500 hover:bg-purple-600 transition-all cursor-pointer shadow-xs"
                        title={`New Users: ${customers}`}
                      />
                      <div
                        style={{ height: `${enrollHeight}%` }}
                        className="w-1/2 rounded-t-sm bg-emerald-500 hover:bg-emerald-600 transition-all cursor-pointer shadow-xs"
                        title={`New Registrations: ${enrollments}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-full font-mono">
                      {d.date_label.split(" ")[1]}
                    </span>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block"></span>
              New User Accounts
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
              Webinar Seat Enrollments
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. FOUR REAL-TIME OPERATIONAL PANELS                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Recent Customer Orders */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Customer Orders</h3>
            </div>
            <a
              href="/webapp/orders-management"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Orders Hub ({metrics?.total_orders || 0}) →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Order</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Total</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No customer orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        #{o.display_id || o.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {o.customer_name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{o.customer_email}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{formatDate(o.created_at)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(o.order_total, o.currency_code)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            o.payment_status === "Paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : o.payment_status === "Canceled"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {o.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2: Recent Customer Registrations */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserGroup className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Customer Accounts</h3>
            </div>
            <a
              href="/webapp/customers"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              All Customers ({metrics?.total_customers || 0}) →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Credential</th>
                  <th className="py-2.5 px-3 font-semibold">Registered</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No registered customers.
                    </td>
                  </tr>
                ) : (
                  recentCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {c.full_name || "New Customer"}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">{c.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {c.ptin ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            EA: {c.ptin}
                          </span>
                        ) : c.cfp_id ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            CFP: {c.cfp_id}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">{c.license_type || "CPA"}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">{formatDate(c.created_at)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.account_status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {c.account_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href="/webapp/customers"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          Edit
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3: Upcoming Live Webinars */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upcoming Live Webinars</h3>
            </div>
            <a
              href="/webapp/webinars"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Catalog ({metrics?.total_webinars || 0}) →
            </a>
          </div>

          <div className="space-y-3">
            {upcomingWebinars.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No upcoming live webinars scheduled.
              </div>
            ) : (
              upcomingWebinars.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex items-center justify-between gap-3 text-xs hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {w.title}
                      </span>
                      {w.cpe_credits && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                          {w.cpe_credits} CPE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span>{formatDate(w.event_date)}</span>
                      {w.speaker_name && <span>• Instructor: <strong className="text-slate-700 dark:text-slate-300">{w.speaker_name}</strong></span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold block text-[11px] border border-indigo-200 dark:border-indigo-800">
                      {w.registrations_count} Attendees
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 4: System Health & Order Reconciliation */}
        <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Platform Integrity & Health Monitor</h3>
            </div>
            <a
              href="/webapp/order-monitoring"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Order Monitoring →
            </a>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Transaction Integrity Incidents:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                    monitoringInfo.open_incidents_count === 0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {monitoringInfo.open_incidents_count === 0
                    ? "✓ 0 Incidents (Healthy)"
                    : `⚠ ${monitoringInfo.open_incidents_count} Open Incident(s)`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Automated Reconciliation:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {monitoringInfo.last_reconciliation_at
                    ? formatDate(monitoringInfo.last_reconciliation_at, true)
                    : "Scheduled cron active"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Alert Email Recipient:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                  {monitoringInfo.alert_recipient_email}
                </span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={handleRunReconciliation}
                disabled={isReconciling}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-800 disabled:opacity-50"
              >
                <ArrowPath className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin text-blue-500" : ""}`} />
                {isReconciling ? "Reconciling..." : "Run Health Check & Reconcile"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
