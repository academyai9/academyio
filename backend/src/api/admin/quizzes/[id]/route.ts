import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  const client = await pool.connect()
  try {
    const quizRes = await client.query(
      `SELECT q.*, 
              w.title as webinar_title, 
              w.slug as webinar_slug, 
              w.speaker_name as webinar_speaker, 
              w.event_date as webinar_date,
              w.cpe_credits as webinar_credits,
              (SELECT COUNT(*)::int FROM quiz_attempt qa WHERE qa.quiz_id = q.id AND qa.deleted_at IS NULL) as total_attempts,
              (SELECT COUNT(*)::int FROM quiz_attempt qa WHERE qa.quiz_id = q.id AND qa.passed = true AND qa.deleted_at IS NULL) as passed_attempts
       FROM webinar_quiz q
       JOIN webinar w ON q.webinar_id = w.id
       WHERE q.id = $1 AND q.deleted_at IS NULL`,
      [id]
    )

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ message: "Quiz not found" })
    }

    const quiz = quizRes.rows[0]

    const questionsRes = await client.query(
      `SELECT * FROM quiz_question 
       WHERE quiz_id = $1 AND deleted_at IS NULL 
       ORDER BY order_index ASC`,
      [id]
    )

    return res.json({
      quiz,
      questions: questionsRes.rows,
    })
  } catch (error: any) {
    console.error("Error in GET /admin/quizzes/[id]:", error)
    return res.status(500).json({ message: "Failed to load quiz", error: error.message })
  } finally {
    client.release()
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    // Check if attempts exist
    const attRes = await client.query(
      `SELECT COUNT(*)::int as count FROM quiz_attempt WHERE quiz_id = $1 AND deleted_at IS NULL`,
      [id]
    )
    const attemptsCount = attRes.rows[0]?.count || 0

    if (attemptsCount > 0) {
      // Historical safety: Do NOT wipe records! Unpublish and soft-delete quiz so historical attempts remain intact
      await client.query(
        `UPDATE webinar_quiz SET
          is_enabled = false,
          status = 'draft',
          deleted_at = now(),
          updated_at = now()
        WHERE id = $1`,
        [id]
      )
      // Soft-delete questions
      await client.query(
        `UPDATE quiz_question SET deleted_at = now() WHERE quiz_id = $1 AND deleted_at IS NULL`,
        [id]
      )
      await client.query("COMMIT")
      return res.json({
        success: true,
        message: `Quiz archived. Note: ${attemptsCount} participant attempts were safely preserved in historical records.`,
      })
    } else {
      // No attempts: safe to soft delete
      await client.query(`UPDATE webinar_quiz SET deleted_at = now(), updated_at = now() WHERE id = $1`, [id])
      await client.query(`UPDATE quiz_question SET deleted_at = now() WHERE quiz_id = $1`, [id])
      await client.query("COMMIT")
      return res.json({
        success: true,
        message: "Quiz deleted successfully.",
      })
    }
  } catch (error: any) {
    await client.query("ROLLBACK")
    console.error("Error in DELETE /admin/quizzes/[id]:", error)
    return res.status(500).json({ message: "Failed to delete quiz", error: error.message })
  } finally {
    client.release()
  }
}
