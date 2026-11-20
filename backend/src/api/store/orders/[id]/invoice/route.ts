import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { generateInvoicePdf, InvoicePdfData } from "../../../../../utils/generate-invoice-pdf"
import { getSharedPool } from "../../../../../utils/db-pool"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const actorId = (req as any).auth_context?.actor_id

  if (!id) {
    return res.status(400).json({ message: "Order ID is required." })
  }

  if (!actorId) {
    return res.status(401).json({ message: "Authentication required to access order invoices." })
  }

  const pool = getSharedPool()
  const client = await pool.connect()
  try {
    // 1. Load verified authenticated customer
    const custRes = await client.query(
      "SELECT id, email, first_name, last_name, metadata, company_name, phone FROM customer WHERE id = $1 AND deleted_at IS NULL",
      [actorId]
    )

    if (custRes.rows.length === 0) {
      return res.status(401).json({ message: "Authenticated customer account not found." })
    }
    const customer = custRes.rows[0]

    // 2. Query order from Database
    const orderRes = await client.query(
      `SELECT o.*, 
              (SELECT json_agg(i.*) FROM order_item i WHERE i.order_id = o.id) as items
       FROM "order" o
       WHERE o.id = $1 OR o.display_id::text = $1
       LIMIT 1`,
      [id]
    )

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: "Order not found." })
    }

    const order = orderRes.rows[0]

    // 3. Strict ownership check (never bypass)
    const ownsById = Boolean(order.customer_id && customer.id === order.customer_id)
    const ownsByEmail = Boolean(
      customer.email && order.email && customer.email.toLowerCase() === order.email.toLowerCase()
    )
    if (!ownsById && !ownsByEmail) {
      return res.status(403).json({ message: "Unauthorized to access this invoice." })
    }

    const displayId = order.display_id ? String(order.display_id) : order.id.slice(-8).toUpperCase()
    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "October 14, 2026"

    const rawTotal = typeof order.total === "number" ? order.total : 149
    const totalAmount = rawTotal > 1000 ? rawTotal / 100 : rawTotal
    const currency = (order.currency_code || "usd").toUpperCase()

    // 3. Map line items and enrich with webinar details
    const rawItems = Array.isArray(order.items) ? order.items : []
    const mappedItems: any[] = []

    for (const item of rawItems) {
      const itemTotal = typeof item.total === "number" ? item.total : (item.unit_price || totalAmount)
      const itemPrice = itemTotal > 1000 ? itemTotal / 100 : itemTotal

      let speaker = "AcademyIO Faculty"
      let cpeCredits = 2.0
      let variantTitle = item.variant_title || item.title || "Accredited Access"

      if (item.variant_id) {
        try {
          const mapRes = await client.query(
            `SELECT m.webinar_id, m.option_type, w.title as web_title, w.speaker_name, w.cpe_credits
             FROM webinar_variant_mapping m
             LEFT JOIN webinar w ON w.id = m.webinar_id
             WHERE m.variant_id = $1 LIMIT 1`,
            [item.variant_id]
          )
          if (mapRes.rows.length > 0) {
            const w = mapRes.rows[0]
            if (w.speaker_name) speaker = w.speaker_name
            if (w.cpe_credits) cpeCredits = Number(w.cpe_credits)
            if (w.option_type) variantTitle = `${w.option_type.toUpperCase()} Package`
          }
        } catch (_) {}
      }

      mappedItems.push({
        title: item.title || "Continuing Professional Education Webinar",
        variantTitle,
        speaker,
        cpeCredits,
        quantity: item.quantity || 1,
        unitPrice: itemPrice,
        totalPrice: itemPrice,
        currency,
      })
    }

    // Customer profile info
    const custName =
      [
        customer?.first_name || (order as any).billing_address?.first_name,
        customer?.last_name || (order as any).billing_address?.last_name,
      ]
        .filter(Boolean)
        .join(" ") || "Valued Registrant"

    const invoiceData: InvoicePdfData = {
      orderId: order.id,
      displayId,
      orderDate,
      customerName: custName,
      customerEmail: order.email || customer?.email || "customer@academyio.com",
      companyName: ((customer?.company_name as string) || (customer?.metadata?.company_name as string) || null),
      ptin: ((customer?.metadata?.ptin as string) || null),
      licenseType: ((customer?.metadata?.license_type as string) || "CPA"),
      items: mappedItems,
      subtotal: totalAmount,
      taxTotal: 0,
      discountTotal: 0,
      total: totalAmount,
      currency,
      paymentStatus: "PAID & AUTHORIZED",
      paymentMethod: "Electronic Card / Verified Authorization",
    }

    const pdfBytes = await generateInvoicePdf(invoiceData)

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename="AcademyIO-Invoice-${displayId}.pdf"`)
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate")
    return res.status(200).send(Buffer.from(pdfBytes))
  } catch (error: any) {
    console.error("Error generating invoice PDF in backend:", error)
    return res.status(500).json({
      message: "Failed to generate invoice PDF.",
      error: error?.message,
    })
  } finally {
    client.release()
  }
}
