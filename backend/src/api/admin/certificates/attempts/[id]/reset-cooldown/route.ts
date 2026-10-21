import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://sonusaini@127.0.0.1:5432/academyio_medusa",
})

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: attemptId } = req.params
  const { reason, admin_email } = req.body as { reason?: string; admin_email?: string }

  const client = await pool.connect()
  try {
    const attemptCheck = await client.query("SELECT * FROM quiz_attempt WHERE id = $1 AND deleted_at IS NULL", [attemptId])
    if (attemptCheck.rows.length === 0) {
      return res.status(404).json({ message: "Quiz attempt not found" })
    }

    const note = `[Manual Cooldown Reset by Admin ${admin_email || "System"} on ${new Date().toISOString()}]: ${reason || "Authorized by Course Administrator"}`

    const updateRes = await client.query(
      `UPDATE quiz_attempt SET
        cooldown_reset_by_admin = true,
        next_eligible_at = now(),
        admin_notes = COALESCE(admin_notes || E'\n' || $1, $1),
        updated_at = now()
      WHERE id = $2
      RETURNING *`,
      [note, attemptId]
    )

    return res.json({
      success: true,
      message: "Cooldown has been reset. The participant can now immediately retake the quiz.",
      attempt: updateRes.rows[0],
    })
  } catch (error: any) {
    console.error("Error in reset-cooldown route:", error)
    return res.status(500).json({ message: "Failed to reset cooldown", error: error.message })
  } finally {
    client.release()
  }
}
