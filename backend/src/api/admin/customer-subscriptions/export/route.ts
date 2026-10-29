import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const { status, search } = req.query as Record<string, string>

    const filters: Record<string, any> = {}
    if (status && status !== "all") filters.status = status

    let subscriptions = await webinarService.listCustomerSubscriptions(filters)

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      subscriptions = subscriptions.filter(
        (s: any) =>
          s.customer_email?.toLowerCase().includes(q) ||
          s.customer_id?.toLowerCase().includes(q) ||
          s.plan_name?.toLowerCase().includes(q)
      )
    }

    const headers = [
      "Subscription ID",
      "Customer Email",
      "Customer ID",
      "Plan Name",
      "Plan ID",
      "Status",
      "Current Period Start",
      "Current Period End",
      "Cancel at Period End",
      "Monthly Access Used",
      "Payment Provider",
      "Payment Summary",
      "Created At",
    ]

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = subscriptions.map((s: any) => [
      escapeCsv(s.id),
      escapeCsv(s.customer_email),
      escapeCsv(s.customer_id),
      escapeCsv(s.plan_name),
      escapeCsv(s.plan_id),
      escapeCsv(s.status),
      escapeCsv(s.current_period_start ? new Date(s.current_period_start).toISOString() : ""),
      escapeCsv(s.current_period_end ? new Date(s.current_period_end).toISOString() : ""),
      escapeCsv(s.cancel_at_period_end ? "Yes" : "No"),
      escapeCsv(s.monthly_access_used || 0),
      escapeCsv(s.payment_provider_id || ""),
      escapeCsv(s.payment_method_summary || ""),
      escapeCsv(s.created_at ? new Date(s.created_at).toISOString() : ""),
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")

    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="customer-subscriptions-${status || "all"}-${new Date().toISOString().slice(0, 10)}.csv"`
    )
    res.status(200).send(csvContent)
  } catch (error: any) {
    res.status(500).json({ message: "Failed to export subscriptions", error: error.message })
  }
}
