import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ShieldCheck,
  Plus,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Eye,
  ExclamationCircle,
  Trash,
  MagnifyingGlass,
  Photo,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Regulatory Bodies",
  icon: ShieldCheck,
  rank: 61,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface OrganizationItem {
  id: string
  code: string
  name: string
  short_name: string
  logo_url: string
  website_url?: string | null
  alt_text: string
  description?: string | null
  default_credit_type: string
  is_enabled: boolean
  show_on_homepage?: boolean
  display_order: number
  assigned_webinars_count?: number
}

interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

export default function OrganizationsAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([])
  const [settings, setSettings] = useState<SectionSettings>({
    section_key: "regulatory_bodies",
    is_enabled: true,
    title: "Recognized by Leading Professional Regulatory Bodies",
    subtitle: "Accredited Continuing Professional Education",
  })
  const [loading, setLoading] = useState(false)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "homepage">("all")

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewOrg, setPreviewOrg] = useState<OrganizationItem | null>(null)
  const [deleteOrg, setDeleteOrg] = useState<OrganizationItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  // Form State
  const initialForm = {
    name: "",
    short_name: "",
    code: "",
    logo_url: "",
    website_url: "",
    alt_text: "",
    description: "",
    default_credit_type: "CPE Credits",
    is_enabled: true,
    show_on_homepage: true,
    display_order: 1,
  }
  const [formData, setFormData] = useState(initialForm)

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchOrganizations = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/organizations", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load regulatory bodies")
      const data = await res.json()
      setOrganizations(data.organizations || [])
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  // Toggle Global Master Switch
  const handleToggleGlobalSwitch = async () => {
    setIsUpdatingSettings(true)
    const nextState = !settings.is_enabled
    try {
      const res = await fetch("/admin/organizations/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_enabled: nextState }),
      })
      if (!res.ok) throw new Error("Failed to update global switch")
      const data = await res.json()
      setSettings(data.settings || { ...settings, is_enabled: nextState })
      notify("success", `Regulatory Bodies homepage section ${nextState ? "activated" : "hidden"}`)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOrg(null)
    setFormData({
      ...initialForm,
      display_order: organizations.length + 1,
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (org: OrganizationItem) => {
    setEditingOrg(org)
    setFormData({
      name: org.name,
      short_name: org.short_name,
      code: org.code,
      logo_url: org.logo_url,
      website_url: org.website_url || "",
      alt_text: org.alt_text,
      description: org.description || "",
      default_credit_type: org.default_credit_type,
      is_enabled: org.is_enabled,
      show_on_homepage: org.show_on_homepage ?? true,
      display_order: org.display_order || 1,
    })
    setIsModalOpen(true)
  }

  // Handle Logo File Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        const res = await fetch("/admin/organizations/upload", {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            dataUrl,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || "Failed to upload logo")
        }

        const data = await res.json()
        setFormData((prev) => ({
          ...prev,
          logo_url: data.url,
          alt_text: prev.alt_text || `${prev.short_name || "Organization"} Logo`,
        }))
        notify("success", "Logo uploaded successfully")
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      notify("error", err.message)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // Form Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.short_name.trim()) {
      notify("error", "Name and Short Name are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingOrg ? `/admin/organizations/${editingOrg.id}` : "/admin/organizations"
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.message || "Failed to save regulatory body")
      }

      notify("success", editingOrg ? `Updated ${formData.short_name} successfully` : `Created ${formData.short_name} successfully`)
      setIsModalOpen(false)
      fetchOrganizations()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Quick Toggle Active Status
  const handleToggleActive = async (org: OrganizationItem) => {
    try {
      const res = await fetch(`/admin/organizations/${org.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_enabled: !org.is_enabled }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      notify("success", `${org.short_name} ${!org.is_enabled ? "activated" : "deactivated"}`)
      fetchOrganizations()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Quick Toggle Homepage Visibility
  const handleToggleHomepage = async (org: OrganizationItem) => {
    const nextVal = !(org.show_on_homepage ?? true)
    try {
      const res = await fetch(`/admin/organizations/${org.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ show_on_homepage: nextVal }),
      })
      if (!res.ok) throw new Error("Failed to update homepage visibility")
      notify("success", `${org.short_name} ${nextVal ? "shown on homepage" : "hidden from homepage"}`)
      fetchOrganizations()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteOrg) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/admin/organizations/${deleteOrg.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete regulatory body")
      notify("success", `Deleted ${deleteOrg.short_name} successfully`)
      setDeleteOrg(null)
      fetchOrganizations()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter organizations
  const filteredOrgs = organizations.filter((org) => {
    const matchSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.code.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false

    if (statusFilter === "active") return org.is_enabled
    if (statusFilter === "inactive") return !org.is_enabled
    if (statusFilter === "homepage") return org.is_enabled && org.show_on_homepage !== false
    return true
  })

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <Heading level="h1" className="text-2xl font-bold">
              Professional Regulatory Bodies
            </Heading>
            <Badge color="blue" size="small">
              {organizations.filter((o) => o.is_enabled).length} Active
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Manage authorized regulatory bodies, accreditation logos, statutory disclosures, and homepage trust bar visibility.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <Button
            variant="secondary"
            onClick={fetchOrganizations}
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
            <span>Add Regulatory Body</span>
          </Button>
        </div>
      </div>

      {/* Cross Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-ui-border-base pb-3 text-xs font-semibold">
        <span className="text-blue-600 border-b-2 border-blue-600 pb-2 px-3">
          Regulatory Bodies ({organizations.length})
        </span>
        <a
          href="/webapp/credits"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Credits Management
        </a>
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
      <div className="rounded-2xl border border-ui-border-base p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-ui-fg-base">
              Global Regulatory Bodies Homepage Section
            </span>
            <Badge color={settings.is_enabled ? "green" : "grey"} size="small">
              {settings.is_enabled ? "Enabled on Homepage" : "Hidden from Homepage"}
            </Badge>
          </div>
          <p className="text-xs text-ui-fg-subtle max-w-2xl leading-relaxed">
            When enabled, active regulatory bodies display dynamically in the homepage accreditation trust bar. When disabled, the entire section is completely hidden without layout gaps.
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
            placeholder="Search regulatory bodies by name, acronym, or code..."
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
            All ({organizations.length})
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

      {/* Grid of Regulatory Bodies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredOrgs.map((org) => (
          <div
            key={org.id}
            className={`rounded-2xl border p-6 transition-all space-y-4 bg-ui-bg-base ${
              org.is_enabled
                ? "border-ui-border-base shadow-xs"
                : "border-ui-border-base opacity-75 bg-ui-bg-subtle/50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                <div className="w-28 h-14 bg-white rounded-xl border border-gray-200 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  <img
                    src={org.logo_url}
                    alt={org.alt_text}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-ui-fg-base">{org.short_name}</h3>
                    <Badge color={org.is_enabled ? "green" : "grey"} size="small">
                      {org.is_enabled ? "Active" : "Disabled"}
                    </Badge>
                    {org.show_on_homepage !== false ? (
                      <Badge color="blue" size="small">Homepage</Badge>
                    ) : (
                      <Badge color="grey" size="small">Not on Homepage</Badge>
                    )}
                  </div>
                  <p className="text-xs text-ui-fg-subtle font-medium mt-0.5">{org.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPreviewOrg(org)}
                  className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                  title="Preview on Homepage"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(org)}
                  className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                  title="Edit Regulatory Body"
                >
                  <PencilSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteOrg(org)}
                  className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-rose-600 hover:bg-ui-bg-subtle"
                  title="Delete Regulatory Body"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-ui-fg-subtle line-clamp-3 leading-relaxed border-t border-ui-border-base pt-3">
              {org.description || "No official description provided."}
            </p>

            {/* Metadata Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ui-fg-subtle pt-2 border-t border-ui-border-base">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-ui-fg-base">
                  {org.default_credit_type} Sponsor
                </span>
                <span>•</span>
                <span>Order: #{org.display_order}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleHomepage(org)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    org.show_on_homepage !== false
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-ui-bg-subtle text-ui-fg-subtle"
                  }`}
                  title="Toggle homepage visibility"
                >
                  {org.show_on_homepage !== false ? "Homepage: ON" : "Homepage: OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(org)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    org.is_enabled
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                  title="Toggle active status"
                >
                  {org.is_enabled ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOrgs.length === 0 && !loading && (
        <div className="text-center py-16 bg-ui-bg-subtle rounded-2xl border border-ui-border-base space-y-3">
          <ShieldCheck className="w-10 h-10 mx-auto text-ui-fg-subtle opacity-50" />
          <h3 className="font-bold text-ui-fg-base">No regulatory bodies found</h3>
          <p className="text-xs text-ui-fg-subtle">
            {searchQuery ? "Try clearing your search query or filters." : "Click Add Regulatory Body to register a new organization."}
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
                  {editingOrg ? `Edit Regulatory Body: ${editingOrg.short_name}` : "Add New Regulatory Body"}
                </h2>
                <p className="text-xs text-ui-fg-subtle mt-0.5">
                  Configure accreditation identity, logos, and visibility.
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
                    Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. National Association of State Boards of Accountancy"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Short Name / Acronym <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    placeholder="e.g. NASBA"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    System Code / Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingOrg)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                    placeholder="e.g. nasba"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                  <span className="text-[10px] text-ui-fg-subtle mt-0.5 block">Unique system identifier</span>
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Default Credit Type</label>
                  <input
                    type="text"
                    value={formData.default_credit_type}
                    onChange={(e) => setFormData({ ...formData, default_credit_type: e.target.value })}
                    placeholder="e.g. CPE Credits"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Logo Upload & URL */}
              <div className="space-y-2 rounded-xl border border-ui-border-base p-4 bg-ui-bg-subtle">
                <label className="font-bold text-ui-fg-base block">
                  Accreditation Logo / Image
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-32 h-16 bg-white rounded-xl border border-gray-200 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {formData.logo_url ? (
                      <img
                        src={formData.logo_url}
                        alt="Logo Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Photo className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-ui-border-base hover:bg-ui-bg-subtle cursor-pointer flex items-center gap-1.5 transition-colors">
                        <Photo className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isUploadingLogo ? "Uploading..." : "Upload Logo Image"}</span>
                        <input
                          type="file"
                          accept="image/*,.svg"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                        />
                      </label>
                      <span className="text-[10px] text-ui-fg-subtle">SVG, PNG, JPG supported</span>
                    </div>

                    <input
                      type="text"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="Or enter logo URL (e.g. /logos/nasba.png)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={formData.alt_text}
                    onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                    placeholder="e.g. Continuing Professional Education Sponsor"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Accreditation Disclosure & Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Official statutory disclosure explaining credential acceptance, provider status, and participant requirements..."
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
                      checked={formData.is_enabled}
                      onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                      className="rounded border-ui-border-base text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-ui-fg-base">Active (Enabled)</span>
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
                    <span className="font-bold text-ui-fg-base">Show on Homepage</span>
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
                  {isSubmitting ? "Saving..." : editingOrg ? "Save Changes" : "Create Regulatory Body"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ExclamationCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ui-fg-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              Are you sure you want to delete <strong className="text-ui-fg-base">{deleteOrg.name} ({deleteOrg.short_name})</strong>?
              It will no longer appear on the website. Existing webinar credit associations will remain intact in history.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteOrg(null)}
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
                {isDeleting ? "Deleting..." : "Delete Regulatory Body"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Preview Modal */}
      {previewOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-ui-fg-base">Homepage Trust Bar Preview</h3>
              </div>
              <button
                onClick={() => setPreviewOrg(null)}
                className="p-1 rounded-lg text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="h-16 w-full flex items-center justify-center p-2 rounded-xl bg-gray-50/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700/50">
                <img
                  src={previewOrg.logo_url}
                  alt={previewOrg.alt_text}
                  className="max-h-full max-w-[200px] object-contain"
                />
              </div>

              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {previewOrg.name}
                </h4>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block">
                  {previewOrg.default_credit_type} Sponsor
                </span>
              </div>

              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                {previewOrg.description}
              </p>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewOrg(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
