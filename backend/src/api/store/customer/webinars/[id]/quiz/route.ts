import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getWebinarEndTimestamp } from "../../../../../../modules/webinar/utils/webinar-status"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id || (req.query.customer_id as string)
  const { id: webinarId } = req.params

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to access the webinar quiz" })
  }

  const client = await pool.connect()
  try {
    // 1. Fetch Webinar details
    const webRes = await client.query(
      `SELECT id, title, slug, event_date, start_time, end_time, timezone, duration_minutes,
              cpe_credits, speaker_name, is_upcoming, status
       FROM webinar WHERE id = $1 AND deleted_at IS NULL`,
      [webinarId]
    )

    if (webRes.rows.length === 0) {
      return res.status(404).json({ message: "Webinar not found" })
    }
    const webinar = webRes.rows[0]

    // 2. Check Customer Eligibility (Live registration or active subscription)
    const entRes = await client.query(
      `SELECT id, access_type, status, expires_at
       FROM customer_entitlement
       WHERE customer_id = $1 AND webinar_id = $2 AND status = 'active' AND deleted_at IS NULL`,
      [customerId, webinarId]
    )

    const subRes = await client.query(
      `SELECT cs.id, cs.status, cs.current_period_end, sp.includes_live
       FROM customer_subscription cs
       JOIN subscription_plan sp ON cs.plan_id = sp.id
       WHERE cs.customer_id = $1 AND cs.status = 'active' AND cs.deleted_at IS NULL`,
      [customerId]
    )

    const now = new Date()
    const hasLiveEntitlement = entRes.rows.some((e: any) => {
      if (e.expires_at && new Date(e.expires_at) < now) return false
      return e.access_type === "live" || e.access_type === "bundle"
    })

    const hasActiveSub = subRes.rows.some((s: any) => {
      return new Date(s.current_period_end) > now && s.includes_live === true
    })

    if (!hasLiveEntitlement && !hasActiveSub) {
      return res.status(403).json({
        eligible: false,
        message: "You must be registered for the Live Webinar to access this certification quiz.",
      })
    }

    // 3. Enforce Webinar End Time Requirement
    const endTimestamp = getWebinarEndTimestamp(webinar)
    if (endTimestamp > now) {
      return res.status(403).json({
        eligible: false,
        webinar_ended: false,
        scheduled_end: endTimestamp.toISOString(),
        message: `This comprehension quiz unlocks once the live webinar concludes at ${webinar.end_time || "scheduled end time"} (${webinar.timezone || "EST"}).`,
      })
    }

    // 4. Fetch Quiz Configuration
    const quizRes = await client.query(
      `SELECT id, title, instructions, is_enabled, status, passing_score, cooldown_minutes,
              max_attempts, certificate_template, signatory_name, signatory_title, issuer_name, cpe_credits
       FROM webinar_quiz
       WHERE webinar_id = $1 AND deleted_at IS NULL`,
      [webinarId]
    )

    if (quizRes.rows.length === 0 || !quizRes.rows[0].is_enabled || quizRes.rows[0].status === "draft") {
      return res.status(404).json({ message: "No active certification quiz configured or quiz is currently unpublished." })
    }
    const quiz = quizRes.rows[0]

    // 5. Check if Customer has Already Passed
    const certRes = await client.query(
      `SELECT id, certificate_number, issue_date, cpe_credits, score_percentage, status
       FROM webinar_certificate
       WHERE customer_id = $1 AND webinar_id = $2 AND status = 'active' AND deleted_at IS NULL`,
      [customerId, webinarId]
    )

    if (certRes.rows.length > 0) {
      return res.json({
        eligible: true,
        already_passed: true,
        certificate: certRes.rows[0],
        webinar: {
          id: webinar.id,
          title: webinar.title,
          speaker_name: webinar.speaker_name,
          cpe_credits: webinar.cpe_credits,
          event_date: webinar.event_date,
        },
      })
    }

    // 6. Check Retake Cooldown Status
    const attemptRes = await client.query(
      `SELECT id, attempt_number, score_percentage, passed, submitted_at, next_eligible_at, cooldown_reset_by_admin
       FROM quiz_attempt
       WHERE customer_id = $1 AND webinar_id = $2 AND deleted_at IS NULL
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [customerId, webinarId]
    )

    const attemptsCountRes = await client.query(
      `SELECT COUNT(*)::int as total FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2 AND deleted_at IS NULL`,
      [customerId, webinarId]
    )
    const totalAttempts = attemptsCountRes.rows[0]?.total || 0

    if (attemptRes.rows.length > 0) {
      const latestAttempt = attemptRes.rows[0]
      if (!latestAttempt.passed && latestAttempt.next_eligible_at && !latestAttempt.cooldown_reset_by_admin) {
        const nextEligible = new Date(latestAttempt.next_eligible_at)
        if (now < nextEligible) {
          const remainingSeconds = Math.ceil((nextEligible.getTime() - now.getTime()) / 1000)
          return res.json({
            eligible: true,
            on_cooldown: true,
            next_eligible_at: nextEligible.toISOString(),
            remaining_seconds: remainingSeconds,
            latest_score: Number(latestAttempt.score_percentage),
            passing_score: quiz.passing_score,
            total_attempts: totalAttempts,
            cooldown_minutes: quiz.cooldown_minutes,
            webinar: {
              id: webinar.id,
              title: webinar.title,
              speaker_name: webinar.speaker_name,
              cpe_credits: webinar.cpe_credits,
            },
          })
        }
      }
    }

    // 7. Load Questions — SANITIZED (NEVER leak correct_option_id or explanation)
    const qstRes = await client.query(
      `SELECT id, question_text, question_type, options, order_index
       FROM quiz_question
       WHERE quiz_id = $1 AND deleted_at IS NULL
       ORDER BY order_index ASC`,
      [quiz.id]
    )

    return res.json({
      eligible: true,
      on_cooldown: false,
      already_passed: false,
      total_attempts: totalAttempts,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        instructions: quiz.instructions,
        passing_score: quiz.passing_score,
        cooldown_minutes: quiz.cooldown_minutes,
        cpe_credits: quiz.cpe_credits || webinar.cpe_credits,
        total_questions: qstRes.rows.length,
      },
      questions: qstRes.rows.map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        order_index: q.order_index,
      })),
      webinar: {
        id: webinar.id,
        title: webinar.title,
        speaker_name: webinar.speaker_name,
        cpe_credits: webinar.cpe_credits,
        event_date: webinar.event_date,
      },
    })
  } catch (error: any) {
    console.error("Error in GET /customer/webinars/[id]/quiz:", error)
    return res.status(500).json({ message: "Failed to load quiz", error: error.message })
  } finally {
    client.release()
  }
}
