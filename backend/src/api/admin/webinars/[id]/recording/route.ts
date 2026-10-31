import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
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
    if (body.recording_published !== undefined) {
      updateData.recording_published = Boolean(body.recording_published)
      if (Boolean(body.recording_published)) {
        updateData.is_ondemand = true
      } else {
        updateData.is_ondemand = false
      }
    }
    if (body.transcript_file_url !== undefined) {
      updateData.transcript_file_url = body.transcript_file_url
    }
    if (body.transcript_content !== undefined) {
      updateData.transcript_content = body.transcript_content
    }

    const updated = await webinarService.updateWebinars(updateData)

    res.json({
      message: "Recording and transcript settings updated successfully",
      webinar: updated,
    })
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to update recording settings",
    })
  }
}
