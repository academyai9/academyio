import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Newspaper,
  Plus,
  ArrowPath,
  CheckCircle,
  XMark,
  Trash,
  InformationCircle,
  ExclamationCircle,
  Envelope,
  Eye,
  UserGroup,
  Sparkles,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Newsletter Campaigns",
  icon: Newspaper,
  rank: 66,
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

interface Campaign {
  id: string
  title: string
  subject: string
  preview_text: string | null
  content_html: string
  content_text: string
  sender_name: string | null
  sender_email: string | null
  reply_to: string | null
  status: "draft" | "sending" | "sent" | "cancelled"
  target_audience: string
  total_recipients: number
  successful_sends: number
  failed_sends: number
  sent_at: string | null
  created_at: string
}

interface CampaignStats {
  total: number
  sent: number
  draft: number
  activeSubscribersCount: number
}

export default function NewsletterCampaignsPage() {
  const { isDark } = useAdminTheme()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<CampaignStats>({
    total: 0,
    sent: 0,
    draft: 0,
    activeSubscribersCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)

  // Form
  const [newTitle, setNewTitle] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [newPreviewText, setNewPreviewText] = useState("")
  const [newContentHtml, setNewContentHtml] = useState(
    `<h2 style="color: #0f172a; margin-bottom: 16px;">Upcoming CPE Webinars & Regulatory Updates</h2>\n<p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello,</p>\n<p style="color: #475569; font-size: 14px; line-height: 1.6;">We are pleased to announce our latest continuing education webinars for accounting and finance professionals.</p>\n<p><a href="https://www.academyio.com/us/webinars" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">View Scheduled Courses</a></p>`
  )
  const [testEmailRecipient, setTestEmailRecipient] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/newsletter-campaigns", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load campaigns")
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      if (data.stats) setStats(data.stats)
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/admin/newsletter-campaigns", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          title: newTitle,
          subject: newSubject,
          preview_text: newPreviewText,
          content_html: newContentHtml,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create campaign")
      setAlert({ type: "success", message: "Campaign created as draft." })
      setShowCreateModal(false)
      setNewTitle("")
      setNewSubject("")
      setNewPreviewText("")
      fetchCampaigns()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenSendTest = (cmp: Campaign) => {
    setSelectedCampaign(cmp)
    setTestEmailRecipient("")
    setShowTestModal(true)
  }

  const handleSendTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaign) return
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/newsletter-campaigns/${selectedCampaign.id}/send-test`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ test_recipient: testEmailRecipient }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send test email")
      setAlert({ type: "success", message: `Test email dispatched to ${testEmailRecipient}.` })
      setShowTestModal(false)
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenSendLive = (cmp: Campaign) => {
    setSelectedCampaign(cmp)
    setShowSendModal(true)
  }

  const handleConfirmSendLive = async () => {
    if (!selectedCampaign) return
    setSubmitting(true)
    try {
      const res = await fetch(`/admin/newsletter-campaigns/${selectedCampaign.id}/send`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to dispatch campaign")
      setAlert({ type: "success", message: data.message || "Campaign sent to active subscribers." })
      setShowSendModal(false)
      fetchCampaigns()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCampaign = async (cmp: Campaign) => {
    if (!confirm(`Are you sure you want to delete campaign "${cmp.title}"?`)) return
    try {
      const res = await fetch(`/admin/newsletter-campaigns/${cmp.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete campaign")
      setAlert({ type: "success", message: "Campaign deleted." })
      fetchCampaigns()
    } catch (err: any) {
      setAlert({ type: "error", message: err.message })
    }
  }

  return (
    <div className={`p-6 space-y-6 min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-gray-50 text-gray-900"}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-blue-600" />
            <Heading level="h1" className="text-2xl font-bold">
              Newsletter Campaigns
            </Heading>
          </div>
          <Text className="text-xs text-gray-500 mt-1">
            Compose and broadcast email briefings and webinar announcements to verified active subscribers.
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="small" onClick={fetchCampaigns} className="flex items-center gap-1.5">
            <ArrowPath className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign</span>
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs">
          <Text className="text-xs text-gray-500 font-medium">Total Campaigns</Text>
          <Heading level="h2" className="text-2xl font-black mt-1">
            {stats.total}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
          <Text className="text-xs text-emerald-600 font-semibold">Broadcasts Sent</Text>
          <Heading level="h2" className="text-2xl font-black text-emerald-600 mt-1">
            {stats.sent}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <Text className="text-xs text-amber-600 font-semibold">Drafts</Text>
          <Heading level="h2" className="text-2xl font-black text-amber-600 mt-1">
            {stats.draft}
          </Heading>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-xs">
          <Text className="text-xs text-blue-600 font-semibold">Active Eligible Audience</Text>
          <Heading level="h2" className="text-2xl font-black text-blue-600 mt-1">
            {stats.activeSubscribersCount.toLocaleString()}
          </Heading>
        </div>
      </div>

      {/* Campaigns Table */}
      <Container className="p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Campaign Title & Subject</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Recipients</th>
                <th className="py-3 px-4">Sent Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <ArrowPath className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading campaigns...</span>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <Newspaper className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-bold text-sm">No campaigns yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click "Create Campaign" to compose your first newsletter.</p>
                  </td>
                </tr>
              ) : (
                campaigns.map((cmp) => (
                  <tr key={cmp.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{cmp.title}</div>
                      <div className="text-gray-500 text-xs mt-0.5">Subject: {cmp.subject}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {cmp.status === "sent" ? (
                        <Badge color="green">Sent</Badge>
                      ) : cmp.status === "sending" ? (
                        <Badge color="orange">Sending...</Badge>
                      ) : (
                        <Badge color="grey">Draft</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {cmp.status === "sent" ? (
                        <div>
                          <span className="font-bold text-emerald-600">{cmp.successful_sends} sent</span>
                          {cmp.failed_sends > 0 && (
                            <span className="text-red-500 ml-1">({cmp.failed_sends} failed)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Target: {stats.activeSubscribersCount} active</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {cmp.sent_at ? new Date(cmp.sent_at).toLocaleString() : "Not sent yet"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleOpenSendTest(cmp)}
                          className="text-xs"
                        >
                          Send Test
                        </Button>

                        {cmp.status === "draft" && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleOpenSendLive(cmp)}
                            className="bg-blue-600 text-white text-xs"
                          >
                            Send to All Active
                          </Button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(cmp)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Delete Campaign"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Container>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 shrink-0">
              <Heading level="h2" className="text-lg font-bold">
                Create Newsletter Campaign
              </Heading>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Campaign Title (Internal Reference) *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., October 2026 CPA Tax Briefing"
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Email Subject Line *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Critical 2026 Corporate Tax Filing Changes & Upcoming Accredited Webinars"
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Preheader / Preview Text</label>
                <input
                  type="text"
                  value={newPreviewText}
                  onChange={(e) => setNewPreviewText(e.target.value)}
                  placeholder="Earn 2 CPE Credits on new pass-through entity deduction rules..."
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 dark:text-slate-300">Email HTML Content *</label>
                  <span className="text-[11px] text-gray-400">Unsubscribe link & footer are automatically appended</span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={newContentHtml}
                  onChange={(e) => setNewContentHtml(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <Button type="button" variant="secondary" size="small" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="small" disabled={submitting} className="bg-blue-600 text-white">
                  {submitting ? "Saving..." : "Save Campaign Draft"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Test Modal */}
      {showTestModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <Heading level="h2" className="text-base font-bold flex items-center gap-2">
                <Envelope className="w-4 h-4 text-blue-600" />
                <span>Send Test Email</span>
              </Heading>
              <button type="button" onClick={() => setShowTestModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendTestSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-gray-700 dark:text-slate-300">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="admin@academyio.com"
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="small" onClick={() => setShowTestModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="small" disabled={submitting} className="bg-blue-600 text-white">
                  {submitting ? "Sending..." : "Send Test"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send to All Active Confirmation Modal */}
      {showSendModal && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <Heading level="h2" className="text-base font-bold text-blue-600 flex items-center gap-2">
                <Envelope className="w-4 h-4" />
                <span>Confirm Live Campaign Broadcast</span>
              </Heading>
              <button type="button" onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300">
              <p>
                You are about to broadcast <strong>"{selectedCampaign.title}"</strong> to:
              </p>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-900 font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <UserGroup className="w-4 h-4" />
                <span>{stats.activeSubscribersCount.toLocaleString()} Confirmed Active Subscribers</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Pending, unsubscribed, bounced, and suppressed contacts will be strictly excluded. Each message will contain an individualized, secure one-click unsubscribe link.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="small" onClick={() => setShowSendModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="small"
                disabled={submitting || stats.activeSubscribersCount === 0}
                onClick={handleConfirmSendLive}
                className="bg-blue-600 text-white font-bold"
              >
                {submitting ? "Broadcasting..." : "Yes, Broadcast Campaign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
