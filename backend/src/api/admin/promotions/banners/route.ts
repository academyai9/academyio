import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PromotionalBannerService } from "../../../../modules/webinar/promotional-banner-service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined
    const scope = req.query.scope as string | undefined

    const banners = await PromotionalBannerService.listBanners({
      search,
      status,
      scope,
    })

    return res.status(200).json({ banners })
  } catch (error: any) {
    console.error("[Admin List Banners Error]:", error)
    return res.status(500).json({
      message: "Failed to list promotional banners",
      error: error.message,
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body as any) || {}

    if (!body.title || !body.coupon_code) {
      return res.status(400).json({
        message: "Title and Coupon Code are required fields.",
      })
    }

    const banner = await PromotionalBannerService.createBanner(body)

    return res.status(201).json({
      success: true,
      message: "Promotional banner created and coupon synced successfully.",
      banner,
    })
  } catch (error: any) {
    console.error("[Admin Create Banner Error]:", error)
    return res.status(500).json({
      message: "Failed to create promotional banner",
      error: error.message,
    })
  }
}
