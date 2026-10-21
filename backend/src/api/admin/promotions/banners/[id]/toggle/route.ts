import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PromotionalBannerService } from "../../../../../../modules/webinar/promotional-banner-service"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const banner = await PromotionalBannerService.toggleActive(id)

    if (!banner) {
      return res.status(404).json({ message: `Promotional banner '${id}' not found.` })
    }

    return res.status(200).json({
      success: true,
      message: `Promotional banner ${banner.is_active ? "activated" : "deactivated"} successfully.`,
      banner,
    })
  } catch (error: any) {
    console.error("[Admin Toggle Banner Error]:", error)
    return res.status(500).json({
      message: "Failed to toggle promotional banner status",
      error: error.message,
    })
  }
}
