import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ShieldCheck,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  Sparkles,
  Eye,
  PencilSquare,
  ArrowUturnLeft,
  InformationCircle,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"
import { PrivacyPageData, PrivacySection, DEFAULT_PRIVACY_POLICY } from "../../../utils/privacy-default"

export const config = defineRouteConfig({
  label: "Privacy Policy",
  icon: ShieldCheck,
  rank: 70,
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

export default function PrivacyPolicyAdminPage() {
  const { isDark } = useAdminTheme()
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "versions">("edit")
  const [policy, setPolicy] = useState<PrivacyPageData>(DEFAULT_PRIVACY_POLICY)
  const [versions, setVersions] = useState<Array<any>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Editable form state
  const [title, setTitle] = useState(DEFAULT_PRIVACY_POLICY.title)
  const [subtitle, setSubtitle] = useState(DEFAULT_PRIVACY_POLICY.subtitle)
  const [supportEmail, setSupportEmail] = useState(DEFAULT_PRIVACY_POLICY.support_email)
  const [effectiveDate, setEffectiveDate] = useState(DEFAULT_PRIVACY_POLICY.effective_date)
  const [sections, setSections] = useState<PrivacySection[]>(DEFAULT_PRIVACY_POLICY.sections)

  const fetchPolicy = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/pages/privacy-policy", { credentials: "include", headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        if (data.page) {
          setPolicy(data.page)
          setTitle(data.page.title)
          setSubtitle(data.page.subtitle || "")
          setSupportEmail(data.page.support_email)
          setEffectiveDate(data.page.effective_date)
          setSections(data.page.sections || [])
          setVersions(data.versions || [])
        }
      }
    } catch (err: any) {
      console.error("Failed to load privacy policy:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicy()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setStatusMessage(null)
    try {
      const res = await fetch("/admin/pages/privacy-policy", {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          title,
          subtitle,
          support_email: supportEmail,
          effective_date: effectiveDate,
          sections,
          summary_rules: [],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPolicy(data.page)
        setStatusMessage({ type: "success", text: "Privacy policy updated and published successfully." })
        fetchPolicy()
      } else {
        const err = await res.json()
        setStatusMessage({ type: "error", text: err.message || "Failed to save privacy policy." })
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Network error while saving." })
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = () => {
    if (confirm("Reset privacy policy to official October 14, 2026 standard? Unsaved edits will be lost.")) {
      setTitle(DEFAULT_PRIVACY_POLICY.title)
      setSubtitle(DEFAULT_PRIVACY_POLICY.subtitle)
      setSupportEmail(DEFAULT_PRIVACY_POLICY.support_email)
      setEffectiveDate(DEFAULT_PRIVACY_POLICY.effective_date)
      setSections(DEFAULT_PRIVACY_POLICY.sections)
    }
  }

  return (
    <div className={`min-h-screen p-6 transition-colors duration-200 ${isDark ? "bg-[#0f172a] text-slate-100" : "bg-gray-50 text-gray-900"}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <Heading level="h1" className="text-2xl font-bold tracking-tight">
              Privacy Policy Management
            </Heading>
            <Badge color="green" size="small">
              Version {policy.version || 1}
            </Badge>
          </div>
          <Text className="text-xs text-gray-500 dark:text-slate-400">
            Configure, edit, and publish the official legal Privacy Policy for AcademyIO storefront.
          </Text>
        </div>

        <div className="flex items-center gap-2.5">
          <AdminThemeToggle />
          <Button
            variant="secondary"
            size="small"
            onClick={fetchPolicy}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {saving ? "Publishing..." : "Publish Changes"}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl mb-6 text-xs flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
            <XMark className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("edit")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === "edit"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <PencilSquare className="w-3.5 h-3.5" />
          Edit Policy ({sections.length} Sections)
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === "preview"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Storefront Live Preview
        </button>
        <button
          onClick={() => setActiveTab("versions")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all ${
            activeTab === "versions"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Audit & Version History ({versions.length})
        </button>
      </div>

      {/* EDIT TAB */}
      {activeTab === "edit" && (
        <div className="space-y-6 max-w-5xl">
          {/* Metadata Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                General Policy Information
              </span>
              <Button variant="secondary" size="small" onClick={handleResetToDefault} className="text-xs">
                Reset to Standard October 14, 2026
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Policy Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Effective / Last Updated Date</label>
                <Input value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Official Support Email</label>
                <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-xs">Preamble & Subtitle</label>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Policy Sections ({sections.length})
              </span>
            </div>

            {sections.map((sec, sIdx) => (
              <div
                key={sec.id || sIdx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                      {sec.number}
                    </span>
                    <h3 className="text-sm font-bold">{sec.title}</h3>
                  </div>
                </div>

                {sec.intro && (
                  <p className="text-xs text-gray-600 dark:text-slate-400 italic">
                    {sec.intro}
                  </p>
                )}

                {sec.items && sec.items.length > 0 && (
                  <ul className="space-y-1 pl-4 text-xs list-disc text-gray-600 dark:text-slate-400">
                    {sec.items.map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                )}

                {sec.content && (
                  <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                    {sec.content.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {activeTab === "preview" && (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm max-w-4xl space-y-6">
          <div className="border-b border-gray-100 dark:border-slate-800 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Live Storefront Preview
            </span>
            <h1 className="text-2xl font-black mt-1">{title}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Last Updated: {effectiveDate} • Support: {supportEmail}
            </p>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-3 leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="space-y-8 text-xs leading-relaxed">
            {sections.map((sec) => (
              <div key={sec.id} className="space-y-2">
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  {sec.number}. {sec.title}
                </h2>
                {sec.intro && <p className="text-gray-700 dark:text-slate-300 font-medium">{sec.intro}</p>}
                {sec.items && (
                  <ul className="space-y-1 pl-4 list-disc text-gray-600 dark:text-slate-400">
                    {sec.items.map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                )}
                {sec.content && (
                  <div className="space-y-2 text-gray-700 dark:text-slate-300">
                    {sec.content.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VERSIONS TAB */}
      {activeTab === "versions" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm max-w-4xl space-y-4">
          <Heading level="h3" className="text-sm font-bold">
            Policy Audit Trail & Version Snapshots
          </Heading>
          {versions.length === 0 ? (
            <p className="text-xs text-gray-500">No previous version history recorded yet. Edits will generate snapshots.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
              {versions.map((ver) => (
                <div key={ver.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Version {ver.version}</span>
                    <span className="text-gray-500 ml-2">Saved on {new Date(ver.created_at).toLocaleString()}</span>
                  </div>
                  <Badge color="blue" size="small">Snapshot</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
