import React, { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  ShoppingCart,
  MagnifyingGlass,
  ArrowPath,
  CheckCircle,
  XMark,
  Clock,
  ExclamationCircle,
  ArrowDownTray,
  Eye,
  CurrencyDollar,
  AcademicCap,
  ChevronLeft,
  ChevronRight,
  Calendar,
  PencilSquare,
  Trash,
} from "@medusajs/icons"
import { Container, Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { useAdminTheme, AdminThemeToggle } from "../../components/theme"

export const config = defineRouteConfig({
  label: "Orders Hub",
  icon: ShoppingCart,
  rank: 40,
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

interface OrderManagementItem {
  id: string
  display_id: number
  order_status: string
  customer_name: string
  customer_email: string
  customer_phone?: string | null
  created_at: string
  updated_at: string
  currency_code: string
  order_total: number
  paid_total: number
  refunded_total: number
  payment_status: string
  access_status: string
  items: Array<{
    id: string
    title: string
    variant_title?: string | null
    quantity: number
    unit_price: number | string
    product_id?: string
    variant_id?: string
  }>
  entitlements: Array<{
    id: string
    status: string
    access_type: string
    variant_title?: string | null
    granted_at?: string
  }>
  incidents: Array<{
    id: string
    incident_type: string
    severity: string
    status: string
    description: string
  }>
  has_attention_flag: boolean
}

export default function OrdersManagementPage() {
  const { isDark } = useAdminTheme()
  const [orders, setOrders] = useState<OrderManagementItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Pagination State
  const [search, setSearch] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [orderStatusFilter, setOrderStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [specificDate, setSpecificDate] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [daysSummary, setDaysSummary] = useState<
    Array<{ day: string; orders_count: number | string; paid_revenue: number | string }>
  >([])
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [sortBy, setSortBy] = useState("newest")
  const [page, setPage] = useState(0)
  const limit = 20

  // Day-Wise CSV Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState<"day" | "range" | "current">("day")
  const [exportSpecificDay, setExportSpecificDay] = useState(new Date().toISOString().split("T")[0])
  const [exportFromDay, setExportFromDay] = useState("")
  const [exportToDay, setExportToDay] = useState("")
  const [exportPaymentStatus, setExportPaymentStatus] = useState("all")
  const [exportOrderStatus, setExportOrderStatus] = useState("all")
  const [isExporting, setIsExporting] = useState(false)
  const [exportNotice, setExportNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Detailed Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderManagementItem | null>(null)
  const [detailedOrderData, setDetailedOrderData] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Bulk Selection & Delete State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)

  // Single Order Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<OrderManagementItem | null>(null)
  const [deletingOrder, setDeletingOrder] = useState(false)

  // Edit Order Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editTargetOrder, setEditTargetOrder] = useState<OrderManagementItem | null>(null)
  const [editForm, setEditForm] = useState({
    status: "pending",
    email: "",
    notes: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        q: search,
        payment_status: paymentFilter,
        order_status: orderStatusFilter,
        date_range: dateRange,
        specific_date: dateRange === "specific_day" ? specificDate : "",
        from_date: dateRange === "custom_range" ? fromDate : "",
        to_date: dateRange === "custom_range" ? toDate : "",
        requiring_attention: attentionOnly ? "true" : "false",
        sort_by: sortBy,
        limit: String(limit),
        offset: String(page * limit),
      })

      const res = await fetch(`/admin/orders-management?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Authentication required. Please refresh the page or log in again.")
        }
        throw new Error(`Failed to load orders (Status: ${res.status})`)
      }
      const data = await res.json()
      setOrders(data.orders || [])
      setTotalCount(data.count || 0)
      if (Array.isArray(data.days_summary)) {
        setDaysSummary(data.days_summary)
        if (data.days_summary.length > 0 && !specificDate) {
          // If no specific date selected yet, suggest the latest active day
          setSpecificDate(data.days_summary[0].day)
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load orders.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [search, paymentFilter, orderStatusFilter, dateRange, specificDate, fromDate, toDate, attentionOnly, sortBy, page])

  const openOrderDetails = async (orderItem: OrderManagementItem) => {
    setSelectedOrder(orderItem)
    setDetailLoading(true)
    setDetailedOrderData(null)
    setEmailFeedback(null)
    try {
      const res = await fetch(`/admin/orders-management/${orderItem.id}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setDetailedOrderData(data.order)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleResendEmail = async (orderId: string) => {
    setResendingEmail(true)
    setEmailFeedback(null)
    try {
      const res = await fetch(`/admin/orders-management/${orderId}/resend-email`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        setEmailFeedback({ type: "success", text: data.message || "Confirmation email resent successfully!" })
        if (data.notification) {
          setDetailedOrderData((prev: any) => ({
            ...prev,
            email_notification: data.notification,
          }))
        }
      } else {
        setEmailFeedback({ type: "error", text: data.message || data.error || "Failed to resend confirmation email." })
      }
    } catch (err: any) {
      setEmailFeedback({ type: "error", text: err.message || "An unexpected error occurred while resending email." })
    } finally {
      setResendingEmail(false)
    }
  }

  // Handle Multi-Select Checkboxes for Orders
  const handleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllOrdersOnPage = () => {
    const pageIds = orders.map((o) => o.id)
    if (pageIds.length === 0) return
    const allSelected = pageIds.every((id) => selectedOrderIds.includes(id))
    if (allSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  // Open Edit Order Modal
  const openEditOrderModal = (ord: OrderManagementItem) => {
    setEditTargetOrder(ord)
    setEditError(null)
    setEditForm({
      status: ord.order_status || "pending",
      email: ord.customer_email || "",
      notes: "",
    })
    setIsEditModalOpen(true)
  }

  // Handle Save Edit Order
  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTargetOrder) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch(`/admin/orders-management/${editTargetOrder.id}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({ type: "success", text: data.message || "Order updated successfully." })
        setIsEditModalOpen(false)
        fetchOrders()
        if (selectedOrder && selectedOrder.id === editTargetOrder.id) {
          openOrderDetails(editTargetOrder)
        }
      } else {
        setEditError(data.message || data.error || "Failed to update order.")
      }
    } catch (err: any) {
      setEditError(err.message || "Network error updating order.")
    } finally {
      setSavingEdit(false)
    }
  }

  // Open Single Delete Modal
  const openDeleteOrderModal = (ord: OrderManagementItem) => {
    setDeleteTargetOrder(ord)
    setIsDeleteModalOpen(true)
  }

  // Handle Single Delete Order
  const handleDeleteOrder = async () => {
    if (!deleteTargetOrder) return
    setDeletingOrder(true)
    try {
      const res = await fetch(`/admin/orders-management/${deleteTargetOrder.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({ type: "success", text: data.message || "Order deleted successfully." })
        setIsDeleteModalOpen(false)
        setSelectedOrderIds((prev) => prev.filter((id) => id !== deleteTargetOrder.id))
        if (selectedOrder && selectedOrder.id === deleteTargetOrder.id) {
          setSelectedOrder(null)
        }
        fetchOrders()
      } else {
        setActionNotice({ type: "error", text: data.message || "Failed to delete order." })
      }
    } catch (err: any) {
      setActionNotice({ type: "error", text: err.message || "Network error deleting order." })
    } finally {
      setDeletingOrder(false)
    }
  }

  // Handle Bulk Delete Orders
  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return
    setDeletingBulk(true)
    try {
      const res = await fetch("/admin/orders-management/bulk-delete", {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({ ids: selectedOrderIds }),
      })
      const data = await res.json()
      if (res.ok) {
        setActionNotice({
          type: "success",
          text: data.message || `Successfully deleted ${selectedOrderIds.length} orders.`,
        })
        const deletedIds = [...selectedOrderIds]
        setSelectedOrderIds([])
        setIsBulkDeleteModalOpen(false)
        if (selectedOrder && deletedIds.includes(selectedOrder.id)) {
          setSelectedOrder(null)
        }
        fetchOrders()
      } else {
        setActionNotice({
          type: "error",
          text: data.message || "Failed to delete selected orders.",
        })
      }
    } catch (err: any) {
      setActionNotice({
        type: "error",
        text: err.message || "Network error during bulk deletion.",
      })
    } finally {
      setDeletingBulk(false)
    }
  }

  // Robust Day-Wise and Filtered CSV Download function
  const downloadOrdersCSV = async (options: {
    specificDate?: string
    fromDate?: string
    toDate?: string
    dateRange?: string
    paymentStatus?: string
    orderStatus?: string
    search?: string
    requiringAttention?: boolean
    filenameLabel?: string
  }) => {
    setIsExporting(true)
    setExportNotice(null)
    try {
      const params = new URLSearchParams()
      if (options.specificDate) params.set("specific_date", options.specificDate)
      if (options.fromDate) params.set("from_date", options.fromDate)
      if (options.toDate) params.set("to_date", options.toDate)
      if (options.dateRange && options.dateRange !== "all") params.set("date_range", options.dateRange)
      if (options.paymentStatus && options.paymentStatus !== "all") params.set("payment_status", options.paymentStatus)
      if (options.orderStatus && options.orderStatus !== "all") params.set("order_status", options.orderStatus)
      if (options.search) params.set("q", options.search)
      if (options.requiringAttention) params.set("requiring_attention", "true")

      const res = await fetch(`/admin/orders-management/export?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      })

      if (!res.ok) {
        throw new Error(`Export request failed with status ${res.status}`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      const disposition = res.headers.get("content-disposition")
      let filename = `academyio_orders_${options.filenameLabel || "export"}.csv`
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^";]+)"?/)
        if (match?.[1]) filename = match[1]
      }
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      setExportNotice({
        type: "success",
        text: `Export successful! Downloaded file: ${filename}`,
      })
      setTimeout(() => setExportNotice(null), 6000)
    } catch (err: any) {
      console.error(err)
      setExportNotice({
        type: "error",
        text: err.message || "Failed to download orders CSV",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <Container className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ui-border-base pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <Heading level="h1" className="text-2xl font-black tracking-tight text-ui-fg-base">
              Orders Management
            </Heading>
          </div>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            Search, filter, inspect payment collections, and export day-wise order summaries for accounting & reporting.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="small"
            onClick={() => {
              setIsExportModalOpen(true)
              setExportNotice(null)
            }}
            className="cursor-pointer gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
          >
            <ArrowDownTray className="w-3.5 h-3.5" />
            Export CSV (Day-Wise)
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={fetchOrders}
            disabled={loading}
            className="cursor-pointer gap-1.5"
          >
            <ArrowPath className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AdminThemeToggle />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
            <ExclamationCircle className="w-5 h-5 flex-shrink-0" />
            <Text className="text-xs font-semibold">{error}</Text>
          </div>
          <Button size="small" variant="secondary" onClick={() => fetchOrders()} className="cursor-pointer">
            Retry
          </Button>
        </div>
      )}

      {/* Export Feedback Banner */}
      {exportNotice && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between gap-4 border text-xs font-bold transition-all ${
            exportNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {exportNotice.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <ExclamationCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{exportNotice.text}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-ui-fg-muted hover:text-ui-fg-base p-1 cursor-pointer"
          >
            <XMark className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-2xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <MagnifyingGlass className="w-4 h-4 text-ui-fg-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, customer name, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Payment Status */}
          <div className="lg:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value)
                setPage(0)
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden"
            >
              <option value="all">Payment: All</option>
              <option value="paid">Payment: Paid</option>
              <option value="pending">Payment: Pending</option>
              <option value="failed">Payment: Failed/Canceled</option>
              <option value="refunded">Payment: Refunded</option>
            </select>
          </div>

          {/* Order Status */}
          <div className="lg:col-span-2">
            <select
              value={orderStatusFilter}
              onChange={(e) => {
                setOrderStatusFilter(e.target.value)
                setPage(0)
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden"
            >
              <option value="all">Status: All</option>
              <option value="completed">Status: Completed</option>
              <option value="pending">Status: Pending</option>
              <option value="canceled">Status: Canceled</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="lg:col-span-2">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                setPage(0)
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden font-medium text-ui-fg-base"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Date: Today</option>
              <option value="yesterday">Date: Yesterday</option>
              <option value="7d">Date: Last 7 Days</option>
              <option value="30d">Date: Last 30 Days</option>
              <option value="specific_day">Date: Specific Day...</option>
              <option value="custom_range">Date: Custom Range...</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(0)
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Specific Day Picker & Quick Day Chips */}
        {dateRange === "specific_day" && (
          <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-ui-fg-base">
                <Calendar className="w-4 h-4 text-blue-600" />
                Select Specific Day:
              </span>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  setSpecificDate(e.target.value)
                  setPage(0)
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-ui-border-base bg-ui-bg-base font-semibold focus:outline-hidden focus:border-blue-500"
              />

              {daysSummary.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 ml-2">
                  <span className="text-ui-fg-muted text-[11px] font-medium">Active Days:</span>
                  {daysSummary.slice(0, 6).map((d) => (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        setSpecificDate(d.day)
                        setPage(0)
                      }}
                      className={`px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all cursor-pointer ${
                        specificDate === d.day
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-ui-bg-base text-ui-fg-subtle border-ui-border-base hover:text-ui-fg-base"
                      }`}
                    >
                      {d.day} ({d.orders_count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              size="small"
              disabled={isExporting || !specificDate}
              onClick={() => {
                downloadOrdersCSV({
                  specificDate,
                  paymentStatus: paymentFilter,
                  orderStatus: orderStatusFilter,
                  search,
                  requiringAttention: attentionOnly,
                  filenameLabel: specificDate,
                })
              }}
              className="cursor-pointer gap-1.5 text-xs font-semibold shrink-0"
            >
              <ArrowDownTray className="w-3.5 h-3.5" />
              Download CSV for {specificDate || "Selected Day"}
            </Button>
          </div>
        )}

        {/* Custom Date Range Picker */}
        {dateRange === "custom_range" && (
          <div className="p-3 bg-ui-bg-subtle rounded-xl border border-ui-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-ui-fg-base">
                <Calendar className="w-4 h-4 text-blue-600" />
                Date Range:
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(0)
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-ui-border-base bg-ui-bg-base font-semibold focus:outline-hidden focus:border-blue-500"
              />
              <span className="text-ui-fg-muted font-medium">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(0)
                }}
                className="px-2.5 py-1 text-xs rounded-lg border border-ui-border-base bg-ui-bg-base font-semibold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <Button
              variant="secondary"
              size="small"
              disabled={isExporting || (!fromDate && !toDate)}
              onClick={() => {
                downloadOrdersCSV({
                  fromDate,
                  toDate,
                  paymentStatus: paymentFilter,
                  orderStatus: orderStatusFilter,
                  search,
                  requiringAttention: attentionOnly,
                  filenameLabel: `${fromDate || "start"}_to_${toDate || "end"}`,
                })
              }}
              className="cursor-pointer gap-1.5 text-xs font-semibold shrink-0"
            >
              <ArrowDownTray className="w-3.5 h-3.5" />
              Download Range CSV
            </Button>
          </div>
        )}

        {/* Attention Filter Pill Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-ui-border-base text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(e) => {
                setAttentionOnly(e.target.checked)
                setPage(0)
              }}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <span className={attentionOnly ? "text-amber-600" : "text-ui-fg-subtle"}>
              ⚠️ Show Only Orders Requiring Attention (Missing Entitlements / Monitoring Alerts)
            </span>
          </label>

          <span className="text-ui-fg-muted font-semibold">
            Showing {orders.length} of {totalCount} orders
          </span>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`p-3.5 px-5 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            actionNotice.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          <span>{actionNotice.text}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer ml-3"
          >
            <XMark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 px-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl shadow-xs text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="font-bold text-rose-800 dark:text-rose-300">
              {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-ui-fg-muted hover:text-ui-fg-base underline font-medium cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="small"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
              Delete Selected ({selectedOrderIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Orders Data Table */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center text-ui-fg-subtle text-xs space-y-3">
            <ArrowPath className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p>Loading orders from database...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-ui-fg-subtle text-xs space-y-2">
            <p className="font-bold text-sm text-ui-fg-base">No orders matching criteria</p>
            <p>Try clearing filters or adjusting your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ui-bg-subtle/60 border-b border-ui-border-base text-ui-fg-muted font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id))}
                      onChange={handleSelectAllOrdersOnPage}
                      className="rounded border-ui-border-base text-rose-600 focus:ring-0 cursor-pointer"
                      title="Select All Orders on Page"
                    />
                  </th>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Purchased Product & Option</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4">Digital Access</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border-base font-medium">
                {orders.map((ord) => {
                  const firstItem = ord.items?.[0]
                  const hasMoreItems = (ord.items || []).length > 1
                  const isSelected = selectedOrderIds.includes(ord.id)

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-ui-bg-subtle/50 transition-colors ${
                        isSelected
                          ? "bg-rose-50/40 dark:bg-rose-950/20"
                          : ord.has_attention_flag
                          ? "bg-amber-500/5"
                          : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOrder(ord.id)}
                          className="rounded border-ui-border-base text-rose-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Order Display ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>#{ord.display_id}</span>
                          {ord.has_attention_flag && (
                            <span title="Order Requires Attention" className="text-amber-500">
                              ⚠️
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-ui-fg-muted font-normal truncate max-w-[100px]" title={ord.id}>
                          {ord.id}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-ui-fg-base">{ord.customer_name}</div>
                        <div className="text-[11px] text-ui-fg-subtle truncate max-w-[160px]" title={ord.customer_email}>
                          {ord.customer_email}
                        </div>
                      </td>

                      {/* Purchased Webinar & Option */}
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <div className="font-bold text-ui-fg-base truncate" title={firstItem?.title || "Webinar"}>
                          {firstItem?.title || "Webinar Course"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {firstItem?.variant_title || "Standard Pass"}
                          </span>
                          {hasMoreItems && (
                            <span className="text-[10px] text-ui-fg-muted font-semibold">
                              +{ord.items.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-ui-fg-subtle whitespace-nowrap">
                        <div>{new Date(ord.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-ui-fg-muted">
                          {new Date(ord.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-ui-fg-base">
                        ${ord.order_total.toFixed(2)} <span className="text-[10px] text-ui-fg-muted">{ord.currency_code}</span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          color={
                            ord.payment_status === "Paid"
                              ? "green"
                              : ord.payment_status === "Refunded"
                              ? "purple"
                              : ord.payment_status === "Canceled"
                              ? "red"
                              : "orange"
                          }
                          size="small"
                        >
                          {ord.payment_status}
                        </Badge>
                      </td>

                      {/* Order Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          color={
                            ord.order_status === "completed"
                              ? "green"
                              : ord.order_status === "canceled"
                              ? "red"
                              : "blue"
                          }
                          size="small"
                        >
                          {ord.order_status}
                        </Badge>
                      </td>

                      {/* Access Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ord.access_status === "Access Granted" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" /> Active Access
                          </span>
                        ) : ord.access_status === "Missing Entitlement ⚠️" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300">
                            Missing Access ⚠️
                          </span>
                        ) : (
                          <span className="text-[11px] text-ui-fg-muted">Pending Payment</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => openOrderDetails(ord)}
                            className="cursor-pointer text-xs"
                            title="Inspect Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline ml-1">Inspect</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => openEditOrderModal(ord)}
                            className="cursor-pointer text-xs text-blue-600 hover:text-blue-700"
                            title="Edit Order"
                          >
                            <PencilSquare className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline ml-1">Edit</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => openDeleteOrderModal(ord)}
                            className="cursor-pointer text-xs text-rose-600 hover:text-rose-700"
                            title="Delete Order"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline ml-1">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-ui-border-base flex items-center justify-between text-xs font-semibold text-ui-fg-subtle">
            <div>
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-ui-border-base pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-black text-blue-600">
                    Order #{selectedOrder.display_id}
                  </span>
                  <Badge color={selectedOrder.payment_status === "Paid" ? "green" : "orange"} size="small">
                    {selectedOrder.payment_status}
                  </Badge>
                  <Badge color={selectedOrder.order_status === "completed" ? "green" : "blue"} size="small">
                    {selectedOrder.order_status}
                  </Badge>
                </div>
                <Text className="text-[11px] text-ui-fg-muted font-mono mt-1">
                  Database ID: {selectedOrder.id} • Placed {new Date(selectedOrder.created_at).toLocaleString()}
                </Text>
              </div>

              <button onClick={() => setSelectedOrder(null)} className="cursor-pointer">
                <XMark className="w-5 h-5 text-ui-fg-subtle hover:text-ui-fg-base" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-ui-fg-subtle text-xs">
                <ArrowPath className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                Loading comprehensive order audit records...
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Attention / Incident Alerts Alert Box */}
                {selectedOrder.incidents && selectedOrder.incidents.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                      <ExclamationCircle className="w-4 h-4 text-amber-600" />
                      <span>Order Reconciliation Incident Flagged</span>
                    </div>
                    {selectedOrder.incidents.map((inc) => (
                      <p key={inc.id} className="text-amber-700 dark:text-amber-300">
                        {inc.description}
                      </p>
                    ))}
                    <div className="pt-1">
                      <a
                        href="/webapp/order-monitoring"
                        className="text-xs font-bold text-amber-700 dark:text-amber-300 underline"
                      >
                        Inspect and reconcile in Order Monitoring →
                      </a>
                    </div>
                  </div>
                )}

                {/* Customer Information Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-1">
                    <span className="text-[10px] font-bold text-ui-fg-muted uppercase tracking-wider block">Customer Contact</span>
                    <div className="font-bold text-sm text-ui-fg-base">{selectedOrder.customer_name}</div>
                    <div className="text-ui-fg-subtle">{selectedOrder.customer_email}</div>
                    {selectedOrder.customer_phone && (
                      <div className="text-ui-fg-muted text-[11px]">{selectedOrder.customer_phone}</div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-1">
                    <span className="text-[10px] font-bold text-ui-fg-muted uppercase tracking-wider block">Financial Summary</span>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-ui-fg-subtle">Total Billed:</span>
                      <span className="font-bold text-sm text-ui-fg-base">${selectedOrder.order_total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-ui-fg-subtle">Captured Paid:</span>
                      <span className="font-bold text-emerald-600">${selectedOrder.paid_total.toFixed(2)}</span>
                    </div>
                    {selectedOrder.refunded_total > 0 && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-ui-fg-subtle">Refunded:</span>
                        <span className="font-bold text-purple-600">${selectedOrder.refunded_total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-ui-fg-muted">
                    Purchased Items & Formats
                  </h4>
                  <div className="border border-ui-border-base rounded-2xl overflow-hidden divide-y divide-ui-border-base">
                    {(selectedOrder.items || []).map((it) => (
                      <div key={it.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-ui-fg-base">{it.title}</div>
                          <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                            Format Option: {it.variant_title || "Standard Live Access"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-ui-fg-base">${Number(it.unit_price).toFixed(2)}</div>
                          <div className="text-[11px] text-ui-fg-muted">Qty: {it.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webinar Digital Entitlements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-ui-fg-muted">
                      Webinar Digital Entitlements
                    </h4>
                    <span className="text-[11px] font-bold text-ui-fg-muted">
                      {(selectedOrder.entitlements || []).length} Licenses
                    </span>
                  </div>

                  {(selectedOrder.entitlements || []).length === 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center justify-between">
                      <span>No active digital entitlement attached to this order record.</span>
                      {selectedOrder.payment_status === "Paid" && (
                        <span className="text-xs font-bold underline cursor-pointer">
                          Attention Flagged
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="border border-ui-border-base rounded-2xl overflow-hidden divide-y divide-ui-border-base">
                      {selectedOrder.entitlements.map((ent) => (
                        <div key={ent.id} className="p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AcademicCap className="w-4 h-4 text-emerald-600" />
                            <div>
                              <div className="font-bold text-ui-fg-base capitalize">
                                {ent.access_type?.replace(/_/g, " ") || "Full Webinar Access"}
                              </div>
                              <div className="text-[10px] text-ui-fg-muted font-mono">{ent.id}</div>
                            </div>
                          </div>
                          <Badge color="green" size="small">Active License</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Transactions from details */}
                {detailedOrderData?.payments && detailedOrderData.payments.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-ui-fg-muted">
                      Payment Gateway Transactions
                    </h4>
                    <div className="border border-ui-border-base rounded-2xl overflow-hidden divide-y divide-ui-border-base font-mono text-[11px]">
                      {detailedOrderData.payments.map((p: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-ui-fg-base">Provider: {p.provider_id}</div>
                            <div className="text-ui-fg-muted text-[10px]">Payment ID: {p.payment_id}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-ui-fg-base">
                              ${Number(p.payment_amount).toFixed(2)} {p.payment_currency?.toUpperCase()}
                            </div>
                            <div className="text-emerald-600 text-[10px]">
                              {p.captured_at ? "Captured" : p.payment_collection_status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Order Confirmation Email */}
                <div className="space-y-3 p-4 rounded-2xl bg-ui-bg-subtle border border-ui-border-base">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-ui-fg-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-ui-fg-base">
                        Customer Confirmation Email
                      </h4>
                    </div>
                    {detailedOrderData?.email_notification ? (
                      <Badge
                        color={
                          detailedOrderData.email_notification.status === "sent"
                            ? "green"
                            : detailedOrderData.email_notification.status === "failed"
                            ? "red"
                            : "orange"
                        }
                        size="small"
                      >
                        {detailedOrderData.email_notification.status.toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge color="grey" size="small">
                        NOT DISPATCHED
                      </Badge>
                    )}
                  </div>

                  {detailedOrderData?.email_notification ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-ui-fg-subtle">
                        <span>Recipient Email:</span>
                        <span className="font-semibold text-ui-fg-base">
                          {detailedOrderData.email_notification.recipient_email}
                        </span>
                      </div>
                      <div className="flex justify-between text-ui-fg-subtle">
                        <span>Send Attempts:</span>
                        <span className="font-semibold text-ui-fg-base">
                          {detailedOrderData.email_notification.attempt_count}
                        </span>
                      </div>
                      <div className="flex justify-between text-ui-fg-subtle">
                        <span>Provider / Msg ID:</span>
                        <span className="font-mono text-[11px] text-ui-fg-base">
                          {detailedOrderData.email_notification.provider}{" "}
                          {detailedOrderData.email_notification.provider_message_id
                            ? `(${detailedOrderData.email_notification.provider_message_id})`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between text-ui-fg-subtle">
                        <span>Last Dispatched:</span>
                        <span className="font-semibold text-ui-fg-base">
                          {new Date(
                            detailedOrderData.email_notification.last_attempt_at ||
                              detailedOrderData.email_notification.created_at
                          ).toLocaleString()}
                        </span>
                      </div>
                      {detailedOrderData.email_notification.error_message && (
                        <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px]">
                          <strong>Failure Reason:</strong> {detailedOrderData.email_notification.error_message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-ui-fg-muted">
                      No confirmation email has been logged for this order yet.
                    </p>
                  )}

                  {emailFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-semibold ${
                        emailFeedback.type === "success"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      {emailFeedback.text}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between border-t border-ui-border-base">
                    <span className="text-[11px] text-ui-fg-muted">
                      Resending does not alter order, payment, or inventory status.
                    </span>
                    <Button
                      variant="secondary"
                      size="small"
                      disabled={resendingEmail}
                      onClick={() => handleResendEmail(selectedOrder.id)}
                    >
                      {resendingEmail ? "Dispatching Email..." : "Resend Confirmation Email"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-ui-border-base">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => openEditOrderModal(selectedOrder)}
                  className="cursor-pointer text-blue-600 hover:text-blue-700 gap-1.5"
                >
                  <PencilSquare className="w-3.5 h-3.5" /> Edit Order
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => openDeleteOrderModal(selectedOrder)}
                  className="cursor-pointer gap-1.5"
                >
                  <Trash className="w-3.5 h-3.5" /> Delete Order
                </Button>
              </div>
              <Button variant="secondary" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Day-Wise CSV Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-ui-border-base pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <ArrowDownTray className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-ui-fg-base">
                    Export Orders (CSV)
                  </h3>
                  <p className="text-ui-fg-muted text-xs">
                    Download complete order lists day-wise or by custom date range
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-ui-bg-subtle text-ui-fg-muted hover:text-ui-fg-base cursor-pointer"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-ui-bg-subtle border border-ui-border-base rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setExportMode("day")}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  exportMode === "day"
                    ? "bg-ui-bg-base text-blue-600 shadow-xs font-black"
                    : "text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                Specific Day
              </button>
              <button
                type="button"
                onClick={() => setExportMode("range")}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  exportMode === "range"
                    ? "bg-ui-bg-base text-blue-600 shadow-xs font-black"
                    : "text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                Date Range
              </button>
              <button
                type="button"
                onClick={() => setExportMode("current")}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  exportMode === "current"
                    ? "bg-ui-bg-base text-blue-600 shadow-xs font-black"
                    : "text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                Active Filters
              </button>
            </div>

            {/* Mode 1: Specific Day */}
            {exportMode === "day" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ui-fg-base mb-1.5">
                    Select Target Day
                  </label>
                  <input
                    type="date"
                    value={exportSpecificDay}
                    onChange={(e) => setExportSpecificDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden focus:border-blue-500 font-semibold text-ui-fg-base"
                  />
                </div>

                {/* Quick Day Shortcuts */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-ui-fg-muted">
                    <span>Quick Date Presets:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setExportSpecificDay(new Date().toISOString().split("T")[0])}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        Today
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const y = new Date()
                          y.setDate(y.getDate() - 1)
                          setExportSpecificDay(y.toISOString().split("T")[0])
                        }}
                        className="text-blue-600 hover:underline cursor-pointer"
                      >
                        Yesterday
                      </button>
                    </div>
                  </div>

                  {daysSummary.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-ui-bg-subtle border border-ui-border-base space-y-1.5">
                      <div className="text-[10px] font-bold text-ui-fg-muted uppercase tracking-wider">
                        Days With Recorded Orders
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {daysSummary.map((d) => (
                          <button
                            key={d.day}
                            type="button"
                            onClick={() => setExportSpecificDay(d.day)}
                            className={`px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                              exportSpecificDay === d.day
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-ui-bg-base text-ui-fg-base border-ui-border-base hover:border-blue-400"
                            }`}
                          >
                            {d.day} ({d.orders_count} orders)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode 2: Date Range */}
            {exportMode === "range" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ui-fg-base mb-1.5">
                      From Date (Start)
                    </label>
                    <input
                      type="date"
                      value={exportFromDay}
                      onChange={(e) => setExportFromDay(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden focus:border-blue-500 font-semibold text-ui-fg-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ui-fg-base mb-1.5">
                      To Date (End)
                    </label>
                    <input
                      type="date"
                      value={exportToDay}
                      onChange={(e) => setExportToDay(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden focus:border-blue-500 font-semibold text-ui-fg-base"
                    />
                  </div>
                </div>

                {/* Range Presets */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="text-ui-fg-muted font-medium py-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const past = new Date()
                      past.setDate(now.getDate() - 7)
                      setExportFromDay(past.toISOString().split("T")[0])
                      setExportToDay(now.toISOString().split("T")[0])
                    }}
                    className="px-2 py-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base cursor-pointer font-medium"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const past = new Date()
                      past.setDate(now.getDate() - 30)
                      setExportFromDay(past.toISOString().split("T")[0])
                      setExportToDay(now.toISOString().split("T")[0])
                    }}
                    className="px-2 py-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base cursor-pointer font-medium"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date()
                      const first = new Date(now.getFullYear(), now.getMonth(), 1)
                      setExportFromDay(first.toISOString().split("T")[0])
                      setExportToDay(now.toISOString().split("T")[0])
                    }}
                    className="px-2 py-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base cursor-pointer font-medium"
                  >
                    This Month
                  </button>
                </div>
              </div>
            )}

            {/* Mode 3: Current Active Filters */}
            {exportMode === "current" && (
              <div className="p-3.5 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-2 text-xs">
                <div className="font-bold text-ui-fg-base">Current On-Screen Filters:</div>
                <ul className="space-y-1 text-ui-fg-subtle text-[11px]">
                  <li>• Search Query: {search ? `"${search}"` : "None"}</li>
                  <li>• Payment Filter: <span className="capitalize">{paymentFilter}</span></li>
                  <li>• Order Status Filter: <span className="capitalize">{orderStatusFilter}</span></li>
                  <li>• Date Filter: <span className="capitalize">{dateRange}</span> {specificDate ? `(${specificDate})` : ""}</li>
                  <li>• Attention Only: {attentionOnly ? "Yes" : "No"}</li>
                </ul>
              </div>
            )}

            {/* Additional Filter Modifiers */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ui-border-base">
              <div>
                <label className="block text-[11px] font-bold text-ui-fg-muted mb-1">
                  Payment Status Filter
                </label>
                <select
                  value={exportPaymentStatus}
                  onChange={(e) => setExportPaymentStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid Only</option>
                  <option value="pending">Pending Only</option>
                  <option value="refunded">Refunded Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ui-fg-muted mb-1">
                  Order Status Filter
                </label>
                <select
                  value={exportOrderStatus}
                  onChange={(e) => setExportOrderStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-ui-border-base bg-ui-bg-subtle focus:outline-hidden"
                >
                  <option value="all">All Order Statuses</option>
                  <option value="completed">Completed Only</option>
                  <option value="pending">Pending Only</option>
                  <option value="canceled">Canceled Only</option>
                </select>
              </div>
            </div>

            {/* CSV Specification note */}
            <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-ui-fg-subtle space-y-1">
              <div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Accounting-Ready CSV Export (RFC-4180 + UTF-8 BOM)
              </div>
              <p>
                Exports complete unpaginated datasets with full details: Order ID, Display ID, Time (UTC), Customer Name & Email, Phone, Paid & Refunded Amounts, Line Items & Options, Digital Webinar Entitlements, and Monitoring Alerts.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-ui-border-base">
              <Button
                variant="secondary"
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExporting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (exportMode === "day") {
                    await downloadOrdersCSV({
                      specificDate: exportSpecificDay,
                      paymentStatus: exportPaymentStatus,
                      orderStatus: exportOrderStatus,
                      filenameLabel: exportSpecificDay,
                    })
                  } else if (exportMode === "range") {
                    await downloadOrdersCSV({
                      fromDate: exportFromDay,
                      toDate: exportToDay,
                      paymentStatus: exportPaymentStatus,
                      orderStatus: exportOrderStatus,
                      filenameLabel: `${exportFromDay || "start"}_to_${exportToDay || "end"}`,
                    })
                  } else {
                    await downloadOrdersCSV({
                      specificDate: dateRange === "specific_day" ? specificDate : undefined,
                      fromDate: dateRange === "custom_range" ? fromDate : undefined,
                      toDate: dateRange === "custom_range" ? toDate : undefined,
                      dateRange: dateRange !== "specific_day" && dateRange !== "custom_range" ? dateRange : undefined,
                      paymentStatus: paymentFilter,
                      orderStatus: orderStatusFilter,
                      search,
                      requiringAttention: attentionOnly,
                      filenameLabel: "filtered_orders",
                    })
                  }
                  setIsExportModalOpen(false)
                }}
                disabled={isExporting || (exportMode === "day" && !exportSpecificDay) || (exportMode === "range" && !exportFromDay && !exportToDay)}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
              >
                {isExporting ? (
                  <>
                    <ArrowPath className="w-3.5 h-3.5 animate-spin" />
                    Generating CSV...
                  </>
                ) : (
                  <>
                    <ArrowDownTray className="w-3.5 h-3.5" />
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* EDIT ORDER MODAL                                                          */}
      {/* ========================================================================= */}
      {isEditModalOpen && editTargetOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-ui-border-base pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <PencilSquare className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-ui-fg-base">
                    Edit Order #{editTargetOrder.display_id}
                  </h3>
                  <p className="text-ui-fg-muted text-xs font-mono">
                    ID: {editTargetOrder.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="cursor-pointer text-ui-fg-muted hover:text-ui-fg-base"
              >
                <XMark className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <ExclamationCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditOrder} className="space-y-4 text-xs">
              <div>
                <label className="block text-ui-fg-muted font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Order Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base font-semibold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed (Digital Access Active)</option>
                  <option value="requires_action">Requires Action</option>
                  <option value="canceled">Canceled</option>
                  <option value="archived">Archived</option>
                  <option value="draft">Draft</option>
                </select>
                <p className="text-[11px] text-ui-fg-muted mt-1">
                  Setting to 'Completed' will ensure customer webinar entitlements are activated.
                </p>
              </div>

              <div>
                <label className="block text-ui-fg-muted font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Customer Order Email
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base font-medium focus:outline-hidden focus:border-blue-500"
                />
                <p className="text-[11px] text-ui-fg-muted mt-1">
                  Updates the order recipient address for notifications and confirmations.
                </p>
              </div>

              <div>
                <label className="block text-ui-fg-muted font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Internal Admin Notes
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Add administrative notes, invoice adjustments, or verification remarks..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ui-border-base bg-ui-bg-subtle text-ui-fg-base font-medium focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-ui-border-base">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  disabled={savingEdit}
                  className="rounded-xl px-5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingEdit ? "Saving Changes..." : "Save Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE SINGLE ORDER CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && deleteTargetOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-ui-border-base text-rose-600">
              <Trash className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-ui-fg-base">
                Delete Order #{deleteTargetOrder.display_id}
              </h3>
            </div>

            <div className="space-y-3 text-xs text-ui-fg-subtle leading-relaxed">
              <p>
                Are you sure you want to permanently delete this order?
              </p>
              <div className="p-3.5 rounded-2xl bg-ui-bg-subtle border border-ui-border-base space-y-1 font-medium">
                <div className="flex justify-between text-ui-fg-base font-bold">
                  <span>Order #{deleteTargetOrder.display_id}</span>
                  <span>${deleteTargetOrder.order_total.toFixed(2)} {deleteTargetOrder.currency_code}</span>
                </div>
                <div className="text-[11px] text-ui-fg-muted">{deleteTargetOrder.customer_email}</div>
                <div className="text-[11px] text-ui-fg-muted">
                  Purchased: {deleteTargetOrder.items?.[0]?.title || "Course Item"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ExclamationCircle className="w-4 h-4 text-rose-600" />
                  Irreversible Action
                </span>
                <p className="text-[11px] leading-relaxed">
                  Deleting this order will remove line items, payment records, and any customer digital entitlements generated by this transaction.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-ui-border-base">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                disabled={deletingOrder}
                onClick={handleDeleteOrder}
                className="rounded-xl px-5 cursor-pointer"
              >
                {deletingOrder ? "Deleting..." : "Delete Order"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK DELETE ORDERS CONFIRMATION MODAL                                     */}
      {/* ========================================================================= */}
      {isBulkDeleteModalOpen && selectedOrderIds.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-3 border-b border-ui-border-base text-rose-600">
              <Trash className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-ui-fg-base">
                Confirm Bulk Order Deletion
              </h3>
            </div>

            <div className="space-y-3 text-xs text-ui-fg-subtle leading-relaxed">
              <p>
                You are about to permanently delete <strong>{selectedOrderIds.length}</strong> selected order(s).
              </p>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ExclamationCircle className="w-4 h-4 text-rose-600" />
                  Permanent Removal
                </span>
                <p className="text-[11px] leading-relaxed">
                  All associated line items, financial audit entries, and customer access entitlements for these {selectedOrderIds.length} orders will be permanently erased.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-ui-border-base">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="small"
                disabled={deletingBulk}
                onClick={handleBulkDeleteOrders}
                className="rounded-xl px-5 cursor-pointer"
              >
                {deletingBulk
                  ? `Deleting ${selectedOrderIds.length} Orders...`
                  : `Delete ${selectedOrderIds.length} Orders`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
