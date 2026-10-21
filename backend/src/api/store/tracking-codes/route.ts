import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureTrackingCodesTables } from "../../../utils/tracking-codes-db"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await ensureTrackingCodesTables(pgConnection)

    // Only return ENABLED tracking codes for the public storefront
    const result = await pgConnection.raw(`
      SELECT 
        id,
        name,
        type,
        tracking_id,
        custom_code,
        placement,
        target_pages,
        target_paths,
        is_enabled,
        updated_at
      FROM frontend_tracking_codes 
      WHERE is_enabled = true 
      ORDER BY 
        CASE 
          WHEN type = 'gtm' THEN 1
          WHEN type = 'ga4' THEN 2
          WHEN type = 'meta_pixel' THEN 3
          WHEN type = 'clarity' THEN 4
          WHEN type = 'linkedin' THEN 5
          WHEN type IN ('gsc', 'bing') THEN 6
          ELSE 7
        END ASC,
        updated_at DESC;
    `)

    return res.json({
      tracking_codes: result.rows || [],
      count: (result.rows || []).length,
    })
  } catch (error: any) {
    console.error("Error fetching store tracking codes:", error)
    return res.json({
      tracking_codes: [],
      count: 0,
    })
  }
}
