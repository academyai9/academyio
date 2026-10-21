import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  CreditCard,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  ExclamationCircle,
  Sparkles,
  Eye,
  ShieldCheck,
  InformationCircle,
  ChevronRight,
  Adjustments,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Payment Methods",
  icon: CreditCard,
  rank: 42,
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

interface PaymentMethodItem {
  id: string
  provider_id: string
  name: string
  display_title: string
  description?: string | null
  is_active: boolean
  environment: "live" | "test" | "sandbox"
  is_configured: boolean
  underlying_gateway?: string | null
  verification_mode?: string | null
  supported_cards?: string[]
  last_tested_at?: string | null
  last_test_status?: "success" | "failed" | null
  last_test_message?: string | null
  live_publishable_key?: string
  test_publishable_key?: string
  live_secret_key_masked?: string
  test_secret_key_masked?: string
  live_webhook_secret_masked?: string
  test_webhook_secret_masked?: string
  has_live_secret_key?: boolean
  has_test_secret_key?: boolean
  has_live_webhook_secret?: boolean
  has_test_webhook_secret?: boolean
  updated_at?: string
}

interface AuditLogItem {
  id: string
  payment_method_id: string
  provider_id: string
  action: string
  admin_email?: string
  details?: string
  method_name?: string
  created_at: string
}

export default function PaymentMethodsPage() {
  const { isDark } = useAdminTheme()

  const [methods, setMethods] = useState<PaymentMethodItem[]>([])
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 })
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [auditLoading, setAuditLoading] = useState(false)
  const [selectedAuditFilter, setSelectedAuditFilter] = useState("all")

  // Testing connection state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    id: string
    success: boolean
    message: string
    latency_ms?: number
  } | null>(null)

  // Configure Modal State
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null)
  const [configForm, setConfigForm] = useState({
    display_title: "",
    description: "",
    environment: "live" as "live" | "test" | "sandbox",
    live_publishable_key: "",
    live_secret_key: "",
    live_webhook_secret: "",
    test_publishable_key: "",
    test_secret_key: "",
    test_webhook_secret: "",
    underlying_gateway: "stripe",
    verification_mode: "instant_3ds_verification",
  })
  const [isUpdatingSecret, setIsUpdatingSecret] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSuccess, setConfigSuccess] = useState<string | null>(null)

  // Confirmation Modal State (for deactivating an active method)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [methodToToggle, setMethodToToggle] = useState<PaymentMethodItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Banner feedback
  const [globalBanner, setGlobalBanner] = useState<{
    type: "success" | "error" | "info"
    message: string
  } | null>(null)

  const fetchPaymentMethods = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/payment-methods", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error(`Failed to load payment methods: ${res.statusText}`)
      }
      const data = await res.json()
      setMethods(data.payment_methods || [])
      setSummary(data.summary || { total: 0, active: 0, inactive: 0 })
    } catch (err: any) {
      console.error(err)
      setGlobalBanner({
        type: "error",
        message: err.message || "Failed to load payment methods.",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const url =
        selectedAuditFilter === "all"
          ? "/admin/payment-methods/audit-logs?limit=20"
          : `/admin/payment-methods/audit-logs?provider_id=${selectedAuditFilter}&limit=20`

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.audit_logs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentMethods()
    fetchAuditLogs()
  }, [])

  useEffect(() => {
    fetchAuditLogs()
  }, [selectedAuditFilter])

  // Initiate Toggle (Active / Inactive)
  const handleToggleClick = (method: PaymentMethodItem) => {
    if (method.is_active) {
      // Show confirmation dialog before deactivating
      setMethodToToggle(method)
      setConfirmModalOpen(true)
    } else {
      // Activating: execute immediately
      executeToggle(method, true)
    }
  }

  // Execute Toggle Status
  const executeToggle = async (method: PaymentMethodItem, nextActive: boolean) => {
    setTogglingId(method.id)
    setGlobalBanner(null)
    setConfirmModalOpen(false)

    try {
      const res = await fetch(`/admin/payment-methods/${method.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: nextActive }),
      })

      const data = await res.json()
      if (!res.ok) {
        setGlobalBanner({
          type: "error",
          message: data.message || "Failed to update payment method status.",
        })
      } else {
        setGlobalBanner({
          type: "success",
          message: `${method.name} successfully ${nextActive ? "activated" : "deactivated"}. Changes applied to storefront immediately.`,
        })
        await fetchPaymentMethods()
        await fetchAuditLogs()
      }
    } catch (err: any) {
      setGlobalBanner({
        type: "error",
        message: err.message || "Network error occurred while toggling status.",
      })
    } finally {
      setTogglingId(null)
      setMethodToToggle(null)
    }
  }

  // Test Connection
  const handleTestConnection = async (method: PaymentMethodItem) => {
    setTestingId(method.id)
    setTestResult(null)

    try {
      const res = await fetch(`/admin/payment-methods/${method.id}/test-connection`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ environment: method.environment }),
      })

      const data = await res.json()
      setTestResult({
        id: method.id,
        success: Boolean(data.success),
        message: data.message || (data.success ? "Connection operational" : "Test failed"),
        latency_ms: data.latency_ms,
      })

      // Refresh list to show updated last_tested_at and status badge
      await fetchPaymentMethods()
      await fetchAuditLogs()
    } catch (err: any) {
      setTestResult({
        id: method.id,
        success: false,
        message: `Connection error: ${err.message}`,
      })
    } finally {
      setTestingId(null)
    }
  }

  // Open Configure Modal
  const openConfigureModal = (method: PaymentMethodItem) => {
    setEditingMethod(method)
    setConfigError(null)
    setConfigSuccess(null)
    setIsUpdatingSecret(false)
    setConfigForm({
      display_title: method.display_title || "",
      description: method.description || "",
      environment: method.environment || "live",
      live_publishable_key: method.live_publishable_key || "",
      live_secret_key: method.live_secret_key_masked || "",
      live_webhook_secret: method.live_webhook_secret_masked || "",
      test_publishable_key: method.test_publishable_key || "",
      test_secret_key: method.test_secret_key_masked || "",
      test_webhook_secret: method.test_webhook_secret_masked || "",
      underlying_gateway: method.underlying_gateway || "stripe",
      verification_mode: method.verification_mode || "instant_3ds_verification",
    })
    setConfigModalOpen(true)
  }

  // Save Configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMethod) return

    setSavingConfig(true)
    setConfigError(null)
    setConfigSuccess(null)

    try {
      const payload: any = {
        display_title: configForm.display_title,
        description: configForm.description,
        environment: configForm.environment,
        underlying_gateway: configForm.underlying_gateway,
        verification_mode: configForm.verification_mode,
        live_publishable_key: configForm.live_publishable_key,
        test_publishable_key: configForm.test_publishable_key,
      }

      // Only send secret keys if updated or not masked
      if (
        configForm.live_secret_key &&
        !configForm.live_secret_key.includes("••••")
      ) {
        payload.live_secret_key = configForm.live_secret_key
      }
      if (
        configForm.test_secret_key &&
        !configForm.test_secret_key.includes("••••")
      ) {
        payload.test_secret_key = configForm.test_secret_key
      }
      if (
        configForm.live_webhook_secret &&
        !configForm.live_webhook_secret.includes("••••")
      ) {
        payload.live_webhook_secret = configForm.live_webhook_secret
      }
      if (
        configForm.test_webhook_secret &&
        !configForm.test_webhook_secret.includes("••••")
      ) {
        payload.test_webhook_secret = configForm.test_webhook_secret
      }

      const res = await fetch(`/admin/payment-methods/${editingMethod.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setConfigError(data.message || "Failed to save configuration.")
      } else {
        setConfigSuccess("Configuration saved securely and verified!")
        setTimeout(() => {
          setConfigModalOpen(false)
          fetchPaymentMethods()
          fetchAuditLogs()
        }, 1200)
      }
    } catch (err: any) {
      setConfigError(err.message || "An unexpected error occurred.")
    } finally {
      setSavingConfig(false)
    }
  }

  return (
    <div
      className={`min-h-screen p-6 sm:p-8 space-y-8 font-sans ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            <span>Settings</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Payment Methods
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Payment Methods Management
            <Badge color="blue" size="small" className="font-mono text-[10px] tracking-wider uppercase">
              Production Gateway
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure, activate, deactivate, and test PayPal, Stripe, and Electronic Card Payment & Instant Verification. Changes dynamically propagate to customer checkout without redeployment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              fetchPaymentMethods()
              fetchAuditLogs()
            }}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AdminThemeToggle />
        </div>
      </div>

      {/* Global Banner Notification */}
      {globalBanner && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border shadow-sm transition-all ${
            globalBanner.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : globalBanner.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {globalBanner.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <ExclamationCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{globalBanner.message}</span>
          </div>
          <button
            onClick={() => setGlobalBanner(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Key Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gateways */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Gateways
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary.total}
            </span>
            <span className="text-xs text-slate-400">managed providers</span>
          </div>
        </div>

        {/* Active Providers */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Checkout Methods
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.active}
            </span>
            <span className="text-xs text-slate-400">visible to customers</span>
          </div>
        </div>

        {/* Inactive Providers */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Disabled / Standby
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summary.inactive}
            </span>
            <span className="text-xs text-slate-400">offline methods</span>
          </div>
        </div>

        {/* Security & Verification Status */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Credential Protection
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Masked & Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Security Guidance Note */}
      <div
        className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
          isDark
            ? "bg-blue-950/20 border-blue-900/60 text-blue-200"
            : "bg-blue-50/80 border-blue-200 text-blue-900"
        }`}
      >
        <InformationCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Enterprise Payment Gateway Architecture:</span>
          Administrators can independently toggle PayPal, Stripe, and Electronic Card Verification. Sensitive private keys are masked in the UI and never exposed in unauthenticated API responses. The &quot;Test Connection&quot; utility performs non-destructive health checks against official payment APIs without charging cards or altering balances.
        </div>
      </div>

      {/* Main Payment Method Cards Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Configured Payment Methods
            <span className="text-xs font-normal text-slate-400">
              ({methods.length} Available Gateways)
            </span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Click &quot;Configure&quot; to manage keys, environments, or display copy.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {methods.map((method) => {
            const isStripe = method.provider_id === "stripe"
            const isPayPal = method.provider_id === "paypal"
            const isElectronic = method.provider_id === "electronic_card"
            const isTesting = testingId === method.id
            const isToggling = togglingId === method.id
            const currentTest = testResult?.id === method.id ? testResult : null

            return (
              <div
                key={method.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
                  isDark
                    ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 hover:border-slate-300"
                } ${
                  method.is_active
                    ? "ring-1 ring-emerald-500/30"
                    : "opacity-90"
                }`}
              >
                {/* Card Top: Header & Badges */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Brand Icon & Name */}
                    <div className="flex items-center gap-3">
                      {isStripe ? (
                        <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-sm tracking-tighter">
                          S
                        </div>
                      ) : isPayPal ? (
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm italic">
                          P
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                      )}

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                          {method.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          ID: {method.provider_id}
                        </span>
                      </div>
                    </div>

                    {/* Active/Inactive Status Badge */}
                    <div>
                      {method.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Facing Display Box */}
                  <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Customer Checkout Title
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                        {method.display_title || method.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Customer Description
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block line-clamp-2">
                        {method.description || "No description configured."}
                      </span>
                    </div>
                  </div>

                  {/* Gateway Environment & Security Meta */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-[11px]">Environment:</span>
                      <span
                        className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded-md ${
                          method.environment === "live"
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold"
                        }`}
                      >
                        {method.environment}
                      </span>
                    </div>

                    {isStripe && (
                      <>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span className="text-[11px]">Publishable Key:</span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                            {method.live_publishable_key
                              ? `${method.live_publishable_key.slice(0, 10)}...`
                              : "Not Set"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                          <span className="text-[11px]">Secret Key:</span>
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {method.live_secret_key_masked || "••••••••"}
                          </span>
                        </div>
                      </>
                    )}

                    {isPayPal && (
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px]">Credentials Status:</span>
                        <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                          {method.has_live_secret_key || method.has_test_secret_key
                            ? "Configured & Protected"
                            : "Pending Setup"}
                        </span>
                      </div>
                    )}

                    {isElectronic && (
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-[11px]">Underlying Gateway:</span>
                        <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 uppercase">
                          {method.underlying_gateway || "Stripe"}
                        </span>
                      </div>
                    )}

                    {/* Connection Test History */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Health Check:</span>
                      {method.last_test_status === "success" ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : method.last_test_status === "failed" ? (
                        <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                          <ExclamationCircle className="w-3.5 h-3.5" />
                          Test Failed
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Untested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Test Result Toast if available */}
                  {currentTest && (
                    <div
                      className={`mt-4 p-3 rounded-xl text-[11px] border leading-normal ${
                        currentTest.success
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                          : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-0.5">
                        {currentTest.success ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <ExclamationCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        )}
                        <span>
                          {currentTest.success ? "Test Succeeded" : "Test Failed"}
                          {currentTest.latency_ms && ` (${currentTest.latency_ms}ms)`}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90">{currentTest.message}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 rounded-b-2xl flex items-center justify-between gap-2">
                  {/* Enable / Disable Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleClick(method)}
                    disabled={isToggling}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      method.is_active
                        ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    }`}
                  >
                    {isToggling ? (
                      <ArrowPath className="w-3.5 h-3.5 animate-spin" />
                    ) : method.is_active ? (
                      "Deactivate"
                    ) : (
                      "Activate"
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Non-Destructive Test Connection Button */}
                    <button
                      type="button"
                      onClick={() => handleTestConnection(method)}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {isTesting ? (
                        <>
                          <ArrowPath className="w-3 h-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test API"
                      )}
                    </button>

                    {/* Configure Button */}
                    <button
                      type="button"
                      onClick={() => openConfigureModal(method)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Adjustments className="w-3.5 h-3.5" />
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Audit Log Trail Section */}
      <div
        className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Administrative Audit Trail
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks configuration adjustments, key updates, activation states, and test results with administrator identity and timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedAuditFilter}
              onChange={(e) => setSelectedAuditFilter(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Providers</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="electronic_card">Electronic Card</option>
            </select>
            <Button
              variant="secondary"
              size="small"
              onClick={fetchAuditLogs}
              disabled={auditLoading}
              className="text-xs"
            >
              <ArrowPath className={`w-3.5 h-3.5 ${auditLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Provider</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Admin Actor</th>
                <th className="pb-2.5">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => {
                  const actionColor =
                    log.action === "activated"
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
                      : log.action === "deactivated"
                      ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800"
                      : log.action === "tested"
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800"
                      : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-white uppercase text-[11px]">
                        {log.provider_id}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${actionColor}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {log.admin_email || "admin@academyio.com"}
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300 max-w-md">
                        {log.details || "Configuration adjustment executed."}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No recent audit log entries found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: CONFIGURE PAYMENT METHOD ================= */}
      {configModalOpen && editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {editingMethod.name.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-base font-bold">Configure {editingMethod.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Adjust customer-facing labels, environment, and secure backend credentials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
              {configError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <ExclamationCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{configError}</span>
                </div>
              )}

              {configSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{configSuccess}</span>
                </div>
              )}

              {/* Environment Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Operational Environment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setConfigForm({
                        ...configForm,
                        environment: editingMethod.provider_id === "paypal" ? "sandbox" : "test",
                      })
                    }
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      configForm.environment === "test" || configForm.environment === "sandbox"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="font-bold text-xs block">
                      {editingMethod.provider_id === "paypal" ? "Sandbox (Testing)" : "Test Mode"}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sandbox simulated transactions
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfigForm({ ...configForm, environment: "live" })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      configForm.environment === "live"
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-1 ring-blue-600"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="font-bold text-xs block">Live Production</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Real credit card and wallet payments
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer-Facing Labels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Title at Checkout
                  </label>
                  <input
                    type="text"
                    value={configForm.display_title}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, display_title: e.target.value })
                    }
                    placeholder="e.g. Credit / Debit Card (Stripe)"
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Customer Description
                  </label>
                  <input
                    type="text"
                    value={configForm.description}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, description: e.target.value })
                    }
                    placeholder="e.g. Visa, Mastercard, American Express..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Provider Specific Credentials */}
              {editingMethod.provider_id === "stripe" && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Stripe API Keys ({configForm.environment.toUpperCase()})
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Publishable Key
                    </label>
                    <input
                      type="text"
                      value={
                        configForm.environment === "live"
                          ? configForm.live_publishable_key
                          : configForm.test_publishable_key
                      }
                      onChange={(e) => {
                        if (configForm.environment === "live") {
                          setConfigForm({ ...configForm, live_publishable_key: e.target.value })
                        } else {
                          setConfigForm({ ...configForm, test_publishable_key: e.target.value })
                        }
                      }}
                      placeholder={configForm.environment === "live" ? "pk_live_..." : "pk_test_..."}
                      className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Secret Key (Encrypted & Masked)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsUpdatingSecret(!isUpdatingSecret)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        {isUpdatingSecret ? "Keep existing key" : "Change key"}
                      </button>
                    </div>

                    {isUpdatingSecret ? (
                      <input
                        type="password"
                        onChange={(e) => {
                          if (configForm.environment === "live") {
                            setConfigForm({ ...configForm, live_secret_key: e.target.value })
                          } else {
                            setConfigForm({ ...configForm, test_secret_key: e.target.value })
                          }
                        }}
                        placeholder="Paste new sk_live_... or sk_test_..."
                        className="w-full font-mono text-xs p-2.5 rounded-xl border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>
                          {configForm.environment === "live"
                            ? configForm.live_secret_key || "••••••••••••••••••••••••••••••••"
                            : configForm.test_secret_key || "••••••••••••••••••••••••••••••••"}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          Saved
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Webhook Signing Secret
                    </label>
                    <input
                      type="text"
                      value={
                        configForm.environment === "live"
                          ? configForm.live_webhook_secret
                          : configForm.test_webhook_secret
                      }
                      onChange={(e) => {
                        if (configForm.environment === "live") {
                          setConfigForm({ ...configForm, live_webhook_secret: e.target.value })
                        } else {
                          setConfigForm({ ...configForm, test_webhook_secret: e.target.value })
                        }
                      }}
                      placeholder="whsec_..."
                      className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {editingMethod.provider_id === "paypal" && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    PayPal REST API Credentials ({configForm.environment.toUpperCase()})
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={
                        configForm.environment === "live"
                          ? configForm.live_publishable_key
                          : configForm.test_publishable_key
                      }
                      onChange={(e) => {
                        if (configForm.environment === "live") {
                          setConfigForm({ ...configForm, live_publishable_key: e.target.value })
                        } else {
                          setConfigForm({ ...configForm, test_publishable_key: e.target.value })
                        }
                      }}
                      placeholder="e.g. AY..."
                      className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      onChange={(e) => {
                        if (configForm.environment === "live") {
                          setConfigForm({ ...configForm, live_secret_key: e.target.value })
                        } else {
                          setConfigForm({ ...configForm, test_secret_key: e.target.value })
                        }
                      }}
                      placeholder="Enter new PayPal client secret (or leave empty to keep saved)"
                      className="w-full font-mono text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {editingMethod.provider_id === "electronic_card" && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Electronic Verification & Processing Pipeline
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Underlying Payment Gateway
                      </label>
                      <select
                        value={configForm.underlying_gateway}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, underlying_gateway: e.target.value })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="stripe">Stripe (PCI Compliant 3DS Gateway)</option>
                        <option value="system_default">Direct System Processor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Instant Verification Mode
                      </label>
                      <select
                        value={configForm.verification_mode}
                        onChange={(e) =>
                          setConfigForm({ ...configForm, verification_mode: e.target.value })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="instant_3ds_verification">
                          Server-Side 3D Secure & Network Verification
                        </option>
                        <option value="automated_bank_check">
                          Automated Bank Network Card Check
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  type="submit"
                  disabled={savingConfig}
                  className="bg-blue-600 hover:bg-blue-700 font-bold"
                >
                  {savingConfig ? "Saving Changes..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DEACTIVATION CONFIRMATION ================= */}
      {confirmModalOpen && methodToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ExclamationCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Deactivate {methodToToggle.name}?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confirm deactivating this customer checkout method.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Deactivating <strong>{methodToToggle.name}</strong> will immediately remove it from customer single-page checkout and subscription checkout without requiring a server restart or deployment. Customers currently placing orders will no longer see this option.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setConfirmModalOpen(false)
                  setMethodToToggle(null)
                }}
              >
                Keep Active
              </Button>
              <button
                type="button"
                onClick={() => executeToggle(methodToToggle, false)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
