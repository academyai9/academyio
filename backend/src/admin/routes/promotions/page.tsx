import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Tag,
  MagnifyingGlass,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  Sparkles,
  PencilSquare,
  Trash,
  Plus,
  Eye,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Promotions & Banners",
  icon: Tag,
  rank: 60,
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

interface PromotionalBanner {
  id: string
  title: string
  description: string
  discount_text: string
  coupon_code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  start_date?: string | null
  end_date?: string | null
  timezone: string
  cta_text: string
  cta_url?: string | null
  style_preset: "festive_amber" | "navy_blue" | "emerald_green" | "sunset_orange" | "purple_luxury" | "dark_gold"
  bg_color?: string | null
  text_color?: string | null
  accent_color?: string | null
  icon: string
  show_countdown: boolean
  terms_url?: string | null
  scope: "all" | "categories" | "webinars"
  target_categories?: string[]
  target_webinar_ids?: string[]
  target_options?: string[]
  priority: number
  is_active: boolean
  medusa_promotion_id?: string | null
  status?: "Active" | "Scheduled" | "Expired" | "Disabled"
  created_at: string
  updated_at: string
}

const STYLE_PRESETS = [
  { id: "festive_amber", label: "Thanksgiving Amber", bg: "bg-amber-600", text: "text-white", border: "border-amber-700" },
  { id: "navy_blue", label: "Executive Navy", bg: "bg-blue-900", text: "text-white", border: "border-blue-950" },
  { id: "emerald_green", label: "Emerald Success", bg: "bg-emerald-700", text: "text-white", border: "border-emerald-800" },
  { id: "sunset_orange", label: "Sunset Autumn", bg: "bg-orange-600", text: "text-white", border: "border-orange-700" },
  { id: "purple_luxury", label: "Royal Cyber", bg: "bg-purple-800", text: "text-white", border: "border-purple-900" },
  { id: "dark_gold", label: "Black Friday Gold", bg: "bg-slate-950", text: "text-amber-300", border: "border-amber-500/40" },
]

const ICON_CHOICES = ["🎉", "🦃", "⚡", "🎁", "🏷️", "🎓", "🔥", "✨"]

const AVAILABLE_CATEGORIES = [
  "Accounting",
  "Taxation",
  "Healthcare",
  "Housing",
  "Human Resources & Payroll",
  "Technology",
]

export default function PromotionalBannersPage() {
  const { isDark } = useAdminTheme()
  const [banners, setBanners] = useState<PromotionalBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [scopeFilter, setScopeFilter] = useState("all")
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Drawer / Modal for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null)
  const [saving, setSaving] = useState(false)

  // Form State
  const [formTitle, setFormTitle] = useState("Thanksgiving Day Sale")
  const [formDescription, setFormDescription] = useState("Save 20% on all accredited continuing education webinars! Use code at checkout.")
  const [formDiscountText, setFormDiscountText] = useState("Save 20%")
  const [formCouponCode, setFormCouponCode] = useState("THANKS20")
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [formDiscountValue, setFormDiscountValue] = useState<number>(20)
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")
  const [formTimezone, setFormTimezone] = useState("America/New_York")
  const [formCtaText, setFormCtaText] = useState("Use Code")
  const [formStylePreset, setFormStylePreset] = useState<any>("festive_amber")
  const [formIcon, setFormIcon] = useState("🦃")
  const [formShowCountdown, setFormShowCountdown] = useState(true)
  const [formTermsUrl, setFormTermsUrl] = useState("")
  const [formScope, setFormScope] = useState<"all" | "categories" | "webinars">("all")
  const [formTargetCategories, setFormTargetCategories] = useState<string[]>([])
  const [formPriority, setFormPriority] = useState<number>(100)
  const [formIsActive, setFormIsActive] = useState<boolean>(true)

  const fetchBanners = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (scopeFilter !== "all") params.set("scope", scopeFilter)

      const res = await fetch(`/admin/promotions/banners?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setBanners(data.banners || [])
      }
    } catch (err) {
      console.error("Error fetching promotional banners:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [search, statusFilter, scopeFilter])

  const openCreateModal = () => {
    setEditingBanner(null)
    setFormTitle("Thanksgiving Day Sale")
    setFormDescription("Save 20% on all accredited continuing education webinars! Use code at checkout.")
    setFormDiscountText("Save 20%")
    setFormCouponCode("THANKS20")
    setFormDiscountType("percentage")
    setFormDiscountValue(20)
    setFormStartDate("")
    // Default expiration: 14 days from now
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setFormEndDate(d.toISOString().slice(0, 16))
    setFormTimezone("America/New_York")
    setFormCtaText("Use Code")
    setFormStylePreset("festive_amber")
    setFormIcon("🦃")
    setFormShowCountdown(true)
    setFormTermsUrl("")
    setFormScope("all")
    setFormTargetCategories([])
    setFormPriority(100)
    setFormIsActive(true)
    setIsModalOpen(true)
  }

  const openEditModal = (b: PromotionalBanner) => {
    setEditingBanner(b)
    setFormTitle(b.title)
    setFormDescription(b.description)
    setFormDiscountText(b.discount_text)
    setFormCouponCode(b.coupon_code)
    setFormDiscountType(b.discount_type)
    setFormDiscountValue(b.discount_value)
    setFormStartDate(b.start_date ? new Date(b.start_date).toISOString().slice(0, 16) : "")
    setFormEndDate(b.end_date ? new Date(b.end_date).toISOString().slice(0, 16) : "")
    setFormTimezone(b.timezone || "America/New_York")
    setFormCtaText(b.cta_text || "Use Code")
    setFormStylePreset(b.style_preset || "festive_amber")
    setFormIcon(b.icon || "🎉")
    setFormShowCountdown(b.show_countdown !== false)
    setFormTermsUrl(b.terms_url || "")
    setFormScope(b.scope)
    setFormTargetCategories(b.target_categories || [])
    setFormPriority(b.priority || 100)
    setFormIsActive(b.is_active !== false)
    setIsModalOpen(true)
  }

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setNotice(null)

    const payload = {
      title: formTitle,
      description: formDescription,
      discount_text: formDiscountText,
      coupon_code: formCouponCode,
      discount_type: formDiscountType,
      discount_value: formDiscountValue,
      start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
      end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
      timezone: formTimezone,
      cta_text: formCtaText,
      style_preset: formStylePreset,
      icon: formIcon,
      show_countdown: formShowCountdown,
      terms_url: formTermsUrl || null,
      scope: formScope,
      target_categories: formTargetCategories,
      priority: Number(formPriority),
      is_active: formIsActive,
    }

    try {
      const url = editingBanner
        ? `/admin/promotions/banners/${editingBanner.id}`
        : `/admin/promotions/banners`
      const method = editingBanner ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setNotice({
          type: "success",
          text: editingBanner
            ? "Promotional banner updated and coupon synced successfully!"
            : "Promotional banner created and coupon synced successfully!",
        })
        setIsModalOpen(false)
        fetchBanners()
      } else {
        setNotice({ type: "error", text: data.message || "Failed to save promotional banner." })
      }
    } catch (err: any) {
      setNotice({ type: "error", text: err.message || "An unexpected network error occurred." })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (bannerId: string) => {
    try {
      const res = await fetch(`/admin/promotions/banners/${bannerId}/toggle`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        fetchBanners()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteBanner = async (bannerId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the promotional banner "${title}"?`)) return
    try {
      const res = await fetch(`/admin/promotions/banners/${bannerId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        setNotice({ type: "success", text: `Deleted banner "${title}".` })
        fetchBanners()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Summary Metrics
  const activeCount = banners.filter((b) => b.status === "Active").length
  const scheduledCount = banners.filter((b) => b.status === "Scheduled").length
  const expiredCount = banners.filter((b) => b.status === "Expired").length

  return (
    <Container className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <Heading level="h1" className="text-2xl font-bold tracking-tight">
                Promotional Banners & Coupons
              </Heading>
              <Text className="text-ui-fg-muted text-xs">
                Manage seasonal sale strips (Thanksgiving, Black Friday, etc.), coupon codes, and webinar banner targeting.
              </Text>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="small" onClick={fetchBanners}>
            <ArrowPath className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button variant="primary" size="small" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Promotional Banner
          </Button>
          <AdminThemeToggle />
        </div>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            notice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="cursor-pointer">
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-1">
          <div className="text-xs font-bold text-ui-fg-muted uppercase tracking-wider">Total Promotions</div>
          <div className="text-2xl font-extrabold text-ui-fg-base">{banners.length}</div>
          <div className="text-[11px] text-ui-fg-muted">All configured seasonal offers</div>
        </div>
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Live & Active</div>
          <div className="text-2xl font-extrabold text-emerald-600">{activeCount}</div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Currently displaying on webinars</div>
        </div>
        <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-1">
          <div className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Scheduled Ahead</div>
          <div className="text-2xl font-extrabold text-blue-600">{scheduledCount}</div>
          <div className="text-[11px] text-blue-700/80 dark:text-blue-300/80">Will auto-activate on start date</div>
        </div>
        <div className="p-5 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-1">
          <div className="text-xs font-bold text-ui-fg-muted uppercase tracking-wider">Expired Offers</div>
          <div className="text-2xl font-extrabold text-ui-fg-muted">{expiredCount}</div>
          <div className="text-[11px] text-ui-fg-muted">Auto-hidden past expiration date</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-ui-bg-subtle border border-ui-border-base">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-fg-muted" />
            <input
              type="text"
              placeholder="Search title, coupon code, discount text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
            <option value="Disabled">Disabled</option>
          </select>

          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-ui-bg-base border border-ui-border-base text-ui-fg-base focus:outline-none"
          >
            <option value="all">All Targeting</option>
            <option value="all_scope">All Webinars</option>
            <option value="categories">Specific Categories</option>
            <option value="webinars">Specific Webinars</option>
          </select>
        </div>
      </div>

      {/* Banners Listing Table */}
      <div className="border border-ui-border-base rounded-2xl overflow-hidden bg-ui-bg-base">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Promotion & Style</th>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Targeting</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border-base">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ui-fg-muted">
                    Loading promotional banners...
                  </td>
                </tr>
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ui-fg-muted">
                    No promotional banners found. Click &quot;Create Promotional Banner&quot; above to launch a campaign.
                  </td>
                </tr>
              ) : (
                banners.map((b) => {
                  const statusColor =
                    b.status === "Active"
                      ? "green"
                      : b.status === "Scheduled"
                      ? "blue"
                      : b.status === "Expired"
                      ? "grey"
                      : "orange"

                  return (
                    <tr key={b.id} className="hover:bg-ui-bg-subtle/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{b.icon}</span>
                          <div>
                            <div className="font-bold text-ui-fg-base">{b.title}</div>
                            <div className="text-[11px] text-ui-fg-muted truncate max-w-xs">{b.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs">
                          {b.coupon_code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-ui-fg-base">
                        {b.discount_text}
                      </td>
                      <td className="py-3 px-4">
                        {b.scope === "all" ? (
                          <Badge color="blue" size="small">All Webinars</Badge>
                        ) : b.scope === "categories" ? (
                          <div className="space-y-1">
                            <Badge color="purple" size="small">Categories ({b.target_categories?.length || 0})</Badge>
                            <div className="text-[10px] text-ui-fg-muted truncate max-w-[150px]">
                              {b.target_categories?.join(", ")}
                            </div>
                          </div>
                        ) : (
                          <Badge color="orange" size="small">Specific Webinars</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-ui-fg-muted">
                        <div>
                          <strong>End:</strong>{" "}
                          {b.end_date
                            ? new Date(b.end_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Ongoing"}
                        </div>
                        {b.start_date && (
                          <div className="text-[10px]">
                            Start: {new Date(b.start_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-ui-fg-subtle">
                        {b.priority}
                      </td>
                      <td className="py-3 px-4">
                        <Badge color={statusColor} size="small">{b.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleToggleActive(b.id)}
                            title={b.is_active ? "Deactivate" : "Activate"}
                          >
                            {b.is_active ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => openEditModal(b)}
                          >
                            <PencilSquare className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteBanner(b.id, b.title)}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-4">
              <div>
                <h3 className="font-bold text-lg text-ui-fg-base">
                  {editingBanner ? "Edit Promotional Offer Banner" : "Create New Promotional Offer Banner"}
                </h3>
                <p className="text-xs text-ui-fg-muted mt-0.5">
                  Configure campaign copy, coupon code, discount rules, and webinar targeting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-ui-bg-subtle text-ui-fg-muted cursor-pointer"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-6 text-xs">
              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-ui-fg-muted uppercase">
                  <span>Live Storefront Preview</span>
                  <Badge color="green" size="small">Webinar Strip Preview</Badge>
                </div>

                <div className="p-4 rounded-xl shadow-xs border bg-amber-600 text-white border-amber-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{formIcon}</span>
                    <div>
                      <div className="font-extrabold text-sm tracking-tight flex items-center gap-2">
                        <span>{formTitle}</span>
                        <span className="text-[11px] bg-black/20 px-2 py-0.5 rounded-full font-bold">
                          {formDiscountText}
                        </span>
                      </div>
                      <div className="text-xs text-white/90 mt-0.5 leading-snug">
                        {formDescription}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {formShowCountdown && (
                      <div className="text-center bg-black/25 px-2.5 py-1.5 rounded-lg border border-white/20">
                        <div className="text-[9px] uppercase font-bold text-white/80">Expires In</div>
                        <div className="font-mono font-bold text-xs">13d : 08h : 45m</div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-white text-slate-900 px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs">
                      <span>{formCouponCode}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">Copy</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Icon */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Promotion Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Thanksgiving Day Sale, Black Friday Special"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Icon</label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 text-base rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  >
                    {ICON_CHOICES.map((ic) => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description Message */}
              <div className="space-y-1.5">
                <label className="font-bold text-ui-fg-base">Promotional Description / Message *</label>
                <textarea
                  required
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Save 20% on all continuing professional education webinars! Use code at checkout."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                />
              </div>

              {/* Coupon Code & Discount Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={formCouponCode}
                    onChange={(e) => setFormCouponCode(e.target.value.toUpperCase())}
                    placeholder="THANKS20"
                    className="w-full font-mono font-bold px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Discount Type</label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Discount Value</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formDiscountValue}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setFormDiscountValue(val)
                      setFormDiscountText(formDiscountType === "percentage" ? `Save ${val}%` : `Save $${val}`)
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                </div>
              </div>

              {/* Display Discount Text & CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Discount Badge Text *</label>
                  <input
                    type="text"
                    required
                    value={formDiscountText}
                    onChange={(e) => setFormDiscountText(e.target.value)}
                    placeholder="e.g. Save 20% or Save $25"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Button CTA Text</label>
                  <input
                    type="text"
                    value={formCtaText}
                    onChange={(e) => setFormCtaText(e.target.value)}
                    placeholder="Use Code"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Start Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                  <span className="text-[10px] text-ui-fg-muted">Leave blank to activate immediately.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Expiration Date & Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                  <span className="text-[10px] text-ui-fg-muted">Banner automatically hides after this date.</span>
                </div>
              </div>

              {/* Countdown & Preset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-ui-border-base">
                <div className="space-y-2">
                  <label className="font-bold text-ui-fg-base">Color & Theme Preset</label>
                  <select
                    value={formStylePreset}
                    onChange={(e) => setFormStylePreset(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  >
                    {STYLE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-center space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-ui-fg-base">
                    <input
                      type="checkbox"
                      checked={formShowCountdown}
                      onChange={(e) => setFormShowCountdown(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span>Display Countdown Timer on Banner</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-ui-fg-base">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span>Promotion is Active & Published</span>
                  </label>
                </div>
              </div>

              {/* Webinar Scope Targeting */}
              <div className="space-y-3 pt-2 border-t border-ui-border-base">
                <label className="font-bold text-ui-fg-base">Webinar Targeting Scope</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormScope("all")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formScope === "all"
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold"
                        : "bg-ui-bg-subtle border-ui-border-base text-ui-fg-muted"
                    }`}
                  >
                    <div>All Webinars</div>
                    <div className="text-[10px] font-normal mt-0.5">Applies across the entire catalog</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("categories")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formScope === "categories"
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold"
                        : "bg-ui-bg-subtle border-ui-border-base text-ui-fg-muted"
                    }`}
                  >
                    <div>Selected Categories</div>
                    <div className="text-[10px] font-normal mt-0.5">Applies to specific topics only</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormScope("webinars")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formScope === "webinars"
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-bold"
                        : "bg-ui-bg-subtle border-ui-border-base text-ui-fg-muted"
                    }`}
                  >
                    <div>Selected Webinars</div>
                    <div className="text-[10px] font-normal mt-0.5">Applies to targeted webinar IDs</div>
                  </button>
                </div>

                {formScope === "categories" && (
                  <div className="p-3 rounded-xl bg-ui-bg-subtle border border-ui-border-base space-y-2">
                    <span className="font-semibold text-ui-fg-base">Select Eligible Webinar Categories:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AVAILABLE_CATEGORIES.map((cat) => {
                        const isChecked = formTargetCategories.includes(cat)
                        return (
                          <label key={cat} className="flex items-center gap-2 cursor-pointer text-ui-fg-subtle">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormTargetCategories([...formTargetCategories, cat])
                                } else {
                                  setFormTargetCategories(formTargetCategories.filter((c) => c !== cat))
                                }
                              }}
                            />
                            <span>{cat}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Priority & Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-ui-border-base">
                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Display Priority (Higher = First)</label>
                  <input
                    type="number"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                  <span className="text-[10px] text-ui-fg-muted">When multiple offers apply, the highest priority banner shows.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-ui-fg-base">Terms & Conditions URL (Optional)</label>
                  <input
                    type="text"
                    value={formTermsUrl}
                    onChange={(e) => setFormTermsUrl(e.target.value)}
                    placeholder="/us/terms"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg-subtle border border-ui-border-base text-ui-fg-base focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? "Saving Campaign..." : editingBanner ? "Save Changes" : "Publish Promotional Banner"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  )
}
