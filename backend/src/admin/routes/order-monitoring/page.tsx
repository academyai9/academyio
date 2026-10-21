import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  BellAlert,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  ExclamationCircle,
  Envelope,
  PaperPlane,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Order Monitoring",
  icon: BellAlert,
  rank: 41,
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

interface IncidentItem {
  id: string
  incident_type: string
  severity: "critical" | "high" | "medium" | "low"
  status: "new" | "investigating" | "awaiting_payment_verification" | "resolved" | "false_positive"
  customer_name?: string | null
  customer_email?: string | null
  checkout_reference?: string | null
  payment_reference?: string | null
  expected_order_id?: string | null
  order_id?: string | null
  webinar_title?: string | null
  amount?: number | string | null
  currency_code?: string | null
  payment_status?: string | null
  description: string
  detection_rule: string
  recommended_action?: string | null
  admin_notes?: string | null
  email_alert_sent: boolean
  email_alert_sent_at?: string | null
  email_provider_message_id?: string | null
  email_error?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
  resolved_by?: string | null
}

interface MonitoringKPIs {
  total: number
  open: number
  new: number
  critical: number
  missing_orders: number
  missing_access: number
  resolved: number
  alerts_sent: number
}

export default function OrderMonitoringPage() {
  const { isDark } = useAdminTheme()
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [metrics, setMetrics] = useState<MonitoringKPIs | null>(null)
  const [settings, setSettings] = useState<{
    last_reconciliation_at: string | null
    grace_period_minutes: number
    alert_recipient_email: string
    monitoring_enabled: boolean
  }>({
    last_reconciliation_at: null,
    grace_period_minutes: 5,
    alert_recipient_email: "support@academyio.com",
    monitoring_enabled: true,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Reconciliation Action State
  const [isReconciling, setIsReconciling] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Incident Modal Inspection State
  const [activeIncident, setActiveIncident] = useState<IncidentItem | null>(null)
  const [incidentDetailData, setIncidentDetailData] = useState<any | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [statusUpdateNote, setStatusUpdateNote] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)

  const fetchIncidents = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        severity: severityFilter,
        type: typeFilter,
        limit: "100",
      })

      const res = await fetch(`/admin/order-monitoring?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Authentication required. Please refresh the page or log in again.")
        }
        throw new Error(`Failed to load incidents (Status: ${res.status})`)
      }
      const data = await res.json()
      setIncidents(data.incidents || [])
      setMetrics(data.metrics)
      if (data.settings) setSettings(data.settings)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load order monitoring incidents.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
  }, [statusFilter, severityFilter, typeFilter])

  // Run Reconciliation
  const handleTriggerReconcile = async () => {
    setIsReconciling(true)
    setActionMessage(null)
    try {
      const res = await fetch(`/admin/order-monitoring/reconcile`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          dry_run: dryRun,
          grace_period_minutes: settings.grace_period_minutes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage({ type: "success", text: data.message })
        fetchIncidents()
      } else {
        setActionMessage({ type: "error", text: data.message })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message })
    } finally {
      setIsReconciling(false)
    }
  }

  // Open Incident Detail Modal
  const openIncidentModal = async (inc: IncidentItem) => {
    setActiveIncident(inc)
    setInspectLoading(true)
    setIncidentDetailData(null)
    setStatusUpdateNote(inc.admin_notes || "")
    try {
      const res = await fetch(`/admin/order-monitoring/${inc.id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setIncidentDetailData(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setInspectLoading(false)
    }
  }

  // Update Status & Notes
  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeIncident) return
    setIsUpdatingStatus(true)
    try {
      const res = await fetch(`/admin/order-monitoring/${activeIncident.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          status: newStatus,
          admin_notes: statusUpdateNote,
          action_note: `Administrator manually updated status to '${newStatus}'`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage({ type: "success", text: `Incident status updated to '${newStatus}'.` })
        openIncidentModal({ ...activeIncident, status: newStatus as any, admin_notes: statusUpdateNote })
        fetchIncidents()
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Resend Alert Email
  const handleResendAlert = async () => {
    if (!activeIncident) return
    setIsResendingEmail(true)
    try {
      const res = await fetch(`/admin/order-monitoring/${activeIncident.id}/resend-alert`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage({ type: "success", text: data.message })
        openIncidentModal(activeIncident)
        fetchIncidents()
      } else {
        setActionMessage({ type: "error", text: data.message })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message })
    } finally {
      setIsResendingEmail(false)
    }
  }

  // Safe Order Recovery
  const handleRecoverOrder = async () => {
    if (!activeIncident) return
    if (!confirm("Execute Safe Order Recovery? This will idempotently create the missing order and provision webinar digital entitlement access.")) {
      return
    }

    setIsRecovering(true)
    try {
      const res = await fetch(`/admin/order-monitoring/${activeIncident.id}/recover-order`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage({ type: "success", text: data.message })
        openIncidentModal({ ...activeIncident, status: "resolved" })
        fetchIncidents()
      } else {
        setActionMessage({ type: "error", text: data.message })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message })
    } finally {
      setIsRecovering(false)
    }
  }

  // Grant Missing Entitlement
  const handleGrantAccess = async () => {
    if (!activeIncident) return
    setIsRecovering(true)
    try {
      const res = await fetch(`/admin/order-monitoring/${activeIncident.id}/grant-access`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setActionMessage({ type: "success", text: data.message })
        openIncidentModal({ ...activeIncident, status: "resolved" })
        fetchIncidents()
      } else {
        setActionMessage({ type: "error", text: data.message })
      }
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message })
    } finally {
      setIsRecovering(false)
    }
  }

  const formatTypeBadge = (type: string) => {
    switch (type) {
      case "missing_order":
        return <Badge color="red" size="small">Missing Order</Badge>
      case "checkout_failed":
        return <Badge color="orange" size="small">Checkout Failed</Badge>
      case "payment_mismatch":
        return <Badge color="purple" size="small">Payment Mismatch</Badge>
      case "missing_webinar_access":
        return <Badge color="blue" size="small">Missing Access</Badge>
      case "duplicate_payment_order":
        return <Badge color="red" size="small">Duplicate</Badge>
      default:
        return <Badge color="grey" size="small">{type}</Badge>
    }
  }

  const formatSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Critical</span>
      case "high":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">High</span>
      case "medium":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Medium</span>
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">Low</span>
    }
  }

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <BellAlert className="w-5 h-5" />
            </span>
            <Heading level="h1" className="text-2xl font-black tracking-tight text-ui-fg-base">
              Order Monitoring & Reconciliation
            </Heading>
          </div>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            Automated anomaly detection across successful payments without orders, failed checkouts, and missing digital entitlements.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs font-bold text-ui-fg-subtle select-none cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Dry Run</span>
          </label>

          <Button
            variant="primary"
            size="small"
            onClick={handleTriggerReconcile}
            disabled={isReconciling}
            className="cursor-pointer gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin" : ""}`} />
            {isReconciling ? "Reconciling..." : "Run Reconciliation"}
          </Button>

          <Button
            variant="secondary"
            size="small"
            onClick={fetchIncidents}
            disabled={loading}
            className="cursor-pointer gap-1.5"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <AdminThemeToggle />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
            <ExclamationCircle className="w-5 h-5 flex-shrink-0" />
            <Text className="text-xs font-semibold">{error}</Text>
          </div>
          <Button size="small" variant="secondary" onClick={() => fetchIncidents()} className="cursor-pointer">
            Retry
          </Button>
        </div>
      )}

      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            actionMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="cursor-pointer">
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-ui-fg-muted tracking-wider">Total Detected</span>
          <div className="text-xl font-black text-ui-fg-base">{metrics?.total ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-ui-bg-base border border-amber-300 shadow-xs space-y-1 bg-amber-50/20">
          <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider">Open Incidents</span>
          <div className="text-xl font-black text-amber-600">{metrics?.open ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Critical Missing</span>
          <div className="text-xl font-black text-rose-600">{metrics?.missing_orders ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">Missing Access</span>
          <div className="text-xl font-black text-blue-600">{metrics?.missing_access ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Resolved</span>
          <div className="text-xl font-black text-emerald-600">{metrics?.resolved ?? 0}</div>
        </div>

        <div className="p-4 rounded-2xl bg-ui-bg-base border border-ui-border-base shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-ui-fg-muted tracking-wider">Alerts Sent</span>
          <div className="text-xl font-black text-ui-fg-base">{metrics?.alerts_sent ?? 0}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold">
          {[
            { key: "all", label: "All" },
            { key: "new", label: "New (Unassigned)" },
            { key: "investigating", label: "Investigating" },
            { key: "awaiting_payment_verification", label: "Awaiting Payment" },
            { key: "resolved", label: "Resolved" },
            { key: "false_positive", label: "False Positive" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-blue-600 text-white font-bold shadow-xs"
                  : "bg-ui-bg-subtle text-ui-fg-subtle hover:text-ui-fg-base"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden"
          >
            <option value="all">Type: All</option>
            <option value="missing_order">Missing Order</option>
            <option value="checkout_failed">Checkout Failed</option>
            <option value="payment_mismatch">Payment Mismatch</option>
            <option value="missing_webinar_access">Missing Access</option>
            <option value="duplicate_payment_order">Duplicate</option>
          </select>
        </div>
      </div>

      {/* Incidents Data Table */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-ui-fg-subtle text-xs space-y-3">
            <ArrowPath className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p>Scanning incident records...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-16 text-center text-ui-fg-subtle text-xs space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-sm text-ui-fg-base">Zero Open Incidents Detected</p>
            <p>All checkouts, payments, and webinar entitlements are reconciled and consistent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ui-bg-subtle/60 border-b border-ui-border-base text-ui-fg-muted font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Incident ID</th>
                  <th className="py-3.5 px-4">Issue Type</th>
                  <th className="py-3.5 px-4">Customer & Email</th>
                  <th className="py-3.5 px-4">Payment Ref</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Email Alert</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base font-medium">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-ui-bg-subtle/50 transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      <div>{inc.id}</div>
                      <div className="text-[10px] text-ui-fg-muted font-normal">
                        {new Date(inc.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {formatTypeBadge(inc.incident_type)}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-bold text-ui-fg-base truncate">
                        {inc.customer_name || "Unregistered Guest"}
                      </div>
                      <div className="text-[11px] text-ui-fg-subtle truncate" title={inc.customer_email || ""}>
                        {inc.customer_email || "N/A"}
                      </div>
                    </td>

                    {/* Payment Ref */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-ui-fg-subtle truncate max-w-[150px]">
                      {inc.payment_reference || inc.checkout_reference || "—"}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-bold text-ui-fg-base whitespace-nowrap">
                      {inc.amount ? `$${Number(inc.amount).toFixed(2)}` : "—"}
                    </td>

                    {/* Severity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {formatSeverityBadge(inc.severity)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                        inc.status === "new"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : inc.status === "investigating"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : inc.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {inc.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Email Alert */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px]">
                      {inc.email_alert_sent ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : (
                        <span className="text-ui-fg-muted">Not Sent</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => openIncidentModal(inc)}
                        className="cursor-pointer text-xs"
                      >
                        Inspect & Resolve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Inspection & Resolution Modal */}
      {activeIncident && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-ui-border-base pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-black text-blue-600">{activeIncident.id}</span>
                  {formatTypeBadge(activeIncident.incident_type)}
                  {formatSeverityBadge(activeIncident.severity)}
                </div>
                <Text className="text-[11px] text-ui-fg-muted font-mono mt-1">
                  Detected {new Date(activeIncident.created_at).toLocaleString()}
                </Text>
              </div>

              <button onClick={() => setActiveIncident(null)} className="cursor-pointer">
                <XMark className="w-5 h-5 text-ui-fg-subtle hover:text-ui-fg-base" />
              </button>
            </div>

            {inspectLoading ? (
              <div className="py-12 text-center text-ui-fg-subtle text-xs">
                <ArrowPath className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                Loading incident diagnostics and linked records...
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Description Box */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Diagnostic Finding
                  </span>
                  <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                    {activeIncident.description}
                  </p>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                    <strong>Rule:</strong> {activeIncident.detection_rule}
                  </div>
                </div>

                {/* Linked Records Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base space-y-1">
                    <span className="text-[10px] font-bold uppercase text-ui-fg-muted">Customer Target</span>
                    <div className="font-bold text-ui-fg-base">{activeIncident.customer_name || "Unregistered Guest"}</div>
                    <div className="text-ui-fg-subtle">{activeIncident.customer_email || "N/A"}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base space-y-1">
                    <span className="text-[10px] font-bold uppercase text-ui-fg-muted">Financial Transaction</span>
                    <div className="font-bold text-ui-fg-base">
                      {activeIncident.amount ? `$${Number(activeIncident.amount).toFixed(2)} ${activeIncident.currency_code?.toUpperCase()}` : "N/A"}
                    </div>
                    <div className="text-ui-fg-subtle font-mono text-[10px] truncate">
                      Ref: {activeIncident.payment_reference || activeIncident.checkout_reference || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Recommended Resolution Action */}
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Recommended Resolution</span>
                  </div>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                    {activeIncident.recommended_action}
                  </p>

                  {/* Contextual Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(activeIncident.incident_type === "missing_order" || activeIncident.incident_type === "checkout_failed") && (
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleRecoverOrder}
                        disabled={isRecovering || activeIncident.status === "resolved"}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold"
                      >
                        {isRecovering ? "Executing..." : "Safe Order Recovery (Provision Order & Access)"}
                      </Button>
                    )}

                    {activeIncident.incident_type === "missing_webinar_access" && (
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleGrantAccess}
                        disabled={isRecovering || activeIncident.status === "resolved"}
                        className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-bold"
                      >
                        {isRecovering ? "Granting..." : "Grant Webinar Access Now"}
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleResendAlert}
                      disabled={isResendingEmail}
                      className="cursor-pointer gap-1"
                    >
                      <PaperPlane className="w-3.5 h-3.5" />
                      {isResendingEmail ? "Sending..." : "Resend Alert to support@academyio.com"}
                    </Button>
                  </div>
                </div>

                {/* Status Switcher & Admin Notes */}
                <div className="space-y-3 p-4 rounded-2xl border border-ui-border-base bg-ui-bg-subtle/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ui-fg-base">Investigation Workflow Status</span>
                    <span className="text-[11px] text-ui-fg-muted font-semibold">
                      Current: <strong className="capitalize">{activeIncident.status.replace(/_/g, " ")}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["new", "investigating", "awaiting_payment_verification", "resolved", "false_positive"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={isUpdatingStatus}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          activeIncident.status === st
                            ? "bg-ui-fg-base text-ui-bg-base shadow-xs"
                            : "bg-ui-bg-base border border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base"
                        }`}
                      >
                        {st.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-ui-fg-muted mb-1">
                      Internal Admin Notes / Audit Notes
                    </label>
                    <textarea
                      value={statusUpdateNote}
                      onChange={(e) => setStatusUpdateNote(e.target.value)}
                      placeholder="Add investigation notes, verification confirmation from payment provider..."
                      rows={3}
                      className="w-full p-2.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-base focus:outline-hidden"
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleUpdateStatus(activeIncident.status)}
                        disabled={isUpdatingStatus}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Audit History Log */}
                {incidentDetailData?.audit_logs && incidentDetailData.audit_logs.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-ui-fg-muted block">
                      Audit Trail & Actions History
                    </span>
                    <div className="border border-ui-border-base rounded-2xl overflow-hidden divide-y divide-ui-border-base text-[11px]">
                      {incidentDetailData.audit_logs.map((log: any) => (
                        <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold text-ui-fg-base">
                              {log.action} <span className="text-ui-fg-muted font-normal">by {log.admin_email}</span>
                            </div>
                            <div className="text-ui-fg-subtle mt-0.5">{log.notes}</div>
                          </div>
                          <span className="text-[10px] text-ui-fg-muted whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui-border-base">
              <Button variant="secondary" onClick={() => setActiveIncident(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
