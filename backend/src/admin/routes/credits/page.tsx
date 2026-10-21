import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  AcademicCap,
  Plus,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Eye,
  ExclamationCircle,
  Trash,
  MagnifyingGlass,
  Sparkles,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Credits Management",
  icon: AcademicCap,
  rank: 62,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface CreditTypeItem {
  id: string
  code: string
  name: string
  badge?: string | null
  description?: string | null
  category: string
  default_credit_hours: string
  organization_code?: string | null
  organization_name?: string | null
  organization_short_name?: string | null
  organization_logo_url?: string | null
  icon?: string | null
  is_active: boolean
  show_on_homepage: boolean
  show_on_webinars: boolean
  display_order: number
}

interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

interface OrgOption {
  code: string
  name: string
  short_name: string
  logo_url: string
}

export default function CreditsManagementAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [creditTypes, setCreditTypes] = useState<CreditTypeItem[]>([])
  const [availableOrgs, setAvailableOrgs] = useState<OrgOption[]>([])
  const [settings, setSettings] = useState<SectionSettings>({
    section_key: "credits",
    is_enabled: true,
    title: "Earn Certified Continuing Professional Education Credits",
    subtitle: "Accredited Professional Credentials",
    description: "AcademyIO masterclasses qualify for nationally recognized professional credentials across accounting, taxation, and human resources.",
  })
  const [loading, setLoading] = useState(false)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "homepage">("all")

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCredit, setEditingCredit] = useState<CreditTypeItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewCredit, setPreviewCredit] = useState<CreditTypeItem | null>(null)
  const [deleteCredit, setDeleteCredit] = useState<CreditTypeItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form State
  const initialForm = {
    name: "",
    code: "",
    badge: "",
    category: "Accounting & Finance",
    default_credit_hours: "1.0 - 2.0 Credits",
    organization_code: "",
    icon: "award",
    description: "",
    is_active: true,
    show_on_homepage: true,
    show_on_webinars: true,
    display_order: 1,
  }
  const [formData, setFormData] = useState(initialForm)

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchCredits = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/credits", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load credit types")
      const data = await res.json()
      setCreditTypes(data.credit_types || [])
      if (data.settings) setSettings(data.settings)
      if (data.available_organizations) setAvailableOrgs(data.available_organizations)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredits()
  }, [])

  // Toggle Global Master Switch
  const handleToggleGlobalSwitch = async () => {
    setIsUpdatingSettings(true)
    const nextState = !settings.is_enabled
    try {
      const res = await fetch("/admin/credits/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_enabled: nextState }),
      })
      if (!res.ok) throw new Error("Failed to update global switch")
      const data = await res.json()
      setSettings(data.settings || { ...settings, is_enabled: nextState })
      notify("success", `Credits homepage section ${nextState ? "activated" : "hidden"}`)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCredit(null)
    setFormData({
      ...initialForm,
      display_order: creditTypes.length + 1,
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (c: CreditTypeItem) => {
    setEditingCredit(c)
    setFormData({
      name: c.name,
      code: c.code,
      badge: c.badge || "",
      category: c.category,
      default_credit_hours: c.default_credit_hours,
      organization_code: c.organization_code || "",
      icon: c.icon || "award",
      description: c.description || "",
      is_active: c.is_active,
      show_on_homepage: c.show_on_homepage,
      show_on_webinars: c.show_on_webinars,
      display_order: c.display_order || 1,
    })
    setIsModalOpen(true)
  }

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      notify("error", "Credit Name is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingCredit ? `/admin/credits/${editingCredit.id}` : "/admin/credits"
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to save credit type")
      }

      notify("success", editingCredit ? `Updated ${formData.name} successfully` : `Created ${formData.name} successfully`)
      setIsModalOpen(false)
      fetchCredits()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (c: CreditTypeItem) => {
    try {
      const res = await fetch(`/admin/credits/${c.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_active: !c.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      notify("success", `${c.name} ${!c.is_active ? "activated" : "deactivated"}`)
      fetchCredits()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Toggle Homepage Visibility
  const handleToggleHomepage = async (c: CreditTypeItem) => {
    const nextVal = !c.show_on_homepage
    try {
      const res = await fetch(`/admin/credits/${c.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ show_on_homepage: nextVal }),
      })
      if (!res.ok) throw new Error("Failed to update homepage visibility")
      notify("success", `${c.name} ${nextVal ? "visible on homepage" : "hidden from homepage"}`)
      fetchCredits()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteCredit) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/admin/credits/${deleteCredit.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete credit type")
      notify("success", `Deleted ${deleteCredit.name} successfully`)
      setDeleteCredit(null)
      fetchCredits()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter credits
  const filteredCredits = creditTypes.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.badge && c.badge.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false

    if (statusFilter === "active") return c.is_active
    if (statusFilter === "inactive") return !c.is_active
    if (statusFilter === "homepage") return c.is_active && c.show_on_homepage
    return true
  })

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <AcademicCap className="w-6 h-6 text-amber-500" />
            <Heading level="h1" className="text-2xl font-bold">
              Credits Management
            </Heading>
            <Badge color="blue" size="small">
              {creditTypes.filter((c) => c.is_active).length} Active Types
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Manage authorized professional credit types, accreditation affiliations, credential hours, and homepage display.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <Button
            variant="secondary"
            onClick={fetchCredits}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <ArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credit Type</span>
          </Button>
        </div>
      </div>

      {/* Cross Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-ui-border-base pb-3 text-xs font-semibold">
        <a
          href="/webapp/organizations"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Regulatory Bodies
        </a>
        <span className="text-blue-600 border-b-2 border-blue-600 pb-2 px-3">
          Credits Management ({creditTypes.length})
        </span>
        <a
          href="/webapp/other-info"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Other Information
        </a>
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
          <div className="flex items-center gap-2 text-sm font-medium">
            {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Master Switch Card */}
      <div className="rounded-2xl border border-ui-border-base p-5 bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-slate-900 dark:to-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-ui-fg-base">
              Global Credits Homepage Section
            </span>
            <Badge color={settings.is_enabled ? "green" : "grey"} size="small">
              {settings.is_enabled ? "Enabled on Homepage" : "Hidden from Homepage"}
            </Badge>
          </div>
          <p className="text-xs text-ui-fg-subtle max-w-2xl leading-relaxed">
            When enabled, active credit types appear dynamically on the AcademyIO homepage. When turned off, the entire Credits section is hidden without layout gaps.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleGlobalSwitch}
          disabled={isUpdatingSettings}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            settings.is_enabled
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              : "bg-ui-bg-subtle text-ui-fg-subtle border border-ui-border-base hover:bg-ui-bg-base"
          }`}
        >
          {isUpdatingSettings && <ArrowPath className="w-3.5 h-3.5 animate-spin" />}
          <span>{settings.is_enabled ? "Master Switch: ON" : "Master Switch: OFF"}</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-subtle" />
          <input
            type="text"
            placeholder="Search credit types by name, category, or badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-ui-bg-subtle p-1 rounded-xl border border-ui-border-base text-xs font-semibold">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === "all" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
            }`}
          >
            All ({creditTypes.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === "active" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("homepage")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === "homepage" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
            }`}
          >
            Homepage Visible
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === "inactive" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Grid of Credit Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCredits.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl border p-5 transition-all space-y-4 bg-ui-bg-base flex flex-col justify-between ${
              c.is_active
                ? "border-ui-border-base shadow-xs"
                : "border-ui-border-base opacity-75 bg-ui-bg-subtle/50"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0">
                    {c.badge || "CPE"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ui-fg-base leading-snug">{c.name}</h3>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold block">
                      {c.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewCredit(c)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                    title="Preview Card"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                    title="Edit Credit Type"
                  >
                    <PencilSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteCredit(c)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-rose-600 hover:bg-ui-bg-subtle"
                    title="Delete Credit Type"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-ui-fg-subtle line-clamp-3 leading-relaxed">
                {c.description || "No description provided."}
              </p>

              <div className="pt-2 border-t border-ui-border-base space-y-1.5 text-xs text-ui-fg-subtle">
                <div className="flex items-center justify-between">
                  <span>Standard Hours:</span>
                  <span className="font-bold text-ui-fg-base">{c.default_credit_hours}</span>
                </div>
                {c.organization_short_name && (
                  <div className="flex items-center justify-between">
                    <span>Affiliated Body:</span>
                    <span className="font-semibold text-blue-600">{c.organization_short_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Order:</span>
                  <span>#{c.display_order}</span>
                </div>
              </div>
            </div>

            {/* Card Footer Controls */}
            <div className="pt-3 border-t border-ui-border-base flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleHomepage(c)}
                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                  c.show_on_homepage
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                    : "bg-ui-bg-subtle text-ui-fg-subtle"
                }`}
                title="Toggle homepage visibility"
              >
                {c.show_on_homepage ? "Homepage: ON" : "Homepage: OFF"}
              </button>

              <button
                type="button"
                onClick={() => handleToggleActive(c)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                  c.is_active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
                title="Toggle active status"
              >
                {c.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCredits.length === 0 && !loading && (
        <div className="text-center py-16 bg-ui-bg-subtle rounded-2xl border border-ui-border-base space-y-3">
          <AcademicCap className="w-10 h-10 mx-auto text-ui-fg-subtle opacity-50" />
          <h3 className="font-bold text-ui-fg-base">No credit types found</h3>
          <p className="text-xs text-ui-fg-subtle">
            {searchQuery ? "Try clearing your search query." : "Click Add Credit Type to create a new credential format."}
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-4">
              <div>
                <h2 className="text-lg font-bold text-ui-fg-base">
                  {editingCredit ? `Edit Credit Type: ${editingCredit.name}` : "Add New Credit Type"}
                </h2>
                <p className="text-xs text-ui-fg-subtle mt-0.5">
                  Define professional credentials, hours format, and customer-facing visibility.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Credit Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. NASBA CPE Credits"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Badge / Tag Acronym
                  </label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value.toUpperCase() })}
                    placeholder="e.g. CPE, CE, HRCI, SHRM"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Code / Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingCredit)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                    placeholder="e.g. cpe"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Professional Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Accounting & Finance"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Default Hours Format</label>
                  <input
                    type="text"
                    value={formData.default_credit_hours}
                    onChange={(e) => setFormData({ ...formData, default_credit_hours: e.target.value })}
                    placeholder="e.g. 1.0 - 2.0 Credits"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Affiliated Regulatory Body (Optional)
                  </label>
                  <select
                    value={formData.organization_code}
                    onChange={(e) => setFormData({ ...formData, organization_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  >
                    <option value="">None (Independent Credential)</option>
                    {availableOrgs.map((org) => (
                      <option key={org.code} value={org.code}>
                        {org.short_name} — {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Description & Accreditation Acceptance
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain credential value, eligibility requirements, and board acceptance..."
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-ui-border-base text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-ui-fg-base">Active</span>
                  </label>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={formData.show_on_homepage}
                      onChange={(e) => setFormData({ ...formData, show_on_homepage: e.target.checked })}
                      className="rounded border-ui-border-base text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-ui-fg-base">On Homepage</span>
                  </label>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={formData.show_on_webinars}
                      onChange={(e) => setFormData({ ...formData, show_on_webinars: e.target.checked })}
                      className="rounded border-ui-border-base text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-ui-fg-base">On Webinars</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ui-border-base">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? "Saving..." : editingCredit ? "Save Changes" : "Create Credit Type"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ExclamationCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ui-fg-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              Are you sure you want to delete <strong className="text-ui-fg-base">{deleteCredit.name}</strong>?
              This credit type will no longer appear on the website. Past webinar credit records and certificates remain preserved.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteCredit(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete Credit Type"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Preview Modal */}
      {previewCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-ui-fg-base">Customer-Facing Card Preview</h3>
              </div>
              <button
                onClick={() => setPreviewCredit(null)}
                className="p-1 rounded-lg text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs shrink-0 shadow-2xs">
                    {previewCredit.badge || "CPE"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      {previewCredit.name}
                    </h4>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {previewCredit.category}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {previewCredit.default_credit_hours}
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                {previewCredit.description}
              </p>

              {previewCredit.organization_short_name && (
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-gray-500">
                  <span>Accreditation Provider:</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200">
                    {previewCredit.organization_name || previewCredit.organization_short_name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewCredit(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
