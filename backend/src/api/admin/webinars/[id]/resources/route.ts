import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../modules/webinar"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params

  const [webinar] = await webinarService.listWebinars(
    { id },
    { relations: ["resources"] }
  )

  if (!webinar) {
    return res.status(404).json({ message: "Webinar not found" })
  }

  res.json({ resources: webinar.resources || [] })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { id } = req.params
  const body = req.body as Record<string, any>

  if (!body.title || !body.file_url) {
    return res.status(400).json({ message: "Resource title and file URL are required" })
  }

  const resource = await webinarService.createWebinarResources({
    title: body.title,
    description: body.description || null,
    file_url: body.file_url,
    file_name: body.file_name || `${body.title.toLowerCase().replace(/\s+/g, "_")}.pdf`,
    file_size: body.file_size || null,
    file_type: body.file_type || "pdf",
    access_type: body.access_type || "pdf",
    is_published: body.is_published !== undefined ? Boolean(body.is_published) : true,
    webinar_id: id,
  })

  // If this is marked as a transcript, also update the webinar transcript_file_url
  if (body.access_type === "transcript") {
    await webinarService.updateWebinars({
      id,
      transcript_file_url: body.file_url,
    })
  }

  res.status(201).json({ resource })
}
