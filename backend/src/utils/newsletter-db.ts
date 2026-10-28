import crypto from "crypto"

export interface NewsletterSubscriber {
  id: string
  email: string
  first_name: string | null
  status: "pending" | "active" | "unsubscribed" | "bounced" | "suppressed"
  verification_token: string | null
  verification_token_expires_at: string | null
  verified_at: string | null
  unsubscribe_token: string
  unsubscribed_at: string | null
  unsubscribe_reason: string | null
  consent_source: string
  consent_timestamp: string
  consent_ip: string | null
  consent_user_agent: string | null
  last_email_sent_at: string | null
  emails_sent_count: number
  created_at: string
  updated_at: string
}

export interface NewsletterCampaign {
  id: string
  title: string
  subject: string
  preview_text: string | null
  content_html: string
  content_text: string
  sender_name: string | null
  sender_email: string | null
  reply_to: string | null
  status: "draft" | "sending" | "sent" | "cancelled"
  target_audience: "all_active" | "test"
  total_recipients: number
  successful_sends: number
  failed_sends: number
  unsubscribes_count: number
  sent_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface NewsletterAuditLog {
  id: string
  subscriber_id: string
  action: string
  actor: string
  details: Record<string, any>
  ip_address: string | null
  created_at: string
}

/**
 * Ensures all newsletter database tables and indexes exist in PostgreSQL.
 */
export async function ensureNewsletterTables(pgConnection: any) {
  await pgConnection.raw(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      first_name VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      verification_token VARCHAR(255),
      verification_token_expires_at TIMESTAMPTZ,
      verified_at TIMESTAMPTZ,
      unsubscribe_token VARCHAR(255) NOT NULL UNIQUE,
      unsubscribed_at TIMESTAMPTZ,
      unsubscribe_reason TEXT,
      consent_source VARCHAR(100) NOT NULL DEFAULT 'website_footer',
      consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      consent_ip VARCHAR(100),
      consent_user_agent TEXT,
      last_email_sent_at TIMESTAMPTZ,
      emails_sent_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS newsletter_campaigns (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      preview_text VARCHAR(255),
      content_html TEXT NOT NULL,
      content_text TEXT NOT NULL,
      sender_name VARCHAR(255),
      sender_email VARCHAR(255),
      reply_to VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      target_audience VARCHAR(50) DEFAULT 'all_active',
      total_recipients INTEGER DEFAULT 0,
      successful_sends INTEGER DEFAULT 0,
      failed_sends INTEGER DEFAULT 0,
      unsubscribes_count INTEGER DEFAULT 0,
      sent_at TIMESTAMPTZ,
      created_by VARCHAR(255) DEFAULT 'admin',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscriber_audit_logs (
      id VARCHAR(255) PRIMARY KEY,
      subscriber_id VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS newsletter_campaign_logs (
      id VARCHAR(255) PRIMARY KEY,
      campaign_id VARCHAR(255) NOT NULL,
      subscriber_id VARCHAR(255),
      recipient_email VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      error_message TEXT,
      message_id VARCHAR(255),
      sent_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_nsub_email ON newsletter_subscribers (email);
    CREATE INDEX IF NOT EXISTS idx_nsub_status ON newsletter_subscribers (status);
    CREATE INDEX IF NOT EXISTS idx_nsub_verify_token ON newsletter_subscribers (verification_token);
    CREATE INDEX IF NOT EXISTS idx_nsub_unsub_token ON newsletter_subscribers (unsubscribe_token);
    CREATE INDEX IF NOT EXISTS idx_nsub_audit_sub_id ON newsletter_subscriber_audit_logs (subscriber_id);
    CREATE INDEX IF NOT EXISTS idx_ncmp_status ON newsletter_campaigns (status);
    CREATE INDEX IF NOT EXISTS idx_ncmp_logs_cmp_id ON newsletter_campaign_logs (campaign_id);
  `)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Public subscription request (visitor from frontend)
 */
export async function subscribeVisitor(
  pgConnection: any,
  params: {
    email: string
    firstName?: string | null
    consentSource?: string
    ip?: string | null
    userAgent?: string | null
  }
): Promise<{
  action: "created_pending" | "already_active" | "resubscribed_pending" | "renewed_pending"
  subscriber: NewsletterSubscriber
  verificationToken: string
}> {
  await ensureNewsletterTables(pgConnection)
  const email = normalizeEmail(params.email)
  const firstName = params.firstName ? params.firstName.trim() : null
  const consentSource = params.consentSource || "website_footer"
  const verificationToken = generateToken()
  const verificationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours

  // Check if subscriber already exists
  const existingRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE email = ? LIMIT 1`,
    [email]
  )
  const existing: NewsletterSubscriber | undefined = existingRes.rows?.[0]

  if (existing) {
    if (existing.status === "active") {
      return {
        action: "already_active",
        subscriber: existing,
        verificationToken: "",
      }
    }

    // If pending or unsubscribed/bounced, re-issue a verification token
    const unsubscribeToken = existing.unsubscribe_token || generateToken()
    const updateRes = await pgConnection.raw(
      `
      UPDATE newsletter_subscribers
      SET 
        first_name = COALESCE(?, first_name),
        status = 'pending',
        verification_token = ?,
        verification_token_expires_at = ?,
        unsubscribe_token = ?,
        consent_source = ?,
        consent_timestamp = NOW(),
        consent_ip = ?,
        consent_user_agent = ?,
        updated_at = NOW()
      WHERE id = ?
      RETURNING *;
      `,
      [
        firstName,
        verificationToken,
        verificationExpiresAt,
        unsubscribeToken,
        consentSource,
        params.ip || null,
        params.userAgent || null,
        existing.id,
      ]
    )

    const updatedSubscriber: NewsletterSubscriber = updateRes.rows[0]

    // Log audit
    const actionType = existing.status === "unsubscribed" ? "resubscribe_requested" : "verification_reissued"
    await logSubscriberAudit(pgConnection, {
      subscriberId: existing.id,
      action: actionType,
      actor: "visitor",
      details: {
        consent_source: consentSource,
        user_agent: params.userAgent,
      },
      ipAddress: params.ip || null,
    })

    return {
      action: existing.status === "unsubscribed" ? "resubscribed_pending" : "renewed_pending",
      subscriber: updatedSubscriber,
      verificationToken,
    }
  }

  // Create new subscriber in pending state
  const id = `nsub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
  const unsubscribeToken = generateToken()

  const insertRes = await pgConnection.raw(
    `
    INSERT INTO newsletter_subscribers (
      id, email, first_name, status, verification_token, verification_token_expires_at,
      unsubscribe_token, consent_source, consent_timestamp, consent_ip, consent_user_agent,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, 'pending', ?, ?,
      ?, ?, NOW(), ?, ?,
      NOW(), NOW()
    )
    RETURNING *;
    `,
    [
      id,
      email,
      firstName,
      verificationToken,
      verificationExpiresAt,
      unsubscribeToken,
      consentSource,
      params.ip || null,
      params.userAgent || null,
    ]
  )

  const newSubscriber: NewsletterSubscriber = insertRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: id,
    action: "subscribe_requested",
    actor: "visitor",
    details: {
      consent_source: consentSource,
      user_agent: params.userAgent,
    },
    ipAddress: params.ip || null,
  })

  return {
    action: "created_pending",
    subscriber: newSubscriber,
    verificationToken,
  }
}

/**
 * Verify a pending subscription with single-use token
 */
export async function verifySubscriberToken(
  pgConnection: any,
  token: string,
  ip?: string | null
): Promise<{
  success: boolean
  reason?: "invalid" | "expired" | "already_active"
  subscriber?: NewsletterSubscriber
}> {
  await ensureNewsletterTables(pgConnection)
  if (!token || typeof token !== "string") {
    return { success: false, reason: "invalid" }
  }

  const findRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE verification_token = ? LIMIT 1`,
    [token]
  )
  const subscriber: NewsletterSubscriber | undefined = findRes.rows?.[0]

  if (!subscriber) {
    return { success: false, reason: "invalid" }
  }

  if (subscriber.status === "active") {
    return { success: true, reason: "already_active", subscriber }
  }

  if (
    subscriber.verification_token_expires_at &&
    new Date(subscriber.verification_token_expires_at).getTime() < Date.now()
  ) {
    return { success: false, reason: "expired", subscriber }
  }

  // Activate subscriber
  const updateRes = await pgConnection.raw(
    `
    UPDATE newsletter_subscribers
    SET 
      status = 'active',
      verified_at = NOW(),
      verification_token = NULL,
      verification_token_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ?
    RETURNING *;
    `,
    [subscriber.id]
  )

  const activatedSubscriber: NewsletterSubscriber = updateRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: subscriber.id,
    action: "verified_double_optin",
    actor: "subscriber",
    details: {
      verified_at: new Date().toISOString(),
    },
    ipAddress: ip || null,
  })

  return { success: true, subscriber: activatedSubscriber }
}

/**
 * Unsubscribe a user using their unique, unguessable unsubscribe token
 */
export async function unsubscribeByToken(
  pgConnection: any,
  token: string,
  reason?: string | null,
  ip?: string | null
): Promise<{
  success: boolean
  alreadyUnsubscribed?: boolean
  reason?: string
  subscriber?: NewsletterSubscriber
}> {
  await ensureNewsletterTables(pgConnection)
  if (!token || typeof token !== "string") {
    return { success: false, reason: "invalid_token" }
  }

  const findRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ? LIMIT 1`,
    [token]
  )
  const subscriber: NewsletterSubscriber | undefined = findRes.rows?.[0]

  if (!subscriber) {
    return { success: false, reason: "not_found" }
  }

  if (subscriber.status === "unsubscribed") {
    return { success: true, alreadyUnsubscribed: true, subscriber }
  }

  const updateRes = await pgConnection.raw(
    `
    UPDATE newsletter_subscribers
    SET 
      status = 'unsubscribed',
      unsubscribed_at = NOW(),
      unsubscribe_reason = COALESCE(?, unsubscribe_reason),
      updated_at = NOW()
    WHERE id = ?
    RETURNING *;
    `,
    [reason || "User requested unsubscribe via email link", subscriber.id]
  )

  const unsubscribedUser: NewsletterSubscriber = updateRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: subscriber.id,
    action: "unsubscribed",
    actor: "subscriber",
    details: {
      reason: reason || "User requested unsubscribe",
      unsubscribed_at: new Date().toISOString(),
    },
    ipAddress: ip || null,
  })

  return { success: true, subscriber: unsubscribedUser }
}

/**
 * Unsubscribe a user using their email address directly (e.g. from website footer form)
 */
export async function unsubscribeByEmail(
  pgConnection: any,
  email: string,
  reason?: string | null,
  ip?: string | null
): Promise<{
  success: boolean
  alreadyUnsubscribed?: boolean
  reason?: string
  subscriber?: NewsletterSubscriber
}> {
  await ensureNewsletterTables(pgConnection)
  if (!email || typeof email !== "string") {
    return { success: false, reason: "invalid_email" }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const findRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE LOWER(email) = ? LIMIT 1`,
    [normalizedEmail]
  )
  const subscriber: NewsletterSubscriber | undefined = findRes.rows?.[0]

  if (!subscriber) {
    // If email is not found, treat as already unsubscribed/not on list to prevent email harvesting
    return {
      success: true,
      alreadyUnsubscribed: true,
      reason: "not_in_mailing_list",
    }
  }

  if (subscriber.status === "unsubscribed") {
    return { success: true, alreadyUnsubscribed: true, subscriber }
  }

  const updateRes = await pgConnection.raw(
    `
    UPDATE newsletter_subscribers
    SET 
      status = 'unsubscribed',
      unsubscribed_at = NOW(),
      unsubscribe_reason = COALESCE(?, unsubscribe_reason),
      updated_at = NOW()
    WHERE id = ?
    RETURNING *;
    `,
    [reason || "User requested unsubscribe via website footer", subscriber.id]
  )

  const unsubscribedUser: NewsletterSubscriber = updateRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: subscriber.id,
    action: "unsubscribed",
    actor: "subscriber",
    details: {
      reason: reason || "User requested unsubscribe via website form",
      unsubscribed_at: new Date().toISOString(),
    },
    ipAddress: ip || null,
  })

  return { success: true, subscriber: unsubscribedUser }
}

/**
 * Get subscriber info by unsubscribe token (for clean confirmation UI)
 */
export async function getSubscriberByUnsubscribeToken(
  pgConnection: any,
  token: string
): Promise<NewsletterSubscriber | null> {
  await ensureNewsletterTables(pgConnection)
  const res = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ? LIMIT 1`,
    [token]
  )
  return res.rows?.[0] || null
}

/**
 * List subscribers for Admin Management
 */
export async function listSubscribersAdmin(
  pgConnection: any,
  query: {
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: "asc" | "desc"
    limit?: number
    offset?: number
  }
): Promise<{
  subscribers: NewsletterSubscriber[]
  total: number
  stats: {
    total: number
    active: number
    pending: number
    unsubscribed: number
    bounced: number
    suppressed: number
  }
}> {
  await ensureNewsletterTables(pgConnection)
  const search = query.search ? query.search.trim() : ""
  const status = query.status ? query.status.trim() : ""
  const sortBy = ["created_at", "email", "verified_at", "status"].includes(query.sortBy || "")
    ? query.sortBy!
    : "created_at"
  const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC"
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 500)
  const offset = Math.max(Number(query.offset) || 0, 0)

  let whereSql = `WHERE 1=1`
  const params: any[] = []

  if (search) {
    whereSql += ` AND (email ILIKE ? OR first_name ILIKE ?)`
    params.push(`%${search}%`, `%${search}%`)
  }

  if (status && status !== "all") {
    whereSql += ` AND status = ?`
    params.push(status)
  }

  // Get total matching
  const countRes = await pgConnection.raw(
    `SELECT COUNT(*) as count FROM newsletter_subscribers ${whereSql}`,
    params
  )
  const total = Number(countRes.rows?.[0]?.count || 0)

  // Get rows
  const rowsRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers ${whereSql} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  const subscribers: NewsletterSubscriber[] = rowsRes.rows || []

  // Global counts for filter tabs
  const statsRes = await pgConnection.raw(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
      COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
      COUNT(*) FILTER (WHERE status = 'suppressed') as suppressed
    FROM newsletter_subscribers;
  `)
  const statsRow = statsRes.rows?.[0] || {}

  return {
    subscribers,
    total,
    stats: {
      total: Number(statsRow.total || 0),
      active: Number(statsRow.active || 0),
      pending: Number(statsRow.pending || 0),
      unsubscribed: Number(statsRow.unsubscribed || 0),
      bounced: Number(statsRow.bounced || 0),
      suppressed: Number(statsRow.suppressed || 0),
    },
  }
}

/**
 * Get subscriber details and audit history
 */
export async function getSubscriberDetailsAdmin(
  pgConnection: any,
  id: string
): Promise<{
  subscriber: NewsletterSubscriber | null
  auditLogs: NewsletterAuditLog[]
}> {
  await ensureNewsletterTables(pgConnection)
  const subRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE id = ? LIMIT 1`,
    [id]
  )
  const subscriber = subRes.rows?.[0] || null

  let auditLogs: NewsletterAuditLog[] = []
  if (subscriber) {
    const logsRes = await pgConnection.raw(
      `SELECT * FROM newsletter_subscriber_audit_logs WHERE subscriber_id = ? ORDER BY created_at DESC LIMIT 50`,
      [id]
    )
    auditLogs = logsRes.rows || []
  }

  return { subscriber, auditLogs }
}

/**
 * Add subscriber manually from Admin with documented consent
 */
export async function addSubscriberAdmin(
  pgConnection: any,
  params: {
    email: string
    firstName?: string | null
    status: "active" | "pending"
    consentDocumentation: string
    adminUser: string
  }
): Promise<NewsletterSubscriber> {
  await ensureNewsletterTables(pgConnection)
  const email = normalizeEmail(params.email)
  const firstName = params.firstName ? params.firstName.trim() : null
  const status = params.status || "active"
  const verificationToken = status === "pending" ? generateToken() : null
  const verificationExpiresAt =
    status === "pending" ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() : null
  const verifiedAt = status === "active" ? new Date().toISOString() : null
  const unsubscribeToken = generateToken()
  const id = `nsub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`

  const insertRes = await pgConnection.raw(
    `
    INSERT INTO newsletter_subscribers (
      id, email, first_name, status, verification_token, verification_token_expires_at,
      verified_at, unsubscribe_token, consent_source, consent_timestamp,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, 'admin_manual', NOW(),
      NOW(), NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      first_name = COALESCE(EXCLUDED.first_name, newsletter_subscribers.first_name),
      status = EXCLUDED.status,
      verification_token = EXCLUDED.verification_token,
      verification_token_expires_at = EXCLUDED.verification_token_expires_at,
      verified_at = EXCLUDED.verified_at,
      consent_source = 'admin_manual',
      updated_at = NOW()
    RETURNING *;
    `,
    [
      id,
      email,
      firstName,
      status,
      verificationToken,
      verificationExpiresAt,
      verifiedAt,
      unsubscribeToken,
    ]
  )

  const savedSubscriber: NewsletterSubscriber = insertRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: savedSubscriber.id,
    action: "admin_manual_added",
    actor: params.adminUser,
    details: {
      consent_documentation: params.consentDocumentation,
      status,
    },
  })

  return savedSubscriber
}

/**
 * Resend verification email for pending subscriber
 */
export async function resendVerificationAdmin(
  pgConnection: any,
  id: string,
  adminUser: string
): Promise<{
  success: boolean
  subscriber?: NewsletterSubscriber
  verificationToken?: string
  error?: string
}> {
  await ensureNewsletterTables(pgConnection)
  const subRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE id = ? LIMIT 1`,
    [id]
  )
  const subscriber: NewsletterSubscriber | undefined = subRes.rows?.[0]

  if (!subscriber) {
    return { success: false, error: "Subscriber not found" }
  }

  if (subscriber.status === "active") {
    return { success: false, error: "Subscriber is already active and verified" }
  }

  const verificationToken = generateToken()
  const verificationExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  const updateRes = await pgConnection.raw(
    `
    UPDATE newsletter_subscribers
    SET 
      verification_token = ?,
      verification_token_expires_at = ?,
      updated_at = NOW()
    WHERE id = ?
    RETURNING *;
    `,
    [verificationToken, verificationExpiresAt, id]
  )

  const updated: NewsletterSubscriber = updateRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: id,
    action: "admin_resend_verification",
    actor: adminUser,
    details: {
      token_expires_at: verificationExpiresAt,
    },
  })

  return { success: true, subscriber: updated, verificationToken }
}

/**
 * Unsubscribe subscriber by Admin
 */
export async function unsubscribeAdmin(
  pgConnection: any,
  id: string,
  reason: string,
  adminUser: string
): Promise<NewsletterSubscriber> {
  await ensureNewsletterTables(pgConnection)
  const updateRes = await pgConnection.raw(
    `
    UPDATE newsletter_subscribers
    SET 
      status = 'unsubscribed',
      unsubscribed_at = NOW(),
      unsubscribe_reason = ?,
      updated_at = NOW()
    WHERE id = ?
    RETURNING *;
    `,
    [reason || "Unsubscribed by administrator", id]
  )

  const updated: NewsletterSubscriber = updateRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: id,
    action: "admin_unsubscribed",
    actor: adminUser,
    details: {
      reason,
    },
  })

  return updated
}

/**
 * Reactivate a previously unsubscribed user only with explicit documented consent
 */
export async function reactivateSubscriberAdmin(
  pgConnection: any,
  id: string,
  consentDocumentation: string,
  adminUser: string
): Promise<NewsletterSubscriber> {
  await ensureNewsletterTables(pgConnection)
  if (!consentDocumentation || consentDocumentation.trim().length < 10) {
    throw new Error("A valid consent documentation record (minimum 10 characters) is required to reactivate a subscriber.")
  }

  const updateRes = await pgConnection.raw(
    `
    UPDATE newsletter_subscribers
    SET 
      status = 'active',
      unsubscribed_at = NULL,
      unsubscribe_reason = NULL,
      consent_source = 'admin_reactivated_with_consent',
      consent_timestamp = NOW(),
      updated_at = NOW()
    WHERE id = ?
    RETURNING *;
    `,
    [id]
  )

  const updated: NewsletterSubscriber = updateRes.rows[0]

  await logSubscriberAudit(pgConnection, {
    subscriberId: id,
    action: "admin_reactivated",
    actor: adminUser,
    details: {
      consent_documentation: consentDocumentation.trim(),
      reactivated_at: new Date().toISOString(),
    },
  })

  return updated
}

/**
 * Delete a pending subscription (only permitted if status is pending)
 */
export async function deletePendingSubscriberAdmin(
  pgConnection: any,
  id: string,
  adminUser: string
): Promise<{ success: boolean; error?: string }> {
  await ensureNewsletterTables(pgConnection)
  const checkRes = await pgConnection.raw(
    `SELECT * FROM newsletter_subscribers WHERE id = ? LIMIT 1`,
    [id]
  )
  const sub = checkRes.rows?.[0]
  if (!sub) {
    return { success: false, error: "Subscriber not found" }
  }

  if (sub.status !== "pending") {
    return {
      success: false,
      error: "For regulatory suppression compliance, only 'pending' records may be deleted. Unsubscribed users must remain suppressed.",
    }
  }

  await pgConnection.raw(`DELETE FROM newsletter_subscriber_audit_logs WHERE subscriber_id = ?`, [id])
  await pgConnection.raw(`DELETE FROM newsletter_subscribers WHERE id = ?`, [id])

  return { success: true }
}

/**
 * Log audit events for regulatory & compliance tracking
 */
export async function logSubscriberAudit(
  pgConnection: any,
  params: {
    subscriberId: string
    action: string
    actor: string
    details: Record<string, any>
    ipAddress?: string | null
  }
) {
  try {
    const id = `naud_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    await pgConnection.raw(
      `
      INSERT INTO newsletter_subscriber_audit_logs (
        id, subscriber_id, action, actor, details, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?::jsonb, ?, NOW());
      `,
      [
        id,
        params.subscriberId,
        params.action,
        params.actor,
        JSON.stringify(params.details),
        params.ipAddress || null,
      ]
    )
  } catch (err) {
    console.error("[Newsletter Audit] Error writing audit log:", err)
  }
}

/**
 * Campaign Management Database Functions
 */
export async function listCampaignsAdmin(pgConnection: any): Promise<{
  campaigns: NewsletterCampaign[]
  stats: {
    total: number
    sent: number
    draft: number
    activeSubscribersCount: number
  }
}> {
  await ensureNewsletterTables(pgConnection)
  const rowsRes = await pgConnection.raw(
    `SELECT * FROM newsletter_campaigns ORDER BY created_at DESC;`
  )
  const campaigns: NewsletterCampaign[] = rowsRes.rows || []

  const statsRes = await pgConnection.raw(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'draft') as draft
    FROM newsletter_campaigns;
  `)
  const s = statsRes.rows?.[0] || {}

  const subCountRes = await pgConnection.raw(
    `SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active'`
  )
  const activeSubscribersCount = Number(subCountRes.rows?.[0]?.count || 0)

  return {
    campaigns,
    stats: {
      total: Number(s.total || 0),
      sent: Number(s.sent || 0),
      draft: Number(s.draft || 0),
      activeSubscribersCount,
    },
  }
}

export async function createCampaignAdmin(
  pgConnection: any,
  params: {
    title: string
    subject: string
    previewText?: string | null
    contentHtml: string
    contentText: string
    senderName?: string | null
    senderEmail?: string | null
    replyTo?: string | null
    createdBy?: string
  }
): Promise<NewsletterCampaign> {
  await ensureNewsletterTables(pgConnection)
  const id = `ncmp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
  const insertRes = await pgConnection.raw(
    `
    INSERT INTO newsletter_campaigns (
      id, title, subject, preview_text, content_html, content_text,
      sender_name, sender_email, reply_to, status, target_audience,
      created_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, 'draft', 'all_active',
      ?, NOW(), NOW()
    )
    RETURNING *;
    `,
    [
      id,
      params.title.trim(),
      params.subject.trim(),
      params.previewText?.trim() || null,
      params.contentHtml,
      params.contentText,
      params.senderName || null,
      params.senderEmail || null,
      params.replyTo || null,
      params.createdBy || "admin",
    ]
  )

  return insertRes.rows[0]
}
