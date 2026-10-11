import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  const updateData: Record<string, any> = { id }

  if (body.recording_url !== undefined) {
    updateData.recording_url = body.recording_url
  }
  if (body.recording_instructions !== undefined) {
    updateData.recording_instructions = body.recording_instructions
  }
  if (body.recording_expires_at !== undefined) {
    updateData.recording_expires_at = body.recording_expires_at ? new Date(body.recording_expires_at) : null
  }

  const updated = await webinarService.updateWebinars(updateData)

  res.json({
    message: "Recording settings updated successfully",
    webinar: updated,
  })
}
