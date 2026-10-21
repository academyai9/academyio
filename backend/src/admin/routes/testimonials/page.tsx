import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ChatBubbleLeftRight,
  Plus,
  Trash,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Eye,
  ExclamationCircle,
  Sparkles,
  Star,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Testimonials",
  icon: ChatBubbleLeftRight,
  rank: 65,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface TestimonialItem {
  id: string
  customer_name: string
  designation: string
  company?: string | null
  avatar_url?: string | null
  content: string
  rating: number
  is_published: boolean
  featured_homepage: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export default function TestimonialsAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all")
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TestimonialItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<TestimonialItem | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    customer_name: "",
    designation: "",
    company: "",
    avatar_url: "",
    content: "",
    rating: 5,
    is_published: true,
    featured_homepage: true,
    display_order: 0,
  })

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const fetchTestimonials = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/testimonials", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load testimonials")
      const data = await res.json()
      setTestimonials(data.testimonials || [])
    } catch (e: any) {
      notify("error", e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      customer_name: "",
      designation: "",
      company: "",
      avatar_url: "",
      content: "",
      rating: 5,
      is_published: true,
      featured_homepage: true,
      display_order: testimonials.length + 1,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (t: TestimonialItem) => {
    setEditingItem(t)
    setFormData({
      customer_name: t.customer_name,
      designation: t.designation,
      company: t.company || "",
      avatar_url: t.avatar_url || "",
      content: t.content,
      rating: t.rating || 5,
      is_published: t.is_published,
      featured_homepage: t.featured_homepage,
      display_order: t.display_order || 0,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingItem
        ? `/admin/testimonials/${editingItem.id}`
        : "/admin/testimonials"

      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || "Failed to save testimonial")
      }

      notify("success", editingItem ? "Testimonial updated successfully" : "Testimonial created successfully")
      setIsModalOpen(false)
      fetchTestimonials()
    } catch (err: any) {
      notify("error", err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTogglePublish = async (t: TestimonialItem) => {
    try {
      const res = await fetch(`/admin/testimonials/${t.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_published: !t.is_published }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      notify("success", `Testimonial ${!t.is_published ? "published" : "unpublished"}`)
      fetchTestimonials()
    } catch (err: any) {
      notify("error", err.message)
    }
  }

  const handleDelete = async (t: TestimonialItem) => {
    if (!confirm(`Are you sure you want to delete testimonial by "${t.customer_name}"?`)) return

    try {
      const res = await fetch(`/admin/testimonials/${t.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete testimonial")
      notify("success", "Testimonial deleted successfully")
      fetchTestimonials()
    } catch (err: any) {
      notify("error", err.message)
    }
  }

  // Filtered
  const filtered = testimonials.filter((t) => {
    const matchesSearch =
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.company && t.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())

    if (statusFilter === "published") return matchesSearch && t.is_published
    if (statusFilter === "draft") return matchesSearch && !t.is_published
    return matchesSearch
  })

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Heading level="h1" className="text-2xl font-bold">Client Testimonials Management</Heading>
            <Badge color="blue" size="small">Social Proof</Badge>
          </div>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Manage authenticated customer testimonials, professional designations, star ratings, and homepage placement.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          <Button
            variant="secondary"
            onClick={fetchTestimonials}
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
            <span>Add Testimonial</span>
          </Button>
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
          <div className="flex items-center gap-2 text-sm font-medium">
            {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-ui-bg-subtle p-5 rounded-2xl border border-ui-border-base">
          <Text className="text-xs font-semibold text-ui-fg-muted uppercase tracking-wider">Total Testimonials</Text>
          <div className="text-3xl font-extrabold text-ui-fg-base mt-1">{testimonials.length}</div>
        </div>
        <div className="bg-ui-bg-subtle p-5 rounded-2xl border border-ui-border-base">
          <Text className="text-xs font-semibold text-ui-fg-muted uppercase tracking-wider">Published Online</Text>
          <div className="text-3xl font-extrabold text-emerald-600 mt-1">
            {testimonials.filter((t) => t.is_published).length}
          </div>
        </div>
        <div className="bg-ui-bg-subtle p-5 rounded-2xl border border-ui-border-base">
          <Text className="text-xs font-semibold text-ui-fg-muted uppercase tracking-wider">Featured on Homepage</Text>
          <div className="text-3xl font-extrabold text-blue-600 mt-1">
            {testimonials.filter((t) => t.featured_homepage && t.is_published).length}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by client, firm, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "all" ? "bg-blue-600 text-white" : "bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-base"
            }`}
          >
            All ({testimonials.length})
          </button>
          <button
            onClick={() => setStatusFilter("published")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "published" ? "bg-emerald-600 text-white" : "bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-base"
            }`}
          >
            Published ({testimonials.filter((t) => t.is_published).length})
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "draft" ? "bg-amber-600 text-white" : "bg-ui-bg-subtle text-ui-fg-subtle hover:bg-ui-bg-base"
            }`}
          >
            Drafts ({testimonials.filter((t) => !t.is_published).length})
          </button>
        </div>
      </div>

      {/* Testimonials Table */}
      <div className="bg-ui-bg-base rounded-2xl border border-ui-border-base overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ui-bg-subtle border-b border-ui-border-base text-xs font-bold text-ui-fg-muted uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Client / Author</th>
                <th className="py-3.5 px-4">Designation & Firm</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Testimonial Quote</th>
                <th className="py-3.5 px-4">Homepage</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border-base">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ui-fg-muted">
                    No testimonials found. Click "Add Testimonial" to create one.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-ui-bg-subtle/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-ui-fg-muted">
                      #{item.display_order}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {item.avatar_url ? (
                          <img
                            src={item.avatar_url}
                            alt={item.customer_name}
                            className="w-9 h-9 rounded-full object-cover border border-ui-border-base shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {item.customer_name.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold text-ui-fg-base">{item.customer_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-medium text-ui-fg-base">{item.designation}</div>
                      {item.company && (
                        <div className="text-[11px] text-ui-fg-muted mt-0.5">{item.company}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center text-amber-500 text-xs">
                        {"★".repeat(item.rating || 5)}
                        <span className="text-[10px] text-ui-fg-muted ml-1">({item.rating}/5)</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-xs text-ui-fg-subtle truncate" title={item.content}>
                        "{item.content}"
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.featured_homepage ? (
                        <Badge color="blue" size="small">Featured</Badge>
                      ) : (
                        <span className="text-xs text-ui-fg-muted">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePublish(item)}
                        title="Click to toggle publish"
                        className="cursor-pointer"
                      >
                        <Badge color={item.is_published ? "green" : "grey"} size="small">
                          {item.is_published ? "Published" : "Draft"}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle transition-colors"
                          title="Preview Testimonial"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-blue-600 hover:bg-ui-bg-subtle transition-colors"
                          title="Edit Testimonial"
                        >
                          <PencilSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg text-ui-fg-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Testimonial"
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
      </div>

      {/* Add / Edit Testimonial Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95 my-8">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-4">
              <Heading level="h2" className="text-lg font-bold">
                {editingItem ? "Edit Testimonial" : "Create New Client Testimonial"}
              </Heading>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ui-fg-subtle hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ui-fg-base block mb-1">
                    Client Full Name *
                  </label>
                  <Input
                    placeholder="e.g. David M. Sterling, CPA"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ui-fg-base block mb-1">
                    Designation / Title *
                  </label>
                  <Input
                    placeholder="e.g. Managing Partner, Tax Practice"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ui-fg-base block mb-1">
                    Company / Firm Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Sterling & Higgins CPAs, LLP"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ui-fg-base block mb-1">
                    Photo / Avatar URL (Optional)
                  </label>
                  <Input
                    placeholder="https://... or /avatars/..."
                    value={formData.avatar_url}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ui-fg-base block mb-1">
                  Testimonial Quote / Review *
                </label>
                <textarea
                  className="w-full text-xs p-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:bg-ui-bg-base transition-colors leading-relaxed min-h-[110px]"
                  placeholder="Enter genuine professional feedback praising course depth, instructor case studies, or CPE accreditation..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-ui-fg-base block mb-1">
                    Star Rating (1 - 5)
                  </label>
                  <select
                    className="w-full text-xs p-2.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                  >
                    <option value={5}>5 Stars (★★★★★)</option>
                    <option value={4}>4 Stars (★★★★☆)</option>
                    <option value={3}>3 Stars (★★★☆☆)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-ui-fg-base block mb-1">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex flex-col justify-end space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ui-fg-base">
                    <input
                      type="checkbox"
                      checked={formData.featured_homepage}
                      onChange={(e) => setFormData({ ...formData, featured_homepage: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Show on Homepage</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ui-fg-base">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Publish Immediately</span>
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
                  {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Create Testimonial"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Live Storefront Card Preview</span>
              <button onClick={() => setPreviewItem(null)}>
                <XMark className="w-5 h-5 text-ui-fg-subtle hover:text-ui-fg-base" />
              </button>
            </div>

            {/* Testimonial Card as displayed in storefront */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-md space-y-4">
              <div className="flex items-center gap-1 text-amber-500">
                {"★".repeat(previewItem.rating || 5)}
              </div>

              <p className="text-sm text-gray-700 dark:text-slate-300 italic leading-relaxed">
                "{previewItem.content}"
              </p>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3">
                {previewItem.avatar_url ? (
                  <img
                    src={previewItem.avatar_url}
                    alt={previewItem.customer_name}
                    className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-slate-700 shadow-xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center">
                    {previewItem.customer_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{previewItem.customer_name}</h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{previewItem.designation}</p>
                  {previewItem.company && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">{previewItem.company}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center">
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
