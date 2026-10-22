import { EmailSender, SendEmailResult } from "./email-sender"
import { NewsletterSubscriber, NewsletterCampaign } from "./newsletter-db"

function getStorefrontUrl(): string {
  const custom = process.env.STOREFRONT_URL || process.env.NEXT_PUBLIC_BASE_URL
  if (custom && !custom.includes("localhost")) {
    return custom.replace(/\/$/, "")
  }
  if (process.env.NODE_ENV === "production") {
    return "https://www.academyio.com"
  }
  return custom ? custom.replace(/\/$/, "") : "http://localhost:8000"
}

/**
 * 1. Send Double Opt-in Verification Email
 */
export async function sendNewsletterVerificationEmail(params: {
  to: string
  toName?: string | null
  verificationToken: string
}): Promise<SendEmailResult> {
  const storefrontUrl = getStorefrontUrl()
  const verifyUrl = `${storefrontUrl}/us/newsletter/verify?token=${encodeURIComponent(
    params.verificationToken
  )}`

  const subject = "Please Confirm Your AcademyIO Newsletter Subscription"
  const displayName = params.toName ? params.toName.trim() : "Valued Professional"

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px 10px; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .header { background: #0b132b; padding: 32px 24px; text-align: center; }
        .logo { max-height: 38px; width: auto; }
        .body { padding: 36px 30px; line-height: 1.6; }
        .badge { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #1d4ed8; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
        h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
        p { font-size: 14px; color: #475569; margin: 0 0 16px 0; }
        .btn-wrapper { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
        .link-alt { word-break: break-all; font-size: 12px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .notice { font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 28px; }
        .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://www.academyio.com/logos/academyio-logo-white.png" alt="AcademyIO" class="logo">
        </div>
        <div class="body">
          <div class="badge">Double Opt-in Verification</div>
          <h1>Confirm Your Newsletter Subscription</h1>
          <p>Hello ${displayName},</p>
          <p>Thank you for your interest in AcademyIO. We received a request to subscribe your email address (<strong>${params.to}</strong>) to our educational briefings, upcoming accredited webinars, and CPE course announcements.</p>
          <p>To ensure this request was made by you, please confirm your subscription by clicking the button below:</p>
          
          <div class="btn-wrapper">
            <a href="${verifyUrl}" class="btn" target="_blank" rel="noopener noreferrer">Confirm My Subscription</a>
          </div>

          <p>This verification link will remain active for <strong>48 hours</strong>.</p>
          
          <p>If the button above does not work, copy and paste this link into your browser:</p>
          <div class="link-alt">${verifyUrl}</div>

          <div class="notice">
            <strong>Didn't request this?</strong> If you did not sign up for AcademyIO newsletters, you can safely ignore this email. Your email will not be subscribed without clicking this confirmation link.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} AcademyIO LLC. All rights reserved.<br>Premier Continuing Professional Education & Accredited Webinars.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Confirm Your AcademyIO Newsletter Subscription

Hello ${displayName},

We received a request to subscribe ${params.to} to AcademyIO continuing education updates and webinar announcements.

Please confirm your subscription by clicking or visiting this link within 48 hours:
${verifyUrl}

If you did not request this subscription, please ignore this email. You will not be subscribed.

© ${new Date().getFullYear()} AcademyIO LLC.
  `.trim()

  return await EmailSender.send({
    to: params.to,
    toName: params.toName,
    subject,
    html,
    text,
  })
}

/**
 * 2. Send Welcome Email upon confirmation
 */
export async function sendNewsletterWelcomeEmail(params: {
  to: string
  toName?: string | null
  unsubscribeToken: string
}): Promise<SendEmailResult> {
  const storefrontUrl = getStorefrontUrl()
  const unsubUrl = `${storefrontUrl}/us/newsletter/unsubscribe?token=${encodeURIComponent(
    params.unsubscribeToken
  )}`
  const webinarsUrl = `${storefrontUrl}/us/webinars`

  const subject = "Welcome to AcademyIO Newsletter!"
  const displayName = params.toName ? params.toName.trim() : "Valued Professional"

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; margin: 0; padding: 20px 10px; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .header { background: #0b132b; padding: 32px 24px; text-align: center; }
        .logo { max-height: 38px; width: auto; }
        .body { padding: 36px 30px; line-height: 1.6; }
        h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; }
        p { font-size: 14px; color: #475569; margin: 0 0 16px 0; }
        .btn-wrapper { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; }
        .footer { background: #f8fafc; padding: 24px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .unsub-link { color: #64748b; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://www.academyio.com/logos/academyio-logo-white.png" alt="AcademyIO" class="logo">
        </div>
        <div class="body">
          <h1>Welcome to AcademyIO!</h1>
          <p>Hello ${displayName},</p>
          <p>Your subscription has been verified successfully. You will now receive regular notifications about upcoming accredited live webinars, self-study training, regulatory changes, and exclusive discount codes.</p>
          
          <div class="btn-wrapper">
            <a href="${webinarsUrl}" class="btn" target="_blank" rel="noopener noreferrer">Explore Upcoming Webinars</a>
          </div>

          <p>If you ever wish to stop receiving these updates, you can unsubscribe at any time using the link in the footer of every email we send.</p>
        </div>
        <div class="footer">
          <p>You received this email because you confirmed your subscription to AcademyIO Educational Updates.</p>
          <p><a href="${unsubUrl}" class="unsub-link">Unsubscribe from this list</a> | <a href="${storefrontUrl}/us/privacy" class="unsub-link">Privacy Policy</a></p>
          <p>© ${new Date().getFullYear()} AcademyIO LLC. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Welcome to AcademyIO!

Hello ${displayName},

Your subscription has been verified successfully. You are now set to receive regular updates on accredited webinars and CPE courses.

Browse courses: ${webinarsUrl}

Unsubscribe at any time: ${unsubUrl}

© ${new Date().getFullYear()} AcademyIO LLC.
  `.trim()

  return await EmailSender.send({
    to: params.to,
    toName: params.toName,
    subject,
    html,
    text,
  })
}

/**
 * 3. Send Campaign to Subscribers (or Test Email)
 */
export async function dispatchNewsletterCampaign(
  pgConnection: any,
  params: {
    campaignId: string
    isTest?: boolean
    testRecipient?: string
  }
): Promise<{
  success: boolean
  totalTargeted: number
  sentCount: number
  failedCount: number
  error?: string
}> {
  const storefrontUrl = getStorefrontUrl()

  // 1. Fetch Campaign
  const cmpRes = await pgConnection.raw(
    `SELECT * FROM newsletter_campaigns WHERE id = ? LIMIT 1`,
    [params.campaignId]
  )
  const campaign: NewsletterCampaign | undefined = cmpRes.rows?.[0]
  if (!campaign) {
    return { success: false, totalTargeted: 0, sentCount: 0, failedCount: 0, error: "Campaign not found" }
  }

  // 2. Handle TEST send
  if (params.isTest && params.testRecipient) {
    const dummyUnsubUrl = `${storefrontUrl}/us/newsletter/unsubscribe?token=sample_test_token`
    const testSubject = `[TEST] ${campaign.subject}`
    const fullHtml = `
      ${campaign.content_html}
      <hr style="margin-top: 40px; border: 0; border-top: 1px solid #e2e8f0;" />
      <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 16px; font-family: sans-serif;">
        <p>This is a test preview sent to ${params.testRecipient}.</p>
        <p><a href="${dummyUnsubUrl}" style="color: #64748b; text-decoration: underline;">Unsubscribe link sample</a></p>
        <p>© ${new Date().getFullYear()} AcademyIO LLC.</p>
      </div>
    `
    const fullText = `
[TEST EMAIL]
${campaign.content_text}

---
Unsubscribe: ${dummyUnsubUrl}
© ${new Date().getFullYear()} AcademyIO LLC.
    `.trim()

    const res = await EmailSender.send({
      to: params.testRecipient,
      subject: testSubject,
      html: fullHtml,
      text: fullText,
      replyTo: campaign.reply_to || undefined,
    })

    return {
      success: res.success,
      totalTargeted: 1,
      sentCount: res.success ? 1 : 0,
      failedCount: res.success ? 0 : 1,
      error: res.error,
    }
  }

  // 3. Live Broadcast: Select only ACTIVE confirmed subscribers (strictly exclude pending, unsubscribed, bounced, suppressed)
  const subRes = await pgConnection.raw(
    `SELECT id, email, first_name, unsubscribe_token FROM newsletter_subscribers WHERE status = 'active'`
  )
  const recipients: { id: string; email: string; first_name: string | null; unsubscribe_token: string }[] =
    subRes.rows || []

  if (recipients.length === 0) {
    return {
      success: false,
      totalTargeted: 0,
      sentCount: 0,
      failedCount: 0,
      error: "No active, confirmed subscribers found to receive this campaign.",
    }
  }

  // Update campaign status to 'sending'
  await pgConnection.raw(
    `UPDATE newsletter_campaigns SET status = 'sending', total_recipients = ? WHERE id = ?`,
    [recipients.length, campaign.id]
  )

  let sentCount = 0
  let failedCount = 0

  for (const recipient of recipients) {
    const unsubUrl = `${storefrontUrl}/us/newsletter/unsubscribe?token=${encodeURIComponent(
      recipient.unsubscribe_token
    )}`

    const recipientHtml = `
      ${campaign.content_html}
      <hr style="margin-top: 40px; border: 0; border-top: 1px solid #e2e8f0;" />
      <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
        <p>You received this email because you are a confirmed subscriber to AcademyIO Continuing Professional Education updates.</p>
        <p>
          <a href="${unsubUrl}" style="color: #64748b; text-decoration: underline; font-weight: 600;">Unsubscribe from AcademyIO Newsletters</a>
          &nbsp;|&nbsp;
          <a href="${storefrontUrl}/us/privacy" style="color: #64748b; text-decoration: underline;">Privacy Policy</a>
        </p>
        <p>© ${new Date().getFullYear()} AcademyIO LLC. All rights reserved.</p>
      </div>
    `

    const recipientText = `
${campaign.content_text}

---
You are receiving this email because you subscribed to AcademyIO updates.
Unsubscribe securely: ${unsubUrl}
© ${new Date().getFullYear()} AcademyIO LLC.
    `.trim()

    try {
      const sendRes = await EmailSender.send({
        to: recipient.email,
        toName: recipient.first_name,
        subject: campaign.subject,
        html: recipientHtml,
        text: recipientText,
        replyTo: campaign.reply_to || undefined,
      })

      if (sendRes.success) {
        sentCount++
        // Log send
        await pgConnection.raw(
          `
          INSERT INTO newsletter_campaign_logs (id, campaign_id, subscriber_id, recipient_email, status, message_id, sent_at)
          VALUES (?, ?, ?, ?, 'sent', ?, NOW())
          `,
          [
            `clog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            campaign.id,
            recipient.id,
            recipient.email,
            sendRes.messageId || null,
          ]
        )

        // Update subscriber last email timestamp
        await pgConnection.raw(
          `UPDATE newsletter_subscribers SET last_email_sent_at = NOW(), emails_sent_count = emails_sent_count + 1 WHERE id = ?`,
          [recipient.id]
        )
      } else {
        failedCount++
        await pgConnection.raw(
          `
          INSERT INTO newsletter_campaign_logs (id, campaign_id, subscriber_id, recipient_email, status, error_message, sent_at)
          VALUES (?, ?, ?, ?, 'failed', ?, NOW())
          `,
          [
            `clog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            campaign.id,
            recipient.id,
            recipient.email,
            sendRes.error || "Unknown dispatch failure",
          ]
        )
      }
    } catch (err: any) {
      failedCount++
      console.error(`[Newsletter Campaign] Failed to send to ${recipient.email}:`, err)
    }
  }

  // Finalize campaign status
  await pgConnection.raw(
    `
    UPDATE newsletter_campaigns
    SET 
      status = 'sent',
      successful_sends = ?,
      failed_sends = ?,
      sent_at = NOW(),
      updated_at = NOW()
    WHERE id = ?
    `,
    [sentCount, failedCount, campaign.id]
  )

  return {
    success: true,
    totalTargeted: recipients.length,
    sentCount,
    failedCount,
  }
}
