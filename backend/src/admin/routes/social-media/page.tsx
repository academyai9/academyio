import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Share,
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
  Photo,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Social Media",
  icon: Share,
  rank: 64,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface SocialLinkItem {
  id: string
  platform: string
  name: string
  url: string
  icon: string
  custom_icon_url?: string | null
  label?: string | null
  is_active: boolean
  display_order: number
  open_in_new_tab: boolean
  created_at?: string
  updated_at?: string
}

interface SectionSettings {
  section_key: string
  is_enabled: boolean
  title?: string
  subtitle?: string
  description?: string
}

const PRESET_PLATFORMS = [
  { key: "linkedin", name: "LinkedIn", defaultUrl: "https://www.linkedin.com/company/" },
  { key: "youtube", name: "YouTube", defaultUrl: "https://www.youtube.com/@" },
  { key: "twitter", name: "X (Twitter)", defaultUrl: "https://x.com/" },
  { key: "facebook", name: "Facebook", defaultUrl: "https://www.facebook.com/" },
  { key: "instagram", name: "Instagram", defaultUrl: "https://www.instagram.com/" },
  { key: "threads", name: "Threads", defaultUrl: "https://www.threads.net/@" },
  { key: "tiktok", name: "TikTok", defaultUrl: "https://www.tiktok.com/@" },
  { key: "pinterest", name: "Pinterest", defaultUrl: "https://www.pinterest.com/" },
  { key: "whatsapp", name: "WhatsApp", defaultUrl: "https://wa.me/" },
  { key: "telegram", name: "Telegram", defaultUrl: "https://t.me/" },
  { key: "custom", name: "Custom Platform", defaultUrl: "https://" },
]

export default function SocialMediaAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [links, setLinks] = useState<SocialLinkItem[]>([])
  const [settings, setSettings] = useState<SectionSettings>({
    section_key: "social_media",
    is_enabled: true,
    title: "Follow Us On",
    subtitle: "Stay Connected with AcademyIO",
    description: "Follow our official channels for the latest webinar announcements, CPE updates, and tax law analysis.",
  })
  const [loading, setLoading] = useState(false)
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<SocialLinkItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewLink, setPreviewLink] = useState<SocialLinkItem | null>(null)
  const [deleteLink, setDeleteLink] = useState<SocialLinkItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)

  // Form State
  const initialForm = {
    platform: "linkedin",
    name: "LinkedIn",
    url: "",
    icon: "linkedin",
    custom_icon_url: "",
    label: "",
    is_active: true,
    display_order: 1,
    open_in_new_tab: true,
  }
  const [formData, setFormData] = useState(initialForm)

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/social-media", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load social media links")
      const data = await res.json()
      setLinks(data.social_links || [])
      if (data.settings) setSettings(data.settings)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  // Toggle Global Master Switch
  const handleToggleGlobalSwitch = async () => {
    setIsUpdatingSettings(true)
    const nextState = !settings.is_enabled
    try {
      const res = await fetch("/admin/social-media/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_enabled: nextState }),
      })
      if (!res.ok) throw new Error("Failed to update global switch")
      const data = await res.json()
      setSettings(data.settings || { ...settings, is_enabled: nextState })
      notify("success", `Follow Us On section ${nextState ? "activated" : "hidden"}`)
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsUpdatingSettings(false)
    }
  }

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingLink(null)
    setFormData({
      ...initialForm,
      display_order: links.length + 1,
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item: SocialLinkItem) => {
    setEditingLink(item)
    setFormData({
      platform: item.platform,
      name: item.name,
      url: item.url,
      icon: item.icon,
      custom_icon_url: item.custom_icon_url || "",
      label: item.label || "",
      is_active: item.is_active,
      display_order: item.display_order || 1,
      open_in_new_tab: item.open_in_new_tab,
    })
    setIsModalOpen(true)
  }

  // Handle Preset Platform Change in Form
  const handlePlatformChange = (pKey: string) => {
    const preset = PRESET_PLATFORMS.find((p) => p.key === pKey)
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        platform: pKey,
        name: preset.name,
        icon: pKey,
        url: prev.url && prev.url !== "https://" ? prev.url : preset.defaultUrl,
      }))
    }
  }

  // Handle Custom Icon Upload
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingIcon(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        const res = await fetch("/admin/social-media/upload", {
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
          throw new Error(err.message || "Failed to upload icon")
        }

        const data = await res.json()
        setFormData((prev) => ({
          ...prev,
          custom_icon_url: data.url,
          icon: "custom",
        }))
        notify("success", "Custom icon uploaded successfully")
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      notify("error", err.message)
    } finally {
      setIsUploadingIcon(false)
    }
  }

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.url.trim()) {
      notify("error", "Platform Name and Profile URL are required.")
      return
    }

    if (!formData.url.startsWith("http://") && !formData.url.startsWith("https://")) {
      notify("error", "URL must start with http:// or https://")
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingLink ? `/admin/social-media/${editingLink.id}` : "/admin/social-media"
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to save social media platform")
      }

      notify("success", editingLink ? `Updated ${formData.name} successfully` : `Added ${formData.name} successfully`)
      setIsModalOpen(false)
      fetchLinks()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (item: SocialLinkItem) => {
    try {
      const res = await fetch(`/admin/social-media/${item.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      notify("success", `${item.name} ${!item.is_active ? "activated" : "deactivated"}`)
      fetchLinks()
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteLink) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/admin/social-media/${deleteLink.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete platform")
      notify("success", `Deleted ${deleteLink.name} successfully`)
      setDeleteLink(null)
      fetchLinks()
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter links
  const filteredLinks = links.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchSearch) return false

    if (statusFilter === "active") return item.is_active
    if (statusFilter === "inactive") return !item.is_active
    return true
  })

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Share className="w-6 h-6 text-blue-600" />
            <Heading level="h1" className="text-2xl font-bold">
              Social Media Management
            </Heading>
            <Badge color="blue" size="small">
              {links.filter((l) => l.is_active).length} Active Channels
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Configure official social media links, custom platform icons, display order, and footer visibility.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <Button
            variant="secondary"
            onClick={fetchLinks}
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
            <span>Add Social Platform</span>
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
        <a
          href="/webapp/other-info"
          className="text-ui-fg-subtle hover:text-ui-fg-base pb-2 px-3 transition-colors"
        >
          Other Information
        </a>
        <span className="text-blue-600 border-b-2 border-blue-600 pb-2 px-3">
          Social Media ({links.length})
        </span>
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
              Global "Follow Us On" Section
            </span>
            <Badge color={settings.is_enabled ? "green" : "grey"} size="small">
              {settings.is_enabled ? "Enabled on Website" : "Hidden on Website"}
            </Badge>
          </div>
          <p className="text-xs text-ui-fg-subtle max-w-2xl leading-relaxed">
            When enabled, active social media links with valid URLs appear in the website footer. When disabled, the entire social media section is hidden without layout gaps.
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
            placeholder="Search platforms by name, handle, or URL..."
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
            All ({links.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === "active" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
            }`}
          >
            Active ({links.filter((l) => l.is_active).length})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded-lg transition-colors ${
              statusFilter === "inactive" ? "bg-white dark:bg-slate-800 text-ui-fg-base shadow-2xs" : "text-ui-fg-subtle"
            }`}
          >
            Inactive ({links.filter((l) => !l.is_active).length})
          </button>
        </div>
      </div>

      {/* Grid of Social Media Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLinks.map((item) => (
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-ui-border-base flex items-center justify-center font-bold text-xs shrink-0 text-blue-600 dark:text-blue-400">
                    {item.custom_icon_url ? (
                      <img src={item.custom_icon_url} alt={item.name} className="w-5 h-5 object-contain" />
                    ) : (
                      <span className="uppercase text-[11px] font-black">{item.platform.slice(0, 3)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ui-fg-base leading-snug">{item.name}</h3>
                    <span className="text-[11px] text-ui-fg-subtle capitalize">
                      {item.platform}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewLink(item)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                    title="Preview on Website"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle"
                    title="Edit Platform"
                  >
                    <PencilSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteLink(item)}
                    className="p-1 rounded-lg text-ui-fg-subtle hover:text-rose-600 hover:bg-ui-bg-subtle"
                    title="Delete Platform"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* URL */}
              <div className="pt-2 border-t border-ui-border-base space-y-1 text-xs">
                <span className="text-[10px] text-ui-fg-subtle uppercase tracking-wider font-bold block">
                  Profile URL
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all flex items-center gap-1 font-medium"
                >
                  <span className="truncate">{item.url}</span>
                  <ArrowUpRightOnBox className="w-3 h-3 shrink-0" />
                </a>
              </div>

              {item.label && (
                <div className="text-[11px] text-ui-fg-subtle">
                  <span>Display Label: </span>
                  <span className="font-semibold text-ui-fg-base">{item.label}</span>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="pt-3 border-t border-ui-border-base flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[11px] text-ui-fg-subtle">
                <span>Order: #{item.display_order}</span>
                <span>•</span>
                <span>{item.open_in_new_tab ? "New Tab" : "Same Tab"}</span>
              </div>

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
        ))}
      </div>

      {filteredLinks.length === 0 && !loading && (
        <div className="text-center py-16 bg-ui-bg-subtle rounded-2xl border border-ui-border-base space-y-3">
          <Share className="w-10 h-10 mx-auto text-ui-fg-subtle opacity-50" />
          <h3 className="font-bold text-ui-fg-base">No social media links found</h3>
          <p className="text-xs text-ui-fg-subtle">
            {searchQuery ? "Try clearing your search query." : "Click Add Social Platform to configure a new social channel."}
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-4">
              <div>
                <h2 className="text-lg font-bold text-ui-fg-base">
                  {editingLink ? `Edit Platform: ${editingLink.name}` : "Add Social Platform"}
                </h2>
                <p className="text-xs text-ui-fg-subtle mt-0.5">
                  Configure social profile URL, platform icon, and open behavior.
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
              {/* Preset Selector */}
              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Select Platform Preset
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                >
                  {PRESET_PLATFORMS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">
                    Platform Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. LinkedIn"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-ui-fg-base block mb-1">Optional Label</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g. Follow on LinkedIn"
                    className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ui-fg-base block mb-1">
                  Profile / Channel URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://www.linkedin.com/company/academyio"
                  className="w-full px-3 py-2 rounded-xl border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-ui-fg-subtle mt-0.5 block">
                  Must begin with http:// or https:// (secure protocol required)
                </span>
              </div>

              {/* Custom Icon Upload */}
              <div className="rounded-xl border border-ui-border-base p-4 bg-ui-bg-subtle space-y-2">
                <label className="font-bold text-ui-fg-base block">Custom Platform Icon (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-ui-border-base flex items-center justify-center shrink-0">
                    {formData.custom_icon_url ? (
                      <img src={formData.custom_icon_url} alt="Icon Preview" className="w-5 h-5 object-contain" />
                    ) : (
                      <Photo className="w-5 h-5 text-ui-fg-subtle" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-ui-border-base hover:bg-ui-bg-subtle cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                      <Photo className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isUploadingIcon ? "Uploading..." : "Upload Icon File"}</span>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        className="hidden"
                        onChange={handleIconUpload}
                        disabled={isUploadingIcon}
                      />
                    </label>
                    <span className="text-[10px] text-ui-fg-subtle block">Leave empty to use standard brand SVG</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
                      checked={formData.open_in_new_tab}
                      onChange={(e) => setFormData({ ...formData, open_in_new_tab: e.target.checked })}
                      className="rounded border-ui-border-base text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-ui-fg-base">Open in New Tab</span>
                  </label>
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
                  {isSubmitting ? "Saving..." : editingLink ? "Save Changes" : "Add Platform"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ExclamationCircle className="w-6 h-6" />
              <h3 className="font-bold text-base text-ui-fg-base">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-ui-fg-subtle leading-relaxed">
              Are you sure you want to delete <strong className="text-ui-fg-base">{deleteLink.name}</strong>?
              It will immediately be removed from the website footer.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteLink(null)}
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
                {isDeleting ? "Deleting..." : "Delete Platform"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-ui-fg-base">Footer Social Link Preview</h3>
              </div>
              <button
                onClick={() => setPreviewLink(null)}
                className="p-1 rounded-lg text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-3 text-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Follow Us On
              </span>

              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={previewLink.url}
                  target={previewLink.open_in_new_tab ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-blue-600 text-gray-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all shadow-xs"
                  title={previewLink.name}
                >
                  {previewLink.custom_icon_url ? (
                    <img src={previewLink.custom_icon_url} alt={previewLink.name} className="w-4 h-4 object-contain" />
                  ) : (
                    <span className="text-xs font-black uppercase">{previewLink.platform.slice(0, 2)}</span>
                  )}
                </a>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Opens: <span className="text-blue-400 font-mono text-[11px]">{previewLink.url}</span>
              </p>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setPreviewLink(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
