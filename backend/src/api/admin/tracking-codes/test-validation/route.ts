import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { validateTrackingCode } from "../../../../utils/tracking-codes-db"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = req.body as Record<string, any>

    const result = validateTrackingCode({
      name: body.name || "Test Code",
      type: body.type,
      tracking_id: body.tracking_id,
      custom_code: body.custom_code,
      placement: body.placement,
      target_pages: body.target_pages,
    })

    if (!result.valid) {
      return res.json({
        valid: false,
        error: result.error,
        status: "invalid",
        message: result.error,
      })
    }

    const typeDescriptions: Record<string, string> = {
      ga4: "Google Analytics 4 measurement ID verified and formatted correctly (G-XXXXXXXXXX). Ready to track page views and conversions on storefront.",
      gtm: "Google Tag Manager container ID verified (GTM-XXXXXXX). Will load the official GTM container on storefront pages.",
      meta_pixel: "Meta Pixel numeric ID verified. Ready to record PageView and standard e-commerce events.",
      clarity: "Microsoft Clarity project ID verified. Will record heatmaps and session recordings on the customer storefront.",
      linkedin: "LinkedIn Insight Partner ID verified. Ready for B2B professional audience attribution.",
      gsc: "Google Search Console verification meta tag formatted correctly.",
      bing: "Bing Webmaster verification meta tag formatted correctly.",
      pinterest: "Pinterest Tag formatted correctly.",
      tiktok: "TikTok Pixel formatted correctly.",
      hotjar: "Hotjar Site ID verified.",
      custom: "Custom snippet syntax checked. No forbidden administrative references detected.",
    }

    return res.json({
      valid: true,
      status: "verified",
      message: typeDescriptions[body.type] || "Configuration syntax verified successfully.",
      target_pages_summary: `Targeted to: ${body.target_pages || "all"}`,
      placement_summary: `Script placement: ${body.placement || "head"}`,
    })
  } catch (error: any) {
    return res.status(500).json({
      valid: false,
      error: error.message,
    })
  }
}
