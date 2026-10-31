import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params

    // 1. Fetch webinar
    const webinarRes = await pgConnection.raw(
      `SELECT id, title, slug, category, cpe_credits, duration_minutes FROM webinar WHERE id = ? AND deleted_at IS NULL;`,
      [id]
    )

    if (!webinarRes.rows || webinarRes.rows.length === 0) {
      return res.status(404).json({ message: "Webinar not found" })
    }
    const webinar = webinarRes.rows[0]

    // 2. Fetch existing credit info if any
    const creditRes = await pgConnection.raw(
      `SELECT * FROM webinar_credit_info WHERE webinar_id = ? AND deleted_at IS NULL;`,
      [id]
    )
    const creditInfo = creditRes.rows && creditRes.rows.length > 0 ? creditRes.rows[0] : null

    // 3. Fetch all active organizations
    const orgsRes = await pgConnection.raw(`
      SELECT code, name, short_name, logo_url, website_url, alt_text, default_credit_type, is_enabled, display_order
      FROM accreditation_organization
      WHERE deleted_at IS NULL
      ORDER BY display_order ASC;
    `)
    const organizations = orgsRes.rows || []

    res.json({
      webinar,
      credit_info: creditInfo,
      available_organizations: organizations,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch webinar credit info",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const { id } = req.params
    const body = req.body as Record<string, any>

    // Verify webinar exists
    const webinarRes = await pgConnection.raw(
      `SELECT id, title, category FROM webinar WHERE id = ? AND deleted_at IS NULL;`,
      [id]
    )
    if (!webinarRes.rows || webinarRes.rows.length === 0) {
      return res.status(404).json({ message: "Webinar not found" })
    }

    const {
      cpe_credit = 2.0,
      field_of_study = "Taxes",
      prerequisites = "None",
      learning_level = "Intermediate",
      location = "Virtual/Online",
      delivery_method = "Group Internet Based",
      irs_course_id = null,
      attendance_requirement = "Yes",
      session_duration = "100 Minutes",
      case_studies_qna = "Included",
      presentation_reference = "Available for reference",
      credit_unit = "Credits",
      additional_notes = null,
      organizations = [],
    } = body

    const creditId = `wci_${id}`

    const upsertRes = await pgConnection.raw(`
      INSERT INTO webinar_credit_info (
        id,
        webinar_id,
        cpe_credit,
        field_of_study,
        prerequisites,
        learning_level,
        location,
        delivery_method,
        irs_course_id,
        attendance_requirement,
        session_duration,
        case_studies_qna,
        presentation_reference,
        credit_unit,
        additional_notes,
        organizations,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), now())
      ON CONFLICT (webinar_id) DO UPDATE SET
        cpe_credit = EXCLUDED.cpe_credit,
        field_of_study = EXCLUDED.field_of_study,
        prerequisites = EXCLUDED.prerequisites,
        learning_level = EXCLUDED.learning_level,
        location = EXCLUDED.location,
        delivery_method = EXCLUDED.delivery_method,
        irs_course_id = EXCLUDED.irs_course_id,
        attendance_requirement = EXCLUDED.attendance_requirement,
        session_duration = EXCLUDED.session_duration,
        case_studies_qna = EXCLUDED.case_studies_qna,
        presentation_reference = EXCLUDED.presentation_reference,
        credit_unit = EXCLUDED.credit_unit,
        additional_notes = EXCLUDED.additional_notes,
        organizations = EXCLUDED.organizations,
        updated_at = now()
      RETURNING *;
    `, [
      creditId,
      id,
      parseFloat(cpe_credit) || 0,
      String(field_of_study).trim(),
      String(prerequisites).trim(),
      String(learning_level).trim(),
      String(location).trim(),
      String(delivery_method).trim(),
      irs_course_id ? String(irs_course_id).trim() : null,
      String(attendance_requirement).trim(),
      String(session_duration).trim(),
      String(case_studies_qna).trim(),
      String(presentation_reference).trim(),
      String(credit_unit).trim(),
      additional_notes ? String(additional_notes).trim() : null,
      JSON.stringify(Array.isArray(organizations) ? organizations : []),
    ])

    // Also sync the cpe_credits column on the webinar table so listings stay in sync
    if (body.cpe_credit !== undefined) {
      await pgConnection.raw(`
        UPDATE webinar SET cpe_credits = ? WHERE id = ?;
      `, [Math.round(parseFloat(cpe_credit)) || 0, id])
    }

    res.json({
      credit_info: upsertRes.rows[0],
      message: "Webinar credits and educational information updated successfully",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to save webinar credit info",
      error: error.message,
    })
  }
}
