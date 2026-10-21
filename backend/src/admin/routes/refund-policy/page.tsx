import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  DocumentText,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  Sparkles,
  Eye,
  PencilSquare,
  ArrowUturnLeft,
  ShieldCheck,
  InformationCircle,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"
import { PolicyPageData, PolicySection, SummaryRule, DEFAULT_REFUND_POLICY } from "../../../utils/policy-default"

export const config = defineRouteConfig({
  label: "Refund Policy",
  icon: DocumentText,
  rank: 71,
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

export default function RefundPolicyAdminPage() {
  const { isDark } = useAdminTheme()
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "versions">("edit")
  const [policy, setPolicy] = useState<PolicyPageData>(DEFAULT_REFUND_POLICY)
  const [versions, setVersions] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Editable form state
  const [title, setTitle] = useState(DEFAULT_REFUND_POLICY.title)
  const [subtitle, setSubtitle] = useState(DEFAULT_REFUND_POLICY.subtitle)
  const [supportEmail, setSupportEmail] = useState(DEFAULT_REFUND_POLICY.support_email)
  const [effectiveDate, setEffectiveDate] = useState(DEFAULT_REFUND_POLICY.effective_date)
  const [sections, setSections] = useState<PolicySection[]>(DEFAULT_REFUND_POLICY.sections)
  const [summaryRules, setSummaryRules] = useState<SummaryRule[]>(DEFAULT_REFUND_POLICY.summary_rules)

  const fetchPolicy = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/pages/refund-policy", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load refund policy")
      const data = await res.json()
      if (data.page) {
        setPolicy(data.page)
        setTitle(data.page.title)
        setSubtitle(data.page.subtitle)
        setSupportEmail(data.page.support_email)
        setEffectiveDate(data.page.effective_date)
        setSections(data.page.sections || DEFAULT_REFUND_POLICY.sections)
        setSummaryRules(data.page.summary_rules || DEFAULT_REFUND_POLICY.summary_rules)
      }
      if (data.versions) {
        setVersions(data.versions)
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load policy" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicy()
  }, [])

  const handlePublish = async () => {
    setSaving(true)
    setStatusMessage(null)
    try {
      const payload: Partial<PolicyPageData> = {
        title,
        subtitle,
        support_email: supportEmail,
        effective_date: effectiveDate,
        sections,
        summary_rules: summaryRules,
        is_published: true,
      }

      const res = await fetch("/admin/pages/refund-policy", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to publish refund policy")
      }

      const data = await res.json()
      setStatusMessage({ type: "success", text: "Refund Policy published successfully to storefront!" })
      if (data.page) {
        setPolicy(data.page)
      }
      await fetchPolicy()
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to publish" })
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!confirm(`Are you sure you want to restore Version ${versionNumber}?`)) return
    setLoading(true)
    setStatusMessage(null)
    try {
      const res = await fetch("/admin/pages/refund-policy/restore", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ version: versionNumber }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to restore version")
      }

      const data = await res.json()
      setStatusMessage({ type: "success", text: data.message })
      await fetchPolicy()
      setActiveTab("edit")
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Restore failed" })
    } finally {
      setLoading(false)
    }
  }

  const handleResetToDefault = () => {
    if (!confirm("Reset all fields to AcademyIO standard default text?")) return
    setTitle(DEFAULT_REFUND_POLICY.title)
    setSubtitle(DEFAULT_REFUND_POLICY.subtitle)
    setSupportEmail(DEFAULT_REFUND_POLICY.support_email)
    setEffectiveDate(DEFAULT_REFUND_POLICY.effective_date)
    setSections(DEFAULT_REFUND_POLICY.sections)
    setSummaryRules(DEFAULT_REFUND_POLICY.summary_rules)
    setStatusMessage({ type: "success", text: "Reset to AcademyIO official default. Click 'Publish Changes' to apply." })
  }

  const updateSectionContent = (index: number, contentIdx: number, val: string) => {
    const updated = [...sections]
    updated[index].content[contentIdx] = val
    setSections(updated)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Storefront Compliance & Legal CMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Refund Policy Management
            <Badge color="green" size="small" className="font-mono text-[10px] tracking-wider uppercase">
              Live v{policy.version}
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Control the official cancellation deadlines, credit-note conditions, refund timelines, and support contacts published at <code className="text-blue-600 dark:text-blue-400 font-mono">/refund-policy</code>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="small"
            onClick={fetchPolicy}
            disabled={loading || saving}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {saving ? "Publishing..." : "Publish Changes"}
          </Button>

          <AdminThemeToggle />
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <XMark className="w-4 h-4 cursor-pointer opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Metrics & Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border shadow-xs ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Version</span>
            <Sparkles className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">Version {policy.version}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active on Storefront</p>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Support Email</span>
            <DocumentText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">{supportEmail}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Customer contact routing</p>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Effective Date</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{effectiveDate}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Stated legal date</p>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Version History</span>
            <ArrowUturnLeft className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{versions.length} Snapshots</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Rollback checkpoints</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "edit"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <PencilSquare className="w-4 h-4" />
          <span>Edit Policy Content</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "preview"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Live Storefront Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("versions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "versions"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Version History ({versions.length})</span>
        </button>

        <div className="ml-auto">
          <Button
            variant="secondary"
            size="small"
            onClick={handleResetToDefault}
            className="text-[11px] font-semibold text-slate-600 dark:text-slate-300"
          >
            Reset to Standard Copy
          </Button>
        </div>
      </div>

      {/* TAB 1: EDIT CONTENT */}
      {activeTab === "edit" && (
        <div className="space-y-6">
          {/* General Metadata Box */}
          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} space-y-4`}>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <InformationCircle className="w-4 h-4 text-blue-500" />
              <span>Page Header & Support Configuration</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Page Title (H1)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Support Email Address
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Effective Date Display
                </label>
                <input
                  type="text"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Introductory Overview
              </label>
              <textarea
                rows={3}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Policy Sections Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DocumentText className="w-4 h-4 text-blue-500" />
                <span>Numbered Policy Sections (1 to 10)</span>
              </h2>
              <span className="text-xs text-slate-400">AcademyIO Official Education Copy</span>
            </div>

            {sections.map((section, sIdx) => (
              <div
                key={section.id}
                className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                } space-y-3`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                      {section.number}
                    </span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => {
                        const updated = [...sections]
                        updated[sIdx].title = e.target.value
                        setSections(updated)
                      }}
                      className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:border-blue-500 px-1 py-0.5"
                    />
                  </div>
                  {section.subtitle && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      {section.subtitle}
                    </span>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {section.content.map((pText, pIdx) => (
                    <div key={pIdx}>
                      <textarea
                        rows={2}
                        value={pText}
                        onChange={(e) => updateSectionContent(sIdx, pIdx, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                      />
                    </div>
                  ))}

                  {section.items && (
                    <div className="mt-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-1">
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                        Required Information Checklist
                      </span>
                      {section.items.map((item, iIdx) => (
                        <div key={iIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Save Bar */}
          <div className="sticky bottom-4 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between border border-slate-800">
            <div>
              <p className="font-bold text-xs">Ready to publish updates?</p>
              <p className="text-[11px] text-slate-400">
                Changes will immediately update the customer-facing Refund Policy page.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="small"
                onClick={handlePublish}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl"
              >
                {saving ? "Publishing..." : "Publish & Save Version"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE PREVIEW */}
      {activeTab === "preview" && (
        <div className={`p-8 rounded-3xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"} shadow-md space-y-8 max-w-4xl mx-auto`}>
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Customer Assurance & Learning Guarantee</span>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{title}</h1>
            <p className="text-xs text-slate-400 mt-1">Effective Date: {effectiveDate} | Version {policy.version}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">{subtitle}</p>
          </div>

          {/* Summary Table Preview */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white">
              Summary of Key Cancellation & Refund Terms
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {summaryRules.map((r, i) => (
                <div key={i} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="font-semibold text-slate-900 dark:text-white">{r.situation}</div>
                  <div className="text-slate-600 dark:text-slate-300">{r.resolution}</div>
                  <div className="text-blue-600 dark:text-blue-400 font-mono text-[11px]">{r.timeline}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sections Preview */}
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {sections.map((sec) => (
              <div key={sec.id} className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{sec.number}. {sec.title}</span>
                </h2>
                {sec.subtitle && (
                  <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {sec.subtitle}
                  </h3>
                )}
                {sec.content.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
                {sec.items && (
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {sec.items.map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                )}
                {sec.followup && <p className="text-xs font-medium text-slate-600 dark:text-slate-400 pt-1">{sec.followup}</p>}
              </div>
            ))}
          </div>

          {/* Support Link */}
          <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-center space-y-2">
            <h3 className="font-bold text-sm text-blue-900 dark:text-blue-200">Have Questions Regarding This Policy?</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Our dedicated education support team is available to assist you with session changes, credit note applications, or access verification.
            </p>
            <div className="pt-2">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all"
              >
                Email AcademyIO Support ({supportEmail})
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VERSION HISTORY */}
      {activeTab === "versions" && (
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} space-y-4`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Audit Trail & Rollback Versions</h2>
              <p className="text-xs text-slate-400">Previous published versions of the AcademyIO Refund Policy</p>
            </div>
            <Badge color="blue" size="small">{versions.length} Snapshots Saved</Badge>
          </div>

          {versions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No previous versions recorded yet. As you edit and publish changes, snapshots will be captured here automatically.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {versions.map((ver) => (
                <div key={ver.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Version {ver.version}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • {new Date(ver.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Contact: {ver.support_email} • Saved by: {ver.saved_by || "Admin"}
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleRestoreVersion(ver.version)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5"
                    >
                      <ArrowUturnLeft className="w-3.5 h-3.5" />
                      Restore Version {ver.version}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
