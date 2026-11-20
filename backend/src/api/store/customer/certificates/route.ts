import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getWebinarEndTimestamp } from "../../../../modules/webinar/utils/webinar-status"
import { getSharedPool } from "../../../../utils/db-pool"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const pool = getSharedPool()
  const client = await pool.connect()
  try {
    const now = new Date()

    // 1. Fetch Issued Certificates
    const certsRes = await client.query(
      `SELECT c.*, w.slug as webinar_slug, w.category as webinar_category
       FROM webinar_certificate c
       LEFT JOIN webinar w ON c.webinar_id = w.id
       WHERE c.customer_id = $1 AND c.status = 'active' AND c.deleted_at IS NULL
       ORDER BY c.issue_date DESC`,
      [customerId]
    )

    // 2. Fetch Customer Entitlements & Subscriptions for Webinar Eligibility Status
    const entRes = await client.query(
      `SELECT e.webinar_id, e.access_type, e.status, e.expires_at,
              w.title, w.slug, w.event_date, w.start_time, w.end_time, w.timezone,
              w.duration_minutes, w.speaker_name, w.cpe_credits, w.is_upcoming,
              q.id as quiz_id, q.is_enabled as quiz_enabled, q.status as quiz_status, q.passing_score
       FROM customer_entitlement e
       JOIN webinar w ON e.webinar_id = w.id
       LEFT JOIN webinar_quiz q ON w.id = q.webinar_id AND q.deleted_at IS NULL
       WHERE e.customer_id = $1 AND e.status = 'active' AND e.deleted_at IS NULL
         AND (e.access_type = 'live' OR e.access_type = 'bundle')`,
      [customerId]
    )

    // 3. For each entitled webinar, determine certificate eligibility status
    const webinarStatuses: any[] = []
    const issuedMap = new Map<string, any>()
    for (const cert of certsRes.rows) {
      issuedMap.set(cert.webinar_id, cert)
    }

    for (const row of entRes.rows) {
      if (row.expires_at && new Date(row.expires_at) < now) continue

      const endTimestamp = getWebinarEndTimestamp(row)
      const isEnded = endTimestamp <= now
      const existingCert = issuedMap.get(row.webinar_id)

      // Query latest attempt for this webinar
      const attRes = await client.query(
        `SELECT attempt_number, score_percentage, passed, submitted_at, next_eligible_at, cooldown_reset_by_admin
         FROM quiz_attempt
         WHERE customer_id = $1 AND webinar_id = $2 AND deleted_at IS NULL
         ORDER BY submitted_at DESC LIMIT 1`,
        [customerId, row.webinar_id]
      )
      const latestAttempt = attRes.rows[0] || null

      let status = "not_started"
      let nextEligibleAt: string | null = null
      let remainingSeconds: number | null = null

      if (existingCert) {
        status = "passed"
      } else if (!isEnded) {
        status = "upcoming"
      } else if (!row.quiz_id || !row.quiz_enabled || row.quiz_status === "draft") {
        status = "quiz_unavailable"
      } else if (latestAttempt && !latestAttempt.passed) {
        if (latestAttempt.next_eligible_at && !latestAttempt.cooldown_reset_by_admin) {
          const nextEligible = new Date(latestAttempt.next_eligible_at)
          if (now < nextEligible) {
            status = "cooldown"
            nextEligibleAt = nextEligible.toISOString()
            remainingSeconds = Math.ceil((nextEligible.getTime() - now.getTime()) / 1000)
          } else {
            status = "retake_ready"
          }
        } else {
          status = "retake_ready"
        }
      } else {
        status = "quiz_ready"
      }

      webinarStatuses.push({
        webinar_id: row.webinar_id,
        webinar_title: row.title,
        webinar_slug: row.slug,
        speaker_name: row.speaker_name,
        cpe_credits: row.cpe_credits,
        event_date: row.event_date,
        end_timestamp: endTimestamp.toISOString(),
        is_ended: isEnded,
        status, // 'upcoming' | 'quiz_ready' | 'cooldown' | 'retake_ready' | 'passed'
        next_eligible_at: nextEligibleAt,
        remaining_seconds: remainingSeconds,
        latest_attempt: latestAttempt,
        certificate: existingCert || null,
      })
    }

    return res.json({
      certificates: certsRes.rows,
      eligible_webinars: webinarStatuses,
    })
  } catch (error: any) {
    console.error("Error in GET /customer/certificates:", error)
    return res.status(500).json({ message: "Failed to load certificates", error: error.message })
  } finally {
    client.release()
  }
}
