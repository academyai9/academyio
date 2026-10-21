import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PromotionalBannerService } from "../../../../../modules/webinar/promotional-banner-service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const banner = await PromotionalBannerService.getBannerById(id)

    if (!banner) {
      return res.status(404).json({ message: `Promotional banner '${id}' not found.` })
    }

    return res.status(200).json({ banner })
  } catch (error: any) {
    console.error("[Admin Get Banner Error]:", error)
    return res.status(500).json({
      message: "Failed to retrieve promotional banner",
      error: error.message,
    })
  }
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const body = (req.body as any) || {}

  try {
    const banner = await PromotionalBannerService.updateBanner(id, body)

    return res.status(200).json({
      success: true,
      message: "Promotional banner updated successfully.",
      banner,
    })
  } catch (error: any) {
    console.error("[Admin Update Banner Error]:", error)
    return res.status(500).json({
      message: "Failed to update promotional banner",
      error: error.message,
    })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const deleted = await PromotionalBannerService.deleteBanner(id)

    if (!deleted) {
      return res.status(404).json({ message: `Promotional banner '${id}' not found.` })
    }

    return res.status(200).json({
      success: true,
      message: "Promotional banner deleted successfully.",
    })
  } catch (error: any) {
    console.error("[Admin Delete Banner Error]:", error)
    return res.status(500).json({
      message: "Failed to delete promotional banner",
      error: error.message,
    })
  }
}
