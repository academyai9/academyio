import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.query as Record<string, string>
  const statusFilter = query.status || "all"
  const webinarFilter = query.webinar_id || "all"
  const searchQuery = query.q ? query.q.toLowerCase() : ""

  const client = await pool.connect()
  try {
    // 1. Fetch Attempts with webinar metadata
    let attemptsSql = `
      SELECT a.*, w.title as webinar_title, w.speaker_name, q.passing_score
      FROM quiz_attempt a
      LEFT JOIN webinar w ON a.webinar_id = w.id
      LEFT JOIN webinar_quiz q ON a.quiz_id = q.id
      WHERE a.deleted_at IS NULL
    `
    const params: any[] = []

    if (webinarFilter !== "all") {
      params.push(webinarFilter)
      attemptsSql += ` AND a.webinar_id = $${params.length}`
    }

    if (statusFilter === "passed") {
      attemptsSql += ` AND a.passed = true`
    } else if (statusFilter === "failed") {
      attemptsSql += ` AND a.passed = false`
    } else if (statusFilter === "cooldown") {
      attemptsSql += ` AND a.passed = false AND a.next_eligible_at > now() AND a.cooldown_reset_by_admin = false`
    }

    attemptsSql += ` ORDER BY a.submitted_at DESC LIMIT 100`

    const attemptsRes = await client.query(attemptsSql, params)
    let attempts = attemptsRes.rows

    if (searchQuery) {
      attempts = attempts.filter(
        (att: any) =>
          (att.customer_name && att.customer_name.toLowerCase().includes(searchQuery)) ||
          (att.customer_email && att.customer_email.toLowerCase().includes(searchQuery)) ||
          (att.webinar_title && att.webinar_title.toLowerCase().includes(searchQuery))
      )
    }

    // 2. Fetch Issued Certificates
    let certsSql = `
      SELECT c.*, w.slug as webinar_slug
      FROM webinar_certificate c
      LEFT JOIN webinar w ON c.webinar_id = w.id
      WHERE c.deleted_at IS NULL
    `
    const certParams: any[] = []
    if (webinarFilter !== "all") {
      certParams.push(webinarFilter)
      certsSql += ` AND c.webinar_id = $${certParams.length}`
    }
    certsSql += ` ORDER BY c.issue_date DESC LIMIT 100`

    const certsRes = await client.query(certsSql, certParams)
    let certificates = certsRes.rows

    if (searchQuery) {
      certificates = certificates.filter(
        (c: any) =>
          (c.customer_name && c.customer_name.toLowerCase().includes(searchQuery)) ||
          (c.customer_email && c.customer_email.toLowerCase().includes(searchQuery)) ||
          (c.certificate_number && c.certificate_number.toLowerCase().includes(searchQuery)) ||
          (c.webinar_title && c.webinar_title.toLowerCase().includes(searchQuery))
      )
    }

    // 3. Aggregate Stats
    const statsRes = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM webinar_certificate WHERE deleted_at IS NULL AND status = 'active') as total_certificates,
        (SELECT COUNT(*) FROM quiz_attempt WHERE deleted_at IS NULL) as total_attempts,
        (SELECT COUNT(*) FROM quiz_attempt WHERE deleted_at IS NULL AND passed = true) as passed_attempts,
        (SELECT COUNT(*) FROM quiz_attempt WHERE deleted_at IS NULL AND passed = false) as failed_attempts,
        (SELECT COALESCE(SUM(cpe_credits), 0) FROM webinar_certificate WHERE deleted_at IS NULL AND status = 'active') as total_cpe_credits_issued
    `)

    return res.json({
      attempts,
      certificates,
      stats: statsRes.rows[0],
    })
  } catch (error: any) {
    console.error("Error in GET /admin/certificates/reports:", error)
    return res.status(500).json({ message: "Failed to generate certificate reports", error: error.message })
  } finally {
    client.release()
  }
}
