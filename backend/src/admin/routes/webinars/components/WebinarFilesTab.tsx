import React, { useState, useEffect, useRef } from "react"
import {
  Plus,
  PencilSquare,
  Trash,
  ArrowPath,
  CheckCircle,
  XMark,
  Eye,
  ExclamationCircle,
  MagnifyingGlass,
  ArrowDownTray,
  ArrowUpRightOnBox,
} from "@medusajs/icons"
import { Heading, Text, Badge, Button, Input } from "@medusajs/ui"

export interface WebinarFileItem {
  id: string
  webinar_id: string
  webinar_title?: string
  purchase_option: string
  variant_id?: string | null
  material_type: string
  title: string
  description?: string | null
  s3_key: string
  s3_bucket: string
  s3_region: string
  file_name: string
  file_size: number
  mime_type: string
  is_active: boolean
  display_order: number
  upload_status: string
  created_at: string
  updated_at: string
}

export default function WebinarFilesTab({
  webinar,
  webinarId,
  notify,
  getAuthHeaders,
}: {
  webinar: any
  webinarId: string
  notify: (type: "success" | "error", text: string) => void
  getAuthHeaders: () => Record<string, string>
}) {
  const [files, setFiles] = useState<WebinarFileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [materialFilter, setMaterialFilter] = useState("all")
  const [optionFilter, setOptionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [uploadQueue, setUploadQueue] = useState<{ file: File; progress: number; status: "pending" | "uploading" | "done" | "error"; error?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload metadata form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    material_type: "slides",
    purchase_option: "all",
    display_order: 1,
    is_active: true,
  })

  // Edit / Replace modal state
  const [editingFile, setEditingFile] = useState<WebinarFileItem | null>(null)
  const [replacingFile, setReplacingFile] = useState<WebinarFileItem | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<WebinarFileItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/webinar-files?webinar_id=${webinarId}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load webinar files")
      const data = await res.json()
      setFiles(data.files || [])
    } catch (err: any) {
      notify("error", err.message || "Failed to load files.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (webinarId) {
      fetchFiles()
    }
  }, [webinarId])

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 KB"
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
    return `${Math.round(bytes / 1024)} KB`
  }

  const getMaterialTypeBadge = (type: string) => {
    switch (type) {
      case "recording":
        return <Badge color="green">HD Video Recording</Badge>
      case "transcript":
        return <Badge color="blue">Verbatim Transcript</Badge>
      case "slides":
        return <Badge color="purple">Presentation Slides</Badge>
      case "worksheet":
        return <Badge color="orange">Practice Worksheet</Badge>
      case "handout":
        return <Badge color="blue">Reference Handout</Badge>
      default:
        return <Badge color="grey">{type || "General Asset"}</Badge>
    }
  }

  const getOptionBadge = (option: string) => {
    switch (option) {
      case "all":
        return <Badge color="purple">All Options Included</Badge>
      case "recording":
        return <Badge color="green">Recording Pass Only</Badge>
      case "transcript":
        return <Badge color="blue">Transcript Pass Only</Badge>
      case "pdf":
        return <Badge color="orange">Web Download Only</Badge>
      case "live":
        return <Badge color="red">Live Session Only</Badge>
      default:
        return <Badge color="grey">{option}</Badge>
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const selectedFiles = Array.from(e.target.files)

    // Automatically set default title from first file if title is empty
    if (!uploadForm.title && selectedFiles[0]) {
      const nameWithoutExt = selectedFiles[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      setUploadForm((prev) => ({
        ...prev,
        title: nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1),
      }))
    }

    setUploadQueue(
      selectedFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }))
    )
  }

  // Execute Upload Flow
  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (uploadQueue.length === 0) {
      setModalError("Please select at least one file to upload.")
      notify("error", "Please select at least one file to upload.")
      return
    }

    setUploading(true)

    try {
      for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i]
        const file = item.file

        // Update queue status
        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "uploading", progress: 10 } : q))
        )

        // 1. Convert file to Base64 dataUrl for server-side private upload
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = (err) => reject(err)
          reader.readAsDataURL(file)
        })

        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, progress: 50 } : q))
        )

        // 2. Call Direct S3 Upload endpoint
        const uploadRes = await fetch("/admin/webinar-files/direct-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            webinarId,
            materialType: uploadForm.material_type,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            dataUrl,
          }),
        })

        if (!uploadRes.ok) {
          let errMsg = `Upload failed (${uploadRes.status})`
          try {
            const errData = await uploadRes.json()
            if (errData?.message) errMsg = errData.message
          } catch {
            const text = await uploadRes.text()
            if (text) errMsg = text.slice(0, 150)
          }
          throw new Error(errMsg)
        }

        const uploadData = await uploadRes.json()

        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, progress: 85 } : q))
        )

        // 3. Register completed file record in PostgreSQL
        const fileTitle = uploadQueue.length === 1 && uploadForm.title ? uploadForm.title : file.name.replace(/\.[^/.]+$/, "")

        const recordRes = await fetch("/admin/webinar-files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            webinar_id: webinarId,
            title: fileTitle,
            description: uploadForm.description,
            purchase_option: uploadForm.purchase_option,
            material_type: uploadForm.material_type,
            s3_key: uploadData.s3_key,
            s3_bucket: uploadData.s3_bucket,
            s3_region: uploadData.s3_region,
            file_name: uploadData.file_name,
            file_size: uploadData.file_size,
            mime_type: uploadData.mime_type,
            is_active: uploadForm.is_active,
            display_order: uploadForm.display_order + i,
            upload_status: "completed",
          }),
        })

        if (!recordRes.ok) {
          let errMsg = `Failed to record file metadata (${recordRes.status})`
          try {
            const errData = await recordRes.json()
            if (errData?.message) errMsg = errData.message
          } catch {
            const text = await recordRes.text()
            if (text) errMsg = text.slice(0, 150)
          }
          throw new Error(errMsg)
        }

        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "done", progress: 100 } : q))
        )
      }

      notify("success", "Webinar material uploaded and registered successfully in private storage!")
      setIsUploadModalOpen(false)
      setUploadQueue([])
      setModalError(null)
      setUploadForm({
        title: "",
        description: "",
        material_type: "slides",
        purchase_option: "all",
        display_order: files.length + 1,
        is_active: true,
      })
      await fetchFiles()
    } catch (err: any) {
      setModalError(err.message || "Upload process failed.")
      notify("error", err.message || "Upload process failed.")
    } finally {
      setUploading(false)
    }
  }

  // Handle Edit Metadata Save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFile) return

    setSaving(true)
    try {
      const res = await fetch(`/admin/webinar-files/${editingFile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          title: editingFile.title,
          description: editingFile.description,
          purchase_option: editingFile.purchase_option,
          material_type: editingFile.material_type,
          display_order: editingFile.display_order,
          is_active: editingFile.is_active,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.message || "Failed to update file")
      }

      notify("success", "File details updated successfully.")
      setEditingFile(null)
      await fetchFiles()
    } catch (err: any) {
      notify("error", err.message || "Failed to save file updates.")
    } finally {
      setSaving(false)
    }
  }

  // Handle File Replacement
  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!replacingFile || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    setSaving(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
      })

      // Upload replacement to S3
      const uploadRes = await fetch("/admin/webinar-files/direct-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          webinarId,
          materialType: replacingFile.material_type,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        }),
      })

      if (!uploadRes.ok) {
        let errMsg = `Failed to upload replacement asset (${uploadRes.status})`
        try {
          const err = await uploadRes.json()
          if (err?.message) errMsg = err.message
        } catch {
          const text = await uploadRes.text()
          if (text) errMsg = text.slice(0, 150)
        }
        throw new Error(errMsg)
      }

      const uploadData = await uploadRes.json()

      // Update file record with new S3 key and dimensions
      const updateRes = await fetch(`/admin/webinar-files/${replacingFile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          s3_key: uploadData.s3_key,
          file_name: uploadData.file_name,
          file_size: uploadData.file_size,
          mime_type: uploadData.mime_type,
        }),
      })

      if (!updateRes.ok) {
        let errMsg = `Failed to update record with replaced file (${updateRes.status})`
        try {
          const err = await updateRes.json()
          if (err?.message) errMsg = err.message
        } catch {
          const text = await updateRes.text()
          if (text) errMsg = text.slice(0, 150)
        }
        throw new Error(errMsg)
      }

      notify("success", `File "${replacingFile.title}" successfully replaced with ${file.name}.`)
      setReplacingFile(null)
      await fetchFiles()
    } catch (err: any) {
      notify("error", err.message || "Failed to replace file.")
    } finally {
      setSaving(false)
    }
  }

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (file: WebinarFileItem) => {
    try {
      const res = await fetch(`/admin/webinar-files/${file.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          is_active: !file.is_active,
        }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      notify("success", `File status changed to ${!file.is_active ? "Active" : "Inactive"}.`)
      await fetchFiles()
    } catch (err: any) {
      notify("error", err.message || "Failed to toggle status.")
    }
  }

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return
    setSaving(true)
    try {
      const res = await fetch(`/admin/webinar-files/${deleteCandidate.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to delete file")
      notify("success", `File "${deleteCandidate.title}" deleted and purged from storage.`)
      setDeleteCandidate(null)
      await fetchFiles()
    } catch (err: any) {
      notify("error", err.message || "Failed to delete file.")
    } finally {
      setSaving(false)
    }
  }

  // Handle Admin Presigned Preview
  const handlePreviewDownload = async (file: WebinarFileItem) => {
    setPreviewingId(file.id)
    try {
      const res = await fetch(`/admin/webinar-files/${file.id}/preview`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to generate preview URL")
      const data = await res.json()
      if (data.download_url) {
        window.open(data.download_url, "_blank", "noopener,noreferrer")
      }
    } catch (err: any) {
      notify("error", err.message || "Failed to preview file.")
    } finally {
      setPreviewingId(null)
    }
  }

  // Filtered files
  const filteredFiles = files.filter((f) => {
    if (materialFilter !== "all" && f.material_type !== materialFilter) return false
    if (optionFilter !== "all" && f.purchase_option !== optionFilter) return false
    if (statusFilter === "active" && !f.is_active) return false
    if (statusFilter === "inactive" && f.is_active) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      return (
        f.title.toLowerCase().includes(s) ||
        f.file_name.toLowerCase().includes(s) ||
        (f.description && f.description.toLowerCase().includes(s))
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h2" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Webinar Files & Private Amazon S3 Materials
              </Heading>
              <Badge color="purple" className="text-[11px]">
                Private S3 Access
              </Badge>
            </div>
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              Upload and manage private PDF slides, practice checklists, MP4 video recordings, and verbatim transcripts. Files are protected inside private S3 storage and delivered strictly via short-lived presigned download URLs upon verified order entitlement.
            </Text>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="small"
              onClick={fetchFiles}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl"
            >
              <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setUploadForm((prev) => ({ ...prev, display_order: files.length + 1 }))
                setIsUploadModalOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload Material
            </Button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Total Attached Files</span>
            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 block">
              {files.length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Active in Storefront</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {files.filter((f) => f.is_active).length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">Video Recordings</span>
            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 block">
              {files.filter((f) => f.material_type === "recording").length}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60">
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">PDFs, Slides & Transcripts</span>
            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 block">
              {files.filter((f) => f.material_type !== "recording").length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by title, filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Asset Types</option>
            <option value="slides">Presentation Slides</option>
            <option value="worksheet">Practice Worksheets</option>
            <option value="transcript">Verbatim Transcripts</option>
            <option value="recording">Video Recordings</option>
            <option value="handout">Reference Handouts</option>
            <option value="other">Other Materials</option>
          </select>

          <select
            value={optionFilter}
            onChange={(e) => setOptionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Purchase Options</option>
            <option value="recording">Recording Option</option>
            <option value="transcript">Transcript Option</option>
            <option value="pdf">Web Download Option</option>
            <option value="live">Live Session Option</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-400">
            <ArrowPath className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span className="text-xs">Loading secure webinar files from repository...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <ExclamationCircle className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
            <div>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                {files.length === 0 ? "No Private Files Uploaded Yet" : "No files matched your filter criteria"}
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                {files.length === 0
                  ? "Click 'Upload Material' to securely attach presentation slides, transcripts, MP4 recordings, or worksheets."
                  : "Try adjusting your search terms or filters above."}
              </p>
            </div>
            {files.length === 0 && (
              <Button
                variant="primary"
                size="small"
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs"
              >
                Upload First Asset
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-5 hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {file.title}
                    </span>
                    {getMaterialTypeBadge(file.material_type)}
                    {getOptionBadge(file.purchase_option)}
                    <Badge color={file.is_active ? "green" : "grey"} className="text-[10px]">
                      {file.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-[11px] text-neutral-400">Order: #{file.display_order}</span>
                  </div>

                  {file.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
                      {file.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                    <span>File: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{file.file_name}</strong></span>
                    <span>Size: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{formatFileSize(file.file_size)}</strong></span>
                    <span>Format: {file.mime_type}</span>
                    <span className="text-neutral-400">Key: {file.s3_key.slice(0, 32)}...</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handlePreviewDownload(file)}
                    disabled={previewingId === file.id}
                    title="Generate private presigned preview URL"
                    className="flex items-center gap-1.5 text-xs rounded-xl"
                  >
                    <ArrowDownTray className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{previewingId === file.id ? "Signing..." : "Preview"}</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleToggleActive(file)}
                    title={file.is_active ? "Deactivate (hide from customers)" : "Activate (show to authorized customers)"}
                    className="text-xs rounded-xl"
                  >
                    {file.is_active ? "Deactivate" : "Activate"}
                  </Button>

                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setEditingFile({ ...file })}
                    title="Edit metadata and access option"
                    className="p-2 rounded-xl"
                  >
                    <PencilSquare className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setReplacingFile(file)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                        fileInputRef.current.click()
                      }
                    }}
                    title="Replace file with a newer S3 asset"
                    className="flex items-center gap-1 text-xs rounded-xl"
                  >
                    <ArrowUpRightOnBox className="w-3 h-3" />
                    <span>Replace</span>
                  </Button>

                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => setDeleteCandidate(file)}
                    title="Purge file from private storage"
                    className="p-2 rounded-xl"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input for file replacement */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleReplaceFile}
        className="hidden"
      />

      {/* UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Upload Private Webinar Material
                </Heading>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  Webinar: {webinar?.title || "Selected Course"}
                </Text>
              </div>
              <button
                onClick={() => {
                  if (!uploading) {
                    setIsUploadModalOpen(false)
                    setUploadQueue([])
                  }
                }}
                className="p-1 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartUpload} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center justify-between">
                  <span>{modalError}</span>
                  <button type="button" onClick={() => setModalError(null)} className="opacity-70 hover:opacity-100">✕</button>
                </div>
              )}

              {/* File Dropzone Area */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                  Select File(s)
                </label>
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-neutral-50/50 dark:bg-neutral-800/30">
                  <input
                    type="file"
                    id="webinar_file_input"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="webinar_file_input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <ArrowDownTray className="w-8 h-8 text-neutral-400 rotate-180" />
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Click to browse or drag and drop files here
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Supported: PDF, MP4, MOV, PPTX, DOCX, XLSX, ZIP (Max 2.5GB for video, 200MB for documents)
                    </span>
                  </label>
                </div>

                {/* Queue display */}
                {uploadQueue.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadQueue.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                            {item.file.name} ({formatFileSize(item.file.size)})
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500">{item.progress}%</span>
                        </div>
                        {uploading && (
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Display Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Masterclass Presentation Slides & Checklist"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  disabled={uploading}
                  className="w-full text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or notes for attendees who download this file..."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  disabled={uploading}
                  className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Type and Purchase Option */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Asset Material Type
                  </label>
                  <select
                    value={uploadForm.material_type}
                    onChange={(e) => setUploadForm({ ...uploadForm, material_type: e.target.value })}
                    disabled={uploading}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="slides">Presentation Slides (PDF/PPT)</option>
                    <option value="worksheet">Practice Worksheet / Checklist</option>
                    <option value="handout">Reference Handout</option>
                    <option value="transcript">Verbatim Transcript</option>
                    <option value="recording">Video Recording Master (MP4)</option>
                    <option value="other">Other Educational Resource</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Associated Purchase Option
                  </label>
                  <select
                    value={uploadForm.purchase_option}
                    onChange={(e) => setUploadForm({ ...uploadForm, purchase_option: e.target.value })}
                    disabled={uploading}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="all">Included in All Options (Universal)</option>
                    <option value="recording">Recording Option Only</option>
                    <option value="transcript">Transcript Option Only</option>
                    <option value="pdf">Web Download / Self-Study Only</option>
                    <option value="live">Live Session Attendees Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={uploadForm.display_order}
                    onChange={(e) => setUploadForm({ ...uploadForm, display_order: parseInt(e.target.value, 10) || 1 })}
                    disabled={uploading}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="pt-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={uploadForm.is_active}
                    onChange={(e) => setUploadForm({ ...uploadForm, is_active: e.target.checked })}
                    disabled={uploading}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_active_toggle" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    Active (Publish to Entitled Users)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploading}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={uploading || uploadQueue.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  {uploading ? (
                    <span className="flex items-center gap-1.5">
                      <ArrowPath className="w-3.5 h-3.5 animate-spin" />
                      Uploading & Securing...
                    </span>
                  ) : (
                    "Upload & Save Material"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Edit File Metadata
              </Heading>
              <button onClick={() => setEditingFile(null)} className="p-1 rounded-xl hover:bg-neutral-100 text-neutral-500">
                <XMark className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Title
                </label>
                <Input
                  required
                  value={editingFile.title}
                  onChange={(e) => setEditingFile({ ...editingFile, title: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingFile.description || ""}
                  onChange={(e) => setEditingFile({ ...editingFile, description: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Material Type
                  </label>
                  <select
                    value={editingFile.material_type}
                    onChange={(e) => setEditingFile({ ...editingFile, material_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                  >
                    <option value="slides">Presentation Slides</option>
                    <option value="worksheet">Practice Worksheet</option>
                    <option value="handout">Reference Handout</option>
                    <option value="transcript">Verbatim Transcript</option>
                    <option value="recording">Video Recording</option>
                    <option value="other">Other Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Purchase Option
                  </label>
                  <select
                    value={editingFile.purchase_option}
                    onChange={(e) => setEditingFile({ ...editingFile, purchase_option: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                  >
                    <option value="all">Included in All Options</option>
                    <option value="recording">Recording Option Only</option>
                    <option value="transcript">Transcript Option Only</option>
                    <option value="pdf">Web Download Only</option>
                    <option value="live">Live Session Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={editingFile.display_order}
                    onChange={(e) => setEditingFile({ ...editingFile, display_order: parseInt(e.target.value, 10) || 1 })}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="pt-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit_is_active"
                    checked={editingFile.is_active}
                    onChange={(e) => setEditingFile({ ...editingFile, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="edit_is_active" className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                    Active & Accessible
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button type="button" variant="secondary" size="small" onClick={() => setEditingFile(null)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="small" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-2xl bg-red-100 dark:bg-red-950/60">
                <Trash className="w-5 h-5" />
              </div>
              <Heading level="h3" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Delete Webinar Asset
              </Heading>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-neutral-800 dark:text-neutral-200">"{deleteCandidate.title}"</strong> ({deleteCandidate.file_name})? This file will be revoked from all entitled customers and purged from private S3 storage.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button variant="secondary" size="small" onClick={() => setDeleteCandidate(null)} disabled={saving} className="rounded-xl">
                Cancel
              </Button>
              <Button variant="danger" size="small" onClick={handleConfirmDelete} disabled={saving} className="rounded-xl">
                {saving ? "Purging..." : "Confirm Deletion"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
