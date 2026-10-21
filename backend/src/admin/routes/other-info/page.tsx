import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  DocumentText,
  Plus,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Eye,
  ExclamationCircle,
  Trash,
  MagnifyingGlass,
  ArrowUpRightOnBox,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Other Information",
  icon: DocumentText,
  rank: 63,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface OtherInfoItem {
  id: string
  title: string
  description: string
  icon?: string | null
  image_url?: string | null
  link_url?: string | null
  link_text?: string | null
  badge?: string | null
  section: string
  is_active: boolean
  show_on_homepage: boolean
  display_order: number
}

interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

export default function OtherInfoAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [items, setItems] = useState<OtherInfoItem[]>([])
  const [settings, setSettings] = useState<SectionSettings>({
    section_key: "other_info",
    is_enabled: true,
    title: "Continuing Education Standards & Compliance Disclosures",
    subtitle: "Important Program Guidelines",
    description: "Essential regulatory details regarding attendance tracking, certificate delivery, and multi-state board reciprocity.",
  })
  const [loading, setLoading] = useState(false)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "homepage">("all")

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OtherInfoItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewItem, setPreviewItem] = useState<OtherInfoItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<OtherInfoItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form State
  const initialForm = {
    title: "",
    badge: "",
    description: "",
    icon: "info",
    image_url: "",
    link_url: "",
    link_text: "",
    section: "homepage",
    is_active: true,
    show_on_homepage: true,
    display_order: 1,
  }
  const [formData, setFormData] = useState(initialForm)

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/other-info", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load information items")
      const data = await res.json()
      setItems(data.items || [])
      if (data.settings) setSettings(data.settings)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  // Toggle Global Master Switch
  const handleToggleGlobalSwitch = async () => {
    setIsUpdatingSettings(true)
    const nextState = !settings.is_enabled
    try {
      const res = await fetch("/admin/other-info/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_enabled: nextState }),
      })
      if (!res.ok) throw new Error("Failed to update global switch")
      const data = await res.json()
      setSettings(data.settings || { ...settings, is_enabled: nextState })
      notify("success", `Other Information homepage section ${nextState ? "activated" : "hidden"}`)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      ...initialForm,
      display_order: items.length + 1,
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item: OtherInfoItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      badge: item.badge || "",
      description: item.description,
      icon: item.icon || "info",
      image_url: item.image_url || "",
      link_url: item.link_url || "",
      link_text: item.link_text || "",
      section: item.section || "homepage",
      is_active: item.is_active,
      show_on_homepage: item.show_on_homepage,
      display_order: item.display_order || 1,
    })
    setIsModalOpen(true)
  }

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) {
      notify("error", "Title and Description are required.")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingItem ? `/admin/other-info/${editingItem.id}` : "/admin/other-info"
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to save information item")
      }

      notify("success", editingItem ? `Updated "${formData.title}" successfully` : `Created "${formData.title}" successfully`)
      setIsModalOpen(false)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (item: OtherInfoItem) => {
    try {
      const res = await fetch(`/admin/other-info/${item.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      notify("success", `Item ${!item.is_active ? "activated" : "deactivated"}`)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Toggle Homepage Visibility
  const handleToggleHomepage = async (item: OtherInfoItem) => {
    const nextVal = !item.show_on_homepage
    try {
      const res = await fetch(`/admin/other-info/${item.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ show_on_homepage: nextVal }),
      })
      if (!res.ok) throw new Error("Failed to update homepage visibility")
      notify("success", `Item ${nextVal ? "visible on homepage" : "hidden from homepage"}`)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteItem) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/admin/other-info/${deleteItem.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete item")
      notify("success", `Deleted "${deleteItem.title}" successfully`)
      setDeleteItem(null)
      fetchItems()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.badge && item.badge.toLowerCase().includes(searchQuery.toLowerCase()))
    if (!matchSearch) return false

    if (statusFilter === "active") return item.is_active
    if (statusFilter === "inactive") return !item.is_active
    if (statusFilter === "homepage") return item.is_active && item.show_on_homepage
    return true
  })

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <DocumentText className="w-6 h-6 text-indigo-600" />
            <Heading level="h1" className="text-2xl font-bold">
              Other Information Management
            </Heading>
            <Badge color="blue" size="small">
              {items.filter((i) => i.is_active).length} Active Items
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Manage essential continuing education guidelines, compliance notices, attendance policies, and homepage disclosures.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <Button
            variant="secondary"
            onClick={fetchItems}
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
            <span>Add Information Item</span>
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
        <a
          href="/webapp/credits"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Credits Management
        </a>
        <span className="text-blue-600 border-b-2 border-blue-600 pb-2 px-3">
          Other Information ({items.length})
        </span>
        <a
          href="/webapp/contact-info"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Company Address & Contact
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
      <div className="rounded-2xl border border-ui-border-base p-5 bg-gradient-to-r from-indigo-50/50 to-purple-50/30 dark:from-slate-900 dark:to-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-ui-fg-base">
              Global Other Information Homepage Section
            </span>
            <Badge color={settings.is_enabled ? "green" : "grey"} size="small">
              {settings.is_enabled ? "Enabled on Homepage" : "Hidden from Homepage"}
            </Badge>
          </div>
          <p className="text-xs text-ui-fg-subtle max-w-2xl leading-relaxed">
            When enabled, active information disclosures appear dynamically in the dedicated homepage compliance section. When turned off, the entire section is hidden without layout gaps.
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
            placeholder="Search items by title, badge, or content..."
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
            All ({items.length})
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

      {/* Grid of Other Information Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-5 transition-all space-y-4 bg-ui-bg-base flex flex-col justify-between ${
              item.is_active
                ? "border-ui-border-base shadow-xs"
                : "border-ui-border-base opacity-75 bg-ui-bg-subtle/50"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block">
                      {item.badge}
                    </span>
                  )}
                  <h3 className="font-bold text-sm text-ui-fg-base leading-snug">{item.title}</h3>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                    title="Preview Item"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                    title="Edit Item"
                  >
                    <PencilSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteItem(item)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-rose-600 hover:bg-ui-bg-subtle"
                    title="Delete Item"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-ui-fg-subtle line-clamp-4 leading-relaxed">
                {item.description}
              </p>

              {item.link_url && (
                <div className="pt-2 border-t border-ui-border-base flex items-center gap-1 text-xs text-blue-600 font-semibold">
                  <span>CTA: {item.link_text || "Learn More"} ({item.link_url})</span>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="pt-3 border-t border-ui-border-base flex items-center justify-between gap-2 text-xs">
              <span className="text-ui-fg-subtle text-[11px]">Order: #{item.display_order}</span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleHomepage(item)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                    item.show_on_homepage
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-ui-bg-subtle text-ui-fg-subtle"
                  }`}
                  title="Toggle homepage visibility"
                >
                  {item.show_on_homepage ? "Homepage: ON" : "Homepage: OFF"}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                    item.is_active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                  title="Toggle active status"
                >
                  {item.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-16 bg-ui-bg-subtle rounded-2xl border border-ui-border-base space-y-3">
          <DocumentText className="w-10 h-10 mx-auto text-ui-fg-subtle opacity-50" />
          <h3 className="font-bold text-ui-fg-base">No information items found</h3>
          <p className="text-xs text-ui-fg-subtle">
            {searchQuery ? "Try clearing your search query." : "Click Add Information Item to create a new compliance disclosure."}
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
                  {editingItem ? `Edit Item: ${editingItem.title}` : "Add Information Item"}
                </h2>
                <p className="text-xs text-ui-fg-subtle mt-0.5">
                  Configure program guidelines, verification disclosures, and customer-facing visibility.
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
                    Item Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Attendance & Real-Time Polling Verification"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. Regulatory Compliance, NASBA Standard"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Content & Disclosure Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail the requirement, procedure, or policy for participants..."
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-ui-fg-subtle mt-0.5 block">
                  All submitted content is automatically sanitized against XSS and unsafe script injections.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Optional Link URL</label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="e.g. /us/faq or https://..."
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Link Button Text</label>
                  <input
                    type="text"
                    value={formData.link_text}
                    onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                    placeholder="e.g. Read Policy, Learn More"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
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
                  {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
                </Button>
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
              Are you sure you want to delete <strong className="text-ui-fg-base">{deleteItem.title}</strong>?
              This item will no longer appear on the website.
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
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Delete Item"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-ui-fg-base">Customer Homepage Card Preview</h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 rounded-lg text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
              {previewItem.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 inline-block">
                  {previewItem.badge}
                </span>
              )}
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                {previewItem.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                {previewItem.description}
              </p>
              {previewItem.link_url && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                    {previewItem.link_text || "Learn More"}
                    <ArrowUpRightOnBox className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewItem(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
