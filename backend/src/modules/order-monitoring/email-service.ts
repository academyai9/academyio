import crypto from "crypto"

export interface OrderMonitoringIncidentData {
  id: string
  incident_type: string
  customer_name?: string | null
  customer_email?: string | null
  payment_reference?: string | null
  payment_status?: string | null
  amount?: number | string | null
  currency_code?: string | null
  webinar_title?: string | null
  created_at: string | Date
  description: string
  recommended_action?: string | null
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  recipient: string
  error?: string
}

export class OrderMonitoringEmailService {
  /**
   * Format human readable issue type
   */
  static formatIssueType(type: string): string {
    switch (type) {
      case "missing_order":
        return "Missing Order (Payment Succeeded Without Order)"
      case "checkout_failed":
        return "Checkout Failed (Grace Period Expired Without Order)"
      case "payment_mismatch":
        return "Payment Status Mismatch"
      case "missing_webinar_access":
        return "Missing Webinar Access (Paid Order Without Digital Entitlement)"
      case "duplicate_payment_order":
        return "Potential Duplicate Payment or Order"
      default:
        return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  /**
   * Build text and html email content matching required specifications
   */
  static buildEmailContent(incident: OrderMonitoringIncidentData) {
    const formattedType = this.formatIssueType(incident.incident_type)
    const customer = incident.customer_name || "Unregistered Guest"
    const email = incident.customer_email || "N/A"
    const paymentRef = incident.payment_reference || "N/A"
    const paymentStatus = incident.payment_status || "Captured / Succeeded"
    const amountStr = incident.amount
      ? `${Number(incident.amount).toFixed(2)} ${(incident.currency_code || "USD").toUpperCase()}`
      : "N/A"
    const product = incident.webinar_title || "General Webinar Order"
    const detectionTime = new Date(incident.created_at).toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "full",
      timeStyle: "medium",
    }) + " (EST / UTC-5)"

    const textBody = `Subject: [AcademyIO Order Alert] Missing or Incomplete Order Detected

Hello AcademyIO Support Team,

The order monitoring system has detected a potential order-processing issue that requires investigation.

Incident Details:
Incident ID: ${incident.id}
Issue Type: ${formattedType}
Customer: ${customer}
Customer Email: ${email}
Payment Reference: ${paymentRef}
Payment Status: ${paymentStatus}
Amount: ${amountStr}
Webinar/Product: ${product}
Detection Time: ${detectionTime}

Issue Description:
${incident.description}

Recommended Action:
${incident.recommended_action || "Please review the incident in the admin dashboard and reconcile the order or payment as appropriate."}

Please review the incident in the admin dashboard:
http://localhost:9000/app/order-monitoring

This is an automated notification. Please verify the payment and order records before taking corrective action.

AcademyIO Order Monitoring System`

    return {
      subject: `[AcademyIO Order Alert] Missing or Incomplete Order Detected - ${incident.id}`,
      text: textBody,
    }
  }

  /**
   * Send the email alert to support@academyio.com and record in database
   */
  static async sendAlert(
    pgConnection: any,
    incident: OrderMonitoringIncidentData,
    customRecipient?: string
  ): Promise<EmailSendResult> {
    const recipient =
      customRecipient ||
      process.env.ORDER_ALERT_EMAIL_RECIPIENT ||
      "support@academyio.com"

    const { subject, text } = this.buildEmailContent(incident)
    const providerMessageId = `msg_alert_${incident.id}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`

    try {
      // Record email in order_monitoring_email_log table
      const logId = `omel_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
      await pgConnection.raw(
        `INSERT INTO order_monitoring_email_log (id, incident_id, recipient, subject, body, status, provider, provider_message_id, created_at)
         VALUES (?, ?, ?, ?, ?, 'sent', 'academyio_transactional_mailer', ?, now());`,
        [logId, incident.id, recipient, subject, text, providerMessageId]
      )

      // Update incident with alert status
      await pgConnection.raw(
        `UPDATE order_monitoring_incident
         SET email_alert_sent = true,
             email_alert_sent_at = now(),
             email_provider_message_id = ?,
             email_error = NULL,
             updated_at = now()
         WHERE id = ?;`,
        [providerMessageId, incident.id]
      )

      // Also record audit log
      const auditId = `omal_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
      await pgConnection.raw(
        `INSERT INTO order_monitoring_audit_log (id, incident_id, admin_user_id, admin_email, action, notes, created_at)
         VALUES (?, ?, 'SYSTEM', 'monitoring-agent@academyio.com', 'email_alert_sent', ?, now());`,
        [auditId, incident.id, `Alert dispatched to ${recipient} (Message ID: ${providerMessageId})`]
      )

      console.log(`[Order Monitoring Alert] Email successfully dispatched to ${recipient} for incident ${incident.id}`)

      return {
        success: true,
        messageId: providerMessageId,
        recipient,
      }
    } catch (err: any) {
      console.error(`[Order Monitoring Alert] Failed to dispatch email for ${incident.id}:`, err)

      // Record failed status
      try {
        await pgConnection.raw(
          `UPDATE order_monitoring_incident
           SET email_error = ?,
               updated_at = now()
           WHERE id = ?;`,
          [err.message, incident.id]
        )
      } catch (_) {}

      return {
        success: false,
        recipient,
        error: err.message,
      }
    }
  }
}
