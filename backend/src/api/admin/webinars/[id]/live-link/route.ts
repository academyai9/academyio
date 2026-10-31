import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
    const { id } = req.params
    const body = req.body as Record<string, any>

    const updateData: Record<string, any> = { id }

    if (body.live_stream_url !== undefined) {
      updateData.live_stream_url = body.live_stream_url
    }
    if (body.live_instructions !== undefined) {
      updateData.live_instructions = body.live_instructions
    }
    if (body.live_link_published !== undefined) {
      updateData.live_link_published = Boolean(body.live_link_published)
    }

    const updated = await webinarService.updateWebinars(updateData)

    res.json({
      message: "Live webinar link settings updated successfully",
      webinar: updated,
    })
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to update live stream credentials",
    })
  }
}
