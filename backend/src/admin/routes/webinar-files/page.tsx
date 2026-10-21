import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CloudArrowUp, ArrowPath } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"
import WebinarFilesTab from "../webinars/components/WebinarFilesTab"

export const config = defineRouteConfig({
  label: "Learning Materials & S3",
  icon: CloudArrowUp,
  rank: 50,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export default function StandaloneWebinarFilesPage() {
  const { isDark } = useAdminTheme()
  const [webinars, setWebinars] = useState<any[]>([])
  const [selectedWebinarId, setSelectedWebinarId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const notify = (type: "success" | "error", text: string) => {
    setNotice({ type, text })
    setTimeout(() => setNotice(null), 5000)
  }

  useEffect(() => {
    fetchWebinars()
  }, [])

  const fetchWebinars = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/webinar-files?webinar_id=all", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error("Failed to load webinars")
      const data = await res.json()
      const list = data.webinars || []
      setWebinars(list)
      if (list.length > 0 && !selectedWebinarId) {
        setSelectedWebinarId(list[0].id)
      }
    } catch (err: any) {
      notify("error", err.message || "Failed to load webinars list")
    } finally {
      setLoading(false)
    }
  }

  const selectedWebinar = webinars.find((w) => w.id === selectedWebinarId) || webinars[0]

  return (
    <Container className="space-y-6 max-w-7xl mx-auto py-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            notice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Header with Webinar Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
        <div>
          <Heading level="h1" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Private Amazon S3 Webinar File Manager
          </Heading>
          <Text className="text-xs text-neutral-500 mt-1">
            Centrally manage PDF study guides, slides, HD MP4 recordings, and transcripts across all webinars.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
              Select Webinar:
            </span>
            <select
              value={selectedWebinarId}
              onChange={(e) => setSelectedWebinarId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 max-w-xs sm:max-w-md truncate"
            >
              {webinars.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.category})
                </option>
              ))}
            </select>
          </div>

          <AdminThemeToggle />
        </div>
      </div>

      {/* File Management View for Selected Webinar */}
      {selectedWebinar ? (
        <WebinarFilesTab
          webinar={selectedWebinar}
          webinarId={selectedWebinar.id}
          notify={notify}
          getAuthHeaders={getAuthHeaders}
        />
      ) : loading ? (
        <div className="p-12 text-center text-neutral-400">
          <ArrowPath className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span className="text-xs">Loading webinars...</span>
        </div>
      ) : null}
    </Container>
  )
}
