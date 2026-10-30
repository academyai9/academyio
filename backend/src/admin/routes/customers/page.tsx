import React, { useState, useEffect, useTransition } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  UserGroup,
  PencilSquare,
  ArrowPath,
  CheckCircle,
  XMark,
  DocumentText,
  Buildings,
  Phone,
  MagnifyingGlass,
  Plus,
  Sparkles,
  LockClosedSolid,
  Trash,
  Eye,
  Calendar,
  Clock,
  ArrowDownTray,
  ExclamationCircle,
  CreditCard,
  ShoppingBag,
  Check,
  ArrowLeft,
  ArrowRight,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Customers",
  icon: UserGroup,
  rank: 10,
})

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("medusa_auth_token") : null
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

interface CustomerSummary {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  full_name: string
  phone: string | null
  company_name: string | null
  has_account: boolean
  has_password: boolean
  account_status: "active" | "inactive" | "suspended"
  last_login_at: string | null
  ptin: string | null
  cfp_id: string | null
  license_type: string | null
  total_orders: number
  completed_orders: number
  subscription_status: string
  subscription_plan_name: string | null
  subscription_period_end: string | null
  entitlements_count: number
  created_at: string
  updated_at: string
}

interface Metrics {
  total: number
  active: number
  inactive: number
  suspended: number
  subscribed: number
  total_orders: number
}

interface CustomerDetail extends CustomerSummary {
  auth_id?: string
  auth_updated_at?: string
  password_updated_at?: string
  orders: Array<{
    id: string
    display_id: number
    status: string
    currency_code: string
    created_at: string
    canceled_at: string | null
    items_count: number
    total_amount: number
  }>
  entitlements: Array<{
    id: string
    order_id: string | null
    access_type: string
    status: string
    variant_title: string | null
    granted_at: string
    expires_at: string | null
    webinar_id: string
    webinar_title: string
    webinar_slug: string
    webinar_date: string | null
    webinar_category: string | null
    webinar_credits: number | null
    metadata?: any
  }>
  subscriptions: Array<{
    id: string
    plan_id: string
    plan_name: string
    status: string
    current_period_start: string
    current_period_end: string
    cancel_at_period_end: boolean
    monthly_access_used: number
    payment_provider_id: string | null
    payment_method_summary: string | null
    plan_price: number | null
    plan_interval: string | null
    plan_limit: number | null
    created_at: string
  }>
  certificates: Array<{
    id: string
    certificate_number: string
    cpe_credits: number
    score: number | null
    issued_at: string
    pdf_url: string | null
    webinar_id: string
    webinar_title: string
    webinar_slug: string
  }>
  password_resets: Array<{
    id: string
    email: string
    created_at: string
    expires_at: string
    used_at: string | null
    token_status: "active" | "used" | "expired"
  }>
  audit_logs: Array<{
    id: string
    admin_id: string | null
    admin_email: string | null
    action: string
    details: any
    ip_address: string | null
    created_at: string
  }>
}

export default function CustomersAdminPage() {
  const { isDark, toggleTheme } = useAdminTheme()
  const [isPending, startTransition] = useTransition()

  // Main Data States
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    subscribed: 0,
    total_orders: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters & Search & Pagination
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [designationFilter, setDesignationFilter] = useState("all")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)

  // Status Notification Banner
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info"
    message: string
  } | null>(null)

  // Customer Details Modal / Drawer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<
    "profile" | "orders" | "webinars" | "subscriptions" | "learning" | "security"
  >("profile")

  // Edit Customer Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CustomerSummary | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    ptin: "",
    cfp_id: "",
    license_type: "CPA",
    account_status: "active",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Send Password Reset Modal State
  const [isResetEmailModalOpen, setIsResetEmailModalOpen] = useState(false)
  const [resetTargetCustomer, setResetTargetCustomer] = useState<CustomerSummary | null>(null)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetEmailResult, setResetEmailResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Manually Set Password Modal State
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false)
  const [passwordTargetCustomer, setPasswordTargetCustomer] = useState<CustomerSummary | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [requirePasswordChange, setRequirePasswordChange] = useState(true)
  const [settingPassword, setSettingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Delete Customer Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTargetCustomer, setDeleteTargetCustomer] = useState<CustomerSummary | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState(false)

  // Bulk Selection & Delete State
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)

  // Load Customers List
  const loadCustomers = async () => {
    setLoading(true)
    try {
      const offset = pageIndex * pageSize
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
        sort_by: sortBy,
        sort_order: sortOrder,
        status: statusFilter,
        subscription_status: subscriptionFilter,
        designation: designationFilter,
      })
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim())
      }

      const res = await fetch(`/admin/customers-directory?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
        setTotalCount(data.count || 0)
        if (data.metrics) {
          setMetrics(data.metrics)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        setNotification({
          type: "error",
          message: err.message || "Failed to load customer list.",
        })
      }
    } catch (e: any) {
      console.error("Error loading customers:", e)
      setNotification({
        type: "error",
        message: e.message || "Failed to communicate with customer service.",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load Customer Full Details
  const loadCustomerDetails = async (id: string) => {
    setDetailsLoading(true)
    try {
      const res = await fetch(`/admin/customers-directory/${id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setCustomerDetail(data.customer)
      } else {
        setNotification({ type: "error", message: "Failed to load customer details." })
      }
    } catch (e: any) {
      console.error("Error loading customer details:", e)
    } finally {
      setDetailsLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [pageIndex, pageSize, sortBy, sortOrder, statusFilter, subscriptionFilter, designationFilter])

  // Trigger search on Enter or clear
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setPageIndex(0)
    loadCustomers()
  }

  // Quick Account Status Toggle (Active / Inactive / Suspended)
  const handleQuickStatusChange = async (customerId: string, newStatus: "active" | "inactive" | "suspended") => {
    try {
      const res = await fetch(`/admin/customers-directory/${customerId}/status`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotification({ type: "success", message: data.message || `Customer status set to ${newStatus}.` })
        loadCustomers()
        if (selectedCustomerId === customerId) {
          loadCustomerDetails(customerId)
        }
      } else {
        setNotification({ type: "error", message: data.message || "Failed to update account status." })
      }
    } catch (e: any) {
      setNotification({ type: "error", message: e.message || "Network error updating status." })
    }
  }

  // Open Edit Modal
  const openEditModal = (c: any) => {
    setEditCustomer(c)
    setEditError(null)
    setEditForm({
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      email: c.email || "",
      phone: c.phone || c.metadata?.phone || "",
      company_name: c.company_name || c.metadata?.company_name || "",
      ptin: c.ptin || c.metadata?.ptin || "",
      cfp_id: c.cfp_id || c.metadata?.cfp_id || "",
      license_type: c.license_type || c.metadata?.license_type || "CPA",
      account_status: c.account_status || c.metadata?.account_status || "active",
    })
    setIsEditModalOpen(true)
  }

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCustomer) return
    setSavingEdit(true)
    setEditError(null)

    // Validate PTIN if provided
    if (editForm.ptin.trim() && !/^P\d{8}$/i.test(editForm.ptin.trim())) {
      setEditError("Invalid PTIN format. Must start with 'P' followed by 8 digits (e.g., P12345678).")
      setSavingEdit(false)
      return
    }

    try {
      const res = await fetch(`/admin/customers-directory/${editCustomer.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok) {
        setNotification({ type: "success", message: "Customer profile updated successfully." })
        setIsEditModalOpen(false)
        loadCustomers()
        if (selectedCustomerId === editCustomer.id) {
          loadCustomerDetails(editCustomer.id)
        }
      } else {
        setEditError(data.message || "Failed to save profile changes.")
      }
    } catch (e: any) {
      setEditError(e.message || "Network error saving customer.")
    } finally {
      setSavingEdit(false)
    }
  }

  // Handle Send Password Reset Email
  const handleSendResetEmail = async () => {
    if (!resetTargetCustomer) return
    setSendingReset(true)
    setResetEmailResult(null)
    try {
      const res = await fetch(`/admin/customers-directory/${resetTargetCustomer.id}/reset-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        setResetEmailResult({
          type: "success",
          text: data.message || `Password reset link has been dispatched to ${resetTargetCustomer.email}.`,
        })
        if (selectedCustomerId === resetTargetCustomer.id) {
          loadCustomerDetails(resetTargetCustomer.id)
        }
      } else {
        setResetEmailResult({
          type: "error",
          text: data.message || "Failed to send password reset email.",
        })
      }
    } catch (e: any) {
      setResetEmailResult({ type: "error", text: e.message || "Network error sending reset email." })
    } finally {
      setSendingReset(false)
    }
  }

  // Handle Manually Set Password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordTargetCustomer) return
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.")
      return
    }
    setSettingPassword(true)
    setPasswordError(null)

    try {
      const res = await fetch(`/admin/customers-directory/${passwordTargetCustomer.id}/set-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          password: newPassword,
          require_password_change: requirePasswordChange,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotification({
          type: "success",
          message: `Password successfully configured for ${passwordTargetCustomer.email}.`,
        })
        setIsSetPasswordModalOpen(false)
        setNewPassword("")
        loadCustomers()
        if (selectedCustomerId === passwordTargetCustomer.id) {
          loadCustomerDetails(passwordTargetCustomer.id)
        }
      } else {
        setPasswordError(data.message || "Failed to set password.")
      }
    } catch (e: any) {
      setPasswordError(e.message || "Network error setting password.")
    } finally {
      setSettingPassword(false)
    }
  }

  // Handle Single Customer Delete
  const handleDeleteCustomer = async () => {
    if (!deleteTargetCustomer) return
    setDeletingCustomer(true)
    try {
      const res = await fetch(`/admin/customers-directory/${deleteTargetCustomer.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        setNotification({
          type: "success",
          message: data.message || "Customer deleted successfully.",
        })
        setIsDeleteModalOpen(false)
        setSelectedCustomerIds((prev) => prev.filter((id) => id !== deleteTargetCustomer.id))
        if (selectedCustomerId === deleteTargetCustomer.id) {
          setSelectedCustomerId(null)
          setCustomerDetail(null)
        }
        setDeleteTargetCustomer(null)
        loadCustomers()
      } else {
        setNotification({ type: "error", message: data.message || "Failed to process deletion." })
      }
    } catch (e: any) {
      setNotification({ type: "error", message: e.message || "Network error deleting customer." })
    } finally {
      setDeletingCustomer(false)
    }
  }

  // Handle Multi-Select Checkboxes
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllOnPage = () => {
    const pageIds = customers.map((c) => c.id)
    if (pageIds.length === 0) return
    const allSelected = pageIds.every((id) => selectedCustomerIds.includes(id))
    if (allSelected) {
      setSelectedCustomerIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  // Handle Bulk Delete Customers
  const handleBulkDelete = async () => {
    if (selectedCustomerIds.length === 0) return
    setDeletingBulk(true)
    try {
      const res = await fetch("/admin/customers-directory/bulk-delete", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ ids: selectedCustomerIds }),
      })
      const data = await res.json()
      if (res.ok) {
        setNotification({
          type: "success",
          message: data.message || `Successfully deleted ${selectedCustomerIds.length} customer(s).`,
        })
        const deletedIds = [...selectedCustomerIds]
        setSelectedCustomerIds([])
        setIsBulkDeleteModalOpen(false)
        if (selectedCustomerId && deletedIds.includes(selectedCustomerId)) {
          setSelectedCustomerId(null)
          setCustomerDetail(null)
        }
        loadCustomers()
      } else {
        setNotification({
          type: "error",
          message: data.message || "Failed to delete selected customers.",
        })
      }
    } catch (e: any) {
      setNotification({
        type: "error",
        message: e.message || "Network error during bulk deletion.",
      })
    } finally {
      setDeletingBulk(false)
    }
  }

  // Format Helpers
  const formatDate = (dateStr: string | null | undefined, includeTime = false) => {
    if (!dateStr) return "—"
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return "—"
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
      })
    } catch {
      return "—"
    }
  }

  const formatCurrency = (amount: number | null | undefined, currency = "USD") => {
    if (amount === null || amount === undefined) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const getInitials = (first?: string | null, last?: string | null, email?: string) => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
    if (first) return first.slice(0, 2).toUpperCase()
    if (email) return email.slice(0, 2).toUpperCase()
    return "CU"
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-6 md:p-8 space-y-6">
      {/* Top Banner Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm transition-all shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : notification.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === "success" && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {notification.type === "error" && <ExclamationCircle className="w-5 h-5 flex-shrink-0" />}
            {notification.type === "info" && <Sparkles className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
          >
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserGroup className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Customer Management
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Manage registered customer accounts, professional credentials, order history, subscriptions, and password security.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AdminThemeToggle />
          <Button
            variant="secondary"
            size="small"
            onClick={() => loadCustomers()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl"
          >
            <ArrowPath className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total</span>
            <UserGroup className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">{metrics.total}</div>
          <div className="text-xs text-neutral-400 mt-0.5">Registered accounts</div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Active</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.active}</div>
          <div className="text-xs text-neutral-400 mt-0.5">In good standing</div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Inactive</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{metrics.inactive}</div>
          <div className="text-xs text-neutral-400 mt-0.5">Deactivated accounts</div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Suspended</span>
            <XMark className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{metrics.suspended}</div>
          <div className="text-xs text-neutral-400 mt-0.5">Access blocked</div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Subscribers</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metrics.subscribed}</div>
          <div className="text-xs text-neutral-400 mt-0.5">Active passes</div>
        </div>

        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Orders</span>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{metrics.total_orders}</div>
          <div className="text-xs text-neutral-400 mt-0.5">Lifetime orders</div>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlass className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, company, or PTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setPageIndex(0)
                  setTimeout(loadCustomers, 0)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <XMark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button type="submit" variant="primary" size="small" className="rounded-xl px-5">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Account Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPageIndex(0)
                }}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:outline-none"
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Subscription Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">Subscription:</span>
              <select
                value={subscriptionFilter}
                onChange={(e) => {
                  setSubscriptionFilter(e.target.value)
                  setPageIndex(0)
                }}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:outline-none"
              >
                <option value="all">All Subscriptions</option>
                <option value="active">Active Plan</option>
                <option value="none">No Subscription</option>
                <option value="canceled">Canceled</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Designation Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 font-medium">Designation:</span>
              <select
                value={designationFilter}
                onChange={(e) => {
                  setDesignationFilter(e.target.value)
                  setPageIndex(0)
                }}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:outline-none"
              >
                <option value="all">All Credentials</option>
                <option value="EA">EA / PTIN</option>
                <option value="CFP">CFP</option>
                <option value="CPA">CPA</option>
              </select>
            </div>
          </div>

          {/* Sort By & Order */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium focus:outline-none"
            >
              <option value="created_at">Registration Date</option>
              <option value="name">Customer Name</option>
              <option value="orders">Total Orders</option>
              <option value="last_login">Last Login</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-750"
              title={`Sorting ${sortOrder.toUpperCase()}`}
            >
              {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedCustomerIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 px-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl shadow-sm text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="font-bold text-rose-800 dark:text-rose-300">
              {selectedCustomerIds.length} customer{selectedCustomerIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedCustomerIds([])}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline font-medium"
            >
              Clear Selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="small"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="rounded-xl flex items-center gap-1.5"
            >
              <Trash className="w-3.5 h-3.5" />
              Delete Selected ({selectedCustomerIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Customer List Table Card */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-850 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">Customers</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              {totalCount} results
            </span>
          </div>

          <div className="text-xs text-neutral-400">
            Page {pageIndex + 1} of {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && customers.every((c) => selectedCustomerIds.includes(c.id))}
                    onChange={handleSelectAllOnPage}
                    className="rounded border-neutral-300 dark:border-neutral-700 text-rose-600 focus:ring-0 cursor-pointer"
                    title="Select All on Page"
                  />
                </th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-center">Subscription</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-neutral-400">
                    <ArrowPath className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-neutral-400">
                    <UserGroup className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No customers found matching your search or filters.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const initials = getInitials(c.first_name, c.last_name, c.email)
                  const isSelected = selectedCustomerIds.includes(c.id)
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50 transition-colors ${
                        isSelected ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectCustomer(c.id)}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-rose-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Name & Credentials */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-neutral-900 dark:text-white truncate">
                                {c.full_name || "Unnamed Customer"}
                              </span>
                              {c.ptin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                  PTIN: {c.ptin}
                                </span>
                              )}
                              {c.cfp_id && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                                  CFP: {c.cfp_id}
                                </span>
                              )}
                            </div>
                            {c.company_name && (
                              <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1 mt-0.5">
                                <Buildings className="w-3 h-3 flex-shrink-0" />
                                {c.company_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email & Auth badge */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">{c.email}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {c.has_password ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                              <LockClosedSolid className="w-2.5 h-2.5" />
                              Password set
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                              <ExclamationCircle className="w-2.5 h-2.5" />
                              No password
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">Not provided</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {formatDate(c.created_at)}
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4 text-center">
                        {c.account_status === "active" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active
                          </span>
                        )}
                        {c.account_status === "inactive" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Inactive
                          </span>
                        )}
                        {c.account_status === "suspended" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Subscription Status */}
                      <td className="py-3.5 px-4 text-center">
                        {c.subscription_status === "active" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" title={c.subscription_plan_name || "Active Plan"}>
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            {c.subscription_plan_name ? c.subscription_plan_name.slice(0, 16) : "Active Plan"}
                          </span>
                        ) : c.subscription_status === "canceled" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                            Canceled
                          </span>
                        ) : c.subscription_status === "expired" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                            Expired
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">None</span>
                        )}
                      </td>

                      {/* Orders */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          {c.total_orders}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-300">
                        {c.last_login_at ? (
                          <span title={new Date(c.last_login_at).toLocaleString()}>
                            {formatDate(c.last_login_at, true)}
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Edit profile */}
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                            title="Edit Customer Profile"
                          >
                            <PencilSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTargetCustomer(c)
                              setIsDeleteModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                            title="Delete Customer Account"
                          >
                            <Trash className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span>Delete</span>
                          </button>

                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id)
                              setDetailTab("profile")
                              loadCustomerDetails(c.id)
                            }}
                            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
                            title="View Full Customer Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Password Dropdown / Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordTargetCustomer(c)
                              setNewPassword("")
                              setPasswordError(null)
                              setIsSetPasswordModalOpen(true)
                            }}
                            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-amber-600 dark:text-amber-400 transition-all cursor-pointer"
                            title="Set Password"
                          >
                            <LockClosedSolid className="w-3.5 h-3.5" />
                          </button>

                          {/* Send Reset Email */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetCustomer(c)
                              setResetEmailResult(null)
                              setIsResetEmailModalOpen(true)
                            }}
                            className="p-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer"
                            title="Send Password Reset Email"
                          >
                            <ArrowPath className="w-3.5 h-3.5" />
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

        {/* Pagination Bar */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPageIndex(0)
              }}
              className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-neutral-400 ml-2">
              Showing {totalCount === 0 ? 0 : pageIndex * pageSize + 1}–
              {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPageIndex(Math.max(pageIndex - 1, 0))}
              disabled={pageIndex === 0 || loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-neutral-700 dark:text-neutral-300">
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPageIndex(Math.min(pageIndex + 1, totalPages - 1))}
              disabled={pageIndex >= totalPages - 1 || loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CUSTOMER DETAILS MODAL / DRAWER (6 TABS)                                  */}
      {/* ========================================================================= */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-850/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {customerDetail
                    ? getInitials(customerDetail.first_name, customerDetail.last_name, customerDetail.email)
                    : "CU"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {customerDetail?.full_name || "Customer Details"}
                    </h2>
                    {customerDetail?.account_status === "active" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    )}
                    {customerDetail?.account_status === "inactive" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Inactive
                      </span>
                    )}
                    {customerDetail?.account_status === "suspended" && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {customerDetail?.email} • ID: <span className="font-mono">{customerDetail?.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {customerDetail && (
                  <>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => openEditModal(customerDetail)}
                      className="rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <PencilSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => {
                        setDeleteTargetCustomer(customerDetail)
                        setIsDeleteModalOpen(true)
                      }}
                      className="rounded-xl flex items-center gap-1.5 px-3 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      Delete Customer
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setPasswordTargetCustomer(customerDetail)
                        setNewPassword("")
                        setPasswordError(null)
                        setIsSetPasswordModalOpen(true)
                      }}
                      className="rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <LockClosedSolid className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Set Password
                    </Button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedCustomerId(null)
                    setCustomerDetail(null)
                  }}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <XMark className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-6 gap-2 bg-white dark:bg-neutral-900 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setDetailTab("profile")}
                className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === "profile"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <UserGroup className="w-3.5 h-3.5" />
                Profile Information
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("orders")}
                className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === "orders"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Orders & Payments ({customerDetail?.orders?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("webinars")}
                className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === "webinars"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Webinar Registrations ({customerDetail?.entitlements?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("subscriptions")}
                className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === "subscriptions"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Subscriptions ({customerDetail?.subscriptions?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("learning")}
                className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === "learning"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <DocumentText className="w-3.5 h-3.5" />
                Learning Materials & CPE ({customerDetail?.certificates?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setDetailTab("security")}
                className={`py-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  detailTab === "security"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <LockClosedSolid className="w-3.5 h-3.5" />
                Account Security & Password
              </button>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {detailsLoading || !customerDetail ? (
                <div className="py-20 text-center text-neutral-400">
                  <ArrowPath className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading customer file...
                </div>
              ) : (
                <>
                  {/* TAB 1: PROFILE INFORMATION */}
                  {detailTab === "profile" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Personal & Contact Details */}
                        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-3 text-xs">
                          <div className="flex items-center justify-between pb-1">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                              <UserGroup className="w-4 h-4 text-blue-500" />
                              Personal & Contact Details
                            </h3>
                            <button
                              type="button"
                              onClick={() => openEditModal(customerDetail)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                            >
                              <PencilSquare className="w-3.5 h-3.5" />
                              Edit Profile
                            </button>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">First Name:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.first_name || "—"}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">Last Name:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.last_name || "—"}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">Email Address:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.email}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">Phone Number:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.phone || "Not provided"}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5">
                            <span className="text-neutral-500 dark:text-neutral-400">Company / Firm:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.company_name || "Independent / Not listed"}
                            </span>
                          </div>
                        </div>

                        {/* Professional Regulatory Credentials */}
                        <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-3 text-xs">
                          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                            <Buildings className="w-4 h-4 text-emerald-500" />
                            Professional Regulatory Credentials
                          </h3>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">IRS PTIN:</span>
                            <span className="font-semibold">
                              {customerDetail.ptin ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                                  {customerDetail.ptin}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic">Not set</span>
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">CFP Board ID:</span>
                            <span className="font-semibold">
                              {customerDetail.cfp_id ? (
                                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                                  {customerDetail.cfp_id}
                                </span>
                              ) : (
                                <span className="text-neutral-400 italic">Not set</span>
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5 border-b border-neutral-200/60 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400">Primary Credential:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.license_type || "CPA"}
                            </span>
                          </div>

                          <div className="flex justify-between py-1.5">
                            <span className="text-neutral-500 dark:text-neutral-400">CPE Certificates Issued:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.certificates?.length || 0} earned
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* System Metadata & Account State */}
                      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-3 text-xs">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-purple-500" />
                          Account Lifecycle & System Status
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-neutral-400 block mb-1">Account Status:</span>
                            <div className="flex items-center gap-2">
                              {customerDetail.account_status === "active" && (
                                <Badge color="green">Active (Can Login & Purchase)</Badge>
                              )}
                              {customerDetail.account_status === "inactive" && (
                                <Badge color="orange">Inactive (Access Paused)</Badge>
                              )}
                              {customerDetail.account_status === "suspended" && (
                                <Badge color="red">Suspended (Access Blocked)</Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-neutral-400 block mb-1">Registered At:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {formatDate(customerDetail.created_at, true)}
                            </span>
                          </div>

                          <div>
                            <span className="text-neutral-400 block mb-1">Last Login:</span>
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {customerDetail.last_login_at
                                ? formatDate(customerDetail.last_login_at, true)
                                : "Never logged in"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Danger Zone: Delete Customer Account */}
                      <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                            <Trash className="w-4 h-4" />
                            Danger Zone: Delete Customer Account
                          </h4>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            Permanently delete this customer account, authentication credentials, and subscriptions. Financial orders are kept safely for accounting audit records.
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => {
                            setDeleteTargetCustomer(customerDetail)
                            setIsDeleteModalOpen(true)
                          }}
                          className="rounded-xl flex items-center gap-1.5 whitespace-nowrap px-4 py-2 cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          Delete Customer
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ORDERS & PAYMENTS */}
                  {detailTab === "orders" && (
                    <div className="space-y-4">
                      {customerDetail.orders?.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400">
                          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No orders placed by this customer yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                              <tr>
                                <th className="py-2.5 px-4">Order ID</th>
                                <th className="py-2.5 px-4">Date</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-4 text-center">Items</th>
                                <th className="py-2.5 px-4 text-right">Total Amount</th>
                                <th className="py-2.5 px-4 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                              {customerDetail.orders.map((o) => (
                                <tr key={o.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                                  <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                                    #{o.display_id || o.id.slice(0, 8)}
                                  </td>
                                  <td className="py-3 px-4">{formatDate(o.created_at, true)}</td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        o.status === "completed"
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                          : o.status === "canceled"
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                      }`}
                                    >
                                      {o.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">{o.items_count}</td>
                                  <td className="py-3 px-4 text-right font-semibold">
                                    {formatCurrency(o.total_amount, o.currency_code)}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <a
                                      href={`/webapp/orders-management`}
                                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                      View in Orders →
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: WEBINAR REGISTRATIONS */}
                  {detailTab === "webinars" && (
                    <div className="space-y-4">
                      {customerDetail.entitlements?.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No webinar registrations or entitlements found.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                              <tr>
                                <th className="py-2.5 px-4">Webinar Title</th>
                                <th className="py-2.5 px-4">Event Date</th>
                                <th className="py-2.5 px-4">Access Format</th>
                                <th className="py-2.5 px-4">Source</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-4">Granted Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                              {customerDetail.entitlements.map((e) => (
                                <tr key={e.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                                  <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                                    {e.webinar_title || "Webinar"}
                                    {e.webinar_credits && (
                                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-normal">
                                        {e.webinar_credits} CPE
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">{formatDate(e.webinar_date)}</td>
                                  <td className="py-3 px-4 capitalize font-medium text-purple-600 dark:text-purple-400">
                                    {e.access_type || "Live Webinar"}
                                  </td>
                                  <td className="py-3 px-4">
                                    {e.order_id ? (
                                      <span className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                        Direct Order
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                        Subscription
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        e.status === "active"
                                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800"
                                      }`}
                                    >
                                      {e.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">{formatDate(e.granted_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SUBSCRIPTIONS */}
                  {detailTab === "subscriptions" && (
                    <div className="space-y-4">
                      {customerDetail.subscriptions?.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          This customer does not have any active or past subscriptions.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {customerDetail.subscriptions.map((s) => (
                            <div
                              key={s.id}
                              className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-4 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-5 h-5 text-indigo-500" />
                                  <span className="text-base font-bold text-neutral-900 dark:text-white">
                                    {s.plan_name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                      s.status === "active"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800"
                                    }`}
                                  >
                                    {s.status.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-neutral-900 dark:text-white">
                                  {formatCurrency(s.plan_price)} / {s.plan_interval || "month"}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                                <div>
                                  <span className="text-neutral-400 block mb-0.5">Current Period Start:</span>
                                  <span className="font-semibold">{formatDate(s.current_period_start)}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-400 block mb-0.5">Next Renewal Date:</span>
                                  <span className="font-semibold">{formatDate(s.current_period_end)}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-400 block mb-0.5">Webinar Usage:</span>
                                  <span className="font-semibold">
                                    {s.monthly_access_used} used
                                    {s.plan_limit ? ` of ${s.plan_limit}` : " (Unlimited)"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-400 block mb-0.5">Payment Method:</span>
                                  <span className="font-semibold">
                                    {s.payment_method_summary || s.payment_provider_id || "Stripe"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: LEARNING MATERIALS & CPE */}
                  {detailTab === "learning" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                          CPE Certificates & Credentials Earned
                        </h4>
                        <span className="text-xs text-neutral-400">
                          {customerDetail.certificates?.length || 0} certificates on file
                        </span>
                      </div>

                      {customerDetail.certificates?.length === 0 ? (
                        <div className="py-12 text-center text-neutral-400">
                          <DocumentText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No CPE certificates earned yet. Certificates appear after completing webinar quizzes.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                              <tr>
                                <th className="py-2.5 px-4">Certificate #</th>
                                <th className="py-2.5 px-4">Webinar</th>
                                <th className="py-2.5 px-4 text-center">CPE Credits</th>
                                <th className="py-2.5 px-4 text-center">Quiz Score</th>
                                <th className="py-2.5 px-4">Issued At</th>
                                <th className="py-2.5 px-4 text-right">Certificate PDF</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                              {customerDetail.certificates.map((cert) => (
                                <tr key={cert.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                                  <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                    {cert.certificate_number}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                                    {cert.webinar_title}
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold">{cert.cpe_credits}</td>
                                  <td className="py-3 px-4 text-center">
                                    {cert.score !== null ? `${cert.score}%` : "—"}
                                  </td>
                                  <td className="py-3 px-4">{formatDate(cert.issued_at, true)}</td>
                                  <td className="py-3 px-4 text-right">
                                    {cert.pdf_url ? (
                                      <a
                                        href={cert.pdf_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                                      >
                                        <ArrowDownTray className="w-3.5 h-3.5" />
                                        Download PDF
                                      </a>
                                    ) : (
                                      <span className="text-neutral-400 italic">Not generated</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 6: ACCOUNT SECURITY & PASSWORD CONTROL */}
                  {detailTab === "security" && (
                    <div className="space-y-6">
                      {/* Password Status & Quick Actions */}
                      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-850/50 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                              <LockClosedSolid className="w-4 h-4 text-amber-500" />
                              Customer Password & Authentication Status
                            </h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              {customerDetail.has_password
                                ? "This customer has a securely encrypted password and can authenticate directly."
                                : "No password configured. Customer cannot log in until an invitation or password is set."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => {
                                setResetTargetCustomer(customerDetail)
                                setResetEmailResult(null)
                                setIsResetEmailModalOpen(true)
                              }}
                              className="rounded-xl flex items-center gap-1.5"
                            >
                              <ArrowPath className="w-3.5 h-3.5" />
                              Send Reset Email
                            </Button>

                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => {
                                setPasswordTargetCustomer(customerDetail)
                                setNewPassword("")
                                setPasswordError(null)
                                setIsSetPasswordModalOpen(true)
                              }}
                              className="rounded-xl flex items-center gap-1.5"
                            >
                              <LockClosedSolid className="w-3.5 h-3.5" />
                              Set Password Manually
                            </Button>
                          </div>
                        </div>

                        {/* Account Access Toggle */}
                        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              Account Login Access:
                            </span>{" "}
                            <span className="text-neutral-500">
                              Control whether this customer can authenticate into the storefront.
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(customerDetail.id, "active")}
                              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                customerDetail.account_status === "active"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              }`}
                            >
                              Active
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(customerDetail.id, "inactive")}
                              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                customerDetail.account_status === "inactive"
                                  ? "bg-amber-600 text-white shadow-sm"
                                  : "border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              }`}
                            >
                              Inactive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(customerDetail.id, "suspended")}
                              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                customerDetail.account_status === "suspended"
                                  ? "bg-rose-600 text-white shadow-sm"
                                  : "border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                              }`}
                            >
                              Suspended
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Password Reset History */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Recent Password Reset Requests
                        </h4>
                        {customerDetail.password_resets?.length === 0 ? (
                          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400 text-center">
                            No recent password reset tokens generated for this customer.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                  <th className="py-2 px-3">Token Issued</th>
                                  <th className="py-2 px-3">Expires At</th>
                                  <th className="py-2 px-3">Status</th>
                                  <th className="py-2 px-3">Used At</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {customerDetail.password_resets.map((pr) => (
                                  <tr key={pr.id}>
                                    <td className="py-2 px-3">{formatDate(pr.created_at, true)}</td>
                                    <td className="py-2 px-3">{formatDate(pr.expires_at, true)}</td>
                                    <td className="py-2 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                          pr.token_status === "active"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                            : pr.token_status === "used"
                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                                        }`}
                                      >
                                        {pr.token_status.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">{formatDate(pr.used_at, true)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Security Audit Log */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Administrative Audit History
                        </h4>
                        {customerDetail.audit_logs?.length === 0 ? (
                          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400 text-center">
                            No administrative audit records logged for this customer yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                  <th className="py-2 px-3">Timestamp</th>
                                  <th className="py-2 px-3">Action</th>
                                  <th className="py-2 px-3">Administrator</th>
                                  <th className="py-2 px-3">Details / Changes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {customerDetail.audit_logs.map((al) => (
                                  <tr key={al.id}>
                                    <td className="py-2 px-3 whitespace-nowrap">{formatDate(al.created_at, true)}</td>
                                    <td className="py-2 px-3">
                                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 font-bold">
                                        {al.action}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-neutral-500">{al.admin_email || "System Admin"}</td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                                      {typeof al.details === "object"
                                        ? JSON.stringify(al.details)
                                        : String(al.details)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Danger Zone: Permanent Account Deletion */}
                      <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                            <Trash className="w-4 h-4" />
                            Danger Zone: Permanent Account Deletion
                          </h4>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            Permanently revoke customer login credentials, password hashes, entitlements, and customer record.
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => {
                            setDeleteTargetCustomer(customerDetail)
                            setIsDeleteModalOpen(true)
                          }}
                          className="rounded-xl flex items-center gap-1.5 whitespace-nowrap px-4 py-2 cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                          Delete Customer
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50/50 dark:bg-neutral-850/50">
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setSelectedCustomerId(null)
                  setCustomerDetail(null)
                }}
                className="rounded-xl px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT CUSTOMER MODAL                                                       */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <PencilSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Edit Customer Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <ExclamationCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <span className="text-[11px] text-neutral-400 mt-0.5 block">
                  Changing email also updates the customer login credential identity.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="(555) 000-0000"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Company / Firm</label>
                  <input
                    type="text"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                    placeholder="e.g. Acme CPA Group"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">IRS PTIN (P + 8 digits)</label>
                  <input
                    type="text"
                    value={editForm.ptin}
                    onChange={(e) => setEditForm({ ...editForm, ptin: e.target.value.toUpperCase() })}
                    placeholder="P00000000"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">CFP Board ID#</label>
                  <input
                    type="text"
                    value={editForm.cfp_id}
                    onChange={(e) => setEditForm({ ...editForm, cfp_id: e.target.value })}
                    placeholder="123456"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Primary Credential</label>
                  <select
                    value={editForm.license_type}
                    onChange={(e) => setEditForm({ ...editForm, license_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="CPA">CPA (Certified Public Accountant)</option>
                    <option value="EA">EA (Enrolled Agent)</option>
                    <option value="CFP">CFP (Certified Financial Planner)</option>
                    <option value="JD">Tax Attorney / JD / LLM</option>
                    <option value="Corporate">Corporate Controller / CFO</option>
                    <option value="Other">Other Accounting Professional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-500 font-medium mb-1">Account Status</label>
                  <select
                    value={editForm.account_status}
                    onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="active">Active (Access Granted)</option>
                    <option value="inactive">Inactive (Deactivated)</option>
                    <option value="suspended">Suspended (Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={savingEdit}
                  className="rounded-xl px-5"
                >
                  {savingEdit ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEND PASSWORD RESET EMAIL MODAL                                           */}
      {/* ========================================================================= */}
      {isResetEmailModalOpen && resetTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ArrowPath className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Send Password Reset Link
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetEmailModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            {resetEmailResult ? (
              <div
                className={`p-4 rounded-xl text-xs space-y-3 ${
                  resetEmailResult.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {resetEmailResult.type === "success" ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ExclamationCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="font-semibold">{resetEmailResult.text}</span>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setIsResetEmailModalOpen(false)}
                    className="rounded-xl"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  Generate a secure, single-use password reset link for:
                </p>
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-white">
                  {resetTargetCustomer.full_name} ({resetTargetCustomer.email})
                </div>
                <ul className="list-disc pl-4 space-y-1 text-neutral-500 dark:text-neutral-400 text-[11px]">
                  <li>Link contains a high-entropy 32-byte cryptographic token.</li>
                  <li>Valid for 1 hour from issuance.</li>
                  <li>Any prior unused reset tokens will be immediately invalidated.</li>
                  <li>Rate limited to a maximum of 5 requests per 15 minutes.</li>
                </ul>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => setIsResetEmailModalOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    disabled={sendingReset}
                    onClick={handleSendResetEmail}
                    className="rounded-xl px-5"
                  >
                    {sendingReset ? "Sending..." : "Dispatch Reset Email"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANUALLY SET CUSTOMER PASSWORD MODAL                                      */}
      {/* ========================================================================= */}
      {isSetPasswordModalOpen && passwordTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <LockClosedSolid className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Set Customer Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSetPasswordModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <ExclamationCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleSetPassword} className="space-y-4 text-xs">
              <div>
                <span className="text-neutral-500 block mb-1">Target Account:</span>
                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-white">
                  {passwordTargetCustomer.email}
                </div>
              </div>

              <div>
                <label className="block text-neutral-500 font-medium mb-1">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong password..."
                    className="w-full px-3 py-2 pr-16 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-white px-2 py-0.5 rounded"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className={newPassword.length >= 8 ? "text-emerald-500 font-bold" : "text-neutral-400"}>
                    {newPassword.length >= 8 ? "✓ 8+ chars" : "• Min 8 chars"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
                <input
                  type="checkbox"
                  id="req_change"
                  checked={requirePasswordChange}
                  onChange={(e) => setRequirePasswordChange(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="req_change" className="text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer">
                  Require customer to reset password upon their next login
                </label>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Security Policy: Password will be encrypted with scrypt-kdf (logN=15, r=8, p=1). Plaintext passwords are never stored or logged in audit records.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setIsSetPasswordModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={settingPassword || newPassword.length < 8}
                  className="rounded-xl px-5"
                >
                  {settingPassword ? "Encrypting & Saving..." : "Set Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE SINGLE CUSTOMER CONFIRMATION MODAL                                 */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && deleteTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 text-rose-600 dark:text-rose-400">
              <Trash className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete Customer Account
              </h3>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <p>
                Are you sure you want to permanently delete this customer?
              </p>
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-semibold text-neutral-900 dark:text-white">
                {deleteTargetCustomer.full_name || "Unnamed Customer"} ({deleteTargetCustomer.email})
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ExclamationCircle className="w-4 h-4 text-rose-600" />
                  Irreversible Action
                </span>
                <p className="text-[11px] leading-relaxed">
                  This will remove their profile, passwords, login credentials, and subscriptions. Any past orders will remain securely preserved in your order database as unlinked records.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                disabled={deletingCustomer}
                onClick={handleDeleteCustomer}
                className="rounded-xl px-5"
              >
                {deletingCustomer ? "Deleting..." : "Delete Customer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK DELETE CUSTOMERS CONFIRMATION MODAL                                  */}
      {/* ========================================================================= */}
      {isBulkDeleteModalOpen && selectedCustomerIds.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800 text-rose-600 dark:text-rose-400">
              <Trash className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Confirm Bulk Deletion
              </h3>
            </div>

            <div className="space-y-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <p>
                You are about to permanently delete <strong>{selectedCustomerIds.length}</strong> selected customer account(s).
              </p>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ExclamationCircle className="w-4 h-4 text-rose-600" />
                  Permanent Removal
                </span>
                <p className="text-[11px] leading-relaxed">
                  All login accounts, credentials, and subscriptions for these customers will be deleted immediately. Past order transactions will be unlinked and retained safely for accounting.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                disabled={deletingBulk}
                onClick={handleBulkDelete}
                className="rounded-xl px-5"
              >
                {deletingBulk
                  ? `Deleting ${selectedCustomerIds.length} Customers...`
                  : `Delete ${selectedCustomerIds.length} Customers`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
