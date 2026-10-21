import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PromotionalBannerService } from "../../../../modules/webinar/promotional-banner-service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarId = req.query.webinar_id as string | undefined
    const category = req.query.category as string | undefined

    const banner = await PromotionalBannerService.getActiveBannerForWebinar({
      webinarId,
      category,
    })

    return res.status(200).json({ banner })
  } catch (error: any) {
    console.error("[Store Active Banner Error]:", error)
    return res.status(500).json({
      message: "Failed to fetch active promotional banner",
      error: error.message,
    })
  }
}
