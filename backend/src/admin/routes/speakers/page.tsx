import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  AcademicCap,
  Plus,
  Trash,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  Photo,
  Sparkles,
  Eye,
  Star,
  Users,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Faculty & Instructors",
  icon: AcademicCap,
  rank: 22,
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

interface Speaker {
  id: string
  name: string
  slug?: string
  title?: string
  bio?: string
  photo_url?: string
  designation?: string
  qualifications?: string
  specialty?: string
  is_featured?: boolean
  featured_order?: number
  email?: string
  company?: string
  status: "active" | "inactive" | "archived"
  webinars_count?: number
  active_webinars?: Array<{ id: string; title: string; event_date: string; status: string }>
  associated_webinars?: Array<{ id: string; title: string; event_date: string; status: string }>
  webinars?: Array<{ id: string; title: string; event_date: string; status: string }>
}

export default function SpeakersAdminPage() {
  const { isDark } = useAdminTheme()
  const [speakers, setSpeakers] = useState<Speaker[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all") // "all" | "featured" | "active" | "archived"
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null)
  const [viewWebinarsModal, setViewWebinarsModal] = useState<Speaker | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    qualifications: "",
    specialty: "",
    is_featured: true,
    featured_order: 1,
    company: "",
    email: "",
    bio: "",
    photo_url: "",
    status: "active" as "active" | "inactive" | "archived",
  })

  const fetchSpeakers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/speakers", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.speakers) {
        setSpeakers(data.speakers)
      }
    } catch (e: any) {
      setStatusMessage({ type: "error", text: "Failed to load faculty instructors" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpeakers()
  }, [])

  // Quick 1-click Toggle Homepage Status
  const handleToggleFeatured = async (speaker: Speaker) => {
    const nextState = !speaker.is_featured
    setTogglingId(speaker.id)
    try {
      const res = await fetch(`/admin/speakers/${speaker.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ is_featured: nextState }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to update homepage status")
      }
      setStatusMessage({
        type: "success",
        text: `"${speaker.name}" is now ${nextState ? "shown in Homepage Showcase" : "removed from Homepage"}.`,
      })
      await fetchSpeakers()
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Toggle failed" })
    } finally {
      setTogglingId(null)
    }
  }

  const openCreateModal = () => {
    setEditingSpeaker(null)
    const nextOrder = speakers.filter((s) => s.is_featured).length + 1
    setFormData({
      name: "",
      designation: "",
      qualifications: "",
      specialty: "",
      is_featured: true,
      featured_order: nextOrder,
      company: "",
      email: "",
      bio: "",
      photo_url: "",
      status: "active",
    })
    setIsModalOpen(true)
  }

  const openEditModal = (speaker: Speaker) => {
    setEditingSpeaker(speaker)
    setFormData({
      name: speaker.name || "",
      designation: speaker.designation || "",
      qualifications: speaker.qualifications || "",
      specialty: speaker.specialty || "",
      is_featured: speaker.is_featured !== undefined ? Boolean(speaker.is_featured) : false,
      featured_order: speaker.featured_order || 0,
      company: speaker.company || "",
      email: speaker.email || "",
      bio: speaker.bio || "",
      photo_url: speaker.photo_url || "",
      status: speaker.status || "active",
    })
    setIsModalOpen(true)
  }

  const handleSaveSpeaker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert("Faculty / Instructor name is required")
      return
    }

    try {
      if (editingSpeaker) {
        const res = await fetch(`/admin/speakers/${editingSpeaker.id}`, {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || "Failed to update faculty member")
        }
        setStatusMessage({ type: "success", text: `Instructor "${formData.name}" updated successfully` })
      } else {
        const res = await fetch("/admin/speakers", {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || "Failed to create faculty member")
        }
        setStatusMessage({ type: "success", text: `Instructor "${formData.name}" created successfully` })
      }
      setIsModalOpen(false)
      fetchSpeakers()
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Operation failed" })
    }
  }

  const handleDeleteSpeaker = async (speaker: Speaker) => {
    if (!confirm(`Are you sure you want to delete instructor "${speaker.name}"?`)) return
    try {
      const res = await fetch(`/admin/speakers/${speaker.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to delete speaker")
      }
      setStatusMessage({ type: "success", text: `Instructor "${speaker.name}" deleted` })
      fetchSpeakers()
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Delete failed" })
    }
  }

  const filteredSpeakers = speakers.filter((s) => {
    const matchesSearch =
      searchQuery === "" ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.company?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === "all") return true
    if (statusFilter === "featured") return Boolean(s.is_featured)
    if (statusFilter === "active") return s.status === "active"
    if (statusFilter === "archived") return s.status === "archived"
    return true
  })

  // Metrics
  const activeCount = speakers.filter((s) => s.status === "active").length
  const featuredCount = speakers.filter((s) => s.is_featured).length
  const totalSessionsCount = speakers.reduce((acc, s) => acc + (s.webinars_count || 0), 0)
  const archivedCount = speakers.filter((s) => s.status === "archived").length

  return (
    <div
      className={`min-h-screen p-6 sm:p-8 space-y-8 font-sans ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
            <AcademicCap className="w-4 h-4" />
            <span>Masterclass Faculty Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Faculty & Instructors Directory
            <Badge color="blue" size="small" className="font-mono text-[10px] tracking-wider uppercase">
              Homepage Showcase Controlled
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Manage your distinguished faculty roster, bios, credentials, and control which instructors are showcased on the storefront homepage with custom display priority.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="small"
            onClick={fetchSpeakers}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Faculty Member
          </Button>

          <AdminThemeToggle />
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Faculty */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Faculty
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {speakers.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Verified educators & speakers</p>
        </div>

        {/* Featured on Homepage */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Featured on Homepage
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {featuredCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active in Leading Faculty Showcase</p>
        </div>

        {/* Total Sessions Taught */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Total Webinars Taught
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <AcademicCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
            {totalSessionsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Live & self-study broadcasts</p>
        </div>

        {/* Active Profiles */}
        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {activeCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{archivedCount} archived / inactive</p>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold border shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar: Search & Tabbed Filters */}
      <div
        className={`p-4 rounded-2xl border shadow-xs flex flex-col md:flex-row gap-3 justify-between items-center ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="w-full md:w-80">
          <Input
            placeholder="Search faculty by name, specialty, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Faculty ({speakers.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("featured")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              statusFilter === "featured"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            Homepage Showcase ({featuredCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "active"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Active ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("archived")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "archived"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>
      </div>

      {/* Faculty Table */}
      <div
        className={`rounded-2xl border shadow-xs overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3.5 px-5">Faculty Instructor</th>
                <th className="py-3.5 px-4 text-center">Homepage Showcase</th>
                <th className="py-3.5 px-4 text-center">Order #</th>
                <th className="py-3.5 px-4">Primary Specialty</th>
                <th className="py-3.5 px-4">Designation & Qualifications</th>
                <th className="py-3.5 px-4 text-center">Webinars</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && speakers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <ArrowPath className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    Loading instructors catalog...
                  </td>
                </tr>
              ) : filteredSpeakers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No instructors match this filter
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Adjust your search or add an instructor to the homepage showcase.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSpeakers.map((speaker) => {
                  const isFeatured = Boolean(speaker.is_featured)
                  const isToggling = togglingId === speaker.id

                  return (
                    <tr
                      key={speaker.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Instructor Avatar + Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {speaker.photo_url ? (
                            <img
                              src={speaker.photo_url}
                              alt={speaker.name}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                              {speaker.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {speaker.name}
                            </div>
                            {speaker.email && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                {speaker.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Homepage Showcase 1-Click Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(speaker)}
                          disabled={isToggling}
                          title={
                            isFeatured
                              ? "Click to remove from homepage showcase"
                              : "Click to show on storefront homepage"
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            isFeatured
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {isToggling ? (
                            <ArrowPath className="w-3 h-3 animate-spin" />
                          ) : (
                            <Star
                              className={`w-3 h-3 ${
                                isFeatured ? "text-amber-500 fill-amber-500" : "text-slate-400"
                              }`}
                            />
                          )}
                          <span>{isFeatured ? "On Homepage" : "Hidden"}</span>
                        </button>
                      </td>

                      {/* Order Priority */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                        {isFeatured ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            #{speaker.featured_order || 1}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Specialty Tag */}
                      <td className="py-3.5 px-4">
                        {speaker.specialty ? (
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {speaker.specialty}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not specified</span>
                        )}
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {speaker.designation || "Expert Instructor"}
                        </div>
                        {speaker.qualifications && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {speaker.qualifications}
                          </div>
                        )}
                      </td>

                      {/* Associated Webinars */}
                      <td className="py-3.5 px-4 text-center">
                        {speaker.webinars_count && speaker.webinars_count > 0 ? (
                          <button
                            onClick={() => setViewWebinarsModal(speaker)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <AcademicCap className="w-3.5 h-3.5" />
                            <span>{speaker.webinars_count} sessions</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">0 sessions</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            speaker.status === "active"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {speaker.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(speaker)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                            title="Edit Instructor Details"
                          >
                            <PencilSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSpeaker(speaker)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                            title="Delete Instructor"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
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

      {/* ================= MODAL: ADD / EDIT INSTRUCTOR ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <AcademicCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingSpeaker ? `Edit ${editingSpeaker.name}` : "Add New Faculty Instructor"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure faculty details and customize appearance in the homepage showcase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpeaker} className="p-6 space-y-4">
              {/* Name & Photo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Barbara Weltman, Esq."
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Designation & Qualifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Professional Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Tax Attorney & Author of J.K. Lasser"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Credentials & Qualifications
                  </label>
                  <input
                    type="text"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    placeholder="e.g. CPA, MST, CFP, Esq."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Specialty & Homepage Showcase Controls */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-blue-950 dark:text-blue-200 block">
                      Storefront Homepage Showcase
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Feature this instructor on the &quot;Leading Faculty Showcase&quot; section of the home page.
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {formData.is_featured && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Primary Specialty Tag
                      </label>
                      <input
                        type="text"
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        placeholder="e.g. S-Corporation Form 7203 & IRS Basis"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Displayed as the badge highlight on the homepage card.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Display Priority Order (1 = First)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={formData.featured_order}
                        onChange={(e) =>
                          setFormData({ ...formData, featured_order: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Controls the position of this instructor in the grid.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Email & Organization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="faculty@academyio.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Biography */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Bio / Background
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Provide background, legal practice areas, books authored, or key audit credentials..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 font-bold"
                >
                  {editingSpeaker ? "Save Changes" : "Create Instructor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW ASSOCIATED WEBINARS ================= */}
      {viewWebinarsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <AcademicCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{viewWebinarsModal.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Masterclass webinars instructed by this faculty member
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewWebinarsModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XMark className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {viewWebinarsModal.associated_webinars && viewWebinarsModal.associated_webinars.length > 0 ? (
                viewWebinarsModal.associated_webinars.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {w.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(w.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {w.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No webinars assigned to this instructor yet.
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setViewWebinarsModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
