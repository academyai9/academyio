import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Envelope,
  Plus,
  ArrowPath,
  CheckCircle,
  XMark,
  Trash,
  MagnifyingGlass,
  InformationCircle,
  ExclamationCircle,
  ShieldCheck,
  Eye,
  ArrowDownTray,
  UserGroup,
  Clock,
  Sparkles,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Newsletter Subscribers",
  icon: Envelope,
  rank: 65,
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

interface Subscriber {
  id: string
  email: string
  first_name: string | null
  status: "pending" | "active" | "unsubscribed" | "bounced" | "suppressed"
  verified_at: string | null
  unsubscribed_at: string | null
  unsubscribe_reason: string | null
  consent_source: string
  consent_timestamp: string
  last_email_sent_at: string | null
  emails_sent_count: number
  created_at: string
}

interface SubscriberStats {
  total: number
  active: number
  pending: number
  unsubscribed: number
  bounced: number
  suppressed: number
}

interface AuditLog {
  id: string
  action: string
  actor: string
  details: Record<string, any>
  ip_address: string | null
  created_at: string
}

export default function NewsletterSubscribersPage() {
  const { isDark } = useAdminTheme()
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [stats, setStats] = useState<SubscriberStats>({
    total: 0,
    active: 0,
    pending: 0,
    unsubscribed: 0,
    bounced: 0,
    suppressed: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Notification banners
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReactivateModal, setShowReactivateModal] = useState(false)
  const [unsubscribeTarget, setUnsubscribeTarget] = useState<Subscriber | null>(null)
  const [unsubscribeReason, setUnsubscribeReason] = useState("Unsubscribed by administrator via Super Admin Panel")
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null)
  const [subscriberLogs, setSubscriberLogs] = useState<AuditLog[]>([])

  // Form states
  const [newEmail, setNewEmail] = useState("")
  const [newFirstName, setNewFirstName] = useState("")
  const [newStatus, setNewStatus] = useState<"active" | "pending">("active")
  const [newConsentDoc, setNewConsentDoc] = useState("Administrator manual opt-in")
  const [reactivateConsentDoc, setReactivateConsentDoc] = useState("Re-subscribed via Super Admin Panel")
  const [submitting, setSubmitting] = useState(false)

  const fetchSubscribers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter !== "all") params.append("status", statusFilter)
      params.append("limit", String(pageSize))
      params.append("offset", String((page - 1) * pageSize))

      const res = await fetch(`/admin/newsletter-subscribers?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load subscribers")
      const data = await res.json()
      setSubscribers(data.subscribers || [])
      setTotalCount(data.total || 0)
      if (data.stats) setStats(data.stats)
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Failed to load newsletter subscribers" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubscribers()
  }, [page, statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSubscribers()
  }

  const handleViewDetails = async (sub: Subscriber) => {
    setSelectedSubscriber(sub)
    setShowDetailModal(true)
    try {
      const res = await fetch(`/admin/newsletter-subscribers/${sub.id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setSubscriberLogs(data.auditLogs || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleResendVerification = async (sub: Subscriber) => {
    if (!confirm(`Resend double opt-in confirmation email to ${sub.email}?`)) return
    try {
      const res = await fetch(`/admin/newsletter-subscribers/${sub.id}/resend-verification`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to resend verification")
      setAlert({ type: "success", message: `Verification email resent to ${sub.email}.` })
      fetchSubscribers()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    }
  }

  const handleOpenUnsubscribe = (sub: Subscriber) => {
    setUnsubscribeTarget(sub)
    setUnsubscribeReason("Unsubscribed by administrator via Super Admin Panel")
  }

  const handleConfirmUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unsubscribeTarget) return
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/newsletter-subscribers/${unsubscribeTarget.id}/unsubscribe`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ reason: unsubscribeReason || "Unsubscribed by administrator" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to unsubscribe subscriber")
      setAlert({ type: "success", message: `Subscriber ${unsubscribeTarget.email} has been unsubscribed and suppressed.` })
      setUnsubscribeTarget(null)
      fetchSubscribers()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleInstantSubscribe = async (sub: Subscriber) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/newsletter-subscribers/${sub.id}/reactivate`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ consent_documentation: "Subscribed / Activated by administrator via Super Admin Panel" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to subscribe/activate")
      setAlert({ type: "success", message: `Subscriber ${sub.email} is now Subscribed & Active!` })
      fetchSubscribers()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenReactivate = (sub: Subscriber) => {
    setSelectedSubscriber(sub)
    setReactivateConsentDoc("Re-subscribed via Super Admin Panel")
    setShowReactivateModal(true)
  }

  const handleConfirmReactivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubscriber) return
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/newsletter-subscribers/${selectedSubscriber.id}/reactivate`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ consent_documentation: reactivateConsentDoc || "Re-subscribed via Super Admin Panel" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reactivate subscriber")
      setAlert({ type: "success", message: `Subscriber ${selectedSubscriber.email} reactivated with documented consent.` })
      setShowReactivateModal(false)
      fetchSubscribers()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePending = async (sub: Subscriber) => {
    if (!confirm(`Are you sure you want to delete pending subscriber ${sub.email}?`)) return
    try {
      const res = await fetch(`/admin/newsletter-subscribers/${sub.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete subscriber")
      setAlert({ type: "success", message: "Pending subscriber record removed." })
      fetchSubscribers()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/admin/newsletter-subscribers", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          email: newEmail,
          first_name: newFirstName,
          status: newStatus,
          consent_documentation: newConsentDoc,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add subscriber")
      setAlert({ type: "success", message: `Subscriber ${newEmail} added successfully.` })
      setShowAddModal(false)
      setNewEmail("")
      setNewFirstName("")
      setNewConsentDoc("")
      fetchSubscribers()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCsv = () => {
    window.open(`/admin/newsletter-subscribers/export?status=${statusFilter}`, "_blank")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge color="green">Active</Badge>
      case "pending":
        return <Badge color="orange">Pending</Badge>
      case "unsubscribed":
        return <Badge color="grey">Unsubscribed</Badge>
      case "bounced":
        return <Badge color="red">Bounced</Badge>
      case "suppressed":
        return <Badge color="purple">Suppressed</Badge>
      default:
        return <Badge color="grey">{status}</Badge>
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className={`p-6 space-y-6 min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-gray-900"}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Envelope className="w-6 h-6 text-blue-600" />
            <Heading level="h1" className="text-2xl font-bold">
              Newsletter Subscribers
            </Heading>
          </div>
          <Text className="text-xs text-gray-500 mt-1">
            Manage email marketing subscribers, double opt-in verification records, and suppression lists.
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="small" onClick={handleExportCsv} className="flex items-center gap-1.5">
            <ArrowDownTray className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <Button variant="secondary" size="small" onClick={fetchSubscribers} className="flex items-center gap-1.5">
            <ArrowPath className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="small" onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 bg-blue-600 text-white">
            <Plus className="w-4 h-4" />
            <span>Add Subscriber</span>
          </Button>
          <AdminThemeToggle />
        </div>
      </div>

      {/* Alert Notification */}
      {alert && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
            alert.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <ExclamationCircle className="w-4 h-4 text-red-600" />}
            <span>{alert.message}</span>
          </div>
          <button type="button" onClick={() => setAlert(null)} className="text-gray-400 hover:text-gray-700">
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <Text className="text-xs text-gray-500 font-medium">Total Registered</Text>
          <Heading level="h2" className="text-2xl font-black mt-1">
            {stats.total.toLocaleString()}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <Text className="text-xs text-emerald-600 font-semibold">Active (Eligible)</Text>
          <Heading level="h2" className="text-2xl font-black text-emerald-600 mt-1">
            {stats.active.toLocaleString()}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <Text className="text-xs text-amber-600 font-semibold">Pending Confirmation</Text>
          <Heading level="h2" className="text-2xl font-black text-amber-600 mt-1">
            {stats.pending.toLocaleString()}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <Text className="text-xs text-gray-500 font-medium">Unsubscribed</Text>
          <Heading level="h2" className="text-2xl font-black text-gray-600 dark:text-slate-400 mt-1">
            {stats.unsubscribed.toLocaleString()}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 shadow-xs">
          <Text className="text-xs text-red-600 font-semibold">Bounced / Suppressed</Text>
          <Heading level="h2" className="text-2xl font-black text-red-600 mt-1">
            {(stats.bounced + stats.suppressed).toLocaleString()}
          </Heading>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { key: "all", label: `All (${stats.total})` },
            { key: "active", label: `Active (${stats.active})` },
            { key: "pending", label: `Pending (${stats.pending})` },
            { key: "unsubscribed", label: `Unsubscribed (${stats.unsubscribed})` },
            { key: "bounced", label: `Bounced (${stats.bounced})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key)
                setPage(1)
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="small">
            Search
          </Button>
        </form>
      </div>

      {/* Subscribers Table Container */}
      <Container className="p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Email & Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Consent Source</th>
                <th className="py-3 px-4">Verified Date</th>
                <th className="py-3 px-4">Last Sent</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <ArrowPath className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading subscriber records...</span>
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Envelope className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-bold text-sm">No subscribers found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or status filter.</p>
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 dark:text-white">{sub.email}</div>
                      {sub.first_name && <div className="text-[11px] text-gray-500">{sub.first_name}</div>}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-700 dark:text-slate-300">{sub.consent_source}</div>
                      <div className="text-[10px] text-gray-400">{new Date(sub.consent_timestamp).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      {sub.verified_at ? (
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{new Date(sub.verified_at).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-medium">Awaiting Confirmation</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {sub.last_email_sent_at ? (
                        <div>
                          <div>{new Date(sub.last_email_sent_at).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-400">{sub.emails_sent_count} emails</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Never</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(sub)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Details & Audit Log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {sub.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleInstantSubscribe(sub)}
                              disabled={submitting}
                              className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                              title="Directly activate and confirm subscription"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Subscribe</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResendVerification(sub)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                              title="Resend Verification Email"
                            >
                              <ArrowPath className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePending(sub)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                              title="Delete Pending Subscription"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {sub.status === "active" && (
                          <button
                            type="button"
                            onClick={() => handleOpenUnsubscribe(sub)}
                            disabled={submitting}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors flex items-center gap-1"
                            title="Unsubscribe Subscriber"
                          >
                            <XMark className="w-3.5 h-3.5" />
                            <span>Unsubscribe</span>
                          </button>
                        )}

                        {(sub.status === "unsubscribed" || sub.status === "bounced" || sub.status === "suppressed") && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInstantSubscribe(sub)}
                              disabled={submitting}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1"
                              title="1-Click Subscribe / Reactivate"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Subscribe</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReactivate(sub)}
                              className="px-2 py-1 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                              title="Reactivate with Custom Consent Record"
                            >
                              Consent...
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {subscribers.length} of {totalCount} subscribers
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="small"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Container>

      {/* Add Subscriber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <Heading level="h2" className="text-lg font-bold">
                Add Newsletter Subscriber
              </Heading>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="colleague@cpa-firm.com"
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">First Name (Optional)</label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                >
                  <option value="active">Active (Pre-verified / documented consent)</option>
                  <option value="pending">Pending (Send verification email first)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">
                  Documented Consent Basis * <span className="font-normal text-gray-400">(Required for compliance)</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newConsentDoc}
                  onChange={(e) => setNewConsentDoc(e.target.value)}
                  placeholder="e.g., Requested newsletter opt-in via customer support ticket #1234 or attendee webinar registration form."
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="small" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="small" disabled={submitting} className="bg-blue-600 text-white">
                  {submitting ? "Saving..." : "Add Subscriber"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unsubscribe Subscriber Modal */}
      {unsubscribeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <Heading level="h2" className="text-lg font-bold text-rose-600 flex items-center gap-2">
                <XMark className="w-5 h-5" />
                <span>Unsubscribe Subscriber</span>
              </Heading>
              <button
                type="button"
                onClick={() => setUnsubscribeTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to unsubscribe <strong>{unsubscribeTarget.email}</strong> from all marketing and webinar newsletters?
            </p>

            <form onSubmit={handleConfirmUnsubscribe} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">
                  Unsubscribe Reason / Audit Note
                </label>
                <input
                  type="text"
                  required
                  value={unsubscribeReason}
                  onChange={(e) => setUnsubscribeReason(e.target.value)}
                  placeholder="e.g. Unsubscribed by administrator upon customer request"
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                This recipient will be immediately moved to <strong>Unsubscribed</strong> status and suppressed from all outgoing marketing broadcasts until re-subscribed.
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setUnsubscribeTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {submitting ? "Unsubscribing..." : "Unsubscribe Now"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && selectedSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <Heading level="h2" className="text-lg font-bold text-amber-600 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                <span>Reactivate Subscriber</span>
              </Heading>
              <button type="button" onClick={() => setShowReactivateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
              <strong>{selectedSubscriber.email}</strong> is currently marked as <strong>Unsubscribed</strong>. Under CAN-SPAM and GDPR regulations, an unsubscribed recipient must NOT be re-added without explicit, documented fresh consent.
            </p>

            <form onSubmit={handleConfirmReactivate} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">
                  Documented Consent Record * (Minimum 10 characters)
                </label>
                <textarea
                  required
                  rows={4}
                  value={reactivateConsentDoc}
                  onChange={(e) => setReactivateConsentDoc(e.target.value)}
                  placeholder="e.g. Recipient requested resubscription via email ticket #9876 on 2026-10-23 after confirming they want webinar alerts."
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="small" onClick={() => setShowReactivateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="small" disabled={submitting || reactivateConsentDoc.length < 10} className="bg-amber-600 text-white">
                  {submitting ? "Reactivating..." : "Reactivate with Documented Consent"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subscriber Detail & Audit History Modal */}
      {showDetailModal && selectedSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="space-y-0.5">
                <Heading level="h2" className="text-lg font-bold">
                  Subscriber Details
                </Heading>
                <Text className="text-xs text-gray-500 font-mono">{selectedSubscriber.email}</Text>
              </div>
              <button type="button" onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* Properties Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700">
                <div>
                  <span className="text-gray-400">Current Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedSubscriber.status)}</div>
                </div>
                <div>
                  <span className="text-gray-400">First Name:</span>
                  <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {selectedSubscriber.first_name || "—"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Consent Source:</span>
                  <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {selectedSubscriber.consent_source}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Initial Subscription Date:</span>
                  <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {new Date(selectedSubscriber.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Verified Timestamp:</span>
                  <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {selectedSubscriber.verified_at ? new Date(selectedSubscriber.verified_at).toLocaleString() : "Pending"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Unsubscribe Reason:</span>
                  <div className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {selectedSubscriber.unsubscribe_reason || "—"}
                  </div>
                </div>
              </div>

              {/* Audit History Timeline */}
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Audit & Consent History Log</span>
                </h3>

                {subscriberLogs.length === 0 ? (
                  <p className="text-gray-400 text-xs italic">No detailed audit events recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {subscriberLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between gap-3 text-[11px]"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-blue-600 dark:text-blue-400">{log.action}</div>
                          <div className="text-gray-500">
                            Actor: <span className="font-medium text-gray-700 dark:text-slate-300">{log.actor}</span>
                            {log.ip_address && ` • IP: ${log.ip_address}`}
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <pre className="mt-1 p-2 rounded-lg bg-gray-50 dark:bg-slate-800/80 font-mono text-[10px] text-gray-600 dark:text-slate-400 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                        <span className="text-gray-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end shrink-0">
              <Button variant="secondary" size="small" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
