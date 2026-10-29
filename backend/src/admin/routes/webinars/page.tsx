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
  UserGroup,
  ArrowLeft,
  SquareTwoStack,
  DocumentText,
  Photo,
  Sparkles,
  Calendar,
  Clock,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"
import QuizManagementTab from "./components/QuizManagementTab"
import CreditsManagementTab from "./components/CreditsManagementTab"
import WebinarFilesTab from "./components/WebinarFilesTab"

export const config = defineRouteConfig({
  label: "Webinars",
  icon: AcademicCap,
  rank: 20,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export default function WebinarsAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [activeTab, setActiveTab] = useState<
    "webinars" | "files" | "variants" | "credits" | "live" | "recordings" | "transcripts" | "resources" | "entitlements" | "quiz"
  >("webinars")
  const [viewMode, setViewMode] = useState<"list" | "detail">("list")
  const [dateFilter, setDateFilter] = useState("all")

  const [webinars, setWebinars] = useState<any[]>([])
  const [speakersList, setSpeakersList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedWebinarId, setSelectedWebinarId] = useState<string>("")

  const handleDuplicateWebinar = async (webinarId: string) => {
    try {
      const res = await fetch(`/admin/webinars/${webinarId}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ action: "duplicate" }),
      })
      if (!res.ok) throw new Error("Failed to duplicate webinar")
      const data = await res.json()
      notify("success", `Webinar duplicated as draft: "${data.webinar?.title}"`)
      await fetchWebinars()
      if (data.webinar?.id) {
        setSelectedWebinarId(data.webinar.id)
        setViewMode("detail")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Modal / Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWebinar, setEditingWebinar] = useState<any | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Quick Add Speaker Modal
  const [isQuickAddSpeakerOpen, setIsQuickAddSpeakerOpen] = useState(false)
  const [quickSpeakerForm, setQuickSpeakerForm] = useState({
    name: "",
    designation: "",
    qualifications: "",
    company: "",
    email: "",
    bio: "",
    photo_url: "",
  })

  // Add / Edit Purchase Option Modal
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<any | null>(null)
  const [optionForm, setOptionForm] = useState({
    variant_id: "",
    title: "",
    description: "",
    price: 149,
    currency_code: "usd",
    sku: "",
    option_type: "custom",
    includes_live: true,
    includes_recording: false,
    includes_transcript: false,
    includes_pdf: false,
    is_enabled: true,
    expires_in_days: "",
    order_index: 1,
  })

  // Sub-data States
  const [variantsData, setVariantsData] = useState<any[]>([])
  const [resourcesData, setResourcesData] = useState<any[]>([])
  const [entitlementsData, setEntitlementsData] = useState<any[]>([])

  // Live Link Form
  const [liveForm, setLiveForm] = useState({
    live_stream_url: "",
    live_instructions: "",
    live_link_published: false,
  })

  // Recording Form
  const [recordingForm, setRecordingForm] = useState({
    recording_url: "",
    recording_instructions: "",
    recording_expires_at: "",
    recording_published: false,
  })

  // Transcript Form
  const [transcriptForm, setTranscriptForm] = useState({
    transcript_file_url: "",
    transcript_content: "",
  })

  // Resource Form
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false)
  const [newResource, setNewResource] = useState({
    title: "",
    description: "",
    file_url: "",
    file_name: "",
    file_size: 1500000,
    access_type: "pdf",
  })

  // Entitlement Manual Grant Form
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [grantForm, setGrantForm] = useState({
    customer_id: "",
    customer_email: "",
    webinar_id: "",
    access_type: "bundle",
    notes: "Manual grant by administrator",
  })

  // Create webinar form state (with individual variant prices & speaker selection)
  const [webinarForm, setWebinarForm] = useState({
    title: "",
    slug: "",
    speaker_id: "",
    speaker_name: "",
    speaker_title: "",
    category: "Taxation",
    event_date: "2026-11-20",
    start_time: "1:00 PM EST",
    end_time: "2:40 PM EST",
    timezone: "EST",
    cpe_credits: 2,
    short_description: "",
    description: "",
    featured_image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    status: "published",
    seo_title: "",
    seo_description: "",
    // Custom initial prices per purchase option
    price_live: 149,
    price_recording: 149,
    price_transcript: 49,
    price_pdf: 29,
    price_bundle: 249,
  })

  // Load Speakers
  const fetchSpeakers = async () => {
    try {
      const res = await fetch("/admin/speakers", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.speakers) {
        setSpeakersList(data.speakers)
      }
    } catch (e) {
      // ignore
    }
  }

  // Load Webinars
  const fetchWebinars = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/webinars?limit=100", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (data.webinars) {
        setWebinars(data.webinars)
        if (!selectedWebinarId && data.webinars.length > 0) {
          setSelectedWebinarId(data.webinars[0].id)
        }
      }
    } catch (e: any) {
      notify("error", "Failed to load webinars")
    } finally {
      setLoading(false)
    }
  }

  // Fetch Webinar sub-details
  const fetchWebinarDetails = async (webinarId: string) => {
    if (!webinarId) return
    try {
      // 1. Fetch Variants & Pricing
      const varRes = await fetch(`/admin/webinars/${webinarId}/variants`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (varRes.ok) {
        const varData = await varRes.json()
        setVariantsData(varData.variants || [])
      }

      // 2. Fetch Webinar Resource PDFs
      const resRes = await fetch(`/admin/webinars/${webinarId}/resources`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (resRes.ok) {
        const resData = await resRes.json()
        setResourcesData(resData.resources || [])
      }

      // 3. Populate live link & recording forms from active webinar object
      const currentWeb = webinars.find((w) => w.id === webinarId)
      if (currentWeb) {
        setLiveForm({
          live_stream_url: currentWeb.live_stream_url || "",
          live_instructions: currentWeb.live_instructions || "",
          live_link_published: Boolean(currentWeb.live_link_published),
        })
        setRecordingForm({
          recording_url: currentWeb.recording_url || "",
          recording_instructions: currentWeb.recording_instructions || "",
          recording_expires_at: currentWeb.recording_expires_at
            ? new Date(currentWeb.recording_expires_at).toISOString().slice(0, 10)
            : "",
          recording_published: Boolean(currentWeb.recording_published),
        })
        setTranscriptForm({
          transcript_file_url: currentWeb.transcript_file_url || "",
          transcript_content: currentWeb.transcript_content || "",
        })
      }
    } catch (e: any) {
      console.error(e)
    }
  }

  // Fetch Entitlements
  const fetchEntitlements = async () => {
    try {
      const entRes = await fetch("/admin/entitlements?limit=100", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (entRes.ok) {
        const entData = await entRes.json()
        setEntitlementsData(entData.entitlements || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchWebinars()
    fetchSpeakers()
    fetchEntitlements()
  }, [])

  useEffect(() => {
    if (selectedWebinarId) {
      fetchWebinarDetails(selectedWebinarId)
    }
  }, [selectedWebinarId])

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 6000)
  }

  // Quick Add Speaker submit
  const handleQuickAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSpeakerForm.name) {
      alert("Speaker name is required")
      return
    }

    try {
      const res = await fetch("/admin/speakers", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(quickSpeakerForm),
      })
      if (!res.ok) throw new Error("Failed to create speaker")
      const data = await res.json()
      notify("success", `Speaker "${data.speaker.name}" created and selected!`)
      await fetchSpeakers()
      setWebinarForm((prev) => ({
        ...prev,
        speaker_id: data.speaker.id,
        speaker_name: data.speaker.name,
        speaker_title: data.speaker.designation || data.speaker.title || "",
      }))
      setIsQuickAddSpeakerOpen(false)
      setQuickSpeakerForm({
        name: "",
        designation: "",
        qualifications: "",
        company: "",
        email: "",
        bio: "",
        photo_url: "",
      })
    } catch (err: any) {
      notify("error", err.message)
    }
  }

  // Open Create Modal
  const openCreateModal = () => {
    setEditingWebinar(null)
    setWebinarForm({
      title: "",
      slug: "",
      speaker_id: speakersList[0]?.id || "",
      speaker_name: speakersList[0]?.name || "",
      speaker_title: speakersList[0]?.designation || "",
      category: "Taxation",
      event_date: "2026-11-20",
      start_time: "1:00 PM EST",
      end_time: "2:40 PM EST",
      timezone: "EST",
      cpe_credits: 2,
      short_description: "",
      description: "",
      featured_image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
      status: "published",
      seo_title: "",
      seo_description: "",
      price_live: 149,
      price_recording: 149,
      price_transcript: 49,
      price_pdf: 29,
      price_bundle: 249,
    })
    setIsCreateModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (w: any) => {
    setEditingWebinar(w)
    setWebinarForm({
      title: w.title,
      slug: w.slug,
      speaker_id: w.speaker_id || "",
      speaker_name: w.speaker_name,
      speaker_title: w.speaker_title || "",
      category: w.category,
      event_date: w.event_date ? new Date(w.event_date).toISOString().slice(0, 10) : "2026-11-20",
      start_time: w.start_time || "1:00 PM EST",
      end_time: w.end_time || "2:40 PM EST",
      timezone: w.timezone || "EST",
      cpe_credits: w.cpe_credits || 0,
      short_description: w.short_description || "",
      description: w.description || "",
      featured_image: w.featured_image || "",
      status: w.status,
      seo_title: w.seo_title || "",
      seo_description: w.seo_description || "",
      price_live: 149,
      price_recording: 149,
      price_transcript: 49,
      price_pdf: 29,
      price_bundle: 249,
    })
    setIsCreateModalOpen(true)
  }

  // Handle Save Webinar (Create or Update)
  const handleSaveWebinar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!webinarForm.title) {
      alert("Title is required")
      return
    }

    const payload = {
      ...webinarForm,
      prices: {
        live: webinarForm.price_live,
        recording: webinarForm.price_recording,
        transcript: webinarForm.price_transcript,
        pdf: webinarForm.price_pdf,
        bundle: webinarForm.price_bundle,
      },
    }

    try {
      const url = editingWebinar ? `/admin/webinars/${editingWebinar.id}` : "/admin/webinars"
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed to save webinar")
      }

      notify("success", editingWebinar ? "Webinar updated successfully." : "Webinar created successfully.")
      setIsCreateModalOpen(false)
      fetchWebinars()
    } catch (err: any) {
      notify("error", err.message)
    }
  }

  // Handle Save Live Link
  const handleSaveLiveLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWebinarId) return
    try {
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/live-link`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(liveForm),
      })
      if (res.ok) {
        notify("success", "Live stream credentials and access rules saved.")
        fetchWebinars()
      } else {
        notify("error", "Failed to save live link.")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Save Recording
  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWebinarId) return
    try {
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/recording`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(recordingForm),
      })
      if (res.ok) {
        notify("success", "Recording details and expiration saved.")
        fetchWebinars()
      } else {
        notify("error", "Failed to save recording.")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Save Transcript
  const handleSaveTranscript = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWebinarId) return
    try {
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/recording`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(transcriptForm),
      })
      if (res.ok) {
        notify("success", "Transcript document and contents updated successfully.")
        fetchWebinars()
      } else {
        notify("error", "Failed to update transcript.")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Toggle Publish Webinar
  const handleTogglePublish = async (w: any) => {
    const nextStatus = w.status === "published" ? "draft" : "published"
    try {
      const res = await fetch(`/admin/webinars/${w.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        notify("success", `Webinar status changed to ${nextStatus}.`)
        fetchWebinars()
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Delete Webinar
  const handleDeleteWebinar = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete webinar: "${title}"?\n\nThis will remove the webinar, associated resources, quizzes, and variants.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/admin/webinars/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        notify("success", data.message || `Webinar "${title}" deleted successfully.`)
        if (selectedWebinarId === id) {
          setSelectedWebinarId("")
        }
        await fetchWebinars()
      } else {
        const errorText = data.message || data.error || `Server returned error (${res.status})`
        notify("error", `Failed to delete webinar: ${errorText}`)
        alert(`Failed to delete webinar: ${errorText}`)
      }
    } catch (e: any) {
      const err = e.message || "Network communication failed."
      notify("error", `Delete failed: ${err}`)
      alert(`Delete failed: ${err}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Handle Save Purchase Option (Variant)
  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWebinarId) return
    if (!optionForm.title) {
      alert("Option title is required")
      return
    }

    try {
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/variants`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(optionForm),
      })

      if (!res.ok) throw new Error("Failed to save purchase option")

      notify("success", `Purchase option "${optionForm.title}" saved successfully.`)
      setIsOptionModalOpen(false)
      fetchWebinarDetails(selectedWebinarId)
    } catch (err: any) {
      notify("error", err.message)
    }
  }

  // Handle Delete Purchase Option
  const handleDeleteOption = async (v: any) => {
    if (!confirm(`Are you sure you want to delete option "${v.title}"?`)) return
    try {
      const targetId = v.variant_id || v.mapping_id
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/variants/${targetId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete option")
      notify("success", `Purchase option "${v.title}" removed.`)
      fetchWebinarDetails(selectedWebinarId)
    } catch (err: any) {
      notify("error", err.message)
    }
  }

  // Handle Add Resource
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWebinarId) return
    try {
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/resources`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(newResource),
      })
      if (res.ok) {
        notify("success", "Resource PDF file attached successfully.")
        setIsAddResourceOpen(false)
        setNewResource({
          title: "",
          description: "",
          file_url: "",
          file_name: "",
          file_size: 1500000,
          access_type: "pdf",
        })
        fetchWebinarDetails(selectedWebinarId)
      } else {
        notify("error", "Failed to add resource.")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Delete Resource
  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource file?")) return
    try {
      const res = await fetch(`/admin/webinars/${selectedWebinarId}/resources/${resourceId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        notify("success", "Resource removed successfully.")
        fetchWebinarDetails(selectedWebinarId)
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Grant Entitlement
  const handleGrantEntitlement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch("/admin/entitlements", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(grantForm),
      })
      if (res.ok) {
        notify("success", "Customer entitlement granted successfully.")
        setIsGrantModalOpen(false)
        fetchEntitlements()
      } else {
        notify("error", "Failed to grant entitlement.")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Handle Revoke Entitlement
  const handleRevokeEntitlement = async (entId: string) => {
    const reason = prompt("Enter reason for revoking entitlement:", "Administrative revocation")
    if (!reason) return
    try {
      const res = await fetch(`/admin/entitlements/${entId}/revoke`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        notify("success", "Entitlement revoked.")
        fetchEntitlements()
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  // Filter webinars
  const filteredWebinars = webinars.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.speaker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || w.status === statusFilter
    const matchesCategory = categoryFilter === "all" || w.category === categoryFilter

    let matchesDate = true
    const now = new Date()
    const isPast = new Date(w.event_date) < now
    if (dateFilter === "upcoming") {
      matchesDate = !isPast && w.is_upcoming !== false
    } else if (dateFilter === "ondemand") {
      matchesDate = Boolean(w.is_ondemand || (w.recording_published && w.recording_url))
    } else if (dateFilter === "completed") {
      matchesDate = isPast
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDate
  })

  const selectedWebinar = webinars.find((w) => w.id === selectedWebinarId)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 transition-colors duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
            <AcademicCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Webinar & Masterclass Management
              </Heading>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                CPE Accredited
              </span>
            </div>
            <Text className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Manage live webinars, instructors, custom purchase options, broadcast links, video replays, and student access.
            </Text>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day / Night Mode Toggle */}
          <AdminThemeToggle isDark={isDark} toggleTheme={toggleTheme} />

          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              fetchWebinars()
              if (selectedWebinarId) fetchWebinarDetails(selectedWebinarId)
              fetchEntitlements()
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Webinar
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Catalog
            </span>
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <AcademicCap className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {webinars.length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Total registered courses</span>
          </div>
        </div>

        {/* Live & Upcoming */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Live & Upcoming
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {webinars.filter((w) => new Date(w.event_date) >= new Date() && w.status === "published").length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Scheduled live sessions</span>
          </div>
        </div>

        {/* Pre-Recorded / Self-Study */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Pre-Recorded / Replay
            </span>
            <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {webinars.filter((w) => Boolean(w.is_ondemand || (w.recording_published && w.recording_url))).length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
            <span>On-Demand self-study</span>
          </div>
        </div>

        {/* Drafts & Preparation */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Drafts & Staging
            </span>
            <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {webinars.filter((w) => w.status === "draft").length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Unpublished drafts</span>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium border flex items-center justify-between shadow-xs ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="cursor-pointer">
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List Mode Catalog Bar */}
      {viewMode === "list" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Webinars Catalog
            </span>
            <Badge size="small" color="blue">
              {filteredWebinars.length} of {webinars.length} Loaded
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Published: <strong className="text-emerald-600 dark:text-emerald-400">{webinars.filter((w) => w.status === "published").length}</strong></span>
            <span>•</span>
            <span>Drafts: <strong className="text-amber-600 dark:text-amber-400">{webinars.filter((w) => w.status === "draft").length}</strong></span>
            <span>•</span>
            <span>Upcoming: <strong className="text-blue-600 dark:text-blue-400">{webinars.filter((w) => new Date(w.event_date) >= new Date()).length}</strong></span>
          </div>
        </div>
      )}

      {/* WEBINARS LISTING TABLE */}
      {viewMode === "list" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="w-full lg:w-96">
              <Input
                placeholder="Search webinars, speakers, slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs p-2.5 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Lifecycles & Dates</option>
                <option value="upcoming">Upcoming Sessions</option>
                <option value="ondemand">Pre-Recorded / On-Demand</option>
                <option value="completed">Completed Events</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-2.5 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs p-2.5 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">All Categories</option>
                <option value="Accounting">Accounting</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Housing">Housing</option>
                <option value="Human Resources & Payroll">Human Resources & Payroll</option>
                <option value="Taxation">Taxation</option>
                <option value="Technology">Technology</option>
              </select>
            </div>
          </div>

          {/* Webinars Table */}
          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 text-xs uppercase border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 font-semibold">Webinar</th>
                  <th className="p-4 font-semibold">Speaker</th>
                  <th className="p-4 font-semibold">Event Schedule</th>
                  <th className="p-4 font-semibold">Starting Price</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredWebinars.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-400 dark:text-neutral-500">
                      No webinars found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredWebinars.map((w) => (
                    <tr key={w.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {w.featured_image ? (
                            <img
                              src={w.featured_image}
                              alt={w.title}
                              className="w-12 h-12 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 shadow-xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 shrink-0 border border-neutral-200 dark:border-neutral-700">
                              <Photo className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-md">{w.title}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <Badge size="small" color="blue">
                                {w.category}
                              </Badge>
                              {w.cpe_credits > 0 && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  {w.cpe_credits} CPE
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">/{w.slug}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-neutral-800 dark:text-neutral-200 text-xs">{w.speaker_name}</div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-xs">{w.speaker_title || "Instructor"}</div>
                      </td>
                      <td className="p-4 text-xs text-neutral-600 dark:text-neutral-400">
                        <div className="font-medium text-neutral-900 dark:text-neutral-200">
                          {new Date(w.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-neutral-400 dark:text-neutral-500 text-[11px]">
                          {w.start_time} ({w.timezone})
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                          ${w.starting_price !== undefined && w.starting_price !== null ? w.starting_price : 149} USD
                        </div>
                        <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          {w.variants_count || 5} option{(w.variants_count || 5) > 1 ? "s" : ""}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <button onClick={() => handleTogglePublish(w)} title="Click to toggle publish status" className="cursor-pointer">
                            <Badge
                              size="small"
                              color={w.status === "published" ? "green" : w.status === "orange" ? "orange" : "grey"}
                            >
                              {w.status}
                            </Badge>
                          </button>
                          {Boolean(w.is_ondemand || (w.recording_published && w.recording_url)) ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              On-Demand
                            </span>
                          ) : new Date(w.event_date) < new Date() ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Completed
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => {
                              setSelectedWebinarId(w.id)
                              setViewMode("detail")
                              setActiveTab("variants")
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded-xl shadow-xs"
                          >
                            Manage
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            title="Duplicate as draft"
                            onClick={() => handleDuplicateWebinar(w.id)}
                            className="p-1.5 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                          >
                            <SquareTwoStack className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            title="Edit details"
                            onClick={() => openEditModal(w)}
                            className="p-1.5 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                          >
                            <PencilSquare className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            title="Delete webinar"
                            disabled={deletingId === w.id}
                            onClick={() => handleDeleteWebinar(w.id, w.title)}
                            className="p-1.5 rounded-xl disabled:opacity-50"
                          >
                            {deletingId === w.id ? (
                              <ArrowPath className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WEBINAR DETAIL MANAGEMENT HEADER (PRODUCT-LIKE WORKFLOW) */}
      {viewMode === "detail" && selectedWebinar && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setViewMode("list")
                  setActiveTab("webinars")
                }}
                className="gap-1.5 text-xs font-semibold rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to all Webinars
              </Button>
              <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Switch Webinar:</span>
                <select
                  value={selectedWebinarId}
                  onChange={(e) => setSelectedWebinarId(e.target.value)}
                  className="text-xs font-semibold p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {webinars.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleTogglePublish(selectedWebinar)}
                className="text-xs rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                {selectedWebinar.status === "published" ? "Unpublish (Draft)" : "Publish Webinar"}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleDuplicateWebinar(selectedWebinar.id)}
                className="text-xs gap-1 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <SquareTwoStack className="w-3.5 h-3.5" />
                Duplicate
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => openEditModal(selectedWebinar)}
                className="text-xs gap-1 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <PencilSquare className="w-3.5 h-3.5" />
                Edit Details
              </Button>
              <Button
                variant="danger"
                size="small"
                disabled={deletingId === selectedWebinar.id}
                onClick={() => handleDeleteWebinar(selectedWebinar.id, selectedWebinar.title)}
                className="text-xs rounded-xl disabled:opacity-50 gap-1.5"
              >
                {deletingId === selectedWebinar.id ? (
                  <>
                    <ArrowPath className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash className="w-3.5 h-3.5" />
                    <span>Delete Webinar</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {selectedWebinar.featured_image ? (
                <img
                  src={selectedWebinar.featured_image}
                  alt={selectedWebinar.title}
                  className="w-16 h-16 rounded-2xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700 shrink-0">
                  <AcademicCap className="w-8 h-8" />
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Heading level="h2" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedWebinar.title}
                  </Heading>
                  <Badge
                    size="small"
                    color={
                      selectedWebinar.status === "published"
                        ? "green"
                        : selectedWebinar.status === "draft"
                        ? "orange"
                        : "grey"
                    }
                  >
                    {selectedWebinar.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex flex-wrap items-center gap-3">
                  <span>Instructor: <strong className="text-neutral-800 dark:text-neutral-200">{selectedWebinar.speaker_name}</strong></span>
                  <span>•</span>
                  <span>Schedule: <strong className="text-neutral-800 dark:text-neutral-200">{new Date(selectedWebinar.event_date).toLocaleDateString()} at {selectedWebinar.start_time}</strong></span>
                  <span>•</span>
                  <span>Category: <strong className="text-neutral-800 dark:text-neutral-200">{selectedWebinar.category}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-neutral-400 dark:text-neutral-500">/{selectedWebinar.slug}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Tabs for this specific Webinar */}
          <div className="flex items-center gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4 overflow-x-auto text-xs font-semibold">
            {[
              { id: "files", label: "Webinar Files & S3 Materials" },
              { id: "variants", label: "Purchase Options & Pricing" },
              { id: "credits", label: "Credits & Accreditation" },
              { id: "live", label: "Live Joining Link" },
              { id: "recordings", label: "Video Replays" },
              { id: "transcripts", label: "Session Transcripts" },
              { id: "resources", label: `PDF Resources (${resourcesData.length})` },
              { id: "entitlements", label: "Enrolled Customer Entitlements" },
              { id: "quiz", label: "Quiz & Certificates" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setActiveTab(st.id as any)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === st.id
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB: WEBINAR FILES & S3 MATERIALS */}
      {activeTab === "files" && selectedWebinar && (
        <WebinarFilesTab
          webinar={selectedWebinar}
          webinarId={selectedWebinarId}
          notify={notify}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* TAB 2: PURCHASE OPTIONS & VARIANTS */}
      {activeTab === "variants" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Custom Webinar Purchase Options & Pricing
              </Heading>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Configure prices independently for this webinar. Add custom packages (Live + Recording, Bundles, etc.), enable/disable options, and manage access entitlements.
              </Text>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setEditingOption(null)
                setOptionForm({
                  variant_id: "",
                  title: "",
                  description: "",
                  price: 149,
                  currency_code: "usd",
                  sku: `WEB-${selectedWebinarId.slice(-6)}-OPT-${Date.now().toString().slice(-4)}`,
                  option_type: "custom",
                  includes_live: true,
                  includes_recording: true,
                  includes_transcript: false,
                  includes_pdf: false,
                  is_enabled: true,
                  expires_in_days: "",
                  order_index: variantsData.length + 1,
                })
                setIsOptionModalOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Purchase Option
            </Button>
          </div>

          <div className="space-y-4">
            {variantsData.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                No purchase options found for this webinar. Click "Add Custom Purchase Option" above.
              </div>
            ) : (
              variantsData.map((v) => (
                <div
                  key={v.variant_id || v.mapping_id}
                  className={`p-5 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
                    v.is_enabled
                      ? "bg-neutral-50/80 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700"
                      : "bg-neutral-100/40 dark:bg-neutral-900/40 border-dashed border-neutral-300 dark:border-neutral-700 opacity-60"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{v.title}</span>
                      <Badge size="small" color={v.is_enabled ? "blue" : "grey"}>
                        {v.option_type}
                      </Badge>
                      {!v.is_enabled && (
                        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    {v.description && <p className="text-xs text-neutral-500 dark:text-neutral-400">{v.description}</p>}
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-4">
                      <span>SKU: <strong className="font-mono text-neutral-700 dark:text-neutral-300">{v.sku || "N/A"}</strong></span>
                      {v.expires_in_days && (
                        <span>Expires: <strong className="text-neutral-700 dark:text-neutral-300">{v.expires_in_days} days after purchase</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Display */}
                  <div className="flex items-baseline gap-1 bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xs">
                    <span className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">${v.price}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 uppercase">{v.currency_code || "USD"}</span>
                  </div>

                  {/* Inclusions Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        v.includes_live
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-700 line-through"
                      }`}
                    >
                      Live
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        v.includes_recording
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-700 line-through"
                      }`}
                    >
                      Recording
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        v.includes_transcript
                          ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-700 line-through"
                      }`}
                    >
                      Transcript
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border ${
                        v.includes_pdf
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-700 line-through"
                      }`}
                    >
                      PDF
                    </span>
                  </div>

                  {/* Actions: Edit, Enable/Disable, Delete */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setEditingOption(v)
                        setOptionForm({
                          variant_id: v.variant_id,
                          title: v.title,
                          description: v.description || "",
                          price: v.price,
                          currency_code: v.currency_code || "usd",
                          sku: v.sku || "",
                          option_type: v.option_type || "live",
                          includes_live: v.includes_live,
                          includes_recording: v.includes_recording,
                          includes_transcript: v.includes_transcript,
                          includes_pdf: v.includes_pdf,
                          is_enabled: v.is_enabled,
                          expires_in_days: v.expires_in_days ? v.expires_in_days.toString() : "",
                          order_index: v.order_index || 1,
                        })
                        setIsOptionModalOpen(true)
                      }}
                      className="text-xs px-2.5 py-1 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                    >
                      <PencilSquare className="w-3.5 h-3.5 mr-1" />
                      Edit Price
                    </Button>

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={async () => {
                        await fetch(`/admin/webinars/${selectedWebinarId}/variants`, {
                          method: "POST",
                          headers: getAuthHeaders(),
                          credentials: "include",
                          body: JSON.stringify({
                            variant_id: v.variant_id,
                            is_enabled: !v.is_enabled,
                          }),
                        })
                        fetchWebinarDetails(selectedWebinarId)
                      }}
                      className="text-xs px-2.5 py-1 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                    >
                      {v.is_enabled ? "Disable" : "Enable"}
                    </Button>

                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDeleteOption(v)}
                      className="text-xs px-2.5 py-1 rounded-xl"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE JOINING LINKS */}
      {activeTab === "live" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm max-w-3xl">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Live Webinar Stream & Credentials
            </Heading>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Configure the secure Zoom or livestream URL, broadcast instructions, and customer visibility switch.
            </Text>
          </div>

          <form onSubmit={handleSaveLiveLink} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Live Broadcast URL (Zoom, Teams, WebRTC)
              </label>
              <Input
                placeholder="https://zoom.us/j/98421038592?pwd=..."
                value={liveForm.live_stream_url}
                onChange={(e) => setLiveForm({ ...liveForm, live_stream_url: e.target.value })}
                className="w-full text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Joining Instructions & Participant Notes
              </label>
              <textarea
                rows={3}
                placeholder="Please log in 10 minutes prior to broadcast..."
                value={liveForm.live_instructions}
                onChange={(e) => setLiveForm({ ...liveForm, live_instructions: e.target.value })}
                className="w-full text-sm p-3 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <input
                type="checkbox"
                id="live_link_published"
                checked={liveForm.live_link_published}
                onChange={(e) => setLiveForm({ ...liveForm, live_link_published: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="live_link_published" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                Publish Live Link to Verified Customers (Enable Access in Customer Dashboard)
              </label>
            </div>

            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
              Save Live Link Settings
            </Button>
          </form>
        </div>
      )}

      {/* TAB 4: RECORDINGS MANAGEMENT */}
      {activeTab === "recordings" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm max-w-3xl">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Recorded Video Asset Management
            </Heading>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Upload or link the on-demand video stream (Vimeo, Cloudflare Stream, AWS S3) and set access expiration.
            </Text>
          </div>

          <form onSubmit={handleSaveRecording} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                On-Demand Video Player URL
              </label>
              <Input
                placeholder="https://player.vimeo.com/video/918237462"
                value={recordingForm.recording_url}
                onChange={(e) => setRecordingForm({ ...recordingForm, recording_url: e.target.value })}
                className="w-full text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Viewer Instructions & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Playback available in HD. Handouts can be downloaded from the Resources tab..."
                value={recordingForm.recording_instructions}
                onChange={(e) => setRecordingForm({ ...recordingForm, recording_instructions: e.target.value })}
                className="w-full text-sm p-3 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Access Expiration Date (Optional)
              </label>
              <Input
                type="date"
                value={recordingForm.recording_expires_at}
                onChange={(e) => setRecordingForm({ ...recordingForm, recording_expires_at: e.target.value })}
                className="w-full text-sm bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-xl"
              />
            </div>

            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/40 flex items-center justify-between">
              <div>
                <label htmlFor="recording_published" className="block text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase cursor-pointer">
                  Publish Recording to On-Demand Library
                </label>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  When enabled, this webinar moves into the Pre-Recorded / Self-Study section and authorized customers can access the video replay.
                </p>
              </div>
              <input
                id="recording_published"
                type="checkbox"
                checked={recordingForm.recording_published}
                onChange={(e) => setRecordingForm({ ...recordingForm, recording_published: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
              Save Recording Settings
            </Button>
          </form>
        </div>
      )}

      {/* TAB 5: TRANSCRIPTS */}
      {activeTab === "transcripts" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm max-w-3xl">
          <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Full-Text Webinar Transcript
            </Heading>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Provide searchable text transcript and downloadable transcript document.
            </Text>
          </div>

          <form onSubmit={handleSaveTranscript} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Downloadable Transcript PDF URL
              </label>
              <Input
                placeholder="https://customer-assets.academyio.com/transcripts/session-7203.pdf"
                value={transcriptForm.transcript_file_url}
                onChange={(e) => setTranscriptForm({ ...transcriptForm, transcript_file_url: e.target.value })}
                className="w-full text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                Full Text Content (Markdown / Text)
              </label>
              <textarea
                rows={8}
                placeholder="[00:00:15] Speaker: Welcome everyone to today's webinar on Section 7203..."
                value={transcriptForm.transcript_content}
                onChange={(e) => setTranscriptForm({ ...transcriptForm, transcript_content: e.target.value })}
                className="w-full text-xs font-mono p-3 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
              Save Transcript
            </Button>
          </form>
        </div>
      )}

      {/* TAB 6: PDF RESOURCES */}
      {activeTab === "resources" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Downloadable PDF Study Guides & Resources
              </Heading>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Manage slide decks, tax forms, checklists, and reference guides available for download.
              </Text>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsAddResourceOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Attach PDF File
            </Button>
          </div>

          <div className="space-y-3">
            {resourcesData.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                No PDF resources uploaded for this webinar yet.
              </div>
            ) : (
              resourcesData.map((res) => (
                <div
                  key={res.id}
                  className="p-4 border rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{res.title}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Type: <span className="uppercase font-semibold text-neutral-700 dark:text-neutral-300">{res.access_type}</span> • File:{" "}
                      <span className="font-mono text-neutral-600 dark:text-neutral-400">{res.file_name || "document.pdf"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={res.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      View File
                    </a>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDeleteResource(res.id)}
                      className="rounded-xl p-1.5"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: ENTITLEMENTS */}
      {activeTab === "entitlements" && (
        <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div>
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Customer Webinar Entitlements
              </Heading>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Verified database entitlements governing customer access to webinars, live streams, and downloads.
              </Text>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsGrantModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Grant Manual Access
            </Button>
          </div>

          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 text-xs uppercase border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 font-semibold">Customer Email</th>
                  <th className="p-4 font-semibold">Associated Webinar</th>
                  <th className="p-4 font-semibold">Access Entitlement</th>
                  <th className="p-4 font-semibold">Order ID</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {entitlementsData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-400 dark:text-neutral-500">
                      No customer entitlements recorded yet.
                    </td>
                  </tr>
                ) : (
                  entitlementsData.map((ent) => (
                    <tr key={ent.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-4 font-semibold text-neutral-900 dark:text-neutral-100">{ent.customer_email}</td>
                      <td className="p-4 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                        {ent.webinar?.title || ent.webinar_id || "Global Entitlement"}
                      </td>
                      <td className="p-4">
                        <Badge
                          size="small"
                          color={
                            ent.access_type === "bundle"
                              ? "purple"
                              : ent.access_type === "live"
                              ? "blue"
                              : ent.access_type === "recording"
                              ? "green"
                              : "orange"
                          }
                        >
                          {ent.access_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">{ent.order_id || "MANUAL"}</td>
                      <td className="p-4">
                        <Badge size="small" color={ent.status === "active" ? "green" : "red"}>
                          {ent.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {ent.status === "active" && (
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleRevokeEntitlement(ent.id)}
                            className="rounded-xl px-2.5 py-1 text-xs"
                          >
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CREDITS & ACCREDITATION INFORMATION */}
      {activeTab === "credits" && selectedWebinar && (
        <CreditsManagementTab
          webinar={selectedWebinar}
          webinarId={selectedWebinarId}
          notify={notify}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* TAB 8: POST-WEBINAR QUIZ & CERTIFICATES */}
      {activeTab === "quiz" && selectedWebinar && (
        <QuizManagementTab
          webinar={selectedWebinar}
          webinarId={selectedWebinarId}
          notify={notify}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* CREATE / EDIT WEBINAR MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {editingWebinar ? `Edit Webinar: ${editingWebinar.title}` : "Create New Webinar"}
              </Heading>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWebinar} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Webinar Title *</label>
                <Input
                  required
                  placeholder="e.g. Advanced Partnership Tax Allocations under Section 704(b)"
                  value={webinarForm.title}
                  onChange={(e) => setWebinarForm({ ...webinarForm, title: e.target.value })}
                  className="w-full text-sm font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">URL Slug</label>
                  <Input
                    placeholder="advanced-partnership-tax-allocations"
                    value={webinarForm.slug}
                    onChange={(e) => setWebinarForm({ ...webinarForm, slug: e.target.value })}
                    className="w-full font-mono text-xs font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Category</label>
                  <select
                    value={webinarForm.category}
                    onChange={(e) => setWebinarForm({ ...webinarForm, category: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Accounting">Accounting</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Housing">Housing</option>
                    <option value="Human Resources & Payroll">Human Resources & Payroll</option>
                    <option value="Taxation">Taxation</option>
                    <option value="Technology">Technology</option>
                  </select>
                </div>
              </div>

              {/* SPEAKER SELECTION WITH QUICK-ADD */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-blue-900 dark:text-blue-300 uppercase font-bold text-xs">Speaker Selection *</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddSpeakerOpen(true)}
                    className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add New Speaker
                  </button>
                </div>
                <select
                  value={webinarForm.speaker_id}
                  onChange={(e) => {
                    const spId = e.target.value
                    const found = speakersList.find((s) => s.id === spId)
                    setWebinarForm({
                      ...webinarForm,
                      speaker_id: spId,
                      speaker_name: found ? found.name : webinarForm.speaker_name,
                      speaker_title: found ? found.designation || found.title || "" : webinarForm.speaker_title,
                    })
                  }}
                  className="w-full p-2.5 border border-blue-300 dark:border-blue-800 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-normal text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Choose Existing Speaker from Directory --</option>
                  {speakersList.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} — {sp.designation || sp.company || "Instructor"}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-neutral-600 dark:text-neutral-400 text-[11px] mb-0.5">Speaker Display Name</label>
                    <Input
                      required
                      value={webinarForm.speaker_name}
                      onChange={(e) => setWebinarForm({ ...webinarForm, speaker_name: e.target.value })}
                      placeholder="e.g. Barbara Weltman, Esq."
                      className="w-full font-normal rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-600 dark:text-neutral-400 text-[11px] mb-0.5">Speaker Designation / Title</label>
                    <Input
                      value={webinarForm.speaker_title}
                      onChange={(e) => setWebinarForm({ ...webinarForm, speaker_title: e.target.value })}
                      placeholder="Nationally Recognized Tax Attorney"
                      className="w-full font-normal rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                  </div>
                </div>
              </div>

              {/* DATE, TIME & TIMEZONE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Event Date *</label>
                  <Input
                    type="date"
                    required
                    value={webinarForm.event_date}
                    onChange={(e) => setWebinarForm({ ...webinarForm, event_date: e.target.value })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Start Time</label>
                  <Input
                    value={webinarForm.start_time}
                    onChange={(e) => setWebinarForm({ ...webinarForm, start_time: e.target.value })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">End Time</label>
                  <Input
                    value={webinarForm.end_time}
                    onChange={(e) => setWebinarForm({ ...webinarForm, end_time: e.target.value })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Timezone</label>
                  <Input
                    value={webinarForm.timezone}
                    onChange={(e) => setWebinarForm({ ...webinarForm, timezone: e.target.value })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* CPE & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">CPE Credits</label>
                  <Input
                    type="number"
                    value={webinarForm.cpe_credits}
                    onChange={(e) => setWebinarForm({ ...webinarForm, cpe_credits: parseInt(e.target.value) || 0 })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Publication Status</label>
                  <select
                    value={webinarForm.status}
                    onChange={(e) => setWebinarForm({ ...webinarForm, status: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* INDEPENDENT CUSTOM PRICES FOR NEW WEBINARS */}
              {!editingWebinar && (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl space-y-2.5">
                  <span className="block text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[11px] font-bold">
                    Custom Variant Pricing for this Webinar ($ USD)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-[10px]">Live Access ($)</label>
                      <Input
                        type="number"
                        min="1"
                        value={webinarForm.price_live}
                        onChange={(e) => setWebinarForm({ ...webinarForm, price_live: parseInt(e.target.value) || 0 })}
                        className="font-normal text-xs rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-[10px]">Recording ($)</label>
                      <Input
                        type="number"
                        min="1"
                        value={webinarForm.price_recording}
                        onChange={(e) => setWebinarForm({ ...webinarForm, price_recording: parseInt(e.target.value) || 0 })}
                        className="font-normal text-xs rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-[10px]">Transcript ($)</label>
                      <Input
                        type="number"
                        min="1"
                        value={webinarForm.price_transcript}
                        onChange={(e) => setWebinarForm({ ...webinarForm, price_transcript: parseInt(e.target.value) || 0 })}
                        className="font-normal text-xs rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-[10px]">PDF Download ($)</label>
                      <Input
                        type="number"
                        min="1"
                        value={webinarForm.price_pdf}
                        onChange={(e) => setWebinarForm({ ...webinarForm, price_pdf: parseInt(e.target.value) || 0 })}
                        className="font-normal text-xs rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-500 dark:text-neutral-400 text-[10px]">Complete Bundle ($)</label>
                      <Input
                        type="number"
                        min="1"
                        value={webinarForm.price_bundle}
                        onChange={(e) => setWebinarForm({ ...webinarForm, price_bundle: parseInt(e.target.value) || 0 })}
                        className="font-normal text-xs rounded-xl bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SEO FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">SEO Meta Title</label>
                  <Input
                    placeholder="e.g. S Corp Basis Preparation CPE Webinar | AcademyIO"
                    value={webinarForm.seo_title}
                    onChange={(e) => setWebinarForm({ ...webinarForm, seo_title: e.target.value })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">SEO Meta Description</label>
                  <Input
                    placeholder="e.g. Earn 2 CPE credits with expert analysis of Form 7203..."
                    value={webinarForm.seo_description}
                    onChange={(e) => setWebinarForm({ ...webinarForm, seo_description: e.target.value })}
                    className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Featured Image URL</label>
                <Input
                  value={webinarForm.featured_image}
                  onChange={(e) => setWebinarForm({ ...webinarForm, featured_image: e.target.value })}
                  className="w-full font-mono text-xs font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Short Summary</label>
                <textarea
                  rows={2}
                  value={webinarForm.short_description}
                  onChange={(e) => setWebinarForm({ ...webinarForm, short_description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-normal text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Full Course Description</label>
                <textarea
                  rows={4}
                  value={webinarForm.description}
                  onChange={(e) => setWebinarForm({ ...webinarForm, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-normal text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  {editingWebinar ? "Save Changes" : "Create Webinar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD SPEAKER MODAL (INLINE WORKFLOW) */}
      {isQuickAddSpeakerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Quick Add Speaker to Directory
              </Heading>
              <button onClick={() => setIsQuickAddSpeakerOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSpeaker} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Speaker Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Dr. Jennifer Morales"
                  value={quickSpeakerForm.name}
                  onChange={(e) => setQuickSpeakerForm({ ...quickSpeakerForm, name: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Designation</label>
                  <Input
                    placeholder="Partner, Tax Accounting"
                    value={quickSpeakerForm.designation}
                    onChange={(e) => setQuickSpeakerForm({ ...quickSpeakerForm, designation: e.target.value })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Credentials</label>
                  <Input
                    placeholder="CPA, JD, LLM"
                    value={quickSpeakerForm.qualifications}
                    onChange={(e) => setQuickSpeakerForm({ ...quickSpeakerForm, qualifications: e.target.value })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Company / Firm</label>
                <Input
                  placeholder="e.g. Morales & Associates LLP"
                  value={quickSpeakerForm.company}
                  onChange={(e) => setQuickSpeakerForm({ ...quickSpeakerForm, company: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Photo URL</label>
                <Input
                  placeholder="https://images.unsplash.com/..."
                  value={quickSpeakerForm.photo_url}
                  onChange={(e) => setQuickSpeakerForm({ ...quickSpeakerForm, photo_url: e.target.value })}
                  className="w-full font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Biography</label>
                <textarea
                  rows={2}
                  placeholder="Brief instructor overview..."
                  value={quickSpeakerForm.bio}
                  onChange={(e) => setQuickSpeakerForm({ ...quickSpeakerForm, bio: e.target.value })}
                  className="w-full border rounded-xl p-2 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" onClick={() => setIsQuickAddSpeakerOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  Add & Use Speaker
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PURCHASE OPTION MODAL */}
      {isOptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingOption ? `Edit Purchase Option: ${editingOption.title}` : "Add Custom Purchase Option"}
              </Heading>
              <button onClick={() => setIsOptionModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOption} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Option Display Name *</label>
                <Input
                  required
                  placeholder="e.g. Live Webinar + Recording Bundle"
                  value={optionForm.title}
                  onChange={(e) => setOptionForm({ ...optionForm, title: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Description</label>
                <Input
                  placeholder="e.g. Real-time participation plus indefinite replay access"
                  value={optionForm.description}
                  onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                  className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Price ($ USD) *</label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={optionForm.price}
                    onChange={(e) => setOptionForm({ ...optionForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">SKU</label>
                  <Input
                    placeholder="WEB-OPT-..."
                    value={optionForm.sku}
                    onChange={(e) => setOptionForm({ ...optionForm, sku: e.target.value })}
                    className="w-full font-mono text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Access Option Type</label>
                  <select
                    value={optionForm.option_type}
                    onChange={(e) => setOptionForm({ ...optionForm, option_type: e.target.value })}
                    className="w-full border rounded-xl p-2 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="live">Live Webinar</option>
                    <option value="recording">Recording</option>
                    <option value="transcript">Transcript</option>
                    <option value="pdf">PDF Download</option>
                    <option value="bundle">Complete Package</option>
                    <option value="custom">Other / Custom Bundle</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">Access Expiration (Days)</label>
                  <Input
                    type="number"
                    placeholder="Blank for unlimited"
                    value={optionForm.expires_in_days}
                    onChange={(e) => setOptionForm({ ...optionForm, expires_in_days: e.target.value })}
                    className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              {/* Inclusions checkboxes */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                <span className="block font-semibold text-neutral-700 dark:text-neutral-300 uppercase text-[11px]">Included Content Access</span>
                <div className="grid grid-cols-2 gap-2 text-neutral-800 dark:text-neutral-200">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.includes_live}
                      onChange={(e) => setOptionForm({ ...optionForm, includes_live: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Live Stream</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.includes_recording}
                      onChange={(e) => setOptionForm({ ...optionForm, includes_recording: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Recording</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.includes_transcript}
                      onChange={(e) => setOptionForm({ ...optionForm, includes_transcript: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>Transcript</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optionForm.includes_pdf}
                      onChange={(e) => setOptionForm({ ...optionForm, includes_pdf: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>PDF Guide</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="opt_enabled"
                  checked={optionForm.is_enabled}
                  onChange={(e) => setOptionForm({ ...optionForm, is_enabled: e.target.checked })}
                  className="rounded text-blue-600 cursor-pointer"
                />
                <label htmlFor="opt_enabled" className="text-neutral-700 dark:text-neutral-300 cursor-pointer font-semibold">
                  Enable this purchase option on the storefront
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" onClick={() => setIsOptionModalOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  Save Purchase Option
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PDF RESOURCE MODAL */}
      {isAddResourceOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Attach New PDF Resource
              </Heading>
              <button onClick={() => setIsAddResourceOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Resource Title *</label>
                <Input
                  required
                  placeholder="e.g. Form 7203 Audit Checklist.pdf"
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  className="w-full text-sm font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Secure File URL *</label>
                <Input
                  required
                  placeholder="https://customer-assets.academyio.com/resources/form_7203_checklist.pdf"
                  value={newResource.file_url}
                  onChange={(e) => setNewResource({ ...newResource, file_url: e.target.value })}
                  className="w-full text-xs font-mono font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed multi-page compliance walkthrough."
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-normal text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Access Type</label>
                <select
                  value={newResource.access_type}
                  onChange={(e) => setNewResource({ ...newResource, access_type: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-normal bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="pdf">PDF Resource</option>
                  <option value="transcript">Transcript Document</option>
                  <option value="slides">Presentation Slides</option>
                  <option value="handout">Course Handout</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" onClick={() => setIsAddResourceOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  Attach File
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRANT MANUAL ENTITLEMENT MODAL */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Grant Customer Access Entitlement
              </Heading>
              <button onClick={() => setIsGrantModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantEntitlement} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Customer Email *</label>
                <Input
                  required
                  type="email"
                  placeholder="customer@academyio.com"
                  value={grantForm.customer_email}
                  onChange={(e) =>
                    setGrantForm({
                      ...grantForm,
                      customer_email: e.target.value,
                      customer_id: grantForm.customer_id || `cus_${e.target.value.replace(/[^a-z0-9]/g, "")}`,
                    })
                  }
                  className="w-full text-sm font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
                />
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Target Webinar *</label>
                <select
                  required
                  value={grantForm.webinar_id}
                  onChange={(e) => setGrantForm({ ...grantForm, webinar_id: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-normal bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select a webinar...</option>
                  {webinars.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Access Entitlement Type</label>
                <select
                  value={grantForm.access_type}
                  onChange={(e) => setGrantForm({ ...grantForm, access_type: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-normal bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="bundle">Complete Package (Live + Recording + Transcript + PDF)</option>
                  <option value="live">Live Webinar Stream Only</option>
                  <option value="recording">Recorded Session Only</option>
                  <option value="transcript">Transcript Only</option>
                  <option value="pdf">PDF Downloads Only</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 dark:text-neutral-300 uppercase mb-1">Administrative Notes</label>
                <Input
                  value={grantForm.notes}
                  onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                  className="w-full font-normal rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-800">
                <Button variant="secondary" onClick={() => setIsGrantModalOpen(false)} className="rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-semibold">
                  Grant Verified Access
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
