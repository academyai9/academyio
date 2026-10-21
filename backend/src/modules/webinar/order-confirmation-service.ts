import { Pool } from "pg"
import crypto from "crypto"
import { EmailSender } from "../../utils/email-sender"
import {
  generateOrderConfirmationEmail,
  OrderConfirmationEmailData,
  OrderEmailItem,
} from "../../utils/order-confirmation-template"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export interface OrderConfirmationResult {
  success: boolean
  duplicate?: boolean
  notificationId?: string
  recipient?: string
  provider?: string
  messageId?: string
  error?: string
  status?: "sent" | "failed" | "pending"
}

export class OrderConfirmationService {
  /**
   * Send order confirmation email for a given order
   */
  static async sendOrderConfirmation(
    orderId: string,
    options?: {
      forceResend?: boolean
      customRecipient?: string
      adminUserId?: string
      adminEmail?: string
    }
  ): Promise<OrderConfirmationResult> {
    const client = await pool.connect()

    try {
      // 1. Check idempotency (prevent duplicate confirmation emails unless forceResend is requested)
      const existingNotifRes = await client.query(
        `SELECT id, status, attempt_count, recipient_email, provider_message_id, sent_at
         FROM order_email_notification
         WHERE order_id = $1 AND notification_type = 'order_confirmation'
         LIMIT 1`,
        [orderId]
      )

      const existingNotif = existingNotifRes.rows[0]
      if (existingNotif && existingNotif.status === "sent" && !options?.forceResend) {
        console.log(`[OrderConfirmationService] Email already sent for order ${orderId} (msg: ${existingNotif.provider_message_id}). Skipping duplicate.`)
        return {
          success: true,
          duplicate: true,
          notificationId: existingNotif.id,
          recipient: existingNotif.recipient_email,
          status: "sent",
          messageId: existingNotif.provider_message_id,
        }
      }

      // 2. Query Order details from database
      const orderRes = await client.query(
        `SELECT o.*,
                c.first_name,
                c.last_name,
                c.email as customer_email,
                c.company_name
         FROM "order" o
         LEFT JOIN customer c ON c.id = o.customer_id
         WHERE o.id = $1 OR o.display_id::text = $1
         LIMIT 1`,
        [orderId]
      )

      if (orderRes.rows.length === 0) {
        throw new Error(`Order '${orderId}' not found in database.`)
      }

      const order = orderRes.rows[0]

      // 3. Query Line Items & Webinar Metadata
      const itemsRes = await client.query(
        `SELECT oi.id as order_item_id,
                oi.quantity,
                oi.unit_price,
                oli.id as item_id,
                oli.title,
                oli.variant_title,
                oli.variant_id,
                oli.metadata as item_metadata
         FROM order_item oi
         JOIN order_line_item oli ON oli.id = oi.item_id
         WHERE oi.order_id = $1`,
        [order.id]
      )

      const rawItems = itemsRes.rows || []
      const emailItems: OrderEmailItem[] = []

      for (const item of rawItems) {
        let speakerName = "AcademyIO Faculty"
        let cpeCredits = 2.0
        let eventDate: string | null = null
        let eventTime: string | null = null
        let timezone: string | null = "EST"
        let optionType = item.variant_title || "All-Access License"

        if (item.variant_id) {
          try {
            const mapRes = await client.query(
              `SELECT m.webinar_id, m.option_type, 
                      w.title as web_title, w.speaker_name, w.cpe_credits,
                      w.event_date, w.event_time, w.time_zone
               FROM webinar_variant_mapping m
               LEFT JOIN webinar w ON w.id = m.webinar_id
               WHERE m.variant_id = $1
               LIMIT 1`,
              [item.variant_id]
            )

            if (mapRes.rows.length > 0) {
              const w = mapRes.rows[0]
              if (w.speaker_name) speakerName = w.speaker_name
              if (w.cpe_credits) cpeCredits = Number(w.cpe_credits)
              if (w.option_type) optionType = w.option_type.toUpperCase()
              if (w.time_zone) timezone = w.time_zone
              if (w.event_time) eventTime = w.event_time

              if (w.event_date) {
                eventDate = new Date(w.event_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              }
            }
          } catch (_) {}
        }

        const rawUnitPrice = typeof item.unit_price === "number" ? item.unit_price : 149
        const unitPrice = rawUnitPrice > 1000 ? rawUnitPrice / 100 : rawUnitPrice
        const quantity = item.quantity || 1
        const totalPrice = unitPrice * quantity

        emailItems.push({
          title: item.title || "Continuing Education Webinar",
          variantTitle: item.variant_title || "Accredited Access",
          optionType,
          speakerName,
          cpeCredits,
          eventDate,
          eventTime,
          timezone,
          quantity,
          unitPrice,
          totalPrice,
          currency: (order.currency_code || "usd").toUpperCase(),
        })
      }

      // If no items were found, create fallback item
      if (emailItems.length === 0) {
        const rawTotal = typeof order.total === "number" ? order.total : 149
        const price = rawTotal > 1000 ? rawTotal / 100 : rawTotal
        emailItems.push({
          title: "Continuing Professional Education Webinar Package",
          variantTitle: "Full Course Access",
          optionType: "ALL-ACCESS",
          speakerName: "AcademyIO Faculty",
          cpeCredits: 2.0,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          currency: (order.currency_code || "usd").toUpperCase(),
        })
      }

      // 4. Query Payment Details and Determine Payment Status
      const paymentsRes = await client.query(
        `SELECT pc.status as pc_status,
                p.id as payment_id,
                p.captured_at,
                p.provider_id,
                p.amount as payment_amount
         FROM order_payment_collection opc
         JOIN payment_collection pc ON pc.id = opc.payment_collection_id
         LEFT JOIN payment p ON p.payment_collection_id = pc.id
         WHERE opc.order_id = $1
         LIMIT 1`,
        [order.id]
      )

      const paymentRow = paymentsRes.rows[0]
      let isPaid = false
      let paymentStatus: "PAID" | "AUTHORIZED" | "PENDING" = "AUTHORIZED"
      let paymentMethod = "Electronic Card / Verified Authorization"

      if (paymentRow) {
        if (paymentRow.provider_id) {
          if (paymentRow.provider_id.includes("stripe")) paymentMethod = "Credit / Debit Card (Stripe)"
          else if (paymentRow.provider_id.includes("electronic_card")) paymentMethod = "Electronic Card Authorization"
          else if (paymentRow.provider_id.includes("paypal")) paymentMethod = "PayPal Express"
          else paymentMethod = paymentRow.provider_id.replace(/_/g, " ").toUpperCase()
        }

        if (paymentRow.captured_at || paymentRow.pc_status === "completed" || paymentRow.pc_status === "captured") {
          isPaid = true
          paymentStatus = "PAID"
        }
      }

      // Check order summary totals if available
      const summaryRes = await client.query(
        `SELECT totals FROM order_summary WHERE order_id = $1 LIMIT 1`,
        [order.id]
      )
      const summaryTotals = summaryRes.rows[0]?.totals || {}
      const paidTotal = Number(summaryTotals.paid_total || 0)
      if (paidTotal > 0) {
        isPaid = true
        paymentStatus = "PAID"
      }

      // Customer recipient info
      const recipientEmail =
        options?.customRecipient ||
        order.email ||
        order.customer_email ||
        "customer@academyio.com"

      const customerName =
        [order.first_name, order.last_name].filter(Boolean).join(" ") ||
        "Valued Professional"

      const displayId = order.display_id ? String(order.display_id) : order.id.slice(-8).toUpperCase()

      const orderDateFormatted = new Date(order.created_at || Date.now()).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })

      const rawOrderTotal = typeof order.total === "number" ? order.total : 149
      const totalAmount = rawOrderTotal > 1000 ? rawOrderTotal / 100 : rawOrderTotal
      const currency = (order.currency_code || "usd").toUpperCase()
      const frontendUrl = process.env.STORE_FRONTEND_URL || "http://localhost:8000"
      const supportEmail = process.env.SUPPORT_EMAIL || "support@academyio.com"

      // 5. Build Email Content
      const emailPayload: OrderConfirmationEmailData = {
        orderId: order.id,
        displayId,
        orderDateFormatted,
        customerName,
        customerEmail: recipientEmail,
        items: emailItems,
        subtotal: totalAmount,
        discountTotal: 0,
        taxTotal: 0,
        total: totalAmount,
        currency,
        paymentMethod,
        paymentStatus,
        isPaid,
        frontendUrl,
        supportEmail,
      }

      const { subject, html, text } = generateOrderConfirmationEmail(emailPayload)

      // 6. Send the Email
      const sendResult = await EmailSender.send({
        to: recipientEmail,
        toName: customerName,
        subject,
        html,
        text,
      })

      const notifId = existingNotif?.id || `oen_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
      const status = sendResult.success ? "sent" : "failed"
      const provider = sendResult.provider || "console"
      const providerMessageId = sendResult.messageId || null
      const errorMessage = sendResult.error || null

      // 7. Save / Update in order_email_notification table
      if (existingNotif) {
        await client.query(
          `UPDATE order_email_notification
           SET status = $1,
               attempt_count = attempt_count + 1,
               provider = $2,
               provider_message_id = $3,
               error_message = $4,
               sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
               last_attempt_at = NOW(),
               subject = $5,
               body_html = $6,
               body_text = $7,
               updated_at = NOW()
           WHERE id = $8`,
          [status, provider, providerMessageId, errorMessage, subject, html, text, existingNotif.id]
        )
      } else {
        await client.query(
          `INSERT INTO order_email_notification
            (id, order_id, notification_type, recipient_email, recipient_name, subject, body_html, body_text, status, attempt_count, provider, provider_message_id, error_message, sent_at, last_attempt_at, created_at, updated_at)
           VALUES
            ($1, $2, 'order_confirmation', $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, CASE WHEN $8 = 'sent' THEN NOW() ELSE NULL END, NOW(), NOW(), NOW())`,
          [
            notifId,
            order.id,
            recipientEmail,
            customerName,
            subject,
            html,
            text,
            status,
            provider,
            providerMessageId,
            errorMessage,
          ]
        )
      }

      console.log(`[OrderConfirmationService] Order confirmation ${status} for ${order.id} -> ${recipientEmail} via ${provider}`)

      return {
        success: sendResult.success,
        notificationId: notifId,
        recipient: recipientEmail,
        provider,
        messageId: providerMessageId || undefined,
        error: errorMessage || undefined,
        status,
      }
    } catch (error: any) {
      console.error(`[OrderConfirmationService] Failed to send order confirmation for order ${orderId}:`, error)

      // Try to log failed record in DB
      try {
        const notifId = `oen_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
        await client.query(
          `INSERT INTO order_email_notification
            (id, order_id, notification_type, recipient_email, subject, status, attempt_count, provider, error_message, last_attempt_at, created_at, updated_at)
           VALUES
            ($1, $2, 'order_confirmation', 'unknown@academyio.com', 'Order Confirmation', 'failed', 1, 'system', $3, NOW(), NOW(), NOW())
           ON CONFLICT ("order_id", "notification_type")
           DO UPDATE SET status = 'failed', attempt_count = order_email_notification.attempt_count + 1, error_message = $3, last_attempt_at = NOW(), updated_at = NOW()`,
          [notifId, orderId, error.message]
        )
      } catch (_) {}

      return {
        success: false,
        status: "failed",
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Get notification record for an order
   */
  static async getNotificationForOrder(orderId: string) {
    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT * FROM order_email_notification
         WHERE order_id = $1 AND notification_type = 'order_confirmation'
         LIMIT 1`,
        [orderId]
      )
      return res.rows[0] || null
    } finally {
      client.release()
    }
  }
}
