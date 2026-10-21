import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Folder,
  Plus,
  Trash,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Eye,
  ExclamationCircle,
  Sparkles,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Categories",
  icon: Folder,
  rank: 21,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface CategoryItem {
  id: string
  name: string
  handle: string
  description: string
  rank: number
  is_active: boolean
  metadata?: {
    icon?: string
    color?: string
    badge?: string
    image?: string
  }
  webinars_count: number
  created_at?: string
  updated_at?: string
  webinars?: Array<{
    id: string
    title: string
    slug: string
    event_date: string
    status: string
    is_upcoming: boolean
    is_ondemand: boolean
    cpe_credits: number
    speaker_name: string
  }>
}

export default function CategoriesAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // View associated webinars modal
  const [viewingCategoryWebinars, setViewingCategoryWebinars] = useState<CategoryItem | null>(null)
  const [categoryWebinars, setCategoryWebinars] = useState<any[]>([])
  const [loadingWebinars, setLoadingWebinars] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    description: "",
    rank: 0,
    is_active: true,
    icon: "Calculator",
    color: "blue",
    badge: "",
    image: "",
  })

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 6000)
  }

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/categories", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load categories")
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err: any) {
      notify("error", err.message || "Failed to fetch categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleOpenCreateModal = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      handle: "",
      description: "",
      rank: categories.length,
      is_active: true,
      icon: "Folder",
      color: "blue",
      badge: "",
      image: "",
    })
    setIsEditModalOpen(true)
  }

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat)
    setFormData({
      name: cat.name,
      handle: cat.handle,
      description: cat.description || "",
      rank: cat.rank || 0,
      is_active: cat.is_active !== false,
      icon: cat.metadata?.icon || "Folder",
      color: cat.metadata?.color || "blue",
      badge: cat.metadata?.badge || "",
      image: cat.metadata?.image || "",
    })
    setIsEditModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      notify("error", "Category name is required")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: formData.name.trim(),
        handle: formData.handle.trim() || undefined,
        description: formData.description.trim(),
        rank: Number(formData.rank),
        is_active: formData.is_active,
        metadata: {
          icon: formData.icon,
          color: formData.color,
          badge: formData.badge,
          image: formData.image,
        },
      }

      const url = editingCategory ? `/admin/categories/${editingCategory.id}` : "/admin/categories"
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Failed to save category")
      }

      notify(
        "success",
        editingCategory
          ? `Category '${payload.name}' updated successfully. All associated webinars remain preserved.`
          : `Category '${payload.name}' created successfully.`
      )
      setIsEditModalOpen(false)
      fetchCategories()
    } catch (err: any) {
      notify("error", err.message || "Error saving category")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (cat.webinars_count > 0) {
      notify(
        "error",
        `Cannot delete '${cat.name}' because ${cat.webinars_count} webinar(s) are assigned to it. Reassign or delete those webinars first.`
      )
      return
    }

    if (!confirm(`Are you sure you want to delete the category '${cat.name}'?`)) {
      return
    }

    try {
      const res = await fetch(`/admin/categories/${cat.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete category")
      }

      notify("success", `Category '${cat.name}' deleted successfully.`)
      fetchCategories()
    } catch (err: any) {
      notify("error", err.message || "Error deleting category")
    }
  }

  const handleViewWebinars = async (cat: CategoryItem) => {
    setViewingCategoryWebinars(cat)
    setLoadingWebinars(true)
    try {
      const res = await fetch(`/admin/categories/${cat.id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok && data.category) {
        setCategoryWebinars(data.category.webinars || [])
      }
    } catch (err) {
      setCategoryWebinars([])
    } finally {
      setLoadingWebinars(false)
    }
  }

  const filteredCategories = categories.filter((c) => {
    const q = searchQuery.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  })

  return (
    <div className={`min-h-screen p-6 transition-colors duration-200 ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                <Folder className="w-5 h-5" />
              </span>
              <div>
                <Heading level="h1" className="text-xl sm:text-2xl font-bold">
                  Categories & Subject Areas
                </Heading>
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                  Manage the official curriculum disciplines, assign webinars, and control storefront topic navigation.
                </Text>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
            <Button
              variant="secondary"
              size="small"
              onClick={fetchCategories}
              disabled={loading}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="cursor-pointer text-neutral-400 hover:text-neutral-600">
              <XMark className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Statistics & Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs text-neutral-500 uppercase font-semibold">Active Categories</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-neutral-900 dark:text-white">
                {categories.filter((c) => c.is_active).length}
              </span>
              <span className="text-xs text-neutral-500">of {categories.length} Total</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs text-neutral-500 uppercase font-semibold">Total Assigned Webinars</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {categories.reduce((acc, c) => acc + (c.webinars_count || 0), 0)}
              </span>
              <span className="text-xs text-neutral-500">Live & On-Demand Courses</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <span className="text-xs text-neutral-500 uppercase font-semibold">Storefront Topic Route</span>
            <div className="flex items-center gap-1.5 mt-2">
              <code className="text-xs font-mono px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-blue-700 dark:text-blue-300">
                /courses-by-topics/[slug]
              </code>
            </div>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search categories by name, slug, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2 px-3 pl-8 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="absolute left-2.5 top-2.5 text-neutral-400">
              <Folder className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xs text-neutral-500">
            Showing <strong>{filteredCategories.length}</strong> categories
          </span>
        </div>

        {/* Categories Table */}
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 font-bold">Rank</th>
                <th className="p-4 font-bold">Category Name & Slug</th>
                <th className="p-4 font-bold">Description</th>
                <th className="p-4 font-bold">Webinars</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-neutral-500">{cat.rank}</td>
                  <td className="p-4">
                    <div className="font-bold text-neutral-900 dark:text-white text-sm">{cat.name}</div>
                    <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                      /{cat.handle}
                    </div>
                  </td>
                  <td className="p-4 max-w-md">
                    <p className="text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                      {cat.description || "No description provided."}
                    </p>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleViewWebinars(cat)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors font-bold cursor-pointer"
                      title="Click to view webinars"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{cat.webinars_count} Courses</span>
                    </button>
                  </td>
                  <td className="p-4">
                    {cat.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-[10px]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit category"
                      >
                        <PencilSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Delete category"
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

        {/* Edit / Create Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    <Folder className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                      {editingCategory ? `Edit Category: ${editingCategory.name}` : "Create New Category"}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Changes will automatically sync across the Courses by Topics page and all course listings.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <XMark className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-bold mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setFormData({
                        ...formData,
                        name,
                        handle: editingCategory
                          ? formData.handle
                          : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                      })
                    }}
                    placeholder="e.g. Accounting, Healthcare, Housing"
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-bold mb-1">
                    URL Slug / Handle *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-r-0 border-neutral-200 dark:border-neutral-700 rounded-l-xl text-neutral-500 font-mono text-[11px]">
                      /courses-by-topics/
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.handle}
                      onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                      placeholder="accounting"
                      className="w-full p-2.5 rounded-r-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-bold mb-1">
                    Category Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a concise description of the subject area covered by this category."
                    className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-700 dark:text-neutral-300 font-bold mb-1">
                      Display Rank (Order)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-700 dark:text-neutral-300 font-bold mb-1">
                      Icon Identifier
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
                    >
                      <option value="Calculator">Calculator (Accounting)</option>
                      <option value="HeartPulse">HeartPulse (Healthcare)</option>
                      <option value="Building2">Building2 (Housing)</option>
                      <option value="Users">Users (HR & Payroll)</option>
                      <option value="Landmark">Landmark (Taxation)</option>
                      <option value="Cpu">Cpu (Technology)</option>
                      <option value="Folder">Folder (Generic)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-neutral-800 dark:text-neutral-200 font-bold cursor-pointer">
                    Category is Active (Visible on storefront & filters)
                  </label>
                </div>

                {editingCategory && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                    <strong>Preservation Guarantee:</strong> Renaming this category will automatically update all {editingCategory.webinars_count} associated webinars to the new name without breaking any course links or order history.
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <Button
                    variant="secondary"
                    size="small"
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    {isSubmitting ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Associated Webinars Modal */}
        {viewingCategoryWebinars && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-2xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                    Assigned Webinars: {viewingCategoryWebinars.name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    All published and scheduled courses under this category discipline.
                  </p>
                </div>
                <button
                  onClick={() => setViewingCategoryWebinars(null)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <XMark className="w-5 h-5" />
                </button>
              </div>

              {loadingWebinars ? (
                <div className="py-12 text-center text-xs text-neutral-500">Loading courses...</div>
              ) : categoryWebinars.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">
                  No courses are currently assigned to this category.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2.5 divide-y divide-neutral-100 dark:divide-neutral-800 pr-1">
                  {categoryWebinars.map((w) => (
                    <div key={w.id} className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-neutral-900 dark:text-white">{w.title}</div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                          <span>Speaker: {w.speaker_name}</span>
                          <span>•</span>
                          <span>{w.cpe_credits} CPE Credits</span>
                          <span>•</span>
                          <span>Status: {w.status}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {w.is_upcoming ? "Upcoming" : w.is_ondemand ? "On-Demand" : "Scheduled"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setViewingCategoryWebinars(null)}
                  className="cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
