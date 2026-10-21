import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const client = await pool.connect()
  try {
    const quizzesRes = await client.query(
      `SELECT q.*, 
              w.title as webinar_title, 
              w.slug as webinar_slug, 
              w.speaker_name as webinar_speaker, 
              w.event_date as webinar_date,
              w.cpe_credits as webinar_credits,
              (SELECT COUNT(*)::int FROM quiz_question qq WHERE qq.quiz_id = q.id AND qq.deleted_at IS NULL) as question_count,
              (SELECT COUNT(*)::int FROM quiz_attempt qa WHERE qa.quiz_id = q.id AND qa.deleted_at IS NULL) as total_attempts,
              (SELECT COUNT(*)::int FROM quiz_attempt qa WHERE qa.quiz_id = q.id AND qa.passed = true AND qa.deleted_at IS NULL) as passed_attempts,
              (SELECT COUNT(*)::int FROM quiz_attempt qa WHERE qa.quiz_id = q.id AND qa.passed = false AND qa.deleted_at IS NULL) as failed_attempts
       FROM webinar_quiz q
       JOIN webinar w ON q.webinar_id = w.id
       WHERE q.deleted_at IS NULL AND w.deleted_at IS NULL
       ORDER BY q.created_at DESC`
    )

    // Also get all webinars for the assignment selector dropdown
    const webinarsRes = await client.query(
      `SELECT w.id, w.title, w.slug, w.speaker_name, w.event_date, w.cpe_credits,
              (SELECT q.id FROM webinar_quiz q WHERE q.webinar_id = w.id AND q.deleted_at IS NULL LIMIT 1) as assigned_quiz_id
       FROM webinar w
       WHERE w.deleted_at IS NULL
       ORDER BY w.event_date DESC`
    )

    return res.json({
      quizzes: quizzesRes.rows,
      webinars: webinarsRes.rows,
    })
  } catch (error: any) {
    console.error("Error in GET /admin/quizzes:", error)
    return res.status(500).json({ message: "Failed to fetch quizzes", error: error.message })
  } finally {
    client.release()
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as {
    quiz_id?: string
    webinar_id: string
    title?: string
    instructions?: string
    status?: "draft" | "published"
    is_enabled?: boolean
    passing_score?: number
    cooldown_minutes?: number
    max_attempts?: number | null
    certificate_template?: string
    signatory_name?: string
    signatory_title?: string
    issuer_name?: string
    cpe_credits?: number
    questions?: Array<{
      id?: string
      question_text: string
      question_type?: string
      options: Array<{ id: string; text: string }>
      correct_option_id: string
      explanation?: string
      order_index?: number
    }>
  }

  const { webinar_id: webinarId, status = "published" } = body
  const isEnabled = body.is_enabled !== undefined ? body.is_enabled : status === "published"
  const isPublishing = status === "published" && isEnabled

  if (!webinarId) {
    return res.status(400).json({ message: "A valid webinar_id is required to assign this quiz." })
  }

  const questions = body.questions || []

  // Strict Validation for Published Quizzes: 5 to 8 questions, 4 options each, exactly 1 correct answer
  if (isPublishing) {
    if (questions.length < 5 || questions.length > 8) {
      return res.status(400).json({
        message: `A published quiz must contain between 5 and 8 questions before it can be published. Current question count: ${questions.length}. You may save as a Draft if not ready.`,
      })
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text || !q.question_text.trim()) {
        return res.status(400).json({ message: `Question #${i + 1} is missing question text.` })
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return res.status(400).json({
          message: `Question #${i + 1} must have exactly 4 answer options (labeled A, B, C, D). Current option count: ${q.options?.length || 0}.`,
        })
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text || !q.options[j].text.trim()) {
          return res.status(400).json({
            message: `Question #${i + 1}, Option ${String.fromCharCode(65 + j)} text cannot be empty.`,
          })
        }
      }
      const optionIds = q.options.map((o) => o.id)
      if (!q.correct_option_id || !optionIds.includes(q.correct_option_id)) {
        return res.status(400).json({
          message: `Question #${i + 1} must have exactly one correct answer selected among its options.`,
        })
      }
    }
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Verify webinar exists
    const webRes = await client.query(
      `SELECT id, title, speaker_name, cpe_credits FROM webinar WHERE id = $1 AND deleted_at IS NULL`,
      [webinarId]
    )
    if (webRes.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "Webinar not found or deleted" })
    }
    const webinar = webRes.rows[0]

    // 2. Check if a quiz already exists for this webinar or use provided quiz_id
    let quizId = body.quiz_id
    if (!quizId) {
      const existing = await client.query(
        `SELECT id FROM webinar_quiz WHERE webinar_id = $1 AND deleted_at IS NULL`,
        [webinarId]
      )
      if (existing.rows.length > 0) {
        quizId = existing.rows[0].id
      }
    }

    if (quizId) {
      await client.query(
        `UPDATE webinar_quiz SET
          title = COALESCE($1, title),
          instructions = COALESCE($2, instructions),
          is_enabled = $3,
          status = $4,
          passing_score = COALESCE($5, passing_score),
          cooldown_minutes = COALESCE($6, cooldown_minutes),
          max_attempts = $7,
          certificate_template = COALESCE($8, certificate_template),
          signatory_name = COALESCE($9, signatory_name),
          signatory_title = COALESCE($10, signatory_title),
          issuer_name = COALESCE($11, issuer_name),
          cpe_credits = COALESCE($12, cpe_credits),
          updated_at = now()
        WHERE id = $13`,
        [
          body.title || null,
          body.instructions || null,
          isEnabled,
          status,
          body.passing_score !== undefined ? Number(body.passing_score) : null,
          body.cooldown_minutes !== undefined ? Number(body.cooldown_minutes) : null,
          body.max_attempts !== undefined ? body.max_attempts : null,
          body.certificate_template || null,
          body.signatory_name || null,
          body.signatory_title || null,
          body.issuer_name || null,
          body.cpe_credits !== undefined ? Number(body.cpe_credits) : null,
          quizId,
        ]
      )
    } else {
      quizId = `quiz_${webinarId.replace("web_", "")}_${Date.now()}`
      await client.query(
        `INSERT INTO webinar_quiz (
          id, webinar_id, title, instructions, is_enabled, status, passing_score, cooldown_minutes,
          max_attempts, certificate_template, signatory_name, signatory_title, issuer_name, cpe_credits
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          quizId,
          webinarId,
          body.title || `CPE Comprehension & Verification Quiz: ${webinar.title}`,
          body.instructions || "Answer all questions. A minimum score of 75% is required to earn your certificate.",
          isEnabled,
          status,
          body.passing_score !== undefined ? Number(body.passing_score) : 75,
          body.cooldown_minutes !== undefined ? Number(body.cooldown_minutes) : 60,
          body.max_attempts !== undefined ? body.max_attempts : null,
          body.certificate_template || "standard_cpe",
          body.signatory_name || webinar.speaker_name,
          body.signatory_title || "Lead Faculty / CPE Course Director",
          body.issuer_name || "AcademyIO Continuing Professional Education",
          body.cpe_credits !== undefined ? Number(body.cpe_credits) : Number(webinar.cpe_credits) || 2.0,
        ]
      )
    }

    // 3. Questions Handling with Participant Attempt Historical Integrity
    // Check if participant attempts exist for this quiz
    const attCheck = await client.query(
      `SELECT COUNT(*)::int as count FROM quiz_attempt WHERE quiz_id = $1 AND deleted_at IS NULL`,
      [quizId]
    )
    const hasAttempts = (attCheck.rows[0]?.count || 0) > 0

    if (questions.length > 0) {
      if (hasAttempts) {
        // Soft-delete previous questions so attempt records continue referencing their original IDs
        await client.query(`UPDATE quiz_question SET deleted_at = now() WHERE quiz_id = $1 AND deleted_at IS NULL`, [quizId])
      } else {
        // Safe to clear unattempted draft questions
        await client.query(`DELETE FROM quiz_question WHERE quiz_id = $1`, [quizId])
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qId = q.id && !hasAttempts ? q.id : `qst_${quizId}_${Date.now()}_${i + 1}`

        if (!q.question_text || !Array.isArray(q.options) || !q.correct_option_id) {
          continue
        }

        await client.query(
          `INSERT INTO quiz_question (
            id, quiz_id, question_text, question_type, options, correct_option_id, explanation, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            qId,
            quizId,
            q.question_text,
            q.question_type || "multiple_choice",
            JSON.stringify(q.options),
            q.correct_option_id,
            q.explanation || null,
            i,
          ]
        )
      }
    }

    await client.query("COMMIT")

    // Load full saved quiz
    const savedQuiz = await client.query(
      `SELECT q.*, w.title as webinar_title, w.speaker_name as webinar_speaker, w.event_date as webinar_date
       FROM webinar_quiz q
       JOIN webinar w ON q.webinar_id = w.id
       WHERE q.id = $1`,
      [quizId]
    )
    const savedQuestions = await client.query(
      `SELECT * FROM quiz_question WHERE quiz_id = $1 AND deleted_at IS NULL ORDER BY order_index ASC`,
      [quizId]
    )

    return res.json({
      success: true,
      quiz: savedQuiz.rows[0],
      questions: savedQuestions.rows,
      has_attempts: hasAttempts,
      message: isPublishing
        ? `Quiz successfully published with ${savedQuestions.rows.length} questions!`
        : `Quiz draft saved successfully with ${savedQuestions.rows.length} questions.`,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error in POST /admin/quizzes:", error)
    return res.status(500).json({ message: "Failed to save quiz", error: error.message })
  } finally {
    client.release()
  }
}
