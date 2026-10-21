import React, { useState, useEffect, useMemo } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Code,
  Plus,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Trash,
  MagnifyingGlass,
  InformationCircle,
  ExclamationCircle,
  ShieldCheck,
  Eye,
  CogSixTooth,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../../components/theme"

export const config = defineRouteConfig({
  label: "Frontend Tracking Codes",
  icon: Code,
  rank: 85,
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

export interface TrackingCodeItem {
  id: string
  name: string
  type: string
  tracking_id: string | null
  custom_code: string | null
  placement: "head" | "body_start" | "body_end"
  target_pages: "all" | "homepage" | "webinars" | "subscriptions" | "checkout" | "custom"
  target_paths: string[] | null
  is_enabled: boolean
  description: string | null
  created_by?: string
  last_updated_by?: string
  created_at: string
  updated_at: string
}

export interface TrackingStats {
  total: number
  enabled_count: number
  disabled_count: number
  ga4_count: number
  gtm_count: number
  meta_count: number
  custom_count: number
}

const CODE_TYPES = [
  { value: "ga4", label: "Google Analytics 4 (GA4)", prefix: "G-XXXXXXXXXX", hint: "Measurement ID starting with G-" },
  { value: "gtm", label: "Google Tag Manager (GTM)", prefix: "GTM-XXXXXXX", hint: "Container ID starting with GTM-" },
  { value: "meta_pixel", label: "Meta (Facebook) Pixel", prefix: "123456789012345", hint: "10 to 16 digit numeric Pixel ID" },
  { value: "clarity", label: "Microsoft Clarity", prefix: "abcde12345", hint: "Clarity project ID" },
  { value: "linkedin", label: "LinkedIn Insight Tag", prefix: "1234567", hint: "Partner / Tag ID (numeric)" },
  { value: "gsc", label: "Google Search Console", prefix: "google-site-verification=...", hint: "Verification meta content or token" },
  { value: "bing", label: "Bing Webmaster Verification", prefix: "bing-token-123", hint: "Bing verification meta token" },
  { value: "pinterest", label: "Pinterest Tag", prefix: "123456789", hint: "Pinterest tag advertiser ID" },
  { value: "tiktok", label: "TikTok Pixel", prefix: "CXXXXXXXXXXXXXXXXX", hint: "TikTok Pixel ID" },
  { value: "hotjar", label: "Hotjar Site ID", prefix: "1234567", hint: "Hotjar numerical site ID" },
  { value: "custom", label: "Custom HTML / JavaScript", prefix: "", hint: "Custom tracking snippet with frontend security sandbox" },
]

export default function FrontendTrackingCodesAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [items, setItems] = useState<TrackingCodeItem[]>([])
  const [stats, setStats] = useState<TrackingStats>({
    total: 0,
    enabled_count: 0,
    disabled_count: 0,
    ga4_count: 0,
    gtm_count: 0,
    meta_count: 0,
    custom_count: 0,
  })
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all")
  const [placementFilter, setPlacementFilter] = useState("all")

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TrackingCodeItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteItem, setDeleteItem] = useState<TrackingCodeItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Test Validation Modal
  const [testValidationResult, setTestValidationResult] = useState<{
    valid: boolean
    message?: string
    error?: string
    target_pages_summary?: string
    placement_summary?: string
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  interface TrackingFormData {
    name: string
    type: string
    tracking_id: string
    custom_code: string
    placement: "head" | "body_start" | "body_end"
    target_pages: "all" | "homepage" | "webinars" | "subscriptions" | "checkout" | "custom"
    target_paths: string
    is_enabled: boolean
    description: string
  }

  // Form State
  const initialForm: TrackingFormData = {
    name: "",
    type: "ga4",
    tracking_id: "",
    custom_code: "",
    placement: "head",
    target_pages: "all",
    target_paths: "",
    is_enabled: true,
    description: "",
  }
  const [formData, setFormData] = useState<TrackingFormData>(initialForm)

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/tracking-codes", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load tracking codes")
      const data = await res.json()
      setItems(data.tracking_codes || [])
      if (data.stats) setStats(data.stats)
    } catch (e: any) {
      notify("error", e.message || "Failed to load tracking codes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData(initialForm)
    setTestValidationResult(null)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item: TrackingCodeItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      type: item.type,
      tracking_id: item.tracking_id || "",
      custom_code: item.custom_code || "",
      placement: item.placement || "head",
      target_pages: item.target_pages || "all",
      target_paths: item.target_paths ? item.target_paths.join(", ") : "",
      is_enabled: item.is_enabled,
      description: item.description || "",
    })
    setTestValidationResult(null)
    setIsModalOpen(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      notify("error", "Code Name is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingItem ? `/admin/tracking-codes/${editingItem.id}` : "/admin/tracking-codes"
      const method = editingItem ? "PUT" : "POST"

      const pathsArray = formData.target_paths
        ? formData.target_paths
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : []

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        tracking_id: formData.tracking_id.trim() || null,
        custom_code: formData.type === "custom" ? formData.custom_code.trim() : null,
        placement: formData.placement,
        target_pages: formData.target_pages,
        target_paths: pathsArray,
        is_enabled: formData.is_enabled,
        description: formData.description.trim() || null,
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to save tracking code configuration")
      }

      notify(
        "success",
        editingItem ? `Tracking code "${formData.name}" updated successfully.` : `Tracking code "${formData.name}" created successfully.`
      )
      setIsModalOpen(false)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message || "Error saving tracking code")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Enabled Status
  const handleToggleStatus = async (item: TrackingCodeItem) => {
    try {
      const res = await fetch(`/admin/tracking-codes/${item.id}/toggle`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to toggle status")
      const data = await res.json()
      notify("success", data.message || `Tracking code status updated.`)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message || "Failed to update tracking code status")
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteItem) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/admin/tracking-codes/${deleteItem.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete tracking code")
      notify("success", `Tracking code "${deleteItem.name}" deleted successfully.`)
      setDeleteItem(null)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message || "Failed to delete tracking code")
    } finally {
      setIsDeleting(false)
    }
  }

  // Test Configuration Action
  const handleTestConfiguration = async () => {
    setIsTesting(true)
    setTestValidationResult(null)
    try {
      const res = await fetch("/admin/tracking-codes/test-validation", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          name: formData.name || "Test Integration",
          type: formData.type,
          tracking_id: formData.tracking_id,
          custom_code: formData.custom_code,
          placement: formData.placement,
          target_pages: formData.target_pages,
        }),
      })
      const result = await res.json()
      setTestValidationResult(result)
    } catch (e: any) {
      setTestValidationResult({
        valid: false,
        error: e.message || "Validation test failed",
      })
    } finally {
      setIsTesting(false)
    }
  }

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tracking_id && item.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchSearch) return false

      if (typeFilter !== "all" && item.type !== typeFilter) return false
      if (statusFilter === "enabled" && !item.is_enabled) return false
      if (statusFilter === "disabled" && item.is_enabled) return false
      if (placementFilter !== "all" && item.placement !== placementFilter) return false

      return true
    })
  }, [items, searchQuery, typeFilter, statusFilter, placementFilter])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ga4":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">GA4</span>
      case "gtm":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">GTM</span>
      case "meta_pixel":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Meta Pixel</span>
      case "clarity":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800">MS Clarity</span>
      case "linkedin":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">LinkedIn</span>
      case "gsc":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Search Console</span>
      case "bing":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">Bing Webmaster</span>
      case "custom":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Custom Snippet</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700">{type}</span>
    }
  }

  const getPlacementLabel = (placement: string) => {
    switch (placement) {
      case "head":
        return "<head>"
      case "body_start":
        return "<body> Start"
      case "body_end":
        return "<body> End"
      default:
        return placement
    }
  }

  const getTargetPagesLabel = (target: string) => {
    switch (target) {
      case "all":
        return "All Pages"
      case "homepage":
        return "Homepage Only"
      case "webinars":
        return "Webinars (/webinars*)"
      case "subscriptions":
        return "Subscriptions (/subscriptions*)"
      case "checkout":
        return "Checkout (/checkout*)"
      case "custom":
        return "Custom Paths"
      default:
        return target
    }
  }

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h1" className="text-2xl font-bold">
                  Frontend Tracking Codes & Analytics
                </Heading>
                <Badge color="purple" size="small">
                  Settings
                </Badge>
                <Badge color={stats.enabled_count > 0 ? "green" : "grey"} size="small">
                  {stats.enabled_count} Active
                </Badge>
              </div>
              <Text className="text-ui-fg-subtle text-xs mt-0.5">
                Manage Google Analytics 4, GTM, Meta Pixel, Microsoft Clarity, LinkedIn Insight, search console verifications, and custom tracking scripts.
              </Text>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <Button
            variant="secondary"
            onClick={fetchItems}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Tracking Code</span>
          </Button>
        </div>
      </div>

      {/* Cross Navigation Bar under Settings */}
      <div className="flex items-center gap-2 border-b border-ui-border-base pb-3 text-xs font-semibold overflow-x-auto">
        <span className="text-blue-600 border-b-2 border-blue-600 pb-2 px-3">
          Frontend Tracking Codes ({items.length})
        </span>
        <a
          href="/webapp/contact-info"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Company Address & Contact
        </a>
        <a
          href="/webapp/payment-methods"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Payment Gateways
        </a>
        <a
          href="/webapp/promotions"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Promotions & Banners
        </a>
        <a
          href="/webapp/social-media"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Social Media
        </a>
      </div>

      {/* Security & Strict Frontend Isolation Notice */}
      <div className="rounded-2xl border border-ui-border-base p-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-purple-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-0.5 text-xs">
          <span className="font-bold text-ui-fg-base block">
            Guaranteed Frontend-Only Execution Architecture
          </span>
          <p className="text-ui-fg-subtle leading-relaxed">
            All configured analytics, pixels, and tracking tags run exclusively on the customer storefront (port 8000). They are <strong>strictly quarantined</strong> and will never execute inside this administrative dashboard, admin login page, or internal Medusa backend APIs.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ui-border-base p-4 bg-ui-bg-base shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-ui-fg-subtle">Total Configured</span>
          <p className="text-xl font-bold text-ui-fg-base">{stats.total}</p>
          <span className="text-[10px] text-ui-fg-muted block">All integrations</span>
        </div>

        <div className="rounded-2xl border border-ui-border-base p-4 bg-ui-bg-base shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600">Active on Storefront</span>
          <p className="text-xl font-bold text-emerald-600">{stats.enabled_count}</p>
          <span className="text-[10px] text-ui-fg-muted block">Currently tracking</span>
        </div>

        <div className="rounded-2xl border border-ui-border-base p-4 bg-ui-bg-base shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-blue-600">Google Tags (GA4 / GTM)</span>
          <p className="text-xl font-bold text-blue-600">{stats.ga4_count + stats.gtm_count}</p>
          <span className="text-[10px] text-ui-fg-muted block">Official measurement</span>
        </div>

        <div className="rounded-2xl border border-ui-border-base p-4 bg-ui-bg-base shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-purple-600">Custom Snippets</span>
          <p className="text-xl font-bold text-purple-600">{stats.custom_count}</p>
          <span className="text-[10px] text-ui-fg-muted block">Sandboxed HTML/JS</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-subtle" />
          <input
            type="text"
            placeholder="Search by code name, tracking ID, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Integration Types</option>
            <option value="ga4">Google Analytics 4</option>
            <option value="gtm">Google Tag Manager</option>
            <option value="meta_pixel">Meta Pixel</option>
            <option value="clarity">Microsoft Clarity</option>
            <option value="linkedin">LinkedIn Insight</option>
            <option value="gsc">Search Console</option>
            <option value="bing">Bing Webmaster</option>
            <option value="custom">Custom Code</option>
          </select>

          {/* Placement Filter */}
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Placements</option>
            <option value="head">&lt;head&gt;</option>
            <option value="body_start">&lt;body&gt; Start</option>
            <option value="body_end">&lt;body&gt; End</option>
          </select>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-ui-bg-subtle p-1 rounded-xl border border-ui-border-base text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "all" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter("enabled")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "enabled" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
              }`}
            >
              Active ({stats.enabled_count})
            </button>
            <button
              onClick={() => setStatusFilter("disabled")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                statusFilter === "disabled" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
              }`}
            >
              Disabled ({stats.disabled_count})
            </button>
          </div>
        </div>
      </div>

      {/* Main Tracking Codes Table */}
      <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-ui-border-base bg-ui-bg-subtle/50 text-ui-fg-subtle uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Code Name & Details</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Tracking ID / Preview</th>
                <th className="py-3 px-3">Placement</th>
                <th className="py-3 px-3">Target Pages</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border-base">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-ui-bg-subtle/30 transition-colors group"
                >
                  {/* Name */}
                  <td className="py-3.5 px-4 font-semibold text-ui-fg-base">
                    <div>
                      <span className="block font-bold">{item.name}</span>
                      {item.description && (
                        <span className="text-[11px] text-ui-fg-subtle font-normal line-clamp-1">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-3">
                    {getTypeBadge(item.type)}
                  </td>

                  {/* Tracking ID / Snippet */}
                  <td className="py-3.5 px-3 font-mono text-[11px]">
                    {item.tracking_id ? (
                      <span className="px-2 py-0.5 rounded-md bg-ui-bg-subtle border border-ui-border-base font-semibold">
                        {item.tracking_id}
                      </span>
                    ) : item.custom_code ? (
                      <span className="text-[10px] text-ui-fg-subtle italic">
                        {item.custom_code.slice(0, 30)}...
                      </span>
                    ) : (
                      <span className="text-ui-fg-muted">—</span>
                    )}
                  </td>

                  {/* Placement */}
                  <td className="py-3.5 px-3 text-ui-fg-subtle font-mono text-[11px]">
                    {getPlacementLabel(item.placement)}
                  </td>

                  {/* Target Pages */}
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-ui-fg-base">
                      {getTargetPagesLabel(item.target_pages)}
                    </span>
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        item.is_enabled
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                      }`}
                      title={item.is_enabled ? "Click to disable" : "Click to enable"}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.is_enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                        }`}
                      />
                      <span>{item.is_enabled ? "Active" : "Disabled"}</span>
                    </button>
                  </td>

                  {/* Last Updated */}
                  <td className="py-3.5 px-3 text-[11px] text-ui-fg-subtle whitespace-nowrap">
                    {new Date(item.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle transition-colors"
                        title="Edit Configuration"
                      >
                        <PencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteItem(item)}
                        className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-rose-600 hover:bg-ui-bg-subtle transition-colors"
                        title="Delete Code"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && !loading && (
          <div className="text-center py-16 px-4 space-y-3">
            <Code className="w-10 h-10 mx-auto text-ui-fg-subtle opacity-40" />
            <h3 className="font-bold text-sm text-ui-fg-base">No tracking codes found</h3>
            <p className="text-xs text-ui-fg-subtle max-w-sm mx-auto">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "Get started by adding Google Analytics 4, GTM, Meta Pixel, or custom tracking snippets."}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <Button
                variant="primary"
                onClick={handleOpenCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Tracking Code</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-4">
              <div>
                <h2 className="text-lg font-bold text-ui-fg-base">
                  {editingItem ? `Edit Code: ${editingItem.name}` : "Add Frontend Tracking Code"}
                </h2>
                <p className="text-xs text-ui-fg-subtle mt-0.5">
                  Configure tracking identifiers, placements, and page targeting for the public storefront.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Code Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Google Analytics 4 - Production"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Code Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      setFormData({ ...formData, type: e.target.value })
                      setTestValidationResult(null)
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  >
                    {CODE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Tracking ID Input vs Custom Code */}
              {formData.type !== "custom" ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-ui-fg-base block">
                      Tracking ID / Verification Code <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-ui-fg-subtle">
                      {CODE_TYPES.find((t) => t.value === formData.type)?.hint}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.tracking_id}
                    onChange={(e) => {
                      setFormData({ ...formData, tracking_id: e.target.value })
                      setTestValidationResult(null)
                    }}
                    placeholder={CODE_TYPES.find((t) => t.value === formData.type)?.prefix}
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base font-mono focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-ui-fg-subtle mt-1 block">
                    Prefer official tracking IDs over custom scripts. AcademyIO securely injects the official SDK for this provider.
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-ui-fg-base block">
                      Custom HTML or JavaScript Snippet <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-600 font-semibold">Elevated Security Sandbox</span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={formData.custom_code}
                    onChange={(e) => {
                      setFormData({ ...formData, custom_code: e.target.value })
                      setTestValidationResult(null)
                    }}
                    placeholder="<script>/* Custom analytics code */</script>"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base font-mono text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                  />
                  <span className="text-[10px] text-ui-fg-subtle mt-1 block">
                    Security check: Forbidden access to authentication tokens, credentials, and customer cookies is automatically blocked.
                  </span>
                </div>
              )}

              {/* Placement & Target Pages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Script Placement</label>
                  <select
                    value={formData.placement}
                    onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  >
                    <option value="head">&lt;head&gt; (Standard for GA4, GTM, Pixel, Verification)</option>
                    <option value="body_start">&lt;body&gt; Start (Directly after body opens)</option>
                    <option value="body_end">&lt;body&gt; End (Before body closes, for deferral)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Target Website Pages</label>
                  <select
                    value={formData.target_pages}
                    onChange={(e) => setFormData({ ...formData, target_pages: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Storefront Pages (Default)</option>
                    <option value="homepage">Homepage Only</option>
                    <option value="webinars">Webinars (/webinars*)</option>
                    <option value="subscriptions">Subscriptions (/subscriptions*)</option>
                    <option value="checkout">Checkout (/checkout*)</option>
                    <option value="custom">Specific Custom Paths</option>
                  </select>
                </div>
              </div>

              {/* Custom Paths if selected */}
              {formData.target_pages === "custom" && (
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Custom Path Prefixes (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.target_paths}
                    onChange={(e) => setFormData({ ...formData, target_paths: e.target.value })}
                    placeholder="/webinars, /subscriptions/confirmed, /about"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base font-mono focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="font-bold text-ui-fg-base block mb-1">Internal Notes / Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Primary analytics property managed by digital marketing team"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_enabled}
                    onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                    className="rounded border-ui-border-base text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-ui-fg-base block">Enable Immediately</span>
                    <span className="text-[11px] text-ui-fg-subtle">
                      When checked, this tracking script activates on the storefront immediately upon saving.
                    </span>
                  </div>
                </label>
              </div>

              {/* Test Validation Feedback Box */}
              {testValidationResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    testValidationResult.valid
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testValidationResult.valid ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
                    <span>{testValidationResult.valid ? "Configuration Validated" : "Validation Error"}</span>
                  </div>
                  <p className="leading-relaxed">
                    {testValidationResult.valid ? testValidationResult.message : testValidationResult.error}
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleTestConfiguration}
                  disabled={isTesting || (!formData.tracking_id && !formData.custom_code)}
                  className="text-xs"
                >
                  {isTesting ? "Testing..." : "Test Configuration"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Save Tracking Code"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ExclamationCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ui-fg-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              Are you sure you want to delete <strong className="text-ui-fg-base">{deleteItem.name}</strong>?
              This will permanently stop this tracking code from executing on the public storefront.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteItem(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeleting ? "Deleting..." : "Delete Tracking Code"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
