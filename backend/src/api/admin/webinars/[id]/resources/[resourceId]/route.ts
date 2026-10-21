import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import WebinarModuleService from "../../../../../../modules/webinar/service"
import { WEBINAR_MODULE } from "../../../../../../modules/webinar"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { resourceId } = req.params
  const body = req.body as Record<string, any>

  const updated = await webinarService.updateWebinarResources({
    id: resourceId,
    ...body,
  })

  res.json({ resource: updated })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const webinarService: WebinarModuleService = req.scope.resolve(WEBINAR_MODULE)
  const { resourceId } = req.params

  await webinarService.deleteWebinarResources([resourceId])

  res.json({ id: resourceId, object: "webinar_resource", deleted: true })
}
