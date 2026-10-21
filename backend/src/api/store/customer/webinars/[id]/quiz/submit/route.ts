import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import { getWebinarEndTimestamp } from "../../../../../../../modules/webinar/utils/webinar-status"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id || (req.query.customer_id as string) || (req.body as any)?.customer_id
  const { id: webinarId } = req.params
  const { answers } = req.body as { answers?: Record<string, string> }

  if (!customerId) {
    return res.status(401).json({ message: "Authentication required to submit quiz answers" })
  }

  if (!answers || typeof answers !== "object") {
    return res.status(400).json({ message: "Invalid submission: answers object is required" })
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Fetch Webinar
    const webRes = await client.query(
      `SELECT id, title, slug, event_date, start_time, end_time, timezone, duration_minutes,
              cpe_credits, speaker_name
       FROM webinar WHERE id = $1 AND deleted_at IS NULL`,
      [webinarId]
    )

    if (webRes.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "Webinar not found" })
    }
    const webinar = webRes.rows[0]
    const now = new Date()

    // 2. Verify Live Registration / Eligibility
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

    const hasLiveEntitlement = entRes.rows.some((e: any) => {
      if (e.expires_at && new Date(e.expires_at) < now) return false
      return e.access_type === "live" || e.access_type === "bundle"
    })

    const hasActiveSub = subRes.rows.some((s: any) => {
      return new Date(s.current_period_end) > now && s.includes_live === true
    })

    if (!hasLiveEntitlement && !hasActiveSub) {
      await client.query("ROLLBACK")
      return res.status(403).json({
        message: "You must be registered for the Live Webinar to submit this quiz.",
      })
    }

    // 3. Enforce Webinar End Time
    const endTimestamp = getWebinarEndTimestamp(webinar)
    if (endTimestamp > now) {
      await client.query("ROLLBACK")
      return res.status(403).json({
        message: "This quiz cannot be submitted before the live webinar has concluded.",
        scheduled_end: endTimestamp.toISOString(),
      })
    }

    // 4. Check if Already Passed & Certified
    const certCheck = await client.query(
      `SELECT id, certificate_number, issue_date, cpe_credits, score_percentage
       FROM webinar_certificate
       WHERE customer_id = $1 AND webinar_id = $2 AND status = 'active' AND deleted_at IS NULL`,
      [customerId, webinarId]
    )

    if (certCheck.rows.length > 0) {
      await client.query("COMMIT")
      return res.json({
        passed: true,
        already_passed: true,
        message: "You have already passed this comprehension quiz and earned your certificate.",
        certificate: certCheck.rows[0],
      })
    }

    // 5. Fetch Quiz Configuration
    const quizRes = await client.query(
      `SELECT id, title, is_enabled, status, passing_score, cooldown_minutes, certificate_template,
              signatory_name, signatory_title, issuer_name, cpe_credits
       FROM webinar_quiz
       WHERE webinar_id = $1 AND deleted_at IS NULL`,
      [webinarId]
    )

    if (quizRes.rows.length === 0 || !quizRes.rows[0].is_enabled || quizRes.rows[0].status === "draft") {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "Quiz not configured or is currently in draft mode." })
    }
    const quiz = quizRes.rows[0]
    const cooldownMins = quiz.cooldown_minutes || 60
    const passingScore = quiz.passing_score || 75

    // 6. Enforce Server-Side Retake Cooldown
    const lastAttemptRes = await client.query(
      `SELECT id, attempt_number, passed, next_eligible_at, cooldown_reset_by_admin
       FROM quiz_attempt
       WHERE customer_id = $1 AND webinar_id = $2 AND deleted_at IS NULL
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [customerId, webinarId]
    )

    if (lastAttemptRes.rows.length > 0) {
      const prev = lastAttemptRes.rows[0]
      if (!prev.passed && prev.next_eligible_at && !prev.cooldown_reset_by_admin) {
        const nextEligible = new Date(prev.next_eligible_at)
        if (now < nextEligible) {
          const remainingSeconds = Math.ceil((nextEligible.getTime() - now.getTime()) / 1000)
          await client.query("ROLLBACK")
          return res.status(429).json({
            error: "Cooldown active",
            message: `A mandatory 60-minute cooling period is active. You may retake the quiz in ${Math.ceil(remainingSeconds / 60)} minutes.`,
            next_eligible_at: nextEligible.toISOString(),
            remaining_seconds: remainingSeconds,
          })
        }
      }
    }

    // 7. Load Questions with Correct Answer Keys SECURELY on Server
    const qstRes = await client.query(
      `SELECT id, correct_option_id, explanation
       FROM quiz_question
       WHERE quiz_id = $1 AND deleted_at IS NULL
       ORDER BY order_index ASC`,
      [quiz.id]
    )

    const questions = qstRes.rows
    if (questions.length === 0) {
      await client.query("ROLLBACK")
      return res.status(500).json({ message: "No questions found in this quiz" })
    }

    // 8. Secure Backend Evaluation
    let correctCount = 0
    for (const q of questions) {
      const selectedOption = answers[q.id]
      if (selectedOption && selectedOption === q.correct_option_id) {
        correctCount++
      }
    }

    const totalQuestions = questions.length
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100 * 10) / 10
    const passed = scorePercentage >= passingScore

    // Determine Attempt Number
    const countRes = await client.query(
      `SELECT COUNT(*)::int as count FROM quiz_attempt WHERE customer_id = $1 AND webinar_id = $2 AND deleted_at IS NULL`,
      [customerId, webinarId]
    )
    const attemptNumber = (countRes.rows[0]?.count || 0) + 1

    // Fetch Customer Profile for Certificate
    const custRes = await client.query(
      `SELECT id, email, first_name, last_name, metadata FROM customer WHERE id = $1`,
      [customerId]
    )
    const customer = custRes.rows[0] || {}
    const rawFullName = customer.metadata?.full_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
    const participantName = rawFullName || customer.email || "Webinar Participant"
    const participantEmail = customer.email || ""

    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    if (passed) {
      // 9. Generate Certificate Record
      const certId = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const randomSixDigit = Math.floor(100000 + Math.random() * 900000)
      const currentYear = new Date().getFullYear()
      const certificateNumber = `CERT-ACAD-${currentYear}-${randomSixDigit}`
      const awardedCredits = quiz.cpe_credits || webinar.cpe_credits || 1.0

      const certInsert = await client.query(
        `INSERT INTO webinar_certificate (
          id, certificate_number, customer_id, customer_email, customer_name,
          webinar_id, quiz_id, attempt_id, webinar_title, speaker_name, event_date,
          issue_date, cpe_credits, score_percentage, signatory_name, signatory_title,
          issuer_name, status, reissue_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'active', 0)
        RETURNING *`,
        [
          certId,
          certificateNumber,
          customerId,
          participantEmail,
          participantName,
          webinarId,
          quiz.id,
          attemptId,
          webinar.title,
          webinar.speaker_name,
          webinar.event_date,
          now,
          awardedCredits,
          scorePercentage,
          quiz.signatory_name || webinar.speaker_name,
          quiz.signatory_title || "Lead Faculty / CPE Course Director",
          quiz.issuer_name || "AcademyIO Continuing Professional Education",
        ]
      )

      // Record Successful Attempt
      await client.query(
        `INSERT INTO quiz_attempt (
          id, customer_id, customer_email, customer_name, webinar_id, quiz_id,
          attempt_number, answers, total_questions, correct_answers, score_percentage,
          passed, submitted_at, next_eligible_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, null)`,
        [
          attemptId,
          customerId,
          participantEmail,
          participantName,
          webinarId,
          quiz.id,
          attemptNumber,
          JSON.stringify(answers),
          totalQuestions,
          correctCount,
          scorePercentage,
          now,
        ]
      )

      await client.query("COMMIT")

      return res.json({
        passed: true,
        score: scorePercentage,
        correct_answers: correctCount,
        total_questions: totalQuestions,
        passing_score: passingScore,
        attempt_number: attemptNumber,
        certificate: certInsert.rows[0],
      })
    } else {
      // 10. Failed: Calculate Next Eligible Time (60 mins cooldown)
      const nextEligibleAt = new Date(now.getTime() + cooldownMins * 60 * 1000)

      await client.query(
        `INSERT INTO quiz_attempt (
          id, customer_id, customer_email, customer_name, webinar_id, quiz_id,
          attempt_number, answers, total_questions, correct_answers, score_percentage,
          passed, submitted_at, next_eligible_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, $12, $13)`,
        [
          attemptId,
          customerId,
          participantEmail,
          participantName,
          webinarId,
          quiz.id,
          attemptNumber,
          JSON.stringify(answers),
          totalQuestions,
          correctCount,
          scorePercentage,
          now,
          nextEligibleAt,
        ]
      )

      await client.query("COMMIT")

      return res.json({
        passed: false,
        score: scorePercentage,
        correct_answers: correctCount,
        total_questions: totalQuestions,
        passing_score: passingScore,
        attempt_number: attemptNumber,
        next_eligible_at: nextEligibleAt.toISOString(),
        cooldown_minutes: cooldownMins,
      })
    }
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error in POST /customer/webinars/[id]/quiz/submit:", error)
    return res.status(500).json({ message: "Failed to evaluate quiz", error: error.message })
  } finally {
    client.release()
  }
}
