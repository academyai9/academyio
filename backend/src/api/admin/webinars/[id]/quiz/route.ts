import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: webinarId } = req.params

  const client = await pool.connect()
  try {
    const quizRes = await client.query(
      `SELECT * FROM webinar_quiz WHERE webinar_id = $1 AND deleted_at IS NULL`,
      [webinarId]
    )

    if (quizRes.rows.length === 0) {
      return res.json({ quiz: null, questions: [] })
    }

    const quiz = quizRes.rows[0]

    const qstRes = await client.query(
      `SELECT * FROM quiz_question WHERE quiz_id = $1 AND deleted_at IS NULL ORDER BY order_index ASC`,
      [quiz.id]
    )

    return res.json({
      quiz,
      questions: qstRes.rows,
    })
  } catch (error: any) {
    console.error("Error in GET /admin/webinars/[id]/quiz:", error)
    return res.status(500).json({ message: "Failed to load quiz", error: error.message })
  } finally {
    client.release()
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: webinarId } = req.params
  const body = req.body as {
    quiz?: {
      title?: string
      instructions?: string
      is_enabled?: boolean
      passing_score?: number
      cooldown_minutes?: number
      max_attempts?: number | null
      certificate_template?: string
      signatory_name?: string
      signatory_title?: string
      issuer_name?: string
      cpe_credits?: number
    }
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

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // 1. Verify webinar exists
    const webCheck = await client.query("SELECT id, title, speaker_name, cpe_credits FROM webinar WHERE id = $1", [webinarId])
    if (webCheck.rows.length === 0) {
      await client.query("ROLLBACK")
      return res.status(404).json({ message: "Webinar not found" })
    }
    const webinar = webCheck.rows[0]

    // 2. Upsert Quiz
    const quizSettings = body.quiz || {}
    const status = (quizSettings as any).status || "published"
    const isEnabled = quizSettings.is_enabled !== undefined ? quizSettings.is_enabled : status === "published"
    const isPublishing = status === "published" && isEnabled
    const questions = body.questions || []

    // 5-8 question validation on publish
    if (isPublishing) {
      if (questions.length < 5 || questions.length > 8) {
        await client.query("ROLLBACK")
        return res.status(400).json({
          message: `A published quiz must contain between 5 and 8 questions before it can be published. Current question count: ${questions.length}. You may save as a Draft if not ready.`,
        })
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        if (!q.question_text || !q.question_text.trim()) {
          await client.query("ROLLBACK")
          return res.status(400).json({ message: `Question #${i + 1} is missing question text.` })
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          await client.query("ROLLBACK")
          return res.status(400).json({
            message: `Question #${i + 1} must have exactly 4 answer options (labeled A, B, C, D). Current option count: ${q.options?.length || 0}.`,
          })
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].text || !q.options[j].text.trim()) {
            await client.query("ROLLBACK")
            return res.status(400).json({
              message: `Question #${i + 1}, Option ${String.fromCharCode(65 + j)} text cannot be empty.`,
            })
          }
        }
        const optionIds = q.options.map((o) => o.id)
        if (!q.correct_option_id || !optionIds.includes(q.correct_option_id)) {
          await client.query("ROLLBACK")
          return res.status(400).json({
            message: `Question #${i + 1} must have exactly one correct answer selected among its options.`,
          })
        }
      }
    }

    const existingQuiz = await client.query("SELECT id FROM webinar_quiz WHERE webinar_id = $1 AND deleted_at IS NULL", [webinarId])

    let quizId: string
    if (existingQuiz.rows.length > 0) {
      quizId = existingQuiz.rows[0].id
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
          quizSettings.title,
          quizSettings.instructions,
          isEnabled,
          status,
          quizSettings.passing_score,
          quizSettings.cooldown_minutes,
          quizSettings.max_attempts !== undefined ? quizSettings.max_attempts : null,
          quizSettings.certificate_template,
          quizSettings.signatory_name,
          quizSettings.signatory_title,
          quizSettings.issuer_name,
          quizSettings.cpe_credits,
          quizId,
        ]
      )
    } else {
      quizId = `quiz_${webinarId.replace("web_", "")}`
      await client.query(
        `INSERT INTO webinar_quiz (
          id, webinar_id, title, instructions, is_enabled, status, passing_score, cooldown_minutes,
          max_attempts, certificate_template, signatory_name, signatory_title, issuer_name, cpe_credits
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          quizId,
          webinarId,
          quizSettings.title || `CPE Comprehension & Verification Quiz: ${webinar.title}`,
          quizSettings.instructions || "Answer all questions. A minimum score of 75% is required to earn your certificate.",
          isEnabled,
          status,
          quizSettings.passing_score || 75,
          quizSettings.cooldown_minutes || 60,
          quizSettings.max_attempts || null,
          quizSettings.certificate_template || "standard_cpe",
          quizSettings.signatory_name || webinar.speaker_name,
          quizSettings.signatory_title || "Lead Faculty / CPE Course Director",
          quizSettings.issuer_name || "AcademyIO Continuing Professional Education",
          quizSettings.cpe_credits || webinar.cpe_credits || 1.0,
        ]
      )
    }

    // 3. Update Questions if provided
    if (Array.isArray(body.questions)) {
      const attCheck = await client.query(
        `SELECT COUNT(*)::int as count FROM quiz_attempt WHERE quiz_id = $1 AND deleted_at IS NULL`,
        [quizId]
      )
      const hasAttempts = (attCheck.rows[0]?.count || 0) > 0

      if (hasAttempts) {
        await client.query(`UPDATE quiz_question SET deleted_at = now() WHERE quiz_id = $1 AND deleted_at IS NULL`, [quizId])
      } else {
        await client.query("DELETE FROM quiz_question WHERE quiz_id = $1", [quizId])
      }

      for (let i = 0; i < body.questions.length; i++) {
        const q = body.questions[i]
        const qId = q.id && !hasAttempts ? q.id : `qst_${quizId}_${Date.now()}_${i}`

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
            q.order_index !== undefined ? q.order_index : i,
          ]
        )
      }
    }

    await client.query("COMMIT")

    // Fetch updated quiz
    const updatedQuiz = await client.query("SELECT * FROM webinar_quiz WHERE id = $1", [quizId])
    const updatedQsts = await client.query("SELECT * FROM quiz_question WHERE quiz_id = $1 ORDER BY order_index ASC", [quizId])

    return res.json({
      success: true,
      quiz: updatedQuiz.rows[0],
      questions: updatedQsts.rows,
    })
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error in POST /admin/webinars/[id]/quiz:", error)
    return res.status(500).json({ message: "Failed to save quiz", error: error.message })
  } finally {
    client.release()
  }
}
