import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { LockClosedSolid, Plus, Trash, ArrowPath, XMark, CheckCircle, Sparkles, UserGroup } from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Registrations & Access",
  icon: LockClosedSolid,
  rank: 23,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export default function EntitlementsAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [entitlements, setEntitlements] = useState<any[]>([])
  const [webinars, setWebinars] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [grantForm, setGrantForm] = useState({
    customer_id: "",
    customer_email: "",
    webinar_id: "",
    access_type: "bundle",
    notes: "Manual grant by administrator",
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const resE = await fetch("/admin/entitlements?limit=100", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const dataE = await resE.json()
      if (dataE.entitlements) {
        setEntitlements(dataE.entitlements)
      }

      const resW = await fetch("/admin/webinars?limit=100", {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const dataW = await resW.json()
      if (dataW.webinars) {
        setWebinars(dataW.webinars)
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const notify = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text })
    setTimeout(() => setStatusMessage(null), 5000)
  }

  const handleGrant = async (e: React.FormEvent) => {
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
        loadData()
      } else {
        notify("error", "Failed to grant entitlement.")
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  const handleRevoke = async (id: string) => {
    const reason = prompt("Enter revocation reason:", "Administrative audit adjustment")
    if (!reason) return
    try {
      const res = await fetch(`/admin/entitlements/${id}/revoke`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        notify("success", "Entitlement revoked successfully.")
        loadData()
      }
    } catch (e: any) {
      notify("error", e.message)
    }
  }

  const filtered = entitlements.filter(
    (e) =>
      e.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.webinar?.title && e.webinar.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.order_id && e.order_id.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const activeCount = entitlements.filter((e) => e.status === "active").length
  const bundleCount = entitlements.filter((e) => e.access_type === "bundle").length
  const liveCount = entitlements.filter((e) => e.access_type === "live").length

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 transition-colors duration-200">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
            <LockClosedSolid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Customer Entitlements & Access
              </Heading>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Access Audit
              </span>
            </div>
            <Text className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Audit and manage active access rights for webinars, live broadcasts, recordings, and PDF downloads.
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
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={() => setIsGrantModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Grant Access
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Entitlements */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Active Entitlements
            </span>
            <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Verified student permissions</span>
          </div>
        </div>

        {/* All-Access Bundles */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Full Packages
            </span>
            <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {bundleCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
            <span>All-Inclusive bundles</span>
          </div>
        </div>

        {/* Live Attendance */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Live Stream Pass
            </span>
            <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <UserGroup className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {liveCount}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Real-time broadcast attendees</span>
          </div>
        </div>

        {/* Total Grants */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Records
            </span>
            <span className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              <LockClosedSolid className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100">
            {entitlements.length}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-neutral-500"></span>
            <span>Lifetime security grants</span>
          </div>
        </div>
      </div>

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

      <div className="p-5 sm:p-6 space-y-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-sm">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search email, webinar title, order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm rounded-xl bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
          />
        </div>

        <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 text-xs uppercase border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 font-semibold">Customer Email</th>
                <th className="p-4 font-semibold">Webinar Course</th>
                <th className="p-4 font-semibold">Entitlement Type</th>
                <th className="p-4 font-semibold">Order Reference</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-neutral-400 dark:text-neutral-500">
                    No entitlements matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((ent) => (
                  <tr key={ent.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-4 font-semibold text-neutral-900 dark:text-neutral-100">{ent.customer_email}</td>
                    <td className="p-4 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {ent.webinar?.title || ent.webinar_id}
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
                    <td className="p-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">{ent.order_id || "N/A"}</td>
                    <td className="p-4">
                      <Badge size="small" color={ent.status === "active" ? "green" : "red"}>
                        {ent.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {ent.status === "active" ? (
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleRevoke(ent.id)}
                          className="rounded-xl px-2.5 py-1 text-xs"
                        >
                          Revoke Access
                        </Button>
                      ) : (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

            <form onSubmit={handleGrant} className="space-y-4 text-xs font-semibold">
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
                  Grant Access
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
