import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureContactInfoTable, DEFAULT_CONTACT_RECORD } from "../../admin/contact-info/route"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureContactInfoTable(pgConnection)

    const result = await pgConnection.raw(
      `SELECT 
        company_name,
        street_address,
        city,
        state,
        country,
        postal_code,
        formatted_address,
        support_email,
        support_phone,
        support_hours,
        broadcast_support_note,
        map_link,
        is_active,
        updated_at
      FROM company_contact_info 
      WHERE id = 'company_address' AND is_active = true 
      LIMIT 1;`
    )

    if (result.rows && result.rows.length > 0) {
      return res.json({ contact_info: result.rows[0] })
    }

    return res.json({ contact_info: DEFAULT_CONTACT_RECORD })
  } catch (error: any) {
    console.error("Error fetching store contact info:", error)
    return res.json({
      contact_info: DEFAULT_CONTACT_RECORD,
    })
  }
}
