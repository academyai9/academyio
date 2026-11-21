import crypto from "crypto"

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  contentType?: string
}

export interface SendEmailOptions {
  to: string
  toName?: string | null
  subject: string
  html: string
  text: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

export class EmailSender {
  /**
   * Determine the configured email provider
   */
  static getProvider(): "resend" | "sendgrid" | "smtp" | "console" {
    const explicitProvider = process.env.EMAIL_PROVIDER?.toLowerCase()
    if (explicitProvider === "resend" || explicitProvider === "sendgrid" || explicitProvider === "smtp" || explicitProvider === "console") {
      return explicitProvider
    }

    if (process.env.RESEND_API_KEY) {
      return "resend"
    }

    if (process.env.SENDGRID_API_KEY) {
      return "sendgrid"
    }

    if (process.env.SMTP_HOST) {
      return "smtp"
    }

    return "console"
  }

  /**
   * Send transactional email using configured provider
   */
  static async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const provider = this.getProvider()
    const fromName = process.env.EMAIL_FROM_NAME || "AcademyIO"
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || "orders@academyio.com"
    const fromFormatted = `"${fromName}" <${fromAddress}>`
    const replyTo = options.replyTo || process.env.EMAIL_REPLY_TO || "support@academyio.com"

    try {
      if (provider === "resend") {
        return await this.sendWithResend(options, fromFormatted, replyTo)
      } else if (provider === "sendgrid") {
        return await this.sendWithSendgrid(options, fromName, fromAddress, replyTo)
      } else if (provider === "smtp") {
        return await this.sendWithSmtp(options, fromFormatted, replyTo)
      } else {
        return await this.sendWithConsole(options, fromFormatted)
      }
    } catch (err: any) {
      console.error(`[EmailSender] Error sending email via ${provider}:`, err)
      return {
        success: false,
        provider,
        error: err.message || "Failed to dispatch email",
      }
    }
  }

  /**
   * Resend HTTP API integration
   */
  private static async sendWithResend(
    options: SendEmailOptions,
    from: string,
    replyTo: string
  ): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not defined.")
    }

    const resendBody: Record<string, any> = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: replyTo,
    }

    if (options.attachments && options.attachments.length > 0) {
      resendBody.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content)
          ? att.content.toString("base64")
          : Buffer.from(att.content).toString("base64"),
      }))
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data.message || data.error?.message || `Resend API returned HTTP ${res.status}`)
    }

    return {
      success: true,
      messageId: data.id || `resend_${crypto.randomBytes(8).toString("hex")}`,
      provider: "resend",
    }
  }

  /**
   * SendGrid HTTP API integration
   */
  private static async sendWithSendgrid(
    options: SendEmailOptions,
    fromName: string,
    fromAddress: string,
    replyTo: string
  ): Promise<SendEmailResult> {
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      throw new Error("SENDGRID_API_KEY environment variable is not defined.")
    }

    const payload: Record<string, any> = {
      personalizations: [
        {
          to: [{ email: options.to, name: options.toName || undefined }],
          subject: options.subject,
        },
      ],
      from: { email: fromAddress, name: fromName },
      reply_to: { email: replyTo, name: fromName },
      content: [
        { type: "text/plain", value: options.text },
        { type: "text/html", value: options.html },
      ],
    }

    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        type: att.contentType || "application/pdf",
        disposition: "attachment",
        content: Buffer.isBuffer(att.content)
          ? att.content.toString("base64")
          : Buffer.from(att.content).toString("base64"),
      }))
    }

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const msg = errData?.errors?.[0]?.message || `SendGrid API returned HTTP ${res.status}`
      throw new Error(msg)
    }

    const sgMessageId = res.headers.get("x-message-id") || `sg_${crypto.randomBytes(8).toString("hex")}`

    return {
      success: true,
      messageId: sgMessageId,
      provider: "sendgrid",
    }
  }

  /**
   * SMTP integration via nodemailer
   */
  private static async sendWithSmtp(
    options: SendEmailOptions,
    from: string,
    replyTo: string
  ): Promise<SendEmailResult> {
    const nodemailer = require("nodemailer")

    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT) || 587
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const secure = process.env.SMTP_SECURE === "true" || port === 465

    if (!host) {
      throw new Error("SMTP_HOST environment variable is not defined.")
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    })

    const info = await transporter.sendMail({
      from,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments:
        options.attachments && options.attachments.length > 0
          ? options.attachments.map((att) => ({
              filename: att.filename,
              content: att.content,
              contentType: att.contentType || "application/pdf",
            }))
          : undefined,
    })

    return {
      success: true,
      messageId: info.messageId || `smtp_${crypto.randomBytes(8).toString("hex")}`,
      provider: "smtp",
    }
  }

  /**
   * Console / Local Dev Provider (Reliable fallback and test execution)
   */
  private static async sendWithConsole(
    options: SendEmailOptions,
    from: string
  ): Promise<SendEmailResult> {
    const messageId = `msg_console_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    console.log("--------------------------------------------------------------------------------")
    console.log(`[EmailSender: CONSOLE] Dispatched Email`)
    console.log(`Message-ID : ${messageId}`)
    console.log(`From       : ${from}`)
    console.log(`To         : ${options.toName ? `${options.toName} <${options.to}>` : options.to}`)
    console.log(`Subject    : ${options.subject}`)
    console.log(`Preview    : ${options.text.slice(0, 150).replace(/\n/g, " ")}...`)
    console.log("--------------------------------------------------------------------------------")

    return {
      success: true,
      messageId,
      provider: "console",
    }
  }
}
