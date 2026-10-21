import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  AcademicCap,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  DocumentText,
  MagnifyingGlass,
  ArrowDownTray,
  ExclamationCircle,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "CPE Certificates",
  icon: DocumentText,
  rank: 51,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export default function CertificatesAdminPage() {
  const { isDark } = useAdminTheme()
  const [activeTab, setActiveTab] = useState<"attempts" | "certificates">("attempts")
  const [attempts, setAttempts] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [stats, setStats] = useState<any>({
    total_certificates: 0,
    total_attempts: 0,
    passed_attempts: 0,
    failed_attempts: 0,
    total_cpe_credits_issued: 0,
  })
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal State for Cooldown Reset
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetReason, setResetReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Modal State for Certificate Reissue
  const [selectedCert, setSelectedCert] = useState<any | null>(null)
  const [isReissueModalOpen, setIsReissueModalOpen] = useState(false)
  const [reissueName, setReissueName] = useState("")
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const loadReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (searchQuery) params.append("q", searchQuery)

      const res = await fetch(`/admin/certificates/reports?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!res.ok) throw new Error("Failed to load certificate reports")
      const data = await res.json()
      setAttempts(data.attempts || [])
      setCertificates(data.certificates || [])
      if (data.stats) setStats(data.stats)
    } catch (err: any) {
      console.error(err)
      notify("error", err.message || "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [statusFilter, searchQuery])

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const handleResetCooldown = async () => {
    if (!selectedAttempt) return
    setActionLoading(true)
    try {
      const res = await fetch(`/admin/certificates/attempts/${selectedAttempt.id}/reset-cooldown`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          reason: resetReason || "Administrative override authorized",
        }),
      })

      if (!res.ok) throw new Error("Failed to reset cooldown")
      notify("success", `Cooldown reset for ${selectedAttempt.customer_name || selectedAttempt.customer_email}. Participant can now retake quiz.`)
      setIsResetModalOpen(false)
      setSelectedAttempt(null)
      setResetReason("")
      await loadReports()
    } catch (err: any) {
      notify("error", err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReissueCertificate = async () => {
    if (!selectedCert) return
    setActionLoading(true)
    try {
      const res = await fetch(`/admin/certificates/${selectedCert.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          customer_name: reissueName || selectedCert.customer_name,
        }),
      })

      if (!res.ok) throw new Error("Failed to reissue certificate")
      notify("success", `Certificate #${selectedCert.certificate_number} successfully updated and reissued.`)
      setIsReissueModalOpen(false)
      setSelectedCert(null)
      setReissueName("")
      await loadReports()
    } catch (err: any) {
      notify("error", err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const exportCsv = () => {
    const isAttempts = activeTab === "attempts"
    let csvContent = "data:text/csv;charset=utf-8,"

    if (isAttempts) {
      csvContent += "ID,Customer Name,Email,Webinar Title,Attempt Number,Score %,Passed,Submitted At,Cooldown Active\n"
      for (const a of attempts) {
        const row = [
          a.id,
          `"${(a.customer_name || "").replace(/"/g, '""')}"`,
          a.customer_email,
          `"${(a.webinar_title || "").replace(/"/g, '""')}"`,
          a.attempt_number,
          a.score_percentage,
          a.passed ? "Yes" : "No",
          a.submitted_at,
          a.next_eligible_at && new Date(a.next_eligible_at) > new Date() && !a.cooldown_reset_by_admin ? "Yes" : "No",
        ]
        csvContent += row.join(",") + "\n"
      }
    } else {
      csvContent += "Certificate Number,Customer Name,Email,Webinar Title,Issue Date,CPE Credits,Score %,Status\n"
      for (const c of certificates) {
        const row = [
          c.certificate_number,
          `"${(c.customer_name || "").replace(/"/g, '""')}"`,
          c.customer_email,
          `"${(c.webinar_title || "").replace(/"/g, '""')}"`,
          c.issue_date,
          c.cpe_credits,
          c.score_percentage,
          c.status,
        ]
        csvContent += row.join(",") + "\n"
      }
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const now = new Date()

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} p-8`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-2xl font-bold">
                Certificates & Quiz Reports
              </Heading>
              <Badge color="blue" size="small">NASBA / IRS Audit Registry</Badge>
            </div>
            <Text className="text-sm text-slate-500 mt-1">
              Monitor post-webinar comprehension quizzes, manage 60-minute retake cooldowns, and review issued certificates.
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="small" onClick={exportCsv} className="flex items-center gap-1.5">
              <ArrowDownTray className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
            <Button variant="secondary" size="small" onClick={loadReports} disabled={loading} className="flex items-center gap-1.5">
              <ArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            <AdminThemeToggle />
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300"
            }`}
          >
            <div className="flex items-center gap-2 font-medium">
              {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4" /> : <ExclamationCircle className="w-4 h-4" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>
              <XMark className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Executive Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Certificates Issued</Text>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total_certificates}
            </div>
            <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Verified credentials</Text>
          </Container>

          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Total CPE Hours</Text>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {Number(stats.total_cpe_credits_issued || 0).toFixed(1)}
            </div>
            <Text className="text-[11px] text-slate-400 mt-0.5">Continuing education hours</Text>
          </Container>

          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Quiz Attempts</Text>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.total_attempts}
            </div>
            <Text className="text-[11px] text-slate-400 mt-0.5">Total submissions evaluated</Text>
          </Container>

          <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <Text className="text-xs font-semibold text-slate-500 uppercase">Passing Rate</Text>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.total_attempts > 0
                ? `${Math.round((stats.passed_attempts / stats.total_attempts) * 100)}%`
                : "100%"}
            </div>
            <Text className="text-[11px] text-slate-400 mt-0.5">75% passing threshold</Text>
          </Container>
        </div>

        {/* Tab Controls & Filter Bar */}
        <Container className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("attempts")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "attempts"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Quiz Attempts & Cooldown Audits ({attempts.length})
              </button>
              <button
                onClick={() => setActiveTab("certificates")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "certificates"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Issued Certificates Registry ({certificates.length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Input
                  placeholder="Search participant or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                />
              </div>

              {activeTab === "attempts" && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="passed">Passed Only</option>
                  <option value="failed">Failed Only</option>
                  <option value="cooldown">Cooldown Active Only</option>
                </select>
              )}
            </div>
          </div>

          {/* TAB 1: ATTEMPTS LIST */}
          {activeTab === "attempts" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Webinar Title</th>
                    <th className="py-3 px-4 text-center">Attempt #</th>
                    <th className="py-3 px-4 text-center">Score %</th>
                    <th className="py-3 px-4">Status & Cooldown</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {attempts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No quiz attempts found.
                      </td>
                    </tr>
                  ) : (
                    attempts.map((att) => {
                      const isCooldown =
                        !att.passed &&
                        att.next_eligible_at &&
                        new Date(att.next_eligible_at) > now &&
                        !att.cooldown_reset_by_admin
                      const remMin = isCooldown
                        ? Math.ceil((new Date(att.next_eligible_at).getTime() - now.getTime()) / 60000)
                        : 0

                      return (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {att.customer_name || "Participant"}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{att.customer_email}</div>
                          </td>

                          <td className="py-3 px-4 max-w-xs truncate" title={att.webinar_title}>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{att.webinar_title}</span>
                          </td>

                          <td className="py-3 px-4 text-center font-bold font-mono">
                            #{att.attempt_number}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-black font-mono text-[11px] ${
                                att.passed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                              }`}
                            >
                              {att.score_percentage}%
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {att.passed ? (
                              <Badge color="green" size="small">Passed & Certified</Badge>
                            ) : isCooldown ? (
                              <div className="space-y-0.5">
                                <Badge color="orange" size="small">Cooldown Active ({remMin}m left)</Badge>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Until {new Date(att.next_eligible_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            ) : att.cooldown_reset_by_admin ? (
                              <Badge color="blue" size="small">Override by Admin</Badge>
                            ) : (
                              <Badge color="grey" size="small">Failed (Cooldown Expired)</Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {new Date(att.submitted_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isCooldown && (
                              <Button
                                size="small"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedAttempt(att)
                                  setIsResetModalOpen(true)
                                }}
                                className="text-[11px] font-bold text-amber-600 hover:text-amber-700"
                              >
                                Reset Cooldown
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CERTIFICATES LIST */}
          {activeTab === "certificates" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Certificate #</th>
                    <th className="py-3 px-4">Participant Name</th>
                    <th className="py-3 px-4">Webinar Title</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4 text-center">CPE Hours</th>
                    <th className="py-3 px-4 text-center">Score %</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {certificates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No issued certificates recorded.
                      </td>
                    </tr>
                  ) : (
                    certificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {cert.certificate_number}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{cert.customer_name}</div>
                          <div className="text-[11px] text-slate-400">{cert.customer_email}</div>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate" title={cert.webinar_title}>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{cert.webinar_title}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-500">
                          {new Date(cert.issue_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </td>

                        <td className="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                          {cert.cpe_credits}
                        </td>

                        <td className="py-3 px-4 text-center font-bold font-mono text-emerald-700">
                          {cert.score_percentage}%
                        </td>

                        <td className="py-3 px-4">
                          <Badge
                            color={cert.status === "active" ? "green" : cert.status === "reissued" ? "blue" : "red"}
                            size="small"
                          >
                            {cert.status}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => {
                              setSelectedCert(cert)
                              setReissueName(cert.customer_name)
                              setIsReissueModalOpen(true)
                            }}
                            className="text-[11px] font-bold"
                          >
                            Correct / Reissue
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Container>

        {/* MODAL 1: RESET COOLDOWN */}
        {isResetModalOpen && selectedAttempt && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <Heading level="h3" className="text-lg font-bold">
                  Reset Retake Cooldown
                </Heading>
                <button onClick={() => setIsResetModalOpen(false)}>
                  <XMark className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  You are overriding the mandatory 60-minute cooling period for:
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div><strong>Participant:</strong> {selectedAttempt.customer_name} ({selectedAttempt.customer_email})</div>
                  <div><strong>Webinar:</strong> {selectedAttempt.webinar_title}</div>
                  <div><strong>Previous Score:</strong> {selectedAttempt.score_percentage}%</div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Reason for Administrative Override:
                  </label>
                  <Input
                    placeholder="e.g., Authorized by Course Instructor"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400">
                    This action will be saved in the permanent audit trail.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="small" onClick={() => setIsResetModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="small" onClick={handleResetCooldown} disabled={actionLoading}>
                  {actionLoading ? "Resetting..." : "Confirm & Reset Cooldown"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: REISSUE CERTIFICATE */}
        {isReissueModalOpen && selectedCert && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <Heading level="h3" className="text-lg font-bold">
                  Reissue / Correct Certificate
                </Heading>
                <button onClick={() => setIsReissueModalOpen(false)}>
                  <XMark className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300">
                  Update attendee legal name or credentials for certificate <strong>#{selectedCert.certificate_number}</strong>:
                </p>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Corrected Attendee Full Name:
                  </label>
                  <Input
                    value={reissueName}
                    onChange={(e) => setReissueName(e.target.value)}
                    placeholder="Legal Full Name"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="small" onClick={() => setIsReissueModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="small" onClick={handleReissueCertificate} disabled={actionLoading}>
                  {actionLoading ? "Saving..." : "Update & Reissue"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
